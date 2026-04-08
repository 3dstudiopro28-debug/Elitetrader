/**
 * lib/supabase-server.ts
 *
 * Cliente Supabase para uso EXCLUSIVO em API Routes (servidor).
 * Usa o service_role key que ignora Row Level Security.
 *
 * ⚠️  NUNCA importar este ficheiro em componentes client ("use client").
 *     O SUPABASE_SERVICE_ROLE_KEY não deve ser exposto ao browser.
 *
 * Para obter o service_role key:
 *   https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/settings/api
 *   → "service_role" secret → copiar para .env.local
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

const url         = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://placeholder.supabase.co"
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

/**
 * Cliente admin (service_role) — ignora RLS.
 * Se `accessToken` for fornecido e não houver service_role, usa o JWT
 * do utilizador para que as queries respeitem RLS correctamente.
 */
export function createServerClient(accessToken?: string): SupabaseClient {
  const key = serviceKey || anonKey
  const extraHeaders: Record<string, string> =
    !serviceKey && accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: extraHeaders },
  })
}

/**
 * Cliente com o JWT do utilizador nas headers.
 * Usa anon key + Authorization: Bearer <token>.
 * Permite operações sujeitas a RLS com a identidade do utilizador.
 * Usar quando service_role não estiver disponível.
 */
export function createUserClient(token: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/** True se o service role está configurado (admin tem acesso total) */
export function hasServiceRole(): boolean {
  return !!serviceKey
}
