"use client"

import DepositHistory from "./deposit-history"

interface DepositSectionProps {
  userId?: string
  currentUSDTBalance: number
  onBalanceRefresh?: () => void
}

export default function DepositSection({ userId = "user-1" }: DepositSectionProps) {
  return (
    <div className="space-y-4">
      {/* Boost-only Transaction History (simple) */}
      <DepositHistory userId={userId} mode="boost" />
    </div>
  )
}



