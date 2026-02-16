# Plano: CRUD Categoria – Salvamento processa indefinidamente

## 1. Sintoma

Ao criar uma nova categoria (nome + subcategorias) e clicar em **Salvar**, a aplicação fica processando indefinidamente: o botão (e/ou a tela) permanece em estado de loading e não conclui.

---

## 2. Fluxo atual (resumo)

1. **CategoryModal** – `handleSubmit`: `setIsLoading(true)` → `await categoryService.create(name, filteredSubs)` → toast → `onSuccess()` → `onClose()` → `finally: setIsLoading(false)`.
2. **categoryService.create**: `getUser()` → `insert` em `categories` com `.select().single()` → se houver subcategorias, `insert` em `subcategories`.
3. **onSuccess** em CategoryManagement é **fetchCategories**: chama `categoryService.getAll()` e, no início, faz **setIsLoading(true)** na página.

Ou seja: depois do create, o modal chama `onSuccess()` = **fetchCategories()**. O fetch não é awaited, mas **fetchCategories** logo no início coloca a **página** em loading. Se **getAll()** demorar demais ou nunca resolver, a tela fica em “Sincronizando com banco...” para sempre.

---

## 3. Hipóteses de causa

| Hipótese | Descrição | Como verificar |
|----------|-----------|----------------|
| **A. Refetch deixa a página em loading** | Após o create, `onSuccess()` chama `fetchCategories()`, que faz `setIsLoading(true)`. Se `getAll()` travar (rede, Supabase, RLS bloqueando leitura), a página fica em loading indefinido. | Não chamar refetch com loading full-page após criar/editar; ou refetch “silencioso”. |
| **B. create() nunca resolve** | `getUser()`, o `insert` em `categories` ou o `.select().single()` não retornam (rede, timeout, bug cliente). O modal fica com o botão em loading para sempre. | Timeout no create; log/erro ao dar timeout; checar rede e Supabase. |
| **C. RLS bloqueia INSERT ou SELECT** | RLS em `categories` ou `subcategories` sem política de INSERT para o usuário, ou SELECT após o insert não devolve a linha. Pode resultar em erro (ex.: 403) ou, em cenários estranhos, em comportamento que parece “travado”. | Conferir no Supabase: RLS em `categories` e `subcategories`; políticas de INSERT e SELECT para `auth.uid()`. |
| **D. Schema: colunas obrigatórias** | Tabela `categories` (ou `subcategories`) exige `created_at` / `updated_at` (ou outras) sem DEFAULT; o insert não envia e o Postgres pode falhar. Normalmente seria erro, não hang; mas vale checar. | Ver estrutura das tabelas e defaults; garantir que insert não dependa de colunas não enviadas. |

A hipótese **A** é a mais plausível para “processa indefinidamente” após clicar em Salvar: o modal pode até fechar (create concluiu), mas a página entra em loading por causa do refetch e não sai mais se **getAll()** travar.

---

## 4. Objetivo da correção

- Garantir que, ao salvar (criar/editar) categoria, a UI não fique em loading indefinido.
- Diferenciar “loading da ação de salvar” (modal/botão) do “loading da listagem” (página), e evitar que um refetch pós-salvar prenda a tela inteira.
- Garantir que erros (create, refetch, RLS) sejam mostrados e que o loading seja sempre desligado (modal e página).

---

## 5. Plano de correção

### 5.1. Refetch sem full-page loading (recomendado)

**Arquivo:** `src/pages/CategoryManagement.tsx`

- Criar um refetch “silencioso” para usar após create/update:
  - **Opção 1:** Nova função `refetchCategoriesSilent()` que chama `categoryService.getAll()`, atualiza `setCategories(data)` em caso de sucesso e **não** chama `setIsLoading(true)`.
  - **Opção 2:** Adicionar parâmetro a `fetchCategories`, por exemplo `fetchCategories(silent?: boolean)`: se `silent === true`, não fazer `setIsLoading(true)` (e opcionalmente não fazer `setHasError(false)` no início, ou tratar erro só com toast).
- Usar esse refetch silencioso em **onSuccess** do modal:
  - Passar para o modal um callback que chame esse refetch (ex.: `onSuccess={refetchCategoriesSilent}` ou `onSuccess={() => fetchCategories(true)}`).
- Efeito: após salvar, a lista é atualizada em segundo plano sem colocar a página em “Sincronizando com banco...” e sem risco de loading infinito se o getAll() travar (ainda assim convém tratar erro do refetch com toast e, se quiser, um retry).

### 5.2. Timeout e erro no create (segurança)

**Arquivo:** `src/components/CategoryModal.tsx` (e opcionalmente `src/services/categoryService.ts`)

- No `handleSubmit`, garantir que o loading do modal seja desligado mesmo se `categoryService.create()` (ou `update`) nunca resolver:
  - Ex.: envolver a chamada em `Promise.race(create(...), timeout(ms))` (ex.: 15–20 s) e, em caso de timeout, fazer `throw new Error('Tempo esgotado. Tente novamente.')` e no `catch`/`finally` garantir `setIsLoading(false)`.
- Assim, se a causa for “create() não resolve” (rede/Supabase), o usuário vê mensagem de erro e o botão deixa de ficar carregando.

### 5.3. Tratamento de erro no refetch pós-salvar

- Se usar refetch silencioso após create/update, tratar erro (catch):
  - Toast: “Categoria salva, mas a lista não pôde ser atualizada. Tente recarregar.”
  - Não setar `hasError` da página como true de forma que impeça o uso da tela (ou setar apenas se for crítico); priorizar toast e possibilidade de novo refetch (ex.: botão “Atualizar lista”).

### 5.4. Verificações no Supabase (RLS e schema)

- **RLS em `categories`:**
  - INSERT para `auth.uid() = user_id`.
  - SELECT para `auth.uid() = user_id`.
- **RLS em `subcategories`:**
  - INSERT para `auth.uid() = user_id`.
  - SELECT para `auth.uid() = user_id` (e, se necessário, checar que a categoria pertence ao usuário).
- **Schema:** Confirmar se `categories` e `subcategories` têm `created_at`/`updated_at` (ou outras colunas obrigatórias) com DEFAULT (ex.: `now()`); caso contrário, o insert pode falhar com erro de coluna obrigatória.

Nenhuma alteração de código é obrigatória para isso; basta conferir no painel do Supabase e corrigir políticas ou defaults se necessário.

---

## 6. Ordem sugerida de implementação

1. **Refetch silencioso (5.1)**  
   Implementar `fetchCategories(silent)` (ou `refetchCategoriesSilent`) e usar no `onSuccess` do CategoryModal. Testar: criar categoria → modal fecha → lista atualiza sem full-page loading e sem travar.
2. **Timeout no create (5.2)**  
   Adicionar timeout em volta de `create`/`update` no modal e mensagem de erro + `setIsLoading(false)` em caso de timeout. Testar com rede lenta ou bloqueada.
3. **Erro do refetch (5.3)**  
   No refetch silencioso, adicionar catch com toast e sem prender a tela em loading.
4. **Conferência no Supabase (5.4)**  
   Ver RLS e defaults de `categories` e `subcategories`; ajustar se algo estiver bloqueando insert ou select.

---

## 7. Resumo

| O quê | Onde | Objetivo |
|-------|------|----------|
| Refetch sem full-page loading após salvar | CategoryManagement + callback do modal | Evitar loading infinito quando o refetch (getAll) travar. |
| Timeout no create/update | CategoryModal (e opcionalmente service) | Evitar botão/modal em loading infinito se a requisição não retornar. |
| Tratar erro do refetch silencioso | CategoryManagement | Mostrar toast e não travar a UI. |
| Verificar RLS e schema | Supabase | Garantir que insert/select de categorias e subcategorias funcionem. |

Com isso, o CRUD de categoria deixa de “processar indefinidamente” ao salvar e passa a falhar de forma visível e controlada quando houver problema de rede ou permissão.
