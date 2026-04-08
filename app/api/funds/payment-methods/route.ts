/**
 * GET    /api/funds/payment-methods  — lista cartões guardados do utilizador
 * DELETE /api/funds/payment-methods  — remove cartão por { id }
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
  if (!token) return NextResponse.json({ success: false, data: [] }, { status: 401 })

  try {
    const sb = createServerClient()
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, data: [] }, { status: 401 })

    const { data: methods } = await sb
      .from("payment_methods")
      .select("id, type, card_holder, card_last4, card_brand, card_exp, country, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    return NextResponse.json({ success: true, data: methods ?? [] })
  } catch {
    return NextResponse.json({ success: false, data: [] })
  }
}

export async function DELETE(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "ID obrigatório" }, { status: 400 })

    const sb = createServerClient()
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

    // Garante que o utilizador só apaga os seus próprios cartões
    await sb.from("payment_methods").delete().eq("id", id).eq("user_id", user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao remover cartão" }, { status: 500 })
  }
}
