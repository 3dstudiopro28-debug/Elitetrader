"use client"

import { Star } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useT } from "@/lib/i18n"

export function TestimonialsSection() {
  const { t } = useT()
  const ts = t.testimonials

  return (
    <section className="py-12 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {ts.title} <span className="text-accent">{ts.titleAccent}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{ts.subtitle}</p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {ts.items.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-accent/30 transition-all duration-300"
            >
              <h4 className="font-bold text-foreground mb-3">{testimonial.title}</h4>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{testimonial.quote}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/30 to-accent/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">
                    {testimonial.name.split(" ").map((n: string) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8" asChild>
            <Link href="/trade/dashboard">{t.hero.cta}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
