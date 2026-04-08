/**
 * lib/mailer.ts
 *
 * Envio de e-mail via Gmail SMTP (App Password).
 * Configuração no .env.local:
 *   GMAIL_USER=seuemail@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← App Password do Gmail (não a senha normal)
 *
 * Como gerar App Password:
 *   1. Aceda a https://myaccount.google.com/security
 *   2. Ative a verificação em dois passos (se ainda não tiver)
 *   3. Em "Senhas de App" → crie uma para "Outro (nome personalizado)" → EliteTrader
 *   4. Copie a senha de 16 caracteres para GMAIL_APP_PASSWORD
 */

import nodemailer from "nodemailer"

const GMAIL_USER         = process.env.GMAIL_USER ?? ""
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? ""

function createTransport() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  })
}

export interface MailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail(opts: MailOptions): Promise<{ ok: boolean; error?: string }> {
  const transport = createTransport()
  if (!transport) {
    console.warn("[mailer] Gmail não configurado. Defina GMAIL_USER e GMAIL_APP_PASSWORD em .env.local")
    return { ok: false, error: "Servidor de e-mail não configurado" }
  }
  try {
    await transport.sendMail({
      from: `"Elite Trader" <${GMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[mailer] Erro ao enviar e-mail:", msg)
    return { ok: false, error: msg }
  }
}

export const isMailerConfigured = () => !!(GMAIL_USER && GMAIL_APP_PASSWORD)
