"use client"

import { useState, useEffect } from "react"
import MiningDashboard from "@/components/mining-dashboard"
import LoginForm from "@/components/auth/login-form"
import { getUserById } from "@/lib/supabase-client"
import NodeNetworkBackground from "@/components/node-network-background"

interface User {
  id: string
  email: string
  username?: string | null
  usdt_balance: number
  bxt_balance: number
  referral_code: string
  created_at: string
  is_admin?: boolean
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUserId = localStorage.getItem("bxt_user_id")
      if (storedUserId) {
        try {
          const userData = await getUserById(storedUserId)
          if (userData) {
            setUser({
              id: userData.id,
              email: userData.email,
              username: (userData as any).username || null,
              usdt_balance: Number(userData.usdt_balance),
              bxt_balance: Number(userData.bxt_balance),
              referral_code: userData.referral_code,
              created_at: userData.created_at,
              is_admin: (userData as any).is_admin || false,
            })
            setIsAuthenticated(true)
          } else {
            // User not found in database (migrated from old Supabase)
            localStorage.removeItem("bxt_user_id")
          }
        } catch (error) {
          // Only log actual errors, not "not found" cases
          if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116') {
            console.error("Failed to load user:", error)
          }
          localStorage.removeItem("bxt_user_id")
        }
      }
      setIsLoading(false)
    }
    loadUser()
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem("bxt_user_id", userData.id)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem("bxt_user_id")
  }

  const updateUserBalance = async (newBalance: number) => {
    if (user) {
      try {
        const updatedUser = await getUserById(user.id)
        if (updatedUser) {
          const updated = {
            ...user,
            usdt_balance: Number(updatedUser.usdt_balance),
            bxt_balance: Number(updatedUser.bxt_balance),
          }
          setUser(updated)
        }
      } catch (error) {
        console.error("Failed to update balance:", error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-52 h-52 mx-auto rounded-full flex items-center justify-center mb-4">
            <NodeNetworkBackground
              size={208}
              showCenterLogo={true}
              centerLogoUrl="/pi/pinetwork.png"
              className="node-network-loading"
            />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <LoginForm onLogin={handleLogin} />
  }

  // Regular users see mining dashboard (full-screen, tanpa Navbar lama)
  // Admins should go to /admin route
  return (
    <div className="min-h-screen bg-background">
      <MiningDashboard
        user={user}
        onUpdateBalance={updateUserBalance}
        onLogout={handleLogout}
      />
    </div>
  )
}
