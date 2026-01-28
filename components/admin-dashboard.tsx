"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, TrendingUp, Zap, Settings, LogOut, CreditCard } from "lucide-react"
import AdminTransactions from "./admin-transactions"
import { getAdminStats, getMinWithdraw, setMinWithdraw } from "@/lib/supabase-client"

interface AdminDashboardProps {
  onLogout?: () => void
}

interface AdminStats {
  totalUsers: number
  activeMiners: number
  totalMined: number
  totalExchanged: number
  totalReferrals: number
  platformFee: number
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "mining" | "transactions" | "settings">("transactions")
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeMiners: 0,
    totalMined: 0,
    totalExchanged: 0,
    totalReferrals: 0,
    platformFee: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true)
        const adminStats = await getAdminStats()
        setStats(adminStats)
      } catch (error) {
        console.error("Failed to load admin stats:", error)
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
    
    // Refresh stats when switching to overview tab
    if (activeTab === "overview") {
      loadStats()
    }

    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navbar */}
      <nav className="border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img 
                src="/minety.png" 
                alt="Logo" 
                className="w-24 h-24 object-contain"
              />
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="gap-2 bg-transparent border-border hover:bg-secondary"
            >
              <LogOut className="w-4 h-4" />
              Exit Admin
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border pb-4 overflow-x-auto">
          {[
            { id: "transactions", label: "Transactions", icon: CreditCard },
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "users", label: "Users", icon: Users },
            { id: "mining", label: "Mining", icon: Zap },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "transactions" && <AdminTransactions />}
        {activeTab === "overview" && <AdminOverview stats={stats} isLoading={statsLoading} onRefresh={() => {
          getAdminStats().then(setStats).catch(console.error)
        }} />}
        {activeTab === "users" && <AdminUsers stats={stats} />}
        {activeTab === "mining" && <AdminMining stats={stats} />}
        {activeTab === "settings" && <AdminSettings />}
      </main>
    </div>
  )
}

function AdminOverview({
  stats,
  isLoading,
  onRefresh,
}: {
  stats: {
    totalUsers: number
    activeMiners: number
    totalMined: number
    totalExchanged: number
    totalReferrals: number
    platformFee: number
  }
  isLoading: boolean
  onRefresh: () => void
}) {
  const participationRate = stats.totalUsers > 0 
    ? ((stats.activeMiners / stats.totalUsers) * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Overview</h2>
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <img 
                src="/minety.png" 
                alt="Loading" 
                className="w-12 h-12 object-contain animate-spin"
              />
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase font-medium">Total Users</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          {isLoading ? (
            <div className="text-3xl font-bold text-primary">-</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-primary">{stats.totalUsers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-2">Registered users (excluding admin)</div>
            </>
          )}
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase font-medium">Active Miners</span>
            <Zap className="w-5 h-5 text-accent" />
          </div>
          {isLoading ? (
            <div className="text-3xl font-bold text-accent">-</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-accent">{stats.activeMiners.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-2">{participationRate}% participation</div>
            </>
          )}
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase font-medium">Total Mined</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          {isLoading ? (
            <div className="text-3xl font-bold text-primary">-</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-primary">
                {stats.totalMined >= 1000000 
                  ? `${(stats.totalMined / 1000000).toFixed(2)}M`
                  : stats.totalMined >= 1000
                  ? `${(stats.totalMined / 1000).toFixed(1)}K`
                  : stats.totalMined.toFixed(0)
                } GOLD
              </div>
              <div className="text-xs text-muted-foreground mt-2">Total from all miners</div>
            </>
          )}
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase font-medium">Exchanged Volume</span>
            <BarChart3 className="w-5 h-5 text-accent" />
          </div>
          {isLoading ? (
            <div className="text-3xl font-bold text-accent">-</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-accent">
                {stats.totalExchanged >= 1000000
                  ? `${(stats.totalExchanged / 1000000).toFixed(2)}M`
                  : stats.totalExchanged >= 1000
                  ? `${(stats.totalExchanged / 1000).toFixed(1)}K`
                  : stats.totalExchanged.toFixed(2)
                } USDT
              </div>
              <div className="text-xs text-muted-foreground mt-2">Completed exchanges</div>
            </>
          )}
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase font-medium">Total Referrals</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          {isLoading ? (
            <div className="text-3xl font-bold text-primary">-</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-primary">{stats.totalReferrals.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-2">Active referral links</div>
            </>
          )}
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase font-medium">Platform Revenue</span>
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          {isLoading ? (
            <div className="text-3xl font-bold text-accent">-</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-accent">
                {stats.platformFee >= 1000000
                  ? `${(stats.platformFee / 1000000).toFixed(2)}M`
                  : stats.platformFee >= 1000
                  ? `${(stats.platformFee / 1000).toFixed(1)}K`
                  : stats.platformFee.toFixed(2)
                } GOLD
              </div>
              <div className="text-xs text-muted-foreground mt-2">Estimated from withdrawals (2% fee)</div>
            </>
          )}
        </Card>
      </div>

      {/* Charts Area */}
      <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Platform Activity</h3>
        <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Real-time data displayed above. Charts can be added here.</p>
        </div>
      </Card>
    </div>
  )
}

function AdminUsers({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold mb-4">User Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">User ID</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Balance</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {["USR001", "USR002", "USR003", "USR004", "USR005"].map((id) => (
                <tr key={id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{id}</td>
                  <td className="px-4 py-3 text-foreground">user@example.com</td>
                  <td className="px-4 py-3 text-accent">1,250 GOLD</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs bg-accent/20 text-accent">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function AdminMining({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold mb-4">APY Distribution</h3>
          <div className="space-y-3">
            {[
              { name: "#Mine 1", users: 125, percentage: 14 },
              { name: "#Mine 2", users: 280, percentage: 31 },
              { name: "#Mine 3", users: 387, percentage: 43 },
              { name: "#Mine 4", users: 100, percentage: 12 },
            ].map((apy) => (
              <div key={apy.name}>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-foreground">{apy.name}</span>
                  <span className="text-muted-foreground">{apy.users} users</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                    style={{ width: `${apy.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Mining Statistics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Daily Earnings</span>
              <span className="text-accent font-semibold">2,500 GOLD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Claims/Day</span>
              <span className="text-primary font-semibold">1,200</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Hash Rate</span>
              <span className="text-accent font-semibold">125 PH/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Claims</span>
              <span className="text-primary font-semibold">42,500</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function AdminSettings() {
  const [settings, setSettings] = useState({
    conversionRate: 1000,
    minWithdraw: 1,
    minDeposit: 10,
    referralReward: 100,
    platformFeePercent: 2.5,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load minimum withdraw from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const minWithdraw = await getMinWithdraw()
        setSettings(prev => ({ ...prev, minWithdraw }))
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setSaveMessage(null)
      
      // Save minimum withdraw
      await setMinWithdraw(settings.minWithdraw)
      
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' })
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm p-6 max-w-2xl">
      <h3 className="text-lg font-semibold mb-6">Platform Settings</h3>
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Minimum Withdraw (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={settings.minWithdraw}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0
                setSettings(prev => ({ ...prev, minWithdraw: value }))
              }}
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:border-primary"
              placeholder="Enter minimum withdraw amount"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current minimum withdrawal amount in USDT. Users cannot withdraw less than this amount.
            </p>
          </div>
          
          {saveMessage && (
            <div className={`p-3 rounded-lg ${
              saveMessage.type === 'success' 
                ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {saveMessage.text}
            </div>
          )}
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 mt-6"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </Card>
  )
}
