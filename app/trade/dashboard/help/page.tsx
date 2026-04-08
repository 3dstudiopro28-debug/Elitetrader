"use client";

import {
  Mail,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  Bot,
  Zap,
  ShieldCheck,
  TrendingUp,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const FAQS = [
  {
    q: "Como faço um depósito?",
    a: "Aceda a Fundos → Depósito. Aceitamos transferência bancária, Visa/Mastercard e carteiras digitais. O crédito é imediato para a maioria dos métodos.",
  },
  {
    q: "Quanto tempo demora um levantamento?",
    a: "Os pedidos de levantamento são processados em 1 a 3 dias úteis após verificação. O montante mínimo é de $15.",
  },
  {
    q: "O que é a conta Demo?",
    a: "A conta Demo usa capital virtual ($100 000) para praticar trading sem risco real. Pode alternar entre Demo e Real a qualquer momento na barra lateral.",
  },
  {
    q: "O que é alavancagem?",
    a: "A alavancagem permite controlar uma posição maior com menos capital. A nossa plataforma oferece até 1:500. Alavancagens elevadas ampliam ganhos e perdas.",
  },
  {
    q: "Como funciona o Stop Loss / Take Profit?",
    a: "Quando abre uma posição, pode definir um preço de Stop Loss (limite de perda) e Take Profit (alvo de lucro). A posição fecha automaticamente quando o preço atingir esses níveis.",
  },
  {
    q: "A plataforma está disponível em dispositivos móveis?",
    a: "Sim. A EliteTrader é totalmente responsiva e funciona em qualquer browser moderno em iOS e Android. Aplicações nativas estão em desenvolvimento.",
  },
];

const AI_FEATURES = [
  {
    icon: Bot,
    title: "Análise de Mercado com IA",
    desc: "Algoritmos de machine learning analisam milhares de padrões de mercado em tempo real, identificando oportunidades antes dos outros.",
  },
  {
    icon: Zap,
    title: "Execução Instantânea",
    desc: "IA integrada que optimiza a rota de execução de ordens para garantir o menor slippage possível e execução sub-milissegundo.",
  },
  {
    icon: ShieldCheck,
    title: "Gestão de Risco Inteligente",
    desc: "Sistema automático de alertas e protecção de margem que monitora as suas posições 24/7, notificando-o antes de qualquer risco crítico.",
  },
  {
    icon: TrendingUp,
    title: "Sinais de Trading",
    desc: "Indicadores gerados por IA com base em dados históricos, volume, momentum e sentimento de mercado para apoiar as suas decisões.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="h-full overflow-y-auto">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sidebar via-card to-sidebar border-b border-border px-6 sm:px-10 py-12">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative max-w-2xl">
          <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-accent/20 text-accent mb-4 uppercase tracking-widest">
            Centro de Ajuda
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3 leading-tight">
            Como podemos{" "}
            <span className="text-accent">ajudá-lo?</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-lg">
            A nossa equipa de suporte está disponível 24 horas por dia, 7 dias
            por semana. Encontre respostas, contacte-nos ou descubra como a
            nossa tecnologia funciona.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-14">

        {/* ── Contactos ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent" />
            Contacte-nos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email suporte */}
            <a
              href="mailto:support@elitetrader.com"
              className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/25 transition-colors">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Suporte Geral</p>
                <p className="text-sm font-semibold text-foreground">support@elitetrader.com</p>
                <p className="text-[11px] text-muted-foreground mt-1">Resposta em até 2 horas</p>
              </div>
            </a>

            {/* Email conta */}
            <a
              href="mailto:accounts@elitetrader.com"
              className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/25 transition-colors">
                <Mail className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Conta & Fundos</p>
                <p className="text-sm font-semibold text-foreground">accounts@elitetrader.com</p>
                <p className="text-[11px] text-muted-foreground mt-1">Depósitos, levantamentos, KYC</p>
              </div>
            </a>

            {/* Telefone UK */}
            <a
              href="tel:+442080581234"
              className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/25 transition-colors">
                <Phone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Telefone — Reino Unido 🇬🇧</p>
                <p className="text-sm font-semibold text-foreground">+44 208 058 1234</p>
                <p className="text-[11px] text-muted-foreground mt-1">Seg–Sex, 08:00–20:00 GMT</p>
              </div>
            </a>

            {/* Live chat */}
            <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Chat ao Vivo</p>
                <p className="text-sm font-semibold text-foreground">Disponível 24/7</p>
                <p className="text-[11px] text-muted-foreground mt-1">Aceda pelo botão no canto inferior direito</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Escritório UK ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Escritório Reino Unido
          </h2>
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6 bg-card border border-border rounded-2xl">
            <div className="text-4xl">🇬🇧</div>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-foreground">EliteTrader Financial Ltd.</p>
              <p className="text-sm text-muted-foreground">12 Finsbury Square, London, EC2A 1AR</p>
              <p className="text-sm text-muted-foreground">Reino Unido</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                  <ShieldCheck className="w-3 h-3" /> Regulado FCA · Ref. 987654
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent">
                  <Globe className="w-3 h-3" /> FCA Autorizado
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Horário de suporte ────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Horário de Suporte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { day: "Segunda – Sexta", hours: "00:00 – 24:00 GMT", badge: "24h", color: "text-green-400 bg-green-500/15" },
              { day: "Sábado", hours: "08:00 – 20:00 GMT", badge: "Chat", color: "text-yellow-400 bg-yellow-500/15" },
              { day: "Domingo", hours: "10:00 – 18:00 GMT", badge: "Email", color: "text-orange-400 bg-orange-500/15" },
            ].map((item) => (
              <div key={item.day} className="p-4 bg-card border border-border rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">{item.day}</p>
                <p className="text-sm font-semibold text-foreground">{item.hours}</p>
                <span className={cn("inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full", item.color)}>
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── IA integrada ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Tecnologia IA Integrada</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            A EliteTrader foi construída de raiz com Inteligência Artificial no
            centro do sistema — não como um extra, mas como motor da experiência.
            Isto traduz-se em decisões mais rápidas, execução mais eficiente e
            gestão de risco mais inteligente em cada segundo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AI_FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-5 bg-card border border-border rounded-xl hover:border-accent/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-5 rounded-xl bg-accent/5 border border-accent/20">
            <p className="text-sm text-foreground font-medium mb-1">
              Porquê a IA faz diferença?
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Ao integrar IA directamente nos fluxos da plataforma — e não como
              una camada externa — conseguimos tempos de resposta inferiores a
              50ms, análises de padrão em milissegundos e alertas de risco
              antes que o mercado se mova. O resultado para o utilizador é uma
              plataforma mais rápida, mais precisa e que trabalha <em>por si</em>{" "}
              poupando tempo e reduzindo erros humanos.
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent" />
            Perguntas Frequentes
          </h2>
          <div className="space-y-2">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── CTA bottom ───────────────────────────────────────────────── */}
        <section className="pb-6">
          <div className="rounded-2xl bg-gradient-to-r from-accent/20 via-accent/10 to-accent/5 border border-accent/20 p-8 text-center">
            <Mail className="w-8 h-8 text-accent mx-auto mb-3" />
            <h3 className="text-xl font-bold text-foreground mb-2">Não encontrou resposta?</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Envie-nos um email e a nossa equipa responde em até 2 horas nos
              dias úteis.
            </p>
            <a
              href="mailto:support@elitetrader.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all active:scale-95"
            >
              <Mail className="w-4 h-4" />
              Enviar Email
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
