"use client"

import Link from "next/link"
import { useT } from "@/lib/i18n"

const footerLinks = {
  Products: [
    { label: "Forex Trading", href: "/trade/dashboard" },
    { label: "Stock Trading", href: "/trade/dashboard" },
    { label: "Commodities", href: "/trade/dashboard" },
    { label: "Crypto CFDs", href: "/trade/dashboard" },
  ],
  Platforms: [
    { label: "MetaTrader 5", href: "/trade/dashboard" },
    { label: "WebTrader", href: "/trade/dashboard" },
    { label: "Mobile Apps", href: "/auth/register" },
    { label: "TradingView", href: "/trade/dashboard" },
  ],
  Company: [
    { label: "Sobre Nós", href: "/about" },
    { label: "Regulamentação", href: "/regulation" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Press", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Risk Disclosure", href: "/regulation" },
    { label: "Cookie Policy", href: "#" },
  ],
}

export function Footer() {
  const { t } = useT()
  const f = t.footer

  return (
    <footer className="bg-card text-foreground py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo and description */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-lg">E</span>
              </div>
              <span className="text-xl font-bold">
                <span className="text-accent notranslate" translate="no">Elite</span>
                <span className="text-foreground notranslate" translate="no">trader</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">{f.description}</p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">
                {f.categories[category as keyof typeof f.categories] ?? category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {f.links[link.label as keyof typeof f.links] ?? link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Risk Warning */}
        <div className="border-t border-border pt-8 mb-8">
          <p
            className="text-xs text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: f.riskWarning }}
          />
        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-accent notranslate" translate="no">Elite</span>
            <span className="text-foreground notranslate" translate="no">trader</span>
            . {f.copyright}
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">{f.twitter}</Link>
            <Link href="#" className="hover:text-foreground transition-colors">{f.linkedin}</Link>
            <Link href="#" className="hover:text-foreground transition-colors">{f.instagram}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
