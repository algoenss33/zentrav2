"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import MiningCard from "@/components/mining-card"
import WalletSection from "@/components/wallet-section"
import DepositSection from "@/components/deposit-section"
import ReferralSection from "@/components/referral-section"
import ExchangeSection from "@/components/exchange-section"
import WalletAddressesSection from "@/components/wallet-addresses-section"
import { getUserById, updateUserBalance } from "@/lib/supabase-client"
import { getMiningSession } from "@/lib/supabase-client"
import { miningCalculator } from "@/lib/mining-system"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  usdt_balance: number
  bxt_balance: number
  referral_code: string
  created_at: string
}

interface MiningDashboardProps {
  user: User
  onUpdateBalance: (newBalance: number) => void
  onLogout?: () => void
}

export default function MiningDashboard({ user, onUpdateBalance, onLogout }: MiningDashboardProps) {
  const [activeTab, setActiveTab] = useState<"mining" | "deposit" | "wallet" | "referral" | "exchange">("mining")
  const [usdtBalance, setUsdtBalance] = useState(user.usdt_balance || 0)
  const [piBalance, setPiBalance] = useState(0)
  const [bxtBalance, setBxtBalance] = useState(user.bxt_balance || 0)
  const [activeMiningTier, setActiveMiningTier] = useState(0)
  const subscriptionRef = useRef<any>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load balances and mining tier from database
  const refreshBalance = useCallback(async () => {
    try {
      const userData = await getUserById(user.id)
      if (userData) {
        const newUsdtBalance = Number(userData.usdt_balance || 0)
        const newBxtBalance = Number(userData.bxt_balance || 0)
        
        // Always update to ensure accuracy
        setUsdtBalance((prev) => {
          if (prev !== newUsdtBalance) {
            onUpdateBalance(newUsdtBalance)
            return newUsdtBalance
          }
          return prev
        })
        setBxtBalance((prev) => {
          if (prev !== newBxtBalance) {
            return newBxtBalance
          }
          return prev
        })
      }

      const session = await getMiningSession(user.id)
      if (session) {
        setActiveMiningTier(session.apy_tier_id || 0)
        // Keep Pi balance in sync with total mined from mining session
        setPiBalance(Number(session.total_mined || 0))
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error)
    }
  }, [user.id, onUpdateBalance])

  useEffect(() => {
    // Initial load
    refreshBalance()

    // Set up real-time subscription to user balance changes
    const channel = supabase
      .channel(`user-balance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Real-time update when user balance changes
          const updatedUser = payload.new as any
          const newUsdtBalance = Number(updatedUser.usdt_balance || 0)
          const newBxtBalance = Number(updatedUser.bxt_balance || 0)
          
          setUsdtBalance((prev) => {
            if (prev !== newUsdtBalance) {
              onUpdateBalance(newUsdtBalance)
              return newUsdtBalance
            }
            return prev
          })
          setBxtBalance((prev) => {
            if (prev !== newBxtBalance) {
              return newBxtBalance
            }
            return prev
          })
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    // Also subscribe to transaction changes to detect when deposits/withdrawals are approved
    const transactionChannel = supabase
      .channel(`user-transactions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // When transaction status changes to completed, refresh balance
          const transaction = payload.new as any
          if (transaction.status === 'completed') {
            // Small delay to ensure database has updated
            setTimeout(() => {
              refreshBalance()
            }, 500)
          }
        }
      )
      .subscribe()

    // Periodic refresh every 5 seconds as backup
    refreshIntervalRef.current = setInterval(() => {
      refreshBalance()
    }, 5000)

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
      if (transactionChannel) {
        supabase.removeChannel(transactionChannel)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [user.id, refreshBalance])

  const handleUsdtBalanceUpdate = async (newBalance: number) => {
    // Fetch fresh balance from database first to prevent race conditions
    try {
      const userData = await getUserById(user.id)
      const currentBalance = Number(userData.usdt_balance || 0)
      
      // Update with the new balance
      setUsdtBalance(newBalance)
      await updateUserBalance(user.id, newBalance)
      onUpdateBalance(newBalance)
    } catch (error) {
      console.error("Failed to update balance:", error)
      // Refresh balance on error to get accurate state
      refreshBalance()
    }
  }

  // NOTE: Pi "Balance" card is derived from mining session `total_mined` (synced by `MiningCard`)
  // so we intentionally do not mutate `piBalance` here to avoid double-counting on claim.

  const handlePiClaimSuccess = async (claimedAmount: number) => {
    // Mirror claim into user USDT balance (wallet balance card uses this).
    // Always fetch fresh DB balance first to avoid race conditions.
    try {
      const userData = await getUserById(user.id)
      const currentUsdtBalance = Number(userData?.usdt_balance || 0)
      const newUsdtBalance = currentUsdtBalance + claimedAmount

      setUsdtBalance(newUsdtBalance)
      await updateUserBalance(user.id, newUsdtBalance, undefined)
      onUpdateBalance(newUsdtBalance)
    } catch (error) {
      console.error("Failed to mirror claim into wallet balance:", error)
    } finally {
      // Ensure PI total_mined + balances are re-synced from DB.
      refreshBalance()
    }
  }

  const handleBxtExchange = async (bxtAmount: number, usdtReceived: number) => {
    // Optimistic update first (UI should update instantly), then persist and re-sync from DB.
    const optimisticNewBxt = Math.max(0, bxtBalance - bxtAmount)
    const optimisticNewUsdt = usdtBalance + usdtReceived

    setBxtBalance(optimisticNewBxt)
    setUsdtBalance(optimisticNewUsdt)
    onUpdateBalance(optimisticNewUsdt)

    try {
      await updateUserBalance(user.id, optimisticNewUsdt, optimisticNewBxt)
    } catch (error) {
      console.error("Failed to update balances:", error)
    } finally {
      // Always re-sync (covers race conditions with realtime/interval refresh)
      refreshBalance()
    }
  }

  const handleBonusEarned = async (bonus: number) => {
    const newBxtBalance = bxtBalance + bonus
    setBxtBalance(newBxtBalance)
    try {
      await updateUserBalance(user.id, undefined, newBxtBalance)
    } catch (error) {
      console.error("Failed to update bonus:", error)
    }
  }

  const formatPiAmount = (value: number) => {
    if (!Number.isFinite(value)) return "0"
    // Tampilkan hingga 11 desimal, lalu buang nol di belakang agar tidak dipaksa 0.00000000
    return value.toFixed(11).replace(/\.?0+$/, "")
  }

  // Bottom navigation items (Home centered: Wallet - Friends - Home - Missions - Swap)
  const tabs = [
    { id: "deposit", label: "Wallet", icon: "/gamety dashboard/wallet.png" },
    { id: "wallet", label: "Friends", icon: "/gamety dashboard/friends.png" },
    { id: "mining", label: "Home", icon: "/pi/pinetwork.png" },
    { id: "referral", label: "Missions", icon: "/gamety dashboard/missions.png" },
    { id: "exchange", label: "Swap", icon: "/gamety dashboard/swap.png" },
  ]

  return (
    <div
      className="min-h-screen relative overflow-x-hidden flex flex-col items-stretch"
      style={{
        background:
          "radial-gradient(circle at top, #151226 0%, #070415 45%, #02010a 100%)",
      }}
    >
      {/* Soft animated background pattern */}
      <div
        className="fixed inset-0 opacity-15"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.18) 0%, transparent 55%),
            radial-gradient(circle at 80% 80%, rgba(96, 165, 250, 0.16) 0%, transparent 55%)
          `,
          backgroundSize: "120% 120%",
          animation: "gradient-shift 18s ease-in-out infinite",
        }}
      />

      {/* Subtle floating particles (reduced for cleaner look) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-yellow-300/5"
            style={{
              width: `${Math.random() * 3 + 2}px`,
              height: `${Math.random() * 3 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: "0 0 18px rgba(250, 204, 21, 0.5)",
              animation: `float ${Math.random() * 12 + 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto px-4 pt-3 pb-28 flex-1 flex flex-col gap-3">
        {/* Header + balances in a glass card */}
        <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl px-3.5 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.65)]">
          {/* Top App Header */}
          <header className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/pi/pinode.png"
                alt="PiNode"
                className="w-10 h-10 object-contain"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-white tracking-wide">
                  PiNode Labs
                </span>
                <span className="text-[11px] text-[#a7a3ff]">
                  Pi cloud mining dashboard
                </span>
              </div>
            </div>
            {/* User info + logout */}
            <div className="flex items-center gap-2">
              <span className="max-w-[120px] truncate text-[11px] text-[#c9c3ff]">
                {user.email}
              </span>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#22193d] border border-[#5a4ac7] text-[#c9c3ff] hover:bg-[#2b2053] hover:border-[#7c6cf3] transition-colors"
                onClick={onLogout}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
                  <path d="M15 12H7" />
                  <path d="m18 9 3 3-3 3" />
                </svg>
              </button>
            </div>
          </header>

          {/* Stats Grid - balances (Pi / PiNode) */}
          <div className="grid grid-cols-1 gap-2.5">
            {/* PI Balance card */}
            <div className="rounded-xl px-3 py-2.5 flex items-center bg-gradient-to-r from-[#1e1638]/95 via-[#241948]/95 to-[#1e1638]/95 border border-yellow-300/20 shadow-[0_10px_30px_rgba(15,23,42,0.9)]">
              <div className="flex items-center gap-3">
                <img
                  src="/pi/pinetwork.png"
                  alt="Pi icon"
                  className="w-10 h-10 object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    filter: "drop-shadow(0 0 14px rgba(251,191,36,0.95))",
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#c6bfff] mb-0.5">
                    Pi Balance
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {formatPiAmount(usdtBalance)}{" "}
                    <span className="font-medium text-xs text-[#fbbf24]">
                      PI
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* PiNode Balance card */}
            <div className="rounded-xl px-3 py-2.5 flex items-center bg-gradient-to-r from-[#151735]/95 via-[#111827]/95 to-[#0b1220]/95 border border-sky-300/20 shadow-[0_10px_30px_rgba(15,23,42,0.9)]">
              <div className="flex items-center gap-3">
                <img
                  src="/pi/pinodelabs.png"
                  alt="PiNode icon"
                  className="w-10 h-10 object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    filter: "drop-shadow(0 0 14px rgba(125,211,252,0.95))",
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#bfdbfe] mb-0.5">
                    PiNode Balance
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {Math.floor(bxtBalance).toLocaleString()}{" "}
                    <span className="font-medium text-xs text-[#7dd3fc]">
                      PiNode
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content (only rendered sekali, dikontrol lewat activeTab) */}
        <div className="mb-1.5">
          {activeTab === "mining" && (
            <MiningCard
              userId={user.id}
              onClaimSuccess={handlePiClaimSuccess}
              onPiBalanceChange={setPiBalance}
              bxtBalance={bxtBalance}
              usdtBalance={usdtBalance}
              onExchange={handleBxtExchange}
            />
          )}
          {/* Wallet tab: Withdraw PI Network & withdraw history */}
          {activeTab === "deposit" && (
            <WalletSection
              userId={user.id}
              currentUSDTBalance={usdtBalance}
              onBalanceUpdate={handleUsdtBalanceUpdate}
              onBalanceRefresh={refreshBalance}
              onNavigateToDeposit={undefined}
            />
          )}

          {/* Friends tab opens referral (invite + rewards) */}
          {activeTab === "wallet" && (
            <ReferralSection userId={user.id} onBonusEarned={handleBonusEarned} />
          )}
          {/* Missions tab: Boost / deposit-related section (tanpa Withdraw PI Network) */}
          {activeTab === "referral" && (
            <DepositSection userId={user.id} currentUSDTBalance={usdtBalance} onBalanceRefresh={refreshBalance} />
          )}
          {/* Swap tab uses ExchangeSection (PiNode -> PI Network) */}
          {activeTab === "exchange" && (
            <ExchangeSection
              bxtBalance={bxtBalance}
              usdtBalance={usdtBalance}
              onExchange={handleBxtExchange}
              userId={user.id}
            />
          )}
        </div>

        {/* Bottom navigation moved to fixed bar below */}

        {/* Tab Content removed (was duplicating the main content) */}
      </main>

      {/* Bottom Navigation Bar (fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0816]/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
            <div className="flex items-end justify-between px-3 sm:px-4 py-2.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const isHome = tab.id === "mining"
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="relative flex flex-1 flex-col items-center justify-end gap-1 text-center"
                  >
                    {isHome ? (
                      <div className="relative -mt-6">
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border ${
                            isActive ? "border-[#fbbf24]/70" : "border-white/10"
                          }`}
                          style={{
                            background:
                              "radial-gradient(circle at 30% 20%, rgba(251,191,36,0.95) 0%, rgba(236,72,153,0.7) 35%, rgba(79,70,229,0.9) 100%)",
                            boxShadow: isActive
                              ? "0 0 30px rgba(251,191,36,0.55), 0 10px 30px rgba(0,0,0,0.5)"
                              : "0 10px 30px rgba(0,0,0,0.5)",
                          }}
                        >
                          <img
                            src={tab.icon}
                            alt={tab.label}
                            className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                            style={{
                              // Biarkan browser merender sesuai kualitas asli image
                              filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.55))",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={tab.icon}
                        alt={tab.label}
                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                        style={{
                          // Tanpa forced pixel rendering agar ikon tetap tajam
                          filter: isActive
                            ? "drop-shadow(0 0 10px rgba(251,191,36,0.6))"
                            : "none",
                          opacity: isActive ? 1 : 0.75,
                        }}
                      />
                    )}
                    <span
                      className={`text-[11px] sm:text-xs font-medium ${
                        isActive ? "text-[#fbbf24]" : "text-white/70"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
