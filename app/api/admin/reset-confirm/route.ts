/**
 * POST /api/admin/reset-confirm
 *
 * Valida o token de redefinição e actualiza a senha mestra.
 * Actualiza ADMIN_PASSWORD no runtime (até reiniciar o servidor).
 * Em produção, o ideal seria guardar num KV/Redis ou variável de ambiente gerida.
 *
 * Body: { token: string; newPassword: string }
 * Response 200: { ok: true }
 * Response 400: { error: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ""

// Runtime store de senhas redefinidas (válido enquanto o processo Node estiver ativo).
// Na primeira chamada após reinício, usa o valor do .env.local.
// Nota: para persistência real, guardar em Supabase KV ou num ficheiro seguro.
let runtimePassword: string | null = null

/** Devolve a senha em uso actualmente (runtime override ou env). */
export function getCurrentPassword(): string {
  return runtimePassword ?? process.env.ADMIN_PASSWORD ?? ""
}

export async function POST(req: NextRequest) {
  let body: { token?: string; newPassword?: string } = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 })
  }

  const { token = "", newPassword = "" } = body

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token e nova senha obrigatórios" }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 })
  }

  // Validar token: formato raw.expiresAt.hmac
  const parts = token.split(".")
  if (parts.length !== 3) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  const [raw, expiresAtStr, hmac] = parts
  const expiresAt = Number(expiresAtStr)

  if (Date.now() > expiresAt) {
    return NextResponse.json({ error: "Token expirado. Solicite um novo link." }, { status: 400 })
  }

  const expected = createHmac("sha256", ADMIN_SECRET)
    .update(`${raw}:${expiresAt}`)
    .digest("hex")

  if (hmac !== expected) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  // Token válido — actualizar senha em runtime
  runtimePassword = newPassword
  console.info("[reset-confirm] Senha admin actualizada em runtime. Actualize ADMIN_PASSWORD no .env.local para persistir após reinício.")

  return NextResponse.json({ ok: true })
}
