"use client"

import { useEffect, useRef, useCallback } from "react"
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts"

interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface LiveTradingChartProps {
  marketSymbol: string
  interval: string
  currentPrice: number
  digits?: number
  height?: string
}

/**
 * Gera candles sintéticos realistas quando a Alpha Vantage não retorna histórico
 * (ex: pares forex/metais no plano gratuito).
 * Usa o preço actual como ponto de ancoragem e simula volatilidade coerente
 * com o intervalo pedido.
 */
function generateSyntheticCandles(currentPrice: number, interval: string): Bar[] {
  const BARS_PER_INTERVAL: Record<string, { bars: number; stepSec: number }> = {
    "1":   { bars: 300, stepSec: 60 },
    "5":   { bars: 288, stepSec: 300 },
    "15":  { bars: 192, stepSec: 900 },
    "30":  { bars: 192, stepSec: 1800 },
    "60":  { bars: 168, stepSec: 3600 },
    "240": { bars: 120, stepSec: 14400 },
    D:     { bars: 365, stepSec: 86400 },
    W:     { bars: 104, stepSec: 604800 },
  }
  const cfg = BARS_PER_INTERVAL[interval] ?? BARS_PER_INTERVAL.D
  const volatility = currentPrice * 0.006 // 0.6% por barra
  const now = Math.floor(Date.now() / 1000)
  const bars: Bar[] = []

  // Trabalha para trás a partir do preço actual
  let price = currentPrice
  for (let i = cfg.bars; i >= 0; i--) {
    const time = now - i * cfg.stepSec
    const move = (Math.random() - 0.50) * volatility
    const open = price
    const close = Math.max(open * 0.985, open + move)
    const wick = Math.random() * volatility * 0.4
    bars.push({
      time,
      open,
      high: Math.max(open, close) + wick,
      low:  Math.min(open, close) - wick,
      close,
    })
    price = close
  }

  // Fixa o último candle exactamente no preço actual
  const last = bars[bars.length - 1]
  last.close = currentPrice
  last.high = Math.max(last.high, currentPrice)
  last.low  = Math.min(last.low,  currentPrice)
  return bars
}

/** Map UI intervals → Alpha Vantage resolution (240 unsupported, use 60) */
const RESOLUTION_MAP: Record<string, string> = {
  "1": "1",
  "5": "5",
  "15": "15",
  "30": "30",
  "60": "60",
  "240": "60",
  D: "D",
  W: "W",
}

export default function LiveTradingChart({
  marketSymbol,
  interval,
  currentPrice,
  digits = 2,
  height = "100%",
}: LiveTradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const lastBarRef = useRef<Bar | null>(null)
  const priceRef = useRef(currentPrice)
  useEffect(() => { priceRef.current = currentPrice }, [currentPrice])

  // ── Initialize chart — pequeno delay para o flex terminar o layout ───────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Aguarda 1 frame para o browser calcular as dimensões do container
    const frameId = requestAnimationFrame(() => {
      if (!el || chartRef.current) return

      const w = el.offsetWidth  || 800
      const h = el.offsetHeight || 420

      const chart = createChart(el, {
        width: w,
        height: h,
        layout: {
          background: { type: ColorType.Solid, color: "#0d1120" },
          textColor: "rgba(148,163,184,0.9)",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(51,65,85,0.35)" },
          horzLines: { color: "rgba(51,65,85,0.35)" },
        },
        timeScale: {
          borderColor: "rgba(71,85,105,0.5)",
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
        },
        rightPriceScale: {
          borderColor: "rgba(71,85,105,0.5)",
          minimumWidth: 72,
        },
        crosshair: { mode: 1 },
      })

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        priceFormat: {
          type: "price",
          precision: digits,
          minMove: 1 / Math.pow(10, digits),
        },
      })

      chartRef.current = chart
      seriesRef.current = series

      // Ajusta ao resize do container
      const ro = new ResizeObserver(() => {
        if (!chartRef.current || !el) return
        const nw = el.offsetWidth
        const nh = el.offsetHeight
        if (nw > 0 && nh > 0) chartRef.current.resize(nw, nh)
      })
      ro.observe(el)
      ;(chart as unknown as { _ro?: ResizeObserver })._ro = ro

      // Buscar dados imediatamente após criar o chart
      doFetch(series, marketSymbolRef.current, intervalRef.current)
    })

    return () => {
      cancelAnimationFrame(frameId)
      if (chartRef.current) {
        ;(chartRef.current as unknown as { _ro?: ResizeObserver })._ro?.disconnect()
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
        lastBarRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refs para garantir valores actuais dentro de doFetch sem precisar de deps
  const marketSymbolRef = useRef(marketSymbol)
  const intervalRef = useRef(interval)
  useEffect(() => { marketSymbolRef.current = marketSymbol }, [marketSymbol])
  useEffect(() => { intervalRef.current = interval }, [interval])

  // ── Fetch de candles (recebe series explicitamente para evitar race condition) ─
  const doFetch = useCallback(async (
    series: ISeriesApi<"Candlestick">,
    sym: string,
    res: string,
  ) => {
    const resolution = RESOLUTION_MAP[res] ?? "D"
    try {
      const r = await fetch(
        `/api/alpha-vantage-quote?symbol=${encodeURIComponent(sym)}&resolution=${resolution}`,
        { cache: "no-store" },
      )
      const json = await r.json()

      // Se Alpha Vantage não retornou dados (plano free não suporta forex/metais),
      // gera candles sintéticos ancorados no preço actual
      const sourceBars: Bar[] = (json.bars?.length > 0)
        ? (json.bars as Bar[])
        : generateSyntheticCandles(priceRef.current > 0 ? priceRef.current : 1, res)

      lastBarRef.current = sourceBars[sourceBars.length - 1]
      const chartData: CandlestickData[] = sourceBars.map((b) => ({
        time: b.time as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
      series.setData(chartData)
      chartRef.current?.timeScale().fitContent()

      // Actualizar o último candle com o preço live actual
      const p = priceRef.current
      if (p > 0 && lastBarRef.current) {
        const last = lastBarRef.current
        series.update({
          time: last.time as UTCTimestamp,
          open: last.open,
          high: Math.max(last.high, p),
          low: Math.min(last.low, p),
          close: p,
        })
        lastBarRef.current = { ...last, high: Math.max(last.high, p), low: Math.min(last.low, p), close: p }
      }
    } catch {
      // Fallback: dados sintéticos mesmo em caso de erro de rede
      if (priceRef.current > 0) {
        const synthBars = generateSyntheticCandles(priceRef.current, res)
        lastBarRef.current = synthBars[synthBars.length - 1]
        const fallbackData: CandlestickData[] = synthBars.map((b) => ({
          time: b.time as UTCTimestamp,
          open: b.open, high: b.high, low: b.low, close: b.close,
        }))
        series.setData(fallbackData)
        chartRef.current?.timeScale().fitContent()
      }
    }
  }, [])

  // Re-fetch quando muda símbolo ou intervalo (chart já montado)
  useEffect(() => {
    if (!seriesRef.current) return
    lastBarRef.current = null
    doFetch(seriesRef.current, marketSymbol, interval)
  }, [marketSymbol, interval, doFetch])

  // ── Actualização real-time ────────────────────────────────────────────────────
  useEffect(() => {
    const last = lastBarRef.current
    if (!last || !seriesRef.current || currentPrice <= 0) return

    const updatedHigh = Math.max(last.high, currentPrice)
    const updatedLow  = Math.min(last.low,  currentPrice)
    seriesRef.current.update({
      time: last.time as UTCTimestamp,
      open: last.open,
      high: updatedHigh,
      low:  updatedLow,
      close: currentPrice,
    })
    lastBarRef.current = { ...last, high: updatedHigh, low: updatedLow, close: currentPrice }
  }, [currentPrice])

  return <div ref={containerRef} style={{ width: "100%", height }} />
}
