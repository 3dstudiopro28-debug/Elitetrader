import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin — Elite Trade",
}

// Layout isolado — sem header de stats nem sidebar do dashboard
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
