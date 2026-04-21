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

  // Meta
  lastLogin: string | null;
  presenceStatus?: "online" | "offline";
  lastSeenAt?: string | null;
  kycStatus: "unverified" | "pending" | "verified";
  totalDeposited: number;
  totalWithdrawn: number;
}

const STORE_KEY = "et_crm_users";

function genId(): string {
  return (
    "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  );
}

function load(): CRMUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as CRMUser[]) : [];
  } catch {
    return [];
  }
}

function save(users: CRMUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}

// ─── Seed demo users if list is empty ─────────────────────────────────────────
function seedIfEmpty(): void {
  if (typeof window === "undefined") return;
  const existing = load();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const seed: CRMUser[] = [
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
  ];
  save(seed);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const userStore = {
  /** Return all users */
  getAll(): CRMUser[] {
    seedIfEmpty();
    return load();
  },

  /** Find user by id */
  getById(id: string): CRMUser | null {
    return load().find((u) => u.id === id) ?? null;
  },

  /** Find user by email */
  getByEmail(email: string): CRMUser | null {
    return (
      load().find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
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
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    save(users);
    return users[idx];
  },

  /** Delete a user */
  delete(id: string): boolean {
    const users = load();
    const filtered = users.filter((u) => u.id !== id);
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
  adjustBalance(id: string, delta: number): CRMUser | null {
    const user = this.getById(id);
    if (!user) return null;
    const newBalance = Math.max(0, (user.balance ?? 0) + delta);
    return this.update(id, { balance: newBalance });
  },

  /** Stats for admin dashboard */
  getStats() {
    const users = load();
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      pending: users.filter((u) => u.status === "pending").length,
      demo: users.filter((u) => u.mode === "demo").length,
      real: users.filter((u) => u.mode === "real").length,
      totalDeposited: users.reduce((s, u) => s + u.totalDeposited, 0),
    };
  },
};
