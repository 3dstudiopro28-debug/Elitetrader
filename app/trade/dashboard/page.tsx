"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { accountStore } from "@/lib/account-store";
import { tradeStore } from "@/lib/trade-store";
import { supabase } from "@/lib/supabase";
import { profileStore } from "@/lib/profile-store";

const FINNHUB_TOKEN = "KSA1gzO1nFSBTe4hKfw0KJvJQhhx_E_e";

interface MarketItem {
  symbol: string;
  assetId: string;
  name: string;
  finnhubSymbol: string;
  tvSymbol: string;
  basePrice: number;
  digits: number;
}

const MARKET_ITEMS: MarketItem[] = [
  {
    symbol: "EURUSD",
    assetId: "eurusd",
    name: "Euro / Dolar americano",
    finnhubSymbol: "OANDA:EUR_USD",
    tvSymbol: "OANDA:EURUSD",
    basePrice: 1.092,
    digits: 5,
  },
  {
    symbol: "GBPUSD",
    assetId: "gbpusd",
    name: "Libra / Dolar americano",
    finnhubSymbol: "OANDA:GBP_USD",
    tvSymbol: "OANDA:GBPUSD",
    basePrice: 1.2932,
    digits: 5,
  },
  {
    symbol: "XAUUSD",
    assetId: "xauusd",
    name: "Ouro / Dolar americano",
    finnhubSymbol: "OANDA:XAU_USD",
    tvSymbol: "OANDA:XAUUSD",
    basePrice: 3310.0,
    digits: 2,
  },
  {
    symbol: "BTCUSD",
    assetId: "btcusd",
    name: "Bitcoin / Dolar americano",
    finnhubSymbol: "BINANCE:BTCUSDT",
    tvSymbol: "BITSTAMP:BTCUSD",
    basePrice: 104500.0,
    digits: 2,
  },
  {
    symbol: "AAPL",
    assetId: "aapl",
    name: "Apple Inc.",
    finnhubSymbol: "AAPL",
    tvSymbol: "NASDAQ:AAPL",
    basePrice: 214.5,
    digits: 2,
  },
  {
    symbol: "TSLA",
    assetId: "tsla",
    name: "Tesla Inc.",
    finnhubSymbol: "TSLA",
    tvSymbol: "NASDAQ:TSLA",
    basePrice: 248.6,
    digits: 2,
  },
  {
    symbol: "NVDA",
    assetId: "nvda",
    name: "NVIDIA Corporation",
    finnhubSymbol: "NVDA",
    tvSymbol: "NASDAQ:NVDA",
    basePrice: 112.4,
    digits: 2,
  },
  {
    symbol: "USDJPY",
    assetId: "usdjpy",
    name: "Dolar / Iene japones",
    finnhubSymbol: "OANDA:USD_JPY",
    tvSymbol: "OANDA:USDJPY",
    basePrice: 145.2,
    digits: 3,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<MarketItem>(MARKET_ITEMS[0]);
  const [prices, setPrices] = useState<
    Record<string, { price: number; change: number }>
  >(() =>
    Object.fromEntries(
      MARKET_ITEMS.map((m) => [m.symbol, { price: m.basePrice, change: 0 }]),
    ),
  );
  const [userName, setUserName] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "real">(() =>
    accountStore.getMode(),
  );
  const [openCount, setOpenCount] = useState(0);
  const [activeMarketCount, setActiveMarketCount] = useState(0);
  const [flashes, setFlashes] = useState<Record<string, "up" | "down">>({});

  const refreshAccount = useCallback(() => {
    const m = accountStore.getMode();
    setMode(m);
    setOpenCount(tradeStore.getOpen().length);
  }, []);

  useEffect(() => {
    refreshAccount();
    const u1 = accountStore.subscribe(refreshAccount);
    const u2 = tradeStore.subscribe(refreshAccount);
    return () => {
      u1();
      u2();
    };
  }, [refreshAccount]);

  useEffect(() => {
    // Subscrever ao profileStore para actualizações em tempo real
    const cached = profileStore.getName();
    if (cached) setUserName(cached);

    const unsub = profileStore.subscribe(() => {
      const n = profileStore.getName();
      if (n) setUserName(n);
    });

    // Só vai ao servidor se ainda não há nome em cache
    if (!cached) {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!session?.user) return;
          supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                const name = [data.first_name, data.last_name]
                  .filter(Boolean)
                  .join(" ");
                if (name) {
                  profileStore.setName(name);
                  setUserName(name);
                }
              }
            });
        })
        .catch(() => {});
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    let count = 0;
    MARKET_ITEMS.forEach(async (item) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${item.finnhubSymbol}&token=${FINNHUB_TOKEN}`,
        );
        const data = await res.json();
        if (data?.c && data.c > 0) {
          const chg =
            data.dp ??
            ((data.c - (data.pc ?? data.c)) / (data.pc ?? data.c)) * 100;
          setPrices((prev) => ({
            ...prev,
            [item.symbol]: {
              price: data.c,
              change: parseFloat(chg.toFixed(2)),
            },
          }));
          count += 1;
          setActiveMarketCount(count);
        }
      } catch {
        /* silent */
      }
    });
  }, []);

  // ── Simulação de preços em tempo real ──────────────────────────────────────
  const tick = useCallback(() => {
    // Calcular variações aleatórias fora do setter (evita re-runs em StrictMode)
    const deltas: Record<string, number> = {};
    const nextFlashes: Record<string, "up" | "down"> = {};
    MARKET_ITEMS.forEach((item) => {
      // random walk mais dinâmico por tick, mantendo leve viés positivo
      const pct = (Math.random() - 0.49) * 0.0044;
      deltas[item.symbol] = pct;
      nextFlashes[item.symbol] = pct >= 0 ? "up" : "down";
    });
    setPrices((prev) => {
      const next: Record<string, { price: number; change: number }> = {};
      MARKET_ITEMS.forEach((item) => {
        const cur = prev[item.symbol];
        const newPrice = cur.price * (1 + deltas[item.symbol]);
        next[item.symbol] = {
          price: newPrice,
          change: parseFloat(
            (((newPrice - item.basePrice) / item.basePrice) * 100).toFixed(3),
          ),
        };
      });
      return next;
    });
    setFlashes(nextFlashes);
    setTimeout(() => setFlashes({}), 320);
  }, []);

  useEffect(() => {
    // Arrancar simulação imediatamente para ter valores não-zero
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [tick]);

  const goto = (assetId: string, action: "buy" | "sell") => {
    router.push(`/trade/dashboard/assets?asset=${assetId}&action=${action}`);
  };

  const selData = prices[selected.symbol];
  const isSelUp = (selData?.change ?? 0) >= 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    },
  };
  const stagger = {
    show: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="space-y-6 p-3 sm:p-6 overflow-y-auto h-full">
      {/* ── Boas-vindas ─────────────────────────────────────────── */}
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5 uppercase tracking-widest">
              {greeting}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {userName
                ? `${greeting}, ${userName.split(" ")[0]}!`
                : "Bem-vindo de volta!"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Sessão Trader ao Vivo — mercados e ativos em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                mode === "demo"
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-green-500/10 border-green-500/30 text-green-400",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  mode === "demo" ? "bg-yellow-400" : "bg-green-400",
                )}
              />
              Conta {mode === "demo" ? "Demo" : "Real"}
            </span>
          </div>
        </motion.div>

        {/* ── Stats cards ───────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5"
        >
          {[
            {
              label: "Posições abertas",
              value: String(openCount),
              icon: Activity,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              label: "Mercados ativos",
              value: activeMarketCount > 0 ? String(activeMarketCount) : "—",
              icon: BarChart3,
              color: "text-purple-400",
              bg: "bg-purple-500/10",
            },
            {
              label: "Alavancagem máx.",
              value: "1:100",
              icon: Percent,
              color: "text-orange-400",
              bg: "bg-orange-500/10",
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:border-accent/40 transition-colors"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  stat.bg,
                )}
              >
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums leading-tight",
                    stat.color,
                  )}
                >
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Chart + Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6"
      >
        {/* Chart card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
          {/* Top bar */}
          <div className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Ativo ao vivo
                </p>
                <h3 className="text-xl font-bold text-foreground">
                  {selected.symbol}
                </h3>
                <p className="text-xs text-muted-foreground">{selected.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Variacao</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    isSelUp ? "text-green-500" : "text-red-500",
                  )}
                >
                  {isSelUp ? "+" : ""}
                  {(selData?.change ?? 0).toFixed(2)}%
                </p>
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums transition-colors duration-500",
                    flashes[selected.symbol] === "up"
                      ? "text-green-400"
                      : flashes[selected.symbol] === "down"
                        ? "text-red-400"
                        : "text-foreground",
                  )}
                >
                  {(selData?.price ?? selected.basePrice).toFixed(
                    selected.digits,
                  )}
                </p>
              </div>
            </div>
            {/* Asset pills */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {MARKET_ITEMS.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => setSelected(item)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    selected.symbol === item.symbol
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
                  )}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          </div>
          {/* TradingView candle chart */}
          <div className="h-[360px] flex-shrink-0">
            <iframe
              key={selected.tvSymbol}
              src={`https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selected.tvSymbol)}&interval=D&timezone=Etc%2FUTC&theme=dark&style=1&locale=pt&toolbar_bg=%230d1120&enable_publishing=false&hide_side_toolbar=true&allow_symbol_change=false&save_image=false&calendar=false`}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              title={selected.symbol}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Quick actions */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground mb-1">
              Acoes Rapidas
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Ativo selecionado:{" "}
              <span className="text-foreground font-semibold">
                {selected.symbol}
              </span>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => goto(selected.assetId, "buy")}
                className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <TrendingUp className="w-4 h-4" />
                Comprar {selected.symbol}
              </button>
              <button
                onClick={() => goto(selected.assetId, "sell")}
                className="w-full py-3.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <TrendingDown className="w-4 h-4" />
                Vender {selected.symbol}
              </button>
              <a
                href="/trade/dashboard/assets"
                className="block w-full py-2.5 rounded-xl border border-border text-sm text-center text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Ver todos os ativos
              </a>
            </div>
          </div>

          {/* Popular assets */}
          <div className="rounded-2xl border border-border bg-card p-5 flex-1">
            <p className="text-sm font-semibold text-foreground mb-3">
              Ativos mais populares
            </p>
            <div className="space-y-0.5">
              {MARKET_ITEMS.slice(0, 6).map((item) => {
                const data = prices[item.symbol];
                const isUp = (data?.change ?? 0) >= 0;
                const isSel = selected.symbol === item.symbol;
                return (
                  <button
                    key={item.symbol}
                    onClick={() => setSelected(item)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left",
                      isSel ? "bg-accent/10" : "hover:bg-muted/40",
                    )}
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {item.symbol}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm tabular-nums font-medium transition-colors duration-500",
                          flashes[item.symbol] === "up"
                            ? "text-green-400"
                            : flashes[item.symbol] === "down"
                              ? "text-red-400"
                              : "text-foreground",
                        )}
                      >
                        {(data?.price ?? item.basePrice).toFixed(item.digits)}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          isUp ? "text-green-500" : "text-red-500",
                        )}
                      >
                        {isUp ? "+" : ""}
                        {(data?.change ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Credito de demonstracao
                </p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
              <span className="text-sm font-bold text-accent whitespace-nowrap">
                +$100 000
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Live market table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Mercados ao Vivo</h3>
          <a
            href="/trade/dashboard/assets"
            className="text-sm text-accent hover:underline"
          >
            Ver tudo
          </a>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-5 py-2 text-xs text-muted-foreground font-medium border-b border-border/40">
          <span>Ativo</span>
          <span className="hidden sm:block">Nome</span>
          <span className="text-right">Preco</span>
          <span className="text-right">Variacao</span>
          <span />
        </div>
        {MARKET_ITEMS.map((item) => {
          const data = prices[item.symbol];
          const isUp = (data?.change ?? 0) >= 0;
          const isSel = selected.symbol === item.symbol;
          return (
            <div
              key={item.symbol}
              onClick={() => setSelected(item)}
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-5 py-3 items-center cursor-pointer transition-colors border-b border-border/20 last:border-0",
                isSel ? "bg-accent/5" : "hover:bg-muted/20",
              )}
            >
              <span className="font-semibold text-foreground text-sm">
                {item.symbol}
              </span>
              <span className="text-sm text-muted-foreground truncate hidden sm:block">
                {item.name}
              </span>
              <span
                className={cn(
                  "text-sm font-medium tabular-nums text-right transition-colors duration-500",
                  flashes[item.symbol] === "up"
                    ? "text-green-400"
                    : flashes[item.symbol] === "down"
                      ? "text-red-400"
                      : "text-foreground",
                )}
              >
                {(data?.price ?? item.basePrice).toFixed(item.digits)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-semibold justify-end",
                  isUp ? "text-green-500" : "text-red-500",
                )}
              >
                {isUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {isUp ? "+" : ""}
                {(data?.change ?? 0).toFixed(2)}%
              </span>
              <div
                className="flex gap-1 justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => goto(item.assetId, "sell")}
                  className="text-[10px] font-semibold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                >
                  Vend.
                </button>
                <button
                  onClick={() => goto(item.assetId, "buy")}
                  className="text-[10px] font-semibold bg-green-500/10 text-green-400 hover:bg-green-600 hover:text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                >
                  Comp.
                </button>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
