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

/** Busca a conta do utilizador — usa .limit(1) para tolerar múltiplas contas (ex: real+demo) */
async function getAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AccountRow | null> {
  const { data, error } = await sb
    .from("accounts")
    .select("id, balance")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(
      "[getAccount] erro ao buscar conta:",
      error.message,
      "| code:",
      error.code,
    );
  }
  return (data as AccountRow | null) ?? null;
}

/**
 * Busca a conta do utilizador ou cria uma nova se não existir.
 * Usa INSERT com tratamento de erro 23505 (unique violation) para funcionar
 * com qualquer schema (UNIQUE user_id ou UNIQUE(user_id, mode)).
 */
async function getOrCreateAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail = "",
): Promise<AccountRow | null> {
  // 1. Tentar buscar conta existente
  const existing = await getAccount(sb, userId);
  if (existing) return existing;

  // 2. Garantir que o perfil existe (FK: accounts.user_id → profiles.id)
  await sb
    .from("profiles")
    .upsert(
      { id: userId, email: userEmail, name: "" },
      { onConflict: "id", ignoreDuplicates: true },
    );

  // 3. Tentar criar conta — se já existir (23505), simplesmente re-ler
  const { error: insertErr } = await sb
    .from("accounts")
    .insert({
      user_id: userId,
      balance: 1_000_000,
      leverage: 200,
      currency: "USD",
    });

  if (insertErr && insertErr.code !== "23505") {
    // Erro inesperado — tentar com mode explícito (schema com UNIQUE(user_id, mode))
    await sb.from("accounts").insert({
      user_id: userId,
      mode: "real",
      balance: 1_000_000,
      leverage: 200,
      currency: "USD",
    });
  }

  // Re-ler independentemente do resultado do insert
  return await getAccount(sb, userId);
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
    let dbSaved = false;
    let dbError: string | null = null;

    if (token) {
      try {
        const sb = createServerClient(token);
        const {
          data: { user },
          error: authErr,
        } = await sb.auth.getUser(token);

        if (authErr) {
          dbError = `auth.getUser failed: ${authErr.message}`;
          console.error(
            "[POST /api/positions/open] auth error:",
            authErr.message,
          );
        } else if (user) {
          const account = await getOrCreateAccount(
            sb,
            user.id,
            user.email ?? "",
          );

          if (!account) {
            dbError = "account not found or could not be created";
            console.error(
              "[POST /api/positions/open] no account for user:",
              user.id,
            );
          } else {
            const { error: upsertErr } = await sb
              .from("positions")
              .upsert(
                { ...posData, user_id: user.id },
                { onConflict: "id", ignoreDuplicates: false },
              );

            if (upsertErr) {
              dbError = upsertErr.message;
              console.error(
                "[POST /api/positions/open] upsert error:",
                upsertErr.message,
              );
            } else {
              dbSaved = true;
            }
          }
        }
      } catch (e) {
        dbError = e instanceof Error ? e.message : String(e);
        console.error("[POST /api/positions/open] unexpected error:", dbError);
      }
    }

    return NextResponse.json({
      success: true,
      dbSaved,
      dbError,
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
        if (authErr) {
          console.error(
            "[DELETE /api/positions/open] auth error:",
            authErr.message,
          );
        } else if (user) {
          const { error: closeErr } = await sb
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

          if (closeErr) {
            console.error(
              "[DELETE /api/positions/open] update error:",
              closeErr.message,
            );
          }

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
      } catch (e) {
        console.error("[DELETE /api/positions/open] unexpected error:", e);
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
