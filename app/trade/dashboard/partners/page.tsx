"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Users, BarChart3, HelpCircle, DollarSign, ChevronRight, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Comissões Competitivas",
    desc: "Ganhe até 40% de comissão em cada transação realizada pelos seus clientes referidos.",
    color: "from-green-500/20 to-green-500/5",
    textColor: "text-green-400",
  },
  {
    icon: Users,
    title: "Suporte Dedicado",
    desc: "Tenha acesso a um gestor de parceiros pessoal 24/7 para o apoiar no seu crescimento.",
    color: "from-accent/20 to-accent/5",
    textColor: "text-accent",
  },
  {
    icon: BarChart3,
    title: "Ferramentas de Marketing",
    desc: "Acesso a banners, landing pages personalizadas, links de rastreamento e relatórios em tempo real.",
    color: "from-purple-500/20 to-purple-500/5",
    textColor: "text-purple-400",
  },
  {
    icon: HelpCircle,
    title: "Formação Contínua",
    desc: "Webinars exclusivos, guias de mercado e materiais educativos para ajudar os seus clientes.",
    color: "from-orange-500/20 to-orange-500/5",
    textColor: "text-orange-400",
  },
]

const STEPS = [
  { step: "01", title: "Candidature-se", desc: "Preencha o formulário de candidatura abaixo. A análise demora menos de 24 horas." },
  { step: "02", title: "Receba o seu Link", desc: "Após aprovação, recebe o seu link exclusivo de rastreamento e acesso ao painel de parceiro." },
  { step: "03", title: "Comece a Ganhar", desc: "Partilhe com a sua rede e ganhe comissões automáticas por cada cliente activo." },
]

export default function PartnersPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", network: "", message: "" })
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const refLink = "https://elitetrade.com/ref/demo-12345"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Stub — would POST to /api/partners/apply
    setSubmitted(true)
  }

  function copyLink() {
    navigator.clipboard.writeText(refLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="h-full overflow-y-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sidebar via-card to-sidebar border-b border-border px-8 py-14">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-accent blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative max-w-2xl">
          <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-accent/20 text-accent mb-4 uppercase tracking-widest">
            Programa de Parceiros
          </span>
          <h1 className="text-4xl font-extrabold text-foreground mb-4 leading-tight">
            O seu parceiro <span className="text-accent">no progresso</span>
          </h1>
          <p className="text-muted-foreground text-base mb-8 max-w-lg">
            Acreditamos no sucesso em equipe. Ganhe recompensas significativas por cada transação realizada
            pelos clientes que nos indicar. Sem limite de ganhos.
          </p>
          <a href="#apply"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-bold px-6 py-3 rounded-xl hover:bg-accent/90 transition-all active:scale-95">
            Candidate-se hoje mesmo <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">

        {/* ── Your referral link (demo) ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">O seu link de referência (Demo)</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-accent font-mono bg-muted/40 px-4 py-2.5 rounded-xl border border-border truncate">
              {refLink}
            </code>
            <button onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Partilhe este link e rastreie automaticamente todas as referências.</p>
        </div>

        {/* ── Benefits ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6">Porquê ser parceiro da Elite Trade?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map(b => (
              <div key={b.title} className={cn("bg-gradient-to-br p-6 rounded-2xl border border-border/50", b.color)}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", "bg-card/50")}>
                  <b.icon className={cn("w-5 h-5", b.textColor)} />
                </div>
                <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6">Como funciona?</h2>
          <div className="relative space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.step} className="flex gap-5 items-start">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent font-black text-sm">{s.step}</span>
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-foreground mb-0.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute left-6 mt-12 w-px h-6 bg-border" style={{ marginTop: `${i * 76 + 48}px` }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Commission table ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6">Estrutura de Comissões</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-5 py-3 text-left text-xs text-muted-foreground font-semibold">Nível</th>
                  <th className="px-5 py-3 text-left text-xs text-muted-foreground font-semibold">Clientes ativos</th>
                  <th className="px-5 py-3 text-right text-xs text-muted-foreground font-semibold">Comissão / lote</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: "Bronze",    clients: "1 – 10",   commission: "$3",  cls: "text-orange-400" },
                  { level: "Prata",     clients: "11 – 30",  commission: "$6",  cls: "text-gray-400" },
                  { level: "Ouro",      clients: "31 – 100", commission: "$10", cls: "text-yellow-400" },
                  { level: "Platina",   clients: "101+",     commission: "$15", cls: "text-accent" },
                ].map(r => (
                  <tr key={r.level} className="border-b border-border/30 last:border-0 hover:bg-muted/10">
                    <td className={cn("px-5 py-3 font-bold", r.cls)}>{r.level}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.clients}</td>
                    <td className="px-5 py-3 text-right text-green-400 font-bold">{r.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Application form ─────────────────────────────────────────── */}
        <div id="apply" className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Candidature-se</h2>
          <p className="text-sm text-muted-foreground mb-6">Preencha o formulário e a nossa equipe entrará em contacto em menos de 24 horas.</p>

          {submitted ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <CheckCircle2 className="w-14 h-14 text-green-400" />
              <h3 className="text-lg font-bold text-foreground">Candidatura enviada!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">Obrigado pelo interesse. A nossa equipe irá analisar a sua candidatura e entrar em contacto em breve.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Nome completo *", field: "name" as const,    type: "text",  placeholder: "João Silva",           full: false },
                { label: "Email *",          field: "email" as const,   type: "email", placeholder: "joao@exemplo.com",     full: false },
                { label: "Telefone",         field: "phone" as const,   type: "tel",   placeholder: "+351 912 345 678",     full: false },
                { label: "País",             field: "country" as const, type: "text",  placeholder: "Portugal",             full: false },
                { label: "Rede / alcance",   field: "network" as const, type: "text",  placeholder: "Instagram: 15k seguidores", full: true },
              ].map(f => (
                <div key={f.field} className={f.full ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.field]}
                    onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Mensagem (opcional)</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  placeholder="Conte-nos um pouco sobre si e como planeia promover a Elite Trade..."
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="submit"
                  className="w-full py-3 bg-accent text-accent-foreground font-bold rounded-xl text-sm hover:bg-accent/90 transition-all active:scale-95">
                  Enviar candidatura
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Ao candidatar-se, confirma que leu e aceita os <span className="text-accent cursor-pointer hover:underline">Termos do Programa de Parceiros</span>.
          As comissões são pagas mensalmente mediante cumprimento dos requisitos mínimos.
        </p>
      </div>
    </div>
  )
}
