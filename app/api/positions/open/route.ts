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
 * Usa upsert para ser seguro contra race conditions e chaves duplicadas.
 */
async function getOrCreateAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail = "",
): Promise<AccountRow | null> {
  // 1. Tentar buscar conta existente
  const existing = await getAccount(sb, userId);
  if (existing) {
    console.log(`[getOrCreateAccount] Conta encontrada para user ${userId}.`);
    return existing;
  }

  console.log(
    `[getOrCreateAccount] Conta não encontrada. A criar para user ${userId}...`,
  );

  // 2. Garantir que o perfil existe (FK: accounts.user_id → profiles.id)
  const { error: profileErr } = await sb
    .from("profiles")
    .upsert(
      { id: userId, email: userEmail, name: "" },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (profileErr) {
    console.error(
      "[getOrCreateAccount] profile upsert error:",
      profileErr.message,
      "| code:",
      profileErr.code,
    );
  }

  // 3. Upsert da conta — evita erro de chave duplicada (23505) em qualquer schema
  const { data, error: upsertErr } = await sb
    .from("accounts")
    .upsert(
      {
        user_id: userId,
        balance: 1_000_000,
        leverage: 200,
        currency: "USD",
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    )
    .select("id, balance")
    .maybeSingle();

  if (upsertErr) {
    console.error(
      "[getOrCreateAccount] accounts upsert error:",
      upsertErr.message,
      "| code:",
      upsertErr.code,
    );
    // Último recurso: re-ler (pode existir com constraint diferente)
    return await getAccount(sb, userId);
  }

  // Com ignoreDuplicates=true, se já existia não retorna dados — re-ler
  if (!data) {
    return await getAccount(sb, userId);
  }

  console.log(`[getOrCreateAccount] Nova conta criada para user ${userId}.`);
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
      mode: body.mode === "demo" ? "demo" : "real",
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
                { ...posData, user_id: user.id, account_id: account.id },
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
