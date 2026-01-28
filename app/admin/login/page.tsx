"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, LogIn, Shield } from "lucide-react"
import { getUserByEmail, createUser } from "@/lib/supabase-client"
import { supabase } from "@/lib/supabase"
import NodeNetworkBackground from "@/components/node-network-background"

// Simple hash function (same as in login-form.tsx)
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Check credentials
      const ADMIN_EMAIL = "mcusctomer@gmail.com"
      const ADMIN_PASSWORD = "12345admin"

      if (email !== ADMIN_EMAIL) {
        throw new Error("Invalid admin credentials")
      }

      if (password !== ADMIN_PASSWORD) {
        throw new Error("Invalid admin credentials")
      }

      // Check if admin user exists, if not create it
      let adminUser = await getUserByEmail(ADMIN_EMAIL)
      
      if (!adminUser) {
        // Create admin user with is_admin flag directly
        const passwordHash = simpleHash(ADMIN_PASSWORD)
        const referralCode = `ADMIN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: ADMIN_EMAIL,
            password_hash: passwordHash,
            usdt_balance: 0,
            bxt_balance: 0,
            referral_code: referralCode,
            is_admin: true,
          })
          .select()
          .single()
        
        if (createError) {
          // Fallback: use createUser then update
          adminUser = await createUser(ADMIN_EMAIL, passwordHash)
          const { error: updateError } = await supabase
            .from('users')
            .update({ is_admin: true })
            .eq('id', adminUser.id)
          
          if (updateError) {
            console.error("Failed to set admin flag:", updateError)
          }
          adminUser = { ...adminUser, is_admin: true }
        } else {
          adminUser = newUser
          // Create initial mining session for admin
          const { error: sessionError } = await supabase.from('mining_sessions').insert({
            user_id: adminUser.id,
            apy_tier_id: 0,
            mining_balance: 0,
            total_mined: 0,
            last_claim_time: new Date().toISOString(),
            is_active: true,
          })
          
          // Ignore error if session already exists
          if (sessionError) {
            console.log("Mining session may already exist:", sessionError)
          }
        }
      } else {
        // Ensure user is set as admin
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_admin: true })
          .eq('id', adminUser.id)
        
        if (updateError) {
          console.error("Failed to update admin flag:", updateError)
        }
        
        adminUser = { ...adminUser, is_admin: true }
      }

      // Save to localStorage
      localStorage.setItem("bxt_user_id", adminUser.id)
      
      // Redirect to admin dashboard
      router.push("/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-primary/30 bg-card/80 backdrop-blur-sm shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Portal</h1>
          <p className="text-muted-foreground">Login to access admin dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email"
              className="w-full px-4 py-3 rounded-xl bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 rounded-xl bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-bold py-3 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <NodeNetworkBackground
                  size={24}
                  showCenterLogo={false}
                  className="node-network-button-loading"
                />
                <span>Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Login to Admin Portal
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            Authorized personnel only
          </p>
        </div>
      </Card>
    </div>
  )
}

