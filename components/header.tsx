"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useT, type Lang } from "@/lib/i18n"

const ALL_LANGUAGES = [
  { code: "en",  label: "English",   flag: "🇬🇧", ctx: "en" as Lang },
  { code: "ar",  label: "العربية",   flag: "🇸🇦", ctx: "en" as Lang },
  { code: "ko",  label: "한국어",     flag: "🇰🇷", ctx: "en" as Lang },
  { code: "ja",  label: "日本語",     flag: "🇯🇵", ctx: "en" as Lang },
  { code: "zh",  label: "繁體中文",   flag: "🇨🇳", ctx: "en" as Lang },
  { code: "pt",  label: "Português", flag: "🇧🇷", ctx: "pt" as Lang },
  { code: "es",  label: "Español",   flag: "🇪🇸", ctx: "es" as Lang },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [displayLang, setDisplayLang] = useState("pt")
  const langRef = useRef<HTMLDivElement>(null)
  const { setLang, t } = useT()
  const h = t.header

  useEffect(() => {
    const saved = localStorage.getItem("elite_lang")
    if (saved && ALL_LANGUAGES.some(l => l.code === saved)) setDisplayLang(saved)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleLangSelect = (code: string) => {
    setDisplayLang(code)
    localStorage.setItem("elite_lang", code)
    const found = ALL_LANGUAGES.find(l => l.code === code)
    if (found) setLang(found.ctx)
    setLangOpen(false)
  }

  const activeLang = ALL_LANGUAGES.find(l => l.code === displayLang) ?? ALL_LANGUAGES[5]

  return (
    <>
      {/* Risk Warning Banner */}
      <div className="bg-background/50 border-b border-border/50 py-2 px-4 text-center">
        <p className="text-xs text-muted-foreground">{h.riskBanner}</p>
      </div>

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1">
              <span className="text-accent font-bold text-2xl italic notranslate" translate="no">Elite</span>
              <span className="text-xl font-bold text-foreground notranslate" translate="no">trader</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center">
              <div className="flex items-center bg-card/50 rounded-full px-2 py-1 border border-border/50">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {h.nav.trading} <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>{h.trading.forex}</DropdownMenuItem>
                    <DropdownMenuItem>{h.trading.stocks}</DropdownMenuItem>
                    <DropdownMenuItem>{h.trading.metals}</DropdownMenuItem>
                    <DropdownMenuItem>{h.trading.crypto}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {h.nav.education} <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>{h.education.beginners}</DropdownMenuItem>
                    <DropdownMenuItem>{h.education.advanced}</DropdownMenuItem>
                    <DropdownMenuItem>{h.education.webinars}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link href="/#parceiros" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {h.nav.partners}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {h.nav.company} <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link href="/about">{h.company.about}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/regulation">{h.company.regulation}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>{h.company.contact}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {h.nav.support} <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>{h.support.faq}</DropdownMenuItem>
                    <DropdownMenuItem>{h.support.chat}</DropdownMenuItem>
                    <DropdownMenuItem>{h.support.email}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </nav>

            {/* Desktop CTA + Language switcher */}
            <div className="hidden lg:flex items-center gap-3">

              {/* Hedger-style language switcher */}
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-sm font-medium text-foreground hover:bg-white/10 transition-colors"
                >
                  <span className="text-base leading-none">{activeLang.flag}</span>
                  <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">{activeLang.code.toUpperCase()}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-foreground/50 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-background/90 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                    {ALL_LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => handleLangSelect(l.code)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          l.code === displayLang
                            ? "text-accent font-semibold bg-accent/8"
                            : "text-foreground/80 hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <span className="text-base leading-none w-6 text-center">{l.flag}</span>
                        <span>{l.label}</span>
                        {l.code === displayLang && <ChevronRight className="w-3.5 h-3.5 ml-auto text-accent" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button variant="outline" className="rounded-full border-accent text-foreground hover:bg-accent/10" asChild>
                <Link href="/auth/register">{h.openAccount}</Link>
              </Button>
              <Button className="rounded-full bg-transparent border border-border text-foreground hover:bg-card" asChild>
                <Link href="/auth/login">{h.login}</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-border/50">
              <nav className="flex flex-col gap-1">
                {/* Trading */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-1">{h.nav.trading}</p>
                <Link href="/trade/dashboard" className="text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {h.trading.forex}
                </Link>
                <Link href="/trade/dashboard" className="text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {h.trading.stocks}
                </Link>
                <Link href="/trade/dashboard" className="text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {h.trading.metals}
                </Link>
                <Link href="/trade/dashboard" className="text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {h.trading.crypto}
                </Link>

                {/* Company */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2">{h.nav.company}</p>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {h.company.about}
                </Link>
                <Link href="/regulation" className="text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors px-3 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {h.company.regulation}
                </Link>

                {/* Language switcher mobile */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2">Idioma</p>
                <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
                  {ALL_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { handleLangSelect(l.code); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg transition-colors border ${
                        l.code === displayLang
                          ? "text-accent font-bold bg-accent/10 border-accent/30"
                          : "text-muted-foreground hover:text-foreground border-border/40 hover:bg-white/5"
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span className="text-xs uppercase">{l.code}</span>
                    </button>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-border/50">
                  <Button variant="outline" className="rounded-full border-accent" asChild>
                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>{h.openAccount}</Link>
                  </Button>
                  <Button className="rounded-full bg-transparent border border-border" asChild>
                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>{h.login}</Link>
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
