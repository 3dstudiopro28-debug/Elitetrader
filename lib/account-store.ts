// ─── Account Store — Demo / Real mode + financial stats ────────────────────────
import type { OpenPosition, ClosedPosition } from "@/lib/trade-store";

export type AccountMode = "demo" | "real";

export const DEMO_START_BALANCE = 100_000; // $100,000 demo balance
export const REAL_START_BALANCE = 0; // stub — will come from DB

const MODE_KEY = "et_account_mode";
const ACC_EVENT = "et-account-mode";
const ADMIN_ML_KEY = "et_admin_margin_level";
const ADMIN_BAL_KEY = "et_admin_balance_add";
const DB_BAL_DEMO_KEY = "et_db_balance_demo"; // saldo demo vindo do DB
const DB_BAL_REAL_KEY = "et_db_balance_real"; // saldo real vindo do DB
const DB_OVER_KEY = "et_db_overrides";
// "Epoch" = realizedPnL no momento em que o admin definiu o último saldo.
// Garante que apenas trades FUTUROS (após a alteração do admin) afectam o saldo.
const BAL_EPOCH_REAL_KEY = "et_balance_epoch_real";

export interface AccountStats {
  mode: AccountMode;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  pnl: number;
  marginLevel: number | null;
}

export const accountStore = {
  getMode(): AccountMode {
    if (typeof window === "undefined") return "demo";
    return (localStorage.getItem(MODE_KEY) as AccountMode) ?? "demo";
  },

  setMode(mode: AccountMode) {
    if (typeof window === "undefined") return;
    localStorage.setItem(MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent(ACC_EVENT));
    window.dispatchEvent(new CustomEvent("et-trade-update"));
  },

  // ─── Admin overrides ──────────────────────────────────────────────────────
  getAdminMarginOverride(): number | null {
    if (typeof window === "undefined") return null;
    const val = localStorage.getItem(ADMIN_ML_KEY);
    return val !== null ? parseFloat(val) : null;
  },
  setAdminMarginOverride(level: number | null) {
    if (typeof window === "undefined") return;
    if (level === null) localStorage.removeItem(ADMIN_ML_KEY);
    else localStorage.setItem(ADMIN_ML_KEY, String(level));
    window.dispatchEvent(new CustomEvent(ACC_EVENT));
  },

  getAdminBalanceAdd(): number {
    if (typeof window === "undefined") return 0;
    const val = localStorage.getItem(ADMIN_BAL_KEY);
    return val !== null ? parseFloat(val) : 0;
  },
  setAdminBalanceAdd(amount: number) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ADMIN_BAL_KEY, String(amount));
    window.dispatchEvent(new CustomEvent(ACC_EVENT));
  },

  // ─── DB Balance por modo (do Supabase) ───────────────────────────────────
  getDBBalance(mode?: "demo" | "real"): number | null {
    if (typeof window === "undefined") return null;
    const key =
      (mode ?? this.getMode()) === "real" ? DB_BAL_REAL_KEY : DB_BAL_DEMO_KEY;
    const val = localStorage.getItem(key);
    return val !== null ? parseFloat(val) : null;
  },
  setDBBalance(balance: number, mode?: "demo" | "real") {
    if (typeof window === "undefined") return;
    const key =
      (mode ?? this.getMode()) === "real" ? DB_BAL_REAL_KEY : DB_BAL_DEMO_KEY;
    localStorage.setItem(key, String(balance));
    window.dispatchEvent(new CustomEvent(ACC_EVENT));
  },

  // ─── Balance Epoch (real mode only) ──────────────────────────────────────
  // Guarda o realizedPnL acumulado no momento em que o admin definiu o último saldo.
  // getStats usa isto para isolar a influência de trades históricos:
  //   balance = adminSetBalance + (currentRealizedPnl - epochPnl)
  // Assim apenas trades APÓS a última alteração de saldo afectam o saldo visível.
  getBalanceEpoch(): number {
    if (typeof window === "undefined") return 0;
    const val = localStorage.getItem(BAL_EPOCH_REAL_KEY);
    return val !== null ? parseFloat(val) : 0;
  },
  setBalanceEpoch(realizedPnlAtMoment: number) {
    if (typeof window === "undefined") return;
    localStorage.setItem(BAL_EPOCH_REAL_KEY, String(realizedPnlAtMoment));
  },

  // ─── DB Admin Overrides (fetched from Supabase) ────────────────────────────
  getDBOverrides(): {
    balanceOverride: number | null;
    equityOverride: number | null;
    marginLevelOverride: number | null;
    forceClosePositions: boolean;
  } {
    if (typeof window === "undefined")
      return {
        balanceOverride: null,
        equityOverride: null,
        marginLevelOverride: null,
        forceClosePositions: false,
      };
    try {
      const raw = localStorage.getItem(DB_OVER_KEY);
      return raw
        ? JSON.parse(raw)
        : {
            balanceOverride: null,
            equityOverride: null,
            marginLevelOverride: null,
            forceClosePositions: false,
          };
    } catch {
      return {
        balanceOverride: null,
        equityOverride: null,
        marginLevelOverride: null,
        forceClosePositions: false,
      };
    }
  },
  setDBOverrides(overrides: {
    balanceOverride: number | null;
    equityOverride: number | null;
    marginLevelOverride: number | null;
    forceClosePositions: boolean;
  }) {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_OVER_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(ACC_EVENT));
  },

  /**
   * Compute live account metrics — real formulas.
   * usedMargin = sum(amount / leverage) per position  [actual margin deposited]
   * equity     = balance + unrealizedPnl
   * marginLevel = (equity / usedMargin) * 100
   * pnl        = leveraged price movement on notional
   */
  getStats(
    open: OpenPosition[] = [],
    closed: ClosedPosition[] = [],
    livePrices: Record<string, number> = {},
  ): AccountStats {
    const mode = this.getMode();
    // Saldo base: vem do DB (separado por modo). Demo fallback = 100k, Real fallback = 0
    const dbBalance = this.getDBBalance(mode);
    const startBalance =
      dbBalance !== null
        ? dbBalance
        : mode === "demo"
          ? DEMO_START_BALANCE
          : REAL_START_BALANCE;

    const realizedPnl = closed.reduce((s, p) => s + p.pnl, 0);

    // ── Modo REAL: isolar trades históricos via epoch ──────────────────────
    // O admin define um saldo-alvo (ex: $400). Trades anteriores a essa definição
    // não devem afectar o saldo — apenas trades abertos/fechados DEPOIS disso.
    // epochPnl = realizedPnL acumulado quando o admin fez a última alteração.
    // balance = adminSetBalance + (realizedPnl - epochPnl)
    const epochPnl = mode === "real" ? this.getBalanceEpoch() : 0;
    const deltaPnl = realizedPnl - epochPnl;
    const balance = startBalance + deltaPnl;

    let unrealizedPnl = 0;
    let usedMargin = 0;

    for (const pos of open) {
      // Current price: live feed or fallback to open price
      const price = livePrices[pos.assetId] ?? pos.openPrice;
      // Notional value of position
      const notional = pos.amount * pos.leverage;
      // P&L on notional
      const pnl =
        pos.type === "buy"
          ? ((price - pos.openPrice) / pos.openPrice) * notional
          : ((pos.openPrice - price) / pos.openPrice) * notional;
      unrealizedPnl += pnl;
      // Margin deposited = amount (the user's own capital committed)
      usedMargin += pos.amount;
    }

    const equity = balance + unrealizedPnl;
    const freeMargin = equity - usedMargin;
    // Standard margin level formula: Equity / UsedMargin * 100%
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;

    // Admin overrides APENAS na conta real — demo é totalmente isolada
    if (mode === "real") {
      const dbOv = this.getDBOverrides();
      const localMarginOv = this.getAdminMarginOverride();

      // equityOverride é um valor BASE — o mercado continua a flutuar em torno dele.
      // equity = base definida pelo admin + lucro/perda não-realizado atual
      // Isto garante que patrimônio, margem livre e nível de margem flutuam
      // com o mercado mesmo quando o admin definiu um valor específico.
      const effectiveEquity =
        dbOv.equityOverride != null
          ? dbOv.equityOverride + unrealizedPnl
          : equity;
      const effectiveFreeMargin = effectiveEquity - usedMargin;

      // Nível de margem: SEMPRE calculado ao vivo quando há posições abertas.
      // O override do admin só actua quando não há posições (display cosmético).
      // Com posições: (equity_efectiva / margem_usada) * 100 — varia com o mercado.
      // Sem posições: override admin OU null (margem livre = equity inteira).
      const effectiveMarginLevel =
        usedMargin > 0 ? (effectiveEquity / usedMargin) * 100 : null;

      const displayMarginLevel =
        usedMargin > 0
          ? effectiveMarginLevel                                    // sempre vivo
          : (dbOv.marginLevelOverride ?? localMarginOv ?? null);   // override só sem posições

      return {
        mode,
        balance: dbOv.balanceOverride ?? balance,
        equity: effectiveEquity,
        usedMargin,
        freeMargin: effectiveFreeMargin,
        pnl: unrealizedPnl,
        marginLevel: displayMarginLevel,
      };
    }

    // Modo demo: cálculo puro, sem interferência do admin
    return {
      mode,
      balance,
      equity,
      usedMargin,
      freeMargin,
      pnl: unrealizedPnl,
      marginLevel,
    };
  },

  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(ACC_EVENT, cb);
    window.addEventListener("et-trade-update", cb);
    return () => {
      window.removeEventListener(ACC_EVENT, cb);
      window.removeEventListener("et-trade-update", cb);
    };
  },
};
