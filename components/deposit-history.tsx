"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { CheckCircle, Clock, XCircle, ArrowUpRight } from "lucide-react"
import { getTransactions } from "@/lib/supabase-client"

interface DepositHistoryProps {
  userId: string
  /**
   * mode menentukan jenis riwayat yang ditampilkan:
   * - "boost": hanya transaksi deposit (Boost)
   * - "withdraw": hanya transaksi withdraw
   * - "swap": hanya transaksi exchange (Swap)
   * - "all" / undefined: semua jenis terkait PI (deposit, withdraw, exchange)
   */
  mode?: "boost" | "withdraw" | "swap" | "all"
}

interface Transaction {
  id: string
  type: "deposit" | "withdraw" | "exchange" | "claim" | "referral"
  amount: number
  amount_received: number | null
  currency: "GOLD" | "USDT" | "BXT"
  status: "pending" | "completed" | "failed"
  description: string
  network: "TRC20" | "BEP20" | null
  created_at: string
}

export default function DepositHistory({ userId, mode = "all" }: DepositHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [userId])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await getTransactions(userId, 50)
      // Simpan transaksi yang relevan untuk PI: deposit, withdraw, exchange
      const filtered = data.filter(
        (tx) => tx.type === "deposit" || tx.type === "withdraw" || tx.type === "exchange",
      )
      setTransactions(filtered as Transaction[])
    } catch (error) {
      console.error("Failed to load transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-500',
          iconColor: 'text-green-500',
          label: 'Completed',
          glow: 'shadow-green-500/20'
        }
      case "pending":
        return {
          icon: Clock,
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-500',
          iconColor: 'text-yellow-500',
          label: 'Pending',
          glow: 'shadow-yellow-500/20'
        }
      case "failed":
        return {
          icon: XCircle,
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-500',
          iconColor: 'text-red-500',
          label: 'Failed',
          glow: 'shadow-red-500/20'
        }
      default:
        return {
          icon: Clock,
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          textColor: 'text-gray-500',
          iconColor: 'text-gray-500',
          label: 'Unknown',
          glow: ''
        }
    }
  }

  // Terapkan mode tampilan sederhana sesuai konteks (boost / withdraw / all)
  const filteredTransactions = (() => {
    const base = transactions
    if (mode === "boost") {
      return base.filter((tx) => tx.type === "deposit")
    }
    if (mode === "withdraw") {
      return base.filter((tx) => tx.type === "withdraw")
    }
    if (mode === "swap") {
      return base.filter((tx) => tx.type === "exchange")
    }
    // "all" (default): tampilkan semua deposit, withdraw, dan swap
    return base
  })()

  const formatTimeAgo = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  const hasTransactions = filteredTransactions.length > 0

  return (
    <div className="space-y-2">
      {/* Header tanpa tombol refresh & tanpa background card */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {mode === "boost"
              ? "Boost History"
              : mode === "withdraw"
              ? "Withdraw History"
              : mode === "swap"
              ? "Swap History"
              : "Transaction History"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {mode === "boost"
              ? "Your PI Network Boost deposit requests"
              : mode === "withdraw"
              ? "Your PI Network withdrawal requests"
              : mode === "swap"
              ? "Your PiNode → PI swap history"
              : "PI Network boosts, withdrawals & swaps"}
          </p>
        </div>
      </div>

      {/* State loading / kosong yang simple, tanpa card/background besar */}
      {loading && (
        <p className="text-xs text-muted-foreground">Loading history...</p>
      )}

      {!loading && !hasTransactions && (
        <p className="text-xs text-muted-foreground">
          {mode === "boost"
            ? "No boost history yet."
            : mode === "withdraw"
            ? "No withdrawals yet."
            : mode === "swap"
            ? "No swaps yet."
            : "No transactions yet."}
        </p>
      )}

      {/* Simple vertical list – card style mengikuti contoh (title, status pill, amount, time ago) */}
      {!loading && hasTransactions && (
      <div className="mt-1 space-y-2 overflow-y-auto pr-0.5 sm:pr-1">
        {filteredTransactions.map((tx) => {
          const statusConfig = getStatusConfig(tx.status)
          const StatusIcon = statusConfig.icon

          const isBoost = tx.type === "deposit"
          const isWithdraw = tx.type === "withdraw"
          const isSwap = tx.type === "exchange"

          const title = isBoost ? "Boost" : isWithdraw ? "Withdraw" : isSwap ? "Swap" : "Transaction"

          // Amount logic: untuk swap, tampilkan PI yang diterima; lainnya pakai amount
          const mainAmountValue =
            isSwap && tx.amount_received != null ? tx.amount_received : tx.amount
          const mainAmountSign = isWithdraw ? "-" : "+"
          const mainAmountText = `${mainAmountSign}${mainAmountValue.toFixed(7)}`

          // Sub amount khusus swap: PiNode yang berkurang
          const subAmountText =
            isSwap && tx.amount
              ? `-${tx.amount.toLocaleString()} PiNode`
              : undefined

          return (
            <div
              key={tx.id}
              className="rounded-xl border border-border px-3 py-2.5 flex items-center justify-between gap-3"
            >
              {/* Left: icon + title + time */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary/70 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{title}</span>
                    <div
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${statusConfig.borderColor} ${statusConfig.bgColor}`}
                    >
                      <StatusIcon className={`w-3 h-3 ${statusConfig.iconColor}`} />
                      <span className={`text-[9px] font-medium ${statusConfig.textColor}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {formatTimeAgo(tx.created_at)}
                  </span>
                </div>
              </div>

              {/* Right: main amount & optional sub text */}
              <div className="text-right">
                <div className="text-xs font-semibold text-purple-400">
                  {mainAmountText}{" "}
                  <span className="text-[10px] text-purple-300">PI</span>
                </div>
                {subAmountText && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {subAmountText}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

