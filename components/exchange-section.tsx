"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createTransaction } from "@/lib/supabase-client"
import DepositHistory from "./deposit-history"

interface ExchangeSectionProps {
  bxtBalance: number
  usdtBalance: number
  onExchange: (bxtAmount: number, usdtReceived: number) => void | Promise<void>
  userId?: string
}

// Simple PiNode → PI Network exchange, following the clean card style from Friends / Referral section
export default function ExchangeSection({
  bxtBalance: pinodeBalance,
  usdtBalance: piNetworkWalletBalance,
  onExchange,
  userId = "user-1",
}: ExchangeSectionProps) {
  const [amountInput, setAmountInput] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isExchanging, setIsExchanging] = useState(false)

  // 20 PiNode ≈ 1 PI Network (sejalan dengan 100 PiNode ≈ 5 PI Network di Friends)
  const CONVERSION_RATE = 20

  const piAmount = useMemo(() => {
    const num = Number.parseFloat(amountInput || "0")
    if (!Number.isFinite(num) || num <= 0) return 0
    return num / CONVERSION_RATE
  }, [amountInput])

  const handleExchange = async () => {
    setError("")
    setSuccess("")

    const amount = Number.parseFloat(amountInput || "0")

    if (!amount || amount <= 0) {
      setError("Please enter a valid PiNode amount.")
      return
    }

    if (!Number.isInteger(amount)) {
      setError("PiNode amount must be a whole number.")
      return
    }

    // Minimum 20 PiNode (≈ 1 PI Network)
    if (amount < 20) {
      setError("Minimum exchange is 20 PiNode (≈ 1 PI Network).")
      return
    }

    if (amount > pinodeBalance) {
      setError("Insufficient PiNode balance.")
      return
    }

    setIsExchanging(true)

    try {
      const piReceived = piAmount

      await createTransaction({
        user_id: userId,
        type: "exchange",
        amount: amount,
        amount_received: piReceived,
        currency: "GOLD", // keep old schema, only UI/logic uses PiNode / PI wording
        status: "completed",
        description: `Exchanged ${amount} PiNode for ${piReceived.toFixed(4)} PI Network`,
        network: null,
      })

      // Notify parent so MiningDashboard can update balances consistently
      await onExchange(amount, piReceived)

      setSuccess(
        `Successfully exchanged ${Math.floor(amount).toLocaleString()} PiNode into ${piReceived.toFixed(
          4,
        )} PI Network.`,
      )
      setAmountInput("")
    } catch (error) {
      console.error("Exchange error:", error)
      setError("Failed to process exchange. Please try again shortly.")
    } finally {
      setIsExchanging(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Compact balance card (no heavy decoration/icons) */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">PiNode balance</p>
            <p className="text-sm font-semibold text-foreground">
              {Math.floor(pinodeBalance).toLocaleString()}{" "}
              <span className="text-[11px] text-muted-foreground">PiNode</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">PI Network wallet</p>
            <p className="text-sm font-semibold text-foreground">
              {piNetworkWalletBalance.toFixed(4)}{" "}
              <span className="text-[11px] text-muted-foreground">PI</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Simple alerts */}
      {error && (
        <Card className="border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-xs font-medium text-destructive">{error}</p>
        </Card>
      )}

      {success && (
        <Card className="border border-emerald-400/40 bg-emerald-400/10 p-3">
          <p className="text-xs font-medium text-emerald-400">{success}</p>
        </Card>
      )}

      {/* Main swap form (simple Friends-like style) */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Swap PiNode to PI Network
          </p>
          <p className="text-[11px] text-muted-foreground">
            Convert your mined PiNode into PI Network balance in your wallet.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-foreground mb-1">
            PiNode amount to swap
          </label>
          <input
            type="number"
            min={0}
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value)
              setError("")
              setSuccess("")
            }}
            placeholder="Minimum 20 PiNode (≈ 1 PI)"
            className="w-full px-3 py-2 rounded-lg bg-input border border-border text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Available:{" "}
              <span className="font-semibold">
                {Math.floor(pinodeBalance).toLocaleString()} PiNode
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Estimated:{" "}
              <span className="font-semibold">
                {piAmount > 0 ? piAmount.toFixed(4) : "0.0000"} PI Network
              </span>
            </p>
          </div>
        </div>

        <Button
          onClick={handleExchange}
          disabled={
            isExchanging ||
            !amountInput ||
            Number.parseFloat(amountInput || "0") < 20 ||
            Number.parseFloat(amountInput || "0") > pinodeBalance
          }
          className="w-full text-xs font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isExchanging ? "Processing exchange..." : "Swap now"}
        </Button>
      </Card>

      {/* Short explanation card */}
      <Card className="border-border bg-card/50 backdrop-blur-sm p-4 space-y-1.5">
        <h4 className="text-sm font-semibold text-foreground">How this swap works</h4>
        <p className="text-xs text-muted-foreground">
          1. Enter the amount of PiNode you want to swap (minimum 20 PiNode).
        </p>
        <p className="text-xs text-muted-foreground">
          2. 20 PiNode ≈ 1 PI Network (100 PiNode ≈ 5 PI Network).
        </p>
        <p className="text-xs text-muted-foreground">
          3. After a successful swap, your PI Network wallet balance increases and your PiNode balance decreases.
        </p>
      </Card>

      {/* Swap history – simple list following same card style */}
      <DepositHistory userId={userId} mode="swap" />
    </div>
  )
}
