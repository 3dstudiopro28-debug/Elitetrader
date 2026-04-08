import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regulamentação | EliteTrader',
  description: 'EliteTrader é regulado pela FCA (Reino Unido), CySEC (Chipre) e ASIC (Austrália). Transparência e segurança para os seus fundos.',
}

export default function RegulationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
