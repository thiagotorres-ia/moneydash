# SPEC v1 – Relatório de gastos por categoria: agregação com envelope_transfer_log

---

## Resumo (visão de negócio)

Hoje, o **relatório de gastos por categoria** consolida apenas os **lançamentos** (tabela `transactions`): cada transação é classificada como receita ou despesa e agrupada por categoria e subcategoria, gerando totais e gráficos por categoria/subcategoria.  
Com a mudança, passa a existir uma **segunda fonte** de dados: a tabela **`envelope_transfer_log`**. Os registros de transferência entre envelopes que tiverem **categoria e subcategoria de origem** preenchidas contribuem como **gasto (despesa)** para essa categoria/subcategoria; os que tiverem **categoria e subcategoria de destino** preenchidas contribuem como **receita** para essa categoria/subcategoria. As duas fontes são **somadas**: o que já vem de `transactions` é mantido; o que vem de `envelope_transfer_log` é agregado ao mesmo relatório (mesmos filtros de período e de categoria/subcategoria), de forma que o usuário enxergue um único consolidado de receitas e despesas por categoria, incluindo tanto lançamentos quanto transferências classificadas.

---

=== SPEC v1 ===

## A) CONTEXTO E OBJETIVO

- O relatório de gastos por categoria ([SpendingByCategoryReport](src/pages/SpendingByCategoryReport.tsx)) hoje consolida **apenas** a tabela **transactions** (lançamentos), agrupando por categoria e subcategoria e separando receitas e despesas. Essa base deve **permanecer** inalterada.
- Objetivo: **agregar** uma segunda fonte — a tabela **envelope_transfer_log** — à consolidação do relatório, de forma que:
  - Registros do log com **origin_category_id** e **origin_subcategory_id** preenchidos: o **amount** do registro seja contabilizado como **gasto (despesa)** na respectiva categoria e subcategoria.
  - Registros do log com **dest_category_id** e **dest_subcategory_id** preenchidos: o **amount** do registro seja contabilizado como **receita** na respectiva categoria e subcategoria.
- O resultado exibido (totais, gráficos e tabelas por categoria/subcategoria) passa a ser a **soma** do que vem de `transactions` com o que vem de `envelope_transfer_log`, respeitando os mesmos filtros de período (data) e, quando aplicável, de categoria/subcategoria.

## B) ESCOPO

- **INCLUI:**
  - Consulta à tabela `envelope_transfer_log` no mesmo intervalo de datas usado no relatório (`transfer_date` entre dateFrom e dateTo), restrita ao usuário logado (RLS).
  - Regra de agregação: origem (origin_* preenchidos) → despesa na categoria/subcategoria; destino (dest_* preenchidos) → receita na categoria/subcategoria.
  - Inclusão desses valores nos totais do relatório (total receitas, total gastos, saldo) e nos blocos por categoria/subcategoria (receitas por categoria, despesas por categoria, “sem categoria” quando aplicável).
  - Aplicação dos filtros de categoria e subcategoria do relatório também aos registros do log (incluir no resultado apenas transferências cuja categoria/subcategoria de origem ou destino caia no filtro, conforme o tipo receita/despesa).
- **NÃO INCLUI:**
  - Alterar a forma como os dados da tabela `transactions` são agregados (mantém-se como está).
  - Criar nova tela ou novo relatório; apenas estender a lógica de consolidação do relatório existente.
  - Alterar estrutura da tabela `envelope_transfer_log` ou da API de transferência.

## C) REQUISITOS FUNCIONAIS

- Para cada registro em **envelope_transfer_log** no período filtrado (transfer_date entre dateFrom e dateTo) e do usuário logado:
  - Se **origin_category_id** e **origin_subcategory_id** forem não nulos: somar **amount** às despesas da categoria/subcategoria correspondente (e ao total de gastos do período).
  - Se **dest_category_id** e **dest_subcategory_id** forem não nulos: somar **amount** às receitas da categoria/subcategoria correspondente (e ao total de receitas do período).
- Registros com apenas um dos campos (ex.: origin_category_id preenchido e origin_subcategory_id nulo) não entram na agregação por categoria/subcategoria (podem ser tratados como “sem categoria” ou ignorados; recomenda-se ignorar para manter consistência “categoria + subcategoria preenchidos”).
- Os filtros de categoria e subcategoria do relatório devem ser aplicados também aos dados do log: ao filtrar por uma categoria (ou subcategoria), considerar nas despesas apenas transferências cuja origem tenha essa categoria/subcategoria e nas receitas apenas transferências cujo destino tenha essa categoria/subcategoria.
- Totais exibidos (total receitas, total gastos, saldo) devem incluir tanto os valores de `transactions` quanto os valores agregados de `envelope_transfer_log` conforme as regras acima.
- Gráficos e tabelas drill-down (por categoria e subcategoria) devem refletir a soma das duas fontes.

## D) REQUISITOS NÃO-FUNCIONAIS

- **Observabilidade mínima:** log de erro em falha na busca do log ou na agregação; não logar dados sensíveis.
- **Segurança:** uso apenas de registros do usuário autenticado (RLS em envelope_transfer_log já restringe por user_id).
- **Performance básica:** buscar o log no mesmo intervalo de datas do relatório, de forma paginada ou limitada se necessário; evitar N+1; reutilizar o mesmo período (dateFrom, dateTo) já usado para transactions.
- **Acessibilidade (se UI):** não alterar estrutura de acessibilidade do relatório; totais e rótulos continuam identificáveis.

## E) CONTRATOS (API / FUNÇÕES)

- **Serviço de relatório ou de transferência (novo ou estendido):**
  - Função que, dado período (dateFrom, dateTo) e opcionalmente categoryId/subcategoryId, retorna os registros de **envelope_transfer_log** do usuário no período, ou retorna já agregados por categoria/subcategoria (origem → despesa, destino → receita). Assinatura e local (novo service ou transactionService/reportService) a definir na implementação.
- **SpendingByCategoryReport:**
  - Além de `transactionService.getFiltered(...)`, obter dados agregados do log (ou lista de registros do log para agregar no front); somar aos mapas/estruturas já usados para construir blocos de categoria e totais.
- **Erros esperados:**
  - 401/403: não autenticado ou RLS.
  - 500: erro inesperado ao acessar envelope_transfer_log.

## F) DADOS / SCHEMAS (SUPABASE)

- **Tabelas envolvidas:** `transactions` (já utilizada; sem alteração de uso), **envelope_transfer_log** (leitura).
- **envelope_transfer_log (existente):** id, user_id, transfer_date, origin_envelope_id, origin_category_id, origin_subcategory_id, dest_envelope_id, dest_category_id, dest_subcategory_id, amount, created_at. RLS: SELECT pelo próprio user_id.
- **Regra de agregação:** somente registros com **ambos** origin_category_id e origin_subcategory_id preenchidos entram como despesa; somente registros com **ambos** dest_category_id e dest_subcategory_id preenchidos entram como receita. Período: transfer_date entre dateFrom e dateTo (inclusivo).

## G) UI / FLUXO

- **Telas/Componentes:** mesma tela do relatório de gastos por categoria (SpendingByCategoryReport); sem nova tela nem novo botão.
- **Fluxo:** usuário aplica filtros (período, categoria, subcategoria) como hoje; o relatório carrega transactions e, em paralelo ou em sequência, os dados do envelope_transfer_log no mesmo período; a agregação combina as duas fontes e exibe totais, gráficos e tabelas já incluindo as transferências classificadas.
- **Estados:** loading, error e success já existentes; garantir que falha ao carregar apenas o log não quebre a exibição das transactions (ex.: exibir só transactions e toast de aviso, ou tratar erro e somar zero do log).
- **Confirmações e validações:** nenhuma nova confirmação; validação de datas e filtros permanece a mesma.

## H) VALIDAÇÕES E CASOS DE BORDA

- Nenhum registro no log no período: agregação do log é zero; relatório igual ao atual (só transactions).
- Registro com apenas origin_category_id preenchido (origin_subcategory_id null): não contabilizar como despesa (ou contabilizar em “sem subcategoria” conforme decisão; SPEC recomenda não contabilizar para manter regra “ambos preenchidos”).
- Registro com dest_* preenchidos e origin_* vazios: contabilizar apenas como receita; idem para origem só como despesa.
- Categoria ou subcategoria excluída (FK SET NULL no log): registro pode ter category_id ou subcategory_id null; não entrar na agregação por categoria/subcategoria.
- Filtro de categoria/subcategoria: ao filtrar por categoria (ou subcategoria), incluir no resultado apenas as transferências cuja origem (para despesa) ou destino (para receita) corresponda ao filtro.

## I) ARQUIVOS (paths) A CRIAR/ALTERAR

- **Criar:**
  - Opcional: módulo ou função dedicada para buscar e agregar dados de envelope_transfer_log (ex.: `reportService.getTransferLogAggregates` ou método em transactionService). Se a agregação for feita no front, pode existir apenas função de leitura do log no período.
- **Alterar:**
  - [src/pages/SpendingByCategoryReport.tsx](src/pages/SpendingByCategoryReport.tsx): além de carregar transactions, carregar dados do envelope_transfer_log no mesmo período (e filtros); agregar ao useMemo que constrói mapDebit, mapCredit e totais (totalReceitas, totalGastos), somando os valores do log conforme regra origem → despesa, destino → receita; aplicar filtros de categoria/subcategoria aos registros do log.
  - Serviço que fornecerá os dados do log: [src/services/transactionService.ts](src/services/transactionService.ts) ou novo arquivo (ex.: transferLogService / reportService) com função que retorna registros do log no período (e usuário) ou retorna já agregados por (category_id, subcategory_id) para despesa e receita.
- **Não alterar:** estrutura da tabela envelope_transfer_log; lógica pura de agregação de transactions (apenas somar outra fonte aos mesmos mapas/totais).

## J) PLANO EM ETAPAS (CHECKPOINTS)

1. **Backend/Serviço:** Implementar função que busca em envelope_transfer_log por user_id e transfer_date entre dateFrom e dateTo; opcionalmente filtrar por category_id/subcategory_id; retornar lista de registros ou estrutura já agregada (somas por categoria/subcategoria para origem e destino).
2. **Relatório:** No SpendingByCategoryReport, chamar essa função no mesmo fluxo de applyFilters (ou no useMemo que depende do período); agregar os valores do log aos mapas mapDebit (origem) e mapCredit (destino) e aos totais totalReceitas e totalGastos antes de construir os blocos e gráficos.
3. **Filtros:** Garantir que, quando o usuário filtrar por categoria ou subcategoria, os registros do log entrem na agregação somente quando a categoria/subcategoria de origem (despesa) ou destino (receita) coincidir com o filtro.
4. **Testes:** Comparar relatório sem transferências no período (igual ao atual); com transferências apenas de origem preenchida (aumento em despesas); com transferências apenas de destino preenchida (aumento em receitas); com ambas; e com filtro de categoria aplicado.

## K) CRITÉRIOS DE ACEITE (CHECKLIST)

- [ ] A consolidação de gastos por categoria continua considerando todos os lançamentos da tabela transactions como hoje.
- [ ] Registros de envelope_transfer_log com origin_category_id e origin_subcategory_id preenchidos somam o amount como despesa na categoria/subcategoria correspondente e no total de gastos.
- [ ] Registros de envelope_transfer_log com dest_category_id e dest_subcategory_id preenchidos somam o amount como receita na categoria/subcategoria correspondente e no total de receitas.
- [ ] O período do relatório (dateFrom, dateTo) é aplicado ao log via transfer_date; apenas registros do usuário logado são considerados.
- [ ] Os totais exibidos (total receitas, total gastos, saldo) e os blocos por categoria/subcategoria (gráficos e tabelas) refletem a soma de transactions + envelope_transfer_log conforme as regras acima.
- [ ] Os filtros de categoria e subcategoria do relatório restringem corretamente os registros do log (origem para despesa, destino para receita).
- [ ] Registros do log com apenas um dos campos (categoria ou subcategoria) preenchido não entram na agregação por categoria/subcategoria (ou ficam em “sem categoria” conforme decisão documentada).

## L) ASSUNÇÕES (máx. 5)

- A tabela envelope_transfer_log existe e possui as colunas user_id, transfer_date, origin_category_id, origin_subcategory_id, dest_category_id, dest_subcategory_id, amount, com RLS permitindo SELECT pelo próprio user_id.
- “Preenchidos” significa não nulos: só contabilizar quando ambos origin_category_id e origin_subcategory_id forem não nulos (despesa), e ambos dest_* não nulos (receita).
- O relatório já utiliza transactionService.getFiltered com dateFrom/dateTo; o log será consultado com o mesmo intervalo (transfer_date entre dateFrom e dateTo).
- Não é necessário exibir no relatório a origem dos valores (transação vs. transferência); apenas o consolidado por categoria/subcategoria.
- Filtros de categoria e subcategoria do relatório aplicam-se ao log da mesma forma que às transactions: incluir transferência na despesa se a categoria/subcategoria de origem bater com o filtro; na receita se a de destino bater.

=== /SPEC ===
