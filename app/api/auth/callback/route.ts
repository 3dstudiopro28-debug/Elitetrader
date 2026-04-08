/**
 * GET /api/auth/callback
 *
 * Callback do OAuth (Google, etc.) via Supabase.
 * O Supabase redireciona aqui depois da autenticação com Google.
 * Este endpoint troca o code por uma sessão, define o cookie e redireciona para o dashboard.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  // Erro vindo do OAuth provider
  if (error) {
    console.error("[auth/callback] OAuth error:", error)
    return NextResponse.redirect(new URL("/auth/login?error=oauth_denied", req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", req.url))
  }

  try {
    const sb = createServerClient()

    // Trocar o authorization code por uma sessão Supabase
    const { data, error: exchangeError } = await sb.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.session) {
      console.error("[auth/callback] Exchange error:", exchangeError?.message)
      return NextResponse.redirect(new URL("/auth/login?error=exchange_failed", req.url))
    }

    const session = data.session

    // Para utilizadores Google: garantir que o profile existe na BD
    // O trigger handle_new_user faz isto automaticamente; mas como fallback:
    const userId = session.user.id
    const email  = session.user.email ?? ""
    const meta   = session.user.user_metadata ?? {}

    // Verificar se profile já existe (pode ter sido criado pelo trigger)
    const { data: existingProfile } = await sb
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (!existingProfile) {
      // Criar profile manualmente (fallback se o trigger não correu)
      const nameFull  = meta.full_name ?? meta.name ?? ""
      const firstName = meta.given_name ?? nameFull.split(" ")[0] ?? ""
      const lastName  = meta.family_name ?? nameFull.split(" ").slice(1).join(" ") ?? ""

      await sb.from("profiles").upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name:  lastName,
      }, { onConflict: "id", ignoreDuplicates: true })

      // Criar conta demo se não existir
      await sb.from("accounts").upsert({
        user_id:  userId,
        mode:     "demo",
        balance:  100_000,
        leverage: 200,
        currency: "USD",
      }, { onConflict: "user_id, mode", ignoreDuplicates: true })
    }

    // Redirecionar para o dashboard com o token em cookie httpOnly
    const redirectUrl = new URL("/trade/dashboard", req.url)
    const response = NextResponse.redirect(redirectUrl)

    response.cookies.set("sb-access-token", session.access_token, {
      httpOnly: true,
      path:     "/",
      maxAge:   60 * 60 * 24 * 7, // 7 dias
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    })

    return response
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err)
    return NextResponse.redirect(new URL("/auth/login?error=server_error", req.url))
  }
}
