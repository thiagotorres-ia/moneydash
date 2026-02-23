# SPEC v1 – Transferência entre envelopes com categorias e log

=== SPEC v1 ===

## A) CONTEXTO E OBJETIVO

- Ampliar a funcionalidade de **Transferência entre envelopes** (acessada pelo botão "Transferir" na Home) para incluir **data da transferência**, **categorias e subcategorias** de origem e destino (opcionais), e para que a operação **não crie lançamentos** (transações) e **não altere os totalizadores** da tela Home.
- Toda transferência deve ser **registrada em log** no banco com usuário, envelopes, categorias/subcategorias, valor e data/hora.
- Objetivo: permitir ao usuário transferir valor entre dois envelopes com classificação opcional por categoria/subcategoria, atualizando apenas os saldos dos envelopes e mantendo totalizadores e extrato inalterados; com rastreabilidade via tabela de log.

## B) ESCOPO

- **INCLUI:**
  - Redesenho da tela/modal de transferência com os campos: Data, Envelope origem, Categoria origem, Subcategoria origem, Envelope destino, Categoria destino, Subcategoria destino, Valor (R$).
  - Regras de obrigatoriedade: Envelope origem, Envelope destino e Valor obrigatórios; Data com default hoje; categorias/subcategorias opcionais, default "sem categoria".
  - Lógica de gravação: debitar valor no envelope de origem e creditar no envelope de destino **sem criar registros na tabela transactions**; atualizar apenas a coluna `amount` dos envelopes.
  - Criação de tabela de **log de transferências** no Supabase e gravação de cada operação com os campos especificados (user_id, envelope origem/destino, categoria/subcategoria origem/destino, valor, updated_at).
  - Listagem de envelopes ativos com saldo exibido ao lado do nome; listagem de categorias ordenadas e subcategorias filtradas por categoria.
- **NÃO INCLUI:**
  - Alterar o cálculo dos totalizadores (FinancialSummary) nem a tabela de lançamentos (transactions) para esta operação.
  - Criar ou modificar lançamentos (transações) quando da transferência.
  - Relatório ou tela de consulta do log de transferências (apenas persistência do log).

## C) REQUISITOS FUNCIONAIS

- **Data:** campo editável, valor padrão = data atual; formato data.
- **Envelope de origem:** lista de todos os envelopes ativos do usuário; ao lado do nome exibir o saldo atual (valor); obrigatório; qualquer envelope pode ser selecionado (independente do saldo).
- **Categoria de origem:** lista de todas as categorias cadastradas, em ordem; opcional; default "sem categoria".
- **Subcategoria de origem:** lista das subcategorias vinculadas à categoria de origem selecionada; opcional; default "sem categoria"; habilitada e filtrada conforme categoria de origem.
- **Envelope de destino:** lista de todos os envelopes ativos; exibir saldo ao lado do nome; obrigatório; não pode ser igual ao envelope de origem.
- **Categoria de destino:** lista de todas as categorias, em ordem; opcional; default "sem categoria".
- **Subcategoria de destino:** lista das subcategorias da categoria de destino selecionada; opcional; default "sem categoria"; filtrada conforme categoria de destino.
- **Valor da transferência:** campo numérico em R$ (ex.: 10,00); obrigatório; valor positivo a ser debitado da origem e creditado no destino.
- **Ao gravar:** (1) debitar o valor no envelope de origem (atualizar `envelopes.amount`); (2) creditar o valor no envelope de destino; (3) inserir registro na tabela de log com user_id, id envelope origem, id categoria origem, id subcategoria origem, id envelope destino, id categoria destino, id subcategoria destino, valor, updated_at (data/hora atual). Nenhum insert em `transactions`.
- Validação: valor > 0; envelope origem ≠ envelope destino; saldo do envelope de origem suficiente (ou permitir saldo negativo conforme regra de negócio a confirmar).

## D) REQUISITOS NÃO-FUNCIONAIS

- **Observabilidade mínima:** log de erro em falha na operação de transferência ou na gravação do log; não logar dados sensíveis.
- **Segurança:** operação apenas para usuário autenticado; RLS na tabela de log (insert/select pelo próprio user_id).
- **Performance básica:** carregar envelopes e categorias (com subcategorias) uma vez; evitar N+1.
- **Acessibilidade (UI):** labels nos campos; ordem de foco lógica; contraste e alvos de toque adequados.

## E) CONTRATOS (API / FUNÇÕES)

- **envelopeService (ou novo módulo):**
  - Nova função de transferência (ex.: `transferWithLog` ou substituir/complementar `transfer`) que: recebe data, envelope origem, categoria origem (opcional), subcategoria origem (opcional), envelope destino, categoria destino (opcional), subcategoria destino (opcional), valor; valida; atualiza `envelopes.amount` (origem -= valor, destino += valor); insere uma linha na tabela de log; **não** chama transactionService.create.
- **Erros esperados:**
  - 400: validação (valor inválido, origem = destino, saldo insuficiente se aplicável).
  - 401/403: não autenticado.
  - 404: envelope ou categoria/subcategoria não encontrado.
  - 500: erro inesperado no Supabase.

## F) DADOS / SCHEMAS (SUPABASE)

- **Tabelas envolvidas:** `envelopes` (leitura de saldo e update de amount), `categories`, `subcategories` (leitura para listagens), **nova tabela de log de transferências**.
- **Nova tabela (ex.: `envelope_transfer_log`):**
  - `id` uuid PK default gen_random_uuid()
  - `user_id` uuid NOT NULL REFERENCES auth.users(id) (ou profiles)
  - `transfer_date` date (data da transferência informada pelo usuário)
  - `origin_envelope_id` uuid NOT NULL REFERENCES envelopes(id)
  - `origin_category_id` uuid NULL REFERENCES categories(id) ON DELETE SET NULL
  - `origin_subcategory_id` uuid NULL REFERENCES subcategories(id) ON DELETE SET NULL
  - `dest_envelope_id` uuid NOT NULL REFERENCES envelopes(id)
  - `dest_category_id` uuid NULL REFERENCES categories(id) ON DELETE SET NULL
  - `dest_subcategory_id` uuid NULL REFERENCES subcategories(id) ON DELETE SET NULL
  - `amount` numeric NOT NULL (valor transferido)
  - `created_at` ou `updated_at` timestamptz NOT NULL default now()
- **Constraints/índices:** FKs acima; índice em `user_id` e em `transfer_date` para consultas futuras; RLS para o usuário acessar apenas seus registros.
- **Regras de integridade:** ao gravar, nenhuma alteração em `transactions`; apenas UPDATE em `envelopes` (amount) e INSERT no log.

## G) UI / FLUXO

- **Telas/Componentes:** modal (ou tela) de transferência acionada pelo botão "Transferir" na Home; reutilizar padrão atual do [EnvelopeBoard](src/components/EnvelopeBoard.tsx) (Modal de transferência) estendendo campos.
- **Campos na ordem:** Data (default hoje) → Envelope origem (com saldo ao lado) → Categoria origem (opcional, default "sem categoria") → Subcategoria origem (opcional, filtrada) → Envelope destino (com saldo) → Categoria destino (opcional) → Subcategoria destino (opcional) → Valor (R$).
- **Estados:** loading durante gravação; success (toast e fechar modal); error (toast com mensagem).
- **Confirmações:** opcional confirmar antes de gravar (ex.: "Transferir R$ X de [origem] para [destino]?"). Validação: obrigatórios preenchidos; valor > 0; origem ≠ destino.

## H) VALIDAÇÕES E CASOS DE BORDA

- Valor zero ou negativo: bloquear e exibir mensagem.
- Envelope origem = envelope destino: bloquear e exibir mensagem.
- Saldo do envelope de origem insuficiente: decidir se permite saldo negativo ou bloquear com mensagem clara (especificar na implementação).
- Categoria selecionada e subcategoria "sem categoria": permitido (subcategoria opcional) ou exigir subcategoria quando categoria preenchida? O briefing diz que categorias são opcionais e default "sem categoria"; assumir que subcategoria pode ficar "sem categoria" mesmo com categoria preenchida, salvo definição contrária.
- Categoria alterada: resetar ou filtrar subcategoria (subcategorias da nova categoria).

## I) ARQUIVOS (paths) A CRIAR/ALTERAR

- **Criar:**
  - Migration SQL (Supabase): criação da tabela `envelope_transfer_log` (ou nome acordado) com colunas listadas em F).
- **Alterar:**
  - [src/types.ts](src/types.ts): tipo/interface para o payload da transferência com categorias e para o registro de log (se usado no front).
  - [src/services/envelopeService.ts](src/services/envelopeService.ts): nova função de transferência que atualiza apenas envelopes.amount e insere no log; **não** chamar transactionService.create. (Manter a função `transfer` atual se ainda usada em outro fluxo, ou substituir conforme escopo.)
  - [src/components/EnvelopeBoard.tsx](src/components/EnvelopeBoard.tsx): modal de transferência com os novos campos (Data, Envelope origem com saldo, Categoria/Subcategoria origem, Envelope destino com saldo, Categoria/Subcategoria destino, Valor); carregar categorias (categoryService.getAll()); validação e submit chamando a nova função do service.
  - [src/pages/Home.tsx](src/pages/Home.tsx): passar categorias para EnvelopeBoard se necessário; handler onTransfer atualizado para receber o novo payload (data, origem, cat/sub orig, dest, cat/sub dest, valor) e chamar o novo método do service.
- **Não alterar:** [src/components/FinancialSummary.tsx](src/components/FinancialSummary.tsx); transactionService (no que diz respeito a criar transações para esta transferência).

## J) PLANO EM ETAPAS (CHECKPOINTS)

1. **Banco:** Criar migration com a tabela de log de transferências (envelope_transfer_log) e RLS; aplicar no Supabase (via MCP ou script).
2. **Service:** Implementar função de transferência sem transações (atualizar envelopes.amount e inserir no log); validar origem ≠ destino e valor > 0.
3. **Modal:** Incluir campos Data, Categoria/Subcategoria origem e destino; exibir saldo ao lado do nome dos envelopes nas listas; defaults e obrigatoriedades conforme SPEC.
4. **Integração:** EnvelopeBoard e Home chamando a nova função com o payload completo; garantir que totalizadores e lista de lançamentos não mudem após transferência.
5. **Testes:** Realizar transferência e verificar saldos dos envelopes, ausência de novos lançamentos e registro no log.

## K) CRITÉRIOS DE ACEITE (CHECKLIST)

- [ ] Modal de transferência exibe Data (default hoje), Envelope origem (com saldo), Categoria e Subcategoria origem (opcional, default "sem categoria"), Envelope destino (com saldo), Categoria e Subcategoria destino (opcional), Valor (R$).
- [ ] Envelope origem, Envelope destino e Valor são obrigatórios; categorias e subcategorias opcionais com default "sem categoria".
- [ ] Subcategorias de origem e destino são filtradas pela categoria selecionada em cada lado.
- [ ] Ao gravar, o valor é debitado do envelope de origem e creditado no envelope de destino; nenhum novo lançamento é criado; totalizadores da Home permanecem inalterados.
- [ ] Cada transferência gera um registro no log com user_id, envelope origem/destino, categoria/subcategoria origem/destino (ou null), valor e data/hora (updated_at).
- [ ] Validação impede valor ≤ 0 e envelope origem = destino.

## L) ASSUNÇÕES (máx. 5)

- A transferência com categorias substitui ou coexiste com a transferência atual (que cria 2 transações). Pelo briefing, esta nova operação **não** cria lançamentos; assume-se que haverá uma única modal de transferência que passa a usar a nova lógica (atualizar saldos + log), e os totalizadores continuam baseados apenas em `transactions`.
- "Sem categoria" é armazenado como `null` em category_id e subcategory_id no log.
- Saldo insuficiente no envelope de origem: especificação deixa a decisão (bloquear ou permitir negativo) para a implementação; recomenda-se bloquear com mensagem clara.
- A tabela de log é somente escrita nesta feature (sem tela de consulta); estrutura preparada para futura consulta ou auditoria.
- Categorias e subcategorias são carregadas via categoryService.getAll() já existente; envelopes via lista já disponível no EnvelopeBoard.

=== /SPEC ===

---

# User Story – Transferência entre envelopes com categorias e log

**Como** usuário do MoneyDash,  
**quero** realizar uma transferência de valor entre dois envelopes informando data, envelopes de origem e destino, valor e, opcionalmente, categorias e subcategorias de origem e destino,  
**para que** o saldo seja movido entre os envelopes sem gerar lançamentos no extrato e sem alterar os totalizadores, e para que a operação fique registrada em log com todas as informações.

---

## Critérios de aceite

1. **Campos da tela de transferência**
   - A tela (modal) de transferência exibe os campos: **Data** (valor padrão = data de hoje), **Envelope de origem**, **Categoria de origem**, **Subcategoria de origem**, **Envelope de destino**, **Categoria de destino**, **Subcategoria de destino**, **Valor da transferência (R$)**.
   - Ao lado do nome de cada envelope (origem e destino) é exibido o **saldo atual** do envelope.
   - **Envelope de origem** lista todos os envelopes ativos; **Envelope de destino** lista todos os envelopes ativos, exceto o selecionado como origem.

2. **Obrigatoriedade e defaults**
   - **Obrigatórios:** Envelope de origem, Envelope de destino, Valor da transferência.
   - **Opcionais:** Categoria de origem, Subcategoria de origem, Categoria de destino, Subcategoria de destino.
   - **Default:** Data = data atual; Categoria e Subcategoria (origem e destino) = "sem categoria".

3. **Subcategorias dependentes**
   - As opções de **Subcategoria de origem** são apenas as subcategorias vinculadas à **Categoria de origem** selecionada.
   - As opções de **Subcategoria de destino** são apenas as subcategorias vinculadas à **Categoria de destino** selecionada.
   - Categorias são exibidas em ordem (ex.: alfabética).

4. **Regra de gravação**
   - Ao confirmar a transferência, o **valor informado** é **debitado** do Envelope de origem e **creditado** no Envelope de destino (atualização dos saldos dos envelopes).
   - **Nenhum novo lançamento** é criado na tabela de transações.
   - Os **totalizadores** da tela Home (Saldo total, Distribuído, Não distribuído) **não são alterados** por essa operação.

5. **Log no banco**
   - Toda transferência é registrada em uma tabela de log no banco com: **id do usuário**, **id do envelope de origem**, **id da categoria de origem** (ou null), **id da subcategoria de origem** (ou null), **id do envelope de destino**, **id da categoria de destino** (ou null), **id da subcategoria de destino** (ou null), **valor**, **updated_at** (data e hora da operação).

6. **Validações**
   - Não é possível confirmar com valor menor ou igual a zero.
   - Não é possível selecionar o mesmo envelope como origem e destino.
   - Mensagens claras para o usuário em caso de erro ou validação.

7. **Comportamento e UX**
   - Após gravar com sucesso, a modal é fechada e os saldos dos envelopes na tela são atualizados.
   - Em caso de falha, uma mensagem de erro é exibida (ex.: toast) e a modal permanece aberta.
