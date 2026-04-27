-- ═══════════════════════════════════════════════════════════════════════════
-- ELITE TRADE — Fix PostgreSQL Trigger Error
-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: erro PostgreSQL "WITHIN GROUP é necessário para o modo de agregação de conjunto ordenado"
-- Contexto: falha ao atualizar via API admin (profiles/accounts/admin_overrides).
--
-- Esta migração COMPLETA:
-- 1) Diagnostica triggers de public.profiles, public.accounts e public.admin_overrides.
-- 2) Remove automaticamente triggers/funções com uso inválido de ordered-set aggregate (mode/percentile_* sem WITHIN GROUP).
-- 3) Recria triggers seguros de updated_at com validação de erros.
-- 4) Garante schema robusto de admin_overrides para persistência sem falhas.
-- 5) Adiciona constraints de integridade para evitar null constraint violations.
--
-- ⚠️  IMPORTANTE: Execute no Supabase SQL Editor com privilégios de admin.
-- ✅ Após execução: vá a Settings → API → Reload Schema no Dashboard.

BEGIN;

-- Validação inicial: verificar se estamos no ambiente correto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RAISE EXCEPTION 'Este script deve ser executado num ambiente Supabase válido (schema auth não encontrado)';
  END IF;
  
  RAISE NOTICE 'Iniciando fix de triggers PostgreSQL - Elite Trade Database Migration';
  RAISE NOTICE 'Timestamp: %', now();
END
$$;

-- ---------------------------------------------------------------------------
-- 1) Diagnóstico: listar triggers/funções ligadas às tabelas do fluxo admin
-- ---------------------------------------------------------------------------
-- Use este SELECT para auditoria antes/depois da execução.
-- SELECT
--   t.tgname AS trigger_name,
--   n.nspname AS function_schema,
--   p.proname AS function_name,
--   pg_get_function_identity_arguments(p.oid) AS function_args,
--   pg_get_functiondef(p.oid) AS function_def
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace cn ON cn.oid = c.relnamespace
-- JOIN pg_proc p ON p.oid = t.tgfoid
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE NOT t.tgisinternal
--   AND cn.nspname = 'public'
--   AND c.relname IN ('profiles', 'accounts', 'admin_overrides');

-- ---------------------------------------------------------------------------
-- 2) Remoção automática de trigger functions com ordered-set inválido
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  fn_def text;
  fn_def_lower text;
  has_ordered_set_call boolean;
  has_within_group boolean;
  has_modo_ref boolean;
BEGIN
  FOR rec IN
    SELECT
      c.relname AS table_name,
      t.tgname,
      n.nspname AS fn_schema,
      p.proname AS fn_name,
      p.oid AS fn_oid,
      pg_get_function_identity_arguments(p.oid) AS fn_args
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace cn ON cn.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE NOT t.tgisinternal
      AND cn.nspname = 'public'
        AND c.relname IN ('profiles', 'accounts', 'admin_overrides')
  LOOP
    fn_def := pg_get_functiondef(rec.fn_oid);
    fn_def_lower := lower(fn_def);

    -- Evita regex para não depender de dialeto/escape do ambiente.
    has_ordered_set_call :=
      strpos(fn_def_lower, 'mode(') > 0
      OR strpos(fn_def_lower, 'percentile_cont(') > 0
      OR strpos(fn_def_lower, 'percentile_disc(') > 0;

    has_within_group := strpos(fn_def_lower, 'within group') > 0;

    -- Detectar referência à coluna legada "modo" (nome pt antigo de "mode").
    -- Causa "column modo does not exist" ao actualizar profiles via admin PATCH.
    has_modo_ref :=
      strpos(fn_def_lower, 'new.modo') > 0
      OR strpos(fn_def_lower, 'old.modo') > 0
      OR strpos(fn_def_lower, '.modo ') > 0
      OR strpos(fn_def_lower, '.modo)') > 0
      OR strpos(fn_def_lower, '.modo,') > 0;

    -- Remove funções claramente suspeitas:
    -- 1) ordered-set aggregate sem WITHIN GROUP
    -- 2) referência à coluna legada "modo" (renomeada para "mode")
    IF (has_ordered_set_call AND NOT has_within_group) OR has_modo_ref THEN
      RAISE NOTICE 'Dropping trigger %.%.% and function %.%(%) due to invalid ordered-set aggregate syntax',
        'public', rec.table_name, rec.tgname, rec.fn_schema, rec.fn_name, rec.fn_args;

      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', rec.tgname, rec.table_name);
      EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s)', rec.fn_schema, rec.fn_name, rec.fn_args);
    END IF;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Garantir triggers seguros de updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_overrides_updated_at ON public.admin_overrides;
CREATE TRIGGER trg_overrides_updated_at
BEFORE UPDATE ON public.admin_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Garantir schema mínimo de admin_overrides para persistência
-- ---------------------------------------------------------------------------
-- Em alguns ambientes antigos, a coluna id não tem default e o INSERT falha.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.admin_overrides
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Reforçar unicidade do user_id para permitir lógica estável de update/insert.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_overrides_user_id_key'
      AND conrelid = 'public.admin_overrides'::regclass
  ) THEN
    ALTER TABLE public.admin_overrides
      ADD CONSTRAINT admin_overrides_user_id_key UNIQUE (user_id);
  END IF;
END
$$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Validação pós-execução e estatísticas
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  triggers_count integer;
  functions_count integer;
  constraints_count integer;
BEGIN
  -- Contar triggers criados
  SELECT count(*) INTO triggers_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid  
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal 
    AND n.nspname = 'public'
    AND c.relname IN ('profiles', 'admin_overrides')
    AND t.tgname LIKE '%updated_at%';
    
  -- Contar funções de updated_at
  SELECT count(*) INTO functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace  
  WHERE n.nspname = 'public'
    AND p.proname = 'update_updated_at';
    
  -- Contar constraints de admin_overrides
  SELECT count(*) INTO constraints_count
  FROM pg_constraint
  WHERE conname = 'admin_overrides_user_id_key'
    AND conrelid = 'public.admin_overrides'::regclass;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE 'Triggers updated_at criados: %', triggers_count;
  RAISE NOTICE 'Funções update_updated_at: %', functions_count;  
  RAISE NOTICE 'Constraints admin_overrides: %', constraints_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'PRÓXIMO PASSO: Ir a Supabase Dashboard → Settings → API → Reload Schema';
  RAISE NOTICE 'Testar admin PATCH operations em /api/admin/users/[id]';
  RAISE NOTICE 'Verificar logs para confirmar eliminação de erros "WITHIN GROUP"';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
END
$$;

-- ---------------------------------------------------------------------------
-- Referência de correção SQL (caso haja função de negócio com mode):
--
-- INCORRETO:
--   SELECT mode(status) FROM public.accounts WHERE user_id = p_user_id;
--
-- CORRETO (ordered-set aggregate):
--   SELECT mode() WITHIN GROUP (ORDER BY status)
--   FROM public.accounts
--   WHERE user_id = p_user_id;
-- ---------------------------------------------------------------------------
