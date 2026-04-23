/**
 * PATCH /api/positions/close/[positionId]
 *
 * Fecha uma posição aberta: atualiza status → "closed", close_price, pnl, closed_at.
 * Após o fecho, atualiza também o saldo da conta com o PnL realizado.
 *
 * Body JSON:
 *   closePrice  number   — preço de fecho
 *   pnl         number   — lucro/prejuízo realizado
 *   closeReason string?  — "manual" | "take_profit" | "stop_loss" | "margin_call" (default: "manual")
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ positionId: string }> },
) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 },
    );
  }

  const { positionId } = await params;

  if (!positionId) {
    return NextResponse.json(
      { success: false, error: "positionId obrigatório" },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const closePrice: number | null = body.closePrice ?? null;
    const pnl: number = typeof body.pnl === "number" ? body.pnl : 0;
    const closeReason: string = body.closeReason ?? "manual";

    const sb = createServerClient(token);
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 },
      );
    }

    const closedAt = new Date().toISOString();

    // ── 1. Fechar a posição ──────────────────────────────────────────────────
    const { error: updateErr } = await sb
      .from("positions")
      .update({
        status: "closed",
        close_price: closePrice,
        pnl,
        closed_at: closedAt,
        close_reason: closeReason,
      })
      .eq("id", positionId)
      .eq("user_id", user.id)
      .eq("status", "open"); // só fecha posições que ainda estejam abertas

    if (updateErr) {
      console.error(
        "[PATCH /api/positions/close] update error:",
        updateErr.message,
      );
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 400 },
      );
    }

    // ── 2. Atualizar saldo da conta com o PnL realizado ──────────────────────
    if (pnl !== 0) {
      const { data: account } = await sb
        .from("accounts")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (account) {
        await sb
          .from("accounts")
          .update({ balance: Number(account.balance) + pnl })
          .eq("id", account.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        positionId,
        closePrice,
        pnl,
        closedAt,
        closeReason,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/positions/close] unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao fechar posição" },
      { status: 500 },
    );
  }
}
