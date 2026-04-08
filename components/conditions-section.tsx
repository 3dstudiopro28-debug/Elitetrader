"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useT } from "@/lib/i18n"

const platforms = [
  "MetaTrader 5",
  "CopyTrading",
  "TradingView",
  "WebTrader",
  "iOS & Android Apps",
]

export function ConditionsSection() {
  const { t } = useT()
  const c = t.conditions

  return (
    <section className="py-12 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{c.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{c.subtitle}</p>
        </motion.div>

        {/* Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          {c.items.map((condition, index) => (
            <div key={index} className="text-center">
              <div className="text-lg text-muted-foreground">{condition.label}</div>
              {condition.value && (
                <div className="text-2xl font-bold text-foreground">{condition.value}</div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Platforms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {platforms.map((platform, index) => (
            <div
              key={index}
              className="px-6 py-3 bg-secondary rounded-full text-sm font-medium text-secondary-foreground"
            >
              {platform}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="/trade/dashboard">{c.cta}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
