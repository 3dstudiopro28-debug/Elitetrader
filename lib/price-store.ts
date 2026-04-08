// ─── Price Store — shared live price cache ────────────────────────────────────
// O header é o único componente que chama a API Finnhub (a cada 8s).
// Todos os outros componentes (portfolio, sidebar, etc.) subscrevem este store.
// Evita rate-limiting do plano free (60 req/min) por múltiplos pollers concorrentes.

const EVENT_NAME = "et-prices-update"

// Cache em memória — persiste entre navegações de rota dentro da SPA.
const _cache: Record<string, number> = {}

export const priceStore = {
  /** Retorna cópia dos preços actuais. */
  get(): Record<string, number> {
    return { ..._cache }
  },

  /** Actualiza o cache e notifica todos os subscritores. */
  set(prices: Record<string, number>) {
    Object.assign(_cache, prices)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<Record<string, number>>(EVENT_NAME, { detail: { ..._cache } }))
    }
  },

  /** Subscreve actualizações de preço. Retorna função de cleanup. */
  subscribe(cb: (prices: Record<string, number>) => void): () => void {
    if (typeof window === "undefined") return () => {}
    const handler = (e: Event) => cb((e as CustomEvent<Record<string, number>>).detail)
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  },
}
