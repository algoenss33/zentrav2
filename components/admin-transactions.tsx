"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowDownCircle, 
  ArrowUpCircle,
  RefreshCw,
  AlertCircle,
  Search,
  Copy,
  Filter,
  X
} from "lucide-react"
import {
  getPendingTransactions,
  approveDeposit,
  approveWithdraw,
  rejectTransaction,
  getAllTransactions
} from "@/lib/supabase-client"
import NodeNetworkBackground from "@/components/node-network-background"

interface TransactionWithUser {
  id: string
  user_id: string
  type: 'deposit' | 'withdraw' | 'exchange' | 'claim' | 'referral'
  amount: number
  amount_received: number | null
  currency: 'BXT' | 'USDT'
  status: 'pending' | 'completed' | 'failed'
  description: string
  network: 'TRC20' | 'BEP20' | null
  created_at: string
  users?: {
    id: string
    email: string
    usdt_balance: number
    bxt_balance: number
  }
  user_wallet_address?: {
    id: string
    chain_id: string
    chain_name: string
    network: string
    address: string
  }
}

export default function AdminTransactions() {
  const [pendingTransactions, setPendingTransactions] = useState<TransactionWithUser[]>([])
  const [allTransactions, setAllTransactions] = useState<TransactionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingAll, setProcessingAll] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "deposit" | "withdraw">("all")
  const [filterNetwork, setFilterNetwork] = useState<"all" | "TRC20" | "BEP20" | "ERC20" | "Polygon" | "Solana" | "TON">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "failed">("all")
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const loadPendingTransactions = async () => {
    try {
      setLoading(true)
      const data = await getPendingTransactions()
      setPendingTransactions(data as TransactionWithUser[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending transactions")
    } finally {
      setLoading(false)
    }
  }

  const loadAllTransactions = async () => {
    try {
      setLoading(true)
      const data = await getAllTransactions(100)
      setAllTransactions(data as TransactionWithUser[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingTransactions()
    } else {
      loadAllTransactions()
    }
  }, [activeTab])

  const handleApprove = async (transaction: TransactionWithUser) => {
    try {
      setProcessingId(transaction.id)
      setError("")
      setSuccess("")

      if (transaction.type === 'deposit') {
        await approveDeposit(
          transaction.id,
          transaction.user_id,
          transaction.amount,
          transaction.currency
        )
        setSuccess(`Deposit approved. User balance updated.`)
      } else if (transaction.type === 'withdraw') {
        await approveWithdraw(
          transaction.id,
          transaction.user_id,
          transaction.amount,
          transaction.currency
        )
        setSuccess(`Withdrawal approved. Balance deducted.`)
      }

      // Reload transactions
      if (activeTab === "pending") {
        await loadPendingTransactions()
      } else {
        await loadAllTransactions()
      }

      setTimeout(() => setSuccess(""), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve transaction")
      setTimeout(() => setError(""), 5000)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (transaction: TransactionWithUser) => {
    if (!confirm(`Are you sure you want to reject this ${transaction.type}?`)) {
      return
    }

    try {
      setProcessingId(transaction.id)
      setError("")
      setSuccess("")

      await rejectTransaction(transaction.id)
      setSuccess(`Transaction rejected.`)

      // Reload transactions
      if (activeTab === "pending") {
        await loadPendingTransactions()
      } else {
        await loadAllTransactions()
      }

      setTimeout(() => setSuccess(""), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject transaction")
      setTimeout(() => setError(""), 5000)
    } finally {
      setProcessingId(null)
    }
  }

  const handleApproveAll = async () => {
    const pendingOnly = transactionsToShow.filter(tx => tx.status === 'pending')
    
    if (pendingOnly.length === 0) {
      setError("No pending transactions to approve")
      setTimeout(() => setError(""), 3000)
      return
    }

    if (!confirm(`Are you sure you want to approve all ${pendingOnly.length} pending transaction(s)?`)) {
      return
    }

    try {
      setProcessingAll(true)
      setError("")
      setSuccess("")

      let approvedCount = 0
      let failedCount = 0
      const errors: string[] = []

      // Process each transaction sequentially
      for (const transaction of pendingOnly) {
        try {
          if (transaction.type === 'deposit') {
            await approveDeposit(
              transaction.id,
              transaction.user_id,
              transaction.amount,
              transaction.currency
            )
          } else if (transaction.type === 'withdraw') {
            await approveWithdraw(
              transaction.id,
              transaction.user_id,
              transaction.amount,
              transaction.currency
            )
          }
          approvedCount++
        } catch (err) {
          failedCount++
          errors.push(`${transaction.type} #${transaction.id.substring(0, 8)}: ${err instanceof Error ? err.message : 'Failed'}`)
        }
      }

      if (approvedCount > 0) {
        setSuccess(`Successfully approved ${approvedCount} transaction(s).${failedCount > 0 ? ` ${failedCount} failed.` : ''}`)
      }
      
      if (failedCount > 0) {
        setError(`Failed to approve ${failedCount} transaction(s). ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
      }

      // Reload transactions
      if (activeTab === "pending") {
        await loadPendingTransactions()
      } else {
        await loadAllTransactions()
      }

      setTimeout(() => {
        setSuccess("")
        setError("")
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve all transactions")
      setTimeout(() => setError(""), 5000)
    } finally {
      setProcessingAll(false)
    }
  }

  const handleRejectAll = async () => {
    const pendingOnly = transactionsToShow.filter(tx => tx.status === 'pending')
    
    if (pendingOnly.length === 0) {
      setError("No pending transactions to reject")
      setTimeout(() => setError(""), 3000)
      return
    }

    if (!confirm(`Are you sure you want to reject all ${pendingOnly.length} pending transaction(s)? This action cannot be undone.`)) {
      return
    }

    try {
      setProcessingAll(true)
      setError("")
      setSuccess("")

      let rejectedCount = 0
      let failedCount = 0
      const errors: string[] = []

      // Process each transaction sequentially
      for (const transaction of pendingOnly) {
        try {
          await rejectTransaction(transaction.id)
          rejectedCount++
        } catch (err) {
          failedCount++
          errors.push(`Transaction #${transaction.id.substring(0, 8)}: ${err instanceof Error ? err.message : 'Failed'}`)
        }
      }

      if (rejectedCount > 0) {
        setSuccess(`Successfully rejected ${rejectedCount} transaction(s).${failedCount > 0 ? ` ${failedCount} failed.` : ''}`)
      }
      
      if (failedCount > 0) {
        setError(`Failed to reject ${failedCount} transaction(s). ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
      }

      // Reload transactions
      if (activeTab === "pending") {
        await loadPendingTransactions()
      } else {
        await loadAllTransactions()
      }

      setTimeout(() => {
        setSuccess("")
        setError("")
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject all transactions")
      setTimeout(() => setError(""), 5000)
    } finally {
      setProcessingAll(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
      default:
        return 'bg-secondary text-muted-foreground border-border'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="w-5 h-5 text-green-500" />
      case 'withdraw':
        return <ArrowUpCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getPlatformDepositAddress = (network: string | null): string => {
    // These are the platform deposit addresses - should match chain-selector.tsx
    const addresses: Record<string, string> = {
      'TRC20': 'TEb67P3ns56KTHmoUHPcAUEu8bSQ2PXExb',
      'BEP20': '0x281f01b577214c082dacf20d07bdac00d88f1722', // Default BEP20 address
      'ERC20': '0xb982274dfb9f07892f1cf190a5d14225d5c60ce6',
      'Polygon': '0xb982274dfb9f07892f1cf190a5d14225d5c60ce6',
      'Solana': 'CNYuWXGLkwfr7KTTUG4euHD3BadW9PWKUAx8fPUVzH76',
      'TON': 'UQCwhtQG7RB-6jUciWStZcvBP-8hwxbQhmitE8fTyQgtjpgU',
    }
    return network ? addresses[network] || 'N/A' : 'N/A'
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const filterTransactions = (transactions: TransactionWithUser[]) => {
    return transactions.filter(tx => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          tx.id.toLowerCase().includes(query) ||
          tx.users?.email?.toLowerCase().includes(query) ||
          tx.user_wallet_address?.address?.toLowerCase().includes(query) ||
          tx.description?.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query)
        
        if (!matchesSearch) return false
      }

      // Type filter
      if (filterType !== "all" && tx.type !== filterType) {
        return false
      }

      // Network filter
      if (filterNetwork !== "all" && tx.network !== filterNetwork) {
        return false
      }

      // Status filter (only for all transactions tab)
      if (activeTab === "all" && filterStatus !== "all" && tx.status !== filterStatus) {
        return false
      }

      return true
    })
  }

  const transactionsToShow = filterTransactions(activeTab === "pending" ? pendingTransactions : allTransactions)

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => {
                setActiveTab("pending")
                setFilterStatus("all")
              }}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === "pending"
                  ? "bg-primary/20 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingTransactions.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === "all"
                  ? "bg-primary/20 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Transactions ({allTransactions.length})
            </button>
          </div>
          <Button
            onClick={() => activeTab === "pending" ? loadPendingTransactions() : loadAllTransactions()}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={processingAll}
          >
            <RefreshCw className={`w-4 h-4 ${processingAll ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Email, Sender Address, Amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-input/50 border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Filters:</span>
            </div>
            
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-input/50 border border-border text-xs focus:outline-none focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
            </select>

            {/* Network Filter */}
            <select
              value={filterNetwork}
              onChange={(e) => setFilterNetwork(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-input/50 border border-border text-xs focus:outline-none focus:border-primary"
            >
              <option value="all">All Networks</option>
              <option value="TRC20">TRC20</option>
              <option value="BEP20">BEP20</option>
              <option value="ERC20">ERC20</option>
              <option value="Polygon">Polygon</option>
              <option value="Solana">Solana</option>
              <option value="TON">TON</option>
            </select>

            {/* Status Filter (only for all transactions) */}
            {activeTab === "all" && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-input/50 border border-border text-xs focus:outline-none focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            )}

            {/* Clear Filters */}
            {(filterType !== "all" || filterNetwork !== "all" || filterStatus !== "all" || searchQuery) && (
              <Button
                onClick={() => {
                  setFilterType("all")
                  setFilterNetwork("all")
                  setFilterStatus("all")
                  setSearchQuery("")
                }}
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </Button>
            )}

            {/* Results Count */}
            <div className="ml-auto text-xs text-muted-foreground">
              Showing {transactionsToShow.length} of {activeTab === "pending" ? pendingTransactions.length : allTransactions.length} transactions
            </div>
          </div>
        </div>

        {/* Bulk Actions - Only show for pending transactions */}
        {activeTab === "pending" && pendingTransactions.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card/50 border border-border">
            <span className="text-sm text-muted-foreground font-medium">Bulk Actions:</span>
            <Button
              onClick={handleApproveAll}
              disabled={processingAll}
              className="bg-green-500 hover:bg-green-600 text-white gap-2"
              size="sm"
            >
              {processingAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve All ({pendingTransactions.length})
            </Button>
            <Button
              onClick={handleRejectAll}
              disabled={processingAll}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              {processingAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Reject All ({pendingTransactions.length})
            </Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm font-medium text-green-500">{success}</p>
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <NodeNetworkBackground
              size={96}
              showCenterLogo={true}
              centerLogoUrl="/pi/pinetwork.png"
              className="node-network-loading"
            />
          </div>
        </Card>
      ) : transactionsToShow.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground mb-2">No {activeTab === "pending" ? "pending" : ""} transactions</p>
          <p className="text-muted-foreground">All transactions have been processed.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactionsToShow.map((transaction) => (
            <Card key={transaction.id} className="border-2 border-border bg-card/50 backdrop-blur-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {getTypeIcon(transaction.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-foreground capitalize">
                          {transaction.type}
                        </h4>
                        <span className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                          {transaction.id.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {transaction.users?.email || transaction.user_id}
                        </p>
                        {transaction.users?.email && (
                          <button
                            onClick={() => handleCopyAddress(transaction.users!.email)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy email"
                          >
                            {copiedAddress === transaction.users!.email ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deposit Verification Section */}
                  {transaction.type === 'deposit' && (
                    <div className="mb-4 space-y-3">
                      {/* Sender Address Section */}
                      {transaction.user_wallet_address ? (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-bold text-blue-500">Sender Address (User's Wallet)</span>
                            </div>
                            <Button
                              onClick={() => handleCopyAddress(transaction.user_wallet_address!.address)}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 gap-1"
                            >
                              {copiedAddress === transaction.user_wallet_address.address ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  <span className="text-xs">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-xs">Copy</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Network:</span>
                                <span className="text-xs font-bold text-foreground bg-blue-500/20 px-2 py-1 rounded">{transaction.user_wallet_address.network}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Chain:</span>
                                <span className="text-xs font-semibold text-foreground">{transaction.user_wallet_address.chain_name}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Sender Address:</span>
                              <div className="font-mono text-xs text-foreground break-all bg-background/70 rounded px-3 py-2 border border-blue-500/30 hover:bg-background transition-colors">
                                {transaction.user_wallet_address.address}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs font-semibold text-yellow-500">No Sender Address Found</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            User has not set a sender address in Settings. Please verify the deposit manually.
                          </p>
                        </div>
                      )}

                      {/* Platform Deposit Address Section */}
                      {transaction.network && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-bold text-green-500">Platform Deposit Address</span>
                            </div>
                            <Button
                              onClick={() => handleCopyAddress(getPlatformDepositAddress(transaction.network))}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 gap-1"
                            >
                              {copiedAddress === getPlatformDepositAddress(transaction.network) ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  <span className="text-xs">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-xs">Copy</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Network:</span>
                              <span className="text-xs font-bold text-foreground bg-green-500/20 px-2 py-1 rounded">{transaction.network}</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Platform Address:</span>
                              <div className="font-mono text-xs text-foreground break-all bg-background/70 rounded px-3 py-2 border border-green-500/30 hover:bg-background transition-colors">
                                {getPlatformDepositAddress(transaction.network)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verification Instructions */}
                      <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-2">
                          ⚠️ <strong>Verification Steps:</strong>
                        </p>
                        <ol className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 ml-4 list-decimal">
                          <li>Check blockchain explorer to verify the transaction</li>
                          <li>Confirm deposit was sent FROM the sender address TO the platform address</li>
                          <li>Verify the amount matches: <strong>{transaction.amount} {transaction.currency}</strong></li>
                          <li>Only approve if all details match</li>
                        </ol>
                      </div>
                    </div>
                  )}


                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Amount</p>
                      <p className="text-lg font-bold text-foreground">
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </p>
                    </div>
                    {transaction.amount_received && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Received</p>
                        <p className="text-lg font-bold text-accent">
                          {transaction.amount_received.toLocaleString()} {transaction.currency === 'USDT' ? 'BXT' : 'USDT'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(transaction.status)}`}>
                        {transaction.status === 'pending' && <Clock className="w-3 h-3" />}
                        {transaction.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {transaction.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {transaction.status.toUpperCase()}
                      </span>
                    </div>
                    {transaction.network && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Network</p>
                        <p className="text-sm font-semibold text-foreground">{transaction.network}</p>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Description</p>
                    <p className="text-sm text-foreground">{transaction.description}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(transaction.created_at).toLocaleString()}</span>
                    {transaction.users && (
                      <>
                        <span>•</span>
                        <span>Balance: {transaction.users.usdt_balance.toFixed(2)} USDT / {transaction.users.bxt_balance.toFixed(2)} BXT</span>
                      </>
                    )}
                  </div>
                </div>

                {transaction.status === 'pending' && (
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => handleApprove(transaction)}
                      disabled={processingId === transaction.id || processingAll}
                      className="bg-green-500 hover:bg-green-600 text-white gap-2"
                      size="sm"
                    >
                      {processingId === transaction.id || processingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(transaction)}
                      disabled={processingId === transaction.id || processingAll}
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                    >
                      {processingId === transaction.id || processingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


