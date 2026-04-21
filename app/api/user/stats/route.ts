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

    // Override em memória do admin (tem prioridade sobre o DB)
    const mem = adminOverrideStore.get(userId);

    // Buscar conta real e conta demo do DB (separadas)
    const { data: accounts } = await sb
      .from("accounts")
      .select("id, balance, leverage, currency, mode")
      .eq("user_id", userId);

    const { data: dbOverride } = await sb
      .from("admin_overrides")
      .select(
        "balance_adjustment, equity_override, margin_level_override, force_close_positions",
      )
      .eq("user_id", userId)
      .maybeSingle();

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

    // Conta real: mem é imediata (mesmo lambda após PATCH); DB é fallback persistente.
    // Se mem tiver um valor e for maior que zero, usa-o primeiro para resposta imediata.
    // Caso o lambda reinicie (cold start), mem é null e cai para o DB.
    const dbRealBalance = realAccount?.balance ?? 0;
    const dbOverrideBalance =
      (dbOverride as { balance_adjustment?: number } | null)
        ?.balance_adjustment ?? null;
    const effectiveRealBalance =
      mem?.balance ?? dbOverrideBalance ?? dbRealBalance;

    // Conta demo: NUNCA afectada pelo admin — sempre do DB com fallback 100k fixo
    const demoBalance = demoAccount
      ? Math.max(demoAccount.balance, 0)
      : 100_000;
    const realBalance = effectiveRealBalance;

    // O servidor só força modo quando houver override explícito do admin.
    // Fora isso, o cliente começa em Real ao entrar e pode trocar manualmente.
    const effectiveMode: "demo" | "real" | null =
      (mem?.mode as "demo" | "real") ?? null;

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
        equityOverride:
          mem?.equityOverride ??
          (dbOverride as { equity_override?: number } | null)
            ?.equity_override ??
          null,
        marginLevelOverride:
          mem?.marginLevelOverride ??
          (dbOverride as { margin_level_override?: number } | null)
            ?.margin_level_override ??
          null,
        forceClosePositions:
          mem?.forceClose ??
          (dbOverride as { force_close_positions?: boolean } | null)
            ?.force_close_positions ??
          false,
        activeMode: effectiveMode,
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

    // Limpar forceClose no store em memória
    adminOverrideStore.clearForceClose(user.id);

    // Tentar também no DB (best-effort — falha silenciosa)
    const sb2 = createServerClient();
    await sb2
      .from("admin_overrides")
      .update({ force_close_positions: false })
      .eq("user_id", user.id)
      .then(() => {
        /* ignorar erros */
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
