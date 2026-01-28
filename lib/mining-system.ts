export interface MiningSession {
  id: string
  userId: string
  packageId: number
  startTime: Date
  purchasedAt: Date
  totalMined: number
  miningSpeed: number
  isActive: boolean
}

export interface APYTier {
  id: number
  name: string
  displayName: string
  multiplier: number
  apyRate: number
  baseSpeed: number
  color: "primary" | "accent" | "secondary"
  description: string
  price: number
}

export const APY_TIERS: APYTier[] = [
  {
    id: 0,
    name: "normal",
    displayName: "#Mine 1",
    multiplier: 1,
    apyRate: 100,
    baseSpeed: 10, // 10 PI per day for free miner
    color: "secondary",
    description: "Standard mining speed - 1000 GOLD/day",
    price: 0,
  },
  {
    id: 1,
    name: "booster",
    displayName: "#Mine 2",
    multiplier: 75,
    apyRate: 150,
    baseSpeed: 75000, // 75,000 GOLD per day
    color: "primary",
    description: "75x faster mining - 75,000 GOLD/day",
    price: 50,
  },
  {
    id: 2,
    name: "pro",
    displayName: "#Mine 3",
    multiplier: 200,
    apyRate: 200,
    baseSpeed: 200000, // 200,000 GOLD per day
    color: "accent",
    description: "200x faster mining - 200,000 GOLD/day",
    price: 100,
  },
  {
    id: 3,
    name: "ultra",
    displayName: "#Mine 4",
    multiplier: 400,
    apyRate: 400,
    baseSpeed: 400000, // 400,000 GOLD per day
    color: "accent",
    description: "400x faster mining - 400,000 GOLD/day",
    price: 200,
  },
]

export const DEPOSIT_WALLET_ADDRESS = "0xc494bf9b206aac269199e8c604bb9749646e55e6"
export const DEPOSIT_NETWORK = "BNB BEP20"

export class MiningCalculator {
  // 10 PI per hari untuk paket free
  private baseRate = 10 // PI per day for free package

  // Get mining speed for a specific tier (returns GOLD per day)
  calculateMiningSpeed(apyTierId: number): number {
    const tier = APY_TIERS[apyTierId]
    if (!tier) return APY_TIERS[0].baseSpeed
    return tier.baseSpeed
  }

  getMiningSpeedPerSecond(apyTierId: number): number {
    const dailySpeed = this.calculateMiningSpeed(apyTierId)
    return dailySpeed / 86400 // 86400 detik per hari
  }

  calculatePending(lastClaimTime: Date, apyTierId: number, currentTime: Date = new Date()): number {
    const speedPerSecond = this.getMiningSpeedPerSecond(apyTierId)
    const secondsPassed = (currentTime.getTime() - lastClaimTime.getTime()) / 1000
    return speedPerSecond * secondsPassed
  }

  // Calculate monthly earnings projection
  calculateMonthlyEarnings(apyTierId: number): number {
    const dailySpeed = this.calculateMiningSpeed(apyTierId)
    return dailySpeed * 30
  }

  // Calculate annual earnings projection
  calculateAnnualEarnings(apyTierId: number): number {
    const dailySpeed = this.calculateMiningSpeed(apyTierId)
    return dailySpeed * 365
  }

  // Get APY tier by ID
  getAPYTier(id: number): APYTier | undefined {
    return APY_TIERS.find((tier) => tier.id === id)
  }

  async hasPackagePurchase(userId: string, tierId: number): Promise<boolean> {
    try {
      const { hasPackagePurchase } = await import('@/lib/supabase-client')
      return await hasPackagePurchase(userId, tierId)
    } catch (error) {
      console.error("Failed to check package purchase:", error)
      return false
    }
  }

  // Check if contract is still active (2 days from purchase)
  async isContractActive(userId: string, tierId: number): Promise<boolean> {
    try {
      const { getPackagePurchases } = await import('@/lib/supabase-client')
      const purchases = await getPackagePurchases(userId)
      const purchase = purchases.find(p => p.tier_id === tierId)
      
      if (!purchase || !purchase.purchased_at) return false
      
      const purchasedAt = new Date(purchase.purchased_at)
      const contractEndTime = new Date(purchasedAt.getTime() + (2 * 24 * 60 * 60 * 1000)) // 2 days
      const now = new Date()
      
      return now < contractEndTime
    } catch (error) {
      console.error("Failed to check contract status:", error)
      return false
    }
  }

  // Get contract end time
  async getContractEndTime(userId: string, tierId: number): Promise<Date | null> {
    try {
      const { getPackagePurchases } = await import('@/lib/supabase-client')
      const purchases = await getPackagePurchases(userId)
      const purchase = purchases.find(p => p.tier_id === tierId)
      
      if (!purchase || !purchase.purchased_at) return null
      
      const purchasedAt = new Date(purchase.purchased_at)
      return new Date(purchasedAt.getTime() + (2 * 24 * 60 * 60 * 1000)) // 2 days
    } catch (error) {
      console.error("Failed to get contract end time:", error)
      return null
    }
  }

  async recordPackagePurchase(userId: string, tierId: number, price: number): Promise<void> {
    try {
      const { createPackagePurchase } = await import('@/lib/supabase-client')
      await createPackagePurchase(userId, tierId, price)
    } catch (error) {
      console.error("Failed to record package purchase:", error)
      throw error
    }
  }
}

export const miningCalculator = new MiningCalculator()
