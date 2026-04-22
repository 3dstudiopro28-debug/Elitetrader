/**
 * POST /api/auth/login
 * Autentica com Supabase + devolve cookie de sessão
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

async function ensureRealModeBootstrap(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  email?: string | null,
  meta: Record<string, unknown> = {},
) {
  await sb.from("profiles").upsert(
    {
      id: userId,
      email: email ?? "",
      first_name: String(meta.first_name ?? meta.given_name ?? ""),
      last_name: String(meta.last_name ?? meta.family_name ?? ""),
      mode: "real",
    },
    { onConflict: "id" },
  );

  const { data: accounts } = await sb
    .from("accounts")
    .select("id, mode")
    .eq("user_id", userId);

  const rows = (accounts as { id: string; mode: string }[] | null) ?? [];

  if (!rows.some((acc) => acc.mode === "demo")) {
    await sb.from("accounts").insert({
      user_id: userId,
      mode: "demo",
      balance: 100_000,
      leverage: 200,
      currency: "USD",
    });
  }

  if (!rows.some((acc) => acc.mode === "real")) {
    await sb.from("accounts").insert({
      user_id: userId,
      mode: "real",
      balance: 0,
      leverage: 200,
      currency: "USD",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Credenciais inválidas" },
        { status: 400 },
      );
    }

    const sb = createServerClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Email ou senha incorretos" },
        { status: 401 },
      );
    }

    if (data.user?.id) {
      await ensureRealModeBootstrap(
        sb,
        data.user.id,
        data.user.email,
        (data.user.user_metadata as Record<string, unknown> | undefined) ?? {},
      );
    }

    const res = NextResponse.json({
      success: true,
      data: {
        userId: data.user?.id,
        email: data.user?.email,
        firstName: data.user?.user_metadata?.first_name ?? "",
        lastName: data.user?.user_metadata?.last_name ?? "",
        mode: "real",
        demoBalance: 100_000,
        realBalance: 0,
        // Devolver tokens para o cliente inicializar a sessão do SDK
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
      },
    });

    // Cookie de sessão (httpOnly — não exposto ao JS do browser)
    res.cookies.set("sb-access-token", data.session?.access_token ?? "", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro de autenticação" },
      { status: 500 },
    );
  }
}
