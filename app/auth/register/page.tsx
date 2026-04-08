"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState(false)

  async function handleGoogleSignUp() {
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
  }

  const [firstName, setFirstName] = useState("")
  const [lastName,  setLastName]  = useState("")
  const [email,     setEmail]     = useState("")
  const [phone,     setPhone]     = useState("")
  const [password,  setPassword]  = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // ── 1. Criar conta via API route (usa admin.createUser com email_confirm:true) ──
      // NÃO usar supabase.auth.signUp() no cliente — cria utilizador não confirmado
      // e o login posterior falha com "Invalid login credentials" mesmo com senha correcta.
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, firstName, lastName, phone }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error ?? "Erro ao criar conta")
        setLoading(false)
        return
      }

      // ── 2. Fazer sign-in via SDK para inicializar sessão no localStorage ──
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

      if (signInErr || !signInData.session) {
        // Conta criada mas sessão falhou — redirecionar para login
        setSuccess(true)
        setTimeout(() => router.push("/auth/login"), 1500)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/trade/dashboard"), 1200)
    } catch {
      setError("Erro de ligação. Tenta novamente.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding (same as login) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute top-8 left-8 z-10">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-accent font-bold text-3xl italic notranslate" translate="no">Elite</span>
            <span className="text-2xl font-bold text-foreground notranslate" translate="no">trader</span>
          </Link>
        </div>
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-30" viewBox="0 0 800 1000" fill="none">
            <path d="M-50 300 Q 100 200 250 280 T 500 250 T 750 300 T 900 280" stroke="url(#regGrad1)" strokeWidth="2" fill="none" />
            <path d="M-50 400 Q 100 300 250 380 T 500 350 T 750 400 T 900 380" stroke="url(#regGrad2)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="regGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f62fe" stopOpacity="0" />
                <stop offset="50%" stopColor="#0f62fe" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="regGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3da9fc" stopOpacity="0" />
                <stop offset="50%" stopColor="#3da9fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3da9fc" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Criar Conta 🚀
            </h1>
            <p className="text-muted-foreground">
              Comece a sua jornada com a <span className="text-accent notranslate" translate="no">Elite</span><span className="text-foreground notranslate" translate="no">trader</span>
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full mb-6 h-12 border-border hover:bg-card"
            onClick={handleGoogleSignUp}
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
            {googleLoading ? "A redirecionar…" : "Registar com o Google"}
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">OU</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome<span className="text-accent">*</span></Label>
                <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required className="h-12 bg-card border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apelido<span className="text-accent">*</span></Label>
                <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required className="h-12 bg-card border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email<span className="text-accent">*</span></Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 bg-card border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 bg-card border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha<span className="text-accent">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 bg-card border-border pr-10"
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
            {success && (
              <p className="text-sm text-green-400 text-center bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Conta criada! A redirecionar…
              </p>
            )}

            <Button type="submit" disabled={loading || success} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A criar conta…</> : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/auth/login" className="text-accent hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
