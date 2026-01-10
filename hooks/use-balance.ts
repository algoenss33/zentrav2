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
  const userRef = useRef(user) // Keep current user reference to avoid stale closures
  const isCreatingMissingBalances = useRef<boolean>(false) // Prevent infinite loop when creating missing balances
  const lastLoadTimeRef = useRef<number>(0) // Track last successful load time for retry logic

  // Update user ref whenever user changes
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Stabilized loadBalances with useCallback to avoid unnecessary effect reruns.
  // Uses userRef to always get latest user, avoiding stale closure issues in production.
  const loadBalances = useCallback(async (showLoading: boolean = false, retryCount: number = 0) => {
    const currentUser = userRef.current
    if (!currentUser) {
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
        .eq('user_id', currentUser.id)
        .order('token', { ascending: true })

      if (error) {
        // Ignore specific errors that are expected or not critical
        const errorStatus = (error as any).status
        const isIgnorableError = 
          error.code === 'PGRST116' || // Not found (expected for new users)
          error.message === 'cancelled' || // Request cancelled (expected during cleanup)
          errorStatus === 406 || // Not Acceptable (header issue, but data might still be valid)
          errorStatus === 409; // Conflict (handled elsewhere, don't spam console)
        
        if (!isIgnorableError) {
          // Log errors in production for debugging
          console.warn('Error loading balances:', {
            message: error.message,
            code: error.code,
            status: errorStatus,
            retryCount,
          })
          
          // Retry logic for production: retry up to 2 times with exponential backoff
          if (retryCount < 2 && !isIgnorableError) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 3000)
            setTimeout(() => {
              loadBalances(showLoading, retryCount + 1)
            }, delay)
            return
          }
        }
        // Jangan blok UI terlalu lama: hentikan loading dan biarkan balance lama tetap tampil.
        // Don't clear existing balances on error - keep showing them
        if (showLoading) {
          setLoading(false)
        }
        return
      }

      // Mark successful load time
      lastLoadTimeRef.current = Date.now()

      if (data && Array.isArray(data)) {
        // Ensure all required tokens exist - create missing ones
        const requiredTokens = ['ZENTRA', 'BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'BNB']
        const balancesData = data as Balance[]
        const existingTokens = new Set(balancesData.map(b => b.token))
        const missingTokens = requiredTokens.filter(token => !existingTokens.has(token))
        
        // Create missing token balances in background (non-blocking)
        // Only create if not already creating to prevent infinite loop
        if (missingTokens.length > 0 && !isCreatingMissingBalances.current) {
          isCreatingMissingBalances.current = true
          
          // Don't await - create in background to not block UI
          // Use upsert instead of insert to handle race conditions gracefully
          Promise.all(
            missingTokens.map((token: string) =>
              supabase
                .from('balances')
                .upsert({
                  user_id: currentUser.id,
                  token,
                  balance: 0,
                } as any, {
                  onConflict: 'user_id,token', // Handle conflicts on unique constraint
                  ignoreDuplicates: false, // Update if exists, insert if not
                })
                .then(({ error: upsertError }) => {
                  // Ignore duplicate key errors (23505) and conflict errors (409)
                  if (upsertError) {
                    const errorStatus = (upsertError as any).status
                    const isConflictError = 
                      upsertError.code === '23505' || // PostgreSQL duplicate key
                      upsertError.code === 'PGRST204' || // PostgREST conflict
                      errorStatus === 409 || // HTTP conflict
                      upsertError.message?.includes('duplicate') ||
                      upsertError.message?.includes('conflict');
                    
                    if (!isConflictError) {
                      console.warn(`Failed to create balance for ${token}:`, upsertError.message)
                    }
                  }
                })
            )
          ).then(() => {
            // Reset flag and reload balances after creating missing ones
            isCreatingMissingBalances.current = false
            // Only reload if we're still mounted and user is still the same
            if (userIdRef.current === currentUser.id) {
              loadBalances(false, 0)
            }
          }).catch(() => {
            // Reset flag on error
            isCreatingMissingBalances.current = false
            // Silently fail - balances will be created on next load
          })
        }
        
        // Always update balances, even if empty array (user has no balances yet)
        setBalances(data as Balance[])
        
        if (data.length > 0) {
          console.log('✅ Balances loaded:', data.length, 'tokens', { 
            timestamp: new Date().toISOString(),
            userId: currentUser.id 
          })
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

      if (data && data.length > 0) {
        const balancesData = data as Balance[]
        const zentraBalance = balancesData.find((b) => b.token === 'ZENTRA')
        if (zentraBalance) {
          console.log('💵 ZENTRA Balance:', zentraBalance.balance)
        }
      }
    } catch (error: any) {
      console.warn('❌ Error loading balances (keeping existing data):', {
        message: error?.message,
        retryCount,
      })
      
      // Retry on unexpected errors
      if (retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000)
        setTimeout(() => {
          loadBalances(showLoading, retryCount + 1)
        }, delay)
        return
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, []) // Empty deps - use userRef instead to avoid stale closures

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
    let fastPollInterval: NodeJS.Timeout | null = null // Fast polling right after updates
    let isCleaningUp = false // Flag to prevent false positive warnings during cleanup
    let realtimeWorking = false // Track if real-time is working
    
    // Listen for custom balance update events with minimal debouncing for immediate updates
    let balanceUpdateTimeout: NodeJS.Timeout | null = null
    const handleBalanceUpdate = () => {
      // Immediately trigger reload - no debounce for production reliability
      console.log('🔄 Balance update event received')
      
      // Clear any existing timeout
      if (balanceUpdateTimeout) {
        clearTimeout(balanceUpdateTimeout)
      }
      
      // Load immediately
      loadBalances(false, 0)
      
      // Set up fast polling for the next 10 seconds to catch any missed updates
      // This is critical for production where real-time might be delayed
      if (fastPollInterval) {
        clearInterval(fastPollInterval)
      }
      
      let fastPollCount = 0
      fastPollInterval = setInterval(() => {
        fastPollCount++
        loadBalances(false, 0)
        // Stop fast polling after 10 seconds (5 polls at 2s interval)
        if (fastPollCount >= 5) {
          if (fastPollInterval) {
            clearInterval(fastPollInterval)
            fastPollInterval = null
          }
        }
      }, 2000) // Poll every 2 seconds for 10 seconds after update
    }
    
    // Add event listener immediately (before any potential events)
    if (typeof window !== 'undefined') {
      window.addEventListener('balance-updated', handleBalanceUpdate)
    }

    // Setup real-time subscription with fallback
    const setupRealtimeSubscription = () => {
      try {
        const currentUser = userRef.current
        if (!currentUser) return
        
        channel = supabase
          .channel(`balances-changes-${currentUser.id}-${Date.now()}`) // Unique channel name
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'balances',
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload) => {
              console.log('🔔 Balance changed (realtime):', payload)
              realtimeWorking = true
              // Immediately update balance when realtime event is received
              loadBalances(false, 0)
            }
          )
          .subscribe((status) => {
            // Don't log warnings if we're cleaning up (prevents false positives)
            if (isCleaningUp) return
            
            console.log('📡 Real-time subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Balance real-time subscription active')
              realtimeWorking = true
              // Clear slow polling if real-time works (keep fast polling for immediate updates)
              if (pollInterval) {
                clearInterval(pollInterval)
                pollInterval = null
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              // Real-time failed, use more aggressive polling
              console.warn('⚠️ Balance real-time subscription failed, using polling fallback')
              realtimeWorking = false
              
              // Setup more aggressive polling (every 5 seconds instead of 30)
              // This is critical for production reliability
              if (!pollInterval && !isCleaningUp) {
                pollInterval = setInterval(() => {
                  loadBalances(false, 0)
                }, 5000) // Poll every 5 seconds for production reliability
              }
            } else if (status === 'CLOSED') {
              // CLOSED status - real-time disconnected
              realtimeWorking = false
              console.warn('⚠️ Real-time connection closed, using polling')
              
              // Setup polling if not already running
              if (!pollInterval && !isCleaningUp) {
                pollInterval = setInterval(() => {
                  loadBalances(false, 0)
                }, 5000) // Poll every 5 seconds
              }
            }
          })
          
        // Timeout check: if subscription doesn't connect within 5 seconds, enable polling
        setTimeout(() => {
          if (!realtimeWorking && !pollInterval && !isCleaningUp) {
            console.warn('⚠️ Real-time subscription timeout, enabling polling fallback')
            pollInterval = setInterval(() => {
              loadBalances(false, 0)
            }, 5000) // Poll every 5 seconds
          }
        }, 5000)
      } catch (error) {
        if (!isCleaningUp) {
          console.warn('❌ Failed to setup real-time subscription, using polling:', error)
        }
        realtimeWorking = false
        // Fallback: poll for updates every 5 seconds if real-time fails
        if (!pollInterval && !isCleaningUp) {
          pollInterval = setInterval(() => {
            loadBalances(false, 0)
          }, 5000) // More aggressive polling for production
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
            })
          }
        } catch (error) {
          // Silently handle channel removal errors during cleanup
        }
      }
      // Clear all polling intervals
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
      if (fastPollInterval) {
        clearInterval(fastPollInterval)
        fastPollInterval = null
      }
      // Clear balance update timeout
      if (balanceUpdateTimeout) {
        clearTimeout(balanceUpdateTimeout)
      }
      // Remove event listener
      if (typeof window !== 'undefined') {
        window.removeEventListener('balance-updated', handleBalanceUpdate)
      }
    }
  }, [user, loadBalances]) // Include loadBalances in deps - it's now stable with empty deps

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

  const reloadBalances = useCallback(async () => {
    console.log('🔄 reloadBalances called')
    await loadBalances(false, 0) // Reload without showing loading state, no retry
    // Also trigger event as backup
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('balance-updated'))
    }
  }, [loadBalances])

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



