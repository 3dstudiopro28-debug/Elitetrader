"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
  Wallet,
  TrendingUp,
  TrendingDown,
  X,
  CheckCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tradeStore } from "@/lib/trade-store";
import { accountStore, type AccountStats } from "@/lib/account-store";
import { notificationStore, type Notification } from "@/lib/notification-store";
import { priceStore } from "@/lib/price-store";
import { supabase } from "@/lib/supabase";
import { profileStore } from "@/lib/profile-store";
import { useT } from "@/lib/i18n";

const FINNHUB_TOKEN = "KSA1gzO1nFSBTe4hKfw0KJvJQhhx_E_e";
const FINNHUB_MAP: Record<string, string> = {
  eurusd: "OANDA:EUR_USD",
  eurgbp: "OANDA:EUR_GBP",
  usdjpy: "OANDA:USD_JPY",
  usdchf: "OANDA:USD_CHF",
  gbpusd: "OANDA:GBP_USD",
  audusd: "OANDA:AUD_USD",
  usdcad: "OANDA:USD_CAD",
  nzdusd: "OANDA:NZD_USD",
  eurjpy: "OANDA:EUR_JPY",
  xauusd: "OANDA:XAU_USD",
  xagusd: "OANDA:XAG_USD",
  btcusd: "BINANCE:BTCUSDT",
  ethusd: "BINANCE:ETHUSDT",
  solusd: "BINANCE:SOLUSDT",
  xrpusd: "BINANCE:XRPUSDT",
  bnbusd: "BINANCE:BNBUSDT",
  adausd: "BINANCE:ADAUSDT",
  nvda: "NVDA",
  aapl: "AAPL",
  amzn: "AMZN",
  msft: "MSFT",
  tsla: "TSLA",
  meta: "META",
  googl: "GOOGL",
  nflx: "NFLX",
  jpm: "JPM",
  spy: "SPY",
  qqq: "QQQ",
  gld: "GLD",
};

function fmt(n: number) {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function askReauth(): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(
    "A sessão parece expirada. Deseja ir para a página de login agora?",
  );
}

const SUPPORTED_LANGUAGES = [
  { code: "en" as const, label: "English", flag: "🇬🇧" },
  { code: "ar" as const, label: "العربية", flag: "🇸🇦" },
  { code: "ko" as const, label: "한국어", flag: "🇰🇷" },
  { code: "ja" as const, label: "日本語", flag: "🇯🇵" },
  { code: "zh" as const, label: "繁體中文", flag: "🇨🇳" },
  { code: "pt" as const, label: "Português", flag: "🇧🇷" },
  { code: "es" as const, label: "Español", flag: "🇪🇸" },
];
type DisplayLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
const DISP_TO_CTX: Record<DisplayLangCode, import("@/lib/i18n").Lang> = {
  en: "en",
  ar: "en",
  ko: "en",
  ja: "en",
  zh: "en",
  pt: "pt",
  es: "es",
};
function StatCell({
  label,
  value,
  valueClass,
  border = true,
}: {
  label: string;
  value: string;
  valueClass?: string;
  border?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center flex-shrink-0 px-3 lg:px-4 py-0",
        border && "border-r border-sidebar-border",
      )}
    >
      <span className="text-[10px] lg:text-[12px] text-white/55 whitespace-nowrap leading-none mb-[3px] lg:mb-[5px]">
        {label}
      </span>
      <span
        className={cn(
          "text-[14px] lg:text-[18px] font-bold tabular-nums whitespace-nowrap leading-tight",
          valueClass ?? "text-white",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DashboardHeader({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const router = useRouter();
  const { lang: ctxLang, setLang: ctxSetLang, t } = useT();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [displayLang, setDisplayLang] = useState<DisplayLangCode>("pt");
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const prevDBBalRef = useRef<number | null>(null); // referência ao último saldo DB conhecido

  const recompute = useCallback(() => {
    setStats(
      accountStore.getStats(
        tradeStore.getOpen(),
        tradeStore.getClosed(),
        priceStore.get(),
      ),
    );
  }, []);

  const refreshNotifs = useCallback(() => {
    setNotifs(notificationStore.getAll());
  }, []);

  // ─── Ref para guardar userId (necessário para Realtime) ─────────────────────
  const userIdRef = useRef<string | null>(null);
  const authFailsRef = useRef(0); // contagem de falhas consecutivas de auth

  // ─── Aplicar dados de stats ao store e UI ────────────────────────────────
  const applyStats = useCallback(
    (
      demoBalance: number,
      realBalance: number,
      balanceOverride: number | null,
      equityOverride: number | null,
      marginLevelOverride: number | null,
      forceClosePositions: boolean,
      activeMode: string | null,
      forceEpochReset: boolean,
    ) => {
      const prevRealBalance = accountStore.getDBBalance("real");
      const newRealBalance = realBalance;

      // Protecção: não sobrescrever um saldo conhecido (>0) com zero.
      // Acontece quando o serverless reinicia e o adminOverrideStore em memória
      // fica vazio: o DB ainda retorna o valor correcto.
      const shouldUpdateBalance =
        newRealBalance > 0 || prevRealBalance === null;

      // Calcular epoch se:
      //   a) saldo mudou (novo valor diferente do anterior), OU
      //   b) admin forçou reset de epoch (mesmo valor re-aplicado)
      // Apenas trades não-adjustment (trades do utilizador) contribuem para o epoch.
      let newEpoch = accountStore.getBalanceEpoch();
      const balanceChanged =
        prevRealBalance === null || prevRealBalance !== newRealBalance;
      if (shouldUpdateBalance && (balanceChanged || forceEpochReset)) {
        newEpoch = tradeStore
          .getClosed()
          .filter((p) => p.closeReason !== "adjustment")
          .reduce((s, p) => s + p.pnl, 0);
      }

      const balanceForStore = shouldUpdateBalance
        ? newRealBalance
        : (prevRealBalance ?? 0);

      // ── Actualização atómica: um único ACC_EVENT ───────────────────────────
      // Passa demoBalance para inicializar o saldo demo numa única operação,
      // eliminando o segundo ACC_EVENT que causava oscilação visual.
      accountStore.applyServerData(
        balanceForStore,
        newEpoch,
        {
          balanceOverride: balanceOverride ?? null,
          equityOverride: equityOverride ?? null,
          marginLevelOverride: marginLevelOverride ?? null,
          forceClosePositions: forceClosePositions ?? false,
        },
        demoBalance,
      );

      const currentMode = accountStore.getMode();
      const affectsCurrentMode = accountStore.getMode() === "real";

      // ── Fecho de posições pelo admin ─────────────────────────────────────────
      // Também limpa forceEpochReset no servidor (clear_force_close limpa ambos)
      if ((forceClosePositions || forceEpochReset) && affectsCurrentMode) {
        prevDBBalRef.current = newRealBalance;
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            fetch("/api/user/stats", {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(session?.access_token
                  ? { Authorization: `Bearer ${session.access_token}` }
                  : {}),
              },
              body: JSON.stringify({ action: "clear_force_close" }),
            }).catch(() => {});
          })
          .catch(() => {
            fetch("/api/user/stats", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "clear_force_close" }),
            }).catch(() => {});
          });
      } else {
        prevDBBalRef.current = newRealBalance;
      }

      recompute();
    },
    [recompute],
  );

  // ─── Polling: sincronizar saldo e admin overrides a cada 5s ─────────────
  // Sempre via /api/user/stats (lê o adminOverrideStore em memória do servidor).
  // O SDK é usado apenas para obter o Bearer token — não para queries diretas ao DB.
  const syncUserStats = useCallback(async () => {
    try {
      // Obter token da sessão para autenticação (sem fazer queries ao DB aqui)
      let extraHeaders: Record<string, string> = {};
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          userIdRef.current = session.user.id;
          extraHeaders = { Authorization: `Bearer ${session.access_token}` };
          // Se JWT expirado, renovar
        } else {
          // Tentar renovar
          const {
            data: { session: refreshed },
          } = await supabase.auth.refreshSession();
          if (refreshed?.user?.id) {
            userIdRef.current = refreshed.user.id;
            extraHeaders = {
              Authorization: `Bearer ${refreshed.access_token}`,
            };
          }
        }
      } catch {
        /* sem sessão SDK — depender do cookie httpOnly */
      }

      // Chamar SEMPRE a API route (lê memory store + DB)
      const res = await fetch("/api/user/stats", {
        credentials: "include",
        headers: extraHeaders,
      });

      if (!res.ok) {
        // Só redirecionar para login quando houver evidência forte de sessão inválida.
        // Falhas 5xx/rede podem ser transitórias e não devem fechar a sessão do utilizador.
        const isAuthError = res.status === 401 || res.status === 403;
        if (isAuthError) {
          authFailsRef.current += 1;
          console.warn(
            "[elite] /api/user/stats auth →",
            res.status,
            `(falha ${authFailsRef.current}/3)`,
          );

          if (authFailsRef.current >= 3) {
            try {
              const {
                data: { session: refreshed },
                error: refreshErr,
              } = await supabase.auth.refreshSession();
              if (refreshErr || !refreshed?.user?.id) {
                if (askReauth()) router.replace("/auth/login");
              } else {
                // Sessão renovada: não expulsar utilizador
                authFailsRef.current = 0;
              }
            } catch {
              if (askReauth()) router.replace("/auth/login");
            }
          }
        } else {
          console.warn("[elite] /api/user/stats transient →", res.status);
        }
        return;
      }

      const json = await res.json();
      if (!json.success) {
        console.warn("[elite] /api/user/stats error:", json.error);
        return;
      }

      authFailsRef.current = 0;
      const d = json.data;
      if (d?.userId) userIdRef.current = d.userId;

      applyStats(
        d.demoBalance ?? 100_000,
        d.realBalance ?? 0,
        d.balanceOverride ?? null,
        d.equityOverride ?? null,
        d.marginLevelOverride ?? null,
        d.forceClosePositions ?? false,
        d.activeMode ?? null,
        d.forceEpochReset ?? false,
      );

      // Buscar overrides de preço do admin (apenas xauusd actualmente)
      try {
        const priceRes = await fetch("/api/user/prices", {
          credentials: "include",
          headers: extraHeaders,
        });
        if (priceRes.ok) {
          const priceJson = await priceRes.json();
          if (priceJson.prices && typeof priceJson.prices === "object") {
            priceStore.setAdminOverrides(priceJson.prices);
          }
        }
      } catch {
        /* silent */
      }
    } catch (err) {
      console.error("[elite] syncUserStats:", err);
    }
  }, [applyStats, router]);

  useEffect(() => {
    recompute();
    refreshNotifs();
    // Sincronização imediata ao montar
    syncUserStats();
    const u1 = accountStore.subscribe(recompute);
    const u2 = notificationStore.subscribe(refreshNotifs);
    // Recalcular equity sempre que a assets page publica novos preços
    const u3 = priceStore.subscribe(() => {
      setStats(
        accountStore.getStats(
          tradeStore.getOpen(),
          tradeStore.getClosed(),
          priceStore.get(),
        ),
      );
    });
    // Poll levemente mais lento para suavizar atualização de patrimônio/margens.
    const iv = setInterval(syncUserStats, 1650);
    return () => {
      u1();
      u2();
      u3();
      clearInterval(iv);
    };
  }, [recompute, refreshNotifs, syncUserStats]);

  // ─── Supabase Realtime: reflectir mudanças do admin imediatamente ─────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtime() {
      // 1. Tentar obter uid da sessão do SDK
      let uid: string | null = null;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        uid = session?.user?.id ?? null;
      } catch {
        /* */
      }

      // 2. Fallback: uid guardado pelo syncUserStats via /api/user/stats
      if (!uid) uid = userIdRef.current;

      // 3. Se ainda não temos uid, tentar via API (cookie)
      if (!uid) {
        try {
          const res = await fetch("/api/user/stats", {
            credentials: "include",
          });
          const json = await res.json();
          uid = json.data?.userId ?? null;
          if (uid) userIdRef.current = uid;
        } catch {
          /* */
        }
      }

      if (!uid) return;

      channel = supabase
        .channel(`admin-monitor-${uid}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: "admin_overrides",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            syncUserStats();
          },
        )
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          {
            event: "UPDATE",
            schema: "public",
            table: "accounts",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            syncUserStats();
          },
        )
        .subscribe();
    }

    // Arrancar realtime mais cedo para reduzir janela sem updates visuais.
    const t = setTimeout(setupRealtime, 250);
    return () => {
      clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [syncUserStats]);

  // Live price polling rápido — único poller Finnhub da aplicação.
  // Escreve no priceStore (cache partilhado) → portfolio e outros subscrevem.
  // TP/SL aqui: funciona em qualquer página, não só no portfolio.
  useEffect(() => {
    let dead = false;
    async function poll() {
      const open = tradeStore.getOpen();
      if (!open.length) {
        recompute();
        return;
      }
      // livePrices  — apenas d.c > 0 (mercado aberto).  Usados para TP/SL.
      // displayPrices — fallback d.pc quando mercado fechado. Usados só para equity/display.
      const livePrices: Record<string, number> = {};
      const displayPrices: Record<string, number> = {};
      await Promise.all(
        open.map(async (pos) => {
          // Assets com override admin não são actualizados pelo Finnhub
          // (o admin controla o preço — respeitamos o valor definido)
          if (priceStore.getAdminOverride(pos.assetId) !== null) return;
          const sym = FINNHUB_MAP[pos.assetId];
          if (!sym) return;
          try {
            const r = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_TOKEN}`,
              { cache: "no-store" },
            );
            const d = await r.json();
            if (d.c && d.c > 0) {
              // Mercado aberto — preço real → TP/SL + display
              livePrices[pos.assetId] = d.c;
              displayPrices[pos.assetId] = d.c;
            } else if (d.pc && d.pc > 0) {
              // Mercado fechado — previous-close apenas para equity/display, NUNCA para TP/SL
              displayPrices[pos.assetId] = d.pc;
            }
          } catch {
            /* silent */
          }
        }),
      );
      if (dead) return;
      // Actualizar cache partilhado — portfolio e sidebar subscrevem (usa displayPrices)
      priceStore.set(displayPrices);
      const freshPrices = priceStore.get();
      // ─── TP/SL auto-close — APENAS com preços reais (mercado aberto) ─────
      // Se não há preço live (d.c = 0), o mercado está fechado → não avaliar TP/SL.
      for (const pos of tradeStore.getOpen()) {
        const price = livePrices[pos.assetId]; // sem fallback: só dispara com preço live
        if (!price) continue;
        if (pos.takeProfit !== null) {
          const hitTP =
            pos.type === "buy"
              ? price >= pos.takeProfit
              : price <= pos.takeProfit;
          if (hitTP) {
            const pnl =
              pos.type === "buy"
                ? ((pos.takeProfit - pos.openPrice) / pos.openPrice) *
                  pos.amount *
                  pos.leverage
                : ((pos.openPrice - pos.takeProfit) / pos.openPrice) *
                  pos.amount *
                  pos.leverage;
            tradeStore.closePosition(pos.id, pos.takeProfit, "take_profit");
            notificationStore.add(
              "trade_close",
              `✅ Take Profit atingido — ${pos.symbol}`,
              `Posição fechada com ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} lucro`,
            );
            refreshNotifs();
            continue;
          }
        }
        if (pos.stopLoss !== null) {
          const hitSL =
            pos.type === "buy" ? price <= pos.stopLoss : price >= pos.stopLoss;
          if (hitSL) {
            const pnl =
              pos.type === "buy"
                ? ((pos.stopLoss - pos.openPrice) / pos.openPrice) *
                  pos.amount *
                  pos.leverage
                : ((pos.openPrice - pos.stopLoss) / pos.openPrice) *
                  pos.amount *
                  pos.leverage;
            tradeStore.closePosition(pos.id, pos.stopLoss, "stop_loss");
            notificationStore.add(
              "warning",
              `⚠️ Stop Loss ativado — ${pos.symbol}`,
              `Posição fechada com $${pnl.toFixed(2)} perde`,
            );
            refreshNotifs();
          }
        }
      }
      setStats(
        accountStore.getStats(
          tradeStore.getOpen(),
          tradeStore.getClosed(),
          freshPrices,
        ),
      );
    }
    poll();
    const iv = setInterval(poll, 5000);
    return () => {
      dead = true;
      clearInterval(iv);
    };
  }, [recompute, refreshNotifs]);

  // ─── Simulação rápida para TODOS os activos com posições abertas ─────────
  // Garante que equity/margem/PnL flutuam em qualquer página da aplicação.
  // O poll Finnhub (8s) sobrepõe com preços reais quando disponíveis.
  // Sem esta simulação, assets com código Finnhub mas sem cotação live (d.c=0)
  // ficavam completamente estáticos, tornando o patrimônio e margem congelados.
  useEffect(() => {
    // Preços base de referência — fallback quando priceStore está vazio
    const BASE: Record<string, number> = {
      eurusd: 1.092,
      eurgbp: 0.853,
      usdjpy: 145.2,
      usdchf: 0.9012,
      gbpusd: 1.2932,
      audusd: 0.6358,
      usdcad: 1.3578,
      nzdusd: 0.5924,
      eurjpy: 158.2,
      xauusd: 3310.0,
      xagusd: 32.5,
      brentusd: 66.0,
      wtiusd: 62.5,
      natgas: 3.85,
      btcusd: 104500.0,
      ethusd: 2480.0,
      solusd: 177.0,
      xrpusd: 2.25,
      bnbusd: 648.0,
      adausd: 0.78,
      nvda: 131.0,
      aapl: 205.0,
      amzn: 196.8,
      msft: 450.0,
      tsla: 282.0,
      meta: 625.0,
      googl: 178.4,
      nflx: 1060.0,
      jpm: 258.0,
      us500: 5900.0,
      nas100: 21200.0,
      us30: 42600.0,
      uk100: 8680.0,
      ger40: 23200.0,
      spy: 582.0,
      qqq: 512.0,
      gld: 318.0,
    };
    // Volatilidade realista por activo (fracção do preço por tick rápido)
    const VOL: Record<string, number> = {
      eurusd: 0.00012,
      eurgbp: 0.00012,
      usdjpy: 0.00015,
      usdchf: 0.00012,
      gbpusd: 0.00012,
      audusd: 0.00012,
      usdcad: 0.00012,
      nzdusd: 0.00012,
      eurjpy: 0.00015,
      xauusd: 0.0003,
      xagusd: 0.0003,
      brentusd: 0.0003,
      wtiusd: 0.0003,
      natgas: 0.0004,
      btcusd: 0.0008,
      ethusd: 0.0008,
      solusd: 0.001,
      xrpusd: 0.001,
      bnbusd: 0.0008,
      adausd: 0.001,
      us500: 0.00015,
      nas100: 0.00015,
      us30: 0.00015,
      uk100: 0.00015,
      ger40: 0.00015,
      nvda: 0.0004,
      aapl: 0.0003,
      amzn: 0.0003,
      msft: 0.0003,
      tsla: 0.0006,
      meta: 0.0003,
      googl: 0.0003,
      nflx: 0.0004,
      jpm: 0.0003,
      spy: 0.00015,
      qqq: 0.00015,
      gld: 0.0002,
    };
    const DEFAULT_VOL = 0.0002;
    const iv = setInterval(() => {
      const open = tradeStore.getOpen();
      if (!open.length) return;
      const cache = priceStore.get();
      const patch: Record<string, number> = {};
      for (const pos of open) {
        // Para assets com override admin (ex: xauusd), usar o override como base.
        // Isto garante que o preço flutua em torno do valor definido pelo admin.
        const adminOverride = priceStore.getAdminOverride(pos.assetId);
        // Usar override admin → cache → BASE fallback
        const base =
          adminOverride ??
          cache[pos.assetId] ??
          BASE[pos.assetId] ??
          pos.openPrice;
        const vol = base * (VOL[pos.assetId] ?? DEFAULT_VOL);
        // Flutuação aleatória ainda mais viva para interface dinâmica.
        // O poll Finnhub sobrepõe quando há cotação real.
        patch[pos.assetId] = Math.max(
          base * 0.1,
          base + (Math.random() - 0.5) * vol * 0.065,
        );
      }
      // priceStore.set dispara CustomEvent → u3 subscribe → setStats automático
      if (Object.keys(patch).length) priceStore.set(patch);
    }, 620);
    return () => clearInterval(iv);
  }, []);

  // Carregar idioma guardado ao montar
  useEffect(() => {
    const saved = localStorage.getItem("elite_lang") as DisplayLangCode | null;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved))
      setDisplayLang(saved);
  }, []);

  // Sincronizar badge quando ctxLang muda (ex: via header público)
  useEffect(() => {
    if (displayLang === ctxLang) return;
    const match = SUPPORTED_LANGUAGES.find((l) => l.code === ctxLang);
    if (match) setDisplayLang(match.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxLang]);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-user-menu]")) setUserOpen(false);
      if (!t.closest("[data-bell-menu]")) setBellOpen(false);
      if (!t.closest("[data-lang-menu]")) setLangOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const [mode, setMode] = useState<"demo" | "real">(() =>
    accountStore.getMode(),
  );
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const cached = profileStore.getName();
    if (cached) setUserName(cached);
    const unsub = profileStore.subscribe(() => {
      const n = profileStore.getName();
      if (n) setUserName(n);
    });
    // Só vai buscar ao servidor se o profileStore ainda não tem nome
    // (evita sobrescrever um nome actualizado pela página de conta com o
    //  user_metadata do Supabase Auth, que nunca é actualizado via PATCH /api/user/profile)
    if (!cached) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        void (async () => {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", session.user.id)
              .single();
            if (data) {
              const n = [data.first_name, data.last_name]
                .filter(Boolean)
                .join(" ");
              if (n) {
                profileStore.setName(n);
                setUserName(n);
              }
            }
          } catch {
            /* silent */
          }
        })();
      });
    }
    return () => unsub();
  }, []);

  useEffect(() => {
    setMode(accountStore.getMode());
  }, []);
  // Keep mode in sync when stats update
  useEffect(() => {
    if (stats?.mode) setMode(stats.mode);
  }, [stats?.mode]);

  const handleLogout = useCallback(async () => {
    // Limpar todos os dados locais
    if (typeof window !== "undefined") localStorage.clear();
    // Terminar sessão Supabase
    try {
      await supabase.auth.signOut();
    } catch {
      /* silent */
    }
    router.push("/auth/login");
  }, [router]);

  const s = stats;
  const pnlPos = (s?.pnl ?? 0) >= 0;

  // ── Stats helper — função para evitar reutilização do mesmo objecto JSX ──
  // Renderizar o mesmo objecto JSX em dois sítios pode causar problemas no
  // reconciliador do React. Usar uma função garante dois elementos distintos.
  const renderStats = () => (
    <>
      <StatCell
        label={t.dashboard.balance}
        value={s ? `$${fmt(s.balance)}` : "—"}
      />
      <StatCell
        label={t.dashboard.equity}
        value={s ? `$${fmt(s.equity)}` : "—"}
        valueClass="text-accent"
      />
      <StatCell
        label={t.dashboard.usedMargin}
        value={s ? `$${fmt(s.usedMargin)}` : "—"}
      />
      <StatCell
        label={t.dashboard.freeMargin}
        value={s ? `$${fmt(s.freeMargin)}` : "—"}
        valueClass={s && s.freeMargin < 0 ? "text-red-400" : undefined}
      />
      <StatCell
        label={t.dashboard.pnl}
        value={s ? `${pnlPos ? "+" : "-"}$${fmt(Math.abs(s.pnl))}` : "—"}
        valueClass={pnlPos ? "text-green-400" : "text-red-400"}
      />
      <StatCell
        label={t.dashboard.marginLevel}
        value={
          s?.marginLevel != null
            ? `${s.marginLevel.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
            : "—"
        }
        border={false}
      />
    </>
  );

  return (
    <header className="relative flex-shrink-0 bg-sidebar border-b border-sidebar-border flex flex-col w-full z-40">
      {/* ── Linha principal ──────────────────────────── */}
      <div className="h-[4.5rem] flex items-stretch w-full">
        {/* ── Hamburguer (mobile only) ──────────────────── */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden flex items-center justify-center w-14 border-r border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* ── Logo ─────────────────────────────────────── */}
        <Link
          href="/trade/dashboard"
          className="flex items-center gap-3 px-5 border-r border-sidebar-border flex-shrink-0 hover:bg-sidebar-accent transition-colors"
        >
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <span
              className="text-white font-black text-lg leading-none notranslate"
              translate="no"
            >
              E
            </span>
          </div>
          <span className="text-[17px] font-extrabold tracking-tight hidden lg:block">
            <span className="text-accent notranslate" translate="no">
              Elite
            </span>
            <span className="text-white notranslate" translate="no">
              {" "}
              Trade
            </span>
          </span>
        </Link>

        {/* ── Stats (desktop inline) ─────────────────────── */}
        <div className="hidden lg:flex items-stretch overflow-x-auto no-scrollbar divide-x divide-sidebar-border">
          {renderStats()}
        </div>

        {/* ── Spacer ────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Right actions ─────────────────────────────── */}
        <div className="flex items-center gap-0.5 px-3 border-l border-sidebar-border flex-shrink-0">
          {/* Language switcher */}
          <div data-lang-menu className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Selecionar idioma"
            >
              <span className="text-base leading-none">
                {SUPPORTED_LANGUAGES.find((l) => l.code === displayLang)
                  ?.flag ?? "🇧🇷"}
              </span>
              <span className="text-[11px] font-semibold uppercase">
                {displayLang}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-sidebar/95 backdrop-blur-xl border border-sidebar-border rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setDisplayLang(lang.code);
                      localStorage.setItem("elite_lang", lang.code);
                      ctxSetLang(DISP_TO_CTX[lang.code]);
                      setLangOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      lang.code === displayLang
                        ? "text-accent font-semibold bg-sidebar-accent"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <span className="text-base leading-none w-6 text-center">
                      {lang.flag}
                    </span>
                    <span>{lang.label}</span>
                    {lang.code === displayLang && (
                      <span className="text-[10px] text-accent ml-auto">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications bell */}
          <div data-bell-menu className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Bell className="w-4 h-4" />
              {notifs.some((n) => !n.read) && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                  {notifs.filter((n) => !n.read).length > 9
                    ? "9+"
                    : notifs.filter((n) => !n.read).length}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-sidebar border border-sidebar-border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-sidebar-border">
                  <span className="text-sm font-semibold text-sidebar-foreground">
                    {t.dashboard.notifications}
                  </span>
                  {notifs.some((n) => !n.read) && (
                    <button
                      onClick={() => {
                        notificationStore.markAllRead();
                        refreshNotifs();
                      }}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />{" "}
                      {t.dashboard.markAllRead}
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t.dashboard.noNotifications}
                    </div>
                  ) : (
                    notifs.slice(0, 20).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          notificationStore.markRead(n.id);
                          if (
                            n.type === "trade_close" ||
                            n.type === "warning" ||
                            n.type === "success"
                          ) {
                            setBellOpen(false);
                            router.push("/trade/dashboard/history");
                          }
                        }}
                        className={cn(
                          "flex gap-2.5 px-4 py-2.5 border-b border-sidebar-border/50 last:border-0 cursor-pointer hover:bg-sidebar-accent transition-colors",
                          n.read && "opacity-60",
                        )}
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            n.type === "trade_open"
                              ? "bg-green-500/20"
                              : n.type === "trade_close"
                                ? "bg-accent/20"
                                : n.type === "success"
                                  ? "bg-green-500/20"
                                  : n.type === "account"
                                    ? "bg-purple-500/20"
                                    : n.type === "warning"
                                      ? "bg-red-500/20"
                                      : "bg-accent/20",
                          )}
                        >
                          {n.type === "trade_open" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          ) : n.type === "success" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          ) : n.type === "trade_close" ? (
                            <TrendingDown className="w-3.5 h-3.5 text-accent" />
                          ) : n.type === "warning" ? (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          ) : n.type === "account" ? (
                            <User className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-xs font-semibold",
                              n.read
                                ? "text-sidebar-foreground/60"
                                : "text-sidebar-foreground",
                            )}
                          >
                            {n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {new Date(n.createdAt).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
                {notifs.length > 0 && (
                  <div className="px-4 py-2 border-t border-sidebar-border">
                    <button
                      onClick={() => {
                        notificationStore.clear();
                        refreshNotifs();
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> {t.dashboard.clearAll}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div data-user-menu className="relative">
            <button
              onClick={() => setUserOpen((o) => !o)}
              className="flex items-center gap-1.5 h-9 px-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-accent-foreground" />
              </div>
              {userName && (
                <span className="text-[12px] font-semibold text-sidebar-foreground hidden lg:block max-w-[120px] truncate">
                  {userName.split(" ")[0]}
                </span>
              )}
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  userOpen && "rotate-180",
                )}
              />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-sidebar border border-sidebar-border rounded-xl shadow-xl z-50 py-1">
                {userName && (
                  <div className="px-4 py-2.5 border-b border-sidebar-border">
                    <p className="text-[11px] text-muted-foreground">Conta</p>
                    <p className="text-sm font-semibold text-sidebar-foreground truncate">
                      {userName}
                    </p>
                  </div>
                )}
                <Link
                  href="/trade/dashboard/account"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <User className="w-4 h-4 text-muted-foreground" /> Minha Conta
                </Link>
                <Link
                  href="/trade/dashboard/funds?tab=withdraw"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <Wallet className="w-4 h-4 text-muted-foreground" />{" "}
                  Levantamentos
                </Link>
                <Link
                  href="/trade/dashboard/account?tab=security"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />{" "}
                  {t.dashboard.settings}
                </Link>
                <div className="h-px bg-sidebar-border my-1" />
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-sidebar-accent transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" /> {t.dashboard.signOut}
                </button>
              </div>
            )}
          </div>

          {/* Depósito */}
          <Link
            href="/trade/dashboard/funds?tab=deposit"
            className="ml-2 h-8 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-bold hover:bg-accent/90 active:scale-95 transition-all whitespace-nowrap flex items-center"
          >
            {t.dashboard.deposit}
          </Link>
        </div>
        {/* fim right-actions */}
      </div>
      {/* fim linha principal */}

      {/* ── Stats strip mobile (segunda linha) ────────────── */}
      <div className="lg:hidden flex items-stretch overflow-x-auto no-scrollbar divide-x divide-sidebar-border border-t border-sidebar-border bg-sidebar/95 h-12">
        {renderStats()}
      </div>
    </header>
  );
}
