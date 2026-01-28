"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Save, Check, Copy, Edit2, Trash2, Plus, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import NodeNetworkBackground from "@/components/node-network-background"

interface WalletAddress {
  id: string
  chain_id: string
  chain_name: string
  network: string
  address: string
  currency: string
  is_active: boolean
}

interface WalletAddressesSectionProps {
  userId: string
}

const CHAIN_OPTIONS = [
  { id: "trc20", name: "TRX", displayName: "TRC20 (Tron)", network: "TRC20", icon: "/deposit/trx.svg" },
  { id: "bep20", name: "Binance BEP20", displayName: "BEP20 (BNB Chain)", network: "BEP20", icon: "/deposit/bnb_bep20.svg" },
  { id: "erc20", name: "Ethereum", displayName: "ERC20 (Ethereum)", network: "ERC20", icon: "/deposit/eth.svg" },
  { id: "polygon", name: "MATIC", displayName: "Polygon (MATIC)", network: "Polygon", icon: "/deposit/matic.svg" },
  { id: "solana", name: "Solana", displayName: "Solana", network: "Solana", icon: "/deposit/sol.svg" },
  { id: "ton", name: "TON", displayName: "TON (The Open Network)", network: "TON", icon: "/deposit/ton.svg" },
  { id: "bitcoin", name: "Bitcoin", displayName: "Bitcoin", network: "Bitcoin", icon: "/deposit/btc.svg" },
  { id: "dogecoin", name: "Dogecoin", displayName: "Dogecoin", network: "Dogecoin", icon: "/deposit/doge.svg" },
  { id: "litecoin", name: "Litecoin", displayName: "Litecoin", network: "Litecoin", icon: "/deposit/ltc.svg" },
  { id: "bitcoin-cash", name: "Bitcoin Cash", displayName: "Bitcoin Cash", network: "Bitcoin Cash", icon: "/deposit/bch.svg" },
  { id: "cardano-bep20", name: "Cardano BEP20", displayName: "Cardano BEP20", network: "BEP20", icon: "/deposit/ada_bep20.svg" },
  { id: "tether-trc20", name: "Tether TRC20", displayName: "Tether TRC20", network: "TRC20", icon: "/deposit/usdt_trc20.svg" },
  { id: "tether-bep20", name: "Tether BEP20", displayName: "Tether BEP20", network: "BEP20", icon: "/deposit/usdt_bep20.svg" },
  { id: "tether-polygon", name: "Tether Polygon", displayName: "Tether Polygon", network: "Polygon", icon: "/deposit/usdt_polygon.svg" },
  { id: "tether-solana", name: "Tether Solana", displayName: "Tether Solana", network: "Solana", icon: "/deposit/usdt_solana.svg" },
  { id: "solana-bep20", name: "Solana BEP20", displayName: "Solana BEP20", network: "BEP20", icon: "/deposit/sol_bep20.svg" },
  { id: "ethereum-bep20", name: "Ethereum BEP20", displayName: "Ethereum BEP20", network: "BEP20", icon: "/deposit/eth_bep20.svg" },
]

export default function WalletAddressesSection({ userId }: WalletAddressesSectionProps) {
  const [addresses, setAddresses] = useState<WalletAddress[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [selectedChain, setSelectedChain] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAddresses()
  }, [userId])

  const loadAddresses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_wallet_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error("Failed to load addresses:", error)
      setError("Failed to load wallet addresses")
    } finally {
      setLoading(false)
    }
  }

  const validateAddress = (address: string, chainId: string): boolean => {
    if (!address || address.trim() === "") return false
    
    switch (chainId) {
      case "trc20":
      case "tether-trc20":
        return /^T[A-Za-z1-9]{33}$/.test(address)
      case "bep20":
      case "erc20":
      case "polygon":
      case "tether-bep20":
      case "tether-polygon":
      case "ethereum-bep20":
      case "solana-bep20":
      case "cardano-bep20":
        return /^0x[a-fA-F0-9]{40}$/.test(address)
      case "solana":
      case "tether-solana":
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
      case "ton":
        return address.length >= 20 && address.length <= 100
      case "bitcoin":
      case "bitcoin-cash":
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address)
      case "dogecoin":
      case "litecoin":
        return /^[DL][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)
      default:
        return address.length >= 20
    }
  }

  const handleSave = async (chainId: string, address: string) => {
    setError("")
    setSuccess("")

    if (!address || address.trim() === "") {
      setError("Please enter a wallet address")
      return
    }

    if (!validateAddress(address, chainId)) {
      const chain = CHAIN_OPTIONS.find(c => c.id === chainId)
      setError(`Invalid ${chain?.displayName || chainId} wallet address format`)
      return
    }

    try {
      const chain = CHAIN_OPTIONS.find(c => c.id === chainId)
      if (!chain) {
        setError("Invalid chain selected")
        return
      }

      const { data, error } = await supabase
        .from('user_wallet_addresses')
        .upsert({
          user_id: userId,
          chain_id: chainId,
          chain_name: chain.name,
          network: chain.network,
          address: address.trim(),
          currency: 'USDT',
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,chain_id'
        })
        .select()
        .single()

      if (error) throw error

      setSuccess(`Wallet address saved for ${chain.displayName}`)
      setNewAddress("")
      setSelectedChain(null)
      await loadAddresses()
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Failed to save address:", error)
      setError(error instanceof Error ? error.message : "Failed to save wallet address")
    }
  }

  const handleEdit = (id: string, currentAddress: string) => {
    setEditingId(id)
    setEditingAddress(currentAddress)
  }

  const handleUpdate = async (id: string, chainId: string) => {
    setError("")
    
    if (!editingAddress || editingAddress.trim() === "") {
      setError("Please enter a wallet address")
      return
    }

    if (!validateAddress(editingAddress, chainId)) {
      const chain = CHAIN_OPTIONS.find(c => c.id === chainId)
      setError(`Invalid ${chain?.displayName || chainId} wallet address format`)
      return
    }

    try {
      const { error } = await supabase
        .from('user_wallet_addresses')
        .update({
          address: editingAddress.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setSuccess("Wallet address updated")
      setEditingId(null)
      setEditingAddress("")
      await loadAddresses()
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Failed to update address:", error)
      setError(error instanceof Error ? error.message : "Failed to update wallet address")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wallet address?")) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_wallet_addresses')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess("Wallet address deleted")
      await loadAddresses()
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Failed to delete address:", error)
      setError(error instanceof Error ? error.message : "Failed to delete wallet address")
    }
  }

  const handleCopy = (address: string, id: string) => {
    navigator.clipboard.writeText(address)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getChainInfo = (chainId: string) => {
    return CHAIN_OPTIONS.find(c => c.id === chainId)
  }

  if (loading) {
    return (
      <Card className="border border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="text-center py-8">
          <div className="flex justify-center">
            <NodeNetworkBackground
              size={96}
              showCenterLogo={true}
              centerLogoUrl="/pi/pinetwork.png"
              className="node-network-loading"
            />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">My Wallet Addresses</h3>
        <p className="text-xs text-muted-foreground">Manage your wallet addresses for deposits. These addresses will be shown to admin for verification.</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-xs text-green-500">{success}</p>
        </div>
      )}

      {/* Add New Address */}
      <div 
        className="relative rounded-2xl p-4 overflow-hidden"
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
        
        <div className="relative z-10">
        <div className="mb-3">
          <h4 
            className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 mb-2"
            style={{
              textShadow: "0 0 20px rgba(251, 191, 36, 0.5)"
            }}
          >
            Add New Address
          </h4>
          {!selectedChain ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHAIN_OPTIONS.map((chain) => {
                const hasAddress = addresses.some(a => a.chain_id === chain.id)
                return (
                  <button
                    key={chain.id}
                    onClick={() => setSelectedChain(chain.id)}
                    disabled={hasAddress}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                      hasAddress
                        ? "border-border/50 bg-secondary/30 text-muted-foreground cursor-not-allowed opacity-50"
                        : "border-border hover:border-primary bg-card hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={chain.icon} alt={chain.name} className="w-4 h-4" onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/deposit/usdt_bep20.svg"
                      }} />
                      <span className="truncate">{chain.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {getChainInfo(selectedChain)?.displayName}
                </span>
                <button
                  onClick={() => {
                    setSelectedChain(null)
                    setNewAddress("")
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter wallet address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-input/50 border border-border text-xs font-mono focus:outline-none focus:border-primary"
                />
                <Button
                  onClick={() => handleSave(selectedChain, newAddress)}
                  size="sm"
                  className="px-3"
                >
                  <Save className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Accent Line */}
        <div className="mt-3 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent rounded-full"></div>
        </div>
      </div>

      {/* Saved Addresses */}
      {addresses.length > 0 ? (
        <div className="space-y-2">
          {addresses.map((addr) => {
            const chain = getChainInfo(addr.chain_id)
            const isEditing = editingId === addr.id
            
            return (
              <div 
                key={addr.id} 
                className="group relative rounded-2xl p-3 overflow-hidden transition-all duration-300"
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
                
                <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center border-2 border-yellow-400/50 flex-shrink-0"
                    style={{
                      boxShadow: "0 0 20px rgba(251, 191, 36, 0.3)"
                    }}
                  >
                    <img
                      src={chain?.icon || "/deposit/usdt_bep20.svg"}
                      alt={chain?.name || addr.chain_name}
                      className="w-6 h-6"
                      style={{ imageRendering: "crisp-edges" }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/deposit/usdt_bep20.svg"
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-yellow-300">{chain?.displayName || addr.chain_name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(addr.address, addr.id)}
                          className="p-1 rounded hover:bg-secondary"
                          title="Copy address"
                        >
                          {copiedId === addr.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                        {!isEditing && (
                          <>
                            <button
                              onClick={() => handleEdit(addr.id, addr.address)}
                              className="p-1 rounded hover:bg-secondary"
                              title="Edit address"
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDelete(addr.id)}
                              className="p-1 rounded hover:bg-destructive/10"
                              title="Delete address"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={editingAddress}
                          onChange={(e) => setEditingAddress(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-input/50 border border-border text-xs font-mono focus:outline-none focus:border-primary"
                        />
                        <Button
                          onClick={() => handleUpdate(addr.id, addr.chain_id)}
                          size="sm"
                          className="px-2 h-7"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingId(null)
                            setEditingAddress("")
                          }}
                          variant="outline"
                          size="sm"
                          className="px-2 h-7"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="font-mono text-xs text-yellow-200/60 break-all bg-black/30 rounded px-2 py-1 border border-yellow-400/20">
                        {addr.address}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Bottom Accent Line */}
                <div className="mt-2 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent rounded-full"></div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div 
          className="relative rounded-2xl p-6 overflow-hidden"
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
          
          <div className="relative z-10 text-center">
            <p className="text-sm text-yellow-200/60">No wallet addresses saved yet</p>
            <p className="text-xs text-yellow-200/40 mt-1">Add your wallet addresses above to use them for deposits</p>
          </div>
        </div>
      )}
    </div>
  )
}

