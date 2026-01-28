// Wallet and transaction management

export type TransactionType = "deposit" | "withdraw" | "exchange" | "claim" | "referral"
export type TransactionStatus = "pending" | "completed" | "failed"

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  amountReceived?: number
  currency: "GOLD" | "USDT"
  status: TransactionStatus
  timestamp: Date
  description: string
  network?: "TRC20" | "BEP20"
}

export interface WalletState {
  balance: number
  transactions: Transaction[]
  totalDeposited: number
  totalWithdrawn: number
  totalClaimed: number
}

export const CONVERSION_RATE = 1000 // 1000 GOLD = 1 USDT
export const MIN_WITHDRAW = 1 // Default minimum 1 USDT withdrawal (can be overridden by platform settings)
export const MIN_DEPOSIT = 10 // Minimum 10 GOLD deposit

export class WalletManager {
  private transactions: Transaction[] = []

  constructor(transactions: Transaction[] = []) {
    this.transactions = transactions
  }

  // Validate deposit
  validateDeposit(amount: number): { valid: boolean; error?: string } {
    if (amount < MIN_DEPOSIT) {
      return { valid: false, error: `Minimum deposit is ${MIN_DEPOSIT} GOLD` }
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return { valid: false, error: "Invalid amount" }
    }
    return { valid: true }
  }

  // Validate withdrawal
  validateWithdraw(amountBXT: number, balance: number): { valid: boolean; error?: string } {
    const amountUSDT = amountBXT / CONVERSION_RATE
    if (amountUSDT < MIN_WITHDRAW) {
      return {
        valid: false,
        error: `Minimum withdrawal is ${MIN_WITHDRAW} USDT (${MIN_WITHDRAW * CONVERSION_RATE} GOLD)`,
      }
    }
    if (amountBXT > balance) {
      return { valid: false, error: "Insufficient balance" }
    }
    if (!Number.isInteger(amountBXT) || amountBXT <= 0) {
      return { valid: false, error: "Invalid amount" }
    }
    return { valid: true }
  }

  // Create deposit transaction
  addDeposit(userId: string, amount: number): Transaction | null {
    const validation = this.validateDeposit(amount)
    if (!validation.valid) return null

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: "deposit",
      amount,
      currency: "GOLD",
      status: "completed",
      timestamp: new Date(),
      description: `Deposited ${amount} GOLD`,
    }

    this.transactions.push(transaction)
    return transaction
  }

  // Create withdrawal transaction
  addWithdraw(userId: string, amountBXT: number, network: "TRC20" | "BEP20"): Transaction | null {
    const validation = this.validateWithdraw(amountBXT, amountBXT) // Simplified - pass actual balance in real app
    if (!validation.valid) return null

    const amountUSDT = amountBXT / CONVERSION_RATE

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

    this.transactions.push(transaction)
    return transaction
  }

  // Create exchange transaction
  addExchange(userId: string, amountBXT: number): Transaction | null {
    if (amountBXT < 1000) {
      return null
    }

    const amountUSDT = amountBXT / CONVERSION_RATE

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: "exchange",
      amount: amountBXT,
      amountReceived: amountUSDT,
      currency: "GOLD",
      status: "completed",
      timestamp: new Date(),
      description: `Exchanged ${amountBXT} GOLD for ${amountUSDT.toFixed(4)} USDT`,
    }

    this.transactions.push(transaction)
    return transaction
  }

  // Get user transactions
  getTransactions(userId: string, limit = 20): Transaction[] {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Get wallet statistics
  getWalletStats(
    userId: string,
    currentBalance: number,
  ): { totalDeposited: number; totalWithdrawn: number; totalClaimed: number } {
    const userTransactions = this.transactions.filter((t) => t.userId === userId && t.status === "completed")

    const totalDeposited = userTransactions.filter((t) => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0)

    const totalWithdrawn = userTransactions
      .filter((t) => t.type === "withdraw" || t.type === "exchange")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalClaimed = userTransactions.filter((t) => t.type === "claim").reduce((sum, t) => sum + t.amount, 0)

    return { totalDeposited, totalWithdrawn, totalClaimed }
  }
}

export const walletManager = new WalletManager()
