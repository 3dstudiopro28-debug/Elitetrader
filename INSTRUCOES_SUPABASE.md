# 🔍 INSTRUÇÕES PARA DIAGNOSTICAR E CORRIGIR NO SUPABASE

## ✅ CORREÇÕES APLICADAS NO CÓDIGO

1. ✅ **[lib/trade-store.ts](lib/trade-store.ts)** - Logs detalhados adicionados
2. ✅ **[lib/diagnostico-posicoes.sql](lib/diagnostico-posicoes.sql)** - Script SQL criado
3. ✅ **Push realizado** para branch `desenvolvimento`

---

## 🚀 PASSO A PASSO NO SUPABASE

### **Passo 1: Abrir Supabase Dashboard**

1. Aceder: https://supabase.com/dashboard
2. Selecionar o projeto Elite Trade
3. Ir para: **SQL Editor** (menu lateral esquerdo)

---

### **Passo 2: Executar Script de Diagnóstico**

1. No SQL Editor, clicar em **"New Query"**
2. Copiar TODO o conteúdo de: **`lib/diagnostico-posicoes.sql`**
3. Colar no editor
4. Clicar em **"Run"** (ou pressionar Ctrl+Enter)

---

### **Passo 3: Analisar Resultados**

O script executa em 4 partes:

#### **PARTE 1: DIAGNÓSTICO** 📊

Verifica:

- ✅ Estrutura da tabela `positions`
- ✅ Se RLS está ativo
- ✅ Políticas RLS existentes
- ✅ Constraints (FK, NOT NULL)
- ✅ Posições existentes no banco

**O QUE PROCURAR:**

- `account_id` → Se `is_nullable = NO` → **PROBLEMA** (vai causar erro)
- `rowsecurity` → Se `false` → RLS desativado
- Políticas → Se nenhuma política `INSERT` existe → **PROBLEMA**

---

#### **PARTE 2: CORREÇÕES** 🔧

Aplica correções automáticas:

- ✅ Torna `account_id` NULLABLE (opcional)
- ✅ Cria políticas RLS para INSERT, SELECT, UPDATE, DELETE
- ✅ Ativa RLS na tabela
- ✅ Cria índice de performance

**Mensagens Esperadas:**

```
✅ Coluna account_id agora permite NULL
✅ Política INSERT criada: positions_insert_own
✅ Política SELECT criada: positions_select_own
✅ Política UPDATE criada: positions_update_own
✅ Política DELETE criada: positions_delete_own
✅ RLS ativo na tabela positions
✅ Índice criado: idx_positions_user_status
```

---

#### **PARTE 3: VALIDAÇÃO** ✔️

Confirma que correções foram aplicadas:

- Lista todas as políticas RLS
- Lista todos os índices
- Mostra configuração de `account_id`

---

#### **PARTE 4: RESUMO FINAL** 🎯

Mostra estatísticas:

- Total de políticas RLS
- Total de índices
- RLS ativo (true/false)
- Total de posições no banco
- Posições abertas vs fechadas

---

## 🧪 PASSO 4: TESTAR A APLICAÇÃO

### **4.1: Recarregar o Site**

```bash
# No navegador, recarregar a página (Ctrl+R ou F5)
```

### **4.2: Abrir DevTools**

```bash
# Pressionar F12 para abrir DevTools
# Ir para aba "Console"
```

### **4.3: Abrir uma Posição**

1. No dashboard, clicar em qualquer ativo
2. Abrir uma posição (BUY ou SELL)
3. **OBSERVAR OS LOGS NO CONSOLE:**

#### **✅ SUCESSO (esperado):**

```javascript
🔄 [tradeStore] Tentativa 1/3 - Enviando para API: {id: "abc-123", symbol: "EURUSD", ...}
📥 [tradeStore] Resposta da API: {success: true, dbSaved: true, ...}
✅ [tradeStore] Posição CONFIRMADA no Supabase: abc-123
```

#### **❌ FALHA (se persistir problema):**

```javascript
🔄 [tradeStore] Tentativa 1/3 - Enviando para API: {id: "abc-123", ...}
📥 [tradeStore] Resposta da API: {dbSaved: false, dbError: "mensagem do erro"}
❌ [tradeStore] FALHA no Supabase: {id: "abc-123", dbError: "..."}
⚠️ [tradeStore] Tentativa 2/3 falhou: ...
```

---

### **4.4: Fazer Logout e Login**

1. Clicar em **Logout**
2. Fazer **Login** novamente
3. **OBSERVAR OS LOGS:**

#### **✅ SUCESSO (esperado):**

```javascript
🔄 [SYNC] PASSO 1: Iniciando sincronização de posições abertas...
✅ [SYNC] PASSO 2: API respondeu com status 200
📊 [SYNC] PASSO 3: Dados recebidos da API: {count: 1, positions: [...]}
✅ [SYNC] PASSO 4: 1 posições carregadas com sucesso
```

#### **❌ FALHA (se persistir):**

```javascript
🔄 [SYNC] PASSO 1: Iniciando sincronização...
✅ [SYNC] PASSO 2: API respondeu com status 200
📊 [SYNC] PASSO 3: Dados recebidos da API: {count: 0, positions: []}
✅ [SYNC] PASSO 4: 0 posições carregadas com sucesso  ← PROBLEMA!
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Após executar no Supabase, confirme:

- [ ] Script SQL executado sem erros
- [ ] Mensagem: "✅ Coluna account_id agora permite NULL"
- [ ] Mensagem: "✅ Política INSERT criada"
- [ ] Mensagem: "✅ RLS ativo na tabela positions"
- [ ] Resumo final mostra: `rls_enabled: true`
- [ ] Resumo final mostra: `total_policies: 4` (ou mais)

---

## 🆘 SE O PROBLEMA PERSISTIR

### **Cenário 1: dbError aparece nos logs**

Copiar a mensagem de erro completa e enviar:

```javascript
// Exemplo:
dbError: "null value in column 'account_id' violates not-null constraint";
```

### **Cenário 2: Ainda retorna 0 posições**

Executar no Supabase SQL Editor:

```sql
-- Verificar se posições foram realmente inseridas
SELECT id, user_id, symbol, type, status, opened_at
FROM positions
ORDER BY opened_at DESC
LIMIT 10;

-- Verificar user_id do utilizador logado
SELECT id, email FROM profiles LIMIT 5;
```

### **Cenário 3: Erro de autenticação**

Verificar no console:

```javascript
❌ API GET /api/positions: Token não encontrado
```

**Solução:** Fazer logout completo e login novamente.

---

## 📊 LOGS ESPERADOS (COMPLETO)

### **1. Ao Abrir Posição:**

```
[tradeStore] 🔄 Tentativa 1/3 - Enviando para API: {id: "...", symbol: "EURUSD", amount: 1000, type: "buy", mode: "demo"}
[tradeStore] 📥 Resposta da API: {success: true, dbSaved: true, data: {...}}
[tradeStore] ✅ Posição CONFIRMADA no Supabase: ...
```

### **2. Ao Fazer Login:**

```
🔄 [SYNC] PASSO 1: Iniciando sincronização de posições abertas...
✅ [SYNC] PASSO 2: API respondeu com status 200
📊 [SYNC] PASSO 3: Dados recebidos da API: {count: 1, hasData: true, positions: [{id: "...", symbol: "EURUSD", ...}]}
✅ [SYNC] PASSO 4: 1 posições carregadas com sucesso
```

### **3. Na API (Terminal/Logs Vercel):**

```
API GET /api/positions: Pedido recebido.
API GET /api/positions: Token encontrado, a validar utilizador...
API GET /api/positions: A procurar posições para o user_id: abc-123
API GET /api/positions: A aplicar filtro status = 'open'
API GET /api/positions: A consulta retornou 1 linhas.
API GET /api/positions: Dados retornados: [{id: "...", ...}]
```

---

## ✅ PRÓXIMOS PASSOS

1. **Executar o script SQL no Supabase**
2. **Testar a aplicação** conforme Passo 4
3. **Copiar e enviar os logs do console** (se houver erros)
4. **Verificar a tabela `positions`** no Supabase (Table Editor)

---

**Arquivo criado:** `INSTRUCOES_SUPABASE.md`
**Script SQL:** `lib/diagnostico-posicoes.sql`
**Código atualizado:** `lib/trade-store.ts`
