import { NextRequest, NextResponse } from "next/server";

const ALPHA_VANTAGE_API_KEY = "70LHTSY4QJV4SYE5";
const BASE = "https://www.alphavantage.co/query";

/** Detect which Alpha Vantage function to use based on symbol prefix */
function detectType(symbol: string): "GLOBAL_QUOTE" {
  return "GLOBAL_QUOTE";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ bars: [] }, { status: 400 });
  }

  try {
    const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!data || !data["Global Quote"] || !data["Global Quote"]["05. price"]) {
      return NextResponse.json({ bars: [] });
    }

    const price = parseFloat(data["Global Quote"]["05. price"]);

    return NextResponse.json(
      { price },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    console.error("[alpha-vantage-candles]", err);
    return NextResponse.json({ bars: [] });
  }
}
