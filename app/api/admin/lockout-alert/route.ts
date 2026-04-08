/**
 * POST /api/admin/lockout-alert
 *
 * Chamado internamente quando a conta mestra tem demasiadas tentativas falhadas.
 * Envia um e-mail de alerta via Gmail SMTP (Nodemailer + App Password).
 *
 * O endereço de destino é definido em RECOVERY_EMAIL no .env.local — nunca exposto ao cliente.
 */

import { NextRequest, NextResponse } from "next/server"
import { sendMail } from "@/lib/mailer"

const RECOVERY_EMAIL = process.env.RECOVERY_EMAIL ?? process.env.ADMIN_EMAIL ?? ""

export async function POST(req: NextRequest) {
  let body: { attempts?: number } = {}
  try { body = await req.json() } catch { /* sem body */ }

  const attempts = body.attempts ?? "?"

  if (!RECOVERY_EMAIL) {
    console.warn("[lockout-alert] RECOVERY_EMAIL não definido em .env.local")
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })

  await sendMail({
    to: RECOVERY_EMAIL,
    subject: "⚠️ Elite Trader — Acesso admin bloqueado",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:12px">
        <h2 style="color:#c0392b;margin-top:0">⚠️ Alerta de Segurança</h2>
        <p>Foram detectadas <strong>${attempts}</strong> tentativas de acesso falhadas à conta de administração principal do <strong>Elite Trader</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#666">Data/Hora</td><td style="padding:6px 0"><strong>${now}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666">Tentativas</td><td style="padding:6px 0"><strong>${attempts}</strong></td></tr>
        </table>
        <p>Se não reconhece esta actividade, a sua conta admin pode estar em risco.</p>
        <p>Para repor a senha, aceda ao painel de administração e utilize a opção <strong>"Esqueci a senha"</strong>.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <small style="color:#999">Este alerta foi gerado automaticamente pelo sistema Elite Trader.</small>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
