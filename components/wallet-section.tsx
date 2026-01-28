"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check } from "lucide-react"
import { createTransaction, getTransactions, getMinWithdraw } from "@/lib/supabase-client"
import DepositHistory from "./deposit-history"

interface WalletSectionProps {
  userId?: string
  currentUSDTBalance: number
  onBalanceUpdate: (newBalance: number) => void
  onBalanceRefresh?: () => void
  onNavigateToDeposit?: () => void
}

export default function WalletSection({ userId = "user-1", currentUSDTBalance, onBalanceUpdate, onBalanceRefresh, onNavigateToDeposit }: WalletSectionProps) {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [withdrawalAddress, setWithdrawalAddress] = useState("")
  const [transactions, setTransactions] = useState<any[]>([])
  const [minWithdraw, setMinWithdraw] = useState(5) // Default minimum PI Network withdrawal

  // Load minimum withdraw setting and transactions
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load minimum withdraw from database
        const minWithdrawValue = await getMinWithdraw()
        setMinWithdraw(minWithdrawValue)
        
        // Load transactions
        const txs = await getTransactions(userId, 10)
        setTransactions(txs)
      } catch (error) {
        console.error("Failed to load data:", error)
      }
    }
    loadData()
  }, [userId])

  const handleWithdrawSubmit = async () => {
    setError("")
    setSuccess("")

    const amount = Number.parseFloat(withdrawalAmount)
    
    // Validation
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }
    try {
      // Refresh balance first to get latest state
      if (onBalanceRefresh) {
        await onBalanceRefresh()
      }
      
      // Fetch fresh balance from database
      const { getUserById } = await import("@/lib/supabase-client")
      const userData = await getUserById(userId)
      const freshBalance = Number(userData.usdt_balance || 0)
      
      if (amount > freshBalance) {
        setError("Insufficient balance. Please refresh and try again.")
        return
      }

      if (amount < minWithdraw) {
        setError(`Minimum withdrawal is ${minWithdraw} PI`)
        return
      }

      if (!withdrawalAddress || withdrawalAddress.trim().length < 10) {
        setError("Please enter a valid PI Network address.")
        return
      }
      
      // Check for existing pending withdrawal transactions to prevent duplicates
      const existingTransactions = await getTransactions(userId, 50)
      const hasPendingWithdraw = existingTransactions.some(
        (tx: any) => 
          tx.type === 'withdraw' && 
          tx.status === 'pending' &&
          tx.amount === amount &&
          new Date(tx.created_at).getTime() > Date.now() - 60000 // Within last minute
      )
      
      if (hasPendingWithdraw) {
        setError("A similar withdrawal request is already pending. Please wait for approval.")
        return
      }
      
      // Create withdrawal transaction with pending status (PI Network only)
      const transaction = await createTransaction({
        user_id: userId,
        type: 'withdraw',
        amount,
        amount_received: amount,
        currency: 'USDT',
        status: 'pending',
        description: `Withdraw ${amount} PI to ${withdrawalAddress} (PI Network)`,
        network: null,
      })
      
      setSuccess(
        `Withdrawal request submitted. Please wait for admin approval. Amount: ${amount.toFixed(
          2,
        )} PI to ${withdrawalAddress.substring(0, 6)}... Transaction ID: ${transaction.id.substring(
          0,
          8,
        )}...`,
      )
      
      // Refresh balance after transaction creation
      if (onBalanceRefresh) {
        setTimeout(() => onBalanceRefresh(), 1000)
      }
      
      // Reset form
      setTimeout(() => {
        setSuccess("")
        setWithdrawalAmount("")
        setWithdrawalAddress("")
      }, 5000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to process withdrawal")
    }
  }

  return (
    <div className="space-y-4">
      {/* Alerts - Enhanced */}
      {error && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-destructive/10 to-destructive/5 border-2 border-destructive/30 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="w-20 h-20 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-primary/50 to-primary/30 rounded-full p-3 shadow-lg">
                <Check className="w-8 h-8 text-primary" strokeWidth={3} />
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-primary">{success}</p>
        </div>
      )}

      {/* Simple Withdraw PI Network card (Friends-style, no gradients or chain selector) */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <img
              src="/pi/pinetwork.png"
              alt="PI Network"
              className="w-6 h-6 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Withdraw PI Network</p>
            <p className="text-[11px] text-muted-foreground">
              Enter the PI amount and your PI Network address to request a withdrawal.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Amount (PI)
            </label>
            <input
              type="number"
              min={0}
              placeholder={`Minimum ${minWithdraw} PI`}
              value={withdrawalAmount}
              onChange={(e) => {
                setWithdrawalAmount(e.target.value)
                setError("")
              }}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground">
                Min: {minWithdraw} PI
              </span>
              <span className="text-[11px] text-muted-foreground">
                Balance: {currentUSDTBalance.toFixed(4)} PI
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              PI Network address
            </label>
            <input
              type="text"
              placeholder="Enter your PI Network mainnet address"
              value={withdrawalAddress}
              onChange={(e) => {
                setWithdrawalAddress(e.target.value)
                setError("")
              }}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-[11px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Make sure this address belongs to your official PI Network wallet. Withdrawals
              cannot be reversed.
            </p>
          </div>
        </div>

        <Button
          onClick={handleWithdrawSubmit}
          disabled={
            !withdrawalAmount ||
            !withdrawalAddress ||
            Number.parseFloat(withdrawalAmount || "0") < minWithdraw ||
            Number.parseFloat(withdrawalAmount || "0") > currentUSDTBalance
          }
          className="w-full text-xs font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Request withdrawal
        </Button>
      </Card>

      {/* Withdraw-only Transaction History (simple) */}
      <DepositHistory userId={userId} mode="withdraw" />
    </div>
  )
}
