"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { APY_TIERS, miningCalculator } from "@/lib/mining-system"
import { getPackagePurchases } from "@/lib/supabase-client"

interface PackageSelectorProps {
  selectedId: number
  onSelect: (id: number) => void
  userUSDTBalance: number
  userId: string
  onPurchaseSuccess?: (tierId: number, price: number) => void
}

export default function PackageSelector({ selectedId, onSelect, userUSDTBalance, userId, onPurchaseSuccess }: PackageSelectorProps) {
  const [purchasingId, setPurchasingId] = useState<number | null>(null)
  const [purchaseError, setPurchaseError] = useState("")
  const [purchasedTiers, setPurchasedTiers] = useState<number[]>([])
  const [contractEndTimes, setContractEndTimes] = useState<Record<number, Date | null>>({})
  const [timeRemaining, setTimeRemaining] = useState<Record<number, number>>({})
  const [showDepositPopup, setShowDepositPopup] = useState(false)

  // Load purchased packages and contract end times
  useEffect(() => {
    const loadPurchases = async () => {
      try {
        const purchases = await getPackagePurchases(userId)
        setPurchasedTiers(purchases.map(p => p.tier_id))
        
        // Calculate contract end times (2 days from purchase)
        const endTimes: Record<number, Date | null> = {}
        purchases.forEach(p => {
          if (p.purchased_at) {
            const purchasedAt = new Date(p.purchased_at)
            endTimes[p.tier_id] = new Date(purchasedAt.getTime() + (2 * 24 * 60 * 60 * 1000))
          }
        })
        setContractEndTimes(endTimes)
      } catch (error) {
        console.error("Failed to load purchases:", error)
      }
    }
    if (userId) {
      loadPurchases()
    }
  }, [userId])

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const remaining: Record<number, number> = {}
      
      Object.entries(contractEndTimes).forEach(([tierId, endTime]) => {
        if (endTime) {
          const diff = endTime.getTime() - now.getTime()
          remaining[Number(tierId)] = Math.max(0, diff)
        }
      })
      
      setTimeRemaining(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [contractEndTimes])

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Expired"
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const handlePurchase = async (tierId: number) => {
    const tier = APY_TIERS.find((t) => t.id === tierId)
    if (!tier) return

    setPurchaseError("")

    // Miner #1 (tier 0) is free - no purchase needed, just activate
    if (tierId === 0) {
      onSelect(tierId)
      return
    }

    // For paid miners (#2, #3, #4), check balance
    if (tier.price > userUSDTBalance) {
      setPurchaseError(`Insufficient balance. You need $${tier.price} USDT but have $${userUSDTBalance.toFixed(2)}`)
      return
    }

    setPurchasingId(tierId)
    try {
      // Check if contract is expired - if so, allow purchase (renewal)
      // Only for paid miners (#2, #3, #4)
      const isActive = await miningCalculator.isContractActive(userId, tierId)
      const isExpired = purchasedTiers.includes(tierId) && !isActive
      
      // Allow purchase if: not purchased yet, or contract expired (renewal)
      if (!purchasedTiers.includes(tierId) || isExpired) {
        await miningCalculator.recordPackagePurchase(userId, tierId, tier.price)
        // Reload purchases to get updated contract end times
        const purchases = await getPackagePurchases(userId)
        setPurchasedTiers(purchases.map(p => p.tier_id))
        
        // Update contract end times
        const endTimes: Record<number, Date | null> = {}
        purchases.forEach(p => {
          if (p.purchased_at) {
            const purchasedAt = new Date(p.purchased_at)
            endTimes[p.tier_id] = new Date(purchasedAt.getTime() + (2 * 24 * 60 * 60 * 1000))
          }
        })
        setContractEndTimes(endTimes)
        
        onPurchaseSuccess?.(tierId, tier.price)
        onSelect(tierId)
      } else {
        setPurchaseError("Contract is still active. Please wait for it to expire.")
      }
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Failed to purchase package")
    } finally {
      setPurchasingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xl sm:text-2xl font-bold text-yellow-300 uppercase tracking-wider">
          Open New Mines
        </h3>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-400/50">
          <img 
            src="/gamety dashboard/coin.png" 
            alt="USDT" 
            className="w-5 h-5"
            style={{ imageRendering: "crisp-edges" }}
          />
          <span className="text-sm font-semibold text-yellow-300">${userUSDTBalance.toFixed(2)} USDT</span>
        </div>
      </div>

      <p className="text-sm text-gray-300">
        Open new mines and increase your income with each level. Hire miners to mine gold for you.
      </p>

      {purchaseError && (
        <Card className="border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">{purchaseError}</p>
        </Card>
      )}

      {/* Mines Grid - Game Actions Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {APY_TIERS.map((tier) => {
          const isPurchased = purchasedTiers.includes(tier.id)
          const isSelected = selectedId === tier.id
          const canAfford = userUSDTBalance >= tier.price
          const hasBalance = userUSDTBalance > 0
          const mineNumber = tier.id + 1
          const contractExpired = isPurchased && tier.id > 0 && (timeRemaining[tier.id] || 0) <= 0

          return (
            <Card
              key={tier.id}
              className={`group relative border-2 transition-all duration-300 overflow-hidden ${
                isSelected
                  ? "border-yellow-400 bg-gradient-to-br from-yellow-600/30 to-orange-600/30 shadow-lg shadow-yellow-400/30 scale-105"
                  : isPurchased
                    ? "border-green-400/50 bg-gradient-to-br from-green-600/20 to-emerald-600/20 hover:border-green-400 hover:scale-105"
                    : !hasBalance
                      ? "border-gray-600/50 opacity-50 cursor-not-allowed bg-gray-800/30"
                      : "border-gray-600/50 hover:border-yellow-400/50 hover:bg-gray-800/50 hover:scale-105"
              }`}
              style={{
                backgroundImage: isPurchased ? `url('/gamety dashboard/${mineNumber}.png')` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundBlendMode: "overlay"
              }}
            >
              {/* Lock Overlay */}
              {!isPurchased && !hasBalance && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10 cursor-pointer"
                  onClick={() => setShowDepositPopup(true)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <img 
                      src="/gamety dashboard/lock.png" 
                      alt="Locked" 
                      className="w-8 h-8"
                      style={{ imageRendering: "crisp-edges" }}
                    />
                    <span className="text-xs text-gray-300">Deposit USDT</span>
                  </div>
                </div>
              )}

              <div className="relative p-4 sm:p-5 text-center">
                {/* Mine Number Badge */}
                <div className="flex items-center justify-center mb-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isSelected 
                      ? "bg-yellow-500/30 text-yellow-300 border border-yellow-400/50"
                      : isPurchased
                        ? "bg-green-500/30 text-green-300 border border-green-400/50"
                        : "bg-gray-700/50 text-gray-400"
                  }`}>
                    Mine #{mineNumber}
                  </div>
                </div>

                {/* Mine Image */}
                <div className="flex justify-center mb-3">
                  <img 
                    src={`/gamety dashboard/${mineNumber}.png`} 
                    alt={`Mine #${mineNumber}`}
                    className={`w-16 h-16 sm:w-20 sm:h-20 object-contain ${
                      !isPurchased && !hasBalance ? "opacity-30 grayscale" : ""
                    }`}
                    style={{ imageRendering: "crisp-edges" }}
                  />
                </div>

                {/* APY Rate */}
                <div className="mb-2">
                  <div className="text-3xl sm:text-4xl font-bold text-yellow-300 mb-1">
                    {tier.apyRate}%
                  </div>
                  <div className="text-xs text-gray-300">APY Rate</div>
                </div>

                {/* Mining Speed */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <img 
                    src="/gamety dashboard/coin.png" 
                    alt="Speed" 
                    className="w-4 h-4"
                    style={{ imageRendering: "crisp-edges" }}
                  />
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    {miningCalculator.calculateMiningSpeed(tier.id).toFixed(0)} GOLD/day
                  </span>
                </div>

                {/* Price */}
                <div className="mb-3">
                  <div className="text-lg font-bold text-yellow-300">
                    ${tier.price} USDT
                  </div>
                  {tier.price === 0 && (
                    <div className="text-xs text-gray-400 mt-1">Free Forever</div>
                  )}
                </div>

                {/* Contract Countdown - Only for paid miners (#2, #3, #4) */}
                {/* Miner #1 (tier 0) is free and has no contract */}
                {isPurchased && tier.id > 0 && contractEndTimes[tier.id] && (
                  <div className={`mb-3 px-2 py-1.5 rounded-md border ${
                    contractExpired 
                      ? "bg-red-500/20 border-red-400/40"
                      : "bg-blue-500/20 border-blue-400/40"
                  }`}>
                    <div className={`text-[9px] uppercase tracking-wide font-medium mb-0.5 ${
                      contractExpired ? "text-red-200/80" : "text-blue-200/80"
                    }`}>
                      {contractExpired ? "Contract Expired" : "Contract Ends In"}
                    </div>
                    <div className={`text-xs font-bold ${
                      contractExpired
                        ? "text-red-400"
                        : (timeRemaining[tier.id] || 0) < 3600000 
                          ? "text-red-400" 
                          : (timeRemaining[tier.id] || 0) < 86400000 
                            ? "text-yellow-400" 
                            : "text-blue-300"
                    }`}>
                      {contractExpired ? "Expired" : formatTimeRemaining(timeRemaining[tier.id] || 0)}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {/* Miner #1 (tier 0) is free - no purchase needed, always available */}
                {tier.id === 0 ? (
                  isSelected ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/30 rounded-lg border border-yellow-400/50">
                      <img 
                        src="/gamety dashboard/coin.png" 
                        alt="Active" 
                        className="w-4 h-4"
                        style={{ imageRendering: "crisp-edges" }}
                      />
                      <span className="text-sm font-semibold text-yellow-300">Active</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => onSelect(tier.id)}
                      className="w-full bg-green-500/30 text-green-300 hover:bg-green-500/40 border border-green-400/50"
                      size="sm"
                    >
                      Activate Mine
                    </Button>
                  )
                ) : isPurchased ? (
                  <>
                    {contractExpired ? (
                      <Button
                        onClick={() => handlePurchase(tier.id)}
                        disabled={!hasBalance || purchasingId === tier.id || !canAfford}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        size="sm"
                      >
                        {purchasingId === tier.id ? "Renewing..." : canAfford ? "Renew Contract" : "Insufficient"}
                      </Button>
                    ) : isSelected ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/30 rounded-lg border border-yellow-400/50">
                        <img 
                          src="/gamety dashboard/coin.png" 
                          alt="Active" 
                          className="w-4 h-4"
                          style={{ imageRendering: "crisp-edges" }}
                        />
                        <span className="text-sm font-semibold text-yellow-300">Active</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => onSelect(tier.id)}
                        className="w-full bg-green-500/30 text-green-300 hover:bg-green-500/40 border border-green-400/50"
                        size="sm"
                      >
                        Activate Mine
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={() => handlePurchase(tier.id)}
                    disabled={!hasBalance || purchasingId === tier.id}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {purchasingId === tier.id ? "Buying..." : canAfford ? "Buy Miners" : "Insufficient"}
                  </Button>
                )}

                {/* Description */}
                <div className="mt-3 text-xs text-gray-400">
                  {tier.description || `Buying miners in mine #${mineNumber}`}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Deposit Popup */}
      <Dialog open={showDepositPopup} onOpenChange={setShowDepositPopup}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl border-0 bg-transparent p-0 overflow-visible shadow-none mx-2 sm:mx-4"
          showCloseButton={false}
        >
          <div className="relative">
            <div 
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
              style={{
                background: "transparent"
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowDepositPopup(false)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 border-2 border-white/30 flex items-center justify-center transition-all z-20"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>

              {/* Popup Image */}
              <img 
                src="/gamety dashboard/popupdeposit.png" 
                alt="Deposit Popup" 
                className="w-full h-auto object-contain rounded-2xl sm:rounded-3xl"
                style={{ imageRendering: "crisp-edges" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
