// ─── Trade Store — localStorage + CustomEvent sync ───────────────────────────

const MODE_KEY = "et_account_mode";
const EVENT_NAME = "et-trade-update";

/** Returns storage keys scoped to the current account mode (demo | real) */
function keys() {
  const m =
    typeof window !== "undefined"
      ? (localStorage.getItem(MODE_KEY) ?? "real")
      : "real";
  const userId =
    typeof window !== "undefined"
      ? (localStorage.getItem("et_session_user_id") ?? "anon")
      : "anon";
  return {
    open: `et_open_positions_${userId}_${m}`,
    pending: `et_pending_orders_${userId}_${m}`,
    closed: `et_closed_positions_${userId}_${m}`,
  };
}

export interface OpenPosition {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  digits: number;
  tvSymbol: string;
  type: "buy" | "sell";
  lots: number;
  amount: number;
  leverage: number;
  openPrice: number;
  spread: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
}

export interface PendingOrder {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  digits: number;
  tvSymbol: string;
  type: "buy" | "sell";
  lots: number;
  amount: number;
  leverage: number;
  targetPrice: number;
  spread: number;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: string;
}

export interface ClosedPosition {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  icon: string;
  digits: number;
  type: "buy" | "sell";
  lots: number;
  amount: number;
  leverage: number;
  openPrice: number;
  closePrice: number;
  pnl: number;
  pnlPct: number;
  openedAt: string;
  closedAt: string;
  closeReason:
    | "manual"
    | "take_profit"
    | "stop_loss"
    | "margin_call"
    | "adjustment";
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function uid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export const tradeStore = {
  subscribe(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(EVENT_NAME, cb);
    return () => window.removeEventListener(EVENT_NAME, cb);
  },

  getOpen(): OpenPosition[] {
    return read<OpenPosition>(keys().open);
  },
  getPending(): PendingOrder[] {
    return read<PendingOrder>(keys().pending);
  },
  getClosed(): ClosedPosition[] {
    return read<ClosedPosition>(keys().closed);
  },

  openCount(): number {
    return this.getOpen().length;
  },
  pendingCount(): number {
    return this.getPending().length;
  },

  /** Open a market position immediately */
  addOpen(pos: Omit<OpenPosition, "id" | "openedAt">): OpenPosition {
    const full: OpenPosition = {
      ...pos,
      id: uid(),
      openedAt: new Date().toISOString(),
    };
    const list = this.getOpen();
    list.unshift(full);
    write(keys().open, list);

    // Persistir no Supabase em background (fire-and-forget)
    if (typeof window !== "undefined") {
      const mode = localStorage.getItem(MODE_KEY) ?? "real";
      import("@/lib/supabase").then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.access_token) return;
          fetch("/api/positions/open", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            credentials: "include",
            body: JSON.stringify({ ...full, mode }),
          }).catch(() => {});
        });
      });
    }

    return full;
  },

  /** Create a pending order (executes when price hits target) */
  addPending(order: Omit<PendingOrder, "id" | "createdAt">): PendingOrder {
    const full: PendingOrder = {
      ...order,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    const list = this.getPending();
    list.unshift(full);
    write(keys().pending, list);
    return full;
  },

  /** Close an open position at current market price */
  closePosition(
    id: string,
    closePrice: number,
    reason: "manual" | "take_profit" | "stop_loss" = "manual",
  ) {
    const open = this.getOpen();
    const idx = open.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const pos = open[idx];
    const pnl =
      pos.type === "buy"
        ? ((closePrice - pos.openPrice) / pos.openPrice) *
          pos.amount *
          pos.leverage
        : ((pos.openPrice - closePrice) / pos.openPrice) *
          pos.amount *
          pos.leverage;
    const pnlPct = (pnl / (pos.amount * pos.leverage)) * 100;
    const closed: ClosedPosition = {
      id: pos.id,
      assetId: pos.assetId,
      symbol: pos.symbol,
      name: pos.name,
      icon: pos.icon,
      digits: pos.digits,
      type: pos.type,
      lots: pos.lots,
      amount: pos.amount,
      leverage: pos.leverage,
      openPrice: pos.openPrice,
      closePrice,
      pnl,
      pnlPct,
      openedAt: pos.openedAt,
      closedAt: new Date().toISOString(),
      closeReason: reason,
    };
    open.splice(idx, 1);
    write(keys().open, open);
    const closedList = this.getClosed();
    closedList.unshift(closed);
    write(keys().closed, closedList);

    // Persistir no Supabase em background (fire-and-forget)
    if (typeof window !== "undefined") {
      import("@/lib/supabase").then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.access_token) return;
          // PATCH /api/positions/close/[id] — endpoint REST dedicado ao fecho
          fetch(`/api/positions/close/${pos.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            credentials: "include",
            body: JSON.stringify({ closePrice, pnl, closeReason: reason }),
          }).catch(() => {}); // falha silenciosa — localStorage é a fonte primária
        });
      });
    }
  },

  /** Cancel a pending order */
  cancelPending(id: string) {
    write(
      keys().pending,
      this.getPending().filter((p) => p.id !== id),
    );
  },

  /** Execute a pending order (move it to open positions) */
  executePending(id: string, currentPrice: number) {
    const pending = this.getPending();
    const idx = pending.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const order = pending[idx];
    pending.splice(idx, 1);
    write(keys().pending, pending);
    this.addOpen({
      assetId: order.assetId,
      symbol: order.symbol,
      name: order.name,
      icon: order.icon,
      digits: order.digits,
      tvSymbol: order.tvSymbol,
      type: order.type,
      lots: order.lots,
      amount: order.amount,
      leverage: order.leverage,
      openPrice: currentPrice,
      spread: order.spread,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
    });
  },

  /**
   * Adiciona uma posição fechada vinda directamente do servidor (ex: operação
   * fantasma criada pelo admin). Converte o registo da BD para o formato
   * ClosedPosition do localStorage.
   */
  addClosedFromRemote(row: Record<string, unknown>) {
    // Evitar duplicados (o evento Realtime pode disparar duas vezes)
    const existing = this.getClosed();
    if (existing.some((p) => p.id === String(row.id))) return;

    const symbol = (row.symbol as string) || "ADJUSTMENT";
    const openPrice = parseFloat(String(row.open_price ?? 1));
    const decimals = Math.max(
      (openPrice.toString().split(".")[1] ?? "").length,
      2,
    );
    const pnl = parseFloat(String(row.pnl ?? 0));
    const amount = parseFloat(String(row.amount ?? 1));

    const iconMap: Record<string, string> = {
      EURUSD: "🇪🇺",
      GBPUSD: "🇬🇧",
      USDJPY: "🇯🇵",
      AUDUSD: "🇦🇺",
      USDCAD: "🇨🇦",
      NZDUSD: "🇳🇿",
      USDCHF: "🇨🇭",
      XAUUSD: "🥇",
      BTCUSD: "₿",
    };

    const closed: ClosedPosition = {
      id: String(row.id),
      assetId: symbol,
      symbol,
      name: (row.asset_name as string) || symbol,
      icon: iconMap[symbol] ?? "📊",
      digits: decimals,
      type: ((row.type as string) === "sell" ? "sell" : "buy") as
        | "buy"
        | "sell",
      lots: parseFloat(String(row.lots ?? 0)),
      amount,
      leverage: parseInt(String(row.leverage ?? 1)),
      openPrice,
      closePrice: parseFloat(String(row.close_price ?? openPrice)),
      pnl,
      pnlPct: amount > 0 ? (pnl / amount) * 100 : 0,
      openedAt: (row.opened_at as string) ?? new Date().toISOString(),
      closedAt: (row.closed_at as string) ?? new Date().toISOString(),
      closeReason: ((row.close_reason as string) === "adjustment"
        ? "adjustment"
        : "manual") as ClosedPosition["closeReason"],
    };

    existing.unshift(closed);
    write(keys().closed, existing);
  },

  /**
   * Inicializa posições abertas a partir de dados do servidor (cross-device sync).
   * Só é chamado no arranque quando o localStorage está vazio para o modo actual.
   * Converte o formato da BD (snake_case) para o formato OpenPosition (camelCase).
   */
  initOpenFromRemote(rows: Record<string, unknown>[]) {
    if (typeof window === "undefined") return;
    const iconMap: Record<string, string> = {
      EURUSD: "🇪🇺",
      EURGBP: "€£",
      GBPUSD: "🇬🇧",
      USDJPY: "💴",
      USDCHF: "🇨🇭",
      AUDUSD: "🇦🇺",
      USDCAD: "🇨🇦",
      NZDUSD: "🇳🇿",
      EURJPY: "🇪🇺",
      XAUUSD: "🥇",
      XAGUSD: "🥈",
      BTCUSD: "₿",
      ETHUSD: "Ξ",
      SOLUSD: "◎",
      AAPL: "🍎",
      TSLA: "⚡",
      NVDA: "🟢",
      AMZN: "📦",
      MSFT: "🪟",
      META: "🔵",
      GOOGL: "🔍",
      NFLX: "🎬",
    };
    const positions: OpenPosition[] = rows
      .filter((row) => row.status === "open")
      .map((row) => {
        const symbol = String(row.symbol || "");
        const openPrice = parseFloat(String(row.open_price ?? 1));
        const decimals = Math.max(
          (openPrice.toString().split(".")[1] ?? "").length,
          2,
        );
        return {
          id: String(row.id),
          assetId: symbol.toLowerCase(),
          symbol,
          name: String(row.asset_name || symbol),
          icon: iconMap[symbol] ?? "📊",
          digits: decimals,
          tvSymbol: "",
          type: (row.type === "sell" ? "sell" : "buy") as "buy" | "sell",
          lots: parseFloat(String(row.lots ?? 0)),
          amount: parseFloat(String(row.amount ?? 0)),
          leverage: parseInt(String(row.leverage ?? 1)),
          openPrice,
          spread: parseFloat(String(row.spread ?? 0)),
          stopLoss:
            row.stop_loss != null ? parseFloat(String(row.stop_loss)) : null,
          takeProfit:
            row.take_profit != null
              ? parseFloat(String(row.take_profit))
              : null,
          openedAt: String(row.opened_at ?? new Date().toISOString()),
        };
      });
    if (positions.length > 0) {
      write(keys().open, positions);
    }
  },

  /**
   * Sincroniza posições abertas do servidor com o localStorage.
   * Deve ser chamado SEMPRE no arranque do dashboard (após login).
   *
   * Estratégia de merge (DB é autoritativo):
   * - Converte linhas do DB → OpenPosition
   * - Posições do DB que não estão em localStorage são adicionadas
   * - Posições locais não presentes no DB são mantidas (abertas nesta sessão
   *   e ainda a aguardar sincronização para o servidor)
   * - Dispara um evento para actualizar a UI
   */
  syncOpenFromRemote(rows: Record<string, unknown>[]) {
    if (typeof window === "undefined") return;

    const iconMap: Record<string, string> = {
      EURUSD: "🇪🇺",
      EURGBP: "€£",
      GBPUSD: "🇬🇧",
      USDJPY: "💴",
      USDCHF: "🇨🇭",
      AUDUSD: "🇦🇺",
      USDCAD: "🇨🇦",
      NZDUSD: "🇳🇿",
      EURJPY: "🇪🇺",
      XAUUSD: "🥇",
      XAGUSD: "🥈",
      BTCUSD: "₿",
      ETHUSD: "Ξ",
      SOLUSD: "◎",
      AAPL: "🍎",
      TSLA: "⚡",
      NVDA: "🟢",
      AMZN: "📦",
      MSFT: "🪟",
      META: "🔵",
      GOOGL: "🔍",
      NFLX: "🎬",
    };

    // Converter linhas do DB para o formato OpenPosition
    const remotePositions: OpenPosition[] = rows
      .filter((row) => row.status === "open")
      .map((row) => {
        const symbol = String(row.symbol || "");
        const openPrice = parseFloat(String(row.open_price ?? 1));
        const decimals = Math.max(
          (openPrice.toString().split(".")[1] ?? "").length,
          2,
        );
        return {
          id: String(row.id),
          assetId: symbol.toLowerCase(),
          symbol,
          name: String(row.asset_name || symbol),
          icon: iconMap[symbol] ?? "📊",
          digits: decimals,
          tvSymbol: "",
          type: (row.type === "sell" ? "sell" : "buy") as "buy" | "sell",
          lots: parseFloat(String(row.lots ?? 0)),
          amount: parseFloat(String(row.amount ?? 0)),
          leverage: parseInt(String(row.leverage ?? 1)),
          openPrice,
          spread: parseFloat(String(row.spread ?? 0)),
          stopLoss:
            row.stop_loss != null ? parseFloat(String(row.stop_loss)) : null,
          takeProfit:
            row.take_profit != null
              ? parseFloat(String(row.take_profit))
              : null,
          openedAt: String(row.opened_at ?? new Date().toISOString()),
        };
      });

    const localPositions = this.getOpen();

    if (localPositions.length === 0) {
      // localStorage vazio (caso típico após logout/login) — carregar directamente do DB
      if (remotePositions.length > 0) {
        write(keys().open, remotePositions);
      }
      return;
    }

    // Merge: DB + posições locais que ainda não chegaram ao servidor
    const remoteIds = new Set(remotePositions.map((p) => p.id));
    const localOnly = localPositions.filter((p) => !remoteIds.has(p.id));

    const merged = [...remotePositions, ...localOnly].sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
    );

    // Só escreve se houve alterações (evita re-render desnecessário)
    const remoteHasNew = remotePositions.some(
      (r) => !localPositions.find((l) => l.id === r.id),
    );
    if (remoteHasNew || localOnly.length < localPositions.length) {
      write(keys().open, merged);
    }
  },

  /**
   * Carrega posições abertas directamente da base de dados, substituindo o
   * estado local. DB é autoritativo — limpa e recarrega.
   */
  loadOpenPositions(rows: Record<string, unknown>[]) {
    if (typeof window === "undefined") return;

    const iconMap: Record<string, string> = {
      EURUSD: "🇪🇺",
      EURGBP: "€£",
      GBPUSD: "🇬🇧",
      USDJPY: "💴",
      USDCHF: "🇨🇭",
      AUDUSD: "🇦🇺",
      USDCAD: "🇨🇦",
      NZDUSD: "🇳🇿",
      EURJPY: "🇪🇺",
      XAUUSD: "🥇",
      XAGUSD: "🥈",
      BTCUSD: "₿",
      ETHUSD: "Ξ",
      SOLUSD: "◎",
      AAPL: "🍎",
      TSLA: "⚡",
      NVDA: "🟢",
      AMZN: "📦",
      MSFT: "🪟",
      META: "🔵",
      GOOGL: "🔍",
      NFLX: "🎬",
    };

    const positions: OpenPosition[] = rows
      .filter((row) => row.status === "open")
      .map((row) => {
        const symbol = String(row.symbol || "");
        const openPrice = parseFloat(String(row.open_price ?? 1));
        const decimals = Math.max(
          (openPrice.toString().split(".")[1] ?? "").length,
          2,
        );
        return {
          id: String(row.id),
          assetId: symbol.toLowerCase(),
          symbol,
          name: String(row.asset_name || symbol),
          icon: iconMap[symbol] ?? "📊",
          digits: decimals,
          tvSymbol: "",
          type: (row.type === "sell" ? "sell" : "buy") as "buy" | "sell",
          lots: parseFloat(String(row.lots ?? 0)),
          amount: parseFloat(String(row.amount ?? 0)),
          leverage: parseInt(String(row.leverage ?? 1)),
          openPrice,
          spread: parseFloat(String(row.spread ?? 0)),
          stopLoss:
            row.stop_loss != null ? parseFloat(String(row.stop_loss)) : null,
          takeProfit:
            row.take_profit != null
              ? parseFloat(String(row.take_profit))
              : null,
          openedAt: String(row.opened_at ?? new Date().toISOString()),
        };
      });

    // Substituir estado local pelos dados do servidor (DB é autoritativo)
    write(keys().open, positions);
  },

  closePositionDirect(
    id: string,
    closePrice: number,
    pnl: number,
    closedAt: string,
    closeReason: string,
  ) {
    const open = this.getOpen();
    const idx = open.findIndex((p) => p.id === id);
    if (idx < 0) return; // posição não está em localStorage

    const pos = open[idx];
    const pnlPct = pos.amount > 0 ? (pnl / pos.amount) * 100 : 0;

    const reason: ClosedPosition["closeReason"] =
      closeReason === "take_profit"
        ? "take_profit"
        : closeReason === "stop_loss"
          ? "stop_loss"
          : closeReason === "margin_call"
            ? "margin_call"
            : closeReason === "adjustment"
              ? "adjustment"
              : "manual";

    const closed: ClosedPosition = {
      id: pos.id,
      assetId: pos.assetId,
      symbol: pos.symbol,
      name: pos.name,
      icon: pos.icon,
      digits: pos.digits,
      type: pos.type,
      lots: pos.lots,
      amount: pos.amount,
      leverage: pos.leverage,
      openPrice: pos.openPrice,
      closePrice,
      pnl,
      pnlPct,
      openedAt: pos.openedAt,
      closedAt,
      closeReason: reason,
    };

    open.splice(idx, 1);
    write(keys().open, open);
    const closedList = this.getClosed();
    closedList.unshift(closed);
    write(keys().closed, closedList);
  },

  /**
   * Injeta registos históricos de referência (apenas uma vez por modo).
   * Usa IDs fixos para evitar duplicados entre reloads.
   */
  seedHistory() {
    if (typeof window === "undefined") return;
    const SEED: ClosedPosition[] = [
      {
        id: "seed_gbpusd_20260309",
        assetId: "gbpusd",
        symbol: "GBPUSD",
        name: "British Pound vs US Dollar",
        icon: "🇬🇧",
        digits: 5,
        type: "buy",
        lots: 5.0019,
        amount: 6.7,
        leverage: 200,
        openPrice: 1.33945,
        closePrice: 1.32329,
        pnl: -16.16,
        pnlPct: -1.21,
        openedAt: "2026-03-09T22:11:11.000Z",
        closedAt: "2026-03-13T18:43:10.000Z",
        closeReason: "margin_call",
      },
      {
        id: "seed_eurusd_20260306",
        assetId: "eurusd",
        symbol: "EURUSD",
        name: "Euro vs US Dollar",
        icon: "🇪🇺",
        digits: 5,
        type: "buy",
        lots: 4.9974,
        amount: 5.8,
        leverage: 200,
        openPrice: 1.16059,
        closePrice: 1.16092,
        pnl: 0.33,
        pnlPct: 0.03,
        openedAt: "2026-03-06T22:23:52.000Z",
        closedAt: "2026-03-06T22:56:32.000Z",
        closeReason: "take_profit",
      },
      {
        id: "seed_xagusd_20260305",
        assetId: "xagusd",
        symbol: "XAGUSD",
        name: "Prata vs Dolar americano",
        icon: "🥈",
        digits: 3,
        type: "buy",
        lots: 5.7503,
        amount: 486.7,
        leverage: 200,
        openPrice: 84.643,
        closePrice: 83.638,
        pnl: -1155.75,
        pnlPct: -1.19,
        openedAt: "2026-03-05T15:20:21.000Z",
        closedAt: "2026-03-05T16:00:24.000Z",
        closeReason: "margin_call",
      },
      {
        id: "seed_eurusd_20260303",
        assetId: "eurusd",
        symbol: "EURUSD",
        name: "Euro vs US Dollar",
        icon: "🇪🇺",
        digits: 5,
        type: "buy",
        lots: 5.0019,
        amount: 5.8,
        leverage: 200,
        openPrice: 1.15956,
        closePrice: 1.16455,
        pnl: 4.99,
        pnlPct: 0.43,
        openedAt: "2026-03-03T20:46:13.000Z",
        closedAt: "2026-03-04T15:17:23.000Z",
        closeReason: "manual",
      },
    ];
    const existing = this.getClosed();
    const existingIds = new Set(existing.map((p) => p.id));
    const toAdd = SEED.filter((s) => !existingIds.has(s.id));
    if (!toAdd.length) return;
    const merged = [...existing, ...toAdd].sort(
      (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    );
    write(keys().closed, merged);
  },

  /**
   * Fecha múltiplas posições em batch com um único CustomEvent.
   * Evita re-renders intermédios que causam oscilação visual do saldo.
   * Retorna o realizedPnl total após os fechos.
   */
  closeBatch(
    closures: Array<{
      id: string;
      closePrice: number;
      pnl: number;
      closedAt: string;
      closeReason: string;
    }>,
  ): number {
    if (typeof window === "undefined") return 0;
    const k = keys();
    const open = read<OpenPosition>(k.open);
    const closedList = read<ClosedPosition>(k.closed);

    for (const c of closures) {
      const idx = open.findIndex((p) => p.id === c.id);
      if (idx < 0) continue;
      const pos = open[idx];
      const pnlPct = pos.amount > 0 ? (c.pnl / pos.amount) * 100 : 0;
      const reason: ClosedPosition["closeReason"] =
        c.closeReason === "take_profit"
          ? "take_profit"
          : c.closeReason === "stop_loss"
            ? "stop_loss"
            : c.closeReason === "margin_call"
              ? "margin_call"
              : c.closeReason === "adjustment"
                ? "adjustment"
                : "manual";

      closedList.unshift({
        id: pos.id,
        assetId: pos.assetId,
        symbol: pos.symbol,
        name: pos.name,
        icon: pos.icon,
        digits: pos.digits,
        type: pos.type,
        lots: pos.lots,
        amount: pos.amount,
        leverage: pos.leverage,
        openPrice: pos.openPrice,
        closePrice: c.closePrice,
        pnl: c.pnl,
        pnlPct,
        openedAt: pos.openedAt,
        closedAt: c.closedAt,
        closeReason: reason,
      });
      open.splice(idx, 1);
    }

    // Escrever ambos os arrays sem dispatch individual
    if (typeof window !== "undefined") {
      localStorage.setItem(k.open, JSON.stringify(open));
      localStorage.setItem(k.closed, JSON.stringify(closedList));
      // Um único evento para todos os fechos
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }

    return closedList.reduce((s, p) => s + p.pnl, 0);
  },

  /** Wipe all data for the current mode */
  reset() {
    write(keys().open, []);
    write(keys().pending, []);
    write(keys().closed, []);
  },
};
