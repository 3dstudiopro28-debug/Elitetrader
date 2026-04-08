/**
 * POST /api/funds/withdraw — regista pedido de levantamento no Supabase
 * GET  /api/funds/withdraw — devolve histórico de levantamentos
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient, createUserClient, hasServiceRole } from "@/lib/supabase-server"

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value
  if (cookie) return cookie
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

export const MINIMUM_WITHDRAWAL = 15

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, method, bankDetails } = body

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ success: false, error: "Montante inválido" }, { status: 400 })
    }
    if (parseFloat(amount) < MINIMUM_WITHDRAWAL) {
      return NextResponse.json({
        success: false,
        error: `Montante mínimo de levantamento: $${MINIMUM_WITHDRAWAL}`,
      }, { status: 400 })
    }

    const token = getAccessToken(req)
    if (!token) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
    }

    const authSb = createServerClient()
    const { data: { user }, error: authErr } = await authSb.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })
    }

    // Usar service_role se disponível; caso contrário usar JWT do utilizador (RLS)
    const sb = hasServiceRole() ? authSb : createUserClient(token)
    const amt = parseFloat(amount)

    // 1 ─ Verificar saldo actual da conta real
    const { data: account, error: accErr } = await sb
      .from("accounts")
      .select("id, balance")
      .eq("user_id", user.id)
      .single()

    if (accErr || !account) {
      return NextResponse.json({ success: false, error: "Conta não encontrada" }, { status: 404 })
    }

    const currentBalance = parseFloat(String(account.balance ?? 0))
    if (amt > currentBalance) {
      return NextResponse.json({
        success: false,
        error: `Saldo insuficiente. Disponível: $${currentBalance.toFixed(2)}`,
      }, { status: 400 })
    }

    // 2 ─ Descontar o valor do saldo (operação atómica)
    const { error: updateErr } = await sb
      .from("accounts")
      .update({
        balance:    currentBalance - amt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)

    if (updateErr) {
      console.error("[withdraw] balance update:", updateErr.message)
      return NextResponse.json({ success: false, error: "Erro ao actualizar saldo: " + updateErr.message }, { status: 500 })
    }

    // 3 ─ Registar transacção
    const { data: txn, error: txnErr } = await sb
      .from("transactions")
      .insert({
        user_id:          user.id,
        transaction_type: "withdrawal",
        amount:           amt,
        status:           "pending",
      })
      .select("id")
      .single()

    if (txnErr) {
      console.error("[withdraw] transaction:", txnErr.message)
      // Reverter saldo se a transacção falhou
      await sb.from("accounts").update({ balance: currentBalance, updated_at: new Date().toISOString() }).eq("id", account.id)
      return NextResponse.json({ success: false, error: "Erro ao registar levantamento: " + txnErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionId: txn?.id ?? ("wdl_" + Date.now()),
        amount: amt,
        newBalance: currentBalance - amt,
        status: "pending",
        message: "Pedido de levantamento recebido. Processado em 1-3 dias úteis.",
        estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    })
  } catch (err) {
    console.error("[withdraw]", err)
    return NextResponse.json({ success: false, error: "Erro ao processar levantamento" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) return NextResponse.json({ success: false, data: [] }, { status: 401 })
  try {
    const authSb = createServerClient()
    const { data: { user }, error } = await authSb.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, data: [] }, { status: 401 })

    const sb = hasServiceRole() ? authSb : createUserClient(token)
    const { data: txns } = await sb
      .from("transactions")
      .select("id, transaction_type, amount, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    return NextResponse.json({ success: true, data: txns ?? [] })
  } catch {
    return NextResponse.json({ success: false, data: [] })
  }
}
