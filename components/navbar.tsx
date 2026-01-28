"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Wallet, Menu, X, Settings } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

interface NavbarProps {
  user: any
  onLogout: () => void
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="/minety.png" 
              alt="Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>

          {/* Desktop User Info */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="text-sm font-semibold text-foreground">${user?.usdt_balance?.toFixed(2) || 0}</span>
            </div>
            <span className="text-sm text-muted-foreground max-w-[200px] truncate">
              {user?.username || user?.email}
            </span>
            {user?.is_admin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30">
                  <Settings className="w-4 h-4" />
                  Admin Portal
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={onLogout} className="gap-2 bg-transparent hover:bg-secondary">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="text-sm font-semibold text-foreground">${user?.usdt_balance?.toFixed(2) || 0}</span>
            </div>
            <div className="text-sm text-muted-foreground">{user?.username || user?.email}</div>
            {user?.is_admin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="w-full gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30 justify-center">
                  <Settings className="w-4 h-4" />
                  Admin Portal
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="w-full gap-2 bg-transparent hover:bg-secondary justify-center"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
