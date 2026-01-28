"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useReferralSystem } from "@/hooks/use-referral-system"

interface ReferralSectionProps {
  userId?: string
  onBonusEarned?: (bonus: number) => void
}

export default function ReferralSection({ userId = "user-1", onBonusEarned }: ReferralSectionProps) {
  const referral = useReferralSystem({ userId })
  const [copied, setCopied] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimMessage, setClaimMessage] = useState("")

  const handleCopy = () => {
    navigator.clipboard.writeText(referral.getReferralLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClaimBonus = async () => {
    setIsClaiming(true)
    setClaimMessage("")
    
    const result = await referral.claimBonus()
    
    if (result.success) {
      setClaimMessage(result.message)
      // Call onBonusEarned callback to update GOLD balance in parent
      if (onBonusEarned && result.bonus) {
        onBonusEarned(result.bonus)
      }
      setTimeout(() => setClaimMessage(""), 5000)
    } else {
      setClaimMessage(result.message)
      setTimeout(() => setClaimMessage(""), 5000)
    }
    
    setIsClaiming(false)
  }

  return (
    <div className="space-y-4">
      {/* Kartu ringkas: statistik referral & PiNode */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
            <p className="text-sm font-semibold text-foreground">
              {referral.totalReferrals}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Friends invited</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">PiNode Earned</p>
            <p className="text-sm font-semibold text-foreground">
              {referral.totalBonusEarned.toLocaleString()}{" "}
              <span className="text-[11px] text-muted-foreground">PiNode</span>
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            100 PiNode ≈ 5 PI Network
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Pending PiNode</p>
            <p className="text-sm font-semibold text-foreground">
              {referral.pendingBonus.toLocaleString()}{" "}
              <span className="text-[11px] text-muted-foreground">PiNode</span>
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ready to be claimed to your PiNode balance.
          </p>
        </div>
      </Card>

      {/* Kartu link referral */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">
            Referral Link
          </p>
          <p className="text-[11px] text-muted-foreground">
            Share this link with your friends. Every active friend gives you{" "}
            <span className="font-semibold">100 PiNode (≈ 5 PI)</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={referral.getReferralLink()}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-xs text-foreground font-mono"
          />
          <Button
            onClick={handleCopy}
            size="sm"
            className="gap-1 px-3 text-xs font-semibold"
          >
            {copied ? (
              <>
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Kartu claim PiNode */}
      {referral.pendingBonus > 0 && (
        <Card className="border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Claim Referral PiNode
            </p>
            <p className="text-xs text-muted-foreground">
              You have{" "}
              <span className="font-semibold">
                {referral.pendingBonus.toLocaleString()} PiNode
              </span>{" "}
              ready to claim. 100 PiNode ≈ 5 PI Network.
            </p>
            {claimMessage && (
              <p
                className={`text-xs mt-2 font-semibold ${
                  claimMessage.includes("Successfully")
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {claimMessage}
              </p>
            )}
          </div>
          <Button
            onClick={handleClaimBonus}
            disabled={isClaiming || referral.pendingBonus === 0}
            className="w-full text-xs font-semibold"
          >
            {isClaiming ? "Claiming..." : "Claim PiNode"}
          </Button>
        </Card>
      )}

      {/* How It Works - very simple */}
      <Card className="border-border bg-card/50 backdrop-blur-sm p-4 space-y-1.5">
        <h4 className="text-sm font-semibold text-foreground">How it works</h4>
        <p className="text-xs text-muted-foreground">
          1. Share your referral link with friends.
        </p>
        <p className="text-xs text-muted-foreground">
          2. Every active friend gives you <span className="font-semibold">100 PiNode (≈ 5 PI)</span>.
        </p>
        <p className="text-xs text-muted-foreground">
          3. Tap <span className="font-semibold">Claim PiNode</span> to send rewards to your PiNode balance.
        </p>
      </Card>
    </div>
  )
}
