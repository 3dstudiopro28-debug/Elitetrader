"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]         = useState("")

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      setError("Erro ao autenticar com Google. Tenta novamente.")
      setGoogleLoading(false)
    }
    // Supabase redireciona automaticamente — não precisa de setGoogleLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      // ── Autenticar directamente pelo SDK (guarda sessão em localStorage + auto-refresh) ──
      const { data, error: sdkErr } = await supabase.auth.signInWithPassword({ email, password })

      if (sdkErr || !data.session) {
        setError("Email ou senha incorretos")
        setLoading(false)
        return
      }

      // ── Definir também o cookie httpOnly para API routes server-side (fire-and-forget) ──
      fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      }).catch(() => {})

      router.push("/trade/dashboard")
    } catch {
      setError("Erro de ligação. Tenta novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent/5 to-background">
        {/* Logo */}
        <div className="absolute top-8 left-8 z-10">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-accent font-bold text-3xl italic notranslate" translate="no">Elite</span>
            <span className="text-2xl font-bold text-foreground notranslate" translate="no">trader</span>
          </Link>
        </div>

        {/* Background decorative lines */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-30" viewBox="0 0 800 1000" fill="none">
            <path d="M-50 300 Q 100 200 250 280 T 500 250 T 750 300 T 900 280" stroke="url(#loginGrad1)" strokeWidth="2" fill="none" />
            <path d="M-50 400 Q 100 300 250 380 T 500 350 T 750 400 T 900 380" stroke="url(#loginGrad2)" strokeWidth="2" fill="none" />
            <path d="M-50 500 Q 100 400 250 480 T 500 450 T 750 500 T 900 480" stroke="url(#loginGrad3)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="loginGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f62fe" stopOpacity="0" />
                <stop offset="50%" stopColor="#0f62fe" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="loginGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3da9fc" stopOpacity="0" />
                <stop offset="50%" stopColor="#3da9fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3da9fc" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="loginGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7cc6ff" stopOpacity="0" />
                <stop offset="50%" stopColor="#7cc6ff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7cc6ff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Phone mockup */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80">
          <div className="relative bg-card rounded-t-[3rem] p-3 shadow-2xl border border-border border-b-0">
            <div className="bg-background rounded-t-[2.5rem] overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground">←</span>
                  <span className="text-sm font-medium">Portfolio Builder</span>
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">Done</span>
                </div>
                <div className="flex justify-between text-center mb-4">
                  <div>
                    <div className="text-accent font-bold">32.85%</div>
                    <div className="text-[10px] text-muted-foreground">1 Year</div>
                  </div>
                  <div>
                    <div className="text-foreground font-bold">2.26</div>
                    <div className="text-[10px] text-muted-foreground">Sharpe</div>
                  </div>
                  <div>
                    <div className="text-red-500 font-bold">-6.76%</div>
                    <div className="text-[10px] text-muted-foreground">Drawdown</div>
                  </div>
                </div>
                <div className="h-24 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-lg mb-4" />
                <div className="space-y-2">
                  {[
                    { symbol: "BTC", price: "36,873.02 $", change: "+0.64 %" },
                    { symbol: "DOGE", price: "0.314440 $", change: "-4.08 %" },
                    { symbol: "ADA", price: "1.47 $", change: "-3.78 %" },
                    { symbol: "ETH", price: "2,396.32 $", change: "-2.86 %" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-accent">{item.symbol[0]}</span>
                        </div>
                        <span className="font-medium text-foreground">{item.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-foreground">{item.price}</div>
                        <div className={item.change.startsWith('+') ? "text-accent" : "text-red-500"}>{item.change}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D decorative elements */}
        <div className="absolute bottom-32 left-16 w-20 h-20 opacity-60">
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl transform rotate-12 shadow-lg" 
               style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
        </div>
        <div className="absolute top-1/2 right-16 w-24 h-24 opacity-60">
          <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 rounded-full transform shadow-lg"
               style={{ background: "conic-gradient(from 0deg, #374151, #6b7280, #9ca3af, #6b7280, #374151)" }} />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 py-8 sm:py-10">
        <div className="w-full max-w-md">
          {/* Welcome text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bem-vindo de volta! 👋
            </h1>
          </div>

          {/* Tab selector */}
          <div className="flex mb-8 bg-card rounded-lg p-1 border border-border">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === "login"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <Link
              href="/auth/register"
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all text-center ${
                activeTab === "register"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar Conta
            </Link>
          </div>

          {/* Google login button */}
          <Button
            variant="outline"
            className="w-full mb-6 h-12 border-border hover:bg-card"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            type="button"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? "A redirecionar…" : "Entrar com o Google"}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">OU</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email<span className="text-accent">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-12 bg-card border-border focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha<span className="text-accent">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-12 bg-card border-border focus:border-accent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A entrar…</> : "Entrar"}
            </Button>
          </form>

          {/* Forgot password */}
          <div className="mt-6 text-center">
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
              Esqueceu a senha?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
