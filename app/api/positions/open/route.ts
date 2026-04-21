/**
 * GET    /api/positions/open  — posições abertas do utilizador autenticado
 * POST   /api/positions/open  — abrir nova posição (persiste no Supabase)
 * DELETE /api/positions/open  — fechar posição (persiste PnL no Supabase)
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

export async function GET(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) return NextResponse.json({ success: true, data: [] });

  try {
    const sb = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ success: true, data: [] });

    // Filtrar por modo se fornecido na query string (?mode=demo|real)
    const mode = req.nextUrl.searchParams.get("mode");

    let query = sb
      .from("positions")
      .select("*, accounts!inner(mode)")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    if (mode === "demo" || mode === "real") {
      query = query.eq("accounts.mode", mode);
    }

    const { data: positions } = await query;

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
      id: body.id ?? "pos_" + Date.now(),
      symbol: body.symbol ?? "",
      asset_name: body.name ?? body.assetId ?? "",
      type: body.type ?? "buy",
      lots: body.lots ?? 1,
      amount: body.amount ?? 0,
      leverage: body.leverage ?? 200,
      open_price: body.openPrice ?? 0,
      stop_loss: body.stopLoss ?? null,
      take_profit: body.takeProfit ?? null,
      status: "open",
      opened_at: new Date().toISOString(),
    };

    // Persistir no Supabase se autenticado
    if (token) {
      try {
        const sb = createServerClient();
        const {
          data: { user },
          error: authErr,
        } = await sb.auth.getUser(token);
        if (!authErr && user) {
          const posMode = body.mode ?? "real";
          let { data: account } = await sb
            .from("accounts")
            .select("id")
            .eq("user_id", user.id)
            .eq("mode", posMode)
            .maybeSingle();

          // Se a conta não existe, criá-la automaticamente
          if (!account) {
            const { data: newAccount } = await sb
              .from("accounts")
              .insert({
                user_id: user.id,
                mode: posMode,
                balance: posMode === "demo" ? 100_000 : 0,
                leverage: 200,
                currency: "USD",
              })
              .select("id")
              .single();
            account = newAccount;
          }

          if (account) {
            await sb.from("positions").upsert(
              {
                ...posData,
                user_id: user.id,
                account_id: account.id,
              },
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
    const { positionId, closePrice, pnl, mode } = await req.json();

    // Fechar no Supabase se autenticado
    if (token && positionId) {
      try {
        const sb = createServerClient();
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
              close_reason: "manual",
            })
            .eq("id", positionId)
            .eq("user_id", user.id);

          // Reflectir PnL no saldo da conta
          if (typeof pnl === "number" && pnl !== 0) {
            const accountMode = mode ?? "real";
            const { data: account } = await sb
              .from("accounts")
              .select("id, balance")
              .eq("user_id", user.id)
              .eq("mode", accountMode)
              .maybeSingle();
            if (account) {
              await sb
                .from("accounts")
                .update({
                  balance: Number(account.balance) + pnl,
                })
                .eq("id", account.id);
            }
          }
        }
      } catch {
        /* localStorage é a fonte primária; silêncio se DB falhar */
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
