"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  tradeStore,
  OpenPosition,
  PendingOrder,
  ClosedPosition,
} from "@/lib/trade-store";
import { priceStore } from "@/lib/price-store";
import { notificationStore } from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  History,
  BarChart2,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPrice(n: number, digits: number) {
  return n.toFixed(digits);
}

// Formata valores monetários em formato europeu
function fmtMoney(n: number) {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calcLivePnl(pos: OpenPosition, currentPrice: number) {
  // Fallback: BUY opened at ASK → current value is BID (= ASK − spread)
  //           SELL opened at BID → current value is ASK (= BID + spread)
  const fallback =
    pos.type === "buy"
      ? pos.openPrice - (pos.spread ?? 0)
      : pos.openPrice + (pos.spread ?? 0);
  const price = currentPrice > 0 ? currentPrice : fallback;
  const pnl =
    pos.type === "buy"
      ? ((price - pos.openPrice) / pos.openPrice) * pos.amount * pos.leverage
      : ((pos.openPrice - price) / pos.openPrice) * pos.amount * pos.leverage;
  const pnlPct = (pnl / (pos.amount * pos.leverage)) * 100;
  return { pnl, pnlPct, price };
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "red" | "blue" | "yellow" | "neutral";
}) {
  const iconBg = {
    green: "bg-green-500/15 text-green-500",
    red: "bg-red-500/15 text-red-500",
    blue: "bg-accent/15 text-accent",
    yellow: "bg-yellow-500/15 text-yellow-500",
    neutral: "bg-muted text-muted-foreground",
  }[color];

  const valColor = {
    green: "text-green-500",
    red: "text-red-500",
    blue: "text-accent",
    yellow: "text-yellow-500",
    neutral: "text-foreground",
  }[color];

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 min-w-0">
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          iconBg,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn("text-base font-bold truncate", valColor)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Open Positions Tab ────────────────────────────────────────────────────────
function OpenPositionsTab({
  positions,
  prices,
  closingId,
  onClose,
}: {
  positions: OpenPosition[];
  prices: Record<string, number>;
  closingId: string | null;
  onClose: (pos: OpenPosition) => void;
}) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <BarChart2 className="w-12 h-12 opacity-25" />
        <p className="text-sm font-medium">Nenhuma posição aberta</p>
        <Link
          href="/trade/dashboard/assets"
          className="text-xs text-accent hover:underline"
        >
          Abrir novo trade →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {positions.map((pos) => {
        const currentPrice = prices[pos.assetId] ?? 0;
        const { pnl, pnlPct, price } = calcLivePnl(pos, currentPrice);
        const isClosing = closingId === pos.id;
        const positive = pnl >= 0;

        return (
          <div
            key={pos.id}
            className={cn(
              "bg-card border border-border rounded-xl p-4 transition-all duration-300",
              isClosing && "opacity-50 scale-[0.98]",
            )}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{pos.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-foreground">
                      {pos.symbol}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        pos.type === "buy"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500",
                      )}
                    >
                      {pos.type === "buy" ? "COMPRA" : "VENDA"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {pos.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p
                    className={cn(
                      "text-lg font-bold leading-tight",
                      positive ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {positive ? "+" : ""}${fmtMoney(pnl)}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      positive ? "text-green-500/70" : "text-red-500/70",
                    )}
                  >
                    {pnlPct >= 0 ? "+" : ""}
                    {pnlPct.toFixed(2)}%
                  </p>
                </div>
                <button
                  onClick={() => onClose(pos)}
                  disabled={isClosing}
                  className="bg-red-500/15 hover:bg-red-500/25 text-red-500 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {isClosing ? "Fechando…" : "Fechar"}
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs border-t border-border/50 pt-3">
              <div>
                <p className="text-muted-foreground">Abertura</p>
                <p className="font-medium text-foreground">
                  {fmtPrice(pos.openPrice, pos.digits)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Atual</p>
                <p
                  className={cn(
                    "font-medium",
                    positive ? "text-green-500" : "text-red-500",
                  )}
                >
                  {fmtPrice(price, pos.digits)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Lotes</p>
                <p className="font-medium text-foreground">
                  {pos.lots.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Aberto</p>
                <p className="font-medium text-foreground">
                  {fmtDate(pos.openedAt)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pending Orders Tab ────────────────────────────────────────────────────────
function PendingOrdersTab({
  orders,
  cancelingId,
  onCancel,
}: {
  orders: PendingOrder[];
  cancelingId: string | null;
  onCancel: (id: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Clock className="w-12 h-12 opacity-25" />
        <p className="text-sm font-medium">Nenhum pedido pendente</p>
        <Link
          href="/trade/dashboard/assets"
          className="text-xs text-accent hover:underline"
        >
          Criar ordem pendente →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isCanceling = cancelingId === order.id;

        return (
          <div
            key={order.id}
            className={cn(
              "bg-card border border-dashed border-border rounded-xl p-4 transition-all duration-300",
              isCanceling && "opacity-50 scale-[0.98]",
            )}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{order.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-foreground">
                      {order.symbol}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        order.type === "buy"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500",
                      )}
                    >
                      {order.type === "buy" ? "COMPRA" : "VENDA"}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 shrink-0">
                      PENDENTE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {order.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onCancel(order.id)}
                disabled={isCanceling}
                className="bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                {isCanceling ? "Cancelando…" : "Cancelar"}
              </button>
            </div>

            {/* Stats row */}
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs border-t border-border/50 pt-3">
              <div>
                <p className="text-muted-foreground">Preço alvo</p>
                <p className="font-medium text-foreground">
                  {fmtPrice(order.targetPrice, order.digits)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Volume</p>
                <p className="font-medium text-foreground">
                  ${fmtMoney(order.amount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Lotes</p>
                <p className="font-medium text-foreground">
                  {order.lots.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Alavancagem</p>
                <p className="font-medium text-foreground">{order.leverage}x</p>
              </div>
            </div>

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Criado: {fmtDate(order.createdAt)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Date Picker ────────────────────────────────────────────────────────────────
function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(
    () => parsed?.getFullYear() ?? new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsed?.getMonth() ?? new Date().getMonth(),
  );
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const MONTHS = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const WEEK = ["S", "T", "Q", "Q", "S", "S", "D"];

  function selectDay(day: number) {
    const yyyy = String(viewYear).padStart(4, "0");
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  function displayValue() {
    if (!value) return null;
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm hover:border-accent transition-colors min-w-[130px]"
      >
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {displayValue() ? (
          <span className="text-foreground">{displayValue()}</span>
        ) : (
          <span className="text-muted-foreground text-xs">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl p-3 w-[230px] select-none">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEK.map((d, i) => (
              <div
                key={i}
                className="text-center text-[9px] text-muted-foreground font-medium py-0.5"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                parsed &&
                parsed.getFullYear() === viewYear &&
                parsed.getMonth() === viewMonth &&
                parsed.getDate() === day;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "h-7 w-full rounded-md text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : isToday
                        ? "bg-muted/70 text-foreground font-bold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground py-1 border-t border-border transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Closed Positions Tab ─────────────────────────────────────────────────────
function ClosedPositionsTab({
  positions,
  filterFrom,
  filterTo,
  onFilterFrom,
  onFilterTo,
}: {
  positions: ClosedPosition[];
  filterFrom: string;
  filterTo: string;
  onFilterFrom: (v: string) => void;
  onFilterTo: (v: string) => void;
}) {
  // Soma apenas trades manuais do utilizador (excluir ghost/adjustment)
  const totalPnl = positions
    .filter(p => p.closeReason !== "adjustment")
    .reduce((acc, p) => acc + p.pnl, 0);

  return (
    <div>
      {/* Date filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">De:</span>
          <DatePicker
            value={filterFrom}
            onChange={onFilterFrom}
            placeholder="data início"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Até:</span>
          <DatePicker
            value={filterTo}
            onChange={onFilterTo}
            placeholder="data fim"
          />
        </div>
        {(filterFrom || filterTo) && (
          <button
            onClick={() => {
              onFilterFrom("");
              onFilterTo("");
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Limpar filtro
          </button>
        )}
        {positions.length > 0 && (
          <div className="ml-auto text-sm">
            <span className="text-muted-foreground">P&L total: </span>
            <span
              className={cn(
                "font-bold",
                totalPnl >= 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {totalPnl >= 0 ? "+" : ""}${fmtMoney(totalPnl)}
            </span>
          </div>
        )}
      </div>

      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <History className="w-12 h-12 opacity-25" />
          <p className="text-sm font-medium">Nenhuma posição fechada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => (
            <div
              key={pos.id + pos.closedAt}
              className="bg-card border border-border rounded-xl p-4"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{pos.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {pos.symbol}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                          pos.type === "buy"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500",
                        )}
                      >
                        {pos.type === "buy" ? "COMPRA" : "VENDA"}
                      </span>
                      {pos.closeReason === "take_profit" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-green-500/20 text-green-500">
                          TAKE PROFIT
                        </span>
                      )}
                      {pos.closeReason === "stop_loss" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-red-500/20 text-red-500">
                          STOP LOSS
                        </span>
                      )}
                      {pos.closeReason === "adjustment" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-blue-500/20 text-blue-400">
                          AUTOMÁTICO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {pos.name}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-lg font-bold leading-tight",
                      pos.pnl >= 0 ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {pos.pnl >= 0 ? "+" : ""}${fmtMoney(pos.pnl)}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      pos.pnl >= 0 ? "text-green-500/70" : "text-red-500/70",
                    )}
                  >
                    {pos.pnlPct >= 0 ? "+" : ""}
                    {pos.pnlPct.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-3 grid grid-cols-4 gap-2 text-xs border-t border-border/50 pt-3">
                <div>
                  <p className="text-muted-foreground">Preço abertura</p>
                  <p className="font-medium text-foreground">
                    {fmtPrice(pos.openPrice, pos.digits)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preço fechamento</p>
                  <p
                    className={cn(
                      "font-medium",
                      pos.pnl >= 0 ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {fmtPrice(pos.closePrice, pos.digits)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Volume</p>
                  <p className="font-medium text-foreground">
                    ${fmtMoney(pos.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lotes</p>
                  <p className="font-medium text-foreground">
                    {pos.lots?.toFixed(2) ?? "—"}
                  </p>
                </div>
              </div>

              {/* Footer dates */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Aberto: {fmtDate(pos.openedAt)}</span>
                <span>Fechado: {fmtDate(pos.closedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "open" | "pending" | "closed") ?? "open";
  const [tab, setTab] = useState<"open" | "pending" | "closed">(initialTab);
  const [open, setOpen] = useState<OpenPosition[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [closed, setClosed] = useState<ClosedPosition[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    priceStore.get(),
  );
  const [closingId, setClosingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const refresh = useCallback(() => {
    setOpen(tradeStore.getOpen());
    setPending(tradeStore.getPending());
    setClosed(tradeStore.getClosed());
  }, []);

  useEffect(() => {
    refresh();
    return tradeStore.subscribe(refresh);
  }, [refresh]);

  // Preços vêm do header (único poller Finnhub) via priceStore
  useEffect(() => {
    setPrices(priceStore.get());
    return priceStore.subscribe((freshPrices) => {
      setPrices((prev) => ({ ...prev, ...freshPrices }));
    });
  }, []);

  function handleClose(pos: OpenPosition) {
    setClosingId(pos.id);
    const currentPrice = prices[pos.assetId] ?? pos.openPrice;
    setTimeout(() => {
      tradeStore.closePosition(pos.id, currentPrice);
      setClosingId(null);
      const { pnl } = calcLivePnl(pos, currentPrice);
      const pnlStr = (pnl >= 0 ? "+" : "") + "$" + Math.abs(pnl).toFixed(2);
      notificationStore.add(
        pnl >= 0 ? "success" : "warning",
        pnl >= 0 ? `Lucro — ${pos.symbol}` : `Perda — ${pos.symbol}`,
        `${pos.type === "buy" ? "Compra" : "Venda"} encerrada manualmente | P&L ${pnlStr}`,
      );
    }, 600);
  }

  function handleCancel(id: string) {
    setCancelingId(id);
    setTimeout(() => {
      tradeStore.cancelPending(id);
      setCancelingId(null);
    }, 400);
  }

  // Summary stats
  const livePnl = open.reduce((acc, pos) => {
    const { pnl } = calcLivePnl(pos, prices[pos.assetId] ?? 0);
    return acc + pnl;
  }, 0);

  // P&L Realizado: apenas trades manuais do utilizador.
  // Ghost trades (adjustment) são excluídos — não representam operações reais do utilizador.
  const realizedPnl = closed
    .filter(p => p.closeReason !== "adjustment")
    .reduce((acc, p) => acc + p.pnl, 0);

  // Filter closed by date
  const filteredClosed = closed.filter((pos) => {
    if (filterFrom && new Date(pos.closedAt) < new Date(filterFrom))
      return false;
    if (filterTo && new Date(pos.closedAt) > new Date(filterTo + "T23:59:59"))
      return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary cards */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-3 p-4 border-b border-border">
        <SummaryCard
          label="P&L Não realizado"
          value={`${livePnl >= 0 ? "+" : ""}$${livePnl.toFixed(2)}`}
          color={livePnl > 0 ? "green" : livePnl < 0 ? "red" : "neutral"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <SummaryCard
          label="Posições abertas"
          value={`${open.length} aberta${open.length !== 1 ? "s" : ""}  •  ${pending.length} pendente${pending.length !== 1 ? "s" : ""}`}
          color="blue"
          icon={<Wallet className="w-4 h-4" />}
        />
        <SummaryCard
          label="P&L Realizado"
          value={`${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)}`}
          color={
            realizedPnl > 0 ? "green" : realizedPnl < 0 ? "red" : "neutral"
          }
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center border-b border-border px-4 gap-1">
        {(
          [
            [
              "open",
              "Posições abertas",
              open.length,
              "bg-accent text-accent-foreground",
            ],
            [
              "pending",
              "Pedidos pendentes",
              pending.length,
              "bg-yellow-500 text-white",
            ],
            ["closed", "Posições fechadas", 0, ""],
          ] as const
        ).map(([key, label, count, badgeCls]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              tab === key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "ml-1.5 text-[10px] min-w-[18px] h-[18px] rounded-full inline-flex items-center justify-center px-1 font-bold leading-none",
                  badgeCls,
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "open" && (
          <OpenPositionsTab
            positions={open}
            prices={prices}
            closingId={closingId}
            onClose={handleClose}
          />
        )}
        {tab === "pending" && (
          <PendingOrdersTab
            orders={pending}
            cancelingId={cancelingId}
            onCancel={handleCancel}
          />
        )}
        {tab === "closed" && (
          <ClosedPositionsTab
            positions={filteredClosed}
            filterFrom={filterFrom}
            filterTo={filterTo}
            onFilterFrom={setFilterFrom}
            onFilterTo={setFilterTo}
          />
        )}
      </div>
    </div>
  );
}
