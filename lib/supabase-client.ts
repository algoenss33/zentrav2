import { supabase } from './supabase'
import type { Database } from './supabase'

// User operations
export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  // Handle "not found" error gracefully (PGRST116 = no rows returned)
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createUser(email: string, passwordHash?: string, referrerCode?: string, username?: string) {
  const referralCode = `${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash || null,
      username: username || null,
      usdt_balance: 0,
      bxt_balance: 0,
      referral_code: referralCode,
    })
    .select()
    .single()

  if (error) throw error
  
  // Create initial mining session
  await supabase.from('mining_sessions').insert({
    user_id: data.id,
    apy_tier_id: 0,
    mining_balance: 0,
    total_mined: 0,
    last_claim_time: new Date().toISOString(),
    is_active: true,
  })

  // Handle referral if referrer code is provided
  if (referrerCode) {
    try {
      const referrer = await getUserByReferralCode(referrerCode)
      if (referrer) {
        // Create referral record
        await createReferral(referrer.id, email, 0)
      }
    } catch (error) {
      // If referral code is invalid, just continue without creating referral
      console.warn("Invalid referral code:", referrerCode)
    }
  }

  return data
}

export async function updateUserBalance(userId: string, usdtBalance?: number, bxtBalance?: number) {
  const updates: any = {}
  if (usdtBalance !== undefined) updates.usdt_balance = usdtBalance
  if (bxtBalance !== undefined) updates.bxt_balance = bxtBalance

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Transaction operations
export async function createTransaction(transaction: Database['public']['Tables']['transactions']['Insert']) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTransactions(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Mining session operations
export async function getMiningSession(userId: string) {
  const { data, error } = await supabase
    .from('mining_sessions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createMiningSession(userId: string, apyTierId = 0) {
  const { data, error } = await supabase
    .from('mining_sessions')
    .insert({
      user_id: userId,
      apy_tier_id: apyTierId,
      mining_balance: 0,
      total_mined: 0,
      last_claim_time: new Date().toISOString(),
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMiningSession(
  userId: string,
  updates: Partial<Database['public']['Tables']['mining_sessions']['Update']>
) {
  const { data, error } = await supabase
    .from('mining_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Package purchase operations
export async function getPackagePurchases(userId: string) {
  const { data, error } = await supabase
    .from('package_purchases')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

export async function createPackagePurchase(userId: string, tierId: number, price: number) {
  // Check if purchase already exists (for contract renewal)
  const existingPurchase = await supabase
    .from('package_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('tier_id', tierId)
    .single()

  if (existingPurchase.data) {
    // Update existing purchase (contract renewal)
    const { data, error } = await supabase
      .from('package_purchases')
      .update({
        price,
        purchased_at: new Date().toISOString(), // Update purchase time for renewal
      })
      .eq('user_id', userId)
      .eq('tier_id', tierId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new purchase
    const { data, error } = await supabase
      .from('package_purchases')
      .insert({
        user_id: userId,
        tier_id: tierId,
        price,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function hasPackagePurchase(userId: string, tierId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('package_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('tier_id', tierId)
    .single()

  return !error && data !== null
}

// Referral operations
export async function getReferrals(referrerId: string) {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', referrerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createReferral(referrerId: string, referredEmail: string, bonusEarned = 0) {
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_email: referredEmail,
      status: 'active',
      bonus_earned: bonusEarned,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserByReferralCode(referralCode: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('referral_code', referralCode)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Admin operations
export async function getPendingTransactions() {
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .in('status', ['pending'])
    .in('type', ['deposit', 'withdraw'])
    .order('created_at', { ascending: false })

  if (txError) throw txError
  if (!transactions || transactions.length === 0) return []

  // Fetch user data for each transaction
  const userIds = [...new Set(transactions.map(tx => tx.user_id))]
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, usdt_balance, bxt_balance')
    .in('id', userIds)

  if (usersError) throw usersError

  // Fetch wallet addresses for users
  const { data: walletAddresses, error: addressesError } = await supabase
    .from('user_wallet_addresses')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true)

  if (addressesError) console.error("Failed to load wallet addresses:", addressesError)

  // Combine transactions with user data and wallet addresses
  const transactionsWithUsers = transactions.map(tx => {
    const user = users?.find(u => u.id === tx.user_id)
    const userAddresses = walletAddresses?.filter(addr => addr.user_id === tx.user_id) || []
    
    // Find matching address based on network
    const matchingAddress = userAddresses.find(addr => 
      addr.network === tx.network || 
      (tx.network === 'TRC20' && addr.chain_id.includes('trc20')) ||
      (tx.network === 'BEP20' && addr.chain_id.includes('bep20'))
    )

    return {
      ...tx,
      users: user,
      user_wallet_address: matchingAddress
    }
  })

  return transactionsWithUsers
}

// Admin statistics
export async function getAdminStats() {
  try {
    // Get total users (excluding admin)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, is_admin')
    
    if (usersError) throw usersError
    const totalUsers = (allUsers || []).filter(u => !u.is_admin).length

    // Get active miners (users with apy_tier_id > 0)
    const { data: miningSessions, error: miningError } = await supabase
      .from('mining_sessions')
      .select('user_id, apy_tier_id, total_mined, is_active')
    
    if (miningError) throw miningError
    const activeMiners = (miningSessions || []).filter(
      session => session.apy_tier_id > 0 && session.is_active !== false
    ).length

    // Calculate total mined
    const totalMined = (miningSessions || []).reduce(
      (sum, session) => sum + Number(session.total_mined || 0),
      0
    )

    // Get total exchanged (sum of completed exchange transactions)
    const { data: exchangeTransactions, error: exchangeError } = await supabase
      .from('transactions')
      .select('amount_received')
      .eq('type', 'exchange')
      .eq('status', 'completed')
    
    if (exchangeError) throw exchangeError
    const totalExchanged = (exchangeTransactions || []).reduce(
      (sum, tx) => sum + Number(tx.amount_received || 0),
      0
    )

    // Get total referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('id')
    
    if (referralsError) throw referralsError
    const totalReferrals = referrals?.length || 0

    // Calculate platform revenue (sum of withdrawal transactions as fee estimation)
    const { data: withdrawTransactions, error: withdrawError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'withdraw')
      .eq('status', 'completed')
    
    if (withdrawError) throw withdrawError
    // Platform fee estimation (2% fee)
    const platformFee = (withdrawTransactions || []).reduce(
      (sum, tx) => sum + Number(tx.amount || 0) * 0.02,
      0
    )

    return {
      totalUsers,
      activeMiners,
      totalMined,
      totalExchanged,
      totalReferrals,
      platformFee,
    }
  } catch (error) {
    console.error("Failed to get admin stats:", error)
    throw error
  }
}

export async function updateTransactionStatus(transactionId: string, status: 'completed' | 'failed') {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', transactionId)
    .select('*')
    .single()

  if (error) throw error
  
  // Fetch user data
  if (data) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, usdt_balance, bxt_balance')
      .eq('id', data.user_id)
      .single()
    
    return { ...data, users: user }
  }
  
  return data
}

export async function approveDeposit(transactionId: string, userId: string, amount: number, currency: 'USDT' | 'BXT') {
  // Get current user balance first
  const user = await getUserById(userId)
  
  // Calculate new balance
  const updates: any = {}
  if (currency === 'USDT') {
    const currentBalance = Number(user.usdt_balance || 0)
    updates.usdt_balance = currentBalance + Number(amount)
  } else {
    const currentBalance = Number(user.bxt_balance || 0)
    updates.bxt_balance = currentBalance + Number(amount)
  }
  
  // Update user balance
  await updateUserBalance(userId, updates.usdt_balance, updates.bxt_balance)
  
  // Update transaction status to completed
  const transaction = await updateTransactionStatus(transactionId, 'completed')
  
  return transaction
}

export async function approveWithdraw(transactionId: string, userId: string, amount: number, currency: 'USDT' | 'BXT') {
  // Get current user balance first
  const user = await getUserById(userId)
  
  // Check if user has sufficient balance
  const updates: any = {}
  if (currency === 'USDT') {
    const currentBalance = Number(user.usdt_balance || 0)
    const newBalance = currentBalance - Number(amount)
    if (newBalance < 0) {
      await updateTransactionStatus(transactionId, 'failed')
      throw new Error('Insufficient balance')
    }
    updates.usdt_balance = newBalance
  } else {
    const currentBalance = Number(user.bxt_balance || 0)
    const newBalance = currentBalance - Number(amount)
    if (newBalance < 0) {
      await updateTransactionStatus(transactionId, 'failed')
      throw new Error('Insufficient balance')
    }
    updates.bxt_balance = newBalance
  }
  
  // Deduct balance
  await updateUserBalance(userId, updates.usdt_balance, updates.bxt_balance)
  
  // Update transaction status to completed
  const transaction = await updateTransactionStatus(transactionId, 'completed')
  
  return transaction
}

export async function rejectTransaction(transactionId: string) {
  return await updateTransactionStatus(transactionId, 'failed')
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllTransactions(limit = 100) {
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (txError) throw txError
  if (!transactions || transactions.length === 0) return []

  // Fetch user data for each transaction
  const userIds = [...new Set(transactions.map(tx => tx.user_id))]
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, username, usdt_balance, bxt_balance')
    .in('id', userIds)

  if (usersError) throw usersError

  // Fetch wallet addresses for users
  const { data: walletAddresses, error: addressesError } = await supabase
    .from('user_wallet_addresses')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true)

  if (addressesError) console.error("Failed to load wallet addresses:", addressesError)

  // Combine transactions with user data and wallet addresses
  const transactionsWithUsers = transactions.map(tx => {
    const user = users?.find(u => u.id === tx.user_id)
    const userAddresses = walletAddresses?.filter(addr => addr.user_id === tx.user_id) || []
    
    // Find matching address based on network
    const matchingAddress = userAddresses.find(addr => 
      addr.network === tx.network || 
      (tx.network === 'TRC20' && addr.chain_id.includes('trc20')) ||
      (tx.network === 'BEP20' && addr.chain_id.includes('bep20'))
    )

    return {
      ...tx,
      users: user,
      user_wallet_address: matchingAddress
    }
  })

  return transactionsWithUsers
}

// Platform Settings operations
export async function getPlatformSetting(key: string): Promise<string | null> {
  try {
    // Try to get from settings table if it exists
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist, return default value
      console.warn('Settings table not found, using defaults')
      return null
    }
    
    return data?.value || null
  } catch (error) {
    console.warn('Failed to get platform setting:', error)
    return null
  }
}

export async function setPlatformSetting(key: string, value: string): Promise<void> {
  try {
    // Try to upsert setting
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      // If table doesn't exist, we'll need to create it
      throw error
    }
  } catch (error) {
    console.error('Failed to set platform setting:', error)
    throw error
  }
}

export async function getMinWithdraw(): Promise<number> {
  const value = await getPlatformSetting('min_withdraw')
  return value ? parseFloat(value) : 1 // Default to 1 USDT
}

export async function setMinWithdraw(amount: number): Promise<void> {
  await setPlatformSetting('min_withdraw', amount.toString())
}

// Get user wallet address by chain_id or network
export async function getUserWalletAddress(userId: string, chainId?: string, network?: string): Promise<string | null> {
  try {
    // Try to find by chain_id first (more specific)
    if (chainId) {
      const { data, error } = await supabase
        .from('user_wallet_addresses')
        .select('address')
        .eq('user_id', userId)
        .eq('chain_id', chainId)
        .eq('is_active', true)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Failed to get wallet address by chain_id:', error)
      } else if (data?.address) {
        return data.address
      }
    }
    
    // If not found by chain_id, try by network
    if (network) {
      const { data, error } = await supabase
        .from('user_wallet_addresses')
        .select('address')
        .eq('user_id', userId)
        .eq('network', network)
        .eq('is_active', true)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Failed to get wallet address by network:', error)
      } else if (data?.address) {
        return data.address
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to get wallet address:', error)
    return null
  }
}

// Get all user wallet addresses
export async function getUserWalletAddresses(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('user_wallet_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get wallet addresses:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Failed to get wallet addresses:', error)
    return []
  }
}


