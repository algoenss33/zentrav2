"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import NodeNetworkBackground from "@/components/node-network-background"

export default function ReferralPage() {
  const params = useParams()
  const router = useRouter()
  const referralCode = params?.code as string

  useEffect(() => {
    if (referralCode) {
      // Store referral code in localStorage
      localStorage.setItem("referral_code", referralCode)
      
      // Redirect to home page
      router.push("/")
    } else {
      // If no code, just redirect to home
      router.push("/")
    }
  }, [referralCode, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-52 h-52 mx-auto rounded-full flex items-center justify-center">
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

