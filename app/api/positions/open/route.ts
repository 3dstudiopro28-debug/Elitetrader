/**
 * GET    /api/positions/open  — posições abertas do utilizador autenticado
 * POST   /api/positions/open  — abrir nova posição (persiste no Supabase)
 * DELETE /api/positions/open  — fechar posição (retrocompatibilidade; preferir PATCH /api/positions/close/[id])
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

type AccountRow = { id: string; balance: number };

/** Busca a conta sem filtro de modo — o schema real de accounts não tem coluna mode */
async function getAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AccountRow | null> {
  const { data } = await sb
    .from("accounts")
    .select("id, balance")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AccountRow | null) ?? null;
}

/** Cria a conta se ainda não existir */
async function getOrCreateAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AccountRow | null> {
  const existing = await getAccount(sb, userId);
  if (existing) return existing;
  const { data } = await sb
    .from("accounts")
    .insert({ user_id: userId, balance: 1_000_000, leverage: 200, currency: "USD" })
    .select("id, balance")
    .single();
  return (data as AccountRow | null) ?? null;
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) return NextResponse.json({ success: true, data: [] });

  try {
    const sb = createServerClient(token);
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ success: true, data: [] });

    // Consulta directa por user_id — não depende da coluna mode em accounts
    const { data: positions } = await sb
      .from("positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    return NextResponse.json({ success: true, data: positions ?? [] });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  const token = getAccessToken(req);

  try {
    const body = await req.json();
    const posData = {
      id: body.id ?? crypto.randomUUID(),
      symbol: body.symbol ?? "",
      asset_name: body.name ?? body.assetId ?? "",
      type: body.type ?? "buy",
      lots: body.lots ?? 1,
      amount: body.amount ?? 0,
      leverage: body.leverage ?? 200,
      open_price: body.openPrice ?? 0,
      spread: body.spread ?? 0,
      stop_loss: body.stopLoss ?? null,
      take_profit: body.takeProfit ?? null,
      status: "open",
      opened_at: body.openedAt ?? new Date().toISOString(),
    };

    // Persistir no Supabase se autenticado
    if (token) {
      try {
        const sb = createServerClient(token);
        const {
          data: { user },
          error: authErr,
        } = await sb.auth.getUser(token);
        if (!authErr && user) {
          // Usa getOrCreateAccount sem filtro de modo
          const account = await getOrCreateAccount(sb, user.id);
          if (account) {
            await sb.from("positions").upsert(
              { ...posData, user_id: user.id, account_id: account.id },
              { onConflict: "id", ignoreDuplicates: false },
            );
          }
        }
      } catch {
        /* localStorage é a fonte primária; silêncio se DB falhar */
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...posData, openedAt: posData.opened_at },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao abrir posição" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const token = getAccessToken(req);

  try {
    const { positionId, closePrice, pnl, closeReason } = await req.json();

    // Fechar no Supabase se autenticado
    if (token && positionId) {
      try {
        const sb = createServerClient(token);
        const {
          data: { user },
          error: authErr,
        } = await sb.auth.getUser(token);
        if (!authErr && user) {
          await sb
            .from("positions")
            .update({
              status: "closed",
              close_price: closePrice ?? null,
              pnl: pnl ?? 0,
              closed_at: new Date().toISOString(),
              close_reason: closeReason ?? "manual",
            })
            .eq("id", positionId)
            .eq("user_id", user.id);

          // Reflectir PnL no saldo da conta (sem filtro de modo)
          if (typeof pnl === "number" && pnl !== 0) {
            const account = await getAccount(sb, user.id);
            if (account) {
              await sb
                .from("accounts")
                .update({ balance: Number(account.balance) + pnl })
                .eq("id", account.id);
            }
          }
        }
      } catch {
        /* silencioso */
      }
    }

    return NextResponse.json({
      success: true,
      data: { positionId, closePrice, pnl, closedAt: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao fechar posição" },
      { status: 500 },
    );
  }
}
