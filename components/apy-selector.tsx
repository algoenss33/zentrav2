"use client"

import { Card } from "@/components/ui/card"
import { APY_TIERS } from "@/lib/mining-system"
import { Lock } from "lucide-react"

interface ApySelectorProps {
  selectedId: number
  onSelect: (id: number) => void
  userBalance: number
}

export default function ApySelector({ selectedId, onSelect, userBalance }: ApySelectorProps) {
  const getMinimumBalance = (tierId: number): number => {
    if (tierId === 0) return 0
    if (tierId === 1) return 100
    if (tierId === 2) return 500
    if (tierId === 3) return 2000
    return 0
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Mining Speed (APY)</h3>
        <span className="text-xs text-muted-foreground">Your Balance: {Math.floor(userBalance)} GOLD</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {APY_TIERS.map((tier) => {
          const minBalance = getMinimumBalance(tier.id)
          const isLocked = userBalance < minBalance
          const isSelected = selectedId === tier.id

          return (
            <Card
              key={tier.id}
              onClick={() => !isLocked && onSelect(tier.id)}
              className={`border-2 transition-all p-5 text-center cursor-pointer relative ${
                isLocked
                  ? "border-border opacity-50 cursor-not-allowed bg-card/30"
                  : isSelected
                    ? "border-accent bg-accent/10 shadow-lg shadow-accent/20"
                    : "border-border hover:border-primary/50 hover:bg-card/50"
              }`}
            >
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/40">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                {tier.displayName}
              </div>
              <div className="text-3xl font-bold text-accent mb-2">{tier.apyRate}%</div>
              <div className="text-xs text-muted-foreground mb-3">{tier.description}</div>

              {isSelected && (
                <div className="inline-block px-2 py-1 bg-accent/20 rounded text-xs font-semibold text-accent">
                  Active
                </div>
              )}

              {isLocked && minBalance > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Need {minBalance - Math.floor(userBalance)} GOLD
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-2">×{tier.multiplier} speed</div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
