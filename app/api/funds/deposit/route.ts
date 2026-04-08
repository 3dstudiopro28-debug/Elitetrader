/**
 * POST /api/funds/deposit  — regista transação + guarda cartão (sem CVV) no Supabase
 * GET  /api/funds/deposit  — devolve histórico de transações do utilizador
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

function detectBrand(card: string): string {
  const n = card.replace(/\s/g, "")
  if (n.startsWith("4")) return "Visa"
  if (n.startsWith("5")) return "Mastercard"
  if (n.startsWith("3")) return "Amex"
  return "Cartão"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, method, cardNumber, cardExpiry, cardCvv: _cvv, cardHolder, country, saveCard } = body
    // ⚠ CVV é recebido mas NUNCA armazenado (conformidade PCI DSS)

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 10) {
      return NextResponse.json({ success: false, error: "Montante inválido. Mínimo $10." }, { status: 400 })
    }
    if (method === "card" && (!cardNumber || !cardExpiry || !cardHolder)) {
      return NextResponse.json({ success: false, error: "Detalhes do cartão incompletos" }, { status: 400 })
    }

    const token = getAccessToken(req)
    if (!token) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
    }

    const sb = createServerClient()
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })
    }

    const amt      = parseFloat(amount)
    const rawCard  = (cardNumber ?? "").replace(/\s/g, "")
    const last4    = rawCard.slice(-4)
    const brand    = rawCard ? detectBrand(rawCard) : ""
    const methodLabel = method === "card" ? `${brand} ****${last4}` : (method ?? "outro")

    // 1 ─ Registar transação
    const { data: txn, error: txnErr } = await sb
      .from("transactions")
      .insert({
        user_id:          user.id,
        transaction_type: "deposit",
        amount:           amt,
        status:           "pending",
      })
      .select("id")
      .single()

    if (txnErr) console.error("[deposit] transaction:", txnErr.message)

    // 2 ─ Guardar cartão (sem CVV — PCI DSS)
    if (method === "card" && saveCard && last4) {
      const { data: existingCard } = await sb
        .from("payment_methods")
        .select("id")
        .eq("user_id", user.id)
        .eq("card_last4", last4)
        .eq("card_exp", cardExpiry ?? "")
        .maybeSingle()

      if (!existingCard) {
        await sb.from("payment_methods").insert({
          user_id:     user.id,
          type:        "card",
          card_holder: cardHolder ?? "",
          card_last4:  last4,
          card_brand:  brand,
          card_exp:    cardExpiry ?? "",
          country:     country ?? "",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionId: txn?.id ?? ("txn_" + Date.now()),
        amount: amt,
        method: methodLabel,
        status: "pending",
        message: "Depósito em processamento. Será creditado em breve.",
      },
    })
  } catch (err) {
    console.error("[deposit]", err)
    return NextResponse.json({ success: false, error: "Erro ao processar depósito" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req)
  if (!token) return NextResponse.json({ success: false, data: [] }, { status: 401 })
  try {
    const sb = createServerClient()
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, data: [] }, { status: 401 })

    const { data: txns } = await sb
      .from("transactions")
      .select("id, transaction_type, amount, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    return NextResponse.json({ success: true, data: txns ?? [] })
  } catch {
    return NextResponse.json({ success: false, data: [] })
  }
}
