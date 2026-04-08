/**
 * lib/supabase.ts
 *
 * Supabase client setup.
 *
 * ─── Setup (5 minutos) ────────────────────────────────────────────────────────
 *  1. Criar conta gratuita em https://supabase.com
 *  2. Criar novo projeto
 *  3. Ir a Settings → API → copiar:
 *       - Project URL  →  NEXT_PUBLIC_SUPABASE_URL
 *       - anon/public  →  NEXT_PUBLIC_SUPABASE_ANON_KEY
 *       - service_role →  SUPABASE_SERVICE_ROLE_KEY  (secret, só no servidor)
 *  4. Criar ficheiro .env.local na raiz com:
 *       NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *       NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *       SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *  5. Correr o SQL em lib/db-schema.sql no Supabase SQL Editor
 *  6. Instalar: npm install @supabase/supabase-js
 *  7. Descomentar o import abaixo e apagar o stub
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://placeholder.supabase.co"
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

// Client-side Supabase client (anon key, respeita Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnon)

// ─── Database Types (mirrors db-schema.sql) ───────────────────────────────────

export type DbUserStatus = "active" | "suspended" | "pending"
export type DbAccountMode = "demo" | "real"
export type DbKycStatus = "unverified" | "pending" | "verified"

export interface DbProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  country: string
  city: string
  address: string
  postal_code: string
  nationality: string
  kyc_status: DbKycStatus
  profile_completion: number
  created_at: string
  updated_at: string
}

export interface DbAccount {
  id: string
  user_id: string
  mode: DbAccountMode
  balance: number
  leverage: number
  currency: string
  status: DbUserStatus
  created_at: string
}

export interface DbAdminOverride {
  id: string
  user_id: string
  balance_override: number | null
  margin_level_override: number | null
  equity_override: number | null
  note: string
  updated_by: string
  updated_at: string
}

export interface DbPosition {
  id: string
  user_id: string
  account_id: string
  symbol: string
  type: "buy" | "sell"
  lots: number
  amount: number
  leverage: number
  open_price: number
  close_price: number | null
  spread: number
  stop_loss: number | null
  take_profit: number | null
  status: "open" | "pending" | "closed"
  pnl: number | null
  opened_at: string
  closed_at: string | null
  close_reason: string | null
}

export interface DbTransaction {
  id: string
  user_id: string
  type: "deposit" | "withdrawal" | "adjustment"
  amount: number
  method: string
  status: "pending" | "approved" | "rejected"
  note: string
  created_at: string
}
