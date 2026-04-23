/**
 * GET  /api/user/stats   — retorna saldo real + admin overrides do utilizador autenticado
 * POST /api/user/stats   — limpa o flag force_close_positions (chamado pelo cliente depois de fechar posições)
 *
 * Autenticação: cookie sb-access-token (httpOnly)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { adminOverrideStore } from "@/lib/admin-override-store";

function getAccessToken(req: NextRequest): string | null {
  // Cookie httpOnly definido no login
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
  // Fallback: Authorization header (Bearer <token>)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 },
    );
  }

  try {
    const sb = createServerClient(token);

    // Identificar o utilizador pelo token
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

    const userId = user.id;

    // Override em memória do admin (cache de resposta imediata no mesmo processo)
    const mem = adminOverrideStore.get(userId);

    // Buscar conta real, conta demo e admin overrides do DB em paralelo
    const [{ data: accounts }, { data: dbOverride }] = await Promise.all([
      sb
        .from("accounts")
        .select("id, balance, leverage, currency, mode")
        .eq("user_id", userId),
      sb
        .from("admin_overrides")
        .select(
          "balance_adjustment, equity_override, margin_level_override, force_close_positions, active_mode",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const accs =
      (accounts as
        | {
            id: string;
            balance: number;
            leverage: number;
            currency: string;
            mode: string;
          }[]
        | null) ?? [];
    const realAccount = accs.find((a) => a.mode === "real");
    const demoAccount = accs.find((a) => a.mode === "demo");

    type DbOverrideRow = {
      balance_adjustment?: number | null;
      equity_override?: number | null;
      margin_level_override?: number | null;
      force_close_positions?: boolean | null;
      active_mode?: string | null;
    };
    const dbOv = dbOverride as DbOverrideRow | null;

    // ── DB É FONTE DA VERDADE (anti-oscilação em Vercel multi-instância) ──
    // Prioridade: 1) accounts.balance (escrito diretamente pelo admin PATCH)
    //             2) admin_overrides.balance_adjustment (backup do mesmo valor)
    //             3) memory cache (apenas no mesmo processo/instância)
    const dbRealBalance = realAccount != null ? realAccount.balance : null;
    const dbOverrideBalance = dbOv?.balance_adjustment ?? null;
    const effectiveRealBalance =
      dbRealBalance ?? // 1. accounts.balance — fonte primária
      dbOverrideBalance ?? // 2. admin_overrides.balance_adjustment — backup
      mem?.balance ?? // 3. memória in-process — mesmo lambda pós-PATCH
      0; // 4. fallback zero

    // Conta demo: NUNCA afectada pelo admin — sempre do DB com fallback 100k fixo
    const demoBalance = demoAccount
      ? Math.max(demoAccount.balance, 0)
      : 100_000;
    const realBalance = effectiveRealBalance;

    // Modo activo: memória tem prioridade (imediato), fallback DB, depois null
    const dbActiveMode = (dbOv?.active_mode as "demo" | "real" | null) ?? null;
    const effectiveMode: "demo" | "real" | null =
      (mem?.mode as "demo" | "real" | null) ?? dbActiveMode ?? null;

    return NextResponse.json({
      success: true,
      data: {
        userId,
        email: user.email,
        demoBalance,
        realBalance,
        leverage: realAccount?.leverage ?? demoAccount?.leverage ?? 200,
        currency: realAccount?.currency ?? demoAccount?.currency ?? "USD",
        // Admin overrides — balanceOverride removido (saldo controlado via Financeiro)
        balanceOverride: null,
        equityOverride: mem?.equityOverride ?? dbOv?.equity_override ?? null,
        marginLevelOverride:
          mem?.marginLevelOverride ?? dbOv?.margin_level_override ?? null,
        forceClosePositions:
          mem?.forceClose ?? dbOv?.force_close_positions ?? false,
        activeMode: effectiveMode,
        // forceEpochReset: sinaliza ao cliente para recalcular o epoch de P/L
        // (enviado após admin alterar saldo, para isolar trades históricos)
        forceEpochReset: mem?.forceEpochReset ?? false,
      },
    });
  } catch (err) {
    console.error("[user/stats] GET error:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user/stats
 * Body: { action: "clear_force_close" }
 * Chamado pelo cliente depois de fechar automaticamente as posições.
 */
export async function POST(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    if (body.action !== "clear_force_close") {
      return NextResponse.json(
        { success: false, error: "Ação inválida" },
        { status: 400 },
      );
    }

    const sb = createServerClient();
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

    // Limpar forceClose + forceEpochReset no store em memória
    adminOverrideStore.clearForceClose(user.id);

    // Persistir no DB também (garante consistência em multi-instância)
    await sb
      .from("admin_overrides")
      .update({ force_close_positions: false })
      .eq("user_id", user.id)
      .then(() => {
        /* best-effort */
      })
      .catch(() => {
        /* silêncio se a coluna não existir */
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[user/stats] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 },
    );
  }
}
