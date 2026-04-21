"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { profileStore } from "@/lib/profile-store";
import { useT } from "@/lib/i18n";

type DashboardHeaderProps = {
  onMenuOpen?: () => void;
};

function formatCurrency(value: number, currency: string) {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: currency || "USD",
  });
}

export function DashboardHeader({ onMenuOpen }: DashboardHeaderProps) {
  const router = useRouter();
  const { t } = useT();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [userName, setUserName] = useState<string>("Trader");

  const fetchProfileHeader = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/user/profile", {
        credentials: "include",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) return;

      const json = await response.json();
      if (!json?.success || !json?.data) return;

      if (typeof json.data.balance === "number") {
        setBalance(json.data.balance);
      }

      if (typeof json.data.currency === "string" && json.data.currency) {
        setCurrency(json.data.currency);
      }

      const name = [json.data.firstName, json.data.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (name) {
        profileStore.setName(name);
        setUserName(name);
      }
    } catch {
      // Mantem o ultimo valor valido para evitar piscar para zero em falhas transitorias.
    }
  }, []);

  useEffect(() => {
    fetchProfileHeader();
    const interval = setInterval(fetchProfileHeader, 2000);
    return () => clearInterval(interval);
  }, [fetchProfileHeader]);

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
      // noop
    }

    router.push("/auth/login");
  }, [router]);

  return (
    <header className="relative flex-shrink-0 bg-sidebar border-b border-sidebar-border flex flex-col w-full z-40">
      <div className="h-[4.5rem] flex items-stretch w-full">
        <button
          onClick={onMenuOpen}
          className="lg:hidden flex items-center justify-center w-14 border-r border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href="/trade/dashboard"
          className="flex items-center gap-3 px-5 border-r border-sidebar-border flex-shrink-0 hover:bg-sidebar-accent transition-colors"
        >
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-lg leading-none">
              E
            </span>
          </div>
          <span className="text-[17px] font-extrabold tracking-tight hidden lg:block">
            <span className="text-accent">Elite</span>
            <span className="text-white"> Trade</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center px-4 text-sm text-sidebar-foreground border-r border-sidebar-border">
          <span className="text-sidebar-foreground/60 mr-2">
            {t.dashboard.realBalance}:
          </span>
          <strong>
            {balance === null ? "..." : formatCurrency(balance, currency)}
          </strong>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 px-3 border-l border-sidebar-border">
          <Link
            href="/trade/dashboard/funds?tab=deposit"
            className="h-8 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-bold hover:bg-accent/90 active:scale-95 transition-all whitespace-nowrap flex items-center"
          >
            {t.dashboard.deposit}
          </Link>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 h-9 px-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Menu do usuario"
            >
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-accent-foreground" />
              </div>
              <span className="text-[12px] font-semibold text-sidebar-foreground hidden lg:block max-w-[120px] truncate">
                {(userName || "Trader").split(" ")[0]}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-sidebar border border-sidebar-border rounded-xl shadow-xl z-50 py-1">
                <div className="px-4 py-2.5 border-b border-sidebar-border">
                  <p className="text-[11px] text-muted-foreground">Conta</p>
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {userName || "Trader"}
                  </p>
                </div>
                <Link
                  href="/trade/dashboard/account"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User className="w-4 h-4 text-muted-foreground" /> Minha Conta
                </Link>
                <Link
                  href="/trade/dashboard/funds?tab=withdraw"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Wallet className="w-4 h-4 text-muted-foreground" />{" "}
                  Levantamentos
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
        </div>
      </div>

      <div className="lg:hidden flex items-center px-4 h-12 border-t border-sidebar-border bg-sidebar/95 text-sm">
        <span className="text-sidebar-foreground/60 mr-2">
          {t.dashboard.realBalance}:
        </span>
        <strong>
          {balance === null ? "..." : formatCurrency(balance, currency)}
        </strong>
      </div>
    </header>
  );
}

export default DashboardHeader;
