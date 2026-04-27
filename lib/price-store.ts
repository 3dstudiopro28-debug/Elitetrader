// ─── Price Store — shared live price cache ────────────────────────────────────
// O header é o único componente que chama a API Alpha Vantage (a cada 8s).
// Todos os outros componentes (portfolio, sidebar, etc.) subscrevem este store.
// Evita rate-limiting do plano free (60 req/min) por múltiplos pollers concorrentes.

const EVENT_NAME = "et-prices-update"

// Cache em memória — persiste entre navegações de rota dentro da SPA.
const _cache: Record<string, number> = {}

// Overrides do admin — têm prioridade sobre simulação mas não sobre Alpha Vantage real.
// Actualmente suporta apenas xauusd.
const _adminOverrides: Record<string, number> = {}

export const priceStore = {
  /** Retorna cópia dos preços actuais (overrides admin em _adminOverrides; simulação em _cache). */
  get(): Record<string, number> {
    // Merge: simulação + overrides admin (admin sobrepõe‚ simulação — aplicado à simulação de 2s)
    return { ..._cache, ..._adminOverrides }
  },

  /** Actualiza o cache de simulação e notifica todos os subscritores. */
  set(prices: Record<string, number>) {
    Object.assign(_cache, prices)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<Record<string, number>>(EVENT_NAME, { detail: this.get() }))
    }
  },

  /**
   * Define overrides de preço do admin (ex: XAUUSD → 4600).
   * A simulação de 2s usa estes valores como base, garantindo flutuação realista.
   * O Alpha Vantage NÃO sobrepõe assets com override activo.
   */
  setAdminOverrides(prices: Record<string, number>) {
    // Limpar overrides removidos e actualizar novos
    for (const k of Object.keys(_adminOverrides)) {
      if (!(k in prices)) delete _adminOverrides[k]
    }
    Object.assign(_adminOverrides, prices)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<Record<string, number>>(EVENT_NAME, { detail: this.get() }))
    }
  },

  /** Retorna o override admin de um asset (null se não houver). */
  getAdminOverride(assetId: string): number | null {
    return _adminOverrides[assetId.toLowerCase()] ?? null
  },

  /** Subscreve actualizações de preço. Retorna função de cleanup. */
  subscribe(cb: (prices: Record<string, number>) => void): () => void {
    if (typeof window === "undefined") return () => {}
    const handler = (e: Event) => cb((e as CustomEvent<Record<string, number>>).detail)
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  },
}
