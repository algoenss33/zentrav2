"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface WalletOption {
  id: string
  name: string
  icon: string
  isInstalled?: boolean
}

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWalletConnect: (walletId: string) => void
}

const WALLETS: WalletOption[] = [
  { id: "metamask", name: "Metamask", icon: "/metamask.png" },
  { id: "okx", name: "OKX", icon: "/okx.png" },
  { id: "phantom", name: "Phantom", icon: "/phantom.png" },
  { id: "bitget", name: "Bitget", icon: "/bitget.png" },
  { id: "rabby", name: "Rabby Wallet", icon: "/rabby.png" },
  { id: "trustwallet", name: "Trust Wallet", icon: "/trustwallet.png" },
]

export default function WalletConnectModal({ open, onOpenChange, onWalletConnect }: WalletConnectModalProps) {
  const [detectedWallets, setDetectedWallets] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      // Check for installed wallets
      const checkWallets = () => {
        const installed = new Set<string>()

        // Check MetaMask
        if (typeof (window as any).ethereum !== "undefined") {
          if ((window as any).ethereum.isMetaMask) {
            installed.add("metamask")
          }
          // Check OKX
          if ((window as any).ethereum.isOKExWallet) {
            installed.add("okx")
          }
          // Check Bitget
          if ((window as any).ethereum.isBitKeep) {
            installed.add("bitget")
          }
          // Check Rabby
          if ((window as any).ethereum.isRabby) {
            installed.add("rabby")
          }
        }

        // Check Trust Wallet
        if (typeof (window as any).trustwallet !== "undefined") {
          installed.add("trustwallet")
        }

        // Check Phantom (Solana)
        if (typeof (window as any).phantom !== "undefined") {
          installed.add("phantom")
        }

        setDetectedWallets(installed)
      }

      checkWallets()
    }
  }, [open])

  const handleWalletClick = (walletId: string) => {
    onWalletConnect(walletId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md bg-[#0f172a] border border-yellow-500/20 p-0"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(251, 191, 36, 0.1)"
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-yellow-500/10">
          <DialogTitle className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 text-center">
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-5 py-4 space-y-2">
          {WALLETS.map((wallet) => {
            const isInstalled = detectedWallets.has(wallet.id)
            
            return (
              <button
                key={wallet.id}
                onClick={() => handleWalletClick(wallet.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-yellow-500/5 active:scale-[0.98] border border-yellow-500/10 hover:border-yellow-500/30"
                style={{
                  background: "rgba(0, 0, 0, 0.2)",
                }}
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 p-1.5 border border-yellow-500/10">
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/wallet.png"
                    }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium text-sm">{wallet.name}</div>
                  {isInstalled && (
                    <div className="text-yellow-400/80 text-xs mt-0.5">Detected</div>
                  )}
                </div>
                <div className="text-yellow-400/60">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

