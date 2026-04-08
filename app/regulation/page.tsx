"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useT } from "@/lib/i18n"
import {
  ShieldCheck, FileText, Building2, Globe, Lock, AlertTriangle,
  CheckCircle2, ArrowRight, Landmark, Scale, Eye, Ban,
} from "lucide-react"

const LICENSES = [
  {
    flag: "🇬🇧",
    country: "Reino Unido",
    authority: "Financial Conduct Authority",
    acronym: "FCA",
    number: "FRN: 987451",
    status: "Autorizado",
    entity: "EliteTrader Capital Ltd",
    registered: "Londres, Reino Unido",
    date: "14 de Março de 2019",
    type: "Intermediário de Investimentos",
    color: "border-accent/40 bg-accent/5",
    badge: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  {
    flag: "🇨🇾",
    country: "Chipre",
    authority: "Cyprus Securities & Exchange Commission",
    acronym: "CySEC",
    number: "Licença: 421/22",
    status: "Registado",
    entity: "EliteTrader EU Ltd",
    registered: "Limassol, Chipre",
    date: "07 de Setembro de 2022",
    type: "Empresa de Investimento EEE",
    color: "border-border bg-card",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    flag: "🇦🇺",
    country: "Austrália",
    authority: "Australian Securities & Investments Commission",
    acronym: "ASIC",
    number: "AFSL: 548 771",
    status: "Registado",
    entity: "EliteTrader AU Pty Ltd",
    registered: "Sydney, Austrália",
    date: "22 de Janeiro de 2023",
    type: "Titular de Licença de Serviços Financeiros",
    color: "border-border bg-card",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
]

const PROTECTION_ICONS = [Lock, ShieldCheck, Ban, Eye, Scale, FileText]

export default function RegulationPage() {
  const { t } = useT()
  const r = t.regulation

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden pt-24 pb-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-accent/8 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            {r.badge}
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            {r.heroTitle1}<br />
            <span className="text-accent">{r.heroTitle2}</span><br />
            {r.heroTitle3}
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
            {r.heroSubtext}
          </p>

          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl border border-accent/30 bg-accent/5">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">{r.fcaBadgeLabel}</p>
              <p className="font-bold text-foreground text-base">Financial Conduct Authority — FCA</p>
              <p className="text-accent text-sm font-mono">FRN: 987451 · Reino Unido</p>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ LICENSES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{r.licensesBadge}</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">{r.licensesTitle}</h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground">{r.licensesSubtext}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {LICENSES.map((lic) => (
              <div key={lic.acronym}
                className={`rounded-2xl border ${lic.color} p-7 flex flex-col gap-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{lic.flag}</span>
                    <div>
                      <p className="font-bold text-foreground text-lg leading-tight">{lic.acronym}</p>
                      <p className="text-xs text-muted-foreground">{lic.country}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${lic.badge}`}>
                    {lic.status}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-snug">{lic.authority}</p>

                <div className="font-mono text-base font-bold text-foreground bg-background/60 rounded-lg px-4 py-2.5 border border-border">
                  {lic.number}
                </div>

                <div className="space-y-2 text-sm border-t border-border pt-4">
                  {([
                    [r.licenseFields.entity, lic.entity],
                    [r.licenseFields.seat,   lic.registered],
                    [r.licenseFields.type,   lic.type],
                    [r.licenseFields.date,   lic.date],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground flex-shrink-0">{k}</span>
                      <span className="text-foreground text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ REGISTERED OFFICE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{r.officeBadge}</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5">
                {r.officeTitle}<br /><span className="text-accent">{r.officeTitleAccent}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{r.officeText}</p>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Building2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">EliteTrader Capital Ltd</p>
                  <p>12 Finsbury Square, 4th Floor</p>
                  <p>London, EC2A 1AR</p>
                  <p>United Kingdom</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-5 h-5 text-accent" />
                <p className="font-bold text-foreground">{r.officeDetailsTitle}</p>
              </div>
              {r.officeRows.map((label, i) => (
                <div key={label} className="flex justify-between gap-4 text-sm border-b border-border/50 pb-2 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium text-right">{r.officeValues[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ PROTECTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{r.protectionsBadge}</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              {r.protectionsTitle}<br />
              <span className="text-accent">{r.protectionsTitleAccent}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {r.protections.map((item, i) => {
              const Icon = PROTECTION_ICONS[i]
              return (
                <div key={item.title}
                  className="rounded-2xl border border-border bg-card p-7 flex flex-col gap-4 hover:border-accent/40 transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ DOCS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">{r.docsBadge}</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">{r.docsTitle}</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{r.docsSubtext}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {r.docs.map((doc) => (
              <Link key={doc.label} href="#"
                className="flex items-start gap-3 p-5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-card/80 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/15 transition-colors mt-0.5">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{doc.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ RISK WARNING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 p-7 md:p-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg mb-3">{r.riskTitle}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {r.riskText1}{" "}
                  <strong className="text-foreground">{r.riskBold}</strong>{" "}
                  {r.riskText2}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.riskText3}</p>
                <p className="text-xs text-muted-foreground/70 mt-4">{r.riskFooter}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {r.ctaBadge}
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            {r.ctaTitle1}<br />
            <span className="text-accent">{r.ctaTitle2}</span>
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-9">{r.ctaSubtext}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-base hover:bg-accent/90 transition-all active:scale-95 shadow-xl shadow-accent/25">
              {r.ctaBtn1} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/about"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-xl border border-border bg-card/50 text-foreground font-semibold text-base hover:bg-card transition-colors">
              {r.ctaBtn2}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
