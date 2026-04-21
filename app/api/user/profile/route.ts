/**
 * GET   /api/user/profile  — perfil completo do utilizador autenticado
 * PATCH /api/user/profile  — actualizar campos do perfil
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  createUserClient,
  hasServiceRole,
} from "@/lib/supabase-server";

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
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
    const authSb = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authSb.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 },
      );
    }

    const sb = hasServiceRole() ? authSb : createUserClient(token);

    const { data: profile, error: profErr } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json(
        { success: false, error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const { data: accountRows, error: accountErr } = await sb
      .from("accounts")
      .select("id, balance, currency, mode")
      .eq("user_id", user.id);

    if (accountErr) {
      console.error("[user/profile] accounts error:", accountErr.message);
      return NextResponse.json(
        { success: false, error: "Conta indisponível temporariamente" },
        { status: 503 },
      );
    }

    const accounts =
      (accountRows as
        | { id: string; balance: number; currency: string; mode?: string }[]
        | null) ?? [];

    const realAccount =
      accounts.find((acc) => (acc.mode ?? "").toLowerCase() === "real") ??
      accounts[0] ??
      null;

    const demoAccount =
      accounts.find((acc) => (acc.mode ?? "").toLowerCase() === "demo") ?? null;

    // Suporte a schema antigo (name) e novo (first_name/last_name)
    const prof = profile as Record<string, string | null>;
    const firstName = prof.first_name ?? "";
    const lastName = prof.last_name ?? "";

    // Buscar override de saldo
    let balanceOverride: number | null = null;
    try {
      const { data: override } = await sb
        .from("admin_overrides")
        .select("balance_override")
        .eq("user_id", user.id)
        .single();
      if (
        override &&
        override.balance_override !== null &&
        override.balance_override !== undefined
      ) {
        balanceOverride = Number(override.balance_override);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        id: prof.id,
        email: prof.email,
        firstName,
        lastName,
        phone: prof.phone ?? "",
        country: prof.country ?? "",
        city: prof.city ?? "",
        address: prof.address ?? "",
        postalCode: prof.postal_code ?? "",
        nationality: prof.nationality ?? "",
        kycStatus: prof.kyc_status ?? "unverified",
        profileCompletion:
          (profile as Record<string, unknown>).profile_completion ?? 0,
        profileCompletionMax: 4,
        currency: realAccount?.currency ?? demoAccount?.currency ?? "USD",
        accountId: realAccount?.id ?? demoAccount?.id ?? "",
        createdAt: prof.created_at,
        dobDay: prof.dob_day ?? "",
        dobMonth: prof.dob_month ?? "",
        dobYear: prof.dob_year ?? "",
        phoneCountryCode: prof.phone_country_code ?? "+55",
        nif: prof.nif ?? "",
        isPep: (prof.is_pep as unknown as boolean) ?? false,
        isUsResident: (prof.is_us_resident as unknown as boolean) ?? false,
        idType: prof.id_type ?? "",
        idNumber: prof.id_number ?? "",
        cid: (prof.id ?? "").slice(0, 6).toUpperCase(),
        forcePasswordChange:
          (profile as Record<string, unknown>).force_password_change ?? false,
        // Fonte de verdade: saldo real em accounts. override só como fallback.
        balance:
          realAccount?.balance ??
          (balanceOverride !== null
            ? balanceOverride
            : (demoAccount?.balance ?? 0)),
        realBalance: realAccount?.balance ?? 0,
        demoBalance: demoAccount?.balance ?? 100_000,
      },
    });
  } catch (err) {
    console.error("[user/profile] GET:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar perfil" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 },
    );
  }

  try {
    // Validar o token e obter o utilizador
    const authSb = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authSb.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 },
      );
    }

    // Cliente para operações BD: service_role ignora RLS, senão usa JWT do utilizador
    const sb = hasServiceRole() ? authSb : createUserClient(token);

    const body = await req.json();

    const profilePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if ("firstName" in body) profilePatch.first_name = body.firstName;
    if ("lastName" in body) profilePatch.last_name = body.lastName;
    if ("phone" in body) profilePatch.phone = body.phone;
    if ("country" in body) profilePatch.country = body.country;
    if ("city" in body) profilePatch.city = body.city;
    if ("address" in body) profilePatch.address = body.address;
    if ("postalCode" in body) profilePatch.postal_code = body.postalCode;
    if ("nationality" in body) profilePatch.nationality = body.nationality;
    if ("dobDay" in body) profilePatch.dob_day = body.dobDay;
    if ("dobMonth" in body) profilePatch.dob_month = body.dobMonth;
    if ("dobYear" in body) profilePatch.dob_year = body.dobYear;
    if ("nif" in body) profilePatch.nif = body.nif;
    if ("phoneCountryCode" in body)
      profilePatch.phone_country_code = body.phoneCountryCode;
    if ("isPep" in body) profilePatch.is_pep = body.isPep;
    if ("isUsResident" in body) profilePatch.is_us_resident = body.isUsResident;
    if ("idType" in body) profilePatch.id_type = body.idType;
    if ("idNumber" in body) profilePatch.id_number = body.idNumber;
    if ("forcePasswordChange" in body)
      profilePatch.force_password_change = body.forcePasswordChange;

    // Calcular nível de conclusão do perfil
    const { data: currentProfile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (currentProfile) {
      const merged = { ...currentProfile, ...profilePatch };
      const fields = [
        merged.first_name,
        merged.last_name,
        merged.phone,
        merged.country,
        merged.city,
        merged.address,
        merged.dob_year,
        merged.nationality,
      ];
      const filled = fields.filter((f) => f && String(f).trim() !== "").length;
      profilePatch.profile_completion = Math.min(4, Math.floor(filled / 2));
    }

    const { error: updateErr } = await sb
      .from("profiles")
      .update(profilePatch)
      .eq("id", user.id);

    if (updateErr) {
      console.error("[user/profile] PATCH:", updateErr.message);
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...body, updatedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("[user/profile] PATCH:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar perfil" },
      { status: 500 },
    );
  }
}
