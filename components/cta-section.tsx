"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useT } from "@/lib/i18n"

export function CTASection() {
  const { t } = useT()
  const c = t.cta

  return (
    <section className="py-12 lg:py-24 bg-accent/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{c.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">{c.subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 gap-2" asChild>
              <Link href="/trade/dashboard">
                {c.btn1}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/trade/dashboard">{c.btn2}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
