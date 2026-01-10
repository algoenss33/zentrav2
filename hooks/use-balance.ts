"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import type { Database } from "@/lib/supabase/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

type Balance = Database['public']['Tables']['balances']['Row']

const ZENTRA_PRICE = 0.5
const POLLING_INTERVAL = 5000 // 5 seconds polling as fallback
const DEBOUNCE_DELAY = 500 // 500ms debounce for manual refresh

// Cache key for sessionStorage (only for current session)
const BALANCE_CACHE_KEY = 'zentra_balances_cache'

// Save balances to sessionStorage cache
function saveBalancesToCache(balances: Balance[]) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(balances))
    }
  } catch (error) {
    console.warn('Failed to save balances to cache:', error)
  }
}

// Load balances from sessionStorage cache
function loadBalancesFromCache(): Balance[] | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const cachedData = sessionStorage.getItem(BALANCE_CACHE_KEY)
      if (cachedData) {
        const balances = JSON.parse(cachedData) as Balance[]
        // Validate cached balances structure
        if (Array.isArray(balances)) {
          return balances
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load balances from cache:', error)
  }
  return null
}

export function useBalance() {
  const { user, loading: authLoading } = useAuth()
  // Initialize with cached balances to prevent empty state on refresh
  const [balances, setBalances] = useState<Balance[]>(() => {
    const cached = loadBalancesFromCache()
    return cached || []
  })
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const isUpdatingRef = useRef<boolean>(false)

  // Load balance function with debouncing
  const loadBalances = useCallback(async (showLoading: boolean = false, force: boolean = false) => {
    if (!user) return

    // Debounce: skip if last update was too recent (unless forced)
    const now = Date.now()
    if (!force && now - lastUpdateRef.current < DEBOUNCE_DELAY) {
      return
    }

    // Prevent multiple simultaneous updates
    if (isUpdatingRef.current && !force) {
      return
    }

    isUpdatingRef.current = true
    lastUpdateRef.current = now

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
        console.error('Error loading balances:', error.message)
        // On error, try to keep cached balances if available
        if (!showLoading) {
          // If we have cached balances, keep them instead of clearing
          const cached = loadBalancesFromCache()
          if (cached && cached.length > 0) {
            setBalances(cached)
            return
          }
          // Only return early if we have cached data
          return
        }
        // Only set empty if we have no cached data
        const cached = loadBalancesFromCache()
        if (cached && cached.length > 0) {
          setBalances(cached)
        } else {
          setBalances([])
        }
      } else if (data) {
        // Save to cache immediately after successful fetch
        saveBalancesToCache(data)
        
        // Only update if data actually changed to prevent unnecessary re-renders
        setBalances((prevBalances) => {
          const hasChanged = 
            prevBalances.length !== data.length ||
            prevBalances.some((prev, index) => {
              const current = data[index]
              return !current || 
                     prev.token !== current.token || 
                     prev.balance !== current.balance
            })
          
          if (hasChanged) {
            // Save new data to cache
            saveBalancesToCache(data)
            return data
          }
          return prevBalances
        })
      }
    } catch (error: any) {
      console.error('Error loading balances:', error?.message || 'Unknown error')
      // On error, try to keep cached balances if available
      if (showLoading) {
        const cached = loadBalancesFromCache()
        if (cached && cached.length > 0) {
          setBalances(cached)
          console.log('📦 Using cached balances due to error')
        } else {
          // Only set empty if we truly have no cached data
          setBalances([])
        }
      } else {
        // Try to preserve current state or load from cache
        const cached = loadBalancesFromCache()
        if (cached && cached.length > 0) {
          setBalances(cached)
        }
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
      isUpdatingRef.current = false
    }
  }, [user])

  // Initial load and setup realtime subscription
  useEffect(() => {
    // Tunggu auth selesai
    if (authLoading) return
    
    // Jika tidak ada user, clear balance dan cleanup
    if (!user) {
      setBalances([])
      setLoading(false)
      // Clear cache when user logs out
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.removeItem(BALANCE_CACHE_KEY)
        }
      } catch (error) {
        // Ignore cache clear errors
      }
      
      // Cleanup channels
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {})
        channelRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // On mount/refresh, try to use cached balances first to show data immediately
    const cached = loadBalancesFromCache()
    if (cached && cached.length > 0) {
      setBalances(cached)
      setLoading(false)
      // Still fetch fresh data in background, but don't show loading
      loadBalances(false, true)
    } else {
      // No cache, do initial load with loading indicator
      loadBalances(true, true)
    }

    // Setup Supabase Realtime subscription for real-time balance updates
    const channelName = `balances-changes-${user.id}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'balances',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Balance real-time update:', payload.eventType)
          // Immediately reload balances when change detected (without showing loading)
          loadBalances(false, true)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Balance real-time subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Balance real-time subscription error, falling back to polling')
        }
      })

    channelRef.current = channel

    // Setup polling as fallback (every 5 seconds)
    // This ensures balance updates even if realtime fails
    pollingIntervalRef.current = setInterval(() => {
      loadBalances(false, false)
    }, POLLING_INTERVAL)

    // Cleanup on unmount or user change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {})
        channelRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [user, authLoading, loadBalances])

  // Listen untuk event balance-updated (manual trigger)
  useEffect(() => {
    if (!user || authLoading) return

    const handleUpdate = () => {
      // Force reload when manual event is triggered
      loadBalances(false, true)
    }

    window.addEventListener('balance-updated', handleUpdate)
    return () => window.removeEventListener('balance-updated', handleUpdate)
  }, [user, authLoading, loadBalances])

  // Helper functions
  const getBalance = (token: string): number => {
    const balance = balances.find(b => b.token === token)
    return balance?.balance || 0
  }

  const getTotalPortfolioValue = (): number => {
    return balances.reduce((total, balance) => {
      if (balance.token === 'ZENTRA') {
        return total + balance.balance * ZENTRA_PRICE
      }
      return total
    }, 0)
  }

  const getZentraBalance = (): number => {
    return getBalance('ZENTRA')
  }

  const getZentraValue = (): number => {
    return getZentraBalance() * ZENTRA_PRICE
  }

  const reloadBalances = useCallback(async () => {
    if (!user) return
    // Force reload with loading indicator
    await loadBalances(true, true)
  }, [user, loadBalances])

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
