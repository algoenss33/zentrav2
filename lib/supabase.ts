import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pftxyaxvdfgeorixttep.supabase.co'
// Anon/Public key - safe to use in client-side code
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdHh5YXh2ZGZnZW9yaXh0dGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjEzNDgsImV4cCI6MjA4NTA5NzM0OH0.SZhiMkArPBkSlbHR-Qq4n1vSPziFrKUGX5h37_9Yo5w'

// Service role key - ONLY for server-side operations (bypasses RLS)
// DO NOT expose this in client-side code!
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdHh5YXh2ZGZnZW9yaXh0dGVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUyMTM0OCwiZXhwIjoyMDg1MDk3MzQ4fQ.0fE3HV6xL-zJGDSRTcoJAfLN_yywpdZH8FfzHZWta7E'

// Client for client-side operations (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service client for server-side operations (uses service role, bypasses RLS)
// Only use this in API routes or server components if needed
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          username: string | null
          usdt_balance: number
          bxt_balance: number
          referral_code: string
          is_admin: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          username?: string | null
          usdt_balance?: number
          bxt_balance?: number
          referral_code?: string
          is_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          username?: string | null
          usdt_balance?: number
          bxt_balance?: number
          referral_code?: string
          is_admin?: boolean | null
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'deposit' | 'withdraw' | 'exchange' | 'claim' | 'referral'
          amount: number
          amount_received: number | null
          currency: 'GOLD' | 'USDT'
          status: 'pending' | 'completed' | 'failed'
          description: string
          network: 'TRC20' | 'BEP20' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'deposit' | 'withdraw' | 'exchange' | 'claim' | 'referral'
          amount: number
          amount_received?: number | null
          currency: 'GOLD' | 'USDT'
          status?: 'pending' | 'completed' | 'failed'
          description: string
          network?: 'TRC20' | 'BEP20' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'deposit' | 'withdraw' | 'exchange' | 'claim' | 'referral'
          amount?: number
          amount_received?: number | null
          currency?: 'GOLD' | 'USDT'
          status?: 'pending' | 'completed' | 'failed'
          description?: string
          network?: 'TRC20' | 'BEP20' | null
        }
      }
      mining_sessions: {
        Row: {
          id: string
          user_id: string
          apy_tier_id: number
          mining_balance: number
          total_mined: number
          last_claim_time: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          apy_tier_id?: number
          mining_balance?: number
          total_mined?: number
          last_claim_time?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          apy_tier_id?: number
          mining_balance?: number
          total_mined?: number
          last_claim_time?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      package_purchases: {
        Row: {
          id: string
          user_id: string
          tier_id: number
          price: number
          purchased_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: number
          price: number
          purchased_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: number
          price?: number
          purchased_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_email: string
          status: 'active' | 'inactive'
          bonus_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_email: string
          status?: 'active' | 'inactive'
          bonus_earned?: number
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_email?: string
          status?: 'active' | 'inactive'
          bonus_earned?: number
        }
      }
    }
  }
}

