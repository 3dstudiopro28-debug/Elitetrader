"use client"

import { Zap, Shield, Clock, Award } from "lucide-react"
import { motion } from "framer-motion"
import { useT } from "@/lib/i18n"

const ICONS = [Zap, Shield, Clock, Award]
const GRADIENTS = [
  "from-accent/20 to-accent/5",
  "from-purple-500/20 to-purple-500/5",
  "from-blue-500/20 to-blue-500/5",
  "from-teal-500/20 to-teal-500/5",
]

export function FeaturesSection() {
  const { t } = useT()
  const f = t.features

  return (
    <section id="features" className="py-12 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {f.title} <span className="text-accent notranslate" translate="no">Elite</span><span className="text-foreground notranslate" translate="no">trader</span>?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {f.items.map((item, index) => {
            const Icon = ICONS[index]
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative overflow-hidden bg-gradient-to-br ${GRADIENTS[index]} p-8 rounded-2xl border border-border/50 group hover:border-accent/30 transition-all duration-300`}
              >
                <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Icon className="w-24 h-24 text-foreground" strokeWidth={1} />
                </div>
                <div className="relative">
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

