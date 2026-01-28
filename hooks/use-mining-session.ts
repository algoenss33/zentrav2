"use client"

import { useState, useEffect, useCallback } from "react"
import { miningCalculator, type APYTier } from "@/lib/mining-system"
import { getMiningSession, createMiningSession, updateMiningSession } from "@/lib/supabase-client"

interface UseMiningSessionProps {
  userId: string
  initialApyTierId?: number
}

interface MiningState {
  apyTierId: number
  apyTier: APYTier | undefined
  miningSpeed: number
  pending: number
  totalMined: number
  lastClaimTime: Date
  lastSyncTime: Date
  timeUntilNextClaim: number
  miningBalance: number
}

export function useMiningSession({ userId, initialApyTierId = 0 }: UseMiningSessionProps) {
  const [state, setState] = useState<MiningState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load mining session from database and calculate offline mining
  useEffect(() => {
    const loadSession = async () => {
      try {
        let session = await getMiningSession(userId)
        
        if (!session) {
          // Create new session if doesn't exist
          session = await createMiningSession(userId, initialApyTierId)
        }

        const lastClaim = session.last_claim_time ? new Date(session.last_claim_time) : new Date()
        const apyTierId = session.apy_tier_id || 0
        const apyTier = miningCalculator.getAPYTier(apyTierId)
        
        // Check if contract is still active (2 days from purchase)
        // Miner #1 (tier 0) is free and never expires
        let isContractActive = true
        let contractEndTime: Date | null = null
        if (apyTierId > 0) {
          // Only check contract for paid miners (#2, #3, #4)
          isContractActive = await miningCalculator.isContractActive(userId, apyTierId)
          contractEndTime = await miningCalculator.getContractEndTime(userId, apyTierId)
        } else {
          // Miner #1 (tier 0) is always active - no contract needed
          isContractActive = true
        }
        
        // Calculate offline mining - mining continues even when browser is closed
        // Strategy: 
        // - mining_balance in DB = balance at last sync (updated_at)
        // - last_claim_time = time of last claim (only updates on claim)
        // - We calculate: balance at last sync + mining since last sync
        const now = new Date()
        const lastSync = session.updated_at ? new Date(session.updated_at) : lastClaim
        
        // If contract expired, calculate mining only until contract end time
        let secondsSinceSync = Math.max(0, (now.getTime() - lastSync.getTime()) / 1000)
        let activeTierId = apyTierId
        let totalPending = 0
        const balanceAtLastSync = Number(session.mining_balance || 0) // Always define this first
        
        if (!isContractActive && apyTierId > 0 && contractEndTime) {
          // Contract expired - calculate mining only until contract end
          const lastSyncTime = lastSync.getTime()
          const contractEndTimeMs = contractEndTime.getTime()
          
          // Only mine until contract end time
          if (lastSyncTime < contractEndTimeMs) {
            const secondsUntilExpiry = Math.max(0, (contractEndTimeMs - lastSyncTime) / 1000)
            const speedPerSecond = miningCalculator.getMiningSpeedPerSecond(apyTierId)
            const minedUntilExpiry = speedPerSecond * secondsUntilExpiry
            
            totalPending = balanceAtLastSync + minedUntilExpiry
            activeTierId = 0 // Stop mining after expiry
          } else {
            // Contract already expired before last sync - no new mining
            totalPending = balanceAtLastSync
            activeTierId = 0
          }
        } else {
          // Contract is active or tier 0 (free)
          const speedPerSecond = miningCalculator.getMiningSpeedPerSecond(activeTierId)
          const minedSinceLastSync = speedPerSecond * secondsSinceSync
          totalPending = balanceAtLastSync + minedSinceLastSync
        }
        
        const activeTier = miningCalculator.getAPYTier(activeTierId)
        const miningSpeed = miningCalculator.calculateMiningSpeed(activeTierId)
        
        // Don't auto-update tier to 0 - let user manually renew contract
        // This allows them to collect GOLD even after contract expires

        setState({
          apyTierId: activeTierId,
          apyTier: activeTier,
          miningSpeed,
          pending: totalPending,
          totalMined: Number(session.total_mined || 0),
          lastClaimTime: lastClaim,
          lastSyncTime: lastSync,
          timeUntilNextClaim: 0,
          miningBalance: balanceAtLastSync, // Store balance at last sync for reference
        })
      } catch (error) {
        console.error("Failed to load mining session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadSession()
    }
  }, [userId, initialApyTierId])

  // Update pending amount in real-time and sync to database periodically
  useEffect(() => {
    if (!state) return

    let syncCounter = 0
    
    const interval = setInterval(async () => {
      const now = new Date()
      
      // Check if contract is still active for paid tiers
      // Miner #1 (tier 0) is always active - no contract needed
      let activeTierId = state.apyTierId
      let pendingAmount = 0
      
      if (state.apyTierId > 0) {
        // Only check contract for paid miners (#2, #3, #4)
        const isActive = await miningCalculator.isContractActive(userId, state.apyTierId)
        if (!isActive) {
          // Contract expired - calculate mining only until contract end
          const contractEndTime = await miningCalculator.getContractEndTime(userId, state.apyTierId)
          if (contractEndTime) {
            const lastSyncTime = state.lastSyncTime.getTime()
            const contractEndTimeMs = contractEndTime.getTime()
            
            if (lastSyncTime < contractEndTimeMs) {
              // Still mine until contract end
              const secondsUntilExpiry = Math.max(0, (contractEndTimeMs - lastSyncTime) / 1000)
              const speedPerSecond = miningCalculator.getMiningSpeedPerSecond(state.apyTierId)
              pendingAmount = state.miningBalance + (speedPerSecond * secondsUntilExpiry)
              // Don't change tier yet - allow user to collect and renew
            } else {
              // Contract already expired - no new mining
              pendingAmount = state.miningBalance
              activeTierId = 0 // Revert to free miner after contract expires
            }
          } else {
            // No contract end time found - stop mining
            pendingAmount = state.miningBalance
            activeTierId = 0 // Revert to free miner
          }
        } else {
          // Contract is active - continue mining
          const secondsSinceLastSync = (now.getTime() - state.lastSyncTime.getTime()) / 1000
          const speedPerSecond = miningCalculator.getMiningSpeedPerSecond(activeTierId)
          pendingAmount = state.miningBalance + (speedPerSecond * secondsSinceLastSync)
        }
      } else {
        // Miner #1 (tier 0) - always active, continue mining normally forever
        const secondsSinceLastSync = (now.getTime() - state.lastSyncTime.getTime()) / 1000
        const speedPerSecond = miningCalculator.getMiningSpeedPerSecond(activeTierId)
        pendingAmount = state.miningBalance + (speedPerSecond * secondsSinceLastSync)
      }

      setState((prev) => {
        if (!prev) return prev
        const activeTier = miningCalculator.getAPYTier(activeTierId)
        return {
          ...prev,
          apyTierId: activeTierId,
          apyTier: activeTier,
          miningSpeed: miningCalculator.calculateMiningSpeed(activeTierId),
          pending: pendingAmount,
        }
      })

      // Sync to database every 30 seconds to save progress
      syncCounter++
      if (syncCounter >= 30) {
        syncCounter = 0
        try {
          await updateMiningSession(userId, {
            mining_balance: pendingAmount,
            apy_tier_id: activeTierId,
            // Don't update last_claim_time - it only updates on actual claim
            // updated_at will be automatically updated by the function
          })
          // Update miningBalance and lastSyncTime after successful sync
          setState((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              miningBalance: pendingAmount,
              lastSyncTime: now,
            }
          })
        } catch (error) {
          console.error("Failed to sync mining balance:", error)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state, userId])

  // Update APY tier
  const setApyTier = useCallback(
    async (tierId: number) => {
      const tier = miningCalculator.getAPYTier(tierId)
      if (!tier) return

      try {
        const newMiningSpeed = miningCalculator.calculateMiningSpeed(tierId)
        const now = new Date()
        
        await updateMiningSession(userId, {
          apy_tier_id: tierId,
        })

        setState((prev) => {
          if (!prev) return prev
          // When activating new tier, keep existing mining balance
          // Mining will continue from current balance with new speed
          return {
            ...prev,
            apyTierId: tierId,
            apyTier: tier,
            miningSpeed: newMiningSpeed,
            // Update lastSyncTime to current time so mining starts fresh with new tier
            lastSyncTime: now,
          }
        })
      } catch (error) {
        console.error("Failed to update tier:", error)
      }
    },
    [userId],
  )

  const processClaim = useCallback(
    async (claimedAmount: number) => {
      if (!state) return

      try {
        const now = new Date()
        const newTotalMined = state.totalMined + claimedAmount

        // Reset mining balance and update last_claim_time
        // This ensures offline mining calculation starts from this point
        await updateMiningSession(userId, {
          mining_balance: 0,
          total_mined: newTotalMined,
          last_claim_time: now.toISOString(),
        })

        setState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            lastClaimTime: now,
            lastSyncTime: now,
            timeUntilNextClaim: 0,
            pending: 0,
            totalMined: newTotalMined,
            miningBalance: 0,
          }
        })
      } catch (error) {
        console.error("Failed to process claim:", error)
      }
    },
    [userId, state],
  )

  // Get projected earnings
  const getMonthlyProjection = useCallback(() => {
    if (!state) return 0
    return miningCalculator.calculateMonthlyEarnings(state.apyTierId)
  }, [state])

  const getAnnualProjection = useCallback(() => {
    if (!state) return 0
    return miningCalculator.calculateAnnualEarnings(state.apyTierId)
  }, [state])

  if (isLoading || !state) {
    return {
      apyTierId: initialApyTierId,
      apyTier: miningCalculator.getAPYTier(initialApyTierId),
      miningSpeed: miningCalculator.calculateMiningSpeed(initialApyTierId),
      pending: 0,
      totalMined: 0,
      lastClaimTime: new Date(),
      lastSyncTime: new Date(),
      timeUntilNextClaim: 0,
      miningBalance: 0,
      setApyTier,
      processClaim,
      getMonthlyProjection,
      getAnnualProjection,
    }
  }

  return {
    ...state,
    setApyTier,
    processClaim,
    getMonthlyProjection,
    getAnnualProjection,
  }
}
