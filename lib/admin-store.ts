/**
 * lib/admin-store.ts
 *
 * Gestão de sub-admins (contas gestoras criadas pela conta mestra #1).
 * A conta mestra (#1) está hardcoded e nunca aparece aqui.
 * Os sub-admins são guardados em localStorage.
 */

export interface SubAdmin {
  id: string
  email: string       // e-mail único do gestor
  password: string    // codificado em base64 — não é segurança real, é CRM interno
  createdAt: string
}

const KEY = "et_sub_admins"

function uid(): string {
  return "adm_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

// Codificação simples para não guardar passwords em plain text no localStorage
function encode(s: string): string {
  return btoa(encodeURIComponent(s))
}
function decode(s: string): string {
  try { return decodeURIComponent(atob(s)) } catch { return "" }
}

export const adminStore = {
  getAll(): SubAdmin[] {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") } catch { return [] }
  },

  /** Verifica credenciais de um sub-admin por e-mail. Retorna true se correctas. */
  verify(email: string, password: string): boolean {
    return this.getAll().some(
      (a) => a.email.toLowerCase() === email.toLowerCase() && decode(a.password) === password,
    )
  },

  create(email: string, password: string): { ok: boolean; error?: string } {
    if (!email.trim() || !email.includes("@")) return { ok: false, error: "E-mail inválido" }
    if (password.length < 8) return { ok: false, error: "Senha deve ter pelo menos 8 caracteres" }
    const all = this.getAll()
    if (all.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "E-mail já registado" }
    }
    const entry: SubAdmin = {
      id: uid(),
      email: email.trim().toLowerCase(),
      password: encode(password),
      createdAt: new Date().toISOString(),
    }
    all.push(entry)
    localStorage.setItem(KEY, JSON.stringify(all))
    return { ok: true }
  },

  delete(id: string): void {
    const filtered = this.getAll().filter((a) => a.id !== id)
    localStorage.setItem(KEY, JSON.stringify(filtered))
  },

  changePassword(id: string, newPassword: string): { ok: boolean; error?: string } {
    if (newPassword.length < 8) return { ok: false, error: "Senha deve ter pelo menos 8 caracteres" }
    const all = this.getAll()
    const idx = all.findIndex((a) => a.id === id)
    if (idx < 0) return { ok: false, error: "Conta não encontrada" }
    all[idx].password = encode(newPassword)
    localStorage.setItem(KEY, JSON.stringify(all))
    return { ok: true }
  },
}
