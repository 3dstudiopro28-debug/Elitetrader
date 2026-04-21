"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldAlert,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  DollarSign,
  Search,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  Save,
  ChevronDown,
  BarChart2,
  Lock,
  Database,
  Copy,
  ExternalLink,
  KeyRound,
  Activity,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { adminStore } from "@/lib/admin-store";
import { supabase } from "@/lib/supabase";
import type { CRMUser, UserStatus, AccountMode } from "@/lib/user-store";
import { userStore } from "@/lib/user-store";
import { cn } from "@/lib/utils";

/** Devolve o token de sessão guardado no localStorage (ou vazio). */
function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("et_admin_token") ?? "";
}

async function apiFetch(path: string, opts?: RequestInit) {
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": getSessionToken(),
      ...(opts?.headers ?? {}),
    },
  });
}

function syncUserStoreFromApiResponse(
  json:
    | {
        data?: Partial<CRMUser> & { id?: string };
      }
    | null
    | undefined,
) {
  if (json?.data?.id) {
    userStore.update(json.data.id, json.data);
    userStore.setCurrent(json.data.id);
  }
}

const ADMIN_KEY = "et_admin_unlocked";
const MAX_ATTEMPTS = 5;

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "overview" | "users" | "setup" | "admins" | "prices";
type Role = "superadmin" | "subadmin";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  pending: "Pendente",
};
const STATUS_COLOR: Record<UserStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};
const KYC_LABEL = {
  unverified: "Não verificado",
  pending: "Em análise",
  verified: "Verificado",
};
const KYC_COLOR = {
  unverified: "text-muted-foreground",
  pending: "text-yellow-400",
  verified: "text-green-400",
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onUnlock }: { onUnlock: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  async function handleUnlock() {
    if (locked || loading) return;
    setError("");
    setLoading(true);

    try {
      const isSub = email.trim().length > 0;

      if (isSub) {
        // ── Sub-admin: verifica credenciais locais e obtém token ──
        if (adminStore.verify(email.trim(), password)) {
          try {
            const r = await fetch("/api/admin/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password, role: "subadmin" }),
            });
            const j = await r.json().catch(() => ({}));
            if (j.token) localStorage.setItem("et_admin_token", j.token);
          } catch {
            /* sem token, continua */
          }
          localStorage.setItem(ADMIN_KEY, "subadmin");
          localStorage.setItem("et_subadmin_user", email.trim());
          setAttempts(0);
          onUnlock("subadmin");
          setLoading(false);
          return;
        }
        // credenciais sub-admin inválidas
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setLocked(true);
          setError("Acesso bloqueado.");
          fetch("/api/admin/lockout-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempts: next }),
          }).catch(() => {});
        } else {
          setError(`Credenciais inválidas (${next}/${MAX_ATTEMPTS})`);
        }
      } else {
        // ── Superadmin: só senha, validada no servidor ──
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.token) {
          localStorage.setItem("et_admin_token", json.token);
          localStorage.setItem(ADMIN_KEY, "superadmin");
          setAttempts(0);
          onUnlock("superadmin");
        } else {
          const next = attempts + 1;
          setAttempts(next);
          if (next >= MAX_ATTEMPTS) {
            setLocked(true);
            setError("Acesso bloqueado.");
            fetch("/api/admin/lockout-alert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attempts: next }),
            }).catch(() => {});
          } else {
            setError(`Senha incorrecta (${next}/${MAX_ATTEMPTS})`);
          }
        }
      }
    } catch {
      setError("Erro de ligação. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-xs space-y-5">
        <div className="text-center">
          <ShieldAlert className="w-10 h-10 text-accent mx-auto mb-2" />
          <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          placeholder="E-mail"
          disabled={locked}
          className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
        />

        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Senha"
            autoFocus
            disabled={locked}
            className="w-full px-4 pr-10 py-3 border border-border rounded-xl bg-card text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {error && (
          <p
            className={cn(
              "text-xs text-center",
              locked ? "text-yellow-400" : "text-red-500",
            )}
          >
            {error}
          </p>
        )}

        <button
          onClick={handleUnlock}
          disabled={locked || loading}
          className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "A verificar…" : "Entrar"}
        </button>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-accent",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── User Edit Drawer ─────────────────────────────────────────────────────────
function UserDrawer({
  user,
  onClose,
  onSave,
  onDelete,
  isSuperAdmin,
}: {
  user: CRMUser;
  onClose: () => void;
  onSave: (u: CRMUser) => void;
  onDelete: (id: string) => void;
  isSuperAdmin: boolean;
}) {
  const [form, setForm] = useState<CRMUser>({ ...user });
  useEffect(() => {
    setForm({ ...user });
  }, [user]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [balanceExplicitlySet, setBalanceExplicitlySet] = useState(false);
  const [applyingBalance, setApplyingBalance] = useState(false);
  const [applyBalanceMsg, setApplyBalanceMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [tab, setTab] = useState<
    "info" | "financeiro" | "overrides" | "acesso" | "stats" | "notas"
  >("info");

  // ── Password reset state ─────────────────────────────────────────────────
  const [tempPass, setTempPass] = useState("");
  const [showTempPass, setShowTempPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // ── Stats state ──────────────────────────────────────────────────────────
  const [statsData, setStatsData] = useState<{
    balance: number;
    demoBalance: number;
    openPositions: number;
    closedPositions: number;
    totalPnl: number;
    totalDeposited: number;
    totalWithdrawn: number;
    leverage: number;
    currency: string;
    equityOverride: number | null;
    marginLevelOverride: number | null;
    lastSync: string | null;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsNewBalance, setStatsNewBalance] = useState("");
  const [statsNewEquity, setStatsNewEquity] = useState("");
  const [statsNewMargin, setStatsNewMargin] = useState("");
  const [statsApplying, setStatsApplying] = useState(false);
  const [statsMsg, setStatsMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  function set<K extends keyof CRMUser>(key: K, value: CRMUser[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    // ── Auto-aplicar delta pendente (se admin não clicou "Aplicar") ──────────
    let savingForm = { ...form };
    let balanceWasSet = balanceExplicitlySet;
    const delta = parseFloat(adjustDelta);
    if (!isNaN(delta) && delta >= 0) {
      // Definir saldo directamente — não somar ao anterior
      savingForm = {
        ...savingForm,
        balance: delta,
        realBalance: delta,
        mode: "real",
      };
      setAdjustDelta("");
      setForm(savingForm);
      balanceWasSet = true;
    }

    // ── Construir body — modo sempre real, só enviar realBalance se mudou ────
    const patchBody: Record<string, unknown> = {
      firstName: savingForm.firstName,
      lastName: savingForm.lastName,
      phone: savingForm.phone,
      country: savingForm.country,
      kycStatus: savingForm.kycStatus,
      mode: "real",
      status: savingForm.status,
      leverage: savingForm.leverage,
      currency: savingForm.currency,
      marginLevelOverride: savingForm.marginLevelOverride,
      equityOverride: savingForm.equityOverride,
      adminNotes: savingForm.adminNotes,
    };
    // Incluir saldo real se foi explicitamente definido via "Aplicar" ou campo de ajuste.
    // Inclui mesmo quando o valor é igual ao anterior — garante forceEpochReset no cliente.
    const origReal = user.realBalance ?? 0;
    const newReal = savingForm.realBalance ?? 0;
    if (balanceWasSet || newReal !== origReal) {
      patchBody.realBalance = newReal;
    }
    setBalanceExplicitlySet(false);

    // Persistir no Supabase via API
    try {
      const res = await apiFetch(`/api/admin/users/${savingForm.id}`, {
        method: "PATCH",
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSaveError(json.error ?? `Erro ${res.status}`);
        setSaving(false);
        return;
      }
      const json = await res.json().catch(() => ({}));
      // Mostrar avisos de campos que falharam (mas outros foram salvos)
      if (json.warnings?.length > 0) {
        setSaveError("Aviso: " + (json.warnings as string[]).join("; "));
      }
    } catch {
      setSaveError("Erro de rede");
      setSaving(false);
      return;
    }
    onSave(savingForm);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Recarregar stats depois de guardar o saldo para que o CRM mostre dados actualizados
    if ("realBalance" in patchBody) {
      setTimeout(() => loadStats(), 1500);
    }
  }

  async function handleAdjust() {
    const newBal = parseFloat(adjustDelta);
    if (isNaN(newBal) || newBal < 0) return;
    setApplyingBalance(true);
    setApplyBalanceMsg(null);
    try {
      const res = await apiFetch(`/api/admin/users/${form.id}`, {
        method: "PATCH",
        body: JSON.stringify({ realBalance: newBal, mode: "real" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyBalanceMsg({
          type: "err",
          text: json.error ?? `Erro ${res.status}`,
        });
      } else {
        // Atualiza imediatamente o saldo do cliente (frontend)
        setForm((f) => ({
          ...f,
          balance: newBal,
          realBalance: newBal,
          mode: "real",
        }));
        setAdjustDelta("");
        setBalanceExplicitlySet(false);
        setApplyBalanceMsg({
          type: "ok",
          text: `Saldo de $${newBal.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} aplicado com sucesso.`,
        });
        // Notifica o frontend do cliente para atualizar imediatamente
        if (window && window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent("saldo-atualizado", {
              detail: { userId: form.id, saldo: newBal },
            }),
          );
        }
        // Atualiza stats imediatamente
        loadStats();
        setTimeout(() => setApplyBalanceMsg(null), 5000);
        syncUserStoreFromApiResponse(json);
      }
    } catch {
      setApplyBalanceMsg({ type: "err", text: "Erro de rede" });
    }
    setApplyingBalance(false);
  }

  async function handleResetPassword() {
    if (!tempPass || tempPass.length < 6) {
      setResetMsg({
        type: "err",
        text: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await apiFetch(`/api/admin/users/${form.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: tempPass }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setResetMsg({ type: "err", text: json.error ?? `Erro ${res.status}` });
      } else {
        setResetMsg({
          type: "ok",
          text: "Senha temporária definida. O utilizador será obrigado a alterá-la.",
        });
        setTempPass("");
      }
    } catch {
      setResetMsg({ type: "err", text: "Erro de rede" });
    }
    setResetLoading(false);
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${form.id}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data) {
        const d = json.data;
        const allAccounts: Array<{
          mode?: string;
          balance: number;
          leverage?: number;
          currency?: string;
          total_deposited?: number;
          total_withdrawn?: number;
        }> = Array.isArray(d.accounts)
          ? d.accounts
          : d.accounts
            ? [d.accounts]
            : [];
        const explicitReal = allAccounts.find((a) => a.mode === "real");
        const nonDemoAcc = allAccounts.find((a) => {
          const mode = String(a.mode ?? "").toLowerCase();
          return mode && mode !== "demo";
        });
        const realAcc = explicitReal ?? nonDemoAcc ?? undefined;
        const demoAcc = allAccounts.find((a) => a.mode === "demo");
        const memOv = d._memOverride ?? null;
        const realBal = realAcc?.balance ?? memOv?.balance ?? 0;
        setStatsData({
          balance: realBal,
          demoBalance: demoAcc?.balance ?? 100_000,
          openPositions: d.open_positions ?? 0,
          closedPositions: d.closed_positions ?? 0,
          totalPnl: d.total_pnl ?? 0,
          totalDeposited: realAcc?.total_deposited ?? form.totalDeposited ?? 0,
          totalWithdrawn: realAcc?.total_withdrawn ?? form.totalWithdrawn ?? 0,
          leverage: realAcc?.leverage ?? form.leverage ?? 200,
          currency: realAcc?.currency ?? form.currency ?? "USD",
          equityOverride: memOv?.equityOverride ?? form.equityOverride ?? null,
          marginLevelOverride:
            memOv?.marginLevelOverride ?? form.marginLevelOverride ?? null,
          lastSync: d.updated_at ?? null,
        });
        // Pre-fill edição inline com valores actuais
        setStatsNewBalance(String(realBal > 0 ? realBal : ""));
        setStatsNewEquity(
          memOv?.equityOverride != null ? String(memOv.equityOverride) : "",
        );
        setStatsNewMargin(
          memOv?.marginLevelOverride != null
            ? String(memOv.marginLevelOverride)
            : "",
        );
      }
    } catch {
      /* ignore */
    }
    setStatsLoading(false);
  }

  const tabs = [
    { id: "info", label: "Dados" },
    { id: "financeiro", label: "Financeiro" },
    { id: "overrides", label: "Overrides" },
    { id: "acesso", label: "Acesso" },
    { id: "stats", label: "Estatísticas" },
    { id: "notas", label: "Notas" },
  ] as const;

  // Auto-carregar estatísticas ao entrar no separador
  useEffect(() => {
    if (tab === "stats") loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, form.id]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="font-semibold text-foreground">
              {form.firstName} {form.lastName}
            </div>
            <div className="text-xs text-muted-foreground">{form.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium border",
                STATUS_COLOR[form.status],
              )}
            >
              {STATUS_LABEL[form.status]}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Dados ── */}
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nome"
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                />
                <Field
                  label="Apelido"
                  value={form.lastName}
                  onChange={(v) => set("lastName", v)}
                />
              </div>
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => set("email", v)}
                type="email"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Telefone"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                />
                <Field
                  label="País"
                  value={form.country}
                  onChange={(v) => set("country", v)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  KYC
                </label>
                <select
                  value={form.kycStatus}
                  onChange={(e) =>
                    set("kycStatus", e.target.value as CRMUser["kycStatus"])
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="unverified">Não verificado</option>
                  <option value="pending">Em análise</option>
                  <option value="verified">Verificado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado da conta
                </label>
                <div className="flex gap-2">
                  {(["active", "suspended", "pending"] as UserStatus[]).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => set("status", s)}
                        className={cn(
                          "flex-1 py-2 rounded-lg border text-xs font-medium transition-colors",
                          form.status === s
                            ? STATUS_COLOR[s]
                            : "border-border text-muted-foreground hover:border-muted",
                        )}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    Registado em
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {fmtDate(form.createdAt)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    Último login
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {fmtDate(form.lastLogin)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Financeiro ── */}
          {tab === "financeiro" && (
            <div className="space-y-4">
              {/* Info: conta demo é automática */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-xs text-blue-300 font-medium">
                  Conta DEMO — Automática
                </p>
                <p className="text-xs text-blue-300/70 mt-0.5">
                  Saldo fixo de $100.000 para treino. Não é gerida aqui.
                </p>
              </div>

              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-foreground">
                  Saldo — conta{" "}
                  <span className="text-green-400 uppercase">REAL</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${fmt(form.realBalance ?? 0)}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdjust()}
                    placeholder="Novo saldo"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleAdjust}
                    disabled={applyingBalance || !adjustDelta}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {applyingBalance ? "A aplicar…" : "Aplicar"}
                  </button>
                </div>
                {applyBalanceMsg && (
                  <p
                    className={`text-xs font-medium ${applyBalanceMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}
                  >
                    {applyBalanceMsg.text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Define o saldo da conta real do investidor. O valor
                  reflecte-se imediatamente no dashboard do cliente (máx. 3 s).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Alavancagem"
                  value={String(form.leverage)}
                  onChange={(v) => set("leverage", parseInt(v) || 200)}
                  type="number"
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Moeda
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>BRL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    Total depositado
                  </div>
                  <div className="text-sm font-bold text-green-400">
                    ${fmt(form.totalDeposited)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    Total levantado
                  </div>
                  <div className="text-sm font-bold text-red-400">
                    ${fmt(form.totalWithdrawn)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Overrides ── */}
          {tab === "overrides" && (
            <div className="space-y-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-xs text-yellow-300 font-medium">
                  Overrides controlam o que o cliente VÊ no ecrã.
                </p>
                <p className="text-xs text-yellow-300/70 mt-0.5">
                  O saldo real altera-se no separador{" "}
                  <strong>Financeiro</strong>. Aqui controla Capital Próprio e
                  Margem.
                </p>
              </div>

              <OverrideField
                label="Capital Próprio exibido ($)"
                value={form.equityOverride}
                onChange={(v) => set("equityOverride", v)}
                placeholder="Ex: 1 248 500 (vazio = calculado)"
              />
              <OverrideField
                label="Nível de margem exibido (%)"
                value={form.marginLevelOverride}
                onChange={(v) => set("marginLevelOverride", v)}
                placeholder="Ex: 3500 (vazio = automático)"
              />

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Pré-definidos rápidos — Margem
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5000, 3500, 2000, 1200, 800, 500, 300].map((v) => (
                    <button
                      key={v}
                      onClick={() => set("marginLevelOverride", v)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
                        form.marginLevelOverride === v
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:border-accent/40",
                      )}
                    >
                      {v}%
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      set("marginLevelOverride", null);
                      set("equityOverride", null);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:border-red-400 hover:text-red-400 transition-colors"
                  >
                    Limpar todos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Acesso / Reset Password ── */}
          {tab === "acesso" && (
            <div className="space-y-5">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-xs text-yellow-300 font-medium flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Recuperação de acesso
                </p>
                <p className="text-xs text-yellow-300/70 mt-0.5">
                  Define uma senha temporária descartável. O utilizador será
                  obrigado a alterar a senha no próximo acesso.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Nova senha temporária
                </label>
                <div className="relative">
                  <input
                    type={showTempPass ? "text" : "password"}
                    value={tempPass}
                    onChange={(e) => setTempPass(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className="w-full pl-3 pr-10 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTempPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Partilhe esta senha com o cliente por canal seguro
                  (email/SMS).
                </p>
              </div>
              {resetMsg && (
                <div
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl text-xs font-medium",
                    resetMsg.type === "ok"
                      ? "bg-green-500/10 border border-green-500/30 text-green-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400",
                  )}
                >
                  {resetMsg.type === "ok" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  {resetMsg.text}
                </div>
              )}
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || !tempPass}
                className="w-full py-2.5 bg-yellow-500 text-black rounded-xl font-bold text-sm hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {resetLoading ? "A definir…" : "Definir senha temporária"}
              </button>
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Email do utilizador
                </p>
                <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                  <span className="text-sm text-foreground flex-1">
                    {form.email}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(form.email)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Após redefinir, envie a nova senha para este email.
                </p>
              </div>
            </div>
          )}

          {/* ── Estatísticas em tempo real ── */}
          {tab === "stats" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Conta em tempo real
                </p>
                <button
                  onClick={loadStats}
                  disabled={statsLoading}
                  className={cn(
                    "p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-colors",
                    statsLoading && "animate-spin",
                  )}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {statsLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted/30 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {statsData && !statsLoading && (
                <div className="space-y-4">
                  {/* Grid principal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        Saldo real
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        ${fmt(statsData.balance)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "border rounded-xl p-3 space-y-1",
                        statsData.totalPnl >= 0
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-red-500/10 border-red-500/30",
                      )}
                    >
                      <p className="text-[11px] text-muted-foreground">
                        P&amp;L total
                      </p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          statsData.totalPnl >= 0
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        {statsData.totalPnl >= 0 ? "+" : ""}
                        {fmt(statsData.totalPnl)}
                      </p>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        Posições abertas
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {statsData.openPositions}
                      </p>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        Posições fechadas
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {statsData.closedPositions}
                      </p>
                    </div>
                  </div>

                  {/* Linha extra: depósitos, levantamentos, alavancagem */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/20 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">
                        Total depositado
                      </p>
                      <p className="text-sm font-bold text-green-400">
                        ${fmt(statsData.totalDeposited)}
                      </p>
                    </div>
                    <div className="bg-muted/20 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">
                        Total levantado
                      </p>
                      <p className="text-sm font-bold text-red-400">
                        ${fmt(statsData.totalWithdrawn)}
                      </p>
                    </div>
                    <div className="bg-muted/20 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">
                        Alavancagem
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        1:{statsData.leverage}
                      </p>
                    </div>
                  </div>

                  {/* Património e margem exibidos */}
                  {(statsData.equityOverride != null ||
                    statsData.marginLevelOverride != null) && (
                    <div className="grid grid-cols-2 gap-2">
                      {statsData.equityOverride != null && (
                        <div className="bg-accent/5 border border-accent/20 rounded-xl p-2.5">
                          <p className="text-[10px] text-muted-foreground">
                            Capital próprio exibido
                          </p>
                          <p className="text-sm font-bold text-accent">
                            ${fmt(statsData.equityOverride)}
                          </p>
                        </div>
                      )}
                      {statsData.marginLevelOverride != null && (
                        <div className="bg-accent/5 border border-accent/20 rounded-xl p-2.5">
                          <p className="text-[10px] text-muted-foreground">
                            Nível de margem exibido
                          </p>
                          <p className="text-sm font-bold text-accent">
                            {fmt(statsData.marginLevelOverride)}%
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Edição inline ── */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ajustes da conta
                    </p>

                    {/* Saldo real */}
                    <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-2">
                      <div className="text-xs font-semibold text-foreground">
                        Saldo — conta{" "}
                        <span className="text-green-400 uppercase">REAL</span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        ${fmt(statsData.balance)}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={statsNewBalance}
                          onChange={(e) => setStatsNewBalance(e.target.value)}
                          placeholder="Novo saldo"
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
                        />
                        <button
                          disabled={statsApplying}
                          onClick={async () => {
                            const newBal = parseFloat(statsNewBalance);
                            if (isNaN(newBal) || newBal < 0) return;
                            setStatsApplying(true);
                            setStatsMsg(null);
                            try {
                              const res = await apiFetch(
                                `/api/admin/users/${form.id}`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({ realBalance: newBal }),
                                },
                              );
                              if (res.ok) {
                                setStatsMsg({
                                  type: "ok",
                                  text: `Saldo atualizado para $${fmt(newBal)}`,
                                });
                                set("realBalance", newBal);
                                set("balance", newBal);
                                setStatsData((prev) =>
                                  prev ? { ...prev, balance: newBal } : prev,
                                );
                              } else {
                                const j = await res.json().catch(() => ({}));
                                setStatsMsg({
                                  type: "err",
                                  text: j.error ?? "Erro ao atualizar",
                                });
                              }
                            } catch {
                              setStatsMsg({
                                type: "err",
                                text: "Erro de rede",
                              });
                            }
                            setStatsApplying(false);
                          }}
                          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                          {statsApplying ? "A aplicar…" : "Aplicar"}
                        </button>
                      </div>
                    </div>

                    {/* Capital próprio */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Capital próprio exibido ($)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={statsNewEquity}
                          onChange={(e) => setStatsNewEquity(e.target.value)}
                          placeholder="Ex: 1 248 500 (vazio = calculado)"
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => {
                            const v =
                              statsNewEquity === ""
                                ? null
                                : parseFloat(statsNewEquity);
                            set("equityOverride", v);
                            setStatsData((prev) =>
                              prev ? { ...prev, equityOverride: v } : prev,
                            );
                          }}
                          className="px-3 py-2 bg-muted/50 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Definir
                        </button>
                        {statsData.equityOverride != null && (
                          <button
                            onClick={() => {
                              set("equityOverride", null);
                              setStatsNewEquity("");
                              setStatsData((prev) =>
                                prev ? { ...prev, equityOverride: null } : prev,
                              );
                            }}
                            className="px-3 text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nível de margem */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Nível de margem exibido (%)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={statsNewMargin}
                          onChange={(e) => setStatsNewMargin(e.target.value)}
                          placeholder="Ex: 3500 (vazio = automático)"
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => {
                            const v =
                              statsNewMargin === ""
                                ? null
                                : parseFloat(statsNewMargin);
                            set("marginLevelOverride", v);
                            setStatsData((prev) =>
                              prev ? { ...prev, marginLevelOverride: v } : prev,
                            );
                          }}
                          className="px-3 py-2 bg-muted/50 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Definir
                        </button>
                        {statsData.marginLevelOverride != null && (
                          <button
                            onClick={() => {
                              set("marginLevelOverride", null);
                              setStatsNewMargin("");
                              setStatsData((prev) =>
                                prev
                                  ? { ...prev, marginLevelOverride: null }
                                  : prev,
                              );
                            }}
                            className="px-3 text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {[5000, 3500, 2000, 1200, 800, 500, 300].map((v) => (
                          <button
                            key={v}
                            onClick={() => {
                              setStatsNewMargin(String(v));
                              set("marginLevelOverride", v);
                              setStatsData((prev) =>
                                prev
                                  ? { ...prev, marginLevelOverride: v }
                                  : prev,
                              );
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded border text-[11px] font-medium transition-colors",
                              statsData.marginLevelOverride === v
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border text-muted-foreground hover:border-accent/40",
                            )}
                          >
                            {v}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {statsMsg && (
                      <div
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium",
                          statsMsg.type === "ok"
                            ? "bg-green-500/10 border border-green-500/30 text-green-400"
                            : "bg-red-500/10 border border-red-500/30 text-red-400",
                        )}
                      >
                        {statsMsg.type === "ok" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        {statsMsg.text}
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      ℹ️ Clique em “Guardar alterações” para persistir equity e
                      margem no servidor. O saldo aplica-se imediatamente ao
                      cliente.
                    </p>
                  </div>

                  {statsData.lastSync && (
                    <p className="text-[11px] text-muted-foreground text-right">
                      Última sincronização:{" "}
                      {new Date(statsData.lastSync).toLocaleString("pt-PT")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Notas ── */}
          {tab === "notas" && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">
                Notas internas (visível apenas ao admin)
              </label>
              <textarea
                value={form.adminNotes}
                onChange={(e) => set("adminNotes", e.target.value)}
                placeholder="Notas sobre este utilizador, acordos, observações..."
                rows={10}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground outline-none focus:border-accent resize-none"
              />
              <p className="text-xs text-muted-foreground">
                As notas são guardadas no Supabase e visíveis apenas neste
                painel de admin.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex flex-col gap-2 shrink-0">
          {saveError && (
            <p className="text-xs text-red-400 text-center">{saveError}</p>
          )}
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:bg-accent/90 transition-all active:scale-95"
          >
            {saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "A guardar…" : saved ? "Guardado!" : "Guardar alterações"}
          </button>
          {/* Eliminar conta — bloqueado se for o 1.º registo Supabase */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Eliminar a conta de ${form.firstName || form.email} permanentemente?\nEsta ação não pode ser desfeita.`,
                  )
                ) {
                  onDelete(form.id);
                }
              }}
              className="flex items-center justify-center gap-2 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar conta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
      />
    </div>
  );
}

function OverrideField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : parseFloat(e.target.value))
          }
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
        />
        {value !== null && (
          <button
            onClick={() => onChange(null)}
            className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Admins Tab (sub-account management) ─────────────────────────────────────
function AdminsTab() {
  const [subAdmins, setSubAdmins] = useState(() => adminStore.getAll());
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  function refresh() {
    setSubAdmins(adminStore.getAll());
  }

  function handleCreate() {
    setMsg(null);
    const result = adminStore.create(newEmail.trim(), newPassword);
    if (result.ok) {
      setMsg({ type: "ok", text: "Conta gestora criada com sucesso." });
      setNewEmail("");
      setNewPassword("");
      refresh();
    } else {
      setMsg({ type: "err", text: result.error ?? "Erro desconhecido" });
    }
  }

  function handleDelete(id: string, email: string) {
    if (!window.confirm(`Eliminar a conta gestora "${email}"?`)) return;
    adminStore.delete(id);
    refresh();
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <h2 className="font-bold text-foreground text-lg">Contas Gestoras</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Crie contas de acesso ao painel para outros gestores. Estas contas têm
        acesso completo ao CRM, mas não podem criar ou apagar outras contas
        gestoras nem apagar a conta de nenhum utilizador.
      </p>

      {/* Create form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">
          Nova conta gestora
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              E-mail do gestor
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="gestor@email.com"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mín. 8 caracteres"
                className="w-full px-3 pr-10 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
        {msg && (
          <div
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium",
              msg.type === "ok"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400",
            )}
          >
            {msg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            {msg.text}
          </div>
        )}
        <button
          onClick={handleCreate}
          disabled={!newEmail || !newPassword}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-bold hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" /> Criar conta gestora
        </button>
      </div>

      {/* List */}
      {subAdmins.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma conta gestora criada ainda.
        </p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Utilizador
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Criado em
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subAdmins.map((a) => (
                <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                        {a.email[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {a.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(a.id, a.email)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar conta gestora"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Setup Tab ───────────────────────────────────────────────────────────────
const REPAIR_SQL = `-- Corra este SQL no Supabase SQL Editor (uma vez apenas)
-- URL: https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/sql/new

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar tabelas em falta (seguro se já existirem)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE, name text NOT NULL DEFAULT '',
  phone text DEFAULT '', country text DEFAULT '',
  kyc_status text NOT NULL DEFAULT 'unverified'
    CHECK (kyc_status IN ('unverified','pending','verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance numeric(18,2) NOT NULL DEFAULT 100000.00,
  leverage integer NOT NULL DEFAULT 200,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_mode text CHECK (active_mode IN ('demo','real')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- === MIGRAÇÕES SEGURAS (ADD COLUMN IF NOT EXISTS) ===

-- profiles: colunas opcionais
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'demo' CHECK (mode IN ('demo','real')); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completion integer NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_day text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_month text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_year text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nif text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+55'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pep boolean NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_us_resident boolean NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_type text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- admin_overrides: adicionar user_id se não existir (CRÍTICO)
DO $$
BEGIN
  ALTER TABLE public.admin_overrides
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='admin_overrides_user_id_key'
      AND conrelid='public.admin_overrides'::regclass
  ) THEN
    ALTER TABLE public.admin_overrides ADD CONSTRAINT admin_overrides_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- admin_overrides: colunas financeiras
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS balance_override numeric(18,2); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS margin_level_override numeric(10,2); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS equity_override numeric(18,2); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS force_close_positions boolean NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS balance_adjustment numeric(18,2); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS note text DEFAULT ''; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS updated_by text NOT NULL DEFAULT 'admin'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Migrar 'name' → first_name/last_name se ambos existirem e first_name estiver vazio
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='name')
  THEN
    EXECUTE '
      UPDATE public.profiles
      SET first_name = COALESCE(NULLIF(split_part(COALESCE(name,''''),'' '',1),''''),''''),
          last_name  = COALESCE(NULLIF(trim(substring(COALESCE(name,'''') FROM length(split_part(COALESCE(name,''''),'' '',1))+2)),''''),'''')
      WHERE first_name = '''' AND name IS NOT NULL AND name != ''''
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- === FUNÇÃO handle_new_user (compatível com qualquer schema) ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_first text;
  v_last  text;
BEGIN
  v_first := COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(NEW.raw_user_meta_data->>'given_name', ''));
  v_last  := COALESCE(NEW.raw_user_meta_data->>'last_name',  COALESCE(NEW.raw_user_meta_data->>'family_name', ''));
  BEGIN
    EXECUTE 'INSERT INTO public.profiles (id, email, first_name, last_name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING'
      USING NEW.id, NEW.email, v_first, v_last;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'INSERT INTO public.profiles (id, email, name) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING'
        USING NEW.id, NEW.email, NULLIF(TRIM(v_first || ' ' || v_last), '');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;
  BEGIN
    EXECUTE 'INSERT INTO public.accounts (user_id, mode, balance) VALUES ($1,$2,$3) ON CONFLICT (user_id, mode) DO NOTHING'
      USING NEW.id, 'demo', 100000.00;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'INSERT INTO public.accounts (user_id, balance) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING'
        USING NEW.id, 100000.00;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- === RLS ===
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own"       ON profiles;
DROP POLICY IF EXISTS "accounts_own"       ON accounts;
DROP POLICY IF EXISTS "overrides_read_own" ON admin_overrides;

CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "accounts_own" ON accounts FOR ALL USING (auth.uid() = user_id);

-- Policy para admin_overrides só se user_id existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admin_overrides' AND column_name='user_id')
  THEN
    EXECUTE 'CREATE POLICY "overrides_read_own" ON public.admin_overrides FOR SELECT USING (auth.uid() = user_id)';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- === REALTIME ===
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='admin_overrides') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_overrides;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='accounts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- === RECARREGAR SCHEMA CACHE (PostgREST) ===
NOTIFY pgrst, 'reload schema';

-- === NOVAS COLUNAS (posições e força troca de senha) ===
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_positions   integer NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS closed_positions integer NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_pnl        numeric(18,2) NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;

function SetupTab() {
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "ok" | "error">("idle");
  const [testing, setTesting] = useState(false);

  async function testConnection() {
    setTesting(true);
    try {
      const res = await apiFetch("/api/admin/users");
      const json = await res.json();
      setTestResult(
        json.success && json.source === "supabase" ? "ok" : "error",
      );
    } catch {
      setTestResult("error");
    }
    setTesting(false);
  }

  function copySQL() {
    navigator.clipboard.writeText(REPAIR_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-accent" /> Configuração da Base de
          Dados
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o trigger do Supabase para que o registo de utilizadores
          funcione corretamente.
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Ligar ao Supabase
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verifica se a base de dados está acessível
          </p>
        </div>
        {testResult === "ok" && (
          <span className="flex items-center gap-1.5 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Ligado
          </span>
        )}
        {testResult === "error" && (
          <span className="flex items-center gap-1.5 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" /> Erro
          </span>
        )}
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {testing ? "A testar…" : "Testar ligação"}
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-2">
        <p className="text-sm font-medium text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Passos necessários
        </p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            Copie o SQL abaixo e execute-o no{" "}
            <a
              href="https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              Supabase SQL Editor <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>
            Depois de correr o SQL, vá a{" "}
            <a
              href="https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              Settings → API <ExternalLink className="w-3 h-3" />
            </a>{" "}
            no Supabase Dashboard e clique em{" "}
            <strong className="text-foreground">
              &quot;Reload schema&quot;
            </strong>{" "}
            (ou &quot;Exposing schemas&quot; → Save)
          </li>
          <li>Teste a ligação no botão acima</li>
        </ol>
      </div>

      {/* SQL Block */}
      <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
          <span className="text-xs font-mono text-muted-foreground">
            repair-trigger.sql
          </span>
          <button
            onClick={copySQL}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copiado!" : "Copiar SQL"}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {REPAIR_SQL}
        </pre>
      </div>

      <p className="text-xs text-muted-foreground">
        Após executar o SQL, os novos utilizadores registados serão
        automaticamente adicionados ao painel CRM.
      </p>
    </div>
  );
}

// ─── Prices Tab — override de preço do Ouro (XAUUSD) ─────────────────────────
function PricesTab() {
  const [currentOverride, setCurrentOverride] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function readJsonSafe(r: Response): Promise<Record<string, any>> {
    const text = await r.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, any>;
    } catch {
      return {};
    }
  }

  // Carregar override actual ao montar
  useEffect(() => {
    apiFetch("/api/admin/prices")
      .then((r) => readJsonSafe(r))
      .then((j) => {
        const v = j.prices?.xauusd ?? null;
        setCurrentOverride(v);
        if (v !== null) setInputValue(String(v));
      })
      .catch(() => {});
  }, []);

  async function handleApply() {
    const price = parseFloat(inputValue);
    if (!inputValue || isNaN(price) || price <= 0) {
      setMsg({ text: "Insira um preço válido (ex: 4600)", ok: false });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const r = await apiFetch("/api/admin/prices", {
        method: "POST",
        body: JSON.stringify({ assetId: "xauusd", price }),
      });
      const j = await readJsonSafe(r);
      if (r.ok && j.success) {
        setCurrentOverride(price);
        setMsg({
          text: `Preço do Ouro definido para $${price.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ok: true,
        });
      } else {
        setMsg({
          text: String(j.error ?? `Erro ao aplicar (HTTP ${r.status})`),
          ok: false,
        });
      }
    } catch {
      setMsg({ text: "Erro de ligação", ok: false });
    }
    setLoading(false);
  }

  async function handleRemove() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await apiFetch("/api/admin/prices", {
        method: "DELETE",
        body: JSON.stringify({ assetId: "xauusd" }),
      });
      const j = await readJsonSafe(r);
      if (r.ok && j.success) {
        setCurrentOverride(null);
        setInputValue("");
        setMsg({
          text: "Override removido. Ouro volta ao preço de mercado.",
          ok: true,
        });
      } else {
        setMsg({
          text: String(j.error ?? `Erro ao remover (HTTP ${r.status})`),
          ok: false,
        });
      }
    } catch {
      setMsg({ text: "Erro de ligação", ok: false });
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">
          Preço do Ouro (XAUUSD)
        </h2>
        <p className="text-sm text-muted-foreground">
          Define o preço base exibido na plataforma. O preço continua a flutuar
          ±0.03% em redor do valor definido. Quando ativo, o Finnhub é ignorado
          para o Ouro.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Override actual
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              currentOverride !== null
                ? "text-green-400"
                : "text-muted-foreground",
            )}
          >
            {currentOverride !== null
              ? `$${currentOverride.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "Preço de mercado (sem override)"}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="ex: 4600.00"
              className="w-full pl-7 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? "…" : "Aplicar"}
          </button>
          {currentOverride !== null && (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="px-4 py-2.5 border border-border rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>

        {msg && (
          <p
            className={cn(
              "text-xs font-medium",
              msg.ok ? "text-green-400" : "text-red-400",
            )}
          >
            {msg.text}
          </p>
        )}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <p className="text-xs text-yellow-400 font-medium">
          ⚠️ Nota importante
        </p>
        <p className="text-xs text-yellow-400/80">
          Este override é guardado em memória do servidor. Reiniciar o servidor
          limpa o override (pode reaplicar). Os utilizadores verão o novo preço
          na próxima actualização (máx. 5s).
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [role, setRole] = useState<Role>("subadmin");
  const isSuperAdmin = role === "superadmin";
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<(CRMUser & { presenceStatus?: string })[]>(
    [],
  );
  const [stats, setStats] = useState(userStore.getStats());
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterMode, setFilterMode] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<CRMUser | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data ?? []);
        setStats(json.stats ?? userStore.getStats());
        setDataSource(json.source === "supabase" ? "supabase" : "local");
        setLoading(false);
        return;
      }
    } catch {
      /* fallback */
    }
    // Fallback local
    setUsers(userStore.getAll());
    setStats(userStore.getStats());
    setDataSource("local");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ADMIN_KEY);
      const token = localStorage.getItem("et_admin_token");
      if (token && (stored === "superadmin" || stored === "subadmin")) {
        setRole(stored as Role);
        setUnlocked(true);
        refreshUsers();
      }
    }
  }, [refreshUsers]);

  useEffect(() => {
    if (!unlocked) return;
    const id = setInterval(() => {
      refreshUsers();
    }, 12_000);
    return () => clearInterval(id);
  }, [unlocked, refreshUsers]);

  useEffect(() => {
    if (!unlocked) return;

    const channel = supabase.channel("crm-presence", {
      config: { presence: { key: `admin-${role}-${Date.now()}` } },
    });

    const updatePresence = () => {
      const state = channel.presenceState();
      const ids = new Set<string>();
      for (const key of Object.keys(state)) ids.add(key);
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, updatePresence)
      .on("presence", { event: "join" }, updatePresence)
      .on("presence", { event: "leave" }, updatePresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ role, ts: Date.now() });
          updatePresence();
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      setOnlineUserIds(new Set());
    };
  }, [unlocked, role]);

  function handleUnlock(r: Role) {
    setRole(r);
    setUnlocked(true);
    refreshUsers();
  }

  async function handleUserSave(updated: CRMUser) {
    // UserDrawer já chamou a API — só precisamos de refrescar a lista
    await refreshUsers();
    setSelectedUser(updated);
  }

  async function handleDeleteUser(id: string) {
    // O índice 0 da lista ordenada por data de criação é a conta mestra \u2014 nunca apagar
    const sorted = [...users].sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() -
        new Date(b.createdAt ?? 0).getTime(),
    );
    if (sorted[0]?.id === id) {
      alert("A conta principal não pode ser eliminada.");
      return;
    }
    if (!isSuperAdmin) {
      alert("Apenas a conta mestra pode eliminar utilizadores.");
      return;
    }
    if (!window.confirm("Remover este utilizador permanentemente?")) return;
    await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setSelectedUser(null);
    await refreshUsers();
  }

  // Função utilitária para sincronizar o userStore local com o retorno da API após PATCH/POST
  function syncUserStoreFromApiResponse(json: any) {
    if (json && json.data && json.data.id) {
      userStore.update(json.data.id, json.data);
      userStore.setCurrent(json.data.id);
    }
  }

  if (!unlocked) return <LoginScreen onUnlock={handleUnlock} />;

  // Filtered users
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q);
    const matchS = !filterStatus || u.status === filterStatus;
    const matchM = !filterMode || u.mode === filterMode;
    return matchQ && matchS && matchM;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-accent" />
          <span className="font-bold text-foreground text-lg">
            Painel Admin
          </span>
          <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium">
            CRM
          </span>
          {/* Indicador de fonte de dados */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border",
              dataSource === "supabase"
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
            )}
          >
            {dataSource === "supabase" ? "● Supabase" : "○ Local"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshUsers}
            className={cn(
              "p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
              loading && "animate-spin",
            )}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(ADMIN_KEY);
              localStorage.removeItem("et_admin_token");
              localStorage.removeItem("et_subadmin_user");
              setUnlocked(false);
              setRole("subadmin");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:border-red-400 hover:text-red-500 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-border px-6 shrink-0">
        {(
          [
            ["overview", "Visão Geral", BarChart2],
            ["users", "Utilizadores", Users],
            ["setup", "Base de Dados", Database],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors",
              activeTab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        {/* Separador Admins — visível apenas à conta mestra */}
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("admins")}
            className={cn(
              "flex items-center gap-2 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors",
              activeTab === "admins"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Gestores
          </button>
        )}
        {/* Preços — visível a todos os admins */}
        <button
          onClick={() => setActiveTab("prices")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors",
            activeTab === "prices"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <TrendingUp className="w-4 h-4" /> Preços
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="p-6 space-y-6 max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Total utilizadores"
                value={stats.total}
              />
              <StatCard
                icon={UserCheck}
                label="Contas ativas"
                value={stats.active}
                color="text-green-400"
              />
              <StatCard
                icon={UserX}
                label="Suspensas"
                value={stats.suspended}
                color="text-red-400"
              />
              <StatCard
                icon={AlertTriangle}
                label="Pendentes"
                value={stats.pending}
                color="text-yellow-400"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Contas Demo"
                value={stats.demo}
              />
              <StatCard
                icon={DollarSign}
                label="Contas Reais"
                value={stats.real}
                color="text-green-400"
              />
              <StatCard
                icon={DollarSign}
                label="Total depositado"
                value={"$" + fmt(stats.totalDeposited)}
                color="text-green-400"
                sub="contas reais"
              />
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Utilizadores recentes
                </span>
                <button
                  onClick={() => setActiveTab("users")}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {users
                  .slice(-5)
                  .reverse()
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedUser(u);
                        setActiveTab("users");
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                        {u.firstName[0] ?? u.email[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          STATUS_COLOR[u.status],
                        )}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <p className="text-xs font-semibold text-orange-300 mb-1">
                {dataSource === "supabase"
                  ? "✅ Supabase ativo"
                  : "⚠️ Modo local ativo"}
              </p>
              <p className="text-xs text-orange-300/80">
                {dataSource === "supabase"
                  ? "Os dados estão a ser lidos e escritos na base de dados Supabase em tempo real."
                  : "Os dados são guardados localmente neste navegador. Configure SUPABASE_SERVICE_ROLE_KEY em .env.local para ativar a base de dados real."}
              </p>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === "users" && (
          <div className="p-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar nome ou email…"
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-card text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 border border-border rounded-xl bg-card text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="">Todos estados</option>
                <option value="active">Ativos</option>
                <option value="suspended">Suspensos</option>
                <option value="pending">Pendentes</option>
              </select>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-3 py-2.5 border border-border rounded-xl bg-card text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="">Demo + Real</option>
                <option value="demo">Demo</option>
                <option value="real">Real</option>
              </select>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        Utilizador
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        País
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        Modo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        Estado
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        Saldo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        KYC
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                        Registado
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-12 text-sm text-muted-foreground"
                        >
                          Nenhum utilizador encontrado
                        </td>
                      </tr>
                    )}
                    {filtered.map((u) =>
                      // Presença realtime tem prioridade sobre fallback da API.
                      // Isso evita falsos "offline" quando o store em memória do servidor diverge.
                      (() => {
                        const isOnline =
                          onlineUserIds.has(u.id) ||
                          u.presenceStatus === "online";
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => setSelectedUser(u)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                                  {(u.firstName[0] ?? u.email[0]).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground leading-none">
                                    {u.firstName} {u.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {u.email}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "inline-block h-1.5 w-1.5 rounded-full",
                                        isOnline
                                          ? "bg-green-400"
                                          : "bg-zinc-500",
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "text-[10px] font-medium uppercase tracking-wide",
                                        isOnline
                                          ? "text-green-400"
                                          : "text-zinc-400",
                                      )}
                                    >
                                      {isOnline ? "Online" : "Offline"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {u.country || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-semibold uppercase",
                                  u.mode === "demo"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : "bg-green-500/10 text-green-400",
                                )}
                              >
                                {u.mode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-medium border",
                                  STATUS_COLOR[u.status],
                                )}
                              >
                                {STATUS_LABEL[u.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground">
                              {"$" + fmt(u.balance)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  KYC_COLOR[u.kycStatus],
                                )}
                              >
                                {KYC_LABEL[u.kycStatus]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {fmtDate(u.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </td>
                          </tr>
                        );
                      })(),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Setup Tab ── */}
        {activeTab === "setup" && <SetupTab />}

        {/* ── Gestores (sub-admins) — apenas conta mestra ── */}
        {activeTab === "admins" && isSuperAdmin && <AdminsTab />}

        {/* ── Preços ── */}
        {activeTab === "prices" && <PricesTab />}
      </div>

      {/* User Edit Drawer */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser!}
          onClose={() => setSelectedUser(null)}
          onSave={handleUserSave}
          onDelete={handleDeleteUser}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
