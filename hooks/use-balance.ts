"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import type { Database } from "@/lib/supabase/types"

type Balance = Database['public']['Tables']['balances']['Row']

const ZENTRA_PRICE = 0.5 // $0.5 per Zentra token

export function useBalance() {
  const { user } = useAuth()
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(false) // Start with false - don't block UI
  const userIdRef = useRef<string | null>(null) // Track user ID to prevent unnecessary clears
  const isCreatingMissingBalances = useRef<boolean>(false) // Prevent infinite loop when creating missing balances

  // Stabilized loadBalances with useCallback to avoid unnecessary effect reruns.
  // Disables heavy retry logic so UI doesn't stay in loading state terlalu lama.
  const loadBalances = useCallback(async (showLoading: boolean = false) => {
    if (!user) {
      // If no user, clear balances only if we had a user before
      if (userIdRef.current !== null) {
        setBalances([])
      }
      return
    }

    if (showLoading) {
      setLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', user.id)
        .order('token', { ascending: true })

      if (error) {
        if (error.code !== 'PGRST116' && error.message !== 'cancelled') {
          console.warn('Error loading balances:', error.message)
        }
        // Jangan blok UI terlalu lama: hentikan loading dan biarkan balance lama tetap tampil.
        // Don't clear existing balances on error - keep showing them
        if (showLoading) {
          setLoading(false)
        }
        return
      }

      if (data && Array.isArray(data)) {
        // Ensure all required tokens exist - create missing ones
        const requiredTokens = ['ZENTRA', 'BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'BNB']
        const existingTokens = new Set(data.map(b => b.token))
        const missingTokens = requiredTokens.filter(token => !existingTokens.has(token))
        
        // Create missing token balances in background (non-blocking)
        // Only create if not already creating to prevent infinite loop
        if (missingTokens.length > 0 && !isCreatingMissingBalances.current) {
          isCreatingMissingBalances.current = true
          
          // Don't await - create in background to not block UI
          Promise.all(
            missingTokens.map(token =>
              supabase
                .from('balances')
                .insert({
                  user_id: user.id,
                  token,
                  balance: 0,
                })
                .then(({ error: insertError }) => {
                  if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
                    if (process.env.NODE_ENV === 'development') {
                      console.warn(`Failed to create balance for ${token}:`, insertError.message)
                    }
                  }
                })
            )
          ).then(() => {
            // Reset flag and reload balances after creating missing ones
            isCreatingMissingBalances.current = false
            // Only reload if we're still mounted and user is still the same
            if (userIdRef.current === user.id) {
              loadBalances(false)
            }
          }).catch(() => {
            // Reset flag on error
            isCreatingMissingBalances.current = false
            // Silently fail - balances will be created on next load
          })
        }
        
        // Always update balances, even if empty array (user has no balances yet)
        setBalances(data as Balance[])
        
        if (process.env.NODE_ENV === 'development' && data.length > 0) {
          console.log('Balances loaded:', data.length, 'tokens')
        }
      } else {
        // If data is null or undefined, set empty array but don't clear existing balances
        // This prevents balance from flashing to 0
        if (data === null || data === undefined) {
          // Only set empty if we don't have existing balances
          if (balances.length === 0) {
            setBalances([])
          }
        }
      }

      if (process.env.NODE_ENV === 'development' && data && data.length > 0) {
        const balancesData = data as Balance[]
        const zentraBalance = balancesData.find((b) => b.token === 'ZENTRA')
        if (zentraBalance) {
          console.log('ZENTRA Balance loaded:', zentraBalance.balance)
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error loading balances (keeping existing data):', error)
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      // Only clear balances when user becomes null
      if (userIdRef.current !== null) {
        setBalances([])
        setLoading(false)
        userIdRef.current = null
      }
      return
    }

    // If user ID hasn't changed, don't clear balances - just refresh them
    const isSameUser = userIdRef.current === user.id
    userIdRef.current = user.id

    // CRITICAL FIX: Only clear balances if this is a different user
    // Never clear balances for the same user - this prevents balance from becoming 0
    if (!isSameUser) {
      // Different user - but don't clear immediately to prevent flash of 0 balance
      // Balance will be replaced when new data loads
      setLoading(true)
    }

    // CRITICAL FIX: Always load balances, but don't clear existing ones
    // This ensures balance is always up-to-date without causing it to flash to 0
    loadBalances()

    // Subscribe to real-time updates with error handling
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollInterval: NodeJS.Timeout | null = null
    let isCleaningUp = false // Flag to prevent false positive warnings during cleanup
    
    // Listen for custom balance update events with minimal debouncing for immediate updates
    let balanceUpdateTimeout: NodeJS.Timeout | null = null
    const handleBalanceUpdate = () => {
      // Minimal debounce (50ms instead of 100ms) for faster real-time updates
      // This ensures balance updates immediately after task completion
      if (balanceUpdateTimeout) {
        clearTimeout(balanceUpdateTimeout)
      }
      balanceUpdateTimeout = setTimeout(() => {
        loadBalances(false)
      }, 50) // Reduced delay for faster real-time updates
    }
    
    window.addEventListener('balance-updated', handleBalanceUpdate)

    // Setup real-time subscription with fallback
    const setupRealtimeSubscription = () => {
      try {
        channel = supabase
          .channel(`balances-changes-${user.id}-${Date.now()}`) // Unique channel name
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'balances',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('Balance changed (realtime):', payload)
              // Immediately update balance when realtime event is received
              // No debounce needed here - realtime events are already filtered by Supabase
              loadBalances(false)
            }
          )
          .subscribe((status) => {
            // Don't log warnings if we're cleaning up (prevents false positives)
            if (isCleaningUp) return
            
            if (status === 'SUBSCRIBED') {
              console.log('Balance real-time subscription active')
              // Clear polling if real-time works
              if (pollInterval) {
                clearInterval(pollInterval)
                pollInterval = null
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              // Only warn for actual errors, not CLOSED status (which happens during cleanup)
              console.warn('Balance real-time subscription failed, using polling fallback')
              // Fallback to polling if real-time fails
              if (!pollInterval && !isCleaningUp) {
                pollInterval = setInterval(() => {
                  loadBalances(false)
                }, 30000) // Poll every 30 seconds
              }
            } else if (status === 'CLOSED') {
              // CLOSED status is normal during cleanup, don't warn
              // Only setup polling if not cleaning up and real-time was working before
              if (!pollInterval && !isCleaningUp) {
                pollInterval = setInterval(() => {
                  loadBalances(false)
                }, 30000) // Poll every 30 seconds
              }
            }
          })
      } catch (error) {
        if (!isCleaningUp) {
          console.warn('Failed to setup real-time subscription, using polling:', error)
        }
        // Fallback: poll for updates every 30 seconds if real-time fails
        if (!pollInterval && !isCleaningUp) {
          pollInterval = setInterval(() => {
            loadBalances(false)
          }, 30000)
        }
      }
    }

    // Setup subscription
    setupRealtimeSubscription()

    return () => {
      // Mark as cleaning up to prevent false positive warnings
      isCleaningUp = true
      
      // Safely remove channel with error handling
      if (channel) {
        try {
          // Check if channel is still valid before removing
          const channelState = (channel as any).state
          if (channelState && channelState !== 'closed') {
            supabase.removeChannel(channel).catch((err) => {
              // Silently handle channel removal errors during cleanup
              // Don't log during cleanup as it's expected behavior
            })
          }
        } catch (error) {
          // Silently handle channel removal errors during cleanup
        }
      }
      // Clear polling interval if exists
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
      // Clear balance update timeout
      if (balanceUpdateTimeout) {
        clearTimeout(balanceUpdateTimeout)
      }
      window.removeEventListener('balance-updated', handleBalanceUpdate)
    }
  }, [user]) // Only depend on user, not loadBalances to prevent unnecessary re-runs

  const getBalance = (token: string): number => {
    const balance = balances.find(b => b.token === token)
    return balance?.balance || 0
  }

  const getTotalPortfolioValue = (): number => {
    let total = 0
    balances.forEach(balance => {
      if (balance.token === 'ZENTRA') {
        total += balance.balance * ZENTRA_PRICE
      }
      // Other tokens would use real-time prices, but for now they're 0
    })
    return total
  }

  const getZentraBalance = (): number => {
    return getBalance('ZENTRA')
  }

  const getZentraValue = (): number => {
    return getZentraBalance() * ZENTRA_PRICE
  }

  const reloadBalances = async () => {
    await loadBalances(false) // Reload without showing loading state
  }

  return {
    balances,
    loading,
    getBalance,
    getTotalPortfolioValue,
    getZentraBalance,
    getZentraValue,
    zentraPrice: ZENTRA_PRICE,
    reloadBalances,
  }
}



