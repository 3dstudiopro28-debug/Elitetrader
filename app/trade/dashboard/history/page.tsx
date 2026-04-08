"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tradeStore, type ClosedPosition } from "@/lib/trade-store";

function fmt(n: number) {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function reasonLabel(r: ClosedPosition["closeReason"]) {
  if (r === "take_profit")
    return { text: "Tirar Lucro", cls: "bg-green-500/15 text-green-500" };
  if (r === "stop_loss")
    return { text: "Stop Loss", cls: "bg-red-500/15 text-red-500" };
  if (r === "margin_call")
    return {
      text: "Chamada de Margem Stop Out",
      cls: "bg-orange-500/15 text-orange-400",
    };
  if (r === "adjustment")
    return { text: "Automático", cls: "bg-blue-500/15 text-blue-400" };
  return { text: "Por Cliente", cls: "bg-muted text-muted-foreground" };
}

export default function HistoryPage() {
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");

  useEffect(() => {
    setPositions(tradeStore.getClosed());
    const unsub = () => setPositions(tradeStore.getClosed());
    window.addEventListener("et-trade-update", unsub);

    // Carregar do Supabase e fundir com localStorage (histórico persistente)
    fetch("/api/positions/closed", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.length) {
          json.data.forEach((row: Record<string, unknown>) =>
            tradeStore.addClosedFromRemote(row),
          );
          setPositions(tradeStore.getClosed());
        }
      })
      .catch(() => {});

    return () => window.removeEventListener("et-trade-update", unsub);
  }, []);

  const filtered =
    filter === "all" ? positions : positions.filter((p) => p.type === filter);
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const winners = positions.filter((p) => p.pnl > 0).length;
  const losers = positions.filter((p) => p.pnl < 0).length;
  const winRate =
    positions.length > 0
      ? ((winners / positions.length) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Histórico de Posições
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Todas as posições fechadas
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-[11px] text-muted-foreground">Total operações</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {positions.length}
            </p>
          </div>
          <div
            className={cn(
              "bg-card border rounded-xl p-4 shadow-sm",
              totalPnl >= 0 ? "border-green-200/30" : "border-red-200/30",
            )}
          >
            <p className="text-[11px] text-muted-foreground">P&L Total</p>
            <p
              className={cn(
                "text-2xl font-bold mt-1",
                totalPnl >= 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-[11px] text-muted-foreground">Win rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {winRate}%
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-[11px] text-muted-foreground">Ganhos / Perdas</p>
            <p className="text-2xl font-bold mt-1">
              <span className="text-green-500">{winners}</span>
              <span className="text-muted-foreground text-lg mx-1">/</span>
              <span className="text-red-500">{losers}</span>
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(["all", "buy", "sell"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === f
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f === "all" ? "Todos" : f === "buy" ? "Compras" : "Vendas"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sem posições fechadas</p>
              <p className="text-xs mt-1">
                As suas operações fechadas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left   text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Ativos
                    </th>
                    <th className="px-4 py-3 text-left   text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Direção
                    </th>
                    <th className="px-4 py-3 text-right  text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Investimento
                      <br />
                      inicial
                    </th>
                    <th className="px-4 py-3 text-right  text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Lucro&nbsp;/&nbsp;Perda
                    </th>
                    <th className="px-4 py-3 text-right  text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Taxa de
                      <br />
                      abertura
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Tempo Aberto
                    </th>
                    <th className="px-4 py-3 text-right  text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Taxa de
                      <br />
                      fecho
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="flex items-center justify-center gap-1">
                        Hora de Fecho <ChevronDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left   text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Motivo de fecho
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((p) => {
                    const { text: reasonText, cls: reasonCls } = reasonLabel(
                      p.closeReason,
                    );
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* Ativos */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 border border-border/30 shrink-0">
                              {p.icon}
                            </span>
                            <span className="font-semibold text-foreground">
                              {p.symbol}
                            </span>
                          </div>
                        </td>

                        {/* Direção */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "flex items-center gap-1 text-xs font-semibold w-fit",
                              p.type === "buy" ? "text-green-500" : "text-red-500",
                            )}
                          >
                            {p.type === "buy" ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {p.type === "buy" ? "Comprar" : "Vender"}
                          </span>
                        </td>

                        {/* Investimento inicial */}
                        <td className="px-4 py-3 text-right tabular-nums text-foreground font-medium">
                          ${fmt(p.amount)}
                        </td>

                        {/* Lucro / Perda */}
                        <td className="px-4 py-3 text-right tabular-nums font-bold">
                          <span
                            className={
                              p.pnl >= 0 ? "text-green-500" : "text-red-500"
                            }
                          >
                            {p.pnl >= 0 ? "+" : ""}${fmt(p.pnl)}
                          </span>
                        </td>

                        {/* Taxa de abertura */}
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {p.openPrice.toFixed(p.digits)}
                        </td>

                        {/* Tempo Aberto */}
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground text-xs whitespace-nowrap">
                          {fmtDate(p.openedAt)}
                        </td>

                        {/* Taxa de fecho */}
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {p.closePrice.toFixed(p.digits)}
                        </td>

                        {/* Hora de Fecho */}
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground text-xs whitespace-nowrap">
                          {fmtDate(p.closedAt)}
                        </td>

                        {/* Motivo de fecho */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-[11px] px-2 py-1 rounded-md font-medium whitespace-nowrap",
                              reasonCls,
                            )}
                          >
                            {reasonText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
