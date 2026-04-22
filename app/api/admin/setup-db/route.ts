/**
 * GET /api/admin/setup-db
 * Mostra o SQL de reparação do banco de dados Supabase
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  const repairSQL = `
-- ════════════════════════════════════════════════════════════════
-- ELITE TRADE — Repair SQL  (corra UMA vez no Supabase SQL Editor)
-- URL: https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/sql/new
-- ════════════════════════════════════════════════════════════════

-- 1. Remover trigger/função existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Criar tabelas (se não existirem)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  country text DEFAULT '',
  city text DEFAULT '',
  address text DEFAULT '',
  postal_code text DEFAULT '',
  nationality text DEFAULT '',
  kyc_status text NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified','pending','verified')),
  profile_completion integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'demo' CHECK (mode IN ('demo','real')),
  balance numeric(18,2) NOT NULL DEFAULT 100000.00,
  leverage integer NOT NULL DEFAULT 200,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode)
);

CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_override numeric(18,2),
  margin_level_override numeric(10,2),
  equity_override numeric(18,2),
  force_close_positions boolean NOT NULL DEFAULT false,
  balance_adjustment numeric(18,2),
  note text DEFAULT '',
  updated_by text NOT NULL DEFAULT 'admin',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Criar função com tratamento de erros robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(NEW.raw_user_meta_data->>'given_name','')),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  COALESCE(NEW.raw_user_meta_data->>'family_name',''))
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.accounts (user_id, mode, balance)
  VALUES (NEW.id, 'demo', 100000.00)
  ON CONFLICT (user_id, mode) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ✅ Pronto! O registo de utilizadores vai funcionar agora.
`.trim()

  return NextResponse.json({
    success: true,
    instructions: "Execute o SQL abaixo no Supabase SQL Editor",
    url: "https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/sql/new",
    sql: repairSQL,
  })
}
