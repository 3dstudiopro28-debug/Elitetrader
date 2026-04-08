import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | EliteTrader',
  description: 'Aceda ao seu painel de trading EliteTrader — cotações em tempo real, posições abertas e histórico de operações.',
  robots: { index: false, follow: false },
}

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
