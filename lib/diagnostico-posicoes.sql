-- ═══════════════════════════════════════════════════════════════════════════
-- ELITE TRADE — Diagnóstico e Correção de Persistência de Posições
-- Execute este script no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PARTE 1: DIAGNÓSTICO ────────────────────────────────────────────────────

-- 1.1 Verificar estrutura da tabela positions
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'positions'
ORDER BY ordinal_position;

-- 1.2 Verificar se RLS está ativo
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'positions';

-- 1.3 Verificar políticas RLS existentes
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd AS command,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE tablename = 'positions'
ORDER BY policyname;

-- 1.4 Verificar constraints (FK, NOT NULL, etc)
SELECT
  conname AS constraint_name,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE contype::text
  END AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'positions'::regclass
ORDER BY contype, conname;

-- 1.5 Contar posições existentes por status sem falhar se a coluna ainda não existir
DO $$
DECLARE
  row_item record;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'positions'
      AND column_name = 'status'
  ) THEN
    FOR row_item IN EXECUTE
      'SELECT status, COUNT(*) AS total FROM positions GROUP BY status ORDER BY status'
    LOOP
      RAISE NOTICE 'status=% total=%', row_item.status, row_item.total;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️ Coluna status ausente antes do hardening; contagem por status ignorada.';
  END IF;
END $$;

-- 1.6 Verificar últimas 5 posições criadas sem assumir colunas específicas
SELECT to_jsonb(p) AS row_data
FROM positions AS p
LIMIT 5;


-- ─── PARTE 2: CORREÇÕES ──────────────────────────────────────────────────────

-- 2.1 Garantir colunas mínimas esperadas pela aplicação
DO $$ 
BEGIN
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS account_id uuid;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS mode text DEFAULT 'real';
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS symbol text;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS asset_name text DEFAULT '';
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS type text;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS lots numeric(10,2);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS amount numeric(18,2);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS leverage integer DEFAULT 200;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS open_price numeric(18,6);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS close_price numeric(18,6);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS spread numeric(10,4) DEFAULT 0;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS stop_loss numeric(18,6);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS take_profit numeric(18,6);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS pnl numeric(18,2);
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS opened_at timestamptz DEFAULT now();
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS closed_at timestamptz;
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS close_reason text;

  UPDATE positions
  SET mode = 'real'
  WHERE mode IS NULL;

  ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_mode_check;
  ALTER TABLE positions
    ADD CONSTRAINT positions_mode_check
    CHECK (mode = ANY (ARRAY['demo'::text, 'real'::text]));

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'positions' 
      AND column_name = 'account_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE positions ALTER COLUMN account_id DROP NOT NULL;
    RAISE NOTICE '✅ Coluna account_id agora permite NULL';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna account_id já permite NULL';
  END IF;
END $$;


-- 2.2 Criar/Atualizar políticas RLS
-- Permite que usuários autenticados gerenciem suas próprias posições
DO $$ 
BEGIN
  -- DROP políticas existentes
  DROP POLICY IF EXISTS "positions_insert_own" ON positions;
  DROP POLICY IF EXISTS "positions_select_own" ON positions;
  DROP POLICY IF EXISTS "positions_update_own" ON positions;
  DROP POLICY IF EXISTS "positions_delete_own" ON positions;

  -- Criar política INSERT
  CREATE POLICY "positions_insert_own" ON positions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE '✅ Política INSERT criada: positions_insert_own';

  -- Criar política SELECT
  CREATE POLICY "positions_select_own" ON positions
    FOR SELECT 
    USING (auth.uid() = user_id);
  RAISE NOTICE '✅ Política SELECT criada: positions_select_own';

  -- Criar política UPDATE
  CREATE POLICY "positions_update_own" ON positions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE '✅ Política UPDATE criada: positions_update_own';

  -- Criar política DELETE
  CREATE POLICY "positions_delete_own" ON positions
    FOR DELETE 
    USING (auth.uid() = user_id);
  RAISE NOTICE '✅ Política DELETE criada: positions_delete_own';

  -- Garantir que RLS está ATIVO
  ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLS ativo na tabela positions';
END $$;


-- 2.3 Adicionar índice para performance (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'positions' 
      AND indexname = 'idx_positions_user_status'
  ) THEN
    CREATE INDEX idx_positions_user_status 
      ON positions(user_id, status);
    RAISE NOTICE '✅ Índice criado: idx_positions_user_status';
  ELSE
    RAISE NOTICE 'ℹ️ Índice idx_positions_user_status já existe';
  END IF;
END $$;


-- ─── PARTE 3: VALIDAÇÃO PÓS-CORREÇÃO ─────────────────────────────────────────

-- 3.1 Verificar políticas RLS após correções
SELECT 
  '✅ Políticas RLS configuradas:' as status,
  policyname,
  cmd AS command
FROM pg_policies
WHERE tablename = 'positions'
ORDER BY cmd, policyname;

-- 3.2 Verificar índices criados
SELECT
  '✅ Índices disponíveis:' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'positions'
ORDER BY indexname;

-- 3.3 Verificar coluna account_id
SELECT
  '✅ Configuração de account_id:' as status,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'positions' 
  AND column_name = 'account_id';


-- ─── PARTE 4: TESTE DE INSERÇÃO (OPCIONAL) ───────────────────────────────────
-- Descomente para testar inserção manual (substitua o user_id real)

/*
DO $$
DECLARE
  test_user_id uuid;
  test_position_id uuid;
BEGIN
  -- Obter primeiro user_id da tabela profiles
  SELECT id INTO test_user_id 
  FROM profiles 
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado na tabela profiles';
  END IF;

  -- Tentar inserir posição de teste
  INSERT INTO positions (
    id,
    user_id,
    symbol,
    type,
    lots,
    amount,
    leverage,
    open_price,
    status,
    opened_at
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    'EURUSD',
    'buy',
    1.0,
    1000.00,
    200,
    1.0950,
    'open',
    NOW()
  )
  RETURNING id INTO test_position_id;

  RAISE NOTICE '✅ Posição de teste inserida com sucesso: %', test_position_id;

  -- Deletar posição de teste
  DELETE FROM positions WHERE id = test_position_id;
  RAISE NOTICE '✅ Posição de teste removida';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erro ao testar inserção: %', SQLERRM;
END $$;
*/


-- ─── RESUMO FINAL ─────────────────────────────────────────────────────────────

SELECT 
  '🎯 DIAGNÓSTICO COMPLETO' as title,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'positions') as total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'positions') as total_indexes,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'positions') as rls_enabled,
  (SELECT COUNT(*) FROM positions) as total_positions,
  (SELECT COUNT(*) FROM positions WHERE status = 'open') as open_positions,
  (SELECT COUNT(*) FROM positions WHERE status = 'closed') as closed_positions;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Revise os resultados da PARTE 1 (diagnóstico)
-- 3. Execute a PARTE 2 (correções) se necessário
-- 4. Valide com PARTE 3 (validação)
-- 5. Teste a aplicação web
-- ═══════════════════════════════════════════════════════════════════════════
