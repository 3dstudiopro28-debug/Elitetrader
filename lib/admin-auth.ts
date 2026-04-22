/**
 * lib/admin-auth.ts
 *
 * Helper server-side para validar o token de sessão admin em todas as rotas de API.
 * Importar apenas em Server Components / Route Handlers (nunca em "use client").
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/app/api/admin/auth/route"
import { createServerClient } from "@/lib/supabase-server"

/** Retorna o role do admin ou null se o token for inválido/expirado. */
export function getAdminRole(req: NextRequest): string | null {
  const token = req.headers.get("x-admin-token") ?? ""
  return verifyToken(token)
}

function tokenFromCookieValue(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("eyJ") && trimmed.split(".").length === 3) return trimmed

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "access_token" in parsed &&
      typeof (parsed as { access_token?: unknown }).access_token === "string"
    ) {
      return (parsed as { access_token: string }).access_token
    }
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0]
  } catch {
    // ignore
  }

  return null
}

function getSupabaseAccessToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)

  const direct = req.cookies.get("sb-access-token")?.value
  if (direct) return direct

  for (const item of req.cookies.getAll()) {
    if (!item.name.startsWith("sb-")) continue
    if (!item.name.includes("auth-token")) continue
    const token = tokenFromCookieValue(item.value)
    if (token) return token
  }

  return null
}

async function isAuthenticatedAdminFromSupabase(req: NextRequest): Promise<boolean> {
  const token = getSupabaseAccessToken(req)
  if (!token) return false

  try {
    const sb = createServerClient(token)
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token)
    if (error || !user) return false

    // Se existir allowlist de emails admin, aplicar; se não existir, basta estar autenticado.
    const allowlist = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (allowlist.length === 0) return true
    return !!user.email && allowlist.includes(user.email.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Verifica autorização. Se falhar, retorna uma NextResponse 401.
 * Uso:
 *   const unauth = requireAdmin(req)
 *   if (unauth) return unauth
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const role = getAdminRole(req)
  if (role) return null

  const ok = await isAuthenticatedAdminFromSupabase(req)
  if (ok) return null

  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
}

/** Como requireAdmin mas exige especificamente "superadmin". */
export async function requireSuperAdmin(req: NextRequest): Promise<NextResponse | null> {
  const role = getAdminRole(req)
  if (role === "superadmin") return null

  const token = getSupabaseAccessToken(req)
  if (token) {
    try {
      const sb = createServerClient(token)
      const {
        data: { user },
        error,
      } = await sb.auth.getUser(token)
      const superEmail = (process.env.ADMIN_SUPER_EMAIL ?? "").trim().toLowerCase()
      if (!error && user?.email && superEmail && user.email.toLowerCase() === superEmail) {
        return null
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ error: "Apenas a conta mestra tem acesso" }, { status: 403 })
}
