/**
 * POST /api/auth/login
 * Autentica com Supabase + devolve cookie de sessão
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 400 })
    }

    const sb = createServerClient()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ success: false, error: "Email ou senha incorretos" }, { status: 401 })
    }

    const res = NextResponse.json({
      success: true,
      data: {
        userId:       data.user?.id,
        email:        data.user?.email,
        firstName:    data.user?.user_metadata?.first_name ?? "",
        lastName:     data.user?.user_metadata?.last_name  ?? "",
        mode:         "demo",
        demoBalance:  100_000,
        // Devolver tokens para o cliente inicializar a sessão do SDK
        accessToken:  data.session?.access_token  ?? null,
        refreshToken: data.session?.refresh_token ?? null,
      },
    })

    // Cookie de sessão (httpOnly — não exposto ao JS do browser)
    res.cookies.set("sb-access-token", data.session?.access_token ?? "", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    return res
  } catch {
    return NextResponse.json({ success: false, error: "Erro de autenticação" }, { status: 500 })
  }
}

