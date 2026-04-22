/**
 * API Route: GET/POST /api/admin/margin
 *
 * Admin-only endpoint to override the displayed margin level for all or specific users.
 *
 * Security: Add admin authentication before exposing this in production!
 *
 * BD Integration:
 *   Table: admin_settings (key, value, updated_at, updated_by)
 *   OR per-user: user_display_overrides (user_id, margin_level, balance_add, ...)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

// Simple in-memory stub (replace with DB)
let marginOverride: number | null = null
let balanceAdd: number = 0

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth
  // TODO: Fetch from DB: SELECT value FROM admin_settings WHERE key='margin_level_override'
  return NextResponse.json({
    success: true,
    data: { marginOverride, balanceAdd },
  })
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth
  try {
    const body = await req.json()
    const { action, value } = body

    if (action === "set_margin") {
      const v = value === null ? null : parseFloat(value)
      marginOverride = (v !== null && !isNaN(v)) ? v : null
      // TODO: db.query("INSERT INTO admin_settings (key, value) VALUES ('margin_level_override',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [marginOverride])
    }

    if (action === "set_balance_add") {
      balanceAdd = parseFloat(value) || 0
      // TODO: db.query(...)
    }

    if (action === "reset") {
      marginOverride = null
      balanceAdd = 0
    }

    return NextResponse.json({ success: true, data: { marginOverride, balanceAdd } })
  } catch (err) {
    return NextResponse.json({ success: false, error: "Erro no admin" }, { status: 500 })
  }
}
