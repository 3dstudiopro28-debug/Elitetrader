// Utilitário para salvar o id do usuário atual
function setCurrentUserId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("crm-current-id", id);
}

// Utilitário para obter o id do usuário atual
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("crm-current-id");
}
// Utilitários mínimos para funcionamento local
function load(): CRMUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("crm-users");
    return raw ? (JSON.parse(raw) as CRMUser[]) : [];
  } catch {
    return [];
  }
}

function save(users: CRMUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("crm-users", JSON.stringify(users));
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
/**
 * lib/user-store.ts
 *
 * Multi-user store — simulates a real database using localStorage.
 * When integrating with Supabase:
 *   - Replace localStorage reads with: supabase.from('users').select(...)
 *   - Replace localStorage writes with: supabase.from('users').update(...)
 *   - Remove this file and use the API routes directly.
 *
 * Data shape matches the Supabase schema in lib/db-schema.sql
 */

export type UserStatus = "active" | "suspended" | "pending";
export type AccountMode = "demo" | "real";

export interface BalanceHistoryEntry {
  value: number;
  date: string; // ISO string
  admin?: string; // ID do administrador responsável
  reason?: string; // Motivo da alteração
}

export interface CRMUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  createdAt: string; // ISO string

  // Account
  mode: AccountMode;
  status: UserStatus;
  balance: number; // balance do modo atualmente selecionado
  demoBalance: number; // saldo da conta demo
  realBalance: number; // saldo da conta real (0 se não existir)
  leverage: number;
  currency: string;

  // Admin overrides (what the client sees)
  balanceOverride: number | null; // if set, shown instead of real balance
  marginLevelOverride: number | null; // if set, shown instead of calculated margin
  equityOverride: number | null; // if set, shown as equity in header

  // Admin notes
  adminNotes: string;

  // Campos adicionais usados no seed e lógica
  lastLogin: string | null;
  kycStatus: "verified" | "pending" | "unverified";
  totalDeposited: number;
  totalWithdrawn: number;

  // Histórico de alterações de saldo real
  realBalanceHistory?: BalanceHistoryEntry[];
}

// Função utilitária para popular o localStorage apenas se não houver usuários
function seedIfEmpty(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("__crm_seeded")) return;
  const existing = load();
  // Só aplica seed se não houver NENHUM usuário salvo
  if (existing && existing.length > 0) return;
  save([
    {
      id: genId(),
      email: "joao.silva@email.com",
      firstName: "João",
      lastName: "Silva",
      phone: "+351 912 345 678",
      country: "Portugal",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      mode: "demo",
      status: "active",
      balance: 100_000,
      demoBalance: 100_000,
      realBalance: 0,
      leverage: 200,
      currency: "USD",
      balanceOverride: null,
      marginLevelOverride: null,
      equityOverride: null,
      adminNotes: "",
      lastLogin: new Date(Date.now() - 3600000).toISOString(),
      kycStatus: "verified",
      totalDeposited: 0,
      totalWithdrawn: 0,
    },
    {
      id: genId(),
      email: "maria.santos@email.com",
      firstName: "Maria",
      lastName: "Santos",
      phone: "+351 968 123 456",
      country: "Portugal",
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      mode: "demo",
      status: "active",
      balance: 100_000,
      demoBalance: 100_000,
      realBalance: 0,
      leverage: 100,
      currency: "USD",
      balanceOverride: null,
      marginLevelOverride: 3500,
      equityOverride: null,
      adminNotes: "Cliente VIP — contacto direto com o gestor.",
      lastLogin: new Date(Date.now() - 7200000).toISOString(),
      kycStatus: "pending",
      totalDeposited: 0,
      totalWithdrawn: 0,
    },
    {
      id: genId(),
      email: "pedro.costa@email.com",
      firstName: "Pedro",
      lastName: "Costa",
      phone: "+55 11 98765-4321",
      country: "Brasil",
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      mode: "real",
      status: "active",
      balance: 100_000,
      demoBalance: 100_000,
      realBalance: 0,
      leverage: 200,
      currency: "USD",
      balanceOverride: null,
      marginLevelOverride: null,
      equityOverride: null,
      adminNotes: "",
      lastLogin: null,
      kycStatus: "unverified",
      totalDeposited: 0,
      totalWithdrawn: 0,
    },
  ]);
  window.localStorage.setItem("__crm_seeded", "1");
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const userStore = {
  /** Define o usuário atual (após login) */
  setCurrent(id: string) {
    setCurrentUserId(id);
  },

  /** Obtém o usuário atual salvo no localStorage, ou null */
  getCurrent(): CRMUser | null {
    const id = getCurrentUserId();
    if (!id) return null;
    return this.getById(id);
  },
  /** Return all users */
  getAll(): CRMUser[] {
    seedIfEmpty();
    return load();
  },

  /** Find user by id */
  getById(id: string): CRMUser | null {
    return load().find((u: CRMUser) => u.id === id) ?? null;
  },

  /** Find user by email */
  getByEmail(email: string): CRMUser | null {
    return (
      load().find(
        (u: CRMUser) => u.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  },

  /** Create new user (called on registration) */
  create(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    country?: string;
  }): CRMUser {
    const users = load();
    const newUser: CRMUser = {
      id: genId(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? "",
      country: data.country ?? "",
      createdAt: new Date().toISOString(),
      mode: "demo",
      status: "active",
      balance: 100_000,
      demoBalance: 100_000,
      realBalance: 0,
      leverage: 200,
      currency: "USD",
      balanceOverride: null,
      marginLevelOverride: null,
      equityOverride: null,
      adminNotes: "",
      lastLogin: null,
      kycStatus: "unverified",
      totalDeposited: 0,
      totalWithdrawn: 0,
    };
    users.push(newUser);
    save(users);
    return newUser;
  },

  /** Update any fields of a user (admin use) */
  update(id: string, patch: Partial<CRMUser>): CRMUser | null {
    const users = load();
    const idx = users.findIndex((u: CRMUser) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    save(users);
    return users[idx];
  },

  /** Delete a user */
  delete(id: string): boolean {
    const users = load();
    const filtered = users.filter((u: CRMUser) => u.id !== id);
    if (filtered.length === users.length) return false;
    save(filtered);
    return true;
  },

  /** Admin: set balance override for one user */
  setBalanceOverride(id: string, value: number | null): void {
    this.update(id, { balanceOverride: value });
  },

  /** Admin: set margin level override for one user */
  setMarginOverride(id: string, value: number | null): void {
    this.update(id, { marginLevelOverride: value });
  },

  /** Admin: set equity override for one user */
  setEquityOverride(id: string, value: number | null): void {
    this.update(id, { equityOverride: value });
  },

  /** Admin: set account status */
  setStatus(id: string, status: UserStatus): void {
    this.update(id, { status });
  },

  /** Admin: add or remove funds */
  adjustBalance(
    id: string,
    delta: number,
    adminId?: string,
    reason?: string,
  ): CRMUser | null {
    const user = this.getById(id);
    if (!user) return null;
    const newRealBalance = Math.max(0, (user.realBalance ?? 0) + delta);
    // Atualiza histórico
    const history: BalanceHistoryEntry[] = Array.isArray(
      user.realBalanceHistory,
    )
      ? [...user.realBalanceHistory]
      : [];
    history.push({
      value: newRealBalance,
      date: new Date().toISOString(),
      admin: adminId,
      reason: reason || "Ajuste de saldo",
    });
    const patch: Partial<CRMUser> = {
      realBalance: newRealBalance,
      realBalanceHistory: history,
      // Sempre reflete o saldo correto no campo balance
      balance: user.mode === "real" ? newRealBalance : user.demoBalance,
    };
    return this.update(id, patch);
  },

  /** Stats for admin dashboard */
  getStats() {
    const users = load();
    return {
      total: users.length,
      active: users.filter((u: CRMUser) => u.status === "active").length,
      suspended: users.filter((u: CRMUser) => u.status === "suspended").length,
      pending: users.filter((u: CRMUser) => u.status === "pending").length,
      demo: users.filter((u: CRMUser) => u.mode === "demo").length,
      real: users.filter((u: CRMUser) => u.mode === "real").length,
      totalDeposited: users.reduce(
        (s: number, u: CRMUser) => s + u.totalDeposited,
        0,
      ),
    };
  },
};
