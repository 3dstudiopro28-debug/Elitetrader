/**
 * Gera um numero especifico de P/Ls que somam um valor alvo,
 * garantindo que pelo menos uma operacao tem um resultado oposto ao alvo.
 *
 * @param targetPnl  - O lucro/prejuizo total a ser alcancado.
 * @param numTrades  - O numero de operacoes a gerar (minimo 2, default 3).
 * @returns            Array de valores de P/L arredondados a 2 casas.
 */
export function generateGhostPnl(targetPnl: number, numTrades: number = 3): number[] {
  if (numTrades < 2) {
    throw new Error("O numero de operacoes deve ser pelo menos 2 para garantir um resultado oposto.")
  }

  if (targetPnl === 0) {
    return Array(numTrades).fill(0)
  }

  const pnlValues: number[] = []
  let remainingPnl = targetPnl

  // 1. Gerar a operacao "isca" com resultado oposto.
  // Se o alvo e positivo (ex: +60), a isca e negativa.
  // Se o alvo e negativo (ex: -50), a isca e positiva.
  const isTargetPositive = targetPnl >= 0
  const baitMultiplier   = isTargetPositive ? -1 : 1

  // A isca tera um valor aleatorio entre 10% e 50% do valor alvo (min $1.00)
  const baitMagnitude = Math.max(1.00, Math.random() * Math.abs(targetPnl) * 0.5)
  const baitPnl       = baitMultiplier * baitMagnitude

  pnlValues.push(baitPnl)
  remainingPnl -= baitPnl

  // 2. Dividir o restante pelas outras N-1 operacoes.
  // Para numTrades = 3, esta parte so corre uma vez.
  for (let i = 0; i < numTrades - 2; i++) {
    const splitRatio   = Math.random()
    const partialPnl   = remainingPnl * splitRatio
    pnlValues.push(partialPnl)
    remainingPnl -= partialPnl
  }

  // 3. A ultima operacao fica com o que sobrou para garantir a soma exacta.
  pnlValues.push(remainingPnl)

  // 4. Arredondar e ajustar para garantir precisao absoluta.
  const finalPnlValues = pnlValues.map(p => parseFloat(p.toFixed(2)))
  const currentSum     = finalPnlValues.reduce((acc, val) => acc + val, 0)
  const roundingDiff   = parseFloat((targetPnl - currentSum).toFixed(2))

  // Adiciona a diferenca do arredondamento ao ultimo elemento.
  finalPnlValues[finalPnlValues.length - 1] =
    parseFloat((finalPnlValues[finalPnlValues.length - 1] + roundingDiff).toFixed(2))

  return finalPnlValues
}