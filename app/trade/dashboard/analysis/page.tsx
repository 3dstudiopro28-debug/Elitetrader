"use client"

import { useState, useCallback } from "react"
import { Search, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const AV_KEY = "7JQA9H0LSMMPFTQW"

// ─── Asset catalogue ──────────────────────────────────────────────────────────
type AssetDef =
  | { name: string; digits: number; type: "forex";     from: string; to: string }
  | { name: string; digits: number; type: "stock";     stockSymbol: string }
  | { name: string; digits: number; type: "crypto";    cryptoSymbol: string; market: string }
  | { name: string; digits: number; type: "commodity"; commFunc: string }

const ASSETS: Record<string, AssetDef> = {
  // Forex
  EURUSD:  { name: "Euro / Dólar",       digits: 5, type: "forex",     from: "EUR", to: "USD" },
  GBPUSD:  { name: "Libra / Dólar",      digits: 5, type: "forex",     from: "GBP", to: "USD" },
  USDJPY:  { name: "Dólar / Iene",       digits: 3, type: "forex",     from: "USD", to: "JPY" },
  USDCHF:  { name: "Dólar / Franco",     digits: 5, type: "forex",     from: "USD", to: "CHF" },
  AUDUSD:  { name: "AUD / Dólar",        digits: 5, type: "forex",     from: "AUD", to: "USD" },
  USDCAD:  { name: "Dólar / CAD",        digits: 5, type: "forex",     from: "USD", to: "CAD" },
  NZDUSD:  { name: "NZD / Dólar",        digits: 5, type: "forex",     from: "NZD", to: "USD" },
  EURGBP:  { name: "Euro / Libra",       digits: 5, type: "forex",     from: "EUR", to: "GBP" },
  EURJPY:  { name: "Euro / Iene",        digits: 3, type: "forex",     from: "EUR", to: "JPY" },
  GBPJPY:  { name: "Libra / Iene",       digits: 3, type: "forex",     from: "GBP", to: "JPY" },
  // Metais (via FX endpoint AV)
  XAUUSD:  { name: "Ouro / Dólar",       digits: 2, type: "forex",     from: "XAU", to: "USD" },
  XAGUSD:  { name: "Prata / Dólar",      digits: 3, type: "forex",     from: "XAG", to: "USD" },
  // Commodities
  WTIUSD:  { name: "Crude Oil WTI",      digits: 2, type: "commodity", commFunc: "WTI" },
  BRENTUSD:{ name: "Brent Crude Oil",    digits: 2, type: "commodity", commFunc: "BRENT" },
  NATGAS:  { name: "Gás Natural",        digits: 3, type: "commodity", commFunc: "NATURAL_GAS" },
  COPPER:  { name: "Cobre",              digits: 3, type: "commodity", commFunc: "COPPER" },
  WHEAT:   { name: "Trigo",             digits: 2, type: "commodity", commFunc: "WHEAT" },
  CORN:    { name: "Milho",             digits: 2, type: "commodity", commFunc: "CORN" },
  // Cripto
  BTCUSD:  { name: "Bitcoin / Dólar",    digits: 2, type: "crypto",    cryptoSymbol: "BTC", market: "USD" },
  ETHUSD:  { name: "Ethereum / Dólar",   digits: 2, type: "crypto",    cryptoSymbol: "ETH", market: "USD" },
  SOLUSD:  { name: "Solana / Dólar",     digits: 2, type: "crypto",    cryptoSymbol: "SOL", market: "USD" },
  XRPUSD:  { name: "XRP / Dólar",        digits: 4, type: "crypto",    cryptoSymbol: "XRP", market: "USD" },
  BNBUSD:  { name: "BNB / Dólar",        digits: 2, type: "crypto",    cryptoSymbol: "BNB", market: "USD" },
  // Ações
  AAPL:    { name: "Apple Inc.",          digits: 2, type: "stock",     stockSymbol: "AAPL" },
  TSLA:    { name: "Tesla Inc.",          digits: 2, type: "stock",     stockSymbol: "TSLA" },
  NVDA:    { name: "NVIDIA",             digits: 2, type: "stock",     stockSymbol: "NVDA" },
  MSFT:    { name: "Microsoft",          digits: 2, type: "stock",     stockSymbol: "MSFT" },
  AMZN:    { name: "Amazon",             digits: 2, type: "stock",     stockSymbol: "AMZN" },
  META:    { name: "Meta Platforms",     digits: 2, type: "stock",     stockSymbol: "META" },
  GOOGL:   { name: "Alphabet (Google)",  digits: 2, type: "stock",     stockSymbol: "GOOGL" },
  NFLX:    { name: "Netflix",            digits: 2, type: "stock",     stockSymbol: "NFLX" },
  JPM:     { name: "JPMorgan Chase",     digits: 2, type: "stock",     stockSymbol: "JPM" },
}

// ─── Alpha Vantage fetch → returns sorted closes/highs/lows ──────────────────
async function fetchCandles(symbol: string): Promise<{ closes: number[]; highs: number[]; lows: number[] }> {
  const asset = ASSETS[symbol]
  if (!asset) throw new Error("Ativo não encontrado")

  let url = ""
  if (asset.type === "forex") {
    url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${asset.from}&to_symbol=${asset.to}&outputsize=compact&apikey=${AV_KEY}`
  } else if (asset.type === "stock") {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${asset.stockSymbol}&outputsize=compact&apikey=${AV_KEY}`
  } else if (asset.type === "crypto") {
    url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${asset.cryptoSymbol}&market=${asset.market}&apikey=${AV_KEY}`
  } else {
    // Commodity: WTI, BRENT, NATURAL_GAS, COPPER, WHEAT, CORN
    url = `https://www.alphavantage.co/query?function=${asset.commFunc}&interval=monthly&apikey=${AV_KEY}`
  }

  const res = await fetch(url)
  const data = await res.json()

  if (data["Note"] || data["Information"]) {
    throw new Error("Limite de requisições Alpha Vantage atingido. Aguarde 1 minuto.")
  }

  // Commodity: uses "data" key → [{date, value}]
  if ((ASSETS[symbol] as { type: string }).type === "commodity") {
    const rows: { date: string; value: string }[] = data["data"] ?? []
    if (!rows.length) throw new Error("Sem dados para este ativo.")
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
    const closes = sorted.map(r => parseFloat(r.value)).filter(v => !isNaN(v))
    // For commodities, use closes as highs/lows approximation
    return { closes, highs: closes, lows: closes }
  }

  // Extract the time series key
  const tsKey =
    data["Time Series FX (Daily)"]
    ?? data["Time Series (Daily)"]
    ?? data["Time Series (Digital Currency Daily)"]

  if (!tsKey) throw new Error("Sem dados para este ativo.")

  // Sort dates ascending
  const dates = Object.keys(tsKey).sort()
  const closes: number[] = []
  const highs:  number[] = []
  const lows:   number[] = []

  for (const d of dates) {
    const bar = tsKey[d]
    if ((asset as { type: string }).type === "crypto") {
      closes.push(parseFloat(bar["4a. close (USD)"] ?? bar["4. close"]))
      highs.push(parseFloat(bar["2a. high (USD)"]  ?? bar["2. high"]))
      lows.push(parseFloat(bar["3a. low (USD)"]    ?? bar["3. low"]))
    } else {
      closes.push(parseFloat(bar["4. close"]))
      highs.push(parseFloat(bar["2. high"]))
      lows.push(parseFloat(bar["3. low"]))
    }
  }

  return { closes, highs, lows }
}

// ─── Technical indicator calculations ────────────────────────────────────────
function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const k = 2 / (period + 1)
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
  }
  return ema
}

function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  const rs = gains / (losses || 0.0001)
  return 100 - 100 / (1 + rs)
}

function calcMACD(closes: number[]): { macd: number; signal: number } | null {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  if (ema12 == null || ema26 == null) return null
  const macdLine = ema12 - ema26
  // Approximate signal as 9-period EMA of last macdLine values
  const macdSeries: number[] = []
  for (let i = 26; i <= closes.length; i++) {
    const e12 = calcEMA(closes.slice(0, i), 12)
    const e26 = calcEMA(closes.slice(0, i), 26)
    if (e12 != null && e26 != null) macdSeries.push(e12 - e26)
  }
  const signal = calcEMA(macdSeries, 9)
  if (signal == null) return null
  return { macd: macdLine, signal }
}

function calcStochastic(highs: number[], lows: number[], closes: number[], period = 14): { k: number; d: number } | null {
  if (closes.length < period) return null
  const recentH = highs.slice(-period)
  const recentL = lows.slice(-period)
  const hh = Math.max(...recentH)
  const ll = Math.min(...recentL)
  const k = hh === ll ? 50 : ((closes[closes.length - 1] - ll) / (hh - ll)) * 100
  // D = 3-period SMA of K (simplified: use last 3 K values)
  const kValues: number[] = []
  for (let i = period; i <= closes.length; i++) {
    const h = highs.slice(i - period, i)
    const l = lows.slice(i - period, i)
    const hMax = Math.max(...h), lMin = Math.min(...l)
    kValues.push(hMax === lMin ? 50 : ((closes[i - 1] - lMin) / (hMax - lMin)) * 100)
  }
  const d = calcSMA(kValues, 3) ?? k
  return { k, d }
}

function calcWilliamsR(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period) return null
  const recentH = highs.slice(-period)
  const recentL = lows.slice(-period)
  const hh = Math.max(...recentH)
  const ll = Math.min(...recentL)
  if (hh === ll) return -50
  return ((hh - closes[closes.length - 1]) / (hh - ll)) * -100
}

function calcCCI(highs: number[], lows: number[], closes: number[], period = 20): number | null {
  if (closes.length < period) return null
  const tp = closes.map((c, i) => (c + highs[i] + lows[i]) / 3)
  const recentTp = tp.slice(-period)
  const mean = recentTp.reduce((a, b) => a + b, 0) / period
  const mad = recentTp.reduce((a, b) => a + Math.abs(b - mean), 0) / period
  if (mad === 0) return 0
  return (recentTp[recentTp.length - 1] - mean) / (0.015 * mad)
}

// ─── Signal generator ─────────────────────────────────────────────────────────
type Signal = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell"

function rsiSignal(rsi: number): Signal {
  if (rsi < 25) return "strong_buy"
  if (rsi < 40) return "buy"
  if (rsi > 75) return "strong_sell"
  if (rsi > 60) return "sell"
  return "neutral"
}

function macdSignal(macd: number, signal: number): Signal {
  const diff = macd - signal
  if (diff > 0.001) return "buy"
  if (diff < -0.001) return "sell"
  return "neutral"
}

function stochSignal(k: number, d: number): Signal {
  if (k < 20 && d < 20) return k > d ? "buy" : "strong_buy"
  if (k > 80 && d > 80) return k < d ? "sell" : "strong_sell"
  return "neutral"
}

function williamsSignal(wr: number): Signal {
  if (wr < -80) return "buy"
  if (wr > -20) return "sell"
  return "neutral"
}

function cciSignal(cci: number): Signal {
  if (cci < -150) return "strong_buy"
  if (cci < -50) return "buy"
  if (cci > 150) return "strong_sell"
  if (cci > 50) return "sell"
  return "neutral"
}

function maSignal(price: number, ma: number): Signal {
  const diff = (price - ma) / ma
  if (diff > 0.005) return "buy"
  if (diff < -0.005) return "sell"
  return "neutral"
}

function aggregateSignals(signals: Signal[]): { signal: Signal; buys: number; sells: number; neutrals: number } {
  const buys    = signals.filter(s => s === "buy" || s === "strong_buy").length
  const sells   = signals.filter(s => s === "sell" || s === "strong_sell").length
  const neutrals = signals.filter(s => s === "neutral").length
  const total = signals.length
  const net = buys - sells
  let signal: Signal = "neutral"
  if (net >= Math.ceil(total * 0.5)) signal = "strong_buy"
  else if (net >= Math.ceil(total * 0.25)) signal = "buy"
  else if (net <= -Math.ceil(total * 0.5)) signal = "strong_sell"
  else if (net <= -Math.ceil(total * 0.25)) signal = "sell"
  return { signal, buys, sells, neutrals }
}

interface AnalysisResult {
  symbol: string
  price: number
  change: number
  technical: { signal: Signal; buys: number; sells: number; neutrals: number }
  movingAvg: { signal: Signal; buys: number; sells: number; neutrals: number }
  summary:   { signal: Signal; buys: number; sells: number; neutrals: number }
  indicators: { label: string; value: string; signal: Signal }[]
  maRows: { label: string; value: string; signal: Signal }[]
}

// ─── Gauge SVG component ─────────────────────────────────────────────────────
const SIGNAL_META: Record<Signal, { label: string; color: string; angle: number }> = {
  strong_sell: { label: "Venda Forte",   color: "#ef4444", angle: -90 },
  sell:        { label: "Vender",        color: "#f87171", angle: -45 },
  neutral:     { label: "Neutro",        color: "#6b7280", angle: 0   },
  buy:         { label: "Comprar",       color: "#4ade80", angle: 45  },
  strong_buy:  { label: "Compra Forte",  color: "#22c55e", angle: 90  },
}

function Gauge({ signal, title, buys, sells, neutrals, size = "md" }: {
  signal: Signal; title: string; buys: number; sells: number; neutrals: number; size?: "sm" | "md" | "lg"
}) {
  const meta = SIGNAL_META[signal]
  const r = size === "lg" ? 70 : size === "md" ? 52 : 40
  const cx = r + 10, cy = r + 10
  const total = buys + sells + neutrals || 1

  // Arc helper: angles from 180° (left) to 0° (right), semicircle
  function arc(startDeg: number, endDeg: number, radius: number) {
    const toRad = (d: number) => (d * Math.PI) / 180
    const x1 = cx + radius * Math.cos(toRad(180 - startDeg))
    const y1 = cy - radius * Math.sin(toRad(180 - startDeg))
    const x2 = cx + radius * Math.cos(toRad(180 - endDeg))
    const y2 = cy - radius * Math.sin(toRad(180 - endDeg))
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  // Needle: angle 0° = far left (strong sell), 180° = far right (strong buy)
  const needleAngleDeg = ((meta.angle + 90) / 180) * 180 // maps [-90..90] → [0..180]
  const needleRad = (needleAngleDeg * Math.PI) / 180
  const needleLen = r * 0.75
  const nx = cx + needleLen * Math.cos(Math.PI - needleRad)
  const ny = cy - needleLen * Math.sin(Math.PI - needleRad)

  const svgSize = (r + 10) * 2

  return (
    <div className="flex flex-col items-center gap-3">
      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
      <svg width={svgSize} height={r + 18} viewBox={`0 0 ${svgSize} ${r + 18}`}>
        {/* Background track */}
        <path d={arc(0, 180, r)} stroke="#1e293b" strokeWidth={size === "lg" ? 14 : 10} fill="none" />
        {/* Sell zone (red) */}
        <path d={arc(0, 60, r)} stroke="#ef4444" strokeWidth={size === "lg" ? 14 : 10} fill="none" opacity={0.7} />
        {/* Sell-mild zone */}
        <path d={arc(60, 90, r)} stroke="#f87171" strokeWidth={size === "lg" ? 14 : 10} fill="none" opacity={0.5} />
        {/* Neutral zone */}
        <path d={arc(75, 105, r)} stroke="#6b7280" strokeWidth={size === "lg" ? 14 : 10} fill="none" opacity={0.4} />
        {/* Buy-mild zone */}
        <path d={arc(90, 120, r)} stroke="#4ade80" strokeWidth={size === "lg" ? 14 : 10} fill="none" opacity={0.5} />
        {/* Buy zone (green) */}
        <path d={arc(120, 180, r)} stroke="#22c55e" strokeWidth={size === "lg" ? 14 : 10} fill="none" opacity={0.7} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={size === "lg" ? 2.5 : 1.8} strokeLinecap="round" />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={size === "lg" ? 4 : 3} fill="#94a3b8" />
      </svg>
      {/* Signal badge */}
      <span className={cn(
        "px-4 py-1 rounded-full text-sm font-bold",
        signal === "strong_buy"  ? "bg-green-500/20 text-green-400" :
        signal === "buy"         ? "bg-green-500/15 text-green-400" :
        signal === "strong_sell" ? "bg-red-500/20 text-red-400" :
        signal === "sell"        ? "bg-red-500/15 text-red-400" :
                                   "bg-gray-500/20 text-gray-400"
      )}>{meta.label}</span>
      <div className="flex gap-3 text-[11px]">
        <span className="text-red-400">{sells} Vender</span>
        <span className="text-gray-400">{neutrals} Neutro</span>
        <span className="text-green-400">{buys} Comprar</span>
      </div>
    </div>
  )
}

// ─── Signal pill ─────────────────────────────────────────────────────────────
function SignalPill({ signal }: { signal: Signal }) {
  const meta = SIGNAL_META[signal]
  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
      signal === "strong_buy"  ? "bg-green-500/20 text-green-400" :
      signal === "buy"         ? "bg-green-500/15 text-green-400" :
      signal === "strong_sell" ? "bg-red-500/20 text-red-400" :
      signal === "sell"        ? "bg-red-500/15 text-red-400" :
                                 "bg-gray-500/20 text-gray-400"
    )}>{meta.label}</span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const [query, setQuery]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const handleQuery = (q: string) => {
    setQuery(q)
    if (!q) { setSuggestions([]); return }
    const up = q.toUpperCase()
    setSuggestions(Object.keys(ASSETS).filter(s => s.startsWith(up) || ASSETS[s].name.toUpperCase().includes(up)).slice(0, 6))
  }

  const analyse = useCallback(async (symbol: string) => {
    const sym = symbol.toUpperCase()
    const asset = ASSETS[sym]
    if (!asset) { setError(`Ativo "${symbol}" não encontrado. Tente: EURUSD, BTCUSD, AAPL…`); return }
    setError(null)
    setLoading(true)
    setResult(null)
    setSuggestions([])
    setQuery(sym)

    try {
      const { closes, highs, lows } = await fetchCandles(sym)

      if (!closes.length) {
        setError("Sem dados suficientes para este ativo. Tente outro.")
        setLoading(false)
        return
      }

      const price = closes[closes.length - 1]
      const prevPrice = closes[closes.length - 2] ?? price
      const change = ((price - prevPrice) / prevPrice) * 100

      // ── Technical indicators ────────────────────────────────────────────
      const rsi    = calcRSI(closes)
      const macdR  = calcMACD(closes)
      const stoch  = calcStochastic(highs, lows, closes)
      const wr     = calcWilliamsR(highs, lows, closes)
      const cci    = calcCCI(highs, lows, closes)

      const techIndicators: { label: string; value: string; signal: Signal }[] = []
      if (rsi   != null) techIndicators.push({ label: "RSI (14)",              value: rsi.toFixed(2),    signal: rsiSignal(rsi) })
      if (macdR != null) techIndicators.push({ label: "MACD (12,26,9)",        value: macdR.macd.toFixed(asset.digits), signal: macdSignal(macdR.macd, macdR.signal) })
      if (stoch  != null) techIndicators.push({ label: "Estocástico %K",       value: stoch.k.toFixed(2), signal: stochSignal(stoch.k, stoch.d) })
      if (stoch  != null) techIndicators.push({ label: "Estocástico %D",       value: stoch.d.toFixed(2), signal: stochSignal(stoch.k, stoch.d) })
      if (wr     != null) techIndicators.push({ label: "Williams %R",           value: wr.toFixed(2),     signal: williamsSignal(wr) })
      if (cci    != null) techIndicators.push({ label: "CCI (20)",              value: cci.toFixed(2),    signal: cciSignal(cci) })

      // ── Moving averages ─────────────────────────────────────────────────
      const periods = [10, 20, 50, 100, 200]
      const maRows: { label: string; value: string; signal: Signal }[] = []
      for (const p of periods) {
        const sma = calcSMA(closes, p)
        const ema = calcEMA(closes, p)
        if (sma != null) maRows.push({ label: `SMA ${p}`, value: sma.toFixed(asset.digits), signal: maSignal(price, sma) })
        if (ema != null) maRows.push({ label: `EMA ${p}`, value: ema.toFixed(asset.digits), signal: maSignal(price, ema) })
      }

      const technical = aggregateSignals(techIndicators.map(i => i.signal))
      const movingAvg = aggregateSignals(maRows.map(i => i.signal))
      const summary   = aggregateSignals([...techIndicators.map(i => i.signal), ...maRows.map(i => i.signal)])

      setResult({ symbol: sym, price, change, technical, movingAvg, summary, indicators: techIndicators, maRows })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar dados. Verifique a ligação e tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  const isUp = (result?.change ?? 0) >= 0

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-6 bg-accent rounded-full inline-block" />
          Análise I.A.
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sinais técnicos em tempo real — RSI, MACD, Médias Móveis, Estocástico e mais.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden focus-within:border-accent transition-colors">
          <Search className="w-4 h-4 text-muted-foreground ml-4 flex-shrink-0" />
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && query.trim()) analyse(query.trim()) }}
            placeholder="Pesquisar ativo: EURUSD, BTCUSD, AAPL…"
            className="flex-1 px-3 py-3 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
          />
          <button
            onClick={() => query.trim() && analyse(query.trim())}
            disabled={loading}
            className="px-4 py-3 bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Analisar"}
          </button>
        </div>
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
            {suggestions.map(s => (
              <button key={s} onClick={() => analyse(s)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors text-left">
                <span className="font-semibold text-foreground text-sm">{s}</span>
                <span className="text-xs text-muted-foreground">{ASSETS[s].name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick symbols — grouped */}
      <div className="space-y-2">
        {[
          { label: "Forex",       symbols: ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD"] },
          { label: "Metais",      symbols: ["XAUUSD","XAGUSD","COPPER"] },
          { label: "Commodities", symbols: ["WTIUSD","BRENTUSD","NATGAS","WHEAT","CORN"] },
          { label: "Cripto",      symbols: ["BTCUSD","ETHUSD","SOLUSD","XRPUSD","BNBUSD"] },
          { label: "Ações",       symbols: ["AAPL","TSLA","NVDA","MSFT","AMZN","META","GOOGL","NFLX","JPM"] },
        ].map(group => (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16 flex-shrink-0">{group.label}</span>
            {group.symbols.map(s => (
              <button key={s} onClick={() => analyse(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  result?.symbol === s
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
                )}>
                {s}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-8 bg-card/50 rounded-lg animate-pulse w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-52 bg-card/50 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">

          {/* Asset header */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{result.symbol}</h2>
              <p className="text-sm text-muted-foreground">{ASSETS[result.symbol]?.name}</p>
            </div>
            <div className="flex-1" />
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {result.price.toFixed(ASSETS[result.symbol]?.digits ?? 2)}
              </p>
              <p className={cn("text-sm font-semibold flex items-center justify-end gap-1", isUp ? "text-green-400" : "text-red-400")}>
                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isUp ? "+" : ""}{result.change.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
              <Gauge signal={result.technical.signal} title="Indicadores técnicos"
                buys={result.technical.buys} sells={result.technical.sells} neutrals={result.technical.neutrals} size="md" />
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
              <Gauge signal={result.summary.signal} title="Resumo"
                buys={result.summary.buys} sells={result.summary.sells} neutrals={result.summary.neutrals} size="lg" />
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
              <Gauge signal={result.movingAvg.signal} title="Médias Móveis"
                buys={result.movingAvg.buys} sells={result.movingAvg.sells} neutrals={result.movingAvg.neutrals} size="md" />
            </div>
          </div>

          {/* Details tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Technical indicators table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Indicadores Técnicos</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Indicador</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Valor</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Sinal</th>
                  </tr>
                </thead>
                <tbody>
                  {result.indicators.map(ind => (
                    <tr key={ind.label} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-foreground font-medium">{ind.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{ind.value}</td>
                      <td className="px-4 py-2.5 text-right"><SignalPill signal={ind.signal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Moving averages table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Médias Móveis</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">Média</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Valor</th>
                    <th className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Sinal</th>
                  </tr>
                </thead>
                <tbody>
                  {result.maRows.map(row => (
                    <tr key={row.label} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-foreground font-medium">{row.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.value}</td>
                      <td className="px-4 py-2.5 text-right"><SignalPill signal={row.signal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-muted-foreground text-center border-t border-border/30 pt-4">
            ⚠️ Esta análise é baseada em indicadores técnicos históricos e não constitui conselho financeiro. Invista com responsabilidade.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Pesquise um ativo para começar</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Digite o símbolo de um ativo (ex: EURUSD, BTCUSD, AAPL) e obtenha análise técnica
            em tempo real com RSI, MACD, Médias Móveis e mais.
          </p>
        </div>
      )}
    </div>
  )
}
