import { NextRequest, NextResponse } from "next/server"

const FINNHUB_TOKEN = "KSA1gzO1nFSBTe4hKfw0KJvJQhhx_E_e"
const BASE = "https://finnhub.io/api/v1"

/** Detect which Finnhub endpoint to use based on symbol prefix */
function detectType(symbol: string): "forex" | "crypto" | "stock" {
  if (symbol.startsWith("OANDA:")) return "forex"
  if (
    symbol.startsWith("BINANCE:") ||
    symbol.startsWith("BITSTAMP:") ||
    symbol.startsWith("COINBASE:")
  )
    return "crypto"
  return "stock"
}

/** Finnhub supported resolutions: 1, 5, 15, 30, 60, D, W, M — no 240 */
const RESOLUTION_MAP: Record<string, string> = {
  "1": "1",
  "5": "5",
  "15": "15",
  "30": "30",
  "60": "60",
  "240": "60", // 4h mapped to 1h (Finnhub free plan)
  D: "D",
  W: "W",
}

/** How many seconds of history to request per resolution */
const LOOKBACK: Record<string, number> = {
  "1": 2 * 86400,
  "5": 5 * 86400,
  "15": 10 * 86400,
  "30": 20 * 86400,
  "60": 30 * 86400,
  D: 365 * 86400,
  W: 3 * 365 * 86400,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")
  const resParam = searchParams.get("resolution") ?? "D"

  if (!symbol) {
    return NextResponse.json({ bars: [] }, { status: 400 })
  }

  const finnhubRes = RESOLUTION_MAP[resParam] ?? "D"
  const type = detectType(symbol)
  const now = Math.floor(Date.now() / 1000)
  const from = now - (LOOKBACK[finnhubRes] ?? 30 * 86400)

  try {
    const url = `${BASE}/${type}/candle?symbol=${encodeURIComponent(symbol)}&resolution=${finnhubRes}&from=${from}&to=${now}&token=${FINNHUB_TOKEN}`
    const res = await fetch(url, { cache: "no-store" })
    const data = await res.json()

    if (
      !data ||
      data.s !== "ok" ||
      !Array.isArray(data.t) ||
      data.t.length === 0
    ) {
      return NextResponse.json({ bars: [] })
    }

    const bars = (data.t as number[]).map((t: number, i: number) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
    }))

    return NextResponse.json(
      { bars },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      },
    )
  } catch (err) {
    console.error("[finnhub-candles]", err)
    return NextResponse.json({ bars: [] })
  }
}
