import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(req: NextRequest) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const sb = createServerClient()

  // Verificar quais tabelas existem
  const tables = ["profiles", "accounts", "admin_overrides", "positions", "transactions"]
  const tableStatus: Record<string, boolean | string> = {}

  for (const t of tables) {
    const { error } = await sb.from(t).select("id").limit(1)
    tableStatus[t] = error ? error.message : true
  }

  // Verificar colunas específicas críticas (probe individual)
  const colProbes: Record<string, string> = {}

  // profiles
  const pCols = ["first_name", "last_name", "name", "kyc_status", "status", "mode", "phone", "country"]
  for (const col of pCols) {
    const { error } = await sb.from("profiles").select(col).limit(1)
    colProbes[`profiles.${col}`] = error ? "MISSING: " + error.message : "OK"
  }
  // accounts
  const aCols = ["mode", "balance", "leverage", "currency", "status"]
  for (const col of aCols) {
    const { error } = await sb.from("accounts").select(col).limit(1)
    colProbes[`accounts.${col}`] = error ? "MISSING: " + error.message : "OK"
  }
  // admin_overrides
  const oCols = ["user_id", "balance_override", "margin_level_override", "equity_override", "force_close_positions", "balance_adjustment", "active_mode", "note", "updated_by", "updated_at"]
  for (const col of oCols) {
    const { error } = await sb.from("admin_overrides").select(col).limit(1)
    colProbes[`admin_overrides.${col}`] = error ? "MISSING: " + error.message : "OK"
  }

  return NextResponse.json({ tables: tableStatus, columns: colProbes })
}
