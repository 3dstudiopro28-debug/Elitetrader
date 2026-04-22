/**
 * GET  /api/admin/users   — lista todos os utilizadores (Supabase)
 * POST /api/admin/users   — cria utilizador manualmente
 *
 * Autenticação: header  x-admin-token: <ADMIN_SECRET>
 *
 * Fonte de dados:
 *   - Com SUPABASE_SERVICE_ROLE_KEY → Supabase (ignora RLS, vê todos)
 *   - Sem service role key           → userStore (localStorage local)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, hasServiceRole } from "@/lib/supabase-server";
import { userStore } from "@/lib/user-store";
import {
  adminOverrideStore,
  AdminOverrideEntry,
} from "@/lib/admin-override-store";
import { requireAdmin } from "@/lib/admin-auth";

// Normaliza row Supabase → formato CRMUser
// Suporta dois schemas:
//   - Novo (após repair SQL): profiles.first_name + profiles.last_name
//   - Antigo (schema inicial Supabase): profiles.name (nome completo combinado)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUser(
  profile: any,
  demoAccount: any,
  realAccount: any,
  override: AdminOverrideEntry | null,
) {
  // A conta "principal" para leverage/currency/status é a demo se existir, senão a real
  const primaryAccount = demoAccount ?? realAccount ?? null;

  // Suporte a ambos os schemas: first_name/last_name (novo) ou name (antigo)
  const firstName =
    profile.first_name !== undefined
      ? (profile.first_name ?? "")
      : profile.name
        ? String(profile.name).split(" ")[0]
        : "";
  const lastName =
    profile.last_name !== undefined
      ? (profile.last_name ?? "")
      : profile.name
        ? String(profile.name).split(" ").slice(1).join(" ")
        : "";

  // mode: override do admin tem prioridade; depois conta demo/real; default "demo"
  const effectiveMode =
    (override?.mode as "demo" | "real" | undefined) ??
    primaryAccount?.mode ??
    profile.mode ??
    "demo";
  const effectiveStatus = primaryAccount?.status ?? profile.status ?? "active";

  // Saldo demo: sempre $100k (conta de treino)
  const computedDemo = demoAccount?.balance ?? 100_000;
  // Saldo real: lê directamente da conta real, com fallback para override em memória
  const computedReal = realAccount?.balance ?? override?.balance ?? 0;

  return {
    id: profile.id,
    email: profile.email,
    firstName,
    lastName,
    phone: profile.phone ?? "",
    country: profile.country ?? "",
    createdAt: profile.created_at,
    // mode e status
    mode: effectiveMode,
    status: effectiveStatus,
    // balance no painel admin = sempre saldo REAL (o que o admin controla)
    balance: computedReal,
    demoBalance: computedDemo,
    realBalance: computedReal,
    leverage: primaryAccount?.leverage ?? 200,
    currency: primaryAccount?.currency ?? "USD",
    balanceOverride: override?.balanceOverride ?? null,
    marginLevelOverride: override?.marginLevelOverride ?? null,
    equityOverride: override?.equityOverride ?? null,
    adminNotes: override?.note ?? "",
    lastLogin: profile.last_sign_in_at ?? null,
    kycStatus: profile.kyc_status ?? "unverified",
    totalDeposited: primaryAccount?.total_deposited ?? 0,
    totalWithdrawn: primaryAccount?.total_withdrawn ?? 0,
  };
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q")?.toLowerCase() ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const modeFilter = searchParams.get("mode") ?? "";

  // ── Supabase (service role) ──────────────────────────────────────────────
  if (hasServiceRole()) {
    const sb = createServerClient();
    const { data: profiles, error } = await sb
      .from("profiles")
      .select("*, accounts(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let users = (profiles ?? []).map((p: any) => {
      const accountsArr = Array.isArray(p.accounts)
        ? p.accounts
        : p.accounts
          ? [p.accounts]
          : [];
      // Schema com mode: tentar encontrar demo/real; schema sem mode: usar primeira conta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const demoAcc = accountsArr.find((a: any) => a.mode === "demo") ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const realAcc = accountsArr.find((a: any) => a.mode === "real") ?? null;
      // Overrides vêm do store em memória (não do DB)
      const override = adminOverrideStore.get(p.id);
      return normalizeUser(p, demoAcc, realAcc, override);
    });

    if (search)
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search),
      );
    if (statusFilter) users = users.filter((u) => u.status === statusFilter);
    if (modeFilter) users = users.filter((u) => u.mode === modeFilter);

    const stats = {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      pending: users.filter((u) => u.status === "pending").length,
      demo: users.filter((u) => u.mode === "demo").length,
      real: users.filter((u) => u.mode === "real").length,
      totalDeposited: users.reduce((s, u) => s + u.totalDeposited, 0),
    };

    return NextResponse.json({
      success: true,
      data: users,
      stats,
      source: "supabase",
    });
  }

  // ── Fallback: userStore (local) ──────────────────────────────────────────
  let users = userStore.getAll();
  if (search)
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.firstName.toLowerCase().includes(search) ||
        u.lastName.toLowerCase().includes(search),
    );
  if (statusFilter) users = users.filter((u) => u.status === statusFilter);
  if (modeFilter) users = users.filter((u) => u.mode === modeFilter);

  return NextResponse.json({
    success: true,
    data: users,
    stats: userStore.getStats(),
    source: "local",
  });
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  try {
    const body = await req.json();
    const { email, firstName, lastName, phone, country, password } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      );
    }

    // ── Supabase ───────────────────────────────────────────────────────────
    if (hasServiceRole()) {
      const sb = createServerClient();
      const { data: authData, error: authError } =
        await sb.auth.admin.createUser({
          email,
          password: password ?? Math.random().toString(36).slice(2) + "A1!",
          user_metadata: {
            first_name: firstName ?? "",
            last_name: lastName ?? "",
          },
          email_confirm: true,
        });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      if (authData.user) {
        await sb
          .from("profiles")
          .update({
            first_name: firstName ?? "",
            last_name: lastName ?? "",
            phone: phone ?? "",
            country: country ?? "",
          })
          .eq("id", authData.user.id);
      }

      return NextResponse.json(
        {
          success: true,
          data: { id: authData.user?.id, email },
          source: "supabase",
        },
        { status: 201 },
      );
    }

    // ── Fallback: userStore ────────────────────────────────────────────────
    const existing = userStore.getByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Email já registado" },
        { status: 409 },
      );
    }

    const user = userStore.create({
      email,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      phone,
      country,
    });
    return NextResponse.json(
      { success: true, data: user, source: "local" },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
