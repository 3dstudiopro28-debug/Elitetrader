/**
 * GET  /api/user/stats   — retorna saldo real + admin overrides do utilizador autenticado
 * POST /api/user/stats   — limpa o flag force_close_positions (chamado pelo cliente depois de fechar posições)
 *
 * Autenticação: cookie sb-access-token (httpOnly)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { adminOverrideStore } from "@/lib/admin-override-store"

function getAccessToken(req: NextRequest): string | null {
  // Cookie httpOnly definido no login
  const cookie = req.cookies.get("sb-access-token")?.value
  if (cookie) return cookie
  // Fallback: Authorization header (Bearer <token>)
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
  }

  try {
    const sb = createServerClient(token)

    // Identificar o utilizador pelo token
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })
    }

    const userId = user.id

    // Override em memória do admin (tem prioridade sobre o DB)
    const mem = adminOverrideStore.get(userId)

    // Buscar conta real e conta demo do DB (separadas)
    const { data: accounts } = await sb
      .from("accounts")
      .select("id, balance, leverage, currency, mode")
      .eq("user_id", userId)

    const accs = accounts as { id: string; balance: number; leverage: number; currency: string; mode: string }[] | null ?? []
    const realAccount = accs.find(a => a.mode === "real")
    const demoAccount = accs.find(a => a.mode === "demo")

    // Conta real: controlada pelo admin (override > DB > 0)
    const dbRealBalance = realAccount?.balance ?? 0
    const effectiveRealBalance = mem?.balance ?? dbRealBalance

    // Conta demo: SEMPRE $100.000 fixo — admin não interfere
    const demoBalance = demoAccount?.balance ?? 100_000
    const realBalance = effectiveRealBalance

    // Modo efectivo: admin define sempre "real" ou user escolhe localmente
    // O override do admin é sempre "real"; não forçamos o modo demo nunca via API
    const effectiveMode: "demo" | "real" = (mem?.mode as "demo" | "real") ?? "real"

    return NextResponse.json({
      success: true,
      data: {
        userId,
        email: user.email,
        demoBalance,
        realBalance,
        leverage:    realAccount?.leverage ?? demoAccount?.leverage ?? 200,
        currency:    realAccount?.currency ?? demoAccount?.currency ?? "USD",
        // Admin overrides — balanceOverride removido (saldo controlado via Financeiro)
        balanceOverride:      null,
        equityOverride:       mem?.equityOverride        ?? null,
        marginLevelOverride:  mem?.marginLevelOverride   ?? null,
        forceClosePositions:  mem?.forceClose            ?? false,
        activeMode:           effectiveMode,
      },
    })
  } catch (err) {
    console.error("[user/stats] GET error:", err)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

/**
 * POST /api/user/stats
 * Body: { action: "clear_force_close" }
 * Chamado pelo cliente depois de fechar automaticamente as posições.
 */
export async function POST(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (body.action !== "clear_force_close") {
      return NextResponse.json({ success: false, error: "Ação inválida" }, { status: 400 })
    }

    const sb = createServerClient()
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })
    }

    // Limpar forceClose no store em memória
    adminOverrideStore.clearForceClose(user.id)

    // Tentar também no DB (best-effort — falha silenciosa)
    const sb2 = createServerClient()
    await sb2
      .from("admin_overrides")
      .update({ force_close_positions: false, active_mode: null })
      .eq("user_id", user.id)
      .then(() => {/* ignorar erros */})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[user/stats] POST error:", err)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
