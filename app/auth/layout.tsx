import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acesso | EliteTrader',
  description: 'Inicie sessão ou crie a sua conta EliteTrader para aceder ao painel de trading.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
