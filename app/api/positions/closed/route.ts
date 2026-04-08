/**
 * GET /api/positions/closed
 * Retorna todas as posições fechadas (status='closed') do utilizador autenticado.
 * Usado pela página de histórico para recuperar operações persistidas no Supabase.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value
  if (cookie) return cookie
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) return NextResponse.json({ success: true, data: [] })

  try {
    const sb = createServerClient()
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token)

    if (authErr || !user) return NextResponse.json({ success: true, data: [] })

    const { data: positions } = await sb
      .from("positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(500)

    return NextResponse.json({ success: true, data: positions ?? [] })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}
