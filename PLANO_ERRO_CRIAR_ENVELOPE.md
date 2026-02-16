# Plano: Identificação da causa e solução do erro ao criar envelope

**Contexto confirmado:** A tabela de tipos no banco é **envelope_types** (plural) e já existem tipos de envelope cadastrados corretamente. O código também usa `envelope_types`; portanto a lista de tipos carrega e o usuário consegue escolher um tipo ao criar o envelope. O erro ocorre no momento de salvar (insert em `envelopes`).

---

## 1. Sintoma

Ao criar um novo envelope (código, nome, tipo preenchidos) e clicar em Salvar, a aplicação retorna erro. A mensagem pode ser genérica ou uma das mapeadas (ex.: “Tipo de envelope inválido…”). O problema persiste.

---

## 2. Fluxo relevante (com tabela envelope_types correta)

1. **EnvelopeBoard** carrega tipos → `envelopeTypeService.getAll()` → `from('envelope_types')` → tipos retornam e o select é preenchido.
2. Usuário preenche código, nome e seleciona um tipo (ID válido de `envelope_types`).
3. Submit → `envelopeService.create({ code, name, envelope_type_id: envTypeId })` → Supabase: `insert` em **envelopes** com `user_id`, `code`, `name`, `amount`, **envelope_type_id** (UUID vindo da lista).
4. O insert falha; o usuário vê o erro no toast.

---

## 3. Causa raiz provável: FK apontando para a tabela errada

A **migration 003** (quando usada para criar a coluna e a FK) define:

- `envelopes.envelope_type_id uuid REFERENCES public.envelope_type(id)`

Ou seja, a **foreign key** da coluna `envelope_type_id` referencia a tabela **envelope_type** (singular), não **envelope_types** (plural).

Se no banco:

- a tabela que existe e tem dados é **envelope_types**, e  
- a coluna `envelope_type_id` foi criada com FK para **envelope_type** (por exemplo pela 003 ou por outra migration que usa esse nome),

então:

- O app envia um UUID que existe em **envelope_types**.
- O Postgres valida a FK em **envelope_type(id)**.
- Se **envelope_type** não existir, ou existir mas com outros IDs (ou vazia), o valor não é encontrado → **erro 23503** (foreign key violation). A mensagem amigável tende a ser algo como “Tipo de envelope inválido…”.

**Conclusão:** Com tabela real = `envelope_types` e tipos já cadastrados, a causa mais provável do erro ao criar envelope é a **FK de `envelopes.envelope_type_id` ainda referenciar `envelope_type(id)` em vez de `envelope_types(id)`**.

---

## 4. Outras causas possíveis (a verificar)

| Causa | Como se manifesta | Como descartar |
|-------|-------------------|----------------|
| **RLS em `envelopes`** | Sem política de INSERT para o usuário → 42501 | No Supabase, ver políticas RLS da tabela `envelopes`; garantir INSERT com `auth.uid() = user_id`. |
| **Unique em (user_id, code)** | Código duplicado → 23505 | Ver constraints da tabela `envelopes`; mensagem já mapeada no app. |
| **Coluna NOT NULL ou tipo** | Valor nulo ou tipo errado → 23502 / 22P02 | Conferir definição da coluna `envelope_type_id` e payload do insert. |

---

## 5. Plano de diagnóstico (ordem sugerida)

1. **Supabase → Table Editor → tabela `envelopes`**  
   - Abrir a coluna **envelope_type_id**.  
   - Ver a definição da **foreign key**: qual tabela e coluna estão referenciadas?  
   - Se constar **envelope_type(id)** → confirma a hipótese: a FK aponta para a tabela errada (envelope_type em vez de envelope_types).

2. **Supabase → tabelas do schema `public`**  
   - Confirmar: existe **envelope_types** (com dados)? Existe **envelope_type** (e tem ou não registros)?  
   - Isso explica se os IDs usados pelo app (de envelope_types) podem ou não existir na tabela referenciada pela FK.

3. **Rede (Network) no navegador**  
   - Ao clicar em Salvar, inspecionar o **POST** para `rest/v1/envelopes`.  
   - Ver o **corpo da resposta** em caso de erro: anotar o **código** (ex.: 23503, 42501) e a **mensagem** do Postgres.  
   - 23503 reforça FK; 42501 reforça RLS.

4. **RLS em `envelopes`**  
   - No Supabase, em Authentication / Policies (ou Table Editor → RLS), ver se há política de **INSERT** em `envelopes` permitindo `auth.uid() = user_id`.  
   - Se não houver, o insert pode estar sendo bloqueado por RLS.

---

## 6. Plano de solução

### 6.1. Ajustar a FK de `envelopes.envelope_type_id` para `envelope_types(id)` (prioritário)

**Objetivo:** A coluna `envelope_type_id` deve referenciar a tabela onde os tipos estão de fato cadastrados: **envelope_types**.

**Passos sugeridos (no SQL Editor do Supabase):**

1. **Remover a constraint de FK atual** (nome exato pode variar; no Supabase costuma aparecer em Table Editor → coluna → Foreign Key, ou em `information_schema`):
   - Exemplo, se a constraint se chamar `envelopes_envelope_type_id_fkey`:
   ```sql
   ALTER TABLE public.envelopes
   DROP CONSTRAINT IF EXISTS envelopes_envelope_type_id_fkey;
   ```
   - Se o nome for outro, usar o nome exibido no painel ou consultar:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'public.envelopes'::regclass
   AND contype = 'f';
   ```

2. **Criar a nova FK apontando para envelope_types:**
   ```sql
   ALTER TABLE public.envelopes
   ADD CONSTRAINT envelopes_envelope_type_id_fkey
   FOREIGN KEY (envelope_type_id) REFERENCES public.envelope_types(id) ON DELETE RESTRICT;
   ```

3. **Garantir que não haja registros órfãos** (envelopes com `envelope_type_id` que não existem em `envelope_types`). Se houver, corrigir antes (atualizar para um id válido de `envelope_types` ou tratar à parte). Em seguida, testar novamente o criar envelope.

### 6.2. RLS na tabela `envelopes`

- Confirmar se existe política de **INSERT** em `envelopes` com condição `auth.uid() = user_id` (ou equivalente para o usuário logado).  
- Se não existir, criar a política para que o usuário autenticado possa inserir seus próprios envelopes.  
- Garantir também **SELECT** e **UPDATE**/ **DELETE** conforme as regras do app.

### 6.3. Comportamento quando não houver tipos (opcional)

- Se em algum ambiente a lista de tipos vier vazia: desabilitar o botão “Novo Envelope” ou exibir aviso (“Cadastre um tipo em Tipos de Envelope”) para evitar envio de `envelope_type_id` vazio.

### 6.4. Mensagens de erro

- Manter o mapeamento atual no `envelopeService` (toUserFriendlyError) e exibição de `e.message` no toast na Home, para que qualquer erro restante (RLS, unique, etc.) seja mostrado de forma clara.

---

## 7. Resumo

| Item | Conteúdo |
|------|----------|
| **Contexto** | Tabela no banco = **envelope_types**; tipos já cadastrados; lista de tipos carrega no app. |
| **Causa provável** | A coluna `envelopes.envelope_type_id` tem FK para **envelope_type(id)** em vez de **envelope_types(id)**. O insert usa IDs de envelope_types; o Postgres valida em envelope_type → 23503. |
| **Diagnóstico** | Ver no Supabase a definição da FK de `envelopes.envelope_type_id`; confirmar existência de envelope_type vs envelope_types; ver resposta de erro do POST em envelopes (código 23503/42501); verificar RLS. |
| **Solução** | Remover a FK atual de envelope_type_id e criar nova FK referenciando **envelope_types(id)**; garantir RLS de INSERT (e demais) em envelopes; opcional: evitar criar envelope sem tipos carregados. |

Com isso, o plano fica alinhado ao cenário em que a tabela no banco é **envelope_types** e há tipos cadastrados, focando na correção da referência da FK e em RLS.
