import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre Nós | EliteTrader',
  description: 'Conheça a EliteTrader — a plataforma de trading profissional regulada pela FCA, CySEC e ASIC. Missão, visão e valores.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
