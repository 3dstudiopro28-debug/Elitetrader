/**
 * lib/admin-auth.ts
 *
 * Helper server-side para validar o token de sessão admin em todas as rotas de API.
 * Importar apenas em Server Components / Route Handlers (nunca em "use client").
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/app/api/admin/auth/route"

/** Retorna o role do admin ou null se o token for inválido/expirado. */
export function getAdminRole(req: NextRequest): string | null {
  const token = req.headers.get("x-admin-token") ?? ""
  return verifyToken(token)
}

/**
 * Verifica autorização. Se falhar, retorna uma NextResponse 401.
 * Uso:
 *   const unauth = requireAdmin(req)
 *   if (unauth) return unauth
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const role = getAdminRole(req)
  if (!role) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  return null
}

/** Como requireAdmin mas exige especificamente "superadmin". */
export function requireSuperAdmin(req: NextRequest): NextResponse | null {
  const role = getAdminRole(req)
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas a conta mestra tem acesso" }, { status: 403 })
  }
  return null
}
