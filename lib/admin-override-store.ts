/**
 * Store em memória no servidor para overrides do admin.
 *
 * Usa global.__adminOverrideStore para garantir uma única instância
 * partilhada entre todos os route handlers do Next.js no mesmo processo.
 *
 * - Persiste enquanto o servidor Next.js estiver em execução.
 * - Não depende do schema do Supabase.
 * - O cliente lê via /api/user/stats a cada 5s.
 * - Reiniciar o servidor limpa os overrides (admin pode reaplicar).
 */

export type AdminOverrideEntry = {
  /** Saldo a mostrar ao cliente (sobrescreve o DB) */
  balance?: number
  /** Modo forçado pelo admin */
  mode?: "demo" | "real"
  /** Forçar fecho de posições abertas */
  forceClose?: boolean
  /** Override de equity (mostrado na UI) */
  equityOverride?: number | null
  /** Override de margem (mostrado na UI) */
  marginLevelOverride?: number | null
  /** Override de balance (mostrado na UI sem fechar posições) */
  balanceOverride?: number | null
  /** Nota interna do admin */
  note?: string
  /** Forçar recalculo de epoch no cliente (reset de saldo imediato) */
  forceEpochReset?: boolean
  /** Timestamp de quando foi definido */
  setAt: number
}

// Singleton global: partilhado entre todos os módulos no mesmo processo Node.js
declare global {
  // eslint-disable-next-line no-var
  var __adminOverrideStore: Map<string, AdminOverrideEntry> | undefined
}

const _store: Map<string, AdminOverrideEntry> =
  global.__adminOverrideStore ?? new Map<string, AdminOverrideEntry>()

if (!global.__adminOverrideStore) {
  global.__adminOverrideStore = _store
}

export const adminOverrideStore = {
  /** Guardar / actualizar override para um utilizador */
  set(userId: string, data: Omit<AdminOverrideEntry, "setAt">) {
    const existing = _store.get(userId) ?? {}
    _store.set(userId, { ...existing, ...data, setAt: Date.now() })
  },

  /** Ler override de um utilizador (null se não houver) */
  get(userId: string): AdminOverrideEntry | null {
    return _store.get(userId) ?? null
  },

  /** Limpar flags forceClose + forceEpochReset após o cliente processar */
  clearForceClose(userId: string) {
    const entry = _store.get(userId)
    if (entry) {
      _store.set(userId, { ...entry, forceClose: false, forceEpochReset: false })
    }
  },

  /** Remover todos os overrides de um utilizador */
  delete(userId: string) {
    _store.delete(userId)
  },
}
