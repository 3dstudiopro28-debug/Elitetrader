/**
 * GET /api/auth/callback
 *
 * Callback do OAuth (Google, etc.) via Supabase.
 * O Supabase redireciona aqui depois da autenticação com Google.
 * Este endpoint troca o code por uma sessão, define o cookie e redireciona para o dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

async function ensureRealModeBootstrap(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
  email: string,
  meta: Record<string, unknown>,
) {
  const nameFull = String(meta.full_name ?? meta.name ?? "");
  const firstName = String(meta.given_name ?? nameFull.split(" ")[0] ?? "");
  const lastName = String(
    meta.family_name ?? nameFull.split(" ").slice(1).join(" ") ?? "",
  );

  await sb.from("profiles").upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
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

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  // Erro vindo do OAuth provider
  if (error) {
    console.error("[auth/callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_denied", req.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", req.url));
  }

  try {
    const sb = createServerClient();

    // Trocar o authorization code por uma sessão Supabase
    const { data, error: exchangeError } =
      await sb.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.session) {
      console.error("[auth/callback] Exchange error:", exchangeError?.message);
      return NextResponse.redirect(
        new URL("/auth/login?error=exchange_failed", req.url),
      );
    }

    const session = data.session;

    // Para utilizadores Google: garantir profile + contas base e fixar modo real
    const userId = session.user.id;
    const email = session.user.email ?? "";
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;

    await ensureRealModeBootstrap(sb, userId, email, meta);

    // Redirecionar para o dashboard com o token em cookie httpOnly
    const redirectUrl = new URL("/trade/dashboard", req.url);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set("sb-access-token", session.access_token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(
      new URL("/auth/login?error=server_error", req.url),
    );
  }
}
