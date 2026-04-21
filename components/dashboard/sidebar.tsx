"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  History,
  GraduationCap,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  UserCircle,
  Banknote,
  ChevronDown,
  Share2,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { accountStore } from "@/lib/account-store";
import { type AccountMode } from "@/lib/user-store";
import { userStore } from "@/lib/user-store";
import { profileStore } from "@/lib/profile-store";
import { tradeStore } from "@/lib/trade-store";

const DEMO_ID_KEY = "et_demo_account_id";
const REAL_ID_KEY = "et_real_account_id";
function getDemoId(): string {
  if (typeof window === "undefined") return "ET-00001";
  let id = localStorage.getItem(DEMO_ID_KEY);
  if (!id) {
    id = "ET-" + String(Math.floor(10000 + Math.random() * 90000));
    localStorage.setItem(DEMO_ID_KEY, id);
  }
  return id;
}
function getRealId(): string {
  if (typeof window === "undefined") return "RLT-00001";
  let id = localStorage.getItem(REAL_ID_KEY);
  if (!id) {
    id = "RLT-" + String(Math.floor(10000 + Math.random() * 90000));
    localStorage.setItem(REAL_ID_KEY, id);
  }
  return id;
}

export function DashboardSidebar({
  mobileOpen,
  onMobileClose,
  onCollapsedChange,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  // Modo da conta (demo/real) salvo no localStorage
  const [mode, setModeState] = useState<AccountMode>(() =>
    accountStore.getMode(),
  );
  const [copied, setCopied] = useState(false);
  const [demoId, setDemoId] = useState("ET-00001");
  const [realId, setRealId] = useState("RLT-00001");
  const [userName, setUserName] = useState<string | null>(null);

  const { t } = useT();

  const navItems = [
    {
      icon: LayoutDashboard,
      label: t.dashboard.navDashboard,
      href: "/trade/dashboard",
    },
    {
      icon: TrendingUp,
      label: t.dashboard.navAssets,
      href: "/trade/dashboard/assets",
    },
  ];

  const navGroups = [
    {
      label: t.dashboard.navPortfolio,
      icon: Wallet,
      items: [
        {
          label: t.dashboard.navOpenPositions,
          href: "/trade/dashboard/portfolio?tab=open",
        },
        {
          label: "Pendentes",
          href: "/trade/dashboard/portfolio?tab=pending",
        },
        {
          label: "Posições Fechadas",
          href: "/trade/dashboard/portfolio?tab=closed",
        },
      ],
    },
    {
      label: t.dashboard.navFunds,
      icon: Banknote,
      items: [
        {
          label: t.dashboard.navDeposit,
          href: "/trade/dashboard/funds?tab=deposit",
        },
        {
          label: t.dashboard.navWithdraw,
          href: "/trade/dashboard/funds?tab=withdraw",
        },
        {
          label: t.dashboard.navHistory,
          href: "/trade/dashboard/funds?tab=history",
        },
      ],
    },
    {
      label: t.dashboard.navAnalysis,
      icon: Activity,
      items: [
        { label: t.dashboard.navTechnical, href: "/trade/dashboard/analysis" },
      ],
    },
  ];

  const bottomItems = [
    {
      icon: HelpCircle,
      label: "Ajuda",
      href: "/trade/dashboard/help",
    },
    {
      icon: Share2,
      label: t.dashboard.navPartners,
      href: "/about",
    },
  ];

  // Profile completion: 4/4 se conta activada (saldo > 0), 2/4 se tem nome, 1/4 caso base
  const dbBal = accountStore.getDBBalance(mode);
  const STEPS_TOTAL = 4;
  const STEPS_DONE = dbBal !== null && dbBal > 0 ? 4 : userName ? 2 : 1;

  // Atualiza modo da conta ao mudar no localStorage
  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    setModeState(accountStore.getMode());
  }, []);

  useEffect(() => {
    setDemoId(getDemoId());
    setRealId(getRealId());
    refresh();
    // Buscar nome do backend
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/user/profile", {
        credentials: "include",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        const name = [json.data.firstName, json.data.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        setUserName(name);
      }
    })();
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  // Fechar drawer mobile ao navegar
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleMode() {
    const next: AccountMode = mode === "demo" ? "real" : "demo";
    accountStore.setMode(next);
    setModeState(next);
  }

  const handleLogout = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sb-access-token");
      localStorage.removeItem("sb-refresh-token");
      localStorage.removeItem("sb-expires-at");
      localStorage.removeItem("sb-provider-token");
      localStorage.removeItem("sb-provider-refresh-token");
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* silent */
    }
    router.push("/auth/login");
  }, [router]);

  function copyId() {
    const id = mode === "demo" ? demoId : realId;
    navigator.clipboard.writeText(id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Saldo: sempre do CRM local (userStore)
  // Saldo: sempre do backend
  const [balance, setBalance] = useState<number>(0);
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/user/profile", {
        credentials: "include",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        const nextBalance =
          mode === "demo" ? json.data.demoBalance : json.data.realBalance;
        if (typeof nextBalance === "number") {
          setBalance(nextBalance);
        }
      }
    })();
  }, [mode]);

  const isDemo = mode === "demo";

  return (
    <aside
      className={cn(
        "fixed left-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 overflow-y-auto",
        // Mobile: header tem 7.5rem (4.5rem + 3rem strip de stats)
        // Desktop (lg): header tem 4.5rem (strip de stats está escondida)
        "top-[7.5rem] h-[calc(100dvh-7.5rem)] lg:top-[4.5rem] lg:h-[calc(100dvh-4.5rem)]",
        // Mobile: escondida por defeito, mostra como overlay quando mobileOpen
        "hidden lg:flex",
        mobileOpen && "!flex w-[min(18rem,85vw)]",
        // Tablet (md): colapsada por defeito
        !mobileOpen && (collapsed ? "lg:w-16" : "md:w-16 lg:w-64"),
      )}
    >
      {/* ── Collapse button ───────────────────────────────── */}
      <div className="h-12 flex items-center justify-end px-3 border-b border-sidebar-border flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/60 hover:bg-sidebar-accent flex-shrink-0"
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            onCollapsedChange?.(next);
          }}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      {/* ── Profile section ───────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border flex-shrink-0 space-y-2.5">
          {/* Nome do utilizador */}
          {userName && (
            <p className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
              {userName}
            </p>
          )}

          {/* Demo / Real toggle */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11px] font-semibold transition-colors",
                isDemo
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/40",
              )}
            >
              {t.dashboard.modeVirtual}
            </span>
            <button
              onClick={toggleMode}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 focus:outline-none",
                isDemo ? "bg-accent/40" : "bg-accent",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                  isDemo ? "translate-x-0" : "translate-x-4",
                )}
              />
            </button>
            <span
              className={cn(
                "text-[11px] font-semibold transition-colors",
                !isDemo
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/40",
              )}
            >
              {t.dashboard.modeReal}
            </span>
          </div>

          {/* Account ID */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-sidebar-foreground/55 leading-none mb-0.5">
                {t.dashboard.accountId}
              </p>
              <p className="text-[12px] font-mono font-semibold text-sidebar-foreground">
                {isDemo ? demoId : realId}
              </p>
            </div>
            <button
              onClick={copyId}
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-sidebar-foreground transition-colors flex-shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Alavancagem + saldo */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-sidebar-foreground/55">
              {t.dashboard.maxLeverage}
            </span>
            <span className="font-semibold text-sidebar-foreground">1:500</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-sidebar-foreground/55">
              {isDemo ? t.dashboard.demoBalance : t.dashboard.realBalance}
            </span>
            <span
              className={cn(
                "font-bold",
                isDemo ? "text-accent" : "text-green-600",
              )}
            >
              {`$${balance.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>

          {/* Profile completion */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-sidebar-foreground/55">
                {t.dashboard.completeProfile}
              </span>
              <span className="text-[10px] font-semibold text-sidebar-foreground">
                {STEPS_DONE}/{STEPS_TOTAL}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-sidebar-accent overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${(STEPS_DONE / STEPS_TOTAL) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsed mode badge */}
      {collapsed && (
        <button
          onClick={toggleMode}
          className="mx-auto mt-3 w-8 h-5 flex-shrink-0 rounded-full flex items-center justify-center cursor-pointer"
          title={`Modo: ${mode}`}
        >
          <span
            className={cn(
              "text-[8px] font-black px-1 py-0.5 rounded-full",
              isDemo
                ? "bg-yellow-500/30 text-yellow-400"
                : "bg-green-500/30 text-green-400",
            )}
          >
            {isDemo ? "D" : "R"}
          </span>
        </button>
      )}

      {/* ── Main Navigation ───────────────────────────────── */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {/* Direct items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Grouped items */}
        {!collapsed &&
          navGroups.map((group) => (
            <NavGroup key={group.label} group={group} pathname={pathname} />
          ))}
        {collapsed &&
          navGroups.map((group) => (
            <Link
              key={group.label}
              href={group.items[0].href}
              className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <group.icon className="w-5 h-5 flex-shrink-0" />
            </Link>
          ))}
      </nav>

      {/* ── Bottom Navigation ─────────────────────────────── */}
      <div className="py-3 px-2 border-t border-sidebar-border space-y-0.5 flex-shrink-0">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{t.dashboard.signOut}</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Collapsible nav group ──────────────────────────────────────────────────
function NavGroup({
  group,
  pathname,
}: {
  group: {
    label: string;
    icon: React.ElementType;
    items: { label: string; href: string }[];
  };
  pathname: string;
}) {
  const isAnyActive = group.items.some((i) =>
    pathname.startsWith(i.href.split("?")[0]),
  );
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isAnyActive
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        <group.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform flex-shrink-0",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="ml-8 mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const p = item.href.split("?")[0];
            const isActive = pathname === p || pathname.startsWith(p + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-3 py-1.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "text-accent font-semibold"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
