/**
 * POST /api/admin/reset-request
 *
 * Gera um token de redefinição de senha (válido 30 min) e envia e-mail ao admin.
 * Apenas funciona para a conta mestra (ADMIN_EMAIL).
 *
 * Body: { email: string }
 * Response: sempre 200 (para não revelar se o e-mail existe)
 */

import { NextRequest, NextResponse } from "next/server"
import { createHmac, randomBytes } from "crypto"
import { sendMail } from "@/lib/mailer"

const ADMIN_EMAIL  = (process.env.ADMIN_EMAIL  ?? "").toLowerCase()
const ADMIN_SECRET = process.env.ADMIN_SECRET  ?? ""

// Token: HMAC-SHA256(randomHex + expiresAt, ADMIN_SECRET)
// Guardado em memória do processo — em produção use Redis/KV
const pendingTokens = new Map<string, { expiresAt: number }>()

export async function POST(req: NextRequest) {
  let body: { email?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }

  const email = (body.email ?? "").toLowerCase().trim()

  // Resposta genérica independentemente de o e-mail ser válido
  if (!email || email !== ADMIN_EMAIL) {
    return NextResponse.json({ ok: true })
  }

  // Gerar token aleatório seguro
  const raw       = randomBytes(32).toString("hex")
  const expiresAt = Date.now() + 30 * 60 * 1000 // 30 minutos
  const token     = createHmac("sha256", ADMIN_SECRET)
    .update(`${raw}:${expiresAt}`)
    .digest("hex")
  const fullToken = `${raw}.${expiresAt}.${token}`

  // Guardar em memória (válido enquanto o processo estiver ativo)
  pendingTokens.set(token, { expiresAt })
  // Limpar tokens expirados
  for (const [k, v] of pendingTokens) {
    if (Date.now() > v.expiresAt) pendingTokens.delete(k)
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin?reset=${encodeURIComponent(fullToken)}`

  await sendMail({
    to: ADMIN_EMAIL,
    subject: "🔑 Elite Trader — Redefinição de senha admin",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:12px">
        <h2 style="margin-top:0">🔑 Redefinição de Senha</h2>
        <p>Recebemos um pedido para redefinir a senha da conta de administração do <strong>Elite Trader</strong>.</p>
        <p>Clique no botão abaixo para definir uma nova senha. O link é válido por <strong>30 minutos</strong>.</p>
        <div style="margin:24px 0;text-align:center">
          <a href="${resetUrl}"
            style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Redefinir Senha
          </a>
        </div>
        <p style="font-size:12px;color:#999">Se não pediu esta redefinição, ignore este e-mail. A sua senha permanece inalterada.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <small style="color:#999">Link expira em ${new Date(expiresAt).toLocaleString("pt-PT")}</small>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}

// ─── Token store exportado para o confirm route ──────────────────────────────
export { pendingTokens }
