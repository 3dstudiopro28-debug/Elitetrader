-- ═══════════════════════════════════════════════════════════════════════════
-- ELITE TRADE — Repair SQL (corra UMA vez no Supabase SQL Editor)
-- URL: https://supabase.com/dashboard/project/rekcdczbitcxaxcncrxi/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Remover trigger e função antigos (se existirem)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recriar tabelas que possam estar em falta
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text NOT NULL UNIQUE,
  first_name        text NOT NULL DEFAULT '',
  last_name         text NOT NULL DEFAULT '',
  phone             text DEFAULT '',
  country           text DEFAULT '',
  city              text DEFAULT '',
  address           text DEFAULT '',
  postal_code       text DEFAULT '',
  nationality       text DEFAULT '',
  kyc_status        text NOT NULL DEFAULT 'unverified'
                    CHECK (kyc_status IN ('unverified','pending','verified')),
  profile_completion integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode       text NOT NULL DEFAULT 'demo' CHECK (mode IN ('demo','real')),
  balance    numeric(18,2) NOT NULL DEFAULT 100000.00,
  leverage   integer NOT NULL DEFAULT 200,
  currency   text NOT NULL DEFAULT 'USD',
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode)
);

CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_override      numeric(18,2),
  margin_level_override numeric(10,2),
  equity_override       numeric(18,2),
  force_close_positions boolean NOT NULL DEFAULT false,
  balance_adjustment    numeric(18,2),
  note                  text DEFAULT '',
  updated_by            text NOT NULL DEFAULT 'admin',
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.positions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  symbol      text NOT NULL,
  asset_name  text DEFAULT '',
  type        text NOT NULL CHECK (type IN ('buy','sell')),
  lots        numeric(10,2) NOT NULL,
  amount      numeric(18,2) NOT NULL,
  leverage    integer NOT NULL DEFAULT 200,
  open_price  numeric(18,6) NOT NULL,
  close_price numeric(18,6),
  stop_loss   numeric(18,6),
  take_profit numeric(18,6),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','closed')),
  pnl         numeric(18,2),
  opened_at   timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz,
  close_reason text
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('deposit','withdrawal','adjustment')),
  amount     numeric(18,2) NOT NULL,
  method     text DEFAULT '',
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note       text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Métodos de pagamento guardados (sem CVV — conformidade PCI DSS)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'card',
  card_holder text NOT NULL DEFAULT '',
  card_last4  text NOT NULL DEFAULT '',
  card_brand  text NOT NULL DEFAULT '',
  card_exp    text NOT NULL DEFAULT '',  -- formato MM/YYYY
  country     text DEFAULT '',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pm_own" ON public.payment_methods;
CREATE POLICY "pm_own" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- 3. Criar função handle_new_user — compatível com qualquer schema
-- Usa EXECUTE (SQL dinâmico) para evitar erros de compilação por colunas em falta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text;
  v_last  text;
  v_name  text;
BEGIN
  v_first := COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(NEW.raw_user_meta_data->>'given_name', ''));
  v_last  := COALESCE(NEW.raw_user_meta_data->>'last_name',  COALESCE(NEW.raw_user_meta_data->>'family_name', ''));
  v_name  := NULLIF(TRIM(v_first || ' ' || v_last), '');

  -- Tentar inserir com first_name/last_name; fallback para coluna 'name'
  BEGIN
    EXECUTE 'INSERT INTO public.profiles (id, email, first_name, last_name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING'
      USING NEW.id, NEW.email, v_first, v_last;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'INSERT INTO public.profiles (id, email, name) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING'
        USING NEW.id, NEW.email, COALESCE(v_name, '');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- Tentar inserir conta com mode; fallback para schema sem mode (uma conta por utilizador)
  BEGIN
    EXECUTE 'INSERT INTO public.accounts (user_id, mode, balance) VALUES ($1,$2,$3) ON CONFLICT (user_id, mode) DO NOTHING'
      USING NEW.id, 'demo', 100000.00;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'INSERT INTO public.accounts (user_id, balance) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING'
        USING NEW.id, 100000.00;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Recriar trigger no auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Migrações seguras em profiles
-- Adicionar first_name/last_name (se o schema antigo só tiver 'name')
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name  text NOT NULL DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Migrar 'name' → first_name/last_name (apenas se first_name estiver vazio)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='name')
  THEN
    EXECUTE '
      UPDATE public.profiles
      SET
        first_name = COALESCE(NULLIF(split_part(COALESCE(name,''''),'' '',1),''''),''''),
        last_name  = COALESCE(NULLIF(trim(substring(COALESCE(name,'''') FROM length(split_part(COALESCE(name,''''),'' '',1))+2)),''''),'''')
      WHERE first_name = '''' AND name IS NOT NULL AND name != '''';
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Adicionar user_id a admin_overrides se não existir (crítico para RLS e API)
DO $$
BEGIN
  -- Adicionar coluna user_id (FK nullable para não quebrar dados existentes)
  ALTER TABLE public.admin_overrides
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  -- Tentar tornar UNIQUE
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_overrides_user_id_key'
      AND conrelid = 'public.admin_overrides'::regclass
  ) THEN
    ALTER TABLE public.admin_overrides ADD CONSTRAINT admin_overrides_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- 6. Adicionar colunas novas a admin_overrides (seguro se já existirem)
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS balance_override      numeric(18,2);
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS margin_level_override numeric(10,2);
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS equity_override       numeric(18,2);
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS force_close_positions boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS balance_adjustment    numeric(18,2);
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS active_mode text CHECK (active_mode IN ('demo','real'));
ALTER TABLE public.admin_overrides
  ADD COLUMN IF NOT EXISTS note text DEFAULT '';

-- 7. Adicionar colunas em falta em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'demo' CHECK (mode IN ('demo','real'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completion integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_day text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_month text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_year text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nif text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+55';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pep boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_us_resident boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_type text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number text DEFAULT '';

-- 6. RLS: utilizadores podem ler os próprios overrides (seguro se user_id existir)
ALTER TABLE public.admin_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overrides_read_own" ON public.admin_overrides;
DO $$
BEGIN
  -- Criar policy apenas se user_id existir na tabela
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_overrides' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE POLICY "overrides_read_own" ON public.admin_overrides FOR SELECT USING (auth.uid() = user_id)';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ✅ Concluído! Registo funciona, Google OAuth funciona, admin overrides actualizados.

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES — colunas extra para informações pessoais completas
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_day   text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_month text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_year  text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nif       text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+55';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pep          boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_us_resident  boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_type   text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number text DEFAULT '';

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES — RLS: utilizadores podem ler e actualizar o próprio perfil
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME — activar publicação (seguro: não falha se já existir)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- admin_overrides
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_overrides;
  END IF;

  -- accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  END IF;
END;
$$;

-- ✅ Após correr este bloco, o dashboard dos clientes reflecte qualquer
--    alteração do admin em tempo real (< 1 segundo) via Supabase Realtime.

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES — colunas para estatísticas de posições (sync do cliente)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_positions   integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS closed_positions integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_pnl        numeric(18,2) NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES — coluna para força mudança de senha (reset pelo admin)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false;

-- RELOAD SCHEMA CACHE — obrigatório após adicionar colunas
NOTIFY pgrst, 'reload schema';
