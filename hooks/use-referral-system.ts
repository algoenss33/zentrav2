"use client"

import { useState, useEffect, useCallback } from "react"
import { getReferrals, getUserById, updateUserBalance } from "@/lib/supabase-client"
import { supabase } from "@/lib/supabase"

// 100 PiNode = 5 PI Network (1 PiNode ≈ 0.05 PI)
const REFERRAL_REWARD = 100 // PiNode bonus per successful referral

// Helper function to get base URL
const getBaseUrl = (): string => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    // Use environment variable if set, otherwise use current origin
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_APP_URL || 'https://minety.com'
}

interface Referral {
  id: string
  referrer_id: string
  referred_email: string
  status: "active" | "inactive"
  bonus_earned: number
  created_at: string
}

interface ReferralData {
  referralCode: string
  totalReferrals: number
  activeReferrals: number
  totalBonusEarned: number
  referrals: Referral[]
}

interface UseReferralSystemProps {
  userId: string
}

export function useReferralSystem({ userId }: UseReferralSystemProps) {
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: "",
    totalReferrals: 0,
    activeReferrals: 0,
    totalBonusEarned: 0,
    referrals: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load referral data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user to get referral code
        const user = await getUserById(userId)
        if (!user) return

        // Get referrals
        const referrals = await getReferrals(userId)

        const activeReferrals = referrals.filter(r => r.status === 'active')
        const totalBonusEarned = referrals.reduce((sum, r) => sum + Number(r.bonus_earned || 0), 0)

        setReferralData({
          referralCode: user.referral_code,
          totalReferrals: referrals.length,
          activeReferrals: activeReferrals.length,
          totalBonusEarned,
          referrals,
        })
      } catch (error) {
        console.error("Failed to load referral data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId])

  // Claim referral bonus
  const claimBonus = useCallback(async () => {
    try {
      // Get all active referrals that haven't been claimed (bonus_earned = 0)
      const referrals = await getReferrals(userId)
      const unclaimedReferrals = referrals.filter(r => r.status === 'active' && Number(r.bonus_earned || 0) === 0)
      
      if (unclaimedReferrals.length === 0) {
        return { success: false, message: "No bonus available to claim" }
      }

      const totalBonus = unclaimedReferrals.length * REFERRAL_REWARD

      // Get current user balance
      const user = await getUserById(userId)
      if (!user) {
        return { success: false, message: "User not found" }
      }

      // Update bonus_earned for all unclaimed referrals
      for (const referral of unclaimedReferrals) {
        await supabase
          .from('referrals')
          .update({ bonus_earned: REFERRAL_REWARD })
          .eq('id', referral.id)
      }

      // Add PiNode (BXT) to user balance
      const newBxtBalance = Number(user.bxt_balance || 0) + totalBonus
      await updateUserBalance(userId, undefined, newBxtBalance)

      // Reload referral data
      const updatedReferrals = await getReferrals(userId)
      const activeReferrals = updatedReferrals.filter(r => r.status === 'active')
      const totalBonusEarned = updatedReferrals.reduce((sum, r) => sum + Number(r.bonus_earned || 0), 0)

      setReferralData(prev => ({
        ...prev,
        totalReferrals: updatedReferrals.length,
        activeReferrals: activeReferrals.length,
        totalBonusEarned,
        referrals: updatedReferrals,
      }))

      return { 
        success: true, 
        message: `Successfully claimed ${totalBonus} PiNode (100 PiNode ≈ 5 PI Network)`, 
        bonus: totalBonus 
      }
    } catch (error) {
      console.error("Failed to claim bonus:", error)
      return { success: false, message: error instanceof Error ? error.message : "Failed to claim bonus" }
    }
  }, [userId])

  // Get referral link
  const getReferralLink = useCallback((): string => {
    const baseUrl = getBaseUrl()
    return `${baseUrl}/ref/${referralData.referralCode}`
  }, [referralData.referralCode])

  // Get pending bonus (unclaimed active referrals)
  const getPendingBonus = useCallback((): number => {
    const unclaimedReferrals = referralData.referrals.filter(r => r.status === 'active' && Number(r.bonus_earned || 0) === 0)
    return unclaimedReferrals.length * REFERRAL_REWARD
  }, [referralData.referrals])

  return {
    referralCode: referralData.referralCode,
    totalReferrals: referralData.totalReferrals,
    activeReferrals: referralData.activeReferrals,
    totalBonusEarned: referralData.totalBonusEarned,
    pendingBonus: getPendingBonus(),
    referrals: referralData.referrals,
    claimBonus,
    getReferralLink,
    isLoading,
  }
}
