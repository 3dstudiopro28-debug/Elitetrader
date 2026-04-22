/**
 * Store em memória no servidor para overrides de preço definidos pelo admin.
 * Actualmente suporta apenas XAUUSD (ouro).
 *
 * Padrão singleton global — partilhado entre todos os route handlers no processo.
 * Reiniciar o servidor limpa os overrides (admin pode reaplicar).
 */

declare global {
  // eslint-disable-next-line no-var
  var __adminPriceStore: Map<string, number> | undefined
}

const _store: Map<string, number> =
  global.__adminPriceStore ?? new Map<string, number>()

if (!global.__adminPriceStore) {
  global.__adminPriceStore = _store
}

export const adminPriceStore = {
  /** Define o preço override para um asset (ex: "xauusd", 4600) */
  set(assetId: string, price: number) {
    _store.set(assetId.toLowerCase(), price)
  },

  /** Lê o preço override (null se não houver) */
  get(assetId: string): number | null {
    return _store.get(assetId.toLowerCase()) ?? null
  },

  /** Retorna todos os overrides activos */
  getAll(): Record<string, number> {
    return Object.fromEntries(_store.entries())
  },

  /** Remove o override de um asset */
  delete(assetId: string) {
    _store.delete(assetId.toLowerCase())
  },

  /** Remove todos os overrides */
  clear() {
    _store.clear()
  },
}
