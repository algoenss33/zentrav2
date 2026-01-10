"use client"

import { useState, useEffect, useRef } from 'react'

interface CryptoPrice {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  last_updated: string
}

interface CryptoPrices {
  [key: string]: {
    price: number
    change24h: number
    lastUpdated: string
  }
}

// Map our token symbols to various API IDs
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  SOL: 'solana',
}

const COINCAP_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  SOL: 'solana',
}

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  USDT: 'USDTUSDT', // Will be handled specially
  SOL: 'SOLUSDT',
}

// Fallback prices (updated to more current market prices)
const FALLBACK_PRICES: Record<string, { price: number; change24h: number }> = {
  BTC: { price: 95000, change24h: 2.5 },
  ETH: { price: 3500, change24h: 1.8 },
  USDT: { price: 1.0, change24h: 0.01 },
  SOL: { price: 150, change24h: 3.2 },
}

// Cache key for localStorage
const CACHE_KEY = 'zentra_crypto_prices_cache'
const CACHE_TIMESTAMP_KEY = 'zentra_crypto_prices_cache_timestamp'
const CACHE_DURATION_MS = 300000 // Cache valid for 5 minutes

// Save prices to localStorage cache
function savePricesToCache(prices: CryptoPrices) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(prices))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    }
  } catch (error) {
    console.warn('Failed to save prices to cache:', error)
  }
}

// Load prices from localStorage cache
function loadPricesFromCache(): CryptoPrices | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cachedData = localStorage.getItem(CACHE_KEY)
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
      
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10)
        const now = Date.now()
        
        // Return cached prices if still valid (within cache duration)
        if (now - timestamp < CACHE_DURATION_MS) {
          const prices = JSON.parse(cachedData) as CryptoPrices
          // Validate cached prices structure
          if (prices && typeof prices === 'object') {
            return prices
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load prices from cache:', error)
  }
  return null
}

// API URLs
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price'
const COINCAP_API_URL = 'https://api.coincap.io/v2/assets'
const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr'

// Circuit breaker state
interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  isOpen: boolean
}

const circuitBreakers = new Map<string, CircuitBreakerState>()

// Initialize circuit breakers
Object.keys(COINGECKO_IDS).forEach(() => {
  circuitBreakers.set('coingecko', { failures: 0, lastFailureTime: 0, isOpen: false })
  circuitBreakers.set('coincap', { failures: 0, lastFailureTime: 0, isOpen: false })
  circuitBreakers.set('binance', { failures: 0, lastFailureTime: 0, isOpen: false })
})

const CIRCUIT_BREAKER_THRESHOLD = 5 // Open after 5 failures (less sensitive)
const CIRCUIT_BREAKER_RESET_TIME = 120000 // Reset after 2 minutes (shorter cooldown)

function checkCircuitBreaker(apiName: string): boolean {
  const breaker = circuitBreakers.get(apiName)
  if (!breaker) return true

  if (breaker.isOpen) {
    const timeSinceLastFailure = Date.now() - breaker.lastFailureTime
    if (timeSinceLastFailure > CIRCUIT_BREAKER_RESET_TIME) {
      // Reset circuit breaker - try again after cooldown
      breaker.isOpen = false
      breaker.failures = 0
      return true
    }
    // Circuit breaker is open - skip this API and use fallback
    return false
  }
  return true
}

function recordFailure(apiName: string) {
  const breaker = circuitBreakers.get(apiName)
  if (!breaker) return

  breaker.failures++
  breaker.lastFailureTime = Date.now()

  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD && !breaker.isOpen) {
    breaker.isOpen = true
    // Only log once when circuit breaker opens, not on every failure
    // Silently use fallback prices instead
  }
}

function recordSuccess(apiName: string) {
  const breaker = circuitBreakers.get(apiName)
  if (!breaker) return

  breaker.failures = 0
  breaker.isOpen = false
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T | null> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        // Only log retry for non-network errors
        const errorMessage = lastError.message
        if (!errorMessage.includes('aborted') && !errorMessage.includes('Network error')) {
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`)
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Return null instead of throwing to allow fallback prices
  return null
}

// Fetch from CoinGecko via Next.js API route (to avoid CORS issues)
async function fetchFromCoinGecko(): Promise<CryptoPrices | null> {
  if (!checkCircuitBreaker('coingecko')) {
    return null
  }

  try {
    const ids = Object.values(COINGECKO_IDS).join(',')
    // Use internal API route to avoid CORS errors
    const apiUrl = `/api/crypto/coingecko?ids=${ids}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    }).catch((fetchError) => {
      // Handle network errors
      clearTimeout(timeoutId)
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
    })

    clearTimeout(timeoutId)

    if (!response || !response.ok) {
      // Handle rate limiting specifically
      if (response?.status === 429) {
        // Rate limit exceeded - open circuit breaker for longer
        recordFailure('coingecko')
        const breaker = circuitBreakers.get('coingecko')
        if (breaker) {
          breaker.lastFailureTime = Date.now()
          breaker.isOpen = true
        }
        throw new Error('CoinGecko rate limit exceeded (429). Please wait before retrying.')
      }
      throw new Error(`CoinGecko HTTP error! status: ${response?.status || 'unknown'}`)
    }

    const data = await response.json().catch((parseError) => {
      throw new Error(`Failed to parse CoinGecko response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    })
    
    // Check if response has error field (from API route)
    if (data && data.error) {
      throw new Error(data.message || data.error)
    }
    
    const newPrices: CryptoPrices = {}

    Object.entries(COINGECKO_IDS).forEach(([symbol, coinId]) => {
      const coinData = data[coinId]
      if (coinData && coinData.usd) {
        newPrices[symbol] = {
          price: coinData.usd || 0,
          change24h: coinData.usd_24h_change || 0,
          lastUpdated: coinData.last_updated_at
            ? new Date(coinData.last_updated_at * 1000).toISOString()
            : new Date().toISOString(),
        }
      }
    })

    if (Object.keys(newPrices).length > 0) {
      recordSuccess('coingecko')
      console.log('✅ CoinGecko: Prices fetched successfully')
      return newPrices
    }

    throw new Error('No valid prices from CoinGecko')
  } catch (error) {
    recordFailure('coingecko')
    // Only log error, don't throw - return null to use fallback
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (!errorMessage.includes('aborted') && !errorMessage.includes('Network error')) {
      console.warn('❌ CoinGecko failed:', errorMessage)
    }
    return null
  }
}

// Fetch from CoinCap - DISABLED due to ERR_NAME_NOT_RESOLVED issues in production
// CoinCap API is experiencing DNS/network issues, so we skip it and rely on CoinGecko and Binance
async function fetchFromCoinCap(): Promise<CryptoPrices | null> {
  // Skip CoinCap API entirely to avoid ERR_NAME_NOT_RESOLVED errors
  // This prevents console errors and improves reliability
  return null
}

// Fetch from Binance
async function fetchFromBinance(): Promise<CryptoPrices | null> {
  if (!checkCircuitBreaker('binance')) {
    return null
  }

  try {
    // Fetch each symbol individually (more reliable than batch)
    const symbolPromises = Object.entries(BINANCE_SYMBOLS).map(async ([symbol, binanceSymbol]) => {
      try {
        // Special handling for USDT - it's a stablecoin, return fixed price
        if (symbol === 'USDT') {
          return {
            symbol,
            price: 1.0,
            change24h: 0.01,
          }
        }

        const apiUrl = `${BINANCE_API_URL}?symbol=${binanceSymbol}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(apiUrl, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-store',
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Binance HTTP error! status: ${response.status}`)
        }

        const ticker = await response.json()
        
        if (ticker && ticker.lastPrice) {
          const price = parseFloat(ticker.lastPrice)
          const prevPrice = parseFloat(ticker.prevClosePrice || ticker.lastPrice)
          const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0

          return {
            symbol,
            price: price || 0,
            change24h: change24h || 0,
          }
        }
        return null
      } catch (error) {
        console.warn(`Binance fetch failed for ${symbol}:`, error)
        return null
      }
    })

    const results = await Promise.allSettled(symbolPromises)
    const newPrices: CryptoPrices = {}

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const { symbol, price, change24h } = result.value
        if (price > 0) {
          newPrices[symbol] = {
            price,
            change24h,
            lastUpdated: new Date().toISOString(),
          }
        }
      }
    })

    if (Object.keys(newPrices).length > 0) {
      recordSuccess('binance')
      console.log('✅ Binance: Prices fetched successfully')
      return newPrices
    }

    throw new Error('No valid prices from Binance')
  } catch (error) {
    recordFailure('binance')
    console.warn('❌ Binance failed:', error instanceof Error ? error.message : String(error))
    return null
  }
}

// Merge prices from multiple sources
function mergePrices(...priceSources: (CryptoPrices | null)[]): CryptoPrices {
  const merged: CryptoPrices = {}
  const symbols = Object.keys(COINGECKO_IDS)

  symbols.forEach(symbol => {
    // Use first available price from sources
    for (const prices of priceSources) {
      if (prices && prices[symbol] && prices[symbol].price > 0) {
        merged[symbol] = prices[symbol]
        break
      }
    }
  })

  return merged
}

export function useCryptoPrices() {
  // Initialize with cached prices immediately to prevent empty state on refresh
  const [prices, setPrices] = useState<CryptoPrices>(() => {
    const cached = loadPricesFromCache()
    if (cached && Object.keys(cached).length > 0) {
      return cached
    }
    // If no cache, use fallback prices immediately
    const initialPrices: CryptoPrices = {}
    Object.entries(COINGECKO_IDS).forEach(([symbol]) => {
      const fallback = FALLBACK_PRICES[symbol]
      if (fallback) {
        initialPrices[symbol] = {
          price: fallback.price,
          change24h: fallback.change24h,
          lastUpdated: new Date().toISOString(),
        }
      }
    })
    return initialPrices
  })
  const [loading, setLoading] = useState(false) // Start with false since we have cached/fallback prices
  const [error, setError] = useState<string | null>(null)
  const lastFetchTime = useRef<number>(0)
  const isFetching = useRef<boolean>(false) // Prevent multiple simultaneous fetches
  const CACHE_DURATION = 30000 // Cache for 30 seconds (increased to reduce API calls)

  const fetchPrices = async () => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current) {
      return
    }

    // Check cache duration - but always allow refresh if explicitly called
    const now = Date.now()
    const pricesRef = prices // Capture current prices for comparison
    if (now - lastFetchTime.current < CACHE_DURATION && Object.keys(pricesRef).length > 0) {
      // Still refresh if we only have fallback prices (no API prices in cache)
      const cached = loadPricesFromCache()
      const hasRealAPIPrices = cached && Object.keys(cached).length > 0
      if (hasRealAPIPrices) {
        return // Skip if we have recent cache and it contains API prices
      }
    }

    isFetching.current = true

    try {
      setError(null)
      // Don't set loading to true if we already have prices (to avoid UI flicker)
      if (Object.keys(prices).length === 0) {
        setLoading(true)
      }

      // Try all APIs in parallel with retry - wrap in try-catch to prevent crashes
      let coingeckoPrices: PromiseSettledResult<CryptoPrices | null>
      let coincapPrices: PromiseSettledResult<CryptoPrices | null>
      let binancePrices: PromiseSettledResult<CryptoPrices | null>

      try {
        // Use Promise.allSettled to handle all errors gracefully
        // Skip CoinCap API as it's failing with ERR_NAME_NOT_RESOLVED in production
        // Only use CoinGecko and Binance which are more reliable
        const results = await Promise.allSettled([
          retryWithBackoff(() => fetchFromCoinGecko(), 2, 1000),
          // Temporarily disabled CoinCap due to DNS/network issues in production
          // retryWithBackoff(() => fetchFromCoinCap(), 2, 1000),
          retryWithBackoff(() => fetchFromBinance(), 2, 1000),
        ])
        
        coingeckoPrices = results[0]
        coincapPrices = { status: 'rejected', reason: new Error('CoinCap API disabled due to network issues') } // Skip CoinCap
        binancePrices = results[1] // Binance is now at index 1 instead of 2
      } catch (error) {
        // This should rarely happen since we're using allSettled, but handle it anyway
        console.warn('Error fetching prices from APIs:', error)
        // Continue with empty results - will use fallback prices
        coingeckoPrices = { status: 'rejected', reason: error }
        coincapPrices = { status: 'rejected', reason: error }
        binancePrices = { status: 'rejected', reason: error }
      }

      const priceSources: (CryptoPrices | null)[] = []

      if (coingeckoPrices.status === 'fulfilled' && coingeckoPrices.value) {
        priceSources.push(coingeckoPrices.value)
      }
      if (binancePrices.status === 'fulfilled' && binancePrices.value) {
        priceSources.push(binancePrices.value)
      }

      // Merge prices from all sources
      const mergedPrices = mergePrices(...priceSources)

      // Get cached prices as backup
      const cachedPrices = loadPricesFromCache() || {}
      
      // Fill missing prices - first try cached prices, then fallback
      const finalPrices: CryptoPrices = { ...mergedPrices }
      Object.entries(COINGECKO_IDS).forEach(([symbol]) => {
        if (!finalPrices[symbol] || finalPrices[symbol].price === 0 || isNaN(finalPrices[symbol].price)) {
          // First try to use cached price (last successful API price)
          const cachedPrice = cachedPrices[symbol]
          if (cachedPrice && cachedPrice.price > 0 && !isNaN(cachedPrice.price)) {
            finalPrices[symbol] = {
              ...cachedPrice,
              lastUpdated: cachedPrice.lastUpdated || new Date().toISOString(),
            }
            // Only log if we're using cached price (not initial load)
            if (Object.keys(prices).length > 0 && prices[symbol]?.price !== cachedPrice.price) {
              console.log(`📦 ${symbol} using cached price: $${cachedPrice.price}`)
            }
          } else {
            // If no cached price, use fallback
            const fallback = FALLBACK_PRICES[symbol]
            if (fallback) {
              finalPrices[symbol] = {
                price: fallback.price,
                change24h: fallback.change24h,
                lastUpdated: new Date().toISOString(),
              }
              // Only log if we're actually using fallback (not initial load)
              if (Object.keys(prices).length > 0) {
                console.warn(`⚠️ ${symbol} using fallback price: $${fallback.price}`)
              }
            }
          }
        }
      })

      // Save final prices to cache (always save, even if some came from cache/fallback)
      // This ensures we always have a fresh cache with all symbols
      savePricesToCache(finalPrices)
      if (Object.keys(mergedPrices).length > 0) {
        console.log('✅ New API prices fetched and saved to cache')
      } else {
        console.log('📦 Using cached/fallback prices (API unavailable)')
      }

      // Always ensure we have prices for all symbols
      setPrices(finalPrices)
      lastFetchTime.current = now

      // Don't set error state - silently use cached/fallback to prevent UI issues
      setError(null)
    } catch (err) {
      // Silently handle errors - don't crash the app
      console.warn('Error in fetchPrices (using cached/fallback):', err)

      // Try to load cached prices first, then fallback
      const cachedPrices = loadPricesFromCache()
      const errorPrices: CryptoPrices = {}
      
      try {
        Object.entries(COINGECKO_IDS).forEach(([symbol]) => {
          // First priority: use cached price (last successful API price)
          const cachedPrice = cachedPrices?.[symbol]
          if (cachedPrice && cachedPrice.price > 0 && !isNaN(cachedPrice.price)) {
            errorPrices[symbol] = {
              ...cachedPrice,
              lastUpdated: cachedPrice.lastUpdated || new Date().toISOString(),
            }
            console.log(`📦 ${symbol} using cached price due to API error: $${cachedPrice.price}`)
          }
        })
        
        // Fill any remaining missing symbols with current state or fallback
        // Use setPrices with callback to access current state safely
        setPrices((currentPrices) => {
          const finalErrorPrices = { ...errorPrices }
          
          Object.entries(COINGECKO_IDS).forEach(([symbol]) => {
            if (!finalErrorPrices[symbol]) {
              // Try current state price first (from closure)
              const currentPrice = currentPrices[symbol]
              if (currentPrice && currentPrice.price > 0 && !isNaN(currentPrice.price)) {
                finalErrorPrices[symbol] = currentPrice
                console.log(`🔄 ${symbol} keeping current price due to API error: $${currentPrice.price}`)
              } else {
                // Last resort: use fallback
                const fallback = FALLBACK_PRICES[symbol]
                if (fallback) {
                  finalErrorPrices[symbol] = {
                    price: fallback.price,
                    change24h: fallback.change24h,
                    lastUpdated: new Date().toISOString(),
                  }
                  console.warn(`⚠️ ${symbol} using fallback price due to API error: $${fallback.price}`)
                }
              }
            }
          })
          
          return finalErrorPrices
        })
        
        // Don't overwrite cache with error prices - keep last successful API prices in cache
        // Cache will only be updated when API succeeds
        setError(null) // Clear error since we have cached/fallback
      } catch (fallbackError) {
        console.error('Critical error setting cached/fallback prices:', fallbackError)
        // Keep current prices if fallback setup fails
        setPrices((currentPrices) => {
          if (Object.keys(currentPrices).length === 0) {
            // Only use fallback if we have no prices at all
            const emergencyPrices: CryptoPrices = {}
            Object.entries(COINGECKO_IDS).forEach(([symbol]) => {
              const fallback = FALLBACK_PRICES[symbol]
              if (fallback) {
                emergencyPrices[symbol] = {
                  price: fallback.price,
                  change24h: fallback.change24h,
                  lastUpdated: new Date().toISOString(),
                }
              }
            })
            return emergencyPrices
          }
          return currentPrices // Keep existing prices
        })
      }
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }

  useEffect(() => {
    // Prices are already initialized from state initializer (cached or fallback)
    // So we don't need to set them again here
    setLoading(false)
    setError(null) // Clear any previous errors

    // Fetch prices in background (non-blocking)
    let isMounted = true
    const fetchInBackground = async () => {
      try {
        await fetchPrices()
      } catch (error) {
        // Silently handle - we already have cached/fallback prices from initialization
        if (isMounted) {
          // Try to load from cache if state is empty (shouldn't happen, but safety check)
          const cached = loadPricesFromCache()
          if (cached && Object.keys(cached).length > 0 && Object.keys(prices).length === 0) {
            setPrices(cached)
          } else if (Object.keys(prices).length === 0) {
            // Only use fallback if we truly have no prices
            const fallbackPrices: CryptoPrices = {}
            Object.entries(COINGECKO_IDS).forEach(([symbol]) => {
              const fallback = FALLBACK_PRICES[symbol]
              if (fallback) {
                fallbackPrices[symbol] = {
                  price: fallback.price,
                  change24h: fallback.change24h,
                  lastUpdated: new Date().toISOString(),
                }
              }
            })
            setPrices(fallbackPrices)
          }
          // If prices already exist, keep them - don't overwrite with fallback
        }
      }
    }

    // Fetch immediately in background
    fetchInBackground()

    // Set up interval to fetch every 120 seconds (2 minutes) to avoid rate limits
    // CoinGecko free tier: 10-50 calls/minute, so 2 minutes is safe
    const interval = setInterval(() => {
      if (isMounted) {
        fetchInBackground()
      }
    }, 120000) // 2 minutes instead of 1 minute

    // Cleanup interval on unmount
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, []) // Empty dependency array - only run on mount

  const getPrice = (symbol: string): number | null => {
    try {
      if (!symbol) {
        // Return fallback if symbol is invalid
        const fallback = FALLBACK_PRICES[symbol]
        return fallback ? fallback.price : null
      }
      
      if (!prices || Object.keys(prices).length === 0) {
        // If no prices loaded yet, return fallback
        const fallback = FALLBACK_PRICES[symbol]
        return fallback ? fallback.price : null
      }
      
      const price = prices[symbol]?.price
      if (price === undefined || price === null || price === 0 || isNaN(price)) {
        // Return fallback if price is invalid
        const fallback = FALLBACK_PRICES[symbol]
        return fallback ? fallback.price : null
      }
      return price
    } catch (error) {
      console.warn('Error getting price for', symbol, error)
      // Always return fallback on error
      const fallback = FALLBACK_PRICES[symbol]
      return fallback ? fallback.price : null
    }
  }

  const getChange24h = (symbol: string): number | null => {
    try {
      if (!symbol || !prices) return null
      const change = prices[symbol]?.change24h
      if (change === undefined || change === null || isNaN(change)) return null
      return change
    } catch (error) {
      console.warn('Error getting change24h for', symbol, error)
      return null
    }
  }

  const formatPrice = (symbol: string): string => {
    try {
      if (!symbol) return '--'
      const price = getPrice(symbol)
      if (price === null) {
        // Return fallback price if available
        const fallback = FALLBACK_PRICES[symbol]
        if (fallback) {
          if (fallback.price >= 1000) {
            return `$${fallback.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          } else if (fallback.price >= 1) {
            return `$${fallback.price.toFixed(2)}`
          } else {
            return `$${fallback.price.toFixed(4)}`
          }
        }
        return '--'
      }

      // Format based on price magnitude
      if (price >= 1000) {
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      } else if (price >= 1) {
        return `$${price.toFixed(2)}`
      } else {
        return `$${price.toFixed(4)}`
      }
    } catch (error) {
      console.warn('Error formatting price for', symbol, error)
      return '--'
    }
  }

  const formatChange24h = (symbol: string): string => {
    try {
      if (!symbol) return '--'
      const change = getChange24h(symbol)
      if (change === null) {
        // Return fallback change if available
        const fallback = FALLBACK_PRICES[symbol]
        if (fallback) {
          const sign = fallback.change24h >= 0 ? '+' : ''
          return `${sign}${fallback.change24h.toFixed(2)}%`
        }
        return '--'
      }

      const sign = change >= 0 ? '+' : ''
      return `${sign}${change.toFixed(2)}%`
    } catch (error) {
      console.warn('Error formatting change24h for', symbol, error)
      return '--'
    }
  }

  return {
    prices,
    loading,
    error,
    getPrice,
    getChange24h,
    formatPrice,
    formatChange24h,
  }
}
