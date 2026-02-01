# SPEC v1 – CRUD Tipo de Envelope e relacionamento envelope ↔ envelope_type

=== SPEC v1 ===

## A) CONTEXTO E OBJETIVO

- Permitir cadastro e ordenação dos **tipos de envelope** usados no cadastro de envelopes.
- A tabela `envelope_type` já existe no Supabase; o CRUD deve consumi-la e permitir listar, criar, editar, excluir e reordenar (drag & drop) os tipos.
- Alterar o relacionamento entre `envelopes` e `envelope_type`: de vínculo indireto por `type_slug` para **FK explícita** `envelope_type_id` (1:N — cada envelope tem um único tipo).

## B) ESCOPO

- **INCLUI:**
  - CRUD completo de Tipo de Envelope (listar, criar, editar, excluir).
  - Tela única de gerenciamento: lista ordenada por `relative_order` + opção de incluir novo tipo (apenas nome) + edição/exclusão na mesma tela.
  - Reordenação por drag & drop na lista; posição mais ao topo = menor `relative_order`.
  - Novo tipo inserido vai para o final da lista (maior `relative_order`).
  - Migração de dados e schema: adicionar `envelope_type_id` em `envelopes`, migrar de `type_slug` para FK, ajustar código (tipos, services, EnvelopeBoard, etc.) para usar `envelope_type_id` e, se aplicável, remover/depreciar uso de `type_slug`.
- **NÃO INCLUI:**
  - CRUD de envelopes em si (apenas uso do tipo no cadastro/edição de envelope).
  - Autenticação/autorização além do já existente (RLS por usuário, se houver).
  - Histórico de alterações (audit log) dos tipos.

## C) REQUISITOS FUNCIONAIS

- **Listar:** exibir todos os tipos de envelope ordenados por `relative_order` (ascendente).
- **Criar:** incluir novo tipo informando apenas o **nome**; `slug` pode ser derivado em lowercase a partir do nome (ou gerado no backend); `relative_order` = maior valor atual + 1 (final da lista).
- **Editar:** alterar o nome do tipo (slug pode ser recalculado se mantido).
- **Excluir:** remover tipo; regra de integridade: não permitir excluir se existir envelope vinculado (ou definir política de delete em cascata/soft — o SPEC recomenda **bloquear** se houver envelopes).
- **Reordenar:** drag & drop na lista; ao soltar, recalcular `relative_order` de todos os tipos afetados (ex.: sequência 0,1,2,3…) e persistir no backend.

## D) REQUISITOS NÃO-FUNCIONAIS

- **Observabilidade mínima:** log de erros em create/update/delete/reorder; não logar dados sensíveis.
- **Segurança:** uso do Supabase com RLS; operações de tipo de envelope acessíveis apenas a usuários autenticados (e, se o modelo for multi-tenant por usuário, filtrar por `user_id` — assumir que `envelope_type` pode ser global ou por usuário; se for global, sem filtro por user).
- **Performance básica:** listar tipos com ordem; evitar N+1 ao carregar envelopes com tipo.
- **Acessibilidade (UI):** botões e lista com labels/aria quando necessário; drag handle acessível; confirmação antes de excluir.

## E) CONTRATOS (API / FUNÇÕES)

- **Supabase (tabela `envelope_type`):**
  - Select: colunas necessárias (id, name, slug, relative_order).
  - Insert: name (slug e relative_order derivados no app ou no DB).
  - Update: name e/ou relative_order (reordenação em lote).
  - Delete: por id; falhar ou bloquear se existir envelope com `envelope_type_id` = id.

- **Serviço frontend (ex.: `envelopeTypeService.ts`):**
  - `getAll(): Promise<EnvelopeTypeRecord[]>` — ordenado por `relative_order` asc.
  - `create(name: string): Promise<EnvelopeTypeRecord>` — define relative_order como “último”.
  - `update(id: string, payload: { name?: string }): Promise<void>`.
  - `updateOrder(orderedIds: string[]): Promise<void>` — recebe lista de ids na nova ordem e persiste `relative_order` (ex.: índice = valor).
  - `delete(id: string): Promise<void>` — falha se houver envelopes vinculados.

- **Erros esperados:**
  - 400: nome vazio ou inválido.
  - 401/403: não autenticado ou sem permissão.
  - 404: tipo não encontrado (editar/excluir/reordenar).
  - 409: tentativa de excluir tipo com envelopes vinculados (ou constraint de FK).
  - 500: erro inesperado do Supabase.

## F) DADOS / SCHEMAS (SUPABASE)

- **Tabelas envolvidas:** `envelope_type`, `envelopes`.
- **envelope_type (existente):** id (uuid, PK), name (text), slug (text), relative_order (int). Incluir constraint UNIQUE em `relative_order` apenas se desejado (opcional); caso contrário, apenas índice para ordenação.
- **envelopes (alteração):** adicionar `envelope_type_id` (uuid, FK para `envelope_type.id`). Remover ou depreciar `type_slug` após migração: migrar dados de `type_slug` → `envelope_type_id` (join por `envelope_type.slug`), depois tornar `envelope_type_id` NOT NULL e remover `type_slug` (ou manter temporariamente para rollback).
- **Constraints/índices:** FK `envelopes.envelope_type_id` → `envelope_type.id`; índice em `envelopes(user_id, envelope_type_id)` para substituir o atual em `(user_id, type_slug)`; índice em `envelope_type(relative_order)` para ordenação.
- **Regras de integridade:** ao excluir tipo, não permitir se existir envelope com esse `envelope_type_id` (ON DELETE RESTRICT ou validação no app).

## G) UI / FLUXO

- **Tela:** uma página de “Gerenciar Tipos de Envelope” (ex.: rota `/tipos-envelope`), com Navbar incluindo link para essa página.
- **Componentes:** lista ordenada (drag & drop), botão “Novo tipo”, cada linha com nome + ações editar e excluir; modal (ou inline) para criar/editar com campo “Nome”.
- **Estados:** loading (lista), empty (nenhum tipo), error (mensagem + retry), success (toast após create/update/delete/reorder).
- **Confirmações:** excluir — confirmar com “Excluir este tipo?”; avisar se houver envelopes vinculados (e bloquear exclusão nesse caso).
- **Validações:** nome obrigatório e trim; feedback imediato no formulário.

## H) VALIDAÇÕES E CASOS DE BORDA

- Nome vazio ou só espaços: não permitir criar/editar.
- Excluir tipo que possui envelopes: retornar erro amigável e não remover.
- Reordenar: enviar lista completa de ids na nova ordem para evitar inconsistência.
- Lista vazia: primeiro tipo criado com `relative_order = 0`.
- Duplicidade de nome: opcional — se houver constraint UNIQUE(name), tratar 409 no UI.

## I) ARQUIVOS (paths) A CRIAR/ALTERAR

- **Criar:**
  - `src/services/envelopeTypeService.ts` — getAll, create, update, updateOrder, delete.
  - `src/pages/EnvelopeTypeManagement.tsx` — tela de gerenciamento (lista + drag & drop + modal criar/editar).
  - `src/components/EnvelopeTypeModal.tsx` — modal para criar/editar (apenas nome) — opcional se integrar tudo na página.
- **Alterar:**
  - `src/App.tsx` — rota `/tipos-envelope` e ProtectedRoute para `EnvelopeTypeManagement`.
  - `src/components/Navbar.tsx` — link “Tipos de Envelope” para `/tipos-envelope`.
  - `src/types.ts` — tipo/interface para registro de tipo de envelope (ex.: `EnvelopeTypeRecord`); ajustar `Envelope` para usar `envelope_type_id` e, se necessário, tipo do nome do tipo em vez de union literal.
  - `src/services/envelopeService.ts` — usar `envelope_type_id` nas leituras/inserts/updates; remover referências a `type_slug`.
  - `src/components/EnvelopeBoard.tsx` — buscar tipos de envelope para o select do formulário de envelope; usar `envelope_type_id` e exibir grupos por tipo ordenado por `relative_order`; remover `ENVELOPE_CONFIG` estático e usar dados de `envelope_type`.
  - `src/constants.ts` — se houver constantes de tipo, remover ou adaptar.
  - `sql/` — script de migração (adicionar coluna, migrar dados, índice, remover type_slug).

## J) PLANO EM ETAPAS (CHECKPOINTS)

1. **Migração de banco:** executar script SQL que adiciona `envelope_type_id` em `envelopes`, migra dados a partir de `type_slug`, ajusta índices e remove `type_slug` (ou deixa deprecated).
2. **Backend/types:** criar `envelopeTypeService.ts` e tipos em `types.ts`; ajustar `envelopeService.ts` e tipos de `Envelope` para `envelope_type_id`.
3. **Tela CRUD Tipo de Envelope:** criar página + modal (ou inline) com lista, drag & drop, create/update/delete e reorder.
4. **Integração EnvelopeBoard:** carregar tipos de envelope do Supabase; no formulário de envelope (criar/editar), usar select por tipo (id + nome); ordenar grupos por `relative_order`; remover mapeamento estático de tipos.
5. **Navegação e polish:** rota e link na Navbar; testes manuais (criar, editar, excluir, reordenar, criar envelope com novo tipo).

## K) CRITÉRIOS DE ACEITE (CHECKLIST)

- [ ] Lista de tipos de envelope é exibida ordenada por `relative_order` (menor no topo).
- [ ] É possível criar novo tipo informando apenas o nome; novo tipo aparece no final da lista.
- [ ] É possível editar o nome de um tipo existente.
- [ ] É possível excluir um tipo que não possui envelopes vinculados; exclusão é bloqueada (com mensagem clara) se houver envelopes.
- [ ] Drag & drop reordena a lista e persiste `relative_order` no Supabase.
- [ ] Cadastro/edição de envelope usa tipo vindo da tabela `envelope_type` (select por id/nome) e grupos no board seguem ordem de `relative_order`.
- [ ] Não há mais uso de `type_slug` em envelopes no código; apenas `envelope_type_id`.
- [ ] Rota `/tipos-envelope` protegida e link visível na Navbar.
- [ ] Estados loading, empty e error tratados na tela de tipos.
- [ ] Acessibilidade mínima (labels, confirmação de exclusão).

## L) ASSUNÇÕES (máx. 5)

- A tabela `envelope_type` já existe com colunas id, name, slug, relative_order; não foi colado o SQL exato, então o script de migração pode precisar de pequenos ajustes (ex.: nomes de colunas).
- Tipos de envelope são **globais** (sem `user_id` em `envelope_type`); se o projeto for multi-tenant por usuário em tipos, será necessário adicionar `user_id` e filtrar nas queries.
- O campo `slug` em `envelope_type` pode ser mantido para compatibilidade ou preenchido a partir do nome; o vínculo com envelopes deixa de usar slug e usa apenas `envelope_type_id`.
- Reordenação é persistida como sequência inteira (0, 1, 2, …) conforme a ordem dos ids enviados.
- Um único modal (ou formulário inline) serve tanto para criar quanto para editar tipo (como em CategoryManagement).

---

## Script SQL antes da implementação

Execute **antes** de implementar o CRUD e as alterações de código o script de migração:

**Arquivo:** `sql/003_envelope_type_fk_migration.sql`

**Passos resumidos:**
1. Adiciona coluna `envelope_type_id` em `envelopes` (FK para `envelope_type.id`, ON DELETE RESTRICT).
2. Popula `envelope_type_id` a partir de `type_slug` (join por `envelope_type.slug`).
3. Trate envelopes órfãos (type_slug sem correspondência) conforme política: inserir tipo em `envelope_type` ou atribuir tipo padrão — descomente e ajuste o bloco opcional no script se necessário.
4. Opcional: tornar `envelope_type_id` NOT NULL após garantir que todos os envelopes tenham tipo.
5. Remove índice antigo em `type_slug` e cria índice em `(user_id, envelope_type_id)`.
6. **Não** remover a coluna `type_slug` nesta primeira execução; fazer isso em uma segunda migração **após** o deploy do código que usa apenas `envelope_type_id`.

Se a tabela `envelope_type` ainda não existir, crie-a antes (ex.: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `name text NOT NULL`, `slug text`, `relative_order integer NOT NULL DEFAULT 0`). O briefing informou que a tabela já existe; ajuste o script se os nomes das colunas forem diferentes.

=== /SPEC ===
