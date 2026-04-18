"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { supabase } from "@/lib/supabase";
import { tradeStore } from "@/lib/trade-store";
import { accountStore } from "@/lib/account-store";
import { notificationStore } from "@/lib/notification-store";
import type { GhostPayload } from "@/lib/ghost-pending-store";

/** Limpa todos os dados ET do localStorage se o utilizador for diferente do anterior.
 *  Evita que utilizador B herde posições/histórico/epoch do utilizador A. */
function clearStaleUserData(userId: string) {
  try {
    const stored = localStorage.getItem("et_session_user_id");
    if (stored && stored !== userId) {
      // Utilizador diferente — apagar todos os dados ET
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("et_"));
      keys.forEach((k) => localStorage.removeItem(k));
    }
    localStorage.setItem("et_session_user_id", userId);
  } catch {
    /* SSR / private browsing */
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth
          .refreshSession()
          .then(({ data: { session: refreshed } }) => {
            if (!refreshed) router.replace("/auth/login");
            else {
              clearStaleUserData(refreshed.user.id);
              // Em cada novo login, iniciar sempre em conta real.
              accountStore.setMode("real");
              setReady(true);
            }
          })
          .catch(() => router.replace("/auth/login"));
      } else {
        clearStaleUserData(session.user.id);
        // Em cada novo login, iniciar sempre em conta real.
        accountStore.setMode("real");
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Limpar todos os dados ET ao terminar sessão para que o próximo
        // utilizador não herde posições/histórico/epoch desta sessão.
        try {
          const keys = Object.keys(localStorage).filter((k) =>
            k.startsWith("et_"),
          );
          keys.forEach((k) => localStorage.removeItem(k));
        } catch {
          /* ignore */
        }
        router.replace("/auth/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ── Polling: ghost trades gerados pelo admin ──────────────────────────────
  useEffect(() => {
    if (!ready) return;

    // ── Sync cross-device: buscar posições abertas do servidor ──────────────
    // Garante que o utilizador vê as suas posições em qualquer dispositivo.
    // Só preenche o localStorage se estiver vazio para o modo actual.
    async function syncOpenPositionsFromDB() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        // Verificação extra de segurança: só sincronizar se o userId em localStorage
        // corresponder ao da sessão actual (clearStaleUserData devia garantir isto,
        // mas verificamos novamente por precaução).
        const storedUserId = localStorage.getItem("et_session_user_id");
        if (storedUserId && storedUserId !== session.user.id) {
          // Dados obsoletos — limpar e sair (o clearStaleUserData já devia ter corrido)
          const keys = Object.keys(localStorage).filter((k) =>
            k.startsWith("et_"),
          );
          keys.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem("et_session_user_id", session.user.id);
          return;
        }
        const localOpen = tradeStore.getOpen();
        if (localOpen.length > 0) return; // já tem posições locais — não sobrescrever
        const res = await fetch("/api/positions/open", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const { data } = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Só carregar posições abertas recentes (última 1h) para evitar
          // artefactos de sessões anteriores que nunca foram fechados no DB.
          // Este cutoff deve ser idêntico ao do servidor (admin/users/[id]/route.ts).
          const cutoff = Date.now() - 60 * 60 * 1000; // 1 hora
          const recent = (data as Record<string, unknown>[]).filter((row) => {
            const openedAt = new Date(
              String(row.opened_at ?? row.openedAt ?? 0),
            ).getTime();
            return openedAt > cutoff;
          });
          if (recent.length > 0) {
            tradeStore.initOpenFromRemote(recent);
          }
        }
      } catch {
        /* falha silenciosa */
      }
    }
    syncOpenPositionsFromDB();

    async function fetchGhostTrades() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch("/api/user/ghost-trades", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!res.ok) return;

        const { payload } = (await res.json()) as {
          payload: GhostPayload | null;
        };
        if (!payload) return;

        const openPositions = tradeStore.getOpen();
        const n = openPositions.length;

        if (payload.mode === "close_open" && n > 0) {
          // ─── O servidor já fechou as posições no DB e calculou os P/Ls ───
          // payload.pnls contém os P/Ls exactos calculados server-side.
          // Usar directamente para não re-distribuir e não criar dupla entrada no DB.
          // Se por algum motivo o número de pnls não bater com n, cair para totalDelta.

          const serverPnls = payload.pnls ?? [];
          const totalDelta =
            payload.totalDelta ?? serverPnls.reduce((a, b) => a + b, 0);
          const now = new Date().toISOString();

          // Mapear P/Ls do servidor → posições locais (pela ordem de abertura)
          // Se contagens divergirem usa totalDelta dividido igualmente
          let pnls: number[];
          if (serverPnls.length === n) {
            pnls = serverPnls;
          } else {
            // Fallback: distribuição igual pelo totalDelta
            const each = parseFloat((totalDelta / n).toFixed(2));
            pnls = openPositions.map((_, i) =>
              i === n - 1
                ? parseFloat((totalDelta - each * (n - 1)).toFixed(2))
                : each,
            );
          }

          // Construir closures para actualizar localStorage
          const closures = openPositions.map((pos, i) => {
            const pnl = pnls[i] ?? 0;
            const contractSize = 100_000;
            const divisor = pos.lots * contractSize;
            const priceMove = divisor > 0 ? pnl / divisor : 0;
            const rawClose =
              pos.type === "buy"
                ? pos.openPrice + priceMove
                : pos.openPrice - priceMove;
            const closePrice = Math.max(rawClose, pos.openPrice * 0.0001);
            return {
              id: pos.id,
              closePrice: parseFloat(closePrice.toFixed(5)),
              pnl,
              closedAt: now,
              closeReason: "adjustment",
            };
          });

          // Actualizar localStorage (DB já está correcto — não enviar DELETE)
          tradeStore.closeBatch(closures);

          // Notificações
          openPositions.forEach((pos, i) => {
            const pnl = pnls[i] ?? 0;
            const pnlStr =
              (pnl >= 0 ? "+" : "") + "$" + Math.abs(pnl).toFixed(2);
            notificationStore.add(
              "trade_close",
              `Posição fechada — ${pos.symbol}`,
              `${pos.type === "buy" ? "Compra" : "Venda"} encerrada | P&L ${pnlStr}`,
            );
          });
        }
        // n === 0: saldo já actualizado no DB pela stats poll — nada a fazer
      } catch {
        // falha silenciosa — próximo ciclo tenta de novo
      }
    }

    fetchGhostTrades();
    pollRef.current = setInterval(fetchGhostTrades, 1_200);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ready]);

  // ── Sync de estatísticas de posições para o CRM admin ───────────────────
  useEffect(() => {
    if (!ready) return;

    async function syncPositions() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const open = tradeStore.getOpen();
        const closed = tradeStore.getClosed();
        const totalPnl = closed.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
        await fetch("/api/user/positions/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            openCount: open.length,
            closedCount: closed.length,
            totalPnl,
          }),
        });
      } catch {
        // silencioso
      }
    }

    syncPositions();
    const syncId = setInterval(syncPositions, 20_000);
    return () => clearInterval(syncId);
  }, [ready]);

  // ── Supabase Realtime (posições abertas fechadas remotamente) ─────────────
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;

      const channel = supabase
        .channel(`pos-watch-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "positions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row.status === "closed" && row.pnl != null) {
              tradeStore.closePositionDirect(
                row.id as string,
                parseFloat(String(row.close_price ?? 0)),
                parseFloat(String(row.pnl)),
                (row.closed_at as string) ?? new Date().toISOString(),
                (row.close_reason as string) ?? "manual",
              );
            }
          },
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [ready]);

  // ── Presença online/offline para CRM admin ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    async function pingPresence(action: "ping" | "offline" = "ping") {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        await fetch("/api/user/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action }),
        });
      } catch {
        // silencioso
      }
    }

    pingPresence("ping");
    presenceRef.current = setInterval(() => pingPresence("ping"), 25_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") pingPresence("ping");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (presenceRef.current) clearInterval(presenceRef.current);
      pingPresence("offline");
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[oklch(0.115_0.038_265)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[oklch(0.55_0.22_265)] border-t-transparent animate-spin" />
          <p className="text-sm text-[oklch(0.65_0.018_255)]">
            A carregar sessão…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh overflow-hidden bg-background flex flex-col"
      style={{ "--header-h": "4.5rem" } as React.CSSProperties}
    >
      <DashboardHeader onMenuOpen={() => setMobileOpen(true)} />
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="flex flex-1 min-h-0">
        <DashboardSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onCollapsedChange={setSidebarCollapsed}
        />
        {/* Mobile: pl-0 (sidebar é overlay). Desktop: dinâmico conforme sidebar colapsada/expandida */}
        <main
          className={`dashboard-light bg-background text-foreground flex-1 overflow-hidden pl-0 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "md:pl-16 lg:pl-64"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
