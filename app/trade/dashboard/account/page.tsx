"use client";

import { useState, useEffect } from "react";
import {
  Save,
  User,
  MapPin,
  Phone,
  CreditCard,
  Shield,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationStore } from "@/lib/notification-store";
import { supabase } from "@/lib/supabase";
import { profileStore } from "@/lib/profile-store";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  phoneCountryCode: string;
  phone: string;
  nationality: string;
  nif: string;
  isPep: boolean;
  isUsResident: boolean;
  idType: string;
  idNumber: string;
  currency: string;
  accountId: string;
  cid: string;
  profileCompletion: number;
  profileCompletionMax: number;
  forcePasswordChange?: boolean;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const COUNTRIES = [
  "Angola",
  "Brasil",
  "Portugal",
  "Moçambique",
  "Cabo Verde",
  "Estados Unidos",
  "Reino Unido",
  "França",
  "Alemanha",
  "Espanha",
];
const CURRENCIES = ["USD", "EUR", "GBP", "BRL", "AOA"];
const ID_TYPES = [
  "Bilhete de Identidade",
  "Passaporte",
  "Carta de Condução",
  "NIF",
];
const PHONE_CODES = [
  "+244",
  "+55",
  "+351",
  "+258",
  "+238",
  "+1",
  "+44",
  "+33",
  "+49",
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? label}
        className={cn(
          "w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground outline-none transition-colors",
          readOnly
            ? "bg-muted/30 cursor-default"
            : "bg-card focus:border-accent focus:ring-1 focus:ring-accent/20",
        )}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
      >
        <option value="">Selecionar {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "info" | "contact" | "security" | "financial"
  >("info");

  // Password change state
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Load profile from API
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const token = session?.access_token;
        fetch("/api/user/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              // Mesclar com campos locais (dob, nif, etc.) que não estão no DB
              const local =
                typeof window !== "undefined"
                  ? localStorage.getItem("et_user_profile")
                  : null;
              const localParsed = local ? JSON.parse(local) : {};
              const merged = { ...localParsed, ...data.data };
              setProfile(merged);
              // Seed profileStore para que a saudação/sidebar mostrem o nome correto
              const name = [data.data.firstName, data.data.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
              if (name) profileStore.setName(name);
            } else {
              throw new Error("API failed");
            }
          })
          .catch(() => {
            const stored =
              typeof window !== "undefined"
                ? localStorage.getItem("et_user_profile")
                : null;
            if (stored) setProfile(JSON.parse(stored));
            else
              setProfile({
                id: "demo",
                email: "",
                firstName: "",
                lastName: "",
                dobDay: "",
                dobMonth: "",
                dobYear: "",
                country: "Brazil",
                city: "",
                address: "",
                postalCode: "",
                phoneCountryCode: "+55",
                phone: "",
                nationality: "Brasil",
                nif: "",
                isPep: false,
                isUsResident: false,
                idType: "",
                idNumber: "",
                currency: "USD",
                accountId: "13541",
                cid: "213348",
                profileCompletion: 2,
                profileCompletionMax: 4,
              });
          })
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  function update(field: keyof UserProfile, value: string | boolean) {
    setProfile((p) => (p ? { ...p, [field]: value } : p));
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sem sessão");

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Erro ao guardar");

      localStorage.setItem("et_user_profile", JSON.stringify(profile));
      const name = profile.firstName
        ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
        : profile.email;
      // Actualizar o nome no store reactivo → sidebar + saudação actualizam imediatamente
      if (profile.firstName || profile.lastName) {
        profileStore.setName(name);
      }
      notificationStore.add(
        "account",
        "Perfil atualizado",
        `As suas informações foram guardadas com sucesso (${name})`,
      );
      setSaved(true);
      setSaveError("");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setSaveError(msg);
      // Fallback: guardar apenas localmente
      localStorage.setItem("et_user_profile", JSON.stringify(profile));
      notificationStore.add(
        "account",
        "Perfil guardado localmente",
        "Não foi possível sincronizar com o servidor.",
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!newPass || newPass.length < 8) {
      setPassMsg({
        type: "err",
        text: "A nova senha deve ter pelo menos 8 caracteres.",
      });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: "err", text: "As senhas não coincidem." });
      return;
    }
    setPassLoading(true);
    setPassMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        setPassMsg({ type: "err", text: error.message });
      } else {
        // Clear force_password_change flag in DB
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/user/profile", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ forcePasswordChange: false }),
          });
        }
        setProfile((p) => (p ? { ...p, forcePasswordChange: false } : p));
        setPassMsg({ type: "ok", text: "Senha alterada com sucesso!" });
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      }
    } catch {
      setPassMsg({ type: "err", text: "Erro de rede ao alterar senha." });
    }
    setPassLoading(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "ELIMINAR") return;
    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Erro ao eliminar");
      // Sign out and clear local data
      localStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      notificationStore.add("account", "Erro ao eliminar conta", msg);
    }
    setDeleting(false);
  }

  const tabs = [
    { id: "info" as const, label: "Info pessoal", icon: User },
    { id: "contact" as const, label: "Info Contacto", icon: Phone },
    { id: "security" as const, label: "Segurança", icon: Shield },
    { id: "financial" as const, label: "Financeiro", icon: CreditCard },
  ];

  const completionPct = profile
    ? (profile.profileCompletion / profile.profileCompletionMax) * 100
    : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">A minha conta</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerir informações pessoais e definições
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !profile}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-60 active:scale-95"
          >
            {saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "A guardar..." : saved ? "Guardado!" : "Guardar"}
          </button>
        </div>

        {/* Profile completion */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              Completar o seu perfil
            </p>
            <span className="text-xs text-muted-foreground">
              {profile?.profileCompletion ?? 0}/
              {profile?.profileCompletionMax ?? 4} etapas
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Perfil completo para aceder a mais recursos e limites mais elevados.
          </p>
        </div>

        {/* Account IDs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">Account ID</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {profile?.accountId ?? "—"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">CID</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {profile?.cid ?? "—"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">Email</p>
            <p className="text-sm font-medium text-foreground truncate mt-0.5">
              {profile?.email || "—"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            {/* Info pessoal */}
            {activeTab === "info" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Info pessoal
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Primeiro nome"
                    value={profile?.firstName ?? ""}
                    onChange={(v) => update("firstName", v)}
                    required
                  />
                  <InputField
                    label="Apelido"
                    value={profile?.lastName ?? ""}
                    onChange={(v) => update("lastName", v)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Data de nascimento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <InputField
                      label="Dia"
                      value={profile?.dobDay ?? ""}
                      onChange={(v) => update("dobDay", v)}
                      placeholder="Dia"
                    />
                    <SelectField
                      label="Mês"
                      value={profile?.dobMonth ?? ""}
                      onChange={(v) => update("dobMonth", v)}
                      options={MONTHS}
                    />
                    <InputField
                      label="Ano"
                      value={profile?.dobYear ?? ""}
                      onChange={(v) => update("dobYear", v)}
                      placeholder="Ano"
                    />
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                  Morada
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="País"
                    value={profile?.country ?? ""}
                    onChange={(v) => update("country", v)}
                    options={COUNTRIES}
                    required
                  />
                  <InputField
                    label="Cidade"
                    value={profile?.city ?? ""}
                    onChange={(v) => update("city", v)}
                    required
                  />
                  <InputField
                    label="Morada"
                    value={profile?.address ?? ""}
                    onChange={(v) => update("address", v)}
                    required
                  />
                  <InputField
                    label="Código postal"
                    value={profile?.postalCode ?? ""}
                    onChange={(v) => update("postalCode", v)}
                    required
                  />
                </div>

                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                  Informação adicional
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="NIF / Número fiscal"
                    value={profile?.nif ?? ""}
                    onChange={(v) => update("nif", v)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile?.isPep ?? false}
                      onChange={(e) => update("isPep", e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-foreground">
                      É uma Pessoa Politicamente Exposta (PEP), ou
                      associado/familiar de uma PEP?
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile?.isUsResident ?? false}
                      onChange={(e) => update("isUsResident", e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-foreground">
                      Você é um(a) Residente Fiscal dos EUA?
                    </span>
                  </label>
                </div>

                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                  ID
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Tipo de ID"
                    value={profile?.idType ?? ""}
                    onChange={(v) => update("idType", v)}
                    options={ID_TYPES}
                  />
                  <InputField
                    label="Número de ID"
                    value={profile?.idNumber ?? ""}
                    onChange={(v) => update("idNumber", v)}
                  />
                  <SelectField
                    label="Nacionalidade"
                    value={profile?.nationality ?? ""}
                    onChange={(v) => update("nationality", v)}
                    options={COUNTRIES}
                    required
                  />
                </div>

                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                  Moeda com a qual deseja fazer trading
                </h4>
                <SelectField
                  label="Moeda"
                  value={profile?.currency ?? "USD"}
                  onChange={(v) => update("currency", v)}
                  options={CURRENCIES}
                />
              </div>
            )}

            {/* Info Contacto */}
            {activeTab === "contact" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Info Contacto
                </h3>
                <InputField
                  label="Email"
                  value={profile?.email ?? ""}
                  onChange={(v) => update("email", v)}
                  type="email"
                  required
                />
                <div className="grid grid-cols-4 gap-2">
                  <SelectField
                    label="Código do país"
                    value={profile?.phoneCountryCode ?? "+55"}
                    onChange={(v) => update("phoneCountryCode", v)}
                    options={PHONE_CODES}
                  />
                  <div className="col-span-3">
                    <InputField
                      label="Número de telemóvel"
                      value={profile?.phone ?? ""}
                      onChange={(v) => update("phone", v)}
                      type="tel"
                    />
                  </div>
                </div>
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Para alterar o seu email ou telemóvel, entre em contacto
                    com o suporte para verificação de identidade.
                  </p>
                </div>
              </div>
            )}

            {/* Segurança */}
            {activeTab === "security" && (
              <div className="space-y-5">
                {/* Aviso de senha redefinida pelo admin */}
                {profile?.forcePasswordChange && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/40 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">
                        Senha redefinida pelo administrador
                      </p>
                      <p className="text-xs text-yellow-300/70 mt-0.5">
                        Por razões de segurança, deve definir uma nova senha
                        pessoal antes de continuar.
                      </p>
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Definir nova senha
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Mín. 8 caracteres"
                        className="w-full pl-3 pr-10 py-2 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
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
                  </div>

                  <InputField
                    label="Confirmar nova senha"
                    value={confirmPass}
                    onChange={setConfirmPass}
                    type="password"
                    placeholder="Repetir nova senha"
                  />

                  {passMsg && (
                    <div
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl text-xs font-medium",
                        passMsg.type === "ok"
                          ? "bg-green-500/10 border border-green-500/30 text-green-400"
                          : "bg-red-500/10 border border-red-500/30 text-red-400",
                      )}
                    >
                      {passMsg.type === "ok" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      )}
                      {passMsg.text}
                    </div>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={passLoading || !newPass}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60"
                  >
                    {passLoading ? "A guardar…" : "Guardar nova senha"}
                  </button>
                </div>

                {/* Eliminar conta */}
                <div className="border-t border-red-500/20 pt-5 space-y-3">
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Eliminar conta
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Esta ação é permanente e irreversível. Todos os seus dados,
                    histórico e saldo serão eliminados definitivamente.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Digite{" "}
                      <strong className="text-foreground">ELIMINAR</strong> para
                      confirmar
                    </label>
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="ELIMINAR"
                      className="w-full px-3 py-2 rounded-lg border border-red-500/30 bg-card text-sm text-foreground outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirm !== "ELIMINAR"}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting
                      ? "A eliminar…"
                      : "Eliminar conta permanentemente"}
                  </button>
                </div>
              </div>
            )}

            {/* Financeiro */}
            {activeTab === "financial" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Questionário financeiro
                </h3>
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">
                      Progresso
                    </p>
                    <span className="text-xs text-muted-foreground">
                      3 de 10 perguntas
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: "30%" }}
                    />
                  </div>
                </div>
                <button className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                  Questionário completo
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Um breve questionário para nos ajudar a conhecer os seus
                  conhecimentos financeiros e objetivos comerciais.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
