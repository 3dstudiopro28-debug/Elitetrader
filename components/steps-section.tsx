"use client"

import { BookOpen, Target, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useT } from "@/lib/i18n"

export function StepsSection() {
  const { t } = useT()
  const s = t.steps

  return (
    <section className="py-12 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Steps */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {s.title} <br />
                <span className="text-accent">{s.titleAccent}</span>
              </h2>
            </motion.div>

            <div className="space-y-6">
              {s.items.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                >
                  <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {step.number}. {step.title}
                    </h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link href="/#learn">{s.items[0].btn}</Link>
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/trade/dashboard">{s.items[1].btn}</Link>
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/trade/dashboard">{s.items[2].btn}</Link>
              </Button>
            </motion.div>
          </div>

          {/* Right Side - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative hidden lg:block"
          >
            <div className="relative mx-auto w-80">
              {/* Phone frame */}
              <div className="relative bg-card rounded-[3rem] p-3 shadow-2xl border border-border">
                <div className="bg-background rounded-[2.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-card/50 px-6 py-2 flex justify-between items-center text-xs text-muted-foreground">
                    <span>9:41</span>
                    <div className="w-20 h-6 bg-foreground/10 rounded-full" />
                    <div className="flex gap-1">
                      <div className="w-4 h-2 bg-muted-foreground rounded-sm" />
                    </div>
                  </div>
                  
                  {/* App content */}
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-xs">←</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">Portfolio Builder</span>
                      <Button size="sm" className="h-6 text-xs bg-accent text-accent-foreground rounded-full px-3">
                        Done
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between text-center">
                      <div>
                        <div className="text-accent text-lg font-bold">32.85%</div>
                        <div className="text-xs text-muted-foreground">1 Year</div>
                      </div>
                      <div>
                        <div className="text-foreground text-lg font-bold">2.26</div>
                        <div className="text-xs text-muted-foreground">Sharpe</div>
                      </div>
                      <div>
                        <div className="text-red-500 text-lg font-bold">-6.76%</div>
                        <div className="text-xs text-muted-foreground">Drawdown</div>
                      </div>
                    </div>

                    {/* Chart placeholder */}
                    <div className="h-32 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-lg relative overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 200 80" fill="none">
                        <path 
                          d="M0 60 Q 20 50 40 55 T 80 40 T 120 30 T 160 35 T 200 20" 
                          stroke="currentColor" 
                          className="text-accent"
                          strokeWidth="2" 
                          fill="none" 
                        />
                        <path 
                          d="M0 60 Q 20 50 40 55 T 80 40 T 120 30 T 160 35 T 200 20 L 200 80 L 0 80 Z" 
                          fill="url(#chartGradient)" 
                        />
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" className="text-accent" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="currentColor" className="text-accent" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* Crypto list */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">10 Instruments Picks</span>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">All Time</span>
                          <span className="text-accent font-medium">Monthly</span>
                        </div>
                      </div>
                      
                      {[
                        { symbol: "BTC", name: "Bitcoin", price: "36,873.02 $", change: "+0.64 %", color: "text-accent" },
                        { symbol: "DOGE", name: "Dogecoin", price: "0.314440 $", change: "-4.08 %", color: "text-red-500" },
                        { symbol: "ADA", name: "Cardano", price: "1.47 $", change: "-3.78 %", color: "text-red-500" },
                        { symbol: "ETH", name: "Ethereum", price: "2,396.32 $", change: "-2.86 %", color: "text-red-500" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-accent">{item.symbol[0]}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{item.symbol}</div>
                              <div className="text-xs text-muted-foreground">{item.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-foreground">{item.price}</div>
                            <div className={`text-xs ${item.color}`}>{item.change}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom nav */}
                  <div className="bg-card/50 px-6 py-3 flex justify-around border-t border-border/30">
                    {["🏠", "📊", "💬", "👤", "🔔"].map((icon, i) => (
                      <span key={i} className={`text-lg ${i === 0 ? "text-accent" : "opacity-50"}`}>{icon}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating action buttons */}
              <div className="absolute top-1/4 -left-4 bg-card border border-border rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                <span className="text-accent">📱</span>
                <span className="text-sm font-medium text-foreground">Aprenda</span>
              </div>
              
              <div className="absolute top-1/2 -right-4 bg-card border border-border rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                <span className="text-accent">📈</span>
                <span className="text-sm font-medium text-foreground">Simular</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
