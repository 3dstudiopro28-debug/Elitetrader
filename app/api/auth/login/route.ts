/**
 * POST /api/auth/login
 * Autentica com Supabase + devolve cookie de sessão
 *
 * GET /api/auth/login
 * Renova o cookie sb-access-token com o token Bearer do SDK (auto-refresh).
 * Chamado pelo dashboard quando o SDK renova o access token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * GET — actualiza o cookie httpOnly com o token fresco do SDK do browser.
 * Chamado sempre que o SDK renova o access token (evento TOKEN_REFRESHED).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const sb = createServerClient(token);
  const {
    data: { user },
    error,
  } = await sb.auth.getUser(token);

  if (error || !user) return NextResponse.json({ ok: false }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb-access-token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

async function ensureRealModeBootstrap(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  email?: string | null,
  meta: Record<string, unknown> = {},
) {
  // Upsert do perfil — ignora colunas que podem não existir no schema
  try {
    await sb.from("profiles").upsert(
      {
        id: userId,
        email: email ?? "",
        first_name: String(meta.first_name ?? meta.given_name ?? ""),
        last_name: String(meta.last_name ?? meta.family_name ?? ""),
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
  } catch {
    // Se falhar (ex: coluna first_name não existe), tentar schema mínimo
    try {
      await sb.from("profiles").upsert(
        { id: userId, email: email ?? "" },
        { onConflict: "id", ignoreDuplicates: true },
      );
    } catch {
      /* ignorar — o perfil pode já existir */
    }
  }

  // Garantir conta 'real' existe — tenta com mode, fallback sem mode
  try {
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
  } catch {
    // Schema sem coluna mode — garantir que pelo menos uma conta existe
    try {
      await sb
        .from("accounts")
        .insert({ user_id: userId, balance: 0, leverage: 200, currency: "USD" });
    } catch {
      /* conta já existe (23505) — ignorar */
    }
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
