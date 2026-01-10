import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Fallback values untuk backward compatibility jika env vars tidak terkonfigurasi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqhbfpeonoeamforfeyn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PccM74U9qHlfSmMwTnLWmA_aDb4pqrK'

// Validasi environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase credentials missing! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Log di development untuk debugging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Supabase client initialized:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
  })
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
})