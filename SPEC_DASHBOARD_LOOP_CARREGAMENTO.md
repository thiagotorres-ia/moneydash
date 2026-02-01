# SPEC v1 – Correção: Loop infinito de carregamento na tela Dashboard (Home)

=== SPEC v1 ===

## A) CONTEXTO E OBJETIVO

- **Problema:** Ao acionar o menu "Dashboard" (que leva à tela principal com envelopes, totalizadores e lançamentos), o sistema entra em loop infinito de carregamento: a tela permanece exibindo "Carregando MoneyDash..." e nunca exibe o conteúdo.
- **Objetivo:** Identificar e corrigir a causa do loop (ou do carregamento que nunca termina) para que a Dashboard carregue uma vez, exiba envelopes, totalizadores e lançamentos, e não entre em ciclo de re-renders ou de reexecução do fetch que deixe o loading ativo indefinidamente.

## B) ESCOPO

- **INCLUI:**
  - Corrigir o fluxo de carregamento da página Home (Dashboard) para que o estado de loading inicial seja exibido apenas uma vez e, em seguida, o conteúdo seja exibido (ou a tela de erro, em caso de falha).
  - Estabilizar dependências de efeitos e callbacks em Home (e, se necessário, em EnvelopeBoard) para evitar reexecução em loop do useEffect que dispara o fetch de dados.
  - Garantir que falhas em carregamentos secundários (ex.: tipos de envelope no EnvelopeBoard) não provoquem remontagem ou efeitos colaterais que gerem loop na Home.
  - Verificar e documentar inconsistência de nome de tabela (envelope_type vs envelope_types) que possa causar erro ao carregar tipos e impactar a experiência na Dashboard.
- **NÃO INCLUI:**
  - Alterar a estrutura de rotas ou a definição do menu Dashboard.
  - Implementar cache ou persistência local dos dados da Dashboard.
  - Modificar o fluxo de autenticação (login/logout) além do necessário para evitar efeitos colaterais na Home.

## C) REQUISITOS FUNCIONAIS

- Ao navegar para a rota "/" (Dashboard), o usuário deve ver, em sequência: (1) estado de loading inicial ("Carregando MoneyDash...") enquanto os dados são buscados; (2) em caso de sucesso, a tela com envelopes, totalizadores e lançamentos; (3) em caso de falha, a tela de erro com opção "Tentar novamente".
- O estado de loading inicial não pode ser reativado indefinidamente em ciclo (loop), nem permanecer ativo para sempre sem exibir conteúdo ou tela de erro.
- As subscrições Realtime (envelopes e transactions) devem continuar atualizando os dados em segundo plano (fetchData(true)) sem reativar o loading full-screen e sem causar reexecução em loop do efeito que monta as subscrições.

## D) REQUISITOS NÃO-FUNCIONAIS

- **Observabilidade mínima:** Em desenvolvimento, logar (console) quando o efeito de fetch/subscriptions for executado e, se aplicável, quando houver falha no carregamento de tipos de envelope (sem dados sensíveis).
- **Segurança:** Não alterar RLS nem expor dados; manter filtro por user_id nas queries.
- **Performance básica:** Evitar re-renders e reexecução desnecessária do efeito; dependências de useCallback/useEffect estáveis (ex.: usar primitivos como user?.id em vez de objeto user quando for suficiente).
- **Acessibilidade (se UI):** Manter estados de loading e erro acessíveis; mensagens claras.

## E) CONTRATOS (API / FUNÇÕES)

- **Home (Dashboard):**
  - `fetchData(isSilent?)`: deve ser estável (mesma referência) entre renders quando o usuário logado (identificado por id) e o addToast não mudarem; quando chamada pelo useEffect inicial, deve rodar uma vez (ou um número finito de vezes) e eventualmente setar `isInitialLoading(false)`.
  - `useEffect` que chama `fetchData()` e monta canais Realtime: deve ter dependências que não mudem a cada re-render (ex.: `user?.id` em vez de `user`), para não reexecutar em loop.
- **EnvelopeBoard:**
  - `fetchEnvelopeTypes`: se `envelopeTypeService.getAll()` falhar (ex.: tabela inexistente 42P01), o erro deve ser tratado (catch) sem causar remontagem da Home nem atualização de estado que dispare novo fetch da Home.
- **Erros esperados:**
  - 400/401/403/500 nas chamadas a envelopes ou transactions: tratar no catch de fetchData, setar isError e isInitialLoading(false), exibir tela de erro.
  - Falha em envelopeTypeService.getAll() (ex.: 42P01): tratar no EnvelopeBoard (catch), não propagar de forma que remonte a Home ou altere dependências do efeito da Home.

## F) DADOS / SCHEMAS (SUPABASE)

- **Tabelas envolvidas:** `envelopes`, `transactions` (carregadas na Home); `envelope_type` ou `envelope_types` (carregada no EnvelopeBoard).
- **Relevante:** A migration 003 cria a tabela `public.envelope_type` (singular); o código em `envelopeTypeService.ts` e o script 004 referenciam `envelope_types` (plural). Se no banco existir apenas `envelope_type`, as chamadas a `envelope_types` falham (42P01). Isso não altera diretamente o loop da Home, mas pode causar erro no EnvelopeBoard ao montar; garantir que o nome da tabela esteja alinhado (código e scripts) para evitar falhas que possam interferir no fluxo.
- **Regras de integridade:** Sem alteração de FKs ou RLS nesta correção; apenas garantir que as queries existentes (envelopes, transactions) sigam filtrando por user quando aplicável.

## G) UI / FLUXO

- **Telas/Componentes:** Home (Dashboard), Navbar com link "Dashboard" para "/", EnvelopeBoard, FinancialSummary, TransactionTable; estado de loading full-screen ("Carregando MoneyDash..."); estado de erro com botão "Tentar novamente".
- **Fluxo desejado:** Usuário clica em Dashboard → rota "/" → ProtectedRoute renderiza Home → Home monta → useEffect dispara fetchData() → isInitialLoading true → exibe loader → Promise.all(envelopeService.getAll(), transactionService.getAll()) resolve → setEnvelopes, setTransactions, isInitialLoading false → re-render → conteúdo exibido (Navbar, EnvelopeBoard, FinancialSummary, TransactionTable). As subscrições Realtime ficam ativas e chamam fetchData(true) em eventos, sem reativar o loading full-screen.
- **Estados:** loading (inicial, uma vez); success (conteúdo); error (tela de erro com retry).
- **Confirmações e validações:** Nenhuma nova confirmação; manter comportamento atual de retry.

## H) VALIDAÇÕES E CASOS DE BORDA

- **useEffect reexecutando em loop:** Se `fetchData` ou `user` mudarem de referência a cada re-render (ex.: user vindo de um context value não memoizado), o efeito que depende de [user, fetchData] reexecuta → chama fetchData() → setIsInitialLoading(true) → após o fetch, setState atualiza → re-render → efeito reexecuta novamente → loop. Mitigação: usar `user?.id` (string) em vez de `user` (objeto) nas dependências de fetchData e do useEffect, de forma que o efeito só reexecute quando o id do usuário mudar.
- **fetchData nunca completa:** Se envelopeService.getAll() ou transactionService.getAll() nunca resolverem (rede, Supabase indisponível), isInitialLoading permanece true. Mitigação: considerar timeout no fetch (opcional) ou garantir que erros sejam capturados e isInitialLoading(false) seja setado no catch/finally (já está no finally).
- **Realtime disparando fetchData em excesso:** Se os canais Realtime dispararem eventos em cascata e fetchData(true) for chamado muitas vezes, pode haver muitos re-renders; isso não deve, por si só, reativar o loading full-screen (porque isSilent = true). Garantir que a identidade de fetchData não mude a cada render, para que as subscrições não sejam desmontadas e remontadas em loop.
- **EnvelopeBoard falhando ao carregar tipos:** Se envelopeTypeService.getAll() lançar (ex.: tabela envelope_types inexistente), o catch em EnvelopeBoard deve apenas logar e manter envelopeTypes vazio; não deve alterar estado da Home nem causar remontagem que dispare novamente o efeito da Home.

## I) ARQUIVOS (paths) A CRIAR/ALTERAR

- **Alterar:**
  - `src/pages/Home.tsx`: (1) Alterar a dependência do useCallback de fetchData de `[user, addToast]` para `[user?.id, addToast]` (ou equivalente estável: garantir que fetchData não mude de referência quando apenas o objeto user mudar de referência, mantendo o mesmo id). (2) Alterar a dependência do useEffect que chama fetchData() e monta as subscrições de `[user, fetchData]` para `[user?.id, fetchData]` (ou equivalente), de forma que o efeito não reexecute em loop quando o objeto user for recriado (ex.: por re-render do AuthContext) com o mesmo id. (3) Dentro do useEffect, ao chamar fetchData(), garantir que não haja condição que dispare fetchData sem isSilent de forma repetida; se for necessário evitar reativar loading quando já há dados, considerar chamar fetchData(true) quando user?.id for o mesmo e já existir uma execução anterior (opcional, conforme análise do builder). (4) Revisar se o cleanup do useEffect (removeChannel) está correto e se as subscrições não estão sendo criadas/destruídas em ciclo.
- **Opcional (se for causa raiz ou impacto):**
  - `src/components/EnvelopeBoard.tsx`: Garantir que o useEffect que chama fetchEnvelopeTypes() não dependa de algo que mude a cada render; manter fetchEnvelopeTypes estável (useCallback com deps vazias). Tratar erro de getAll() de forma que não propague estado para o pai de forma a remontar a Home.
  - Alinhar nome da tabela: ou o código usa `envelope_type` (singular) em envelopeTypeService e no script 004, ou o banco possui `envelope_types` (plural); documentar no SPEC ou em comentário para evitar 42P01.

## J) PLANO EM ETAPAS (CHECKPOINTS)

1. **Estabilizar dependências em Home:** Em Home.tsx, alterar fetchData para depender de `user?.id` (e addToast) em vez de `user`; alterar o useEffect que chama fetchData e monta Realtime para depender de `user?.id` (e fetchData). Garantir que, na primeira montagem, fetchData() seja chamada uma vez e que, após o fetch completar, o efeito não reexecute a menos que user?.id mude (ex.: troca de usuário).
2. **Testar fluxo:** Navegar para Dashboard, verificar que o loading aparece uma vez e depois o conteúdo (ou a tela de erro); verificar que não há loop (ex.: loading não volta a aparecer em ciclo).
3. **Realtime e retry:** Garantir que eventos Realtime continuem chamando fetchData(true) e que o botão "Tentar novamente" chame fetchData() sem reativar loop; confirmar que o cleanup das subscrições ocorre ao desmontar ou quando user?.id muda.
4. **EnvelopeBoard e tipos:** Confirmar que falha em envelopeTypeService.getAll() não causa loop na Home; se a tabela no banco for envelope_type (singular), alinhar código ou scripts para envelope_types/envelope_type conforme decisão do projeto.

## K) CRITÉRIOS DE ACEITE (CHECKLIST)

- [ ] Ao acionar o menu "Dashboard", a tela exibe "Carregando MoneyDash..." uma vez e, em seguida, exibe o conteúdo (envelopes, totalizadores, lançamentos) sem entrar em loop de carregamento.
- [ ] O estado de loading não é reativado indefinidamente (sem ciclo visível de loading → conteúdo → loading).
- [ ] Em caso de falha ao carregar envelopes ou transactions, a tela de erro é exibida com "Tentar novamente" e o loading cessa.
- [ ] As subscrições Realtime continuam funcionando (alterações em envelopes/transactions refletem na tela) sem causar loop.
- [ ] Dependências do useCallback (fetchData) e do useEffect (fetch + subscriptions) em Home estão estáveis (ex.: uso de user?.id quando suficiente).
- [ ] (Opcional) Falha no carregamento de tipos de envelope no EnvelopeBoard não causa loop nem remontagem indevida da Home; nome da tabela de tipos consistente entre código e banco.

## L) ASSUNÇÕES (máx. 5)

- A causa mais provável do loop é a reexecução repetida do useEffect em Home que chama fetchData() e monta as subscrições, devido a dependências instáveis: `user` (objeto) ou `fetchData` mudando de referência a cada re-render (ex.: quando o AuthContext repassa um novo objeto de valor com o mesmo user), fazendo o efeito rodar de novo, setar isInitialLoading(true) e repetir o ciclo.
- Usar `user?.id` (string) em vez de `user` (objeto) nas dependências é suficiente para estabilizar o efeito, pois o id do usuário logado não muda durante a sessão na Dashboard.
- addToast (ToastContext) é estável (useCallback com deps estáveis); não é a causa do loop; mantê-lo nas deps de fetchData é aceitável.
- O fetch em si (envelopeService.getAll(), transactionService.getAll()) não está em loop por parte do backend; o problema é a reexecução do efeito no front-end.
- A inconsistência de nome de tabela (envelope_type vs envelope_types) pode causar erro no EnvelopeBoard ao carregar tipos, mas não é a causa direta do loop na Home; mesmo assim, alinhar o nome evita erros e comportamentos estranhos após a correção do loop.

=== /SPEC ===
