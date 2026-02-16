# Plano: CRUD Envelopes funcional (varredura + correções)

## 1. Escopo

Varredura do **CRUD Envelopes** (entidade envelope: criar, editar, excluir, listar, transferir), não do CRUD de *tipos* de envelope. Objetivo: identificar por que ao **gravar um envelope** (criar ou editar) aparece erro genérico e tornar o CRUD estável e alinhado ao crud-standard.

---

## 2. Diagnóstico (varredura)

### 2.1 Banco (Supabase MCP)

- **Tabela `envelopes`:** existe; RLS habilitado; FK para `auth.users` e `envelope_types`.
- **Colunas relevantes:**
  - `user_id` (uuid NOT NULL, sem default) – enviado pelo app.
  - `type_slug` (text **NOT NULL**, sem default) – **não é enviado** pelo insert/update do app.
  - `code`, `name` (NOT NULL) – enviados.
  - `envelope_type_id` (uuid nullable) – enviado.
  - `amount`, `created_at`, `updated_at` – com default ou opcionais.

**Causa raiz no banco:** A coluna **`type_slug`** é **NOT NULL** e não tem default. O código em `envelopeService.create()` e `envelopeService.update()` só envia `user_id`, `code`, `name`, `envelope_type_id`, `amount`. O insert/update **não envia `type_slug`**, então o Postgres retorna erro **23502** (violation of not-null constraint) e o usuário vê falha ao gravar. Em resumo: schema ainda exige o campo legado `type_slug`, enquanto o app já migrou para `envelope_type_id`.

- **Constraints:** PK em `id`; FK `envelope_type_id` → `envelope_types(id)`; FK `user_id` → `auth.users(id)`. Nenhuma UNIQUE em `(user_id, code)` nas constraints consultadas (índice em `code` existe, mas não é unique).
- **RLS:** Política “Users can CRUD own envelopes” com `auth.uid() = user_id` para ALL – adequada; não é a causa do erro ao gravar.

### 2.2 Código – envelopeService

- **create():** Valida código, nome e `envelope_type_id`; faz insert com `user_id`, `code`, `name`, `envelope_type_id`, `amount`. **Não envia `type_slug`.** Em erro, chama `toUserFriendlyError(error)` e lança `Error` – tratamento adequado.
- **update():** Envia apenas `code`, `name`, `envelope_type_id` quando fornecidos. **Não envia `type_slug`.** Em erro, usa `toUserFriendlyError` – ok.
- **toUserFriendlyError:** Já mapeia 42501 (RLS), 23503 (FK), 23505 (unique), 23502 (not null), 22P02 (uuid inválido) – alinhado ao crud-standard.

Conclusão: o serviço está correto para o modelo atual; o problema é o banco exigir `type_slug` não nulo sem o app enviá-lo.

### 2.3 Código – Home (UI)

Em [src/pages/Home.tsx](src/pages/Home.tsx), os handlers de envelope **sempre exibem mensagem genérica** no catch:

- **onCreateEnvelope** (linhas 217–220): `catch(e) { addToast('Erro ao criar envelope', 'error'); }` – não usa `e.message`.
- **onEditEnvelope** (linhas 223–226): `catch(e) { addToast('Erro ao atualizar', 'error'); }` – não usa `e.message`.
- **onDeleteEnvelope** (linhas 228–231): `catch(e) { addToast('Erro ao excluir', 'error'); }` – não usa `e.message`.

Ou seja: mesmo quando o serviço lança um `Error` com mensagem amigável (ex.: “Tipo de envelope inválido…”, “Preencha todos os campos…”), o usuário vê apenas “Erro ao criar envelope” / “Erro ao atualizar” / “Erro ao excluir”. Isso piora a percepção de “erro genérico”.

### 2.4 Integrações

- EnvelopeBoard chama `onCreateEnvelope({ code, name, envelope_type_id })`; Home chama `envelopeService.create({ ...d, amount: 0 })` – contrato correto.
- Listagem usa `envelopeService.getAll()`; select não inclui `type_slug` – consistente com uso de `envelope_type_id`.

---

## 3. Objetivos da correção

- Fazer **criar** e **editar** envelope gravar no banco sem falha por `type_slug` NOT NULL.
- Fazer a UI exibir a **mensagem de erro retornada pelo serviço** (toUserFriendlyError) em vez de mensagem genérica fixa.
- Manter listar, excluir, transferir e estados loading/empty/error/success; alinhar tratamento de erro ao crud-standard (400/403/409/500).

---

## 4. Plano de correção

### 4.1 Banco: permitir INSERT/UPDATE sem `type_slug` (prioritário)

**Problema:** `envelopes.type_slug` é NOT NULL e sem default; o app não envia mais esse campo (usa `envelope_type_id`).

**Opção A (recomendada):** Tornar `type_slug` nullable para que o insert/update atual (sem `type_slug`) seja válido. O código já não depende de `type_slug` para leitura.

**Script SQL (executar no Supabase):**

```sql
-- Permite que inserts/updates não enviem type_slug (campo legado; app usa envelope_type_id).
ALTER TABLE public.envelopes
ALTER COLUMN type_slug DROP NOT NULL;
```

**Opção B (alternativa):** Definir default para `type_slug`, ex.: `ALTER TABLE public.envelopes ALTER COLUMN type_slug SET DEFAULT '';` e manter NOT NULL. Menos alinhado ao fato de o app não usar mais o campo.

Recomendação: **Opção A**. Executar o script acima no SQL Editor do Supabase (ou via migration/005 se o projeto usar migrations).

### 4.2 Home: exibir mensagem de erro do serviço (crud-standard)

**Arquivo:** [src/pages/Home.tsx](src/pages/Home.tsx)

- **onCreateEnvelope:** No catch, usar a mensagem do erro quando disponível:  
  `const message = e instanceof Error ? e.message : 'Erro ao criar envelope.';`  
  `addToast(message, 'error');`
- **onEditEnvelope:** Idem:  
  `const message = e instanceof Error ? e.message : 'Erro ao atualizar.';`  
  `addToast(message, 'error');`
- **onDeleteEnvelope:** Idem:  
  `const message = e instanceof Error ? e.message : 'Erro ao excluir.';`  
  `addToast(message, 'error');`

Assim, mensagens como “Tipo de envelope inválido…”, “Já existe um envelope com este código…”, “Preencha todos os campos…” (vindas de `toUserFriendlyError`) serão exibidas no toast em vez da mensagem genérica.

### 4.3 Verificações adicionais (opcional)

- **Unique (user_id, code):** Se no futuro for adicionada constraint UNIQUE em `(user_id, code)`, o 23505 já está mapeado em `toUserFriendlyError` (“Já existe um envelope com este código…”).
- **Delete:** Regra já clara (FK com transactions; 23503 tratado com mensagem sobre lançamentos vinculados).
- **Estados de UI:** Loading (processing), empty, error e success já existem; apenas garantir que o toast de erro use a mensagem do serviço (feito em 4.2).

---

## 5. Ordem de implementação

1. **Banco:** Executar `ALTER TABLE public.envelopes ALTER COLUMN type_slug DROP NOT NULL;` no Supabase (ou criar migration equivalente).
2. **Código:** Ajustar os três catches em Home.tsx (onCreateEnvelope, onEditEnvelope, onDeleteEnvelope) para usar `e.message` quando `e instanceof Error`, com fallback para a mensagem genérica atual.
3. **Testes manuais:** Criar envelope (código, nome, tipo); editar envelope; tentar criar com tipo inválido ou código duplicado (se houver unique) e conferir toasts; excluir e transferir.

---

## 6. Resumo

| Causa do erro ao gravar | Coluna `envelopes.type_slug` é NOT NULL; insert/update não enviam `type_slug` → 23502. |
|-------------------------|----------------------------------------------------------------------------------------|
| Erro “genérico” na UI   | Home ignora `e.message` no catch e sempre mostra “Erro ao criar envelope” etc.        |
| Correção banco          | `ALTER TABLE envelopes ALTER COLUMN type_slug DROP NOT NULL;`                         |
| Correção UI             | Usar `e instanceof Error ? e.message : '...'` nos catches de create/edit/delete.      |
| Arquivos                | SQL no Supabase; [src/pages/Home.tsx](src/pages/Home.tsx).                            |

Com isso, o CRUD de envelopes fica funcional ao gravar (criar/editar) e as falhas passam a exibir mensagens claras ao usuário, em linha com o crud-standard.
