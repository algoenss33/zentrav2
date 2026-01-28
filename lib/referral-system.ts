// Referral program management

export interface Referral {
  id: string
  referrerId: string
  referredUserId: string
  referralCode: string
  status: "active" | "inactive"
  createdAt: Date
  bonusEarned: number
}

export interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalBonusEarned: number
  pendingBonus: number
  referrals: Referral[]
}

export const REFERRAL_REWARD = 100 // GOLD per successful referral
export const REFERRAL_BONUS_PERCENTAGE = 0.1 // 10% of referral's mining earnings

export class ReferralManager {
  private referrals: Referral[] = []

  constructor(referrals: Referral[] = []) {
    this.referrals = referrals
  }

  // Generate unique referral code
  generateReferralCode(userId: string): string {
    const code = `${userId}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    return code
  }

  // Add a new referral
  addReferral(referrerId: string, referredUserId: string, referralCode: string): Referral {
    const referral: Referral = {
      id: `ref_${Date.now()}`,
      referrerId,
      referredUserId,
      referralCode,
      status: "active",
      createdAt: new Date(),
      bonusEarned: REFERRAL_REWARD,
    }
    this.referrals.push(referral)
    return referral
  }

  // Get referrals by referrer ID
  getReferrals(referrerId: string): Referral[] {
    return this.referrals.filter((r) => r.referrerId === referrerId)
  }

  // Get referral stats
  getReferralStats(referrerId: string): ReferralStats {
    const userReferrals = this.getReferrals(referrerId)
    const activeReferrals = userReferrals.filter((r) => r.status === "active")
    const totalBonusEarned = userReferrals.reduce((sum, r) => sum + r.bonusEarned, 0)

    return {
      totalReferrals: userReferrals.length,
      activeReferrals: activeReferrals.length,
      totalBonusEarned,
      pendingBonus: activeReferrals.length * REFERRAL_REWARD,
      referrals: userReferrals,
    }
  }

  // Find referrer by code
  findReferrerByCode(code: string): string | null {
    const referral = this.referrals.find((r) => r.referralCode === code)
    return referral ? referral.referrerId : null
  }

  // Deactivate referral
  deactivateReferral(referralId: string): boolean {
    const referral = this.referrals.find((r) => r.id === referralId)
    if (referral) {
      referral.status = "inactive"
      return true
    }
    return false
  }

  // Calculate total referral income for a user
  calculateTotalReferralIncome(referrerId: string): number {
    const stats = this.getReferralStats(referrerId)
    return stats.totalBonusEarned + stats.pendingBonus
  }
}

export const referralManager = new ReferralManager()
