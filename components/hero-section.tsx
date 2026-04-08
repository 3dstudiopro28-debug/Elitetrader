"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { useT } from "@/lib/i18n"

export function HeroSection() {
  const { t } = useT()
  const h = t.hero
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background decorative lines */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute top-0 left-0 w-full h-full opacity-20" viewBox="0 0 1920 1080" fill="none">
          <path d="M-100 400 Q 200 200 500 350 T 900 300 T 1300 400 T 1700 350 T 2100 400" stroke="url(#gradient1)" strokeWidth="2" fill="none" />
          <path d="M-100 500 Q 200 300 500 450 T 900 400 T 1300 500 T 1700 450 T 2100 500" stroke="url(#gradient2)" strokeWidth="2" fill="none" />
          <path d="M-100 600 Q 200 400 500 550 T 900 500 T 1300 600 T 1700 550 T 2100 600" stroke="url(#gradient3)" strokeWidth="2" fill="none" />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f62fe" stopOpacity="0" />
              <stop offset="50%" stopColor="#0f62fe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3da9fc" stopOpacity="0" />
              <stop offset="50%" stopColor="#3da9fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3da9fc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7cc6ff" stopOpacity="0" />
              <stop offset="50%" stopColor="#7cc6ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7cc6ff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-10 sm:py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Plataforma de trading profissional
          </div>

          {/* Main Headline — azul / branco / azul alternado */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.15] mb-6 lg:mb-8">
            <span className="text-accent italic">{h.line1}</span>
            <br />
            <span className="text-foreground italic">{h.line2}</span>
            <br />
            <span className="text-accent italic">{h.line3}</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base lg:text-lg text-muted-foreground max-w-lg mb-8 lg:mb-10 leading-relaxed">{h.subtext}</p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 text-base" asChild>
              <Link href="/auth/login">{h.cta}</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base border-border text-foreground hover:bg-card" asChild>
              <Link href="/auth/register">Criar Conta</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> Conta demo grátis
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> Sem comissões
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> Regulado
            </div>
          </div>
        </motion.div>

        {/* Right Content - Person with laptop */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-full"
        >
          {/* Mobile: imagem centrada reduzida */}
          <div className="lg:hidden flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-figure.png"
              alt="Elite trader"
              className="w-full max-w-[280px] sm:max-w-[380px] h-auto object-contain opacity-90"
            />
          </div>

          {/* Desktop: imagem grande com hover */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4 }}
            className="hidden lg:block relative w-full max-w-[44rem] mx-auto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-figure.png"
              alt="Elite trader"
              className="relative w-full h-auto object-contain scale-[1.15]"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
