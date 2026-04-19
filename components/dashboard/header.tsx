// Handler para abrir menu lateral no mobile
function onMenuOpen() {
  const evt = new CustomEvent("open-sidebar");
  window.dispatchEvent(evt);
}
("use client");

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
import { notificationStore, type Notification } from "@/lib/notification-store";
import { supabase } from "@/lib/supabase";
import { profileStore } from "@/lib/profile-store";
import { userStore, type AccountMode } from "@/lib/user-store";
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
  //

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

  const router = useRouter();
  const { lang: ctxLang, setLang: ctxSetLang, t } = useT();
  const [userOpen, setUserOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [displayLang, setDisplayLang] = useState<DisplayLangCode>("pt");
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [mode, setMode] = useState<AccountMode>(() => {
    if (typeof window === "undefined") return "real";
    return (localStorage.getItem("crm-mode") as AccountMode) || "real";
  });
  const [balance, setBalance] = useState<number>(0);

  const refreshNotifs = useCallback(() => {
    setNotifs(notificationStore.getAll());
  }, []);

  // Atualiza saldo ao mudar localStorage
  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    setMode((localStorage.getItem("crm-mode") as AccountMode) || "real");
    const users = userStore.getAll();
    const user = users.length > 0 ? users[0] : null;
    if (!user) {
      setBalance(0);
      return;
    }
    setBalance(
      mode === "real" ? (user.realBalance ?? 0) : (user.demoBalance ?? 0),
    );
  }, [mode]);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  // Live price polling moderado — único poller Finnhub da aplicação.
  // Escreve no priceStore (cache partilhado) → portfolio e outros subscrevem.
  // TP/SL aqui: funciona em qualquer página, não só no portfolio.

  // ─── Simulação moderada para TODOS os activos com posições abertas ───────
  // Garante que equity/margem/PnL flutuam em qualquer página da aplicação.
  // O poll Finnhub (8s) sobrepõe com preços reais quando disponíveis.
  // Sem esta simulação, assets com código Finnhub mas sem cotação live (d.c=0)
  // ficavam completamente estáticos, tornando o patrimônio e margem congelados.

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

  const handleLogout = useCallback(async () => {
    // Limpar apenas tokens de sessão Supabase, preservando dados do CRM local
    if (typeof window !== "undefined") {
      localStorage.removeItem("sb-access-token");
      localStorage.removeItem("sb-refresh-token");
      localStorage.removeItem("sb-expires-at");
      localStorage.removeItem("sb-provider-token");
      localStorage.removeItem("sb-provider-refresh-token");
    }
    // Terminar sessão Supabase
    try {
      await supabase.auth.signOut();
    } catch {
      /* silent */
    }
    router.push("/auth/login");
  }, [router]);

  // Apenas saldo real/demo do CRM local
  const renderStats = () => (
    <>
      <StatCell
        label={
          mode === "real" ? t.dashboard.realBalance : t.dashboard.demoBalance
        }
        value={`$${balance.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
    </>
  );

  // Não precisa mais de fallback para stats/DB

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
              {userName ? (
                <span className="text-[12px] font-semibold text-sidebar-foreground hidden lg:block max-w-[120px] truncate">
                  {(userName ?? "").split(" ")[0]}
                </span>
              ) : null}
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
