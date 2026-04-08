"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useT } from "@/lib/i18n"

const GRADIENTS = [
  "from-sky-500/10 to-cyan-500/10",
  "from-blue-500/10 to-cyan-500/10",
  "from-blue-500/10 to-sky-500/10",
]
const ICONS = ["🥇", "📈", "💱"]

export function MarketsSection() {
  const { t } = useT()
  const m = t.markets

  return (
    <section id="markets" className="py-12 lg:py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{m.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{m.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {m.items.map((market, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-gradient-to-br ${GRADIENTS[index]} bg-card p-8 rounded-xl border border-border hover:border-accent/50 transition-all duration-300 group`}
            >
              <div className="text-4xl mb-4">{ICONS[index]}</div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{market.title}</h3>
              <p className="text-muted-foreground mb-6">{market.desc}</p>
              <Link
                href="/trade/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors group-hover:gap-3"
              >
                {m.learnMore}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
