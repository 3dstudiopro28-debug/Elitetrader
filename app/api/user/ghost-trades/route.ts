/**
 * GET /api/user/ghost-trades
 *
 * O cliente faz polling neste endpoint (a cada 5s, igual ao /api/user/stats).
 * Se o admin tiver feito um ajuste de saldo, retorna as operações fantasma
 * geradas e limpa-as do store (consume-once).
 *
 * Autenticação: cookie sb-access-token ou Authorization: Bearer <token>
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { ghostPendingStore, type GhostPayload } from "@/lib/ghost-pending-store"

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
    return NextResponse.json({ trades: [] })
  }

  try {
    const sb = createServerClient()
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ trades: [] })
    }

    const payload = ghostPendingStore.consume(user.id)
    if (payload) {
      console.log(`[ghost-trades] delivering mode=${payload.mode} pnls=${JSON.stringify(payload.pnls)} to user ${user.id}`)
    }
    return NextResponse.json({ payload: payload ?? null })
  } catch {
    return NextResponse.json({ trades: [] })
  }
}
