/**
 * Store em memoria no servidor para operacoes fantasma pendentes.
 *
 * Dois modos:
 *  - "close_open":  o cliente tem posicoes abertas → envia apenas os P/Ls,
 *                   o cliente fecha as posicoes existentes com esses valores.
 *  - "add_closed":  o cliente nao tem posicoes abertas → envia operacoes completas,
 *                   o cliente adiciona-as directamente ao historico.
 *
 * Consume-once: limpa apos o cliente ir buscar.
 */

export interface GhostTrade {
  id:          string
  symbol:      string
  icon:        string
  type:        "buy" | "sell"
  lots:        number
  amount:      number
  leverage:    number
  openPrice:   number
  closePrice:  number
  pnl:         number
  openedAt:    string
  closedAt:    string
  closeReason: string
}

export interface GhostPayload {
  /** Modo de entrega */
  mode: "close_open" | "add_closed"
  /**
   * close_open: array de P/Ls para fechar as posicoes abertas do cliente.
   * Gerado para N posicoes; se o cliente tiver diferente numero, usar totalDelta.
   */
  pnls?: number[]
  /**
   * Delta total do saldo — a soma de todos os PnLs deve igualar este valor.
   * O cliente usa isto quando tem 1 posicao (fecha com PnL = totalDelta)
   * ou quando quer recalcular a distribuicao com base no numero real de posicoes.
   */
  totalDelta?: number
  /**
   * add_closed: operacoes completas para adicionar ao historico
   */
  trades?: GhostTrade[]
}

declare global {
  // eslint-disable-next-line no-var
  var __ghostPendingStore: Map<string, GhostPayload> | undefined
}

const _store: Map<string, GhostPayload> =
  global.__ghostPendingStore ?? new Map<string, GhostPayload>()

if (!global.__ghostPendingStore) {
  global.__ghostPendingStore = _store
}

export const ghostPendingStore = {
  /** Guardar payload para um utilizador (sobrescreve se ja houver) */
  set(userId: string, payload: GhostPayload) {
    _store.set(userId, payload)
  },

  /** Ler e limpar o payload (consume-once) */
  consume(userId: string): GhostPayload | null {
    const payload = _store.get(userId) ?? null
    _store.delete(userId)
    return payload
  },

  hasPending(userId: string): boolean {
    return _store.has(userId)
  },
}