import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? "70LHTSY4QJV4SYE5";
const BASE_URL = "https://www.alphavantage.co/query";

// ─── Symbol type detection ────────────────────────────────────────────────────
type SymbolType = "forex" | "crypto" | "stock";

function detectType(symbol: string): SymbolType {
  if (symbol.startsWith("OANDA:")) return "forex";
  if (
    symbol.startsWith("BINANCE:") ||
    symbol.startsWith("BITSTAMP:") ||
    symbol.startsWith("COINBASE:")
  )
    return "crypto";
  return "stock";
}

/** "OANDA:EUR_USD" → { from: "EUR", to: "USD" } */
function parseFxPair(symbol: string): { from: string; to: string } {
  const raw = symbol.split(":")[1]; // e.g. "EUR_USD"
  const [from, to] = raw.split("_");
  return { from, to };
}

/** "BINANCE:BTCUSDT" → { from: "BTC", to: "USD" } */
function parseCryptoPair(symbol: string): { from: string; to: string } {
  const raw = symbol.split(":")[1]; // e.g. "BTCUSDT"
  const from = raw.replace(/USDT?$/, ""); // strip USDT or USD suffix
  return { from, to: "USD" };
}

async function fetchSymbolPrice(symbol: string): Promise<number | null> {
  const type = detectType(symbol);

  try {
    let url: string;

    if (type === "forex") {
      const { from, to } = parseFxPair(symbol);
      url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`;
      const res = await fetch(url, { cache: "no-store" });
      const data: Record<string, unknown> = await res.json();
      if (data?.["Note"] || data?.["Information"]) return null; // rate limited
      const rateBlock = data?.["Realtime Currency Exchange Rate"] as
        | Record<string, string>
        | undefined;
      const rate = rateBlock?.["5. Exchange Rate"];
      return rate ? parseFloat(rate) : null;
    }

    if (type === "crypto") {
      const { from, to } = parseCryptoPair(symbol);
      url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`;
      const res = await fetch(url, { cache: "no-store" });
      const data: Record<string, unknown> = await res.json();
      if (data?.["Note"] || data?.["Information"]) return null;
      const rateBlock = data?.["Realtime Currency Exchange Rate"] as
        | Record<string, string>
        | undefined;
      const rate = rateBlock?.["5. Exchange Rate"];
      return rate ? parseFloat(rate) : null;
    }

    // stock
    url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const data: Record<string, unknown> = await res.json();
    if (data?.["Note"] || data?.["Information"]) return null;
    const quote = data?.["Global Quote"] as Record<string, string> | undefined;
    const price = quote?.["05. price"];
    return price ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

// ─── GET /api/alpha-vantage-prices?symbols=OANDA:EUR_USD,NVDA,... ────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "symbols query param required" },
      { status: 400 },
    );
  }

  // Limit to 5 symbols per request to respect Alpha Vantage rate limits
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const prices: Record<string, number | null> = {};

  for (const sym of symbols) {
    prices[sym] = await fetchSymbolPrice(sym);
    // Small delay between calls to stay within 5 req/min free tier limit
    if (symbols.indexOf(sym) < symbols.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json(
    { prices },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
