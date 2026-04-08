"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { X, CreditCard, Coins, Smartphone, MoreHorizontal, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { accountStore } from "@/lib/account-store"
import { tradeStore } from "@/lib/trade-store"
import { supabase } from "@/lib/supabase"

const QUICK_AMOUNTS = [250, 500, 1000, 2500]
const MINIMUM_WITHDRAWAL = 15

type PaymentMethod = "card" | "gpay" | "crypto" | "other"
type Tab = "deposit" | "withdraw" | "history"

interface Transaction {
  id: string
  type: "deposit" | "withdrawal"
  amount: number
  method: string
  status: "pending" | "processed" | "failed"
  date: string
}

interface SavedCard {
  id: string
  card_holder: string
  card_last4: string
  card_brand: string
  card_exp: string
  country: string
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-semibold",
      status === "processed" ? "bg-green-100 text-green-700" :
      status === "pending"   ? "bg-green-500/20 text-green-400" :
                               "bg-red-100 text-red-700"
    )}>
      {status === "processed" ? "Processado" : status === "pending" ? "A ser processado" : "Falhado"}
    </span>
  )
}

// ─── Deposit form ─────────────────────────────────────────────────────────────
function DepositForm() {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])

  // Carregar cartões guardados ao montar
  useEffect(() => {
    fetch("/api/funds/payment-methods", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setSavedCards(d.data ?? []) })
      .catch(() => {})
  }, [])

  async function removeCard(id: string) {
    await fetch("/api/funds/payment-methods", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {})
    setSavedCards(prev => prev.filter(c => c.id !== id))
  }

  const [method, setMethod] = useState<PaymentMethod>("card")
  const [amount, setAmount] = useState("")
  const [country, setCountry] = useState("Brazil")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpMonth, setCardExpMonth] = useState("")
  const [cardExpYear, setCardExpYear] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [cardHolder, setCardHolder] = useState("")
  const [showCvv, setShowCvv] = useState(false)
  const [saveCard, setSaveCard] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "card",   label: "Cartão de Crédito/Débito", icon: <CreditCard className="w-4 h-4" /> },
    { id: "gpay",   label: "Google Pay",                icon: <span className="text-xs font-bold">G</span> },
    { id: "crypto", label: "Criptomoedas",              icon: <Coins className="w-4 h-4" /> },
    { id: "other",  label: "Outros Pagamentos",         icon: <MoreHorizontal className="w-4 h-4" /> },
  ]

  async function handleDeposit() {
    if (!amount || parseFloat(amount) < 10) { setResult({ type: "error", msg: "Montante mínimo: $10" }); return }
    if (!acceptTerms) { setResult({ type: "error", msg: "Aceite os termos e condições" }); return }
    setLoading(true)
    setResult(null)
    // Todos os métodos de pagamento retornam erro — depósitos não estão disponíveis
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 800))
    setResult({ type: "error", msg: "Ocorreu um erro ao processar o pagamento. Tente novamente mais tarde." })
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* Country */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">País emissor da conta bancária</label>
        <select value={country} onChange={e => setCountry(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm outline-none focus:border-accent">
          <option>Angola</option>
          <option>Alemanha</option>
          <option>Argentina</option>
          <option>Austrália</option>
          <option>Brasil</option>
          <option>Cabo Verde</option>
          <option>Canada</option>
          <option>China</option>
          <option>Espanha</option>
          <option>Estados Unidos</option>
          <option>França</option>
          <option>Itália</option>
          <option>Moçambique</option>
          <option>Portugal</option>
          <option>Reino Unido</option>
          <option>Suíça</option>
        </select>
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Método de pagamento</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {methods.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium",
                method === m.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-muted-foreground hover:border-accent/40"
              )}>
              {m.icon}
              <span className="text-[10px] leading-tight text-center">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Montante</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montante"
            className="w-full pl-7 pr-4 py-2.5 border border-border rounded-lg bg-card text-sm outline-none focus:border-accent text-foreground" />
        </div>
        <div className="flex gap-2">
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(String(a))}
              className={cn(
                "flex-1 py-1.5 border rounded-lg text-xs font-semibold transition-colors",
                amount === String(a) ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
              )}>
              ${a}
            </button>
          ))}
        </div>
      </div>

      {/* Cartões guardados */}
      {method === "card" && savedCards.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Cartões guardados</label>
          <div className="space-y-1.5">
            {savedCards.map(card => (
              <div key={card.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
                <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => {
                    setCardHolder(card.card_holder)
                    const parts = card.card_exp.split("/")
                    setCardExpMonth(parts[0] ?? "")
                    setCardExpYear(parts[1] ?? "")
                  }}
                >
                  <p className="text-sm font-semibold text-foreground">{card.card_brand} ····{card.card_last4}</p>
                  <p className="text-[11px] text-muted-foreground">{card.card_holder} · Val: {card.card_exp}</p>
                </button>
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-colors"
                  title="Remover cartão"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card details */}
      {method === "card" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Detalhes do cartão</label>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>VISA</span><span>●</span><span>Mastercard</span>
            </div>
          </div>
          <input type="text" placeholder="Número do cartão *" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm outline-none focus:border-accent" />
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            🔒 Este é um pagamento seguro com criptografia SSL de 128 bits
          </p>
          <div className="grid grid-cols-3 gap-2">
            <select value={cardExpMonth} onChange={e => setCardExpMonth(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-lg bg-input text-foreground text-sm outline-none focus:border-accent">
              <option value="">Mês *</option>
              {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={String(m).padStart(2,"0")}>{String(m).padStart(2,"0")}</option>)}
            </select>
            <select value={cardExpYear} onChange={e => setCardExpYear(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-lg bg-input text-foreground text-sm outline-none focus:border-accent">
              <option value="">Ano *</option>
              {Array.from({length:10},(_,i)=>new Date().getFullYear()+i).map(y=><option key={y} value={String(y)}>{y}</option>)}
            </select>
            <div className="relative">
              <input type={showCvv ? "text" : "password"} placeholder="CVV *" value={cardCvv} onChange={e => setCardCvv(e.target.value)} maxLength={4}
                className="w-full pl-3 pr-8 py-2.5 border border-border rounded-lg bg-card text-sm outline-none focus:border-accent" />
              <button type="button" onClick={() => setShowCvv(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <input type="text" placeholder="Nome do titular do cartão *" value={cardHolder} onChange={e => setCardHolder(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm outline-none focus:border-accent" />
        </div>
      )}

      {method === "crypto" && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground">
          Envie criptomoedas para o endereço fornecido após submissão. O depósito será creditado após 3 confirmações.
        </div>
      )}
      {(method === "gpay" || method === "other") && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground">
          Será redirecionado para completar o pagamento {method === "gpay" ? "via Google Pay" : "com o método selecionado"}.
        </div>
      )}

      {/* Save card */}
      {method === "card" && (
        <label className="flex items-start gap-2 p-3 bg-muted/20 rounded-xl border border-border cursor-pointer">
          <div className={cn("w-10 h-5 rounded-full relative transition-colors flex-shrink-0 mt-0.5", saveCard ? "bg-accent" : "bg-muted")}
            onClick={() => setSaveCard(v => !v)}>
            <div className={cn("absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform shadow", saveCard ? "translate-x-5" : "translate-x-0.5")} />
          </div>
          <span className="text-xs text-foreground">Salvar os detalhes do meu cartão de crédito para os próximos pagamentos</span>
        </label>
      )}

      {/* T&C */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-accent" />
        <span className="text-[11px] text-muted-foreground leading-relaxed">
          Li e aceitei o{" "}
          <span className="text-accent underline cursor-pointer">Contrato de Serviço ao Cliente</span>,{" "}
          <span className="text-accent underline cursor-pointer">Política de Divulgação de Risco</span>,{" "}
          <span className="text-accent underline cursor-pointer">Termos e Condições</span> e{" "}
          <span className="text-accent underline cursor-pointer">Declaração de Depósito</span>
        </span>
      </label>

      {/* Result message */}
      {result && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          result.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        )}>
          {result.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {result.msg}
        </div>
      )}

      {/* Submit */}
      <button onClick={handleDeposit} disabled={loading}
        className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold text-base hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-60">
        {loading ? "A processar..." : "Depósito"}
      </button>
      <p className="text-[10px] text-center text-muted-foreground">
        A transação está sendo processada com segurança e criptação SSL.
      </p>
    </div>
  )
}

// ─── Withdrawal form ──────────────────────────────────────────────────────────
function WithdrawForm({ availableBalance, onSuccess }: { availableBalance: number; onSuccess?: () => void }) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function handleWithdraw() {
    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num < MINIMUM_WITHDRAWAL) {
      setResult({ type: "error", msg: `Montante mínimo: $${MINIMUM_WITHDRAWAL}` }); return
    }
    // Conta demo não tem capital real — levantamentos apenas na conta real
    if (accountStore.getMode() === "demo") {
      setResult({ type: "error", msg: "Os levantamentos estão disponíveis apenas na conta real." }); return
    }
    if (num > availableBalance) {
      setResult({ type: "error", msg: `Saldo insuficiente. Disponível: $${availableBalance.toFixed(2)}` }); return
    }
    setLoading(true); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch("/api/funds/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (data.success) {
        // Actualizar o saldo no store local imediatamente (UI fica consistente sem refresh)
        if (typeof data.data?.newBalance === "number") {
          accountStore.setDBBalance(data.data.newBalance, "real")
          // Resetar epoch para o novo saldo (elimina distorção de P&L histórico)
          const realizedPnl = (await import("@/lib/trade-store")).tradeStore.getClosed().reduce((s: number, p: {pnl: number}) => s + p.pnl, 0)
          accountStore.setBalanceEpoch(realizedPnl)
        }
        setResult({ type: "success", msg: `Pedido de $${num.toFixed(2)} recebido. Processado em 1-3 dias úteis.` })
        setAmount("")
        onSuccess?.()
      } else {
        setResult({ type: "error", msg: data.error ?? "Erro" })
      }
    } catch {
      setResult({ type: "error", msg: "Erro de ligação" })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-[11px] text-muted-foreground">Montante disponível</p>
          <p className="text-xl font-bold text-foreground mt-1">${availableBalance.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-[11px] text-muted-foreground">Montante mínimo</p>
          <p className="text-xl font-bold text-foreground mt-1">${MINIMUM_WITHDRAWAL}.00</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Digite o montante do levantamento *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min={MINIMUM_WITHDRAWAL} max={availableBalance}
            className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg bg-card text-sm outline-none focus:border-accent" />
        </div>
      </div>

      {result && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          result.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        )}>
          {result.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {result.msg}
        </div>
      )}

      <button onClick={handleWithdraw} disabled={loading || availableBalance < MINIMUM_WITHDRAWAL}
        className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold text-base hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-60">
        {loading ? "A processar..." : "Sacar"}
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function FundsPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab") as Tab
    return t && (["deposit", "withdraw", "history"] as Tab[]).includes(t) ? t : "deposit"
  })
  const [availableBalance, setAvailableBalance] = useState(0)
  const [history, setHistory] = useState<Transaction[]>([])

  async function loadHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch("/api/funds/deposit", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const d = await res.json()
      if (d.success && Array.isArray(d.data)) {
        setHistory(d.data.map((t: { id: string; transaction_type: string; amount: number; status: string; created_at: string }) => ({
          id:     t.id,
          type:   (t.transaction_type ?? "deposit") as "deposit" | "withdrawal",
          amount: t.amount,
          method: t.transaction_type === "withdrawal" ? "Levantamento" : "Depósito",
          status: t.status === "approved" ? "processed" : t.status === "rejected" ? "failed" : "pending",
          date:   new Date(t.created_at).toLocaleDateString("pt-BR"),
        })))
      }
    } catch { /* silent */ }
  }

  // Sync tab when URL search param changes (sidebar link clicks)
  useEffect(() => {
    const t = searchParams.get("tab") as Tab
    if (t && (["deposit", "withdraw", "history"] as Tab[]).includes(t)) setTab(t)
  }, [searchParams])

  useEffect(() => {
    // Usar saldo real do DB — não o freeMargin que pode estar inflado por P&L virtual
    const getRealBalance = () => {
      const db = accountStore.getDBBalance("real")
      setAvailableBalance(db !== null && db > 0 ? db : 0)
    }
    getRealBalance()
    const unsub = accountStore.subscribe(getRealBalance)
    loadHistory()
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recarregar histórico sempre que o utilizador abre o tab
  useEffect(() => {
    if (tab === "history") loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const tabs = [
    { id: "deposit" as const,  label: "Depósito",     icon: ArrowDownLeft  },
    { id: "withdraw" as const, label: "Levantamento",  icon: ArrowUpRight   },
    { id: "history" as const,  label: "Histórico",    icon: CreditCard     },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-3 sm:p-6 space-y-6">

        <div>
          <h1 className="text-xl font-bold text-foreground">Fundos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerir depósitos e levantamentos</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          {tab === "deposit"  && <DepositForm />}
          {tab === "withdraw" && <WithdrawForm availableBalance={availableBalance} onSuccess={() => { loadHistory(); setTab("history") }} />}
          {tab === "history"  && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Histórico de transações</h3>
              {history.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sem transações ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center",
                          tx.type === "deposit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                          {tx.type === "deposit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{tx.type === "deposit" ? "Depósito" : "Levantamento"}</p>
                          <p className="text-[11px] text-muted-foreground">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", tx.type === "deposit" ? "text-green-600" : "text-red-500")}>
                          {tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </p>
                        <StatusBadge status={tx.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
