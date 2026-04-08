-- ═══════════════════════════════════════════════════════════════════════════
-- Elite Trade — Supabase SQL Schema
-- Correr no SQL Editor: https://supabase.com/dashboard/project/SEU_PROJETO/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. profiles ─────────────────────────────────────────────────────────────
-- Estende a tabela auth.users do Supabase
CREATE TABLE IF NOT EXISTS profiles (
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
                    CHECK (kyc_status IN ('unverified', 'pending', 'verified')),
  profile_completion integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. accounts ─────────────────────────────────────────────────────────────
-- Cada utilizador tem uma conta demo e/ou real
CREATE TABLE IF NOT EXISTS accounts (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode       text NOT NULL DEFAULT 'demo'
             CHECK (mode IN ('demo', 'real')),
  balance    numeric(18,2) NOT NULL DEFAULT 100000.00,
  leverage   integer NOT NULL DEFAULT 200,
  currency   text NOT NULL DEFAULT 'USD',
  status     text NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'suspended', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode)
);

-- ─── 3. admin_overrides ──────────────────────────────────────────────────────
-- O admin pode sobrescrever o que o cliente vê no ecrã, por utilizador
CREATE TABLE IF NOT EXISTS admin_overrides (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance_override      numeric(18,2),          -- NULL = sem override
  margin_level_override numeric(10,2),           -- NULL = calculado automático
  equity_override       numeric(18,2),           -- NULL = calculado automático
  force_close_positions boolean NOT NULL DEFAULT false,  -- flag: fechar posições abertas
  balance_adjustment    numeric(18,2),           -- diferença de saldo para distribuir como PnL
  active_mode           text CHECK (active_mode IN ('demo','real')), -- modo forçado pelo admin
  note                  text DEFAULT '',          -- nota interna do admin
  updated_by            text NOT NULL DEFAULT 'admin',
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. positions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol        text NOT NULL,
  asset_name    text DEFAULT '',
  type          text NOT NULL CHECK (type IN ('buy', 'sell')),
  lots          numeric(10,2) NOT NULL,
  amount        numeric(18,2) NOT NULL,
  leverage      integer NOT NULL DEFAULT 200,
  open_price    numeric(18,6) NOT NULL,
  close_price   numeric(18,6),
  spread        numeric(10,4) DEFAULT 0,
  stop_loss     numeric(18,6),
  take_profit   numeric(18,6),
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'pending', 'closed')),
  pnl           numeric(18,2),
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  close_reason  text         -- 'manual' | 'take_profit' | 'stop_loss' | 'liquidation'
);

-- ─── 5. transactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'adjustment')),
  amount     numeric(18,2) NOT NULL,
  method     text DEFAULT '',
  status     text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected')),
  note       text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- ─── 6. payment_methods ────────────────────────────────────────────────────
-- Cartões de pagamento guardados (sem CVV — conformidade PCI DSS)
CREATE TABLE IF NOT EXISTS payment_methods (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'card',
  card_holder text NOT NULL DEFAULT '',
  card_last4  text NOT NULL DEFAULT '',
  card_brand  text NOT NULL DEFAULT '',
  card_exp    text NOT NULL DEFAULT '',  -- formato MM/YYYY
  country     text DEFAULT '',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- ─── 6. admin_log ────────────────────────────────────────────────────────────
-- Registo de todas as ações do admin (auditoria)
CREATE TABLE IF NOT EXISTS admin_log (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  action     text NOT NULL,    -- 'balance_set' | 'status_change' | 'margin_override' etc
  target_user_id uuid REFERENCES profiles(id),
  payload    jsonb,
  performed_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 7. balance_adjustments ──────────────────────────────────────────────────
-- Registo imutável de todas as alterações de saldo feitas pelo admin
CREATE TABLE IF NOT EXISTS balance_adjustments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  previous_balance    numeric(18,2) NOT NULL,
  new_balance_input   numeric(18,2) NOT NULL,
  adjustment_amount   numeric(18,2) GENERATED ALWAYS AS (new_balance_input - previous_balance) STORED,
  open_positions      integer NOT NULL DEFAULT 0,
  reason              text DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adjustments_user ON balance_adjustments(user_id);

-- ─── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_positions_user     ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_status   ON positions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user  ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_target   ON admin_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user      ON accounts(user_id);

-- ─── Trigger: atualizar updated_at automaticamente ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_overrides_updated_at
  BEFORE UPDATE ON admin_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Trigger: criar profile + conta demo ao registar ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir profile
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(NEW.raw_user_meta_data->>'given_name', '')),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  COALESCE(NEW.raw_user_meta_data->>'family_name', ''))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar conta demo com $100,000 (mais realista)
  INSERT INTO accounts (user_id, mode, balance)
  VALUES (NEW.id, 'demo', 100000.00)
  ON CONFLICT (user_id, mode) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
-- Os utilizadores só veem os seus próprios dados
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_overrides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;

-- profiles: cada um vê o seu
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- accounts: cada um vê as suas
CREATE POLICY "accounts_own" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- positions: cada um vê as suas
CREATE POLICY "positions_own" ON positions
  FOR ALL USING (auth.uid() = user_id);

-- transactions: cada um vê as suas
CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- admin_overrides: utilizadores só leem (admin escreve via service_role)
CREATE POLICY "overrides_read_own" ON admin_overrides
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Nota: O admin usa o service_role key (ignora RLS) ───────────────────────
-- Nunca expor o service_role key no cliente (browser). Usar apenas em API routes.

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO RPC: perform_balance_adjustment
-- Correr no SQL Editor do Supabase ANTES de usar o painel admin.
--
-- O que faz (numa única transacção atómica):
--   1. Actualiza o saldo da conta real do utilizador (+= p_adjustment)
--   2. Insere N operações fantasma já fechadas com os P/L recebidos do Next.js
--
-- Chamar via: supabase.rpc('perform_balance_adjustment', { p_user_id, p_adjustment, p_pnl_values })
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION perform_balance_adjustment(
  p_user_id    UUID,
  p_adjustment NUMERIC,
  p_pnl_values NUMERIC[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_pnl        NUMERIC;
  v_open       NUMERIC;
  v_close      NUMERIC;
  v_lots       NUMERIC;
  v_idx        INT := 1;
  -- Símbolos e preços de abertura de referência (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD)
  v_symbols    TEXT[]    := ARRAY['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  v_ref_opens  NUMERIC[] := ARRAY[1.0850,   1.2650,   149.50,   0.6450,   1.3600];
BEGIN
  -- 1. Obter o ID da conta real do utilizador
  SELECT id INTO v_account_id
  FROM   accounts
  WHERE  user_id = p_user_id
    AND  mode    = 'real'
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Conta real não encontrada para o utilizador %', p_user_id;
  END IF;

  -- 2. Actualizar o saldo (soma o delta ao saldo actual)
  UPDATE accounts
  SET    balance = balance + p_adjustment
  WHERE  id = v_account_id;

  -- 3. Inserir as operações fantasma já fechadas
  FOREACH v_pnl IN ARRAY p_pnl_values
  LOOP
    -- Preço base com variação aleatória pequena
    v_open := v_ref_opens[((v_idx - 1) % 5) + 1]
              + (random() * 0.006 - 0.003);
    v_lots := ROUND((0.01 + random() * 0.09)::NUMERIC, 2);

    -- Para 'buy': pnl = (close - open) * lots * 100000
    --   → close = open + pnl / (lots * 100000)
    v_close := v_open + v_pnl / (v_lots * 100000.0);

    INSERT INTO positions (
      user_id,    account_id,  symbol,
      asset_name, type,        lots,
      amount,     leverage,    open_price,
      close_price, spread,     status,
      pnl,        opened_at,   closed_at,
      close_reason
    )
    VALUES (
      p_user_id,
      v_account_id,
      v_symbols[((v_idx - 1) % 5) + 1],
      v_symbols[((v_idx - 1) % 5) + 1],
      'buy',
      v_lots,
      ROUND(GREATEST(50, ABS(v_pnl) * 8)::NUMERIC, 2),  -- amount proporcional ao P/L
      200,
      ROUND(v_open::NUMERIC,  5),
      ROUND(v_close::NUMERIC, 5),
      0.00020,
      'closed',
      ROUND(v_pnl::NUMERIC, 2),
      NOW() - ((1 + random() * 23) * INTERVAL '1 hour'),   -- aberta nas últimas 24h
      NOW() - ((1 + random() * 59) * INTERVAL '1 minute'), -- fechada nos últimos 60min
      'adjustment'
    );

    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

-- Garantir que Realtime está activo para a tabela positions
-- (Verificar em Supabase Dashboard → Database → Replication → supabase_realtime)
-- ALTER PUBLICATION supabase_realtime ADD TABLE positions;

