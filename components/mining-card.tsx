"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMiningSession } from "@/hooks/use-mining-session"
import { miningCalculator } from "@/lib/mining-system"
import { updateMiningSession, createTransaction } from "@/lib/supabase-client"
import { supabase } from "@/lib/supabase"
import NodeNetworkBackground from "@/components/node-network-background"
 

interface MiningCardProps {
  userId?: string
  onClaimSuccess?: (amount: number) => void
  onPiBalanceChange?: (piBalance: number) => void
  bxtBalance?: number
  usdtBalance?: number
  onExchange?: (bxtAmount: number, usdtReceived: number) => void | Promise<void>
}

export default function MiningCard({ 
  userId = "user-1", 
  onClaimSuccess, 
  onPiBalanceChange,
  bxtBalance = 0,
  usdtBalance = 0,
  onExchange
}: MiningCardProps) {
  const mining = useMiningSession({ userId, initialApyTierId: 0 })
  const [miningBalance, setMiningBalance] = useState(0)
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [boostAmount, setBoostAmount] = useState<string>("100")
  const [uid, setUid] = useState("")
  const [txId, setTxId] = useState("")
  const [isSubmittingBoost, setIsSubmittingBoost] = useState(false)
  const [boostStep, setBoostStep] = useState<1 | 2 | 3>(1)
  const [boostError, setBoostError] = useState<string>("")
  const [boostSuccess, setBoostSuccess] = useState<string>("")
  const [boostProofFile, setBoostProofFile] = useState<File | null>(null)
  const minBoostAmount = 100
  
  // Swap modal state
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [swapAmount, setSwapAmount] = useState<string>("")
  const [swapError, setSwapError] = useState<string>("")
  const [swapSuccess, setSwapSuccess] = useState<string>("")
  const [isSwapping, setIsSwapping] = useState(false)
  const CONVERSION_RATE = 20 // 20 PiNode ≈ 1 PI Network
  // contract/tier system intentionally not shown in UI per request

  // Initialize and update mining balance from hook (which already includes offline mining)
  useEffect(() => {
    if (mining.pending !== undefined) {
      setMiningBalance(mining.pending)
    }
  }, [mining.pending])

  // Note: we keep mining session logic but hide tiers/miner levels in UI.

  // Update mining balance display in real-time using pending from hook
  useEffect(() => {
    if (mining.apyTierId === undefined && mining.apyTierId !== 0) return

    const tierId = mining.apyTierId
    // Update display every second using pending from hook
    const interval = setInterval(() => {
      if (mining.pending !== undefined) {
        setMiningBalance(mining.pending)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [mining.apyTierId, mining.pending])

  // Keep external Pi balance (header card) in sync with total mined
  useEffect(() => {
    if (typeof mining.totalMined === "number") {
      onPiBalanceChange?.(mining.totalMined)
    }
  }, [mining.totalMined, onPiBalanceChange])

  // Sync mining balance when page becomes hidden (user leaves/closes browser)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Save current balance when user leaves
        // The hook already syncs every 30 seconds, but save on visibility change too
        try {
          const currentBalance = mining.pending || 0
          await updateMiningSession(userId, {
            mining_balance: currentBalance,
          })
        } catch (error) {
          console.error("Failed to save mining balance on visibility change:", error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also save when page is about to unload
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliable save on page unload
      const currentBalance = mining.pending || 0
      const data = JSON.stringify({
        userId,
        mining_balance: currentBalance,
      })
      
      // Note: sendBeacon has limitations, so we'll rely on periodic sync
      // The hook already syncs every 30 seconds which should be sufficient
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [mining.pending, mining.apyTierId, userId])

  const handleClaim = async () => {
    // Use pending balance from hook (already calculated accurately)
    const exactBalance = mining.pending || 0
    
    if (exactBalance <= 0) return

    // Claim the full precise balance (including fractions)
    const claimedAmount = exactBalance

    setMiningBalance(0)

    try {
      await mining.processClaim(claimedAmount)
      onClaimSuccess?.(claimedAmount)
    } catch (error) {
      console.error("Failed to claim:", error)
      // Restore balance on error
      setMiningBalance(exactBalance)
    }
  }

  // --- Swap logic ---
  const handleSwap = async () => {
    setSwapError("")
    setSwapSuccess("")

    const amount = Number.parseFloat(swapAmount || "0")

    if (!amount || amount <= 0) {
      setSwapError("Please enter a valid PiNode amount.")
      return
    }

    if (!Number.isInteger(amount)) {
      setSwapError("PiNode amount must be a whole number.")
      return
    }

    // Minimum 20 PiNode (≈ 1 PI Network)
    if (amount < 20) {
      setSwapError("Minimum exchange is 20 PiNode (≈ 1 PI Network).")
      return
    }

    if (amount > bxtBalance) {
      setSwapError("Insufficient PiNode balance.")
      return
    }

    setIsSwapping(true)

    try {
      const piReceived = amount / CONVERSION_RATE

      await createTransaction({
        user_id: userId,
        type: "exchange",
        amount: amount,
        amount_received: piReceived,
        currency: "GOLD",
        status: "completed",
        description: `Exchanged ${amount} PiNode for ${piReceived.toFixed(4)} PI Network`,
        network: null,
      })

      // Notify parent to update balances
      if (onExchange) {
        await onExchange(amount, piReceived)
      }

      setSwapSuccess(
        `Successfully exchanged ${Math.floor(amount).toLocaleString()} PiNode into ${piReceived.toFixed(4)} PI Network.`
      )
      setSwapAmount("")
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowSwapModal(false)
        setSwapSuccess("")
      }, 2000)
    } catch (error) {
      console.error("Swap error:", error)
      setSwapError("Failed to process exchange. Please try again shortly.")
    } finally {
      setIsSwapping(false)
    }
  }

  // --- Boost logic ---
  const parsedBoostAmount = Number.parseFloat(boostAmount) || 0
  // Sesuai desain: daily profit = 5.04% dari investasi, durasi 30 hari
  const DAILY_PROFIT_RATE = 0.0504
  const BOOST_DURATION_DAYS = 30
  const dailyBoostProfit = parsedBoostAmount * DAILY_PROFIT_RATE
  const totalBoostProfit = dailyBoostProfit * BOOST_DURATION_DAYS
  // Di UI referensi, "Total Receive" = total profit (tanpa menambah kembali modal awal)
  const totalReceive = totalBoostProfit

  const handleSubmitBoost = async () => {
    if (parsedBoostAmount < minBoostAmount || isSubmittingBoost) return

    setBoostError("")
    setBoostSuccess("")
    setIsSubmittingBoost(true)

    try {
      // Optional: upload payment proof to Supabase Storage (for admin review)
      let proofUrl: string | undefined
      if (boostProofFile) {
        const path = `boost-proofs/${userId}/${Date.now()}-${boostProofFile.name}`
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(path, boostProofFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          console.error("Failed to upload boost proof:", uploadError)
        } else {
          const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path)
          proofUrl = data.publicUrl
        }
      }

      // Create pending transaction for admin approval
      await createTransaction({
        user_id: userId,
        type: "deposit",
        amount: parsedBoostAmount,
        amount_received: parsedBoostAmount,
        currency: "USDT", // schema limitation, described as PI boost in description
        status: "pending",
        description: `PI BOOST ${parsedBoostAmount} PI | UID: ${uid || "-"} | TX: ${txId || "-"}${proofUrl ? ` | PROOF: ${proofUrl}` : ""}`,
        network: null,
      } as any)

      setBoostSuccess("Boost request submitted and waiting for admin approval.")
      setBoostStep(1)
      setBoostProofFile(null)
      setUid("")
      setTxId("")
      // Keep modal open so user can see success, or close it if preferred:
      // setShowBoostModal(false)
    } catch (error) {
      console.error("Failed to submit boost verification:", error)
      setBoostError("Failed to submit boost verification. Please try again.")
    } finally {
      setIsSubmittingBoost(false)
    }
  }

  const dailyRate = miningCalculator.calculateMiningSpeed(mining.apyTierId)

  const formatPiAmount = (value: number | undefined | null) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "0"
    // Sama seperti kartu balance: hingga 11 desimal tanpa padding nol di belakang
    return value.toFixed(11).replace(/\.?0+$/, "")
  }

  return (
  <div className="space-y-2">
      {/* Main Mining Display - PiNode style */}
      <Card className="relative overflow-hidden border border-[#3b2a64] bg-gradient-to-b from-[#1e1638] via-[#130d26] to-[#070514] px-0 pt-4 pb-3 flex flex-col items-center gap-2.5">
        {/* Node Network Background */}
        <div className="relative mb-3 flex items-center justify-center">
          <NodeNetworkBackground
            size={260}
            showCenterLogo={true}
            centerLogoUrl="/pi/pinetwork.png"
            className="node-network-mining"
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 border border-[#fbbf24]/40 text-[10px] font-medium text-[#fde68a] backdrop-blur-md flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
            Mining...
          </div>
        </div>

        {/* Balance text */}
        <div className="mt-1 text-center">
          <div className="text-[11px] text-[#a5b4fc] mb-1">Balance</div>
          <div className="text-2xl font-semibold text-[var(--chart-5)] tracking-tight">
            {miningBalance.toFixed(7)} <span className="text-sm text-[#a5b4fc]">PI</span>
          </div>
        </div>

        {/* Mining power */}
        <div className="mt-1 mb-2">
          <div className="flex items-center justify-center gap-2 rounded-full bg-[#140f25] px-4 py-1.5 border border-[#4338ca]/60">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#4f46e5] text-[11px] text-white shadow-[0_0_12px_rgba(79,70,229,0.9)]">
              ⚡
            </span>
            <span className="text-[11px] text-[#c7d2fe] font-medium">
              Mining Power
            </span>
            <span className="text-[11px] text-white font-semibold">
              {dailyRate.toFixed(4)} PI/day
            </span>
          </div>
        </div>

        {/* Total mined summary */}
        <div className="mt-1 mb-2 text-center">
          <span className="text-[11px] text-[#9ca3af]">
            Total mined:{" "}
            <span className="font-semibold text-[#e5e7eb]">
              {formatPiAmount(mining.totalMined ?? 0)} PI
            </span>
          </span>
        </div>

        {/* Boost / Swap buttons */}
        <div className="flex w-full px-4 gap-2 mb-1.5">
          <button
            type="button"
            onClick={() => setShowBoostModal(true)}
            className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#facc15] via-[#f97316] to-[#fb923c] text-[13px] font-semibold text-[#1e1308] shadow-[0_0_25px_rgba(250,204,21,0.45)] hover:shadow-[0_0_35px_rgba(250,204,21,0.75)] hover:brightness-110 hover:-translate-y-0.5 transition-transform transition-shadow duration-200 relative overflow-hidden"
          >
            <span className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.8),transparent_55%)] animate-pulse" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {/* Custom Boost icon (no external image) */}
              <span className="inline-flex items-center justify-center rounded-full bg-[#1e1308]/20 p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-[#1e1308]"
                  fill="currentColor"
                >
                  <path d="M13 2a1 1 0 0 1 .92.61l3 7A1 1 0 0 1 16 11h-3.38l1.7 6.79a1 1 0 0 1-1.77.84l-6-9A1 1 0 0 1 7 8h3.73L11.2 2.6A1 1 0 0 1 12 2z" />
                </svg>
              </span>
              <span className="tracking-wide">BOOST</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowSwapModal(true)}
            className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-[13px] font-semibold text-white shadow-[0_0_25px_rgba(34,197,94,0.45)] hover:shadow-[0_0_35px_rgba(34,197,94,0.8)] hover:brightness-110 hover:-translate-y-0.5 transition-transform transition-shadow duration-200 relative overflow-hidden"
          >
            <span className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.9),transparent_55%)]" />
            <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide">
              {/* Custom Swap PiNode icon */}
              <span className="inline-flex items-center justify-center rounded-full bg-white/10 p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 7h10l-3-3" />
                  <path d="M17 17H7l3 3" />
                  <circle cx="6" cy="12" r="1.2" />
                  <circle cx="18" cy="12" r="1.2" />
                </svg>
              </span>
              <span>Swap PiNode</span>
            </span>
          </button>
        </div>

        {/* Claim bar */}
        <div className="mt-0.5 w-full px-4">
          <Button
            onClick={handleClaim}
            disabled={miningBalance <= 0}
            className="w-full h-11 rounded-full bg-[#5b21ff] text-[13px] font-semibold text-white border border-[#a855f7]/60 shadow-[0_12px_30px_rgga(88,28,135,0.7)] disabled:bg-[#25124a] disabled:border-[#4b3f80] disabled:text-[#9ca3af]"
          >
            Claim PI ({miningBalance.toFixed(7)} PI)
          </Button>
        </div>
      </Card>

      {/* Boost Modal */}
      <Dialog
        open={showBoostModal}
        onOpenChange={(open) => {
          setShowBoostModal(open)
          if (!open) {
            // Reset wizard when closing
            setBoostStep(1)
            setBoostError("")
            setBoostSuccess("")
            setBoostProofFile(null)
          }
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-md bg-[#090314] border border-purple-700/40 text-white">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-bold text-center">
              Mining Power Boost
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-center text-purple-100/80">
              Rent extra mining power for 30 days. The more you invest, the more PI you can mine.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="mt-2 mb-2 flex items-center justify-center gap-2 text-[10px]">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  boostStep === step ? "bg-purple-600/60 text-white" : "bg-purple-900/40 text-purple-200/80"
                }`}
              >
                <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">
                  {step}
                </span>
                <span>
                  {step === 1 && "Amount"}
                  {step === 2 && "Payment"}
                  {step === 3 && "Verify"}
                </span>
              </div>
            ))}
          </div>

          {/* Error / success messages */}
          {boostError && (
            <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-md px-3 py-2">
              {boostError}
            </p>
          )}
          {boostSuccess && (
            <p className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-md px-3 py-2">
              {boostSuccess}
            </p>
          )}

          {/* STEP 1: Amount & profit breakdown */}
          {boostStep === 1 && (
            <>
              {/* Profit breakdown card */}
              <div className="mt-3 rounded-2xl bg-gradient-to-b from-[#2c1745] to-[#140720] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-100/90">
              <div>
                <div className="opacity-70">Investment</div>
                <div className="mt-0.5 text-base font-semibold flex items-center gap-1">
                  {parsedBoostAmount.toFixed(2)}
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <img
                      src="/pi/pinetwork.png"
                      alt="Pi"
                      className="w-6 h-6 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="opacity-70">Duration</div>
                <div className="mt-0.5 text-base font-semibold">30 days</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-black/20 p-3 border border-white/5">
                <div className="opacity-70 mb-1">Daily profit</div>
                <div className="text-sm font-semibold flex items-center gap-1">
                  +{dailyBoostProfit.toFixed(2)}
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <img
                      src="/pi/pinetwork.png"
                      alt="Pi"
                      className="w-6 h-6 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">
                  {(DAILY_PROFIT_RATE * 100).toFixed(2)}%
                </div>
              </div>
              <div className="rounded-xl bg-black/20 p-3 border border-white/5">
                <div className="opacity-70 mb-1">Total profit</div>
                <div className="text-sm font-semibold flex items-center gap-1">
                  +{totalBoostProfit.toFixed(2)}
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <img
                      src="/pi/pinetwork.png"
                      alt="Pi"
                      className="w-6 h-6 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">
                  ({(totalBoostProfit / Math.max(parsedBoostAmount || 1, 1) * 100).toFixed(2)}%)
                </div>
              </div>
            </div>

            <div className="mt-1 rounded-xl bg-black/40 p-3 flex items-center justify-between">
              <div className="text-xs text-purple-100/80">
                <div className="opacity-70 mb-0.5">Total Receive</div>
                <div className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                  {totalReceive.toFixed(2)}
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <img
                      src="/pi/pinetwork.png"
                      alt="Pi"
                      className="w-6 h-6 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-purple-100/70 text-right">
                {dailyBoostProfit.toFixed(2)} × {BOOST_DURATION_DAYS} ={" "}
                {totalBoostProfit.toFixed(2)} (
                {(totalBoostProfit / Math.max(parsedBoostAmount || 1, 1) * 100).toFixed(2)}
                %)
              </div>
            </div>
              </div>

              {/* Amount input */}
              <div className="mt-4 space-y-2">
                <Label className="text-xs text-purple-100/80">Amount to Boost</Label>
                <Input
                  type="number"
                  min={minBoostAmount}
                  value={boostAmount}
                  onChange={(e) => setBoostAmount(e.target.value)}
                  className="bg-[#0b051a] border-purple-700/40 text-sm"
                />
                <p className="text-[11px] text-purple-200/70">
                  Minimum amount: {minBoostAmount} PI
                </p>
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-purple-700/40 bg-transparent text-xs"
                  onClick={() => setShowBoostModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-xs font-semibold"
                  disabled={parsedBoostAmount < minBoostAmount}
                  onClick={() => setBoostStep(2)}
                >
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {/* STEP 2: Payment with QR & PI address */}
          {boostStep === 2 && (
            <>
              <div className="mt-4 rounded-2xl bg-gradient-to-b from-[#2c1745] to-[#140720] p-4 space-y-4">
                <div className="text-center text-xs text-purple-100/80">
                  Send{" "}
                  <span className="font-semibold text-white">
                    {parsedBoostAmount.toFixed(2)} PI
                  </span>{" "}
                  to this Pi Network address to start your boost.
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="w-40 h-40 rounded-2xl bg-black/40 border border-purple-500/40 flex items-center justify-center">
                    <img
                      src="/gamety dashboard/scan.png"
                      alt="Scan to pay"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <div className="w-full text-xs text-center break-all bg-black/40 border border-purple-500/40 rounded-xl px-3 py-2">
                    <div className="text-purple-100/70 mb-1">Pi Network address</div>
                    <div className="font-mono text-[11px] text-white">
                      GBYILVATU5J4AQDJ6ISYZRTOHSTQQIAQ47XHG3GIJA7ZBHTTBVOLH42G
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-yellow-200/80 text-center">
                  Only send PI to this address. Sending any other asset may result in permanent loss.
                </p>
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-purple-700/40 bg-transparent text-xs"
                  onClick={() => setBoostStep(1)}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-xs font-semibold"
                  onClick={() => setBoostStep(3)}
                >
                  I have paid
                </Button>
              </div>
            </>
          )}

          {/* STEP 3: Verify payment manually */}
          {boostStep === 3 && (
            <>
              {/* Manual verification fields */}
              <div className="mt-4 space-y-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-purple-100/80">Your UID</Label>
                  <Input
                    placeholder="Enter your UID"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    className="bg-[#0b051a] border-purple-700/40 text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-purple-100/80">TX Transaction ID</Label>
                  <Input
                    placeholder="e.g. 7a8b9c1d2e3f..."
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="bg-[#0b051a] border-purple-700/40 text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-purple-100/80">Upload payment screenshot</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="bg-[#0b051a] border-purple-700/40 text-xs cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setBoostProofFile(file)
                    }}
                  />
                  <p className="text-[10px] text-purple-200/70">
                    Screenshot will be sent to admin portal for manual review.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-purple-700/40 bg-transparent text-xs"
                  onClick={() => setBoostStep(2)}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-xs font-semibold"
                  disabled={parsedBoostAmount < minBoostAmount || isSubmittingBoost || !boostProofFile}
                  onClick={handleSubmitBoost}
                >
                  {isSubmittingBoost ? "Submitting..." : "Submit Verification"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Swap Modal */}
      <Dialog
        open={showSwapModal}
        onOpenChange={(open) => {
          setShowSwapModal(open)
          if (!open) {
            setSwapAmount("")
            setSwapError("")
            setSwapSuccess("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-[#1e1638] via-[#130d26] to-[#070514] border border-[#3b2a64] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white text-center">
              Swap PiNode to PI Network
            </DialogTitle>
            <DialogDescription className="text-xs text-[#a5b4fc] text-center">
              Convert your mined PiNode into PI Network balance in your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Balance Display */}
            <div className="rounded-xl px-4 py-3 bg-[#140f25]/60 border border-[#4338ca]/40 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#a5b4fc] mb-1">PiNode Balance</p>
                <p className="text-sm font-semibold text-white">
                  {Math.floor(bxtBalance).toLocaleString()}{" "}
                  <span className="text-[11px] text-[#a5b4fc]">PiNode</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#a5b4fc] mb-1">PI Network Wallet</p>
                <p className="text-sm font-semibold text-white">
                  {usdtBalance.toFixed(4)}{" "}
                  <span className="text-[11px] text-[#a5b4fc]">PI</span>
                </p>
              </div>
            </div>

            {/* Error/Success Messages */}
            {swapError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40">
                <p className="text-xs font-medium text-red-400">{swapError}</p>
              </div>
            )}

            {swapSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40">
                <p className="text-xs font-medium text-emerald-400">{swapSuccess}</p>
              </div>
            )}

            {/* Swap Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="swap-amount" className="text-xs font-semibold text-white mb-2 block">
                  PiNode amount to swap
                </Label>
                <Input
                  id="swap-amount"
                  type="number"
                  min={0}
                  value={swapAmount}
                  onChange={(e) => {
                    setSwapAmount(e.target.value)
                    setSwapError("")
                    setSwapSuccess("")
                  }}
                  placeholder="Minimum 20 PiNode (≈ 1 PI)"
                  className="bg-[#140f25] border-[#4338ca]/60 text-white placeholder:text-[#6b7280] focus:border-[#6366f1]"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-[#a5b4fc]">
                    Available:{" "}
                    <span className="font-semibold text-white">
                      {Math.floor(bxtBalance).toLocaleString()} PiNode
                    </span>
                  </p>
                  <p className="text-[10px] text-[#a5b4fc]">
                    Estimated:{" "}
                    <span className="font-semibold text-white">
                      {swapAmount && Number.parseFloat(swapAmount) > 0
                        ? (Number.parseFloat(swapAmount) / CONVERSION_RATE).toFixed(4)
                        : "0.0000"}{" "}
                      PI Network
                    </span>
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSwap}
                disabled={
                  isSwapping ||
                  !swapAmount ||
                  Number.parseFloat(swapAmount || "0") < 20 ||
                  Number.parseFloat(swapAmount || "0") > bxtBalance
                }
                className="w-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-white font-semibold text-xs py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSwapping ? "Processing swap..." : "Swap now"}
              </Button>
            </div>

            {/* Info Card */}
            <div className="rounded-lg bg-[#140f25]/40 border border-[#4338ca]/30 p-3 space-y-1.5">
              <h4 className="text-xs font-semibold text-white">How this swap works</h4>
              <p className="text-[10px] text-[#a5b4fc]">
                1. Enter the amount of PiNode you want to swap (minimum 20 PiNode).
              </p>
              <p className="text-[10px] text-[#a5b4fc]">
                2. 20 PiNode ≈ 1 PI Network (100 PiNode ≈ 5 PI Network).
              </p>
              <p className="text-[10px] text-[#a5b4fc]">
                3. After a successful swap, your PI Network wallet balance increases and your PiNode balance decreases.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
