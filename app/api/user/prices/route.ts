/**
 * GET /api/user/prices
 *
 * Retorna os overrides de preço activos definidos pelo admin.
 * Autenticação: cookie sb-access-token ou Authorization Bearer.
 * Actualmente apenas XAUUSD pode ter override.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { adminPriceStore } from "@/lib/admin-price-store"

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value
  if (cookie) return cookie
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) {
    return NextResponse.json({ prices: {} })
  }

  try {
    const sb = createServerClient(token)
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ prices: {} })
    }

    return NextResponse.json({ prices: adminPriceStore.getAll() })
  } catch {
    return NextResponse.json({ prices: {} })
  }
}
