"use client"

import { useState, useCallback } from "react"
import type { Transaction } from "@/lib/wallet-system"
import { CONVERSION_RATE } from "@/lib/wallet-system"

interface UseWalletProps {
  userId: string
  initialBalance?: number
}

export function useWallet({ userId, initialBalance = 1000 }: UseWalletProps) {
  const [balance, setBalance] = useState(initialBalance)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(`wallet_transactions_${userId}`)
    return stored ? JSON.parse(stored) : []
  })

  const saveTransactions = useCallback(
    (newTransactions: Transaction[]) => {
      setTransactions(newTransactions)
      localStorage.setItem(`wallet_transactions_${userId}`, JSON.stringify(newTransactions))
    },
    [userId],
  )

  const deposit = useCallback(
    (amount: number) => {
      if (amount < 10 || amount <= 0) return false
      setBalance((prev) => prev + amount)
      const tx = {
        id: `tx_${Date.now()}`,
        userId,
        type: "deposit" as const,
        amount,
        currency: "GOLD" as const,
        status: "completed" as const,
        timestamp: new Date(),
        description: `Deposited ${amount} GOLD`,
      }
      saveTransactions([tx, ...transactions])
      return true
    },
    [userId, transactions, saveTransactions],
  )

  const withdraw = useCallback(
    (amountBXT: number, network: "TRC20" | "BEP20") => {
      const amountUSDT = amountBXT / CONVERSION_RATE
      if (amountUSDT < 1 || amountBXT > balance) return false

      setBalance((prev) => prev - amountBXT)
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        userId,
        type: "withdraw",
        amount: amountBXT,
        amountReceived: amountUSDT,
        currency: "GOLD",
        status: "completed",
        timestamp: new Date(),
        description: `Withdrawn ${amountUSDT.toFixed(4)} USDT via ${network}`,
        network,
      }
      saveTransactions([tx, ...transactions])
      return true
    },
    [userId, balance, transactions, saveTransactions],
  )

  const exchange = useCallback(
    (amountBXT: number) => {
      if (amountBXT < 1000 || amountBXT > balance) return false

      setBalance((prev) => prev - amountBXT)
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        userId,
        type: "exchange",
        amount: amountBXT,
        amountReceived: amountBXT / CONVERSION_RATE,
        currency: "GOLD",
        status: "completed",
        timestamp: new Date(),
        description: `Exchanged ${amountBXT} GOLD for ${(amountBXT / CONVERSION_RATE).toFixed(4)} USDT`,
      }
      saveTransactions([tx, ...transactions])
      return true
    },
    [userId, balance, transactions, saveTransactions],
  )

  const getTransactionHistory = useCallback(() => {
    return transactions.slice(0, 10)
  }, [transactions])

  return {
    balance,
    setBalance,
    transactions,
    deposit,
    withdraw,
    exchange,
    getTransactionHistory,
  }
}
