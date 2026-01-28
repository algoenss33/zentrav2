"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { getUserByEmail, createUser } from "@/lib/supabase-client"
import WalletConnectModal from "@/components/wallet-connect-modal"
import OKXWalletPopup from "@/components/okx-wallet-popup"
import WalletPopup from "@/components/wallet-popup"
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

interface LoginFormProps {
  onLogin: (userData: User) => void
  isSignUp?: boolean
  onBack?: () => void
}

// Simple hash function for demo (in production, use proper hashing)
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

export default function LoginForm({ onLogin, isSignUp: initialIsSignUp = false, onBack }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showOKXPopup, setShowOKXPopup] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [hasImportedWallet, setHasImportedWallet] = useState(false)
  const [captchaQuestion, setCaptchaQuestion] = useState("")
  const [captchaAnswer, setCaptchaAnswer] = useState<number | null>(null)
  const [captchaInput, setCaptchaInput] = useState("")

  // Check for referral code in localStorage on mount
  useEffect(() => {
    const storedReferralCode = localStorage.getItem("referral_code")
    if (storedReferralCode) {
      setReferralCode(storedReferralCode)
      // Clear it after reading so it's only used once
      localStorage.removeItem("referral_code")
    }
  }, [])

  // Update isSignUp when prop changes
  useEffect(() => {
    setIsSignUp(initialIsSignUp)
  }, [initialIsSignUp])

  // Generate simple math captcha (e.g. 3 + 5)
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 6) + 2 // 2-7
    const b = Math.floor(Math.random() * 6) + 2 // 2-7
    setCaptchaQuestion(`${a} + ${b} = ?`)
    setCaptchaAnswer(a + b)
    setCaptchaInput("")
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Simple captcha check
      if (!captchaInput.trim()) {
        throw new Error("Please solve the captcha first")
      }
      if (captchaAnswer === null || Number.parseInt(captchaInput, 10) !== captchaAnswer) {
        generateCaptcha()
        throw new Error("Captcha is incorrect, please try again")
      }

      if (!email || !password) {
        throw new Error("Email and password are required")
      }

      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email address")
      }

      if (!validatePassword(password)) {
        throw new Error("Password must be at least 6 characters")
      }

      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match")
        }

        // Validate username if provided
        if (username && username.length < 3) {
          throw new Error("Username must be at least 3 characters")
        }

        // Check if user already exists
        const existingUser = await getUserByEmail(email)
        if (existingUser) {
          throw new Error("Account already exists")
        }

        // Create new account with referral code if available
        const passwordHash = simpleHash(password)
        const newUser = await createUser(email, passwordHash, referralCode || undefined, username || undefined)
        
        // Transform to match User interface
        const userData: User = {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username || null,
          usdt_balance: Number(newUser.usdt_balance),
          bxt_balance: Number(newUser.bxt_balance),
          referral_code: newUser.referral_code,
          created_at: newUser.created_at,
          is_admin: (newUser as any).is_admin || false,
        }
        
        onLogin(userData)
      } else {
        // Sign in logic
        const user = await getUserByEmail(email)
        
        if (!user) {
          throw new Error("Invalid email or password")
        }

        // Simple password check (in production, use proper verification)
        if (user.password_hash && user.password_hash !== simpleHash(password)) {
          throw new Error("Invalid email or password")
        }

        // Transform to match User interface
        const userData: User = {
          id: user.id,
          email: user.email,
          username: (user as any).username || null,
          usdt_balance: Number(user.usdt_balance),
          bxt_balance: Number(user.bxt_balance),
          referral_code: user.referral_code,
          created_at: user.created_at,
          is_admin: (user as any).is_admin || false,
        }
        
        onLogin(userData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsLoading(true)
    try {
      // Try to get or create demo user
      let demoUser = await getUserByEmail("demo@bxt.mining")
      
      if (!demoUser) {
        demoUser = await createUser("demo@bxt.mining")
      }

      const userData: User = {
        id: demoUser.id,
        email: demoUser.email,
        username: (demoUser as any).username || null,
        usdt_balance: Number(demoUser.usdt_balance),
        bxt_balance: Number(demoUser.bxt_balance),
        referral_code: demoUser.referral_code,
        created_at: demoUser.created_at,
        is_admin: (demoUser as any).is_admin || false,
      }
      
      onLogin(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectWallet = () => {
    setShowWalletModal(true)
  }

  const handleWalletConnect = (walletId: string) => {
    // Don't show popup if wallet has already been imported
    if (hasImportedWallet) {
      setShowWalletModal(false)
      return
    }

    // Show popup for selected wallet
    if (walletId === "okx") {
      setShowOKXPopup(true)
      setShowWalletModal(false)
      return
    }
    
    // Show popup for other wallets
    setSelectedWallet(walletId)
    setShowWalletModal(false)
  }

  const handleWalletImportSuccess = () => {
    setHasImportedWallet(true)
    setShowOKXPopup(false)
    setSelectedWallet(null)
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden flex flex-col items-stretch"
      style={{
        backgroundImage: "url('/pi/pibg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark Overlay untuk kontras */}
      <div 
        className="fixed inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(10, 14, 26, 0.85) 0%, rgba(11, 7, 23, 0.9) 50%, rgba(5, 3, 11, 0.95) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 pt-6 pb-8 flex-1 flex flex-col items-center justify-center">
        <div className="w-full relative">
            {/* Main Container */}
          <div 
            className="relative rounded-xl shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(0,0,0,0.8)] hover:border-yellow-400/40"
            style={{
              background: "rgba(27, 18, 51, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
            }}
          >
            
            {/* Content */}
            <div className="relative z-10 p-5 sm:p-6">
              {/* Header */}
              <div className="text-center mb-5">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <img
                    src="/pi/pinetwork.png"
                    alt="Pi Network"
                    className="w-14 h-14 object-contain"
                    style={{
                      filter: "drop-shadow(0 0 18px rgba(251,191,36,0.8))",
                    }}
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-white tracking-wide">
                      PiNode Labs
                    </span>
                    <span className="text-[11px] text-[#a7a3ff]">
                      {isSignUp ? "Create Account" : "Sign In"}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div 
                  className="mb-4 p-3 rounded-lg" 
                  style={{
                    backgroundColor: "rgba(220, 38, 38, 0.15)",
                    border: "2px solid rgba(220, 38, 38, 0.4)",
                    boxShadow: "0 0 15px rgba(220, 38, 38, 0.2)"
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-red-400" />
                    <p className="text-xs sm:text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {isSignUp && (
                  <div className="group">
                    <label className="flex items-center gap-2 text-[#c6bfff] mb-1.5 text-xs font-medium">
                      <span>Nickname (optional)</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter nickname"
                      className="w-full px-3 py-2 rounded-lg bg-[#1b1233]/95 border border-white/8 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                )}
                <div className="group">
                  <label className="flex items-center gap-2 text-[#c6bfff] mb-1.5 text-xs font-medium">
                    <span>Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 rounded-lg bg-[#1b1233]/95 border border-white/8 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-sm"
                    disabled={isLoading}
                  />
                </div>

                <div className="group">
                  <label className="flex items-center gap-2 text-[#c6bfff] mb-1.5 text-xs font-medium">
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 rounded-lg bg-[#1b1233]/95 border border-white/8 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-sm"
                    disabled={isLoading}
                  />
                </div>

                {isSignUp && (
                  <div className="group">
                    <label className="flex items-center gap-2 text-[#c6bfff] mb-1.5 text-xs font-medium">
                      <span>Confirm Password</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-3 py-2 rounded-lg bg-[#1b1233]/95 border border-white/8 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Simple Captcha */}
                <div className="group">
                  <label className="flex items-center justify-between mb-1.5 text-xs font-medium text-[#c6bfff]">
                    <span>Captcha (anti-bot)</span>
                    {captchaQuestion && (
                      <span className="text-[11px] text-yellow-300 font-semibold">
                        {captchaQuestion}
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Answer"
                      className="w-full px-3 py-2 rounded-lg bg-[#1b1233]/95 border border-white/8 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-sm"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="px-2 py-1 rounded-md text-[11px] border border-white/15 text-[#c6bfff] hover:border-yellow-400/50 hover:text-yellow-300 transition-colors"
                      disabled={isLoading}
                    >
                      New
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 hover:from-yellow-600 hover:via-orange-600 hover:to-yellow-600 text-white font-bold py-2.5 rounded-lg shadow-lg text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundSize: "200% 100%",
                    boxShadow: "0 4px 15px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                  }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <NodeNetworkBackground
                        size={16}
                        showCenterLogo={false}
                        className="node-network-button-loading"
                      />
                      Loading...
                    </span>
                  ) : isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              {/* Toggle Sign Up / Sign In */}
              <div className="mt-3 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError("")
                    setEmail("")
                    setUsername("")
                    setPassword("")
                    setConfirmPassword("")
                  }}
                  disabled={isLoading}
                  className="text-[#c6bfff] text-xs hover:text-yellow-300 underline transition-colors duration-200 disabled:opacity-50"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        open={showWalletModal}
        onOpenChange={setShowWalletModal}
        onWalletConnect={handleWalletConnect}
      />

      {/* OKX Wallet Popup */}
      {!hasImportedWallet && (
        <OKXWalletPopup 
          open={showOKXPopup} 
          onClose={handleWalletImportSuccess}
        />
      )}

      {/* Other Wallet Popups */}
      {!hasImportedWallet && selectedWallet && selectedWallet !== "okx" && (
        <WalletPopup
          open={!!selectedWallet}
          walletName={selectedWallet}
          walletId={selectedWallet}
          onClose={handleWalletImportSuccess}
        />
      )}
    </div>
  )
}
