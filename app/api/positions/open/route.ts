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

function hasMissingColumn(
  err: unknown,
  column: "mode" | "status" | "asset",
): boolean {
  const msg =
    typeof err === "object" && err && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  return (
    code === "42703" &&
    new RegExp(`column .*${column}|${column} does not exist`, "i").test(msg)
  );
}

function getNullConstraintColumn(err: unknown): string | null {
  const msg =
    typeof err === "object" && err && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  const m = msg.match(/null value in column "([^"]+)"/i);
  return m?.[1] ?? null;
}

function applyDefaultForRequiredColumn(
  payload: Record<string, unknown>,
  col: string,
): boolean {
  switch (col) {
    case "asset":
      payload.asset = payload.asset ?? payload.symbol ?? payload.asset_name ?? "UNKNOWN";
      return true;
    case "quantity":
      payload.quantity = payload.quantity ?? payload.lots ?? 1;
      return true;
    case "position_type":
      payload.position_type = payload.position_type ?? payload.type ?? "buy";
      return true;
    case "entry_price":
      payload.entry_price = payload.entry_price ?? payload.open_price ?? 0;
      return true;
    case "price":
      payload.price = payload.price ?? payload.open_price ?? 0;
      return true;
    case "direction":
      payload.direction = payload.direction ?? payload.type ?? "buy";
      return true;
    case "volume":
      payload.volume = payload.volume ?? payload.quantity ?? payload.lots ?? 1;
      return true;
    case "margin":
      payload.margin = payload.margin ?? payload.amount ?? 0;
      return true;
    case "profit_loss":
      payload.profit_loss = payload.profit_loss ?? 0;
      return true;
    case "created_at":
      payload.created_at = payload.created_at ?? payload.opened_at ?? new Date().toISOString();
      return true;
    case "updated_at":
      payload.updated_at = new Date().toISOString();
      return true;
    default:
      return false;
  }
}

type AccountRow = { id: string; balance: number };

async function getAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  mode: "demo" | "real",
): Promise<AccountRow | null> {
  const withMode = await sb
    .from("accounts")
    .select("id, balance")
    .eq("user_id", userId)
    .eq("mode", mode)
    .maybeSingle();

  if (!withMode.error) {
    return (withMode.data as AccountRow | null) ?? null;
  }

  if (!hasMissingColumn(withMode.error, "mode")) {
    console.error(
      "[getAccount] erro ao buscar conta:",
      withMode.error.message,
      "| code:",
      withMode.error.code,
    );
    return null;
  }

  console.warn(
    "[getAccount] coluna mode ausente em accounts, a usar fallback sem filtro por modo.",
  );
  const fallback = await sb
    .from("accounts")
    .select("id, balance")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    console.error(
      "[getAccount] fallback sem mode falhou:",
      fallback.error.message,
      "| code:",
      fallback.error.code,
    );
    return null;
  }

  return (fallback.data as AccountRow | null) ?? null;
}

async function getOrCreateAccount(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  mode: "demo" | "real",
  userEmail = "",
): Promise<AccountRow | null> {
  const existing = await getAccount(sb, userId, mode);
  if (existing) {
    console.log(
      `[getOrCreateAccount] Conta ${mode} encontrada para user ${userId}.`,
    );
    return existing;
  }

  const { error: profileErr } = await sb.from("profiles").upsert(
    {
      id: userId,
      email: userEmail,
      first_name: "",
      last_name: "",
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    console.error(
      "[getOrCreateAccount] profile upsert error:",
      profileErr.message,
      "| code:",
      profileErr.code,
    );
  }

  const startingBalance = mode === "demo" ? 100_000 : 0;

  const accountPayload = {
    user_id: userId,
    mode,
    balance: startingBalance,
    leverage: 200,
    currency: "USD",
    status: "active",
  };

  let { data, error: upsertErr } = await sb
    .from("accounts")
    .upsert(accountPayload, { onConflict: "user_id,mode" })
    .select("id, balance")
    .maybeSingle();

  if (
    upsertErr &&
    (hasMissingColumn(upsertErr, "mode") ||
      hasMissingColumn(upsertErr, "status"))
  ) {
    console.warn(
      "[getOrCreateAccount] schema antigo em accounts (mode/status ausente), a usar fallback de insert sem colunas opcionais.",
    );
    const fallbackInsert = await sb
      .from("accounts")
      .insert({
        user_id: userId,
        balance: startingBalance,
        leverage: 200,
        currency: "USD",
      })
      .select("id, balance")
      .maybeSingle();

    data = fallbackInsert.data;
    upsertErr = fallbackInsert.error;
  }

  if (upsertErr) {
    console.error(
      "[getOrCreateAccount] accounts upsert error:",
      upsertErr.message,
      "| code:",
      upsertErr.code,
    );
    return await getAccount(sb, userId, mode);
  }

  if (!data) {
    return await getAccount(sb, userId, mode);
  }

  console.log(
    `[getOrCreateAccount] Nova conta ${mode} criada para user ${userId}.`,
  );
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

    const modeParam = req.nextUrl.searchParams.get("mode");
    const mode: "demo" | "real" | null =
      modeParam === "demo" || modeParam === "real" ? modeParam : null;

    let query = sb
      .from("positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    if (mode) {
      query = query.eq("mode", mode);
    }

    let { data: positions, error } = await query;

    if (error && mode && hasMissingColumn(error, "mode")) {
      const fallback = await sb
        .from("positions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false });

      positions = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("[GET /api/positions/open] error:", error.message);
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: positions ?? [] });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  const token = getAccessToken(req);

  try {
    const body = await req.json();
    const mode: "demo" | "real" = body.mode === "demo" ? "demo" : "real";
    const posData = {
      id: body.id ?? crypto.randomUUID(),
      asset: body.asset ?? body.symbol ?? body.assetId ?? "",
      symbol: body.symbol ?? "",
      asset_name: body.name ?? body.assetId ?? "",
      mode,
      type: body.type ?? "buy",
      lots: body.lots ?? 1,
      quantity: body.quantity ?? body.lots ?? 1,
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
            posData.mode,
            user.email ?? "",
          );

          if (!account) {
            dbError = "account not found or could not be created";
            console.error(
              "[POST /api/positions/open] no account for user:",
              user.id,
            );
          } else {
            const payloadWithMode: Record<string, unknown> = {
              ...posData,
              user_id: user.id,
              account_id: account.id,
            };

            let upsertResult: {
              error: { message?: string; code?: string } | null;
            } = { error: null };
            let payload = { ...payloadWithMode };

            for (let attempt = 0; attempt < 6; attempt++) {
              upsertResult = await sb.from("positions").upsert(payload, {
                onConflict: "id",
                ignoreDuplicates: false,
              });

              if (!upsertResult.error) break;

              if (hasMissingColumn(upsertResult.error, "mode") && "mode" in payload) {
                console.warn(
                  "[POST /api/positions/open] coluna mode ausente em positions, nova tentativa sem mode.",
                );
                const { mode: _dropMode, ...rest } = payload;
                payload = rest;
                continue;
              }

              if (hasMissingColumn(upsertResult.error, "asset") && "asset" in payload) {
                console.warn(
                  "[POST /api/positions/open] coluna asset ausente em positions, nova tentativa sem asset.",
                );
                const { asset: _dropAsset, ...rest } = payload;
                payload = rest;
                continue;
              }

              const nullCol = getNullConstraintColumn(upsertResult.error);
              if (nullCol && applyDefaultForRequiredColumn(payload, nullCol)) {
                console.warn(
                  `[POST /api/positions/open] coluna obrigatória '${nullCol}' estava nula, nova tentativa com valor default.`,
                );
                continue;
              }

              break;
            }

            if (upsertResult.error) {
              dbError = upsertResult.error.message ?? "unknown upsert error";
              console.error(
                "[POST /api/positions/open] upsert error:",
                upsertResult.error.message,
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

    if (!dbSaved) {
      return NextResponse.json(
        {
          success: false,
          dbSaved: false,
          error: dbError ?? "Falha ao persistir posição no Supabase",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      dbSaved: true,
      dbError: null,
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
    const { positionId, closePrice, pnl, closeReason, mode } = await req.json();
    const accountMode: "demo" | "real" = mode === "demo" ? "demo" : "real";

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
            const account = await getAccount(sb, user.id, accountMode);
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
