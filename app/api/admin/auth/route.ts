/**
 * POST /api/admin/auth
 *
 * Verifica a senha do admin exclusivamente no servidor.
 * Body: { password: string }
 * Response 200: { token: string; role: string; expiresAt: number }
 * Response 401: { error: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

// ────────────────────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_SECRET   = process.env.ADMIN_SECRET
const SESSION_HOURS  = 8

if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
  console.error(
    "[admin/auth] ADMIN_PASSWORD e ADMIN_SECRET devem estar definidos em .env.local",
  )
}

/** Gera token: HMAC-SHA256( role + ":" + expiresAt, ADMIN_SECRET ) */
export function signToken(role: string, expiresAt: number): string {
  return createHmac("sha256", ADMIN_SECRET ?? "")
    .update(`${role}:${expiresAt}`)
    .digest("hex")
}

/** Valida token recebido. Retorna o role ou null se inválido/expirado. */
export function verifyToken(token: string): string | null {
  if (!ADMIN_SECRET || !token) return null
  // Formato esperado: "<role>.<expiresAt>.<hmac>"
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [role, expiresAtStr, hmac] = parts
  const expiresAt = Number(expiresAtStr)
  if (Date.now() > expiresAt) return null // expirado
  const expected = signToken(role, expiresAt)
  try {
    const a = Buffer.from(hmac, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return role
}

/** Compara strings sem timing-attack. */
function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) {
      // Faz a comparação mesmo assim para evitar timing leak
      timingSafeEqual(ba, Buffer.from(b.padEnd(ba.length, "\0")))
      return false
    }
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Servidor não configurado. Defina ADMIN_PASSWORD e ADMIN_SECRET em .env.local" },
      { status: 503 },
    )
  }

  let body: { password?: string; role?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 })
  }

  const role = (body.role ?? "superadmin") as "superadmin" | "subadmin"

  if (role === "subadmin") {
    // Sub-admin: credenciais já verificadas no cliente (adminStore.verify).
    // O servidor só emite o token.
    const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
    const hmac      = signToken("subadmin", expiresAt)
    const token     = `subadmin.${expiresAt}.${hmac}`
    return NextResponse.json({ token, role: "subadmin", expiresAt })
  }

  // Superadmin: valida senha no servidor
  const password = body.password ?? ""
  if (!safeEqual(password, ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 100))
    return NextResponse.json({ error: "Senha incorrecta" }, { status: 401 })
  }

  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const hmac      = signToken("superadmin", expiresAt)
  const token     = `superadmin.${expiresAt}.${hmac}`

  return NextResponse.json({ token, role: "superadmin", expiresAt })
}
