"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Star,
  Search,
  X,
  Plus,
  Minus,
  Maximize2,
  CheckCircle2,
  MoonStar,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tradeStore } from "@/lib/trade-store";
import { notificationStore } from "@/lib/notification-store";
import { priceStore } from "@/lib/price-store";
import { accountStore, DEMO_START_BALANCE } from "@/lib/account-store";

// ─── Util: verificar se é fim de semana ──────────────────────────────────────
function isWeekend(): boolean {
  const day = new Date().getDay(); // 0=Dom, 6=Sáb
  return day === 0 || day === 6;
}

// ─── Mapa de bandeiras por código de moeda ──────────────────────────────────
const CURRENCY_FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  NZD: "🇳🇿",
  XAU: "🥇",
  XAG: "🥈",
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
  XRP: "✕",
  BNB: "🔶",
  ADA: "🔵",
};

/** Converte um símbolo de par (ex. EURUSD) num array [baseFlag, quoteFlag] */
function getPairFlags(symbol: string): [string, string] | null {
  // Tentar match de 6 caracteres (ex. EURUSD → EUR + USD)
  const base = symbol.slice(0, 3).toUpperCase();
  const quote = symbol.slice(3, 6).toUpperCase();
  const f1 = CURRENCY_FLAGS[base];
  const f2 = CURRENCY_FLAGS[quote];
  if (f1 && f2) return [f1, f2];
  return null;
}

/** Ícone de ativo: dois flags sobrepostos para pares; emoji simples para os restantes */
function AssetIcon({
  asset,
  size = "md",
}: {
  asset: Asset;
  size?: "sm" | "md" | "lg";
}) {
  const pair = getPairFlags(asset.symbol);
  const sizes = { sm: "text-sm", md: "text-xl", lg: "text-2xl" };
  const boxSm = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-9 h-9" };
  const boxQ = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
  const shift = { sm: "text-[9px]", md: "text-[11px]", lg: "text-[13px]" };
  if (pair) {
    return (
      <span
        className="relative inline-flex items-center flex-shrink-0"
        style={{
          width: size === "sm" ? 28 : size === "lg" ? 36 : 32,
          height: size === "sm" ? 20 : size === "lg" ? 26 : 22,
        }}
      >
        <span
          className={`absolute left-0 top-0 ${sizes[size]} leading-none select-none`}
        >
          {pair[0]}
        </span>
        <span
          className={`absolute ${shift[size]} leading-none select-none`}
          style={{
            left: size === "sm" ? 12 : size === "lg" ? 18 : 15,
            top: size === "sm" ? 6 : size === "lg" ? 9 : 8,
          }}
        >
          {pair[1]}
        </span>
      </span>
    );
  }
  return <span className={sizes[size]}>{asset.icon}</span>;
}

// ─── Util: verificar se é dia de mercado (seg–sex) ───────────────────────────
function isMarketDay(): boolean {
  return !isWeekend();
}

// ─── Util: calcular saldo actual ─────────────────────────────────────────────
function getCurrentBalance(): number {
  const mode = accountStore.getMode();
  const closed = tradeStore.getClosed();
  const realized = closed.reduce((s, p) => s + p.pnl, 0);
  const dbBal = accountStore.getDBBalance(mode);
  if (mode === "real") {
    const epoch = accountStore.getBalanceEpoch();
    return (dbBal ?? 0) + (realized - epoch);
  }
  return (dbBal ?? DEMO_START_BALANCE) + realized;
}

const FINNHUB_TOKEN = "KSA1gzO1nFSBTe4hKfw0KJvJQhhx_E_e";

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetCategory =
  | "all"
  | "popular"
  | "favorites"
  | "mostTraded"
  | "commodities"
  | "crypto"
  | "etf"
  | "forex"
  | "indices"
  | "metals"
  | "stocks";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory[];
  basePrice: number;
  spread: number;
  leverage: number;
  digits: number;
  icon: string;
  rank?: number;
  finnhubSymbol?: string;
  tvSymbol: string;
  /** Unidades por lote padrão.
   *  Forex: 100.000 | Ouro: 100 | Prata: 1.000 | Petróleo: 1.000 | Cripto/Ações: 1 */
  contractSize?: number;
}

/**
 * Retorna o tamanho do contrato (unidades por lote) para um ativo.
 * Usado para converter "lotes" em margem/notional no formulário de trade.
 *   Forex:  1 lote = 100.000 unidades da moeda base
 *   Ouro:   1 lote = 100 oz troy
 *   Prata:  1 lote = 1.000 oz troy
 *   Crude:  1 lote = 1.000 barris
 *   Outros (cripto, ações, índices): 1 lote = 1 unidade
 */
function getContractSize(asset: Asset): number {
  if (asset.contractSize) return asset.contractSize;
  if (asset.category.includes("forex")) return 100_000;
  if (asset.symbol === "XAUUSD") return 100;
  if (asset.symbol === "XAGUSD") return 1_000;
  if (asset.category.includes("commodities")) return 1_000;
  return 1; // cripto, ações, ETFs, índices
}

// Garante spread mínimo visível pelas casas decimais do ativo
function getEffectiveSpread(asset: Asset): number {
  const minVisibleSpread = 1 / Math.pow(10, asset.digits);
  return Math.max(asset.spread, minVisibleSpread);
}

function getBidAsk(asset: Asset, tickPrice: number, effectiveSpread: number) {
  // Para ouro com override ativo, usar o preço definido pelo admin como centro
  // e forçar uma diferença visível entre bid/ask.
  if (asset.id === "xauusd" && priceStore.getAdminOverride("xauusd") !== null) {
    const forcedSpread = Math.max(effectiveSpread, tickPrice * 0.0025); // ~0.25%
    const half = forcedSpread / 2;
    const bid = tickPrice - half;
    const ask = tickPrice + half;
    return { bid, ask };
  }

  const bid = tickPrice;
  const ask = tickPrice + effectiveSpread;
  return { bid, ask };
}

// ─── Assets ───────────────────────────────────────────────────────────────────
const ASSETS: Asset[] = [
  {
    id: "eurusd",
    symbol: "EURUSD",
    name: "Euro vs US Dollar",
    category: ["forex", "popular", "mostTraded"],
    basePrice: 1.092,
    spread: 0.00012,
    leverage: 100,
    digits: 5,
    icon: "🇪🇺",
    rank: 1,
    finnhubSymbol: "OANDA:EUR_USD",
    tvSymbol: "OANDA:EURUSD",
  },
  {
    id: "eurgbp",
    symbol: "EURGBP",
    name: "Euro vs British Pound",
    category: ["forex", "popular"],
    basePrice: 0.853,
    spread: 0.00014,
    leverage: 100,
    digits: 5,
    icon: "€£",
    rank: 2,
    finnhubSymbol: "OANDA:EUR_GBP",
    tvSymbol: "OANDA:EURGBP",
  },
  {
    id: "usdjpy",
    symbol: "USDJPY",
    name: "US Dollar vs Japanese Yen",
    category: ["forex", "popular"],
    basePrice: 145.2,
    spread: 0.008,
    leverage: 100,
    digits: 3,
    icon: "💴",
    rank: 3,
    finnhubSymbol: "OANDA:USD_JPY",
    tvSymbol: "OANDA:USDJPY",
  },
  {
    id: "usdchf",
    symbol: "USDCHF",
    name: "US Dollar vs Swiss Franc",
    category: ["forex"],
    basePrice: 0.9012,
    spread: 0.00015,
    leverage: 100,
    digits: 5,
    icon: "🇨🇭",
    rank: 4,
    finnhubSymbol: "OANDA:USD_CHF",
    tvSymbol: "OANDA:USDCHF",
  },
  {
    id: "gbpusd",
    symbol: "GBPUSD",
    name: "British Pound vs US Dollar",
    category: ["forex", "popular"],
    basePrice: 1.2932,
    spread: 0.00014,
    leverage: 100,
    digits: 5,
    icon: "🇬🇧",
    rank: 5,
    finnhubSymbol: "OANDA:GBP_USD",
    tvSymbol: "OANDA:GBPUSD",
  },
  {
    id: "audusd",
    symbol: "AUDUSD",
    name: "Australian Dollar vs US Dollar",
    category: ["forex"],
    basePrice: 0.6358,
    spread: 0.00013,
    leverage: 100,
    digits: 5,
    icon: "🇦🇺",
    rank: 6,
    finnhubSymbol: "OANDA:AUD_USD",
    tvSymbol: "OANDA:AUDUSD",
  },
  {
    id: "usdcad",
    symbol: "USDCAD",
    name: "US Dollar vs Canadian Dollar",
    category: ["forex"],
    basePrice: 1.3578,
    spread: 0.00016,
    leverage: 100,
    digits: 5,
    icon: "🇨🇦",
    rank: 7,
    finnhubSymbol: "OANDA:USD_CAD",
    tvSymbol: "OANDA:USDCAD",
  },
  {
    id: "nzdusd",
    symbol: "NZDUSD",
    name: "New Zealand Dollar vs USD",
    category: ["forex"],
    basePrice: 0.5924,
    spread: 0.00015,
    leverage: 100,
    digits: 5,
    icon: "🇳🇿",
    rank: 8,
    finnhubSymbol: "OANDA:NZD_USD",
    tvSymbol: "OANDA:NZDUSD",
  },
  {
    id: "eurjpy",
    symbol: "EURJPY",
    name: "Euro vs Japanese Yen",
    category: ["forex"],
    basePrice: 158.2,
    spread: 0.012,
    leverage: 100,
    digits: 3,
    icon: "€¥",
    rank: 9,
    finnhubSymbol: "OANDA:EUR_JPY",
    tvSymbol: "OANDA:EURJPY",
  },
  {
    id: "xauusd",
    symbol: "XAUUSD",
    name: "Ouro vs Dolar americano",
    category: ["metals", "popular", "mostTraded", "commodities"],
    basePrice: 4700.0,
    spread: 10,
    leverage: 20,
    digits: 2,
    icon: "🥇",
    rank: 10,
    finnhubSymbol: "OANDA:XAU_USD",
    tvSymbol: "OANDA:XAUUSD",
  },
  {
    id: "xagusd",
    symbol: "XAGUSD",
    name: "Prata vs Dolar americano",
    category: ["metals", "commodities"],
    basePrice: 32.5,
    spread: 0.04,
    leverage: 20,
    digits: 3,
    icon: "🥈",
    rank: 11,
    finnhubSymbol: "OANDA:XAG_USD",
    tvSymbol: "OANDA:XAGUSD",
  },
  {
    id: "brentusd",
    symbol: "BRENTUSD",
    name: "Brent Crude Oil",
    category: ["commodities", "popular"],
    basePrice: 66.0,
    spread: 0.05,
    leverage: 10,
    digits: 2,
    icon: "⛽",
    rank: 12,
    finnhubSymbol: undefined,
    tvSymbol: "TVC:UKOIL",
  },
  {
    id: "wtiusd",
    symbol: "WTIUSD",
    name: "Crude Oil WTI",
    category: ["commodities"],
    basePrice: 62.5,
    spread: 0.04,
    leverage: 10,
    digits: 2,
    icon: "🛢",
    rank: 13,
    finnhubSymbol: undefined,
    tvSymbol: "TVC:USOIL",
  },
  {
    id: "natgas",
    symbol: "NATGAS",
    name: "Natural Gas",
    category: ["commodities"],
    basePrice: 3.85,
    spread: 0.003,
    leverage: 10,
    digits: 3,
    icon: "🔥",
    rank: 14,
    finnhubSymbol: undefined,
    tvSymbol: "TVC:NGAS",
  },
  {
    id: "btcusd",
    symbol: "BTCUSD",
    name: "Bitcoin vs US Dollar",
    category: ["crypto", "popular", "mostTraded"],
    basePrice: 104500.0,
    spread: 25,
    leverage: 10,
    digits: 2,
    icon: "₿",
    rank: 15,
    finnhubSymbol: "BINANCE:BTCUSDT",
    tvSymbol: "BITSTAMP:BTCUSD",
  },
  {
    id: "ethusd",
    symbol: "ETHUSD",
    name: "Ethereum vs US Dollar",
    category: ["crypto", "popular"],
    basePrice: 2480.0,
    spread: 1.5,
    leverage: 10,
    digits: 2,
    icon: "Ξ",
    rank: 16,
    finnhubSymbol: "BINANCE:ETHUSDT",
    tvSymbol: "BITSTAMP:ETHUSD",
  },
  {
    id: "solusd",
    symbol: "SOLUSD",
    name: "Solana vs US Dollar",
    category: ["crypto", "popular"],
    basePrice: 177.0,
    spread: 0.3,
    leverage: 5,
    digits: 2,
    icon: "◎",
    rank: 17,
    finnhubSymbol: "BINANCE:SOLUSDT",
    tvSymbol: "BINANCE:SOLUSDT",
  },
  {
    id: "xrpusd",
    symbol: "XRPUSD",
    name: "XRP vs US Dollar",
    category: ["crypto"],
    basePrice: 2.25,
    spread: 0.002,
    leverage: 5,
    digits: 4,
    icon: "✕",
    rank: 18,
    finnhubSymbol: "BINANCE:XRPUSDT",
    tvSymbol: "BITSTAMP:XRPUSD",
  },
  {
    id: "bnbusd",
    symbol: "BNBUSD",
    name: "BNB vs US Dollar",
    category: ["crypto"],
    basePrice: 648.0,
    spread: 0.8,
    leverage: 5,
    digits: 2,
    icon: "🔶",
    rank: 19,
    finnhubSymbol: "BINANCE:BNBUSDT",
    tvSymbol: "BINANCE:BNBUSDT",
  },
  {
    id: "adausd",
    symbol: "ADAUSD",
    name: "Cardano vs US Dollar",
    category: ["crypto"],
    basePrice: 0.78,
    spread: 0.001,
    leverage: 5,
    digits: 4,
    icon: "₳",
    rank: 20,
    finnhubSymbol: "BINANCE:ADAUSDT",
    tvSymbol: "BINANCE:ADAUSDT",
  },
  {
    id: "nvda",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    category: ["stocks", "popular", "mostTraded"],
    basePrice: 131.0,
    spread: 0.08,
    leverage: 5,
    digits: 2,
    icon: "🎮",
    rank: 21,
    finnhubSymbol: "NVDA",
    tvSymbol: "NASDAQ:NVDA",
  },
  {
    id: "aapl",
    symbol: "AAPL",
    name: "Apple Inc",
    category: ["stocks", "popular", "mostTraded"],
    basePrice: 205.0,
    spread: 0.12,
    leverage: 5,
    digits: 2,
    icon: "🍎",
    rank: 22,
    finnhubSymbol: "AAPL",
    tvSymbol: "NASDAQ:AAPL",
  },
  {
    id: "amzn",
    symbol: "AMZN",
    name: "Amazon.com Inc",
    category: ["stocks", "popular"],
    basePrice: 196.8,
    spread: 0.12,
    leverage: 5,
    digits: 2,
    icon: "📦",
    rank: 23,
    finnhubSymbol: "AMZN",
    tvSymbol: "NASDAQ:AMZN",
  },
  {
    id: "msft",
    symbol: "MSFT",
    name: "Microsoft Corporation",
    category: ["stocks", "popular"],
    basePrice: 450.0,
    spread: 0.2,
    leverage: 5,
    digits: 2,
    icon: "🪟",
    rank: 24,
    finnhubSymbol: "MSFT",
    tvSymbol: "NASDAQ:MSFT",
  },
  {
    id: "tsla",
    symbol: "TSLA",
    name: "Tesla Inc",
    category: ["stocks", "popular"],
    basePrice: 282.0,
    spread: 0.15,
    leverage: 5,
    digits: 2,
    icon: "⚡",
    rank: 25,
    finnhubSymbol: "TSLA",
    tvSymbol: "NASDAQ:TSLA",
  },
  {
    id: "meta",
    symbol: "META",
    name: "Meta Platforms Inc",
    category: ["stocks"],
    basePrice: 625.0,
    spread: 0.25,
    leverage: 5,
    digits: 2,
    icon: "👤",
    rank: 26,
    finnhubSymbol: "META",
    tvSymbol: "NASDAQ:META",
  },
  {
    id: "googl",
    symbol: "GOOGL",
    name: "Alphabet Inc",
    category: ["stocks"],
    basePrice: 178.4,
    spread: 0.1,
    leverage: 5,
    digits: 2,
    icon: "G",
    rank: 27,
    finnhubSymbol: "GOOGL",
    tvSymbol: "NASDAQ:GOOGL",
  },
  {
    id: "nflx",
    symbol: "NFLX",
    name: "Netflix Inc",
    category: ["stocks"],
    basePrice: 1060.0,
    spread: 0.4,
    leverage: 5,
    digits: 2,
    icon: "🎬",
    rank: 28,
    finnhubSymbol: "NFLX",
    tvSymbol: "NASDAQ:NFLX",
  },
  {
    id: "jpm",
    symbol: "JPM",
    name: "JPMorgan Chase",
    category: ["stocks"],
    basePrice: 258.0,
    spread: 0.15,
    leverage: 5,
    digits: 2,
    icon: "🏦",
    rank: 29,
    finnhubSymbol: "JPM",
    tvSymbol: "NYSE:JPM",
  },
  {
    id: "us500",
    symbol: "US500",
    name: "S&P 500 Index",
    category: ["indices", "popular", "mostTraded"],
    basePrice: 5900.0,
    spread: 0.5,
    leverage: 20,
    digits: 1,
    icon: "📊",
    rank: 30,
    finnhubSymbol: undefined,
    tvSymbol: "SP:SPX",
  },
  {
    id: "nas100",
    symbol: "NAS100",
    name: "NASDAQ 100 Index",
    category: ["indices", "popular"],
    basePrice: 21200.0,
    spread: 1.5,
    leverage: 20,
    digits: 1,
    icon: "💻",
    rank: 31,
    finnhubSymbol: undefined,
    tvSymbol: "NASDAQ:NDX",
  },
  {
    id: "us30",
    symbol: "US30",
    name: "Dow Jones Industrial Average",
    category: ["indices", "popular"],
    basePrice: 42600.0,
    spread: 2.0,
    leverage: 20,
    digits: 1,
    icon: "🏛",
    rank: 32,
    finnhubSymbol: undefined,
    tvSymbol: "TVC:DJI",
  },
  {
    id: "uk100",
    symbol: "UK100",
    name: "FTSE 100 Index",
    category: ["indices"],
    basePrice: 8680.0,
    spread: 1.0,
    leverage: 20,
    digits: 1,
    icon: "🇬🇧",
    rank: 33,
    finnhubSymbol: undefined,
    tvSymbol: "TVC:UKX",
  },
  {
    id: "ger40",
    symbol: "GER40",
    name: "DAX 40 Index",
    category: ["indices"],
    basePrice: 23200.0,
    spread: 1.5,
    leverage: 20,
    digits: 1,
    icon: "🇩🇪",
    rank: 34,
    finnhubSymbol: undefined,
    tvSymbol: "TVC:DEX",
  },
  {
    id: "spy",
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    category: ["etf", "mostTraded"],
    basePrice: 582.0,
    spread: 0.15,
    leverage: 5,
    digits: 2,
    icon: "📈",
    rank: 35,
    finnhubSymbol: "SPY",
    tvSymbol: "AMEX:SPY",
  },
  {
    id: "qqq",
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    category: ["etf"],
    basePrice: 512.0,
    spread: 0.15,
    leverage: 5,
    digits: 2,
    icon: "📱",
    rank: 36,
    finnhubSymbol: "QQQ",
    tvSymbol: "NASDAQ:QQQ",
  },
  {
    id: "gld",
    symbol: "GLD",
    name: "SPDR Gold Shares ETF",
    category: ["etf"],
    basePrice: 318.0,
    spread: 0.1,
    leverage: 5,
    digits: 2,
    icon: "🏅",
    rank: 37,
    finnhubSymbol: "GLD",
    tvSymbol: "AMEX:GLD",
  },
];

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  all: "Todos os ativos",
  popular: "Populares",
  favorites: "Favoritos",
  mostTraded: "Mais negociados",
  commodities: "Mercadorias",
  crypto: "Cripto",
  etf: "ETF",
  forex: "Forex",
  indices: "Indices",
  metals: "Metais",
  stocks: "Acoes",
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  const pts = Array.from({ length: 20 }, (_, i) => {
    const n =
      Math.sin(i * 0.8 + (up ? 0 : Math.PI)) * 12 + (up ? i * 0.6 : -i * 0.6);
    return `${(i / 19) * 100},${50 - n}`;
  });
  return (
    <svg viewBox="0 0 100 60" className="w-16 h-7" preserveAspectRatio="none">
      <path
        d={`M${pts.join(" L")}`}
        fill="none"
        stroke={up ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BuySellBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1 w-20">
      <span className="text-[10px] text-green-500 font-medium w-7">{pct}%</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-red-500/30">
        <div
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-red-500 font-medium w-7 text-right">
        {100 - pct}%
      </span>
    </div>
  );
}

// ─── TradingView iframe ───────────────────────────────────────────────────────
function TradingViewChart({
  tvSymbol,
  interval = "D",
  height,
}: {
  tvSymbol: string;
  interval?: string;
  height?: string;
}) {
  const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${interval}&timezone=Etc%2FUTC&theme=dark&style=1&locale=pt&toolbar_bg=%230d1120&enable_publishing=false&hide_side_toolbar=false&allow_symbol_change=true&save_image=false&calendar=false`;
  return (
    <iframe
      key={tvSymbol + interval}
      src={src}
      className="w-full border-0"
      style={{ height: height ?? "100%" }}
      allowFullScreen
      loading="lazy"
      title={tvSymbol}
    />
  );
}

// ─── Micro-tick: faz bid/ask flutuar visivelmente em torno do preço real ────
// O preço de execução (trade) não é afectado — usa sempre o real `price` prop.
function useTickPrice(
  basePrice: number,
  spread: number,
  isLive: boolean,
  finnhubSymbol?: string,
): number {
  const [tickPrice, setTickPrice] = useState(basePrice);
  const baseRef = useRef(basePrice);
  const liveRef = useRef(isLive);

  // Sincronizar ref sem re-criar o timer
  useEffect(() => {
    liveRef.current = isLive;
  }, [isLive]);

  // Quando o preço real do Finnhub actualiza, reset imediato
  useEffect(() => {
    baseRef.current = basePrice;
    setTickPrice(basePrice);
  }, [basePrice]);

  useEffect(() => {
    // Flutua até ±90% do spread em cada tick (~50-90ms) para resposta super fluida
    // Quando mercado fechado (isLive=false) mostra o preço base fixo
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(
        () => {
          if (isWeekend()) {
            setTickPrice(baseRef.current);
          } else if (liveRef.current) {
            const maxDelta = spread * 0.37;
            setTickPrice(
              baseRef.current + (Math.random() - 0.5) * 2 * maxDelta,
            );
          } else {
            setTickPrice(baseRef.current); // estático quando fechado
          }
          schedule();
        },
        350 + Math.random() * 150,
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [spread]);

  // Para Ouro (XAUUSD), ancorar o preço do botão à mesma fonte OANDA/Finnhub
  // para reduzir divergência visual entre gráfico e bid/ask.
  useEffect(() => {
    if (finnhubSymbol !== "OANDA:XAU_USD") return;

    // Se há override admin ativo, não sobrescrever o preço base com feed externo.
    if (priceStore.getAdminOverride("xauusd") !== null) return;

    let dead = false;
    async function syncGoldQuote() {
      try {
        // 1) Tentar Finnhub (feed primário)
        let q: number | null = null;
        try {
          const r = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${FINNHUB_TOKEN}`,
            { cache: "no-store" },
          );
          const d = await r.json();
          q =
            typeof d?.c === "number" && d.c > 0
              ? d.c
              : typeof d?.pc === "number" && d.pc > 0
                ? d.pc
                : null;
        } catch {
          q = null;
        }

        // 2) Fallback sem API key para manter XAUUSD alinhado ao gráfico
        if (q === null) {
          try {
            const r2 = await fetch("https://api.gold-api.com/price/XAU", {
              cache: "no-store",
            });
            const d2 = await r2.json();
            q = typeof d2?.price === "number" && d2.price > 0 ? d2.price : null;
          } catch {
            q = null;
          }
        }

        if (!dead && q !== null) {
          baseRef.current = q;
          setTickPrice(q);
        }
      } catch {
        /* silent */
      }
    }

    syncGoldQuote();
    const id = setInterval(syncGoldQuote, 1_200);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [finnhubSymbol]);

  return tickPrice;
}

// ─── Chart Fullscreen Modal ───────────────────────────────────────────────────
function ChartModal({
  asset,
  price,
  isLive,
  onClose,
}: {
  asset: Asset;
  price: number;
  isLive: boolean;
  onClose: () => void;
}) {
  const [interval, setInterval] = useState("D");
  const intervals = ["1", "5", "15", "30", "60", "240", "D", "W"];
  const labelMap: Record<string, string> = {
    "1": "1m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "240": "4h",
    D: "1D",
    W: "1S",
  };

  // Trade state
  const [tab, setTab] = useState<"amount" | "lots">("amount");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("100");
  const [lots, setLots] = useState("0.01");
  const selectedLeverage = asset.leverage;
  const [stopLoss, setStopLoss] = useState(false);
  const [stopLossVal, setStopLossVal] = useState("");
  const [takeProfit, setTakeProfit] = useState(false);
  const [takeProfitVal, setTakeProfitVal] = useState("");
  const [pendingOrder, setPendingOrder] = useState(false);
  const [pendingPrice, setPendingPrice] = useState("");
  const effectiveSpread = getEffectiveSpread(asset);

  // Preço com micro-fluctuação para display (apenas quando mercado aberto)
  const tickPrice = useTickPrice(
    price,
    effectiveSpread,
    isLive,
    asset.finnhubSymbol,
  );
  const { bid, ask } = getBidAsk(asset, tickPrice, effectiveSpread);
  const displayPrice = tradeType === "buy" ? ask : bid;
  const amountNum = parseFloat(amount) || 100;
  const lotsNum = parseFloat(lots) || 0.01;
  const contractSize = getContractSize(asset);
  // Para o separador "lotes": margem = lots × contractSize × preço / alavancagem
  const calcLots =
    tab === "amount"
      ? (amountNum * selectedLeverage) / (contractSize * displayPrice)
      : lotsNum;
  const calcAmount =
    tab === "lots"
      ? (lotsNum * contractSize * displayPrice) / selectedLeverage
      : amountNum;
  const leveraged = calcAmount * selectedLeverage;
  const sim1Pct = leveraged * 0.01;
  const simTP = (() => {
    if (!takeProfit || !takeProfitVal) return null;
    const tp = parseFloat(takeProfitVal);
    if (isNaN(tp) || tp <= 0) return null;
    const dir = tradeType === "buy" ? 1 : -1;
    const amt = (leveraged * dir * (tp - displayPrice)) / displayPrice;
    return { amount: amt, pct: calcAmount > 0 ? (amt / calcAmount) * 100 : 0 };
  })();
  const simSL = (() => {
    if (!stopLoss || !stopLossVal) return null;
    const sl = parseFloat(stopLossVal);
    if (isNaN(sl) || sl <= 0) return null;
    const dir = tradeType === "buy" ? 1 : -1;
    const amt = (leveraged * dir * (sl - displayPrice)) / displayPrice;
    return { amount: amt, pct: calcAmount > 0 ? (amt / calcAmount) * 100 : 0 };
  })();
  const spreadCost = leveraged * (effectiveSpread / displayPrice);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  function handleModalTrade() {
    // ── Bloqueio fim de semana ────────────────────────────────────────────────
    if (isWeekend()) {
      setToast("❌ Mercados fechados ao fim de semana");
      notificationStore.add(
        "info",
        "Mercados fechados",
        "Os mercados estão encerrados ao sábado e domingo.",
      );
      setTimeout(() => setToast(null), 2500);
      return;
    }
    // ── Bloqueio sem cotação disponível (modal) ───────────────────────────────
    if (asset.finnhubSymbol && !isLive) {
      setToast("❌ Mercado não está aberto para este ativo");
      notificationStore.add(
        "info",
        "Mercado não disponível",
        `${asset.symbol} — sem cotação disponível de momento. Tente novamente em alguns instantes.`,
      );
      setTimeout(() => setToast(null), 3000);
      return;
    }
    // Executa ao preço exibido (tickPrice) — o que o utilizador vê é o que é executado
    const { bid, ask } = getBidAsk(asset, tickPrice, effectiveSpread);
    const execPrice = tradeType === "buy" ? ask : bid;
    const cs = getContractSize(asset);
    const lotsN =
      tab === "amount"
        ? ((parseFloat(amount) || 100) * selectedLeverage) / (cs * execPrice)
        : parseFloat(lots) || 0.01;
    const amountN =
      tab === "lots"
        ? ((parseFloat(lots) || 0.01) * cs * execPrice) / selectedLeverage
        : parseFloat(amount) || 100;
    // ── Verificação de saldo ──────────────────────────────────────────────────
    const bal = getCurrentBalance();
    if (amountN > bal) {
      setToast(`❌ Saldo insuficiente ($${bal.toFixed(2)})`);
      notificationStore.add(
        "info",
        "Saldo insuficiente",
        `Precisa de $${amountN.toFixed(2)} mas tem $${bal.toFixed(2)} disponíveis.`,
      );
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const slVal = stopLoss && stopLossVal ? parseFloat(stopLossVal) : null;
    const tpVal =
      takeProfit && takeProfitVal ? parseFloat(takeProfitVal) : null;
    if (pendingOrder && pendingPrice) {
      tradeStore.addPending({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        icon: asset.icon,
        digits: asset.digits,
        tvSymbol: asset.tvSymbol,
        type: tradeType,
        lots: lotsN,
        amount: amountN,
        leverage: selectedLeverage,
        targetPrice: parseFloat(pendingPrice),
        spread: effectiveSpread,
        stopLoss: slVal,
        takeProfit: tpVal,
      });
      notificationStore.add(
        "info",
        "Pedido pendente criado",
        `${asset.symbol} ${tradeType === "buy" ? "Comprar" : "Vender"} a ${parseFloat(pendingPrice).toFixed(asset.digits)}`,
      );
      setToast("Pedido pendente criado!");
    } else {
      tradeStore.addOpen({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        icon: asset.icon,
        digits: asset.digits,
        tvSymbol: asset.tvSymbol,
        type: tradeType,
        lots: lotsN,
        amount: amountN,
        leverage: selectedLeverage,
        openPrice: execPrice,
        spread: effectiveSpread,
        stopLoss: slVal,
        takeProfit: tpVal,
      });
      notificationStore.add(
        "trade_open",
        tradeType === "buy"
          ? `Compra aberta — ${asset.symbol}`
          : `Venda aberta — ${asset.symbol}`,
        `$${amountN.toFixed(2)} @ ${execPrice.toFixed(asset.digits)} | Alavancagem 1:${selectedLeverage}`,
      );
      setToast(
        tradeType === "buy"
          ? `Comprado ${asset.symbol}!`
          : `Vendido ${asset.symbol}!`,
      );
    }
    setTimeout(() => {
      setToast(null);
      onClose();
      router.push("/trade/dashboard/portfolio");
    }, 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-3">
      <div className="w-full max-w-[1400px] h-[95vh] bg-[#0d1120] rounded-2xl flex overflow-hidden border border-border shadow-2xl">
        {/* LEFT: Trade Panel */}
        <div className="w-72 flex flex-col border-r border-border flex-shrink-0 overflow-hidden">
          {/* Asset header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <AssetIcon asset={asset} size="lg" />
            <div>
              <p className="font-bold text-foreground">{asset.symbol}</p>
              <p className="text-xs text-muted-foreground">{asset.name}</p>
            </div>
          </div>

          {/* Bid / Ask */}
          <div className="grid grid-cols-2 border-b border-border flex-shrink-0">
            <button
              onClick={() => setTradeType("sell")}
              className={cn(
                "py-3 text-center transition-colors border-r border-border",
                tradeType === "sell" ? "bg-red-500" : "hover:bg-red-500/10",
              )}
            >
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  tradeType === "sell"
                    ? "text-white/80"
                    : "text-muted-foreground",
                )}
              >
                Vender
              </p>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  tradeType === "sell" ? "text-white" : "text-red-500",
                )}
              >
                {bid.toFixed(asset.digits)}
              </p>
            </button>
            <button
              onClick={() => setTradeType("buy")}
              className={cn(
                "py-3 text-center transition-colors",
                tradeType === "buy" ? "bg-green-600" : "hover:bg-green-600/10",
              )}
            >
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  tradeType === "buy"
                    ? "text-white/80"
                    : "text-muted-foreground",
                )}
              >
                Comprar
              </p>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  tradeType === "buy" ? "text-white" : "text-green-500",
                )}
              >
                {ask.toFixed(asset.digits)}
              </p>
            </button>
          </div>

          {/* Controls */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex rounded-lg bg-muted/50 p-0.5">
              {(["amount", "lots"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-sm font-medium transition-colors",
                    tab === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "amount" ? "Montante" : "Lotes"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-background/60">
              <span className="text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min="0"
                value={tab === "amount" ? amount : lots}
                onChange={(e) =>
                  tab === "amount"
                    ? setAmount(e.target.value)
                    : setLots(e.target.value)
                }
                className="flex-1 bg-transparent text-foreground text-base font-semibold outline-none"
              />
              <div className="flex flex-col">
                <button
                  onClick={() =>
                    tab === "amount"
                      ? setAmount((v) => String((parseFloat(v) || 0) + 10))
                      : setLots((v) =>
                          String(
                            Math.round(((parseFloat(v) || 0) + 0.01) * 100) /
                              100,
                          ),
                        )
                  }
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() =>
                    tab === "amount"
                      ? setAmount((v) =>
                          String(Math.max(1, (parseFloat(v) || 0) - 10)),
                        )
                      : setLots((v) =>
                          String(
                            Math.max(
                              0.01,
                              Math.round(((parseFloat(v) || 0) - 0.01) * 100) /
                                100,
                            ),
                          ),
                        )
                  }
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Lotes</p>
                <p className="text-sm font-semibold text-foreground">
                  {calcLots.toFixed(4)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Alavancagem</p>
                <p className="text-sm font-semibold text-foreground">
                  1:{selectedLeverage}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Alavancado</p>
                <p className="text-sm font-semibold text-foreground">
                  ${leveraged.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Simulation box — dynamic TP/SL */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[11px] text-muted-foreground font-semibold">
                  {simTP || simSL ? "Simulação de alvo" : "Simulação 1%"}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Spread: {effectiveSpread.toFixed(asset.digits)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Ganho {simTP ? "(TP)" : "(+1%)"}
                </span>
                <span className="text-sm font-bold text-green-600">
                  +${(simTP ? simTP.amount : sim1Pct).toFixed(2)}
                  {simTP && (
                    <span className="text-[10px] font-normal ml-1">
                      ({simTP.pct.toFixed(2)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Perda {simSL ? "(SL)" : "(-1%)"}
                </span>
                <span className="text-sm font-bold text-red-500">
                  -${Math.abs(simSL ? simSL.amount : sim1Pct).toFixed(2)}
                  {simSL && (
                    <span className="text-[10px] font-normal ml-1">
                      ({Math.abs(simSL.pct).toFixed(2)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="border-t border-border/30 pt-1 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">
                  Custo spread: ${spreadCost.toFixed(2)}
                </span>
                {simTP && simSL && Math.abs(simSL.amount) > 0.001 && (
                  <span className="text-[10px] font-bold text-accent">
                    R/R 1:
                    {(Math.abs(simTP.amount) / Math.abs(simSL.amount)).toFixed(
                      2,
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* LIMITES */}
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                Limites
              </p>
              {/* Stop Loss */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cm-sl"
                    checked={stopLoss}
                    onChange={(e) => setStopLoss(e.target.checked)}
                    className="w-3.5 h-3.5 accent-red-500"
                  />
                  <label
                    htmlFor="cm-sl"
                    className="flex-1 text-sm font-medium text-foreground cursor-pointer"
                  >
                    Parar a perda
                  </label>
                  {stopLoss && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          const v = parseFloat(
                            stopLossVal || bid.toFixed(asset.digits),
                          );
                          setStopLossVal(
                            (v - effectiveSpread * 10).toFixed(asset.digits),
                          );
                        }}
                        className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        value={stopLossVal}
                        placeholder={bid.toFixed(asset.digits)}
                        onChange={(e) => setStopLossVal(e.target.value)}
                        className="w-24 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-red-400 text-right"
                      />
                      <button
                        onClick={() => {
                          const v = parseFloat(
                            stopLossVal || bid.toFixed(asset.digits),
                          );
                          setStopLossVal(
                            (v + effectiveSpread * 10).toFixed(asset.digits),
                          );
                        }}
                        className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
                {stopLoss && simSL && (
                  <p className="text-[10px] pl-5 text-red-500">
                    Perda: <strong>${Math.abs(simSL.amount).toFixed(2)}</strong>{" "}
                    <span className="text-muted-foreground">
                      ({Math.abs(simSL.pct).toFixed(2)}%)
                    </span>
                  </p>
                )}
              </div>
              {/* Take Profit */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cm-tp"
                    checked={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.checked)}
                    className="w-3.5 h-3.5 accent-green-500"
                  />
                  <label
                    htmlFor="cm-tp"
                    className="flex-1 text-sm font-medium text-foreground cursor-pointer"
                  >
                    Tirar Lucro
                  </label>
                  {takeProfit && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          const v = parseFloat(
                            takeProfitVal || ask.toFixed(asset.digits),
                          );
                          setTakeProfitVal(
                            (v - effectiveSpread * 10).toFixed(asset.digits),
                          );
                        }}
                        className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        value={takeProfitVal}
                        placeholder={ask.toFixed(asset.digits)}
                        onChange={(e) => setTakeProfitVal(e.target.value)}
                        className="w-24 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-green-400 text-right"
                      />
                      <button
                        onClick={() => {
                          const v = parseFloat(
                            takeProfitVal || ask.toFixed(asset.digits),
                          );
                          setTakeProfitVal(
                            (v + effectiveSpread * 10).toFixed(asset.digits),
                          );
                        }}
                        className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
                {takeProfit && simTP && (
                  <p className="text-[10px] pl-5 text-green-600">
                    Ganho: <strong>${simTP.amount.toFixed(2)}</strong>{" "}
                    <span className="text-muted-foreground">
                      ({simTP.pct.toFixed(2)}%)
                    </span>
                  </p>
                )}
              </div>
              {simTP && simSL && Math.abs(simSL.amount) > 0.001 && (
                <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-1">
                  Risco/Retorno: 1:
                  {(Math.abs(simTP.amount) / Math.abs(simSL.amount)).toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pendingOrder}
                  onChange={(e) => setPendingOrder(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Pedido Pendente</span>
              </label>
              {pendingOrder && (
                <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background/60">
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    Preco alvo:
                  </span>
                  <input
                    type="number"
                    placeholder={displayPrice.toFixed(asset.digits)}
                    value={pendingPrice}
                    onChange={(e) => setPendingPrice(e.target.value)}
                    className="flex-1 bg-transparent text-foreground text-sm font-semibold outline-none text-right"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Invest button — modal */}
          <div className="p-4 border-t border-border flex-shrink-0">
            {toast ? (
              <div
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2",
                  toast.startsWith("❌")
                    ? "bg-red-500/10 border border-red-500/30 text-red-400"
                    : "bg-green-500/20 border border-green-500/40 text-green-400",
                )}
              >
                {toast.startsWith("❌") ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}{" "}
                {toast}
              </div>
            ) : (
              <button
                onClick={handleModalTrade}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-base transition-all active:scale-95",
                  tradeType === "buy"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-red-500 text-white hover:bg-red-600",
                )}
              >
                {tradeType === "buy" ? "Comprar" : "Vender"} {asset.symbol}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Chart with price-level overlay */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Price level overlay badges */}
          <div className="absolute right-2 top-12 bottom-12 flex flex-col items-end justify-center gap-2 pointer-events-none z-20">
            {simTP && takeProfitVal && (
              <div className="flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                <span>TP</span>
                <span>{parseFloat(takeProfitVal).toFixed(asset.digits)}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-gray-800/80 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow">
              <span>↕</span>
              <span>{displayPrice.toFixed(asset.digits)}</span>
            </div>
            {simSL && stopLossVal && (
              <div className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                <span>SL</span>
                <span>{parseFloat(stopLossVal).toFixed(asset.digits)}</span>
              </div>
            )}
            {pendingOrder && pendingPrice && (
              <div className="flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                <span>P</span>
                <span>{parseFloat(pendingPrice).toFixed(asset.digits)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
            <div className="flex gap-1">
              {intervals.map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    interval === iv
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {labelMap[iv]}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TradingViewChart
              tvSymbol={asset.tvSymbol}
              interval={interval}
              height="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Finnhub real-time hook ───────────────────────────────────────────────────
function useFinnhubPrices(assets: Asset[]) {
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    // Inicializar com preços do priceStore (se já temos) ou basePrice
    const cached = priceStore.get();
    return Object.fromEntries(
      assets.map((a) => [a.id, cached[a.id] ?? a.basePrice]),
    );
  });
  // IDs de assets com preço ao vivo confirmado (d.c > 0 ou tick WS)
  const [liveAssets, setLiveAssets] = useState<Set<string>>(new Set());
  // Ref para aceder ao preço actual sem depender do closure do state updater
  const pricesRef = useRef(prices);
  // Ref síncrona de liveAssets — usada no retry interval sem depender do state
  const liveAssetsRef = useRef<Set<string>>(new Set());

  // Helper: actualizar state + publicar no priceStore partilhado.
  // CRÍTICO: priceStore.set() NÃO pode ser chamado dentro de um setState updater
  // (causaria setState num componente durante o render de outro).
  const update = useCallback(
    (patch: Record<string, number>, isLive = false) => {
      pricesRef.current = { ...pricesRef.current, ...patch };
      setPrices((prev) => ({ ...prev, ...patch }));
      priceStore.set(patch); // ← fora do updater, seguro
      if (isLive) {
        Object.keys(patch).forEach((id) => liveAssetsRef.current.add(id));
        setLiveAssets((prev) => {
          const next = new Set(prev);
          Object.keys(patch).forEach((id) => next.add(id));
          return next;
        });
      }
    },
    [],
  );

  // REST — fetch inicial + retry a cada 30s para activos ainda não confirmados
  useEffect(() => {
    const fetchAll = async (onlyUnlive = false) => {
      for (const asset of assets) {
        const adminOverride = priceStore.getAdminOverride(asset.id);
        if (adminOverride !== null) {
          update({ [asset.id]: adminOverride }, true);
          continue;
        }

        // Ouro: fallback dedicado sem API key para evitar ficar preso em valor antigo
        if (asset.id === "xauusd") {
          if (onlyUnlive && liveAssetsRef.current.has(asset.id)) continue;
          try {
            const r = await fetch("https://api.gold-api.com/price/XAU", {
              cache: "no-store",
            });
            const d = await r.json();
            if (typeof d?.price === "number" && d.price > 0) {
              update({ [asset.id]: d.price }, true);
              continue;
            }
          } catch {
            /* silent */
          }
        }

        if (!asset.finnhubSymbol) continue;
        if (onlyUnlive && liveAssetsRef.current.has(asset.id)) continue;
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${asset.finnhubSymbol}&token=${FINNHUB_TOKEN}`,
          );
          const data = await res.json();
          if (data) {
            if (data.c && data.c > 0) {
              // Preço ao vivo confirmado pela API
              update({ [asset.id]: data.c }, true);
            } else if (data.pc && data.pc > 0 && isMarketDay()) {
              // Finnhub retornou c=0 (quote atrasada) mas é dia de mercado:
              // usar preço de fecho anterior como base e marcar como live
              update({ [asset.id]: data.pc }, true);
            }
          }
        } catch {
          /* silent */
        }
      }
    };
    fetchAll(false);
    // Retry a cada 30s apenas em dias de mercado, para activos não confirmados
    const retryId = setInterval(() => {
      if (!isMarketDay()) return;
      fetchAll(true);
    }, 30_000);
    return () => clearInterval(retryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket Finnhub (real-time ticks)
  useEffect(() => {
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_TOKEN}`);

    ws.onopen = () => {
      assets.forEach((a) => {
        if (a.finnhubSymbol) {
          ws.send(
            JSON.stringify({ type: "subscribe", symbol: a.finnhubSymbol }),
          );
        }
      });
    };

    ws.onmessage = (event) => {
      try {
        if (isWeekend()) return;
        const msg = JSON.parse(event.data);
        if (msg.type === "trade" && msg.data) {
          const patch: Record<string, number> = {};
          msg.data.forEach((tick: { s: string; p: number }) => {
            const asset = assets.find((a) => a.finnhubSymbol === tick.s);
            if (!asset || tick.p <= 0) return;
            // Quando há override admin, o feed externo não deve sobrescrever.
            if (priceStore.getAdminOverride(asset.id) !== null) return;
            patch[asset.id] = tick.p;
          });
          if (Object.keys(patch).length) update(patch, true); // isLive=true
        }
      } catch {
        /* silent */
      }
    };

    return () => {
      assets.forEach((a) => {
        if (a.finnhubSymbol && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({ type: "unsubscribe", symbol: a.finnhubSymbol }),
          );
        }
      });
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulação de micro-movimento para activos sem Finnhub (commodities, etc.)
  // Estes são sempre considerados "live" para efeitos de negociação (preço simulado).
  useEffect(() => {
    const id = setInterval(() => {
      if (isWeekend()) return;
      const patch: Record<string, number> = {};
      assets.forEach((a) => {
        if (!a.finnhubSymbol) {
          const vol = a.basePrice * 0.00035;
          const delta = (Math.random() - 0.5) * vol;
          // Usa pricesRef (não setState updater) — evita chamar priceStore.set dentro de render
          patch[a.id] = Math.max(
            a.basePrice * 0.5,
            pricesRef.current[a.id] + delta,
          );
        }
      });
      if (Object.keys(patch).length) update(patch);
    }, 450);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  return { prices, liveAssets };
}

// ─── Trade Panel ──────────────────────────────────────────────────────────────
function TradePanel({
  asset,
  price,
  isLive,
  onClose,
  onOpenChart,
  initialTradeType,
}: {
  asset: Asset;
  price: number;
  isLive: boolean;
  onClose: () => void;
  onOpenChart: () => void;
  initialTradeType?: "buy" | "sell";
}) {
  const [tab, setTab] = useState<"amount" | "lots">("amount");
  const [tradeType, setTradeType] = useState<"buy" | "sell">(
    initialTradeType ?? "buy",
  );
  const [amount, setAmount] = useState("100");
  const [lots, setLots] = useState("0.01");
  const selectedLeverage = asset.leverage;
  const [stopLoss, setStopLoss] = useState(false);
  const [stopLossVal, setStopLossVal] = useState("");
  const [takeProfit, setTakeProfit] = useState(false);
  const [takeProfitVal, setTakeProfitVal] = useState("");
  const [pendingOrder, setPendingOrder] = useState(false);
  const [pendingPrice, setPendingPrice] = useState("");
  const [isFav, setIsFav] = useState(false);
  const effectiveSpread = getEffectiveSpread(asset);

  // Preço com micro-fluctuação para display (apenas quando mercado aberto)
  const tickPrice = useTickPrice(
    price,
    effectiveSpread,
    isLive,
    asset.finnhubSymbol,
  );
  const { bid, ask } = getBidAsk(asset, tickPrice, effectiveSpread);
  const displayPrice = tradeType === "buy" ? ask : bid;

  const amountNum = parseFloat(amount) || 100;
  const lotsNum = parseFloat(lots) || 0.01;
  const contractSize = getContractSize(asset);
  // Para o separador "lotes": margem = lots × contractSize × preço / alavancagem
  const calcLots =
    tab === "amount"
      ? (amountNum * selectedLeverage) / (contractSize * displayPrice)
      : lotsNum;
  const calcAmount =
    tab === "lots"
      ? (lotsNum * contractSize * displayPrice) / selectedLeverage
      : amountNum;
  const leveraged = calcAmount * selectedLeverage;
  const sim1Pct = leveraged * 0.01;
  const simTP = (() => {
    if (!takeProfit || !takeProfitVal) return null;
    const tp = parseFloat(takeProfitVal);
    if (isNaN(tp) || tp <= 0) return null;
    const dir = tradeType === "buy" ? 1 : -1;
    const amt = (leveraged * dir * (tp - displayPrice)) / displayPrice;
    return { amount: amt, pct: calcAmount > 0 ? (amt / calcAmount) * 100 : 0 };
  })();
  const simSL = (() => {
    if (!stopLoss || !stopLossVal) return null;
    const sl = parseFloat(stopLossVal);
    if (isNaN(sl) || sl <= 0) return null;
    const dir = tradeType === "buy" ? 1 : -1;
    const amt = (leveraged * dir * (sl - displayPrice)) / displayPrice;
    return { amount: amt, pct: calcAmount > 0 ? (amt / calcAmount) * 100 : 0 };
  })();
  const spreadCost = leveraged * (effectiveSpread / displayPrice);

  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  function executeTrade() {
    // ── Bloqueio fim de semana ────────────────────────────────────────────────
    if (isWeekend()) {
      setToast("❌ Mercados fechados ao fim de semana");
      notificationStore.add(
        "info",
        "Mercados fechados",
        "Os mercados estão encerrados ao sábado e domingo.",
      );
      setTimeout(() => setToast(null), 2500);
      return;
    }
    // ── Bloqueio sem cotação disponível (painel) ──────────────────────────────
    if (asset.finnhubSymbol && !isLive) {
      setToast("❌ Mercado não está aberto para este ativo");
      notificationStore.add(
        "info",
        "Mercado não disponível",
        `${asset.symbol} — sem cotação disponível de momento. Tente novamente em alguns instantes.`,
      );
      setTimeout(() => setToast(null), 3000);
      return;
    }
    // Executa ao preço exibido (tickPrice) — o que o utilizador vê é o que é executado
    const { bid, ask } = getBidAsk(asset, tickPrice, effectiveSpread);
    const execPrice = tradeType === "buy" ? ask : bid;
    const cs = getContractSize(asset);
    const lotsN =
      tab === "amount"
        ? ((parseFloat(amount) || 100) * selectedLeverage) / (cs * execPrice)
        : parseFloat(lots) || 0.01;
    const amountN =
      tab === "lots"
        ? ((parseFloat(lots) || 0.01) * cs * execPrice) / selectedLeverage
        : parseFloat(amount) || 100;
    // ── Verificação de saldo ──────────────────────────────────────────────────
    const bal = getCurrentBalance();
    if (amountN > bal) {
      setToast(`❌ Saldo insuficiente ($${bal.toFixed(2)})`);
      notificationStore.add(
        "info",
        "Saldo insuficiente",
        `Precisa de $${amountN.toFixed(2)} mas tem $${bal.toFixed(2)} disponíveis.`,
      );
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const slVal = stopLoss && stopLossVal ? parseFloat(stopLossVal) : null;
    const tpVal =
      takeProfit && takeProfitVal ? parseFloat(takeProfitVal) : null;
    if (pendingOrder && pendingPrice) {
      tradeStore.addPending({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        icon: asset.icon,
        digits: asset.digits,
        tvSymbol: asset.tvSymbol,
        type: tradeType,
        lots: lotsN,
        amount: amountN,
        leverage: selectedLeverage,
        targetPrice: parseFloat(pendingPrice),
        spread: effectiveSpread,
        stopLoss: slVal,
        takeProfit: tpVal,
      });
      notificationStore.add(
        "info",
        "Pedido pendente criado",
        `${asset.symbol} ${tradeType === "buy" ? "Comprar" : "Vender"} a ${parseFloat(pendingPrice).toFixed(asset.digits)}`,
      );
      setToast("Pedido pendente criado!");
    } else {
      tradeStore.addOpen({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        icon: asset.icon,
        digits: asset.digits,
        tvSymbol: asset.tvSymbol,
        type: tradeType,
        lots: lotsN,
        amount: amountN,
        leverage: selectedLeverage,
        openPrice: execPrice,
        spread: effectiveSpread,
        stopLoss: slVal,
        takeProfit: tpVal,
      });
      notificationStore.add(
        "trade_open",
        tradeType === "buy"
          ? `Compra aberta — ${asset.symbol}`
          : `Venda aberta — ${asset.symbol}`,
        `$${amountN.toFixed(2)} @ ${execPrice.toFixed(asset.digits)} | Alavancagem 1:${selectedLeverage}`,
      );
      setToast(
        tradeType === "buy"
          ? `Comprado ${asset.symbol}!`
          : `Vendido ${asset.symbol}!`,
      );
    }
    setTimeout(() => {
      setToast(null);
      onClose();
      router.push("/trade/dashboard/portfolio");
    }, 1400);
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <AssetIcon asset={asset} size="md" />
          <div>
            <p className="font-bold text-foreground text-sm">{asset.symbol}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
              {asset.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setIsFav((f) => !f)}>
            <Star
              className={cn(
                "w-4 h-4 transition-colors",
                isFav
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-400",
              )}
            />
          </button>
          <button
            onClick={onOpenChart}
            title="Ampliar grafico"
            className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart clickable area */}
      <div
        className="relative h-52 bg-background/60 border-b border-border overflow-hidden flex-shrink-0 group cursor-pointer"
        onClick={onOpenChart}
      >
        <TradingViewChart
          tvSymbol={asset.tvSymbol}
          interval="D"
          height="100%"
        />
        <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Bid / Ask buttons */}
      <div className="grid grid-cols-2 border-b border-border flex-shrink-0">
        <button
          onClick={() => setTradeType("sell")}
          className={cn(
            "py-3 text-center transition-colors border-r border-border",
            tradeType === "sell" ? "bg-red-500" : "hover:bg-red-500/10",
          )}
        >
          <p
            className={cn(
              "text-[10px] uppercase tracking-wide",
              tradeType === "sell" ? "text-white/80" : "text-muted-foreground",
            )}
          >
            Vender
          </p>
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              tradeType === "sell" ? "text-white" : "text-red-500",
            )}
          >
            {bid.toFixed(asset.digits)}
          </p>
        </button>
        <button
          onClick={() => setTradeType("buy")}
          className={cn(
            "py-3 text-center transition-colors",
            tradeType === "buy" ? "bg-green-600" : "hover:bg-green-600/10",
          )}
        >
          <p
            className={cn(
              "text-[10px] uppercase tracking-wide",
              tradeType === "buy" ? "text-white/80" : "text-muted-foreground",
            )}
          >
            Comprar
          </p>
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              tradeType === "buy" ? "text-white" : "text-green-500",
            )}
          >
            {ask.toFixed(asset.digits)}
          </p>
        </button>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Amount / Lots tab */}
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {(["amount", "lots"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-1.5 rounded-md text-sm font-medium transition-colors",
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "amount" ? "Montante" : "Lotes"}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-background/60">
          <span className="text-muted-foreground text-sm">$</span>
          <input
            type="number"
            min="0"
            value={tab === "amount" ? amount : lots}
            onChange={(e) =>
              tab === "amount"
                ? setAmount(e.target.value)
                : setLots(e.target.value)
            }
            className="flex-1 bg-transparent text-foreground text-base font-semibold outline-none"
          />
          <div className="flex flex-col">
            <button
              onClick={() =>
                tab === "amount"
                  ? setAmount((v) => String((parseFloat(v) || 0) + 10))
                  : setLots((v) =>
                      String(
                        Math.round(((parseFloat(v) || 0) + 0.01) * 100) / 100,
                      ),
                    )
              }
              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() =>
                tab === "amount"
                  ? setAmount((v) =>
                      String(Math.max(1, (parseFloat(v) || 0) - 10)),
                    )
                  : setLots((v) =>
                      String(
                        Math.max(
                          0.01,
                          Math.round(((parseFloat(v) || 0) - 0.01) * 100) / 100,
                        ),
                      ),
                    )
              }
              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Lotes</p>
            <p className="text-sm font-semibold text-foreground">
              {calcLots.toFixed(4)}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Alavancagem</p>
            <p className="text-sm font-semibold text-foreground">
              1:{selectedLeverage}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Alavancado</p>
            <p className="text-sm font-semibold text-foreground">
              ${leveraged.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Simulation box — dynamic TP/SL */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] text-muted-foreground font-semibold">
              {simTP || simSL ? "Simulação de alvo" : "Simulação 1%"}
            </p>
            <span className="text-[10px] text-muted-foreground">
              Spread: {effectiveSpread.toFixed(asset.digits)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Ganho {simTP ? "(TP)" : "(+1%)"}
            </span>
            <span className="text-sm font-bold text-green-600">
              +${(simTP ? simTP.amount : sim1Pct).toFixed(2)}
              {simTP && (
                <span className="text-[10px] font-normal ml-1">
                  ({simTP.pct.toFixed(2)}%)
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Perda {simSL ? "(SL)" : "(-1%)"}
            </span>
            <span className="text-sm font-bold text-red-500">
              -${Math.abs(simSL ? simSL.amount : sim1Pct).toFixed(2)}
              {simSL && (
                <span className="text-[10px] font-normal ml-1">
                  ({Math.abs(simSL.pct).toFixed(2)}%)
                </span>
              )}
            </span>
          </div>
          <div className="border-t border-border/30 pt-1 flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">
              Custo spread: ${spreadCost.toFixed(2)}
            </span>
            {simTP && simSL && Math.abs(simSL.amount) > 0.001 && (
              <span className="text-[10px] font-bold text-accent">
                R/R 1:
                {(Math.abs(simTP.amount) / Math.abs(simSL.amount)).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* LIMITES */}
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
            Limites
          </p>
          {/* Stop Loss */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tp-sl"
                checked={stopLoss}
                onChange={(e) => setStopLoss(e.target.checked)}
                className="w-3.5 h-3.5 accent-red-500"
              />
              <label
                htmlFor="tp-sl"
                className="flex-1 text-sm font-medium text-foreground cursor-pointer"
              >
                Parar a perda
              </label>
              {stopLoss && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      const v = parseFloat(
                        stopLossVal || bid.toFixed(asset.digits),
                      );
                      setStopLossVal(
                        (v - effectiveSpread * 10).toFixed(asset.digits),
                      );
                    }}
                    className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <input
                    type="number"
                    value={stopLossVal}
                    placeholder={bid.toFixed(asset.digits)}
                    onChange={(e) => setStopLossVal(e.target.value)}
                    className="w-24 bg-background border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-red-400 text-right"
                  />
                  <button
                    onClick={() => {
                      const v = parseFloat(
                        stopLossVal || bid.toFixed(asset.digits),
                      );
                      setStopLossVal(
                        (v + effectiveSpread * 10).toFixed(asset.digits),
                      );
                    }}
                    className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
            {stopLoss && simSL && (
              <p className="text-[10px] pl-5 text-red-500">
                Perda: <strong>${Math.abs(simSL.amount).toFixed(2)}</strong>{" "}
                <span className="text-muted-foreground">
                  ({Math.abs(simSL.pct).toFixed(2)}%)
                </span>
              </p>
            )}
          </div>
          {/* Take Profit */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tp-tp"
                checked={takeProfit}
                onChange={(e) => setTakeProfit(e.target.checked)}
                className="w-3.5 h-3.5 accent-green-500"
              />
              <label
                htmlFor="tp-tp"
                className="flex-1 text-sm font-medium text-foreground cursor-pointer"
              >
                Tirar Lucro
              </label>
              {takeProfit && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      const v = parseFloat(
                        takeProfitVal || ask.toFixed(asset.digits),
                      );
                      setTakeProfitVal(
                        (v - effectiveSpread * 10).toFixed(asset.digits),
                      );
                    }}
                    className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <input
                    type="number"
                    value={takeProfitVal}
                    placeholder={ask.toFixed(asset.digits)}
                    onChange={(e) => setTakeProfitVal(e.target.value)}
                    className="w-24 bg-background border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-green-400 text-right"
                  />
                  <button
                    onClick={() => {
                      const v = parseFloat(
                        takeProfitVal || ask.toFixed(asset.digits),
                      );
                      setTakeProfitVal(
                        (v + effectiveSpread * 10).toFixed(asset.digits),
                      );
                    }}
                    className="w-5 h-5 bg-muted/50 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
            {takeProfit && simTP && (
              <p className="text-[10px] pl-5 text-green-600">
                Ganho: <strong>${simTP.amount.toFixed(2)}</strong>{" "}
                <span className="text-muted-foreground">
                  ({simTP.pct.toFixed(2)}%)
                </span>
              </p>
            )}
          </div>
          {simTP && simSL && Math.abs(simSL.amount) > 0.001 && (
            <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-1">
              Risco/Retorno: 1:
              {(Math.abs(simTP.amount) / Math.abs(simSL.amount)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Pending Order */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pendingOrder}
              onChange={(e) => setPendingOrder(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-foreground">Pedido Pendente</span>
          </label>
          {pendingOrder && (
            <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background/60">
              <span className="text-xs text-muted-foreground flex-shrink-0">
                Quando preco atingir:
              </span>
              <input
                type="number"
                placeholder={displayPrice.toFixed(asset.digits)}
                value={pendingPrice}
                onChange={(e) => setPendingPrice(e.target.value)}
                className="flex-1 bg-transparent text-foreground text-sm font-semibold outline-none text-right"
              />
            </div>
          )}
        </div>
      </div>

      {/* Invest button — painel lateral */}
      <div className="p-4 border-t border-border flex-shrink-0">
        {toast ? (
          <div
            className={cn(
              "w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2",
              toast.startsWith("❌")
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : "bg-green-500/20 border border-green-500/40 text-green-400",
            )}
          >
            {toast.startsWith("❌") ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}{" "}
            {toast}
          </div>
        ) : (
          <button
            onClick={executeTrade}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95",
              tradeType === "buy"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-500 text-white hover:bg-red-600",
            )}
          >
            {tradeType === "buy" ? "Comprar" : "Vender"} {asset.symbol}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function AssetsPageInner() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<AssetCategory>("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [initialAction, setInitialAction] = useState<
    "buy" | "sell" | undefined
  >(undefined);
  const [chartModal, setChartModal] = useState<Asset | null>(null);
  const [positionTab, setPositionTab] = useState<"open" | "pending" | "closed">(
    "open",
  );

  const { prices, liveAssets } = useFinnhubPrices(ASSETS);

  // ── Micro-tick para a tabela (±90% do spread, 50-90ms) ───────────────────
  const [tickPrices, setTickPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(ASSETS.map((a) => [a.id, prices[a.id] ?? a.basePrice])),
  );
  const tickBasesRef = useRef<Record<string, number>>({});
  const liveAssetsRef = useRef<Set<string>>(liveAssets);
  // Sincroniza refs sem re-criar o timer
  useEffect(() => {
    tickBasesRef.current = { ...tickBasesRef.current, ...prices };
  }, [prices]);
  useEffect(() => {
    liveAssetsRef.current = liveAssets;
  }, [liveAssets]);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(
        () => {
          setTickPrices(() => {
            const next: Record<string, number> = {};
            ASSETS.forEach((a) => {
              const base = tickBasesRef.current[a.id] ?? a.basePrice;
              if (isWeekend()) {
                next[a.id] = base;
                return;
              }
              // Só flutua quando o mercado está aberto (live) ou sem símbolo Finnhub (simulado)
              const isLive =
                !a.finnhubSymbol ||
                isMarketDay() ||
                liveAssetsRef.current.has(a.id);
              if (isLive) {
                const maxDelta = a.spread * 0.37;
                next[a.id] = base + (Math.random() - 0.5) * 2 * maxDelta;
              } else {
                next[a.id] = base; // estático quando fechado
              }
            });
            return next;
          });
          schedule();
        },
        350 + Math.random() * 150,
      );
    };
    schedule();
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open asset from URL params (e.g. ?asset=eurusd&action=buy)
  useEffect(() => {
    const assetId = searchParams.get("asset");
    const action = searchParams.get("action") as "buy" | "sell" | null;
    if (assetId) {
      const found = ASSETS.find((a) => a.id === assetId);
      if (found) {
        setSelectedAsset(found);
        if (action === "buy" || action === "sell") setInitialAction(action);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [changes, setChanges] = useState<Record<string, number>>(() =>
    Object.fromEntries(ASSETS.map((a) => [a.id, 0])),
  );
  useEffect(() => {
    setChanges(
      Object.fromEntries(
        ASSETS.map((a) => [
          a.id,
          parseFloat((Math.random() * 4 - 2).toFixed(2)),
        ]),
      ),
    );
  }, []);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const filteredAssets = ASSETS.filter((a) => {
    const mc =
      category === "all"
        ? true
        : category === "favorites"
          ? favorites.has(a.id)
          : a.category.includes(category);
    const ms =
      !search ||
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  const [weekendToast, setWeekendToast] = useState(() => isWeekend());

  // Auto-dismiss após 5 segundos
  useEffect(() => {
    if (!weekendToast) return;
    const t = setTimeout(() => setWeekendToast(false), 5000);
    return () => clearTimeout(t);
  }, [weekendToast]);

  const categories: AssetCategory[] = [
    "all",
    "popular",
    "favorites",
    "mostTraded",
    "commodities",
    "crypto",
    "etf",
    "forex",
    "indices",
    "metals",
    "stocks",
  ];

  return (
    <>
      {chartModal && (
        <ChartModal
          asset={chartModal}
          price={prices[chartModal.id]}
          isLive={
            !chartModal.finnhubSymbol ||
            isMarketDay() ||
            liveAssets.has(chartModal.id)
          }
          onClose={() => setChartModal(null)}
        />
      )}

      {/* ── Toast flutuante fim de semana ────────────────────────────────── */}
      {weekendToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#1a1400] border border-amber-500/40 text-amber-400 text-sm font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ minWidth: 320 }}
        >
          <MoonStar className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            Mercados fechados ao fim de semana — recomeça na segunda-feira.
          </span>
          <button
            onClick={() => setWeekendToast(false)}
            className="ml-2 text-amber-400/60 hover:text-amber-400 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden">
        {/* Assets list */}
        <div
          className={cn(
            "flex flex-col flex-1 min-w-0 overflow-hidden",
            selectedAsset && "hidden xl:flex",
          )}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1 h-5 bg-accent rounded-full" />
              <h1 className="text-lg font-bold text-foreground">Ativos</h1>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Preco vai subir:{" "}
              <span className="text-green-500 font-medium">Comprar</span> |
              Preco vai descer:{" "}
              <span className="text-red-500 font-medium">Vender</span>
            </p>
          </div>

          {/* Search + filters */}
          <div className="px-4 pt-2.5 pb-2 space-y-2 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar ativos"
                className="w-full pl-9 pr-4 py-1.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    category === cat
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1.5rem_1fr_5rem_5rem] md:grid-cols-[2rem_1fr_5rem_1fr_5.5rem_5.5rem_6rem] gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-[11px] text-muted-foreground font-medium border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur-sm flex-shrink-0">
            <span />
            <span>Ativo</span>
            <span className="text-right hidden md:inline">Alterar 1D</span>
            <span className="text-center hidden md:block">
              Comprar vs Vender
            </span>
            <span className="text-right">Vender</span>
            <span className="text-right">Comprar</span>
            <span className="hidden md:inline" />
          </div>

          {/* Asset rows */}
          <div className="flex-1 overflow-y-auto">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">Nenhum ativo encontrado</p>
              </div>
            ) : (
              filteredAssets.map((asset) => {
                const price = prices[asset.id];
                const change = changes[asset.id];
                const isUp = change >= 0;
                const isFav = favorites.has(asset.id);
                const isSelected = selectedAsset?.id === asset.id;
                const bid = tickPrices[asset.id] ?? price;
                const ask = bid + getEffectiveSpread(asset);
                const bsPct = Math.min(
                  95,
                  Math.max(5, Math.round(50 + change * 5)),
                );

                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(isSelected ? null : asset)}
                    className={cn(
                      "grid grid-cols-[1.5rem_1fr_5rem_5rem] md:grid-cols-[2rem_1fr_5rem_1fr_5.5rem_5.5rem_6rem] gap-1.5 md:gap-2 px-2 md:px-4 py-2.5 items-center cursor-pointer transition-colors border-b border-border/20",
                      isSelected ? "bg-accent/10" : "hover:bg-muted/20",
                    )}
                  >
                    <button onClick={(e) => toggleFavorite(asset.id, e)}>
                      <Star
                        className={cn(
                          "w-3.5 h-3.5 transition-colors",
                          isFav
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30 hover:text-yellow-400",
                        )}
                      />
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border/30 overflow-visible">
                        <AssetIcon asset={asset} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                          {asset.symbol}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {asset.name.split(" ").slice(0, 3).join(" ")}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-xs font-semibold text-right hidden md:block",
                        isUp ? "text-green-500" : "text-red-500",
                      )}
                    >
                      {isUp ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>

                    <div className="hidden md:flex justify-center items-center gap-2">
                      <Sparkline up={isUp} />
                      <BuySellBar pct={bsPct} />
                    </div>

                    <span className="text-xs tabular-nums font-medium text-red-400 text-right">
                      {bid.toFixed(asset.digits)}
                    </span>

                    <span className="text-xs tabular-nums font-medium text-green-400 text-right">
                      {ask.toFixed(asset.digits)}
                    </span>

                    <div className="hidden md:flex gap-1 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                        }}
                        className="text-[10px] font-semibold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded-md transition-colors whitespace-nowrap"
                      >
                        Ven.
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                        }}
                        className="text-[10px] font-semibold bg-green-500/10 text-green-400 hover:bg-green-600 hover:text-white px-2 py-1 rounded-md transition-colors whitespace-nowrap"
                      >
                        Com.
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Trade Panel */}
        {selectedAsset && (
          <div className="w-full xl:w-96 flex-shrink-0 h-full overflow-y-auto">
            <TradePanel
              asset={selectedAsset}
              price={prices[selectedAsset.id]}
              isLive={
                !selectedAsset.finnhubSymbol ||
                isMarketDay() ||
                liveAssets.has(selectedAsset.id)
              }
              onClose={() => {
                setSelectedAsset(null);
                setInitialAction(undefined);
              }}
              onOpenChart={() => setChartModal(selectedAsset)}
              initialTradeType={initialAction}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default function AssetsPage() {
  return (
    <Suspense fallback={null}>
      <AssetsPageInner />
    </Suspense>
  );
}
