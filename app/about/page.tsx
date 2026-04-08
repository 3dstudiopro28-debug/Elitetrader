"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useT } from "@/lib/i18n"
import {
  ShieldCheck, TrendingUp, Users, Globe, BookOpen, Zap,
  ArrowRight, CheckCircle2, BarChart2, Award, Clock, HeartHandshake,
} from "lucide-react"

const PILLAR_COLORS = [
  "from-blue-600 to-accent",
  "from-accent to-cyan-500",
  "from-cyan-500 to-teal-500",
  "from-teal-500 to-green-500",
  "from-green-500 to-emerald-400",
]

const STAT_ICONS = [BarChart2, TrendingUp, Clock, Zap]
const STAT_VALUES = ["150+", "1:500", "24/7", "0,01s"]

const TRUST_ICONS = [ShieldCheck, CheckCircle2, Award, HeartHandshake, Globe, BookOpen]

export default function AboutPage() {
  const { t } = useT()
  const a = t.about

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
        </div>

        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 1400 600" preserveAspectRatio="none">
          <path d="M0,400 Q200,300 400,350 T800,280 T1200,320 T1400,260" stroke="#0f62fe" strokeWidth="2" fill="none" />
          <path d="M0,450 Q250,380 500,400 T900,350 T1400,300" stroke="#3da9fc" strokeWidth="1.5" fill="none" />
          <path d="M0,350 Q300,250 600,300 T1000,240 T1400,200" stroke="#0f62fe" strokeWidth="1" fill="none" />
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {a.badge}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            {a.heroTitle1}<br />
            <span className="text-accent">{a.heroTitle2}</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
            {a.heroSubtext}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-accent text-accent-foreground font-bold text-base hover:bg-accent/90 transition-all active:scale-95 shadow-lg shadow-accent/20">
              {a.openAccount} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-base hover:bg-muted transition-colors">
              {a.demoAccount}
            </Link>
          </div>
        </div>
      </section>

      {/* â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {a.stats.map((label, i) => {
              const Icon = STAT_ICONS[i]
              return (
                <div key={label} className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-1">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground tabular-nums">{STAT_VALUES[i]}</span>
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ MISSION + VISION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{a.purposeBadge}</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">{a.missionVision}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative rounded-2xl border border-border bg-card p-8 md:p-10 overflow-hidden group hover:border-accent/40 transition-colors">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{a.missionTitle}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">{a.missionText}</p>
              </div>
            </div>
            <div className="relative rounded-2xl border border-border bg-card p-8 md:p-10 overflow-hidden group hover:border-accent/40 transition-colors">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/10 transition-colors" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-5">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{a.visionTitle}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">{a.visionText}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ PILLARS E.L.I.T.E. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{a.pillarsBadge}</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {a.pillarsTitle} <span className="text-accent">E.L.I.T.E.</span>
            </h2>
            <p className="max-w-xl mx-auto text-muted-foreground text-base">{a.pillarsSubtext}</p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {a.pillars.map((pillar, i) => (
              <div key={pillar.word}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 hover:border-accent/40 transition-all hover:-translate-y-1 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${PILLAR_COLORS[i]} flex items-center justify-center mb-4 shadow-lg text-white font-black text-2xl flex-shrink-0`}>
                  {pillar.letter}
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{pillar.word}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{pillar.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ TRUST SIGNALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{a.trustBadge}</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">{a.trustTitle}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {a.trust.map((text, i) => {
              const Icon = TRUST_ICONS[i]
              return (
                <div key={text}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-card/80 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ WHAT WE OFFER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{a.offerBadge}</p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                {a.offerTitle}<br />
                <span className="text-accent">{a.offerTitleAccent}</span>
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-8">{a.offerText}</p>
              <ul className="space-y-3">
                {a.offerFeatures.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Visual card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-blue-600/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-border bg-card p-8 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Capital PrÃ³prio</p>
                    <p className="text-2xl font-extrabold text-accent tabular-nums">$102.847,50</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-400 text-sm font-semibold bg-green-500/10 px-3 py-1 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5" /> +2,85%
                  </div>
                </div>
                <svg viewBox="0 0 300 80" className="w-full opacity-80">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f62fe" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,70 Q30,60 60,55 T120,40 T180,30 T240,20 T300,10" stroke="#0f62fe" strokeWidth="2" fill="none" />
                  <path d="M0,70 Q30,60 60,55 T120,40 T180,30 T240,20 T300,10 L300,80 L0,80 Z" fill="url(#chartGrad)" />
                </svg>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  {[
                    { label: "Saldo", value: "$100.000,00" },
                    { label: "Margem Livre", value: "$98.500,00" },
                    { label: "PosiÃ§Ãµes Abertas", value: "3" },
                    { label: "NÃ­vel de Margem", value: "1.248%" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium mb-6">
            <Users className="w-3.5 h-3.5" /> {a.ctaBadge}
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            {a.ctaTitle1}<br />
            <span className="text-accent">{a.ctaTitle2}</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">{a.ctaSubtext}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-base hover:bg-accent/90 transition-all active:scale-95 shadow-xl shadow-accent/25">
              {a.ctaBtn1} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl border border-border bg-card/50 text-foreground font-semibold text-base hover:bg-card transition-colors">
              {a.ctaBtn2}
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{a.ctaNote}</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
