# SPEC v1 – Correção: Login em carregamento indefinido

=== SPEC v1 ===

## A) CONTEXTO E OBJETIVO

- **Problema:** Ao digitar credenciais e submeter o login, a aplicação fica em processo de carregamento (“Carregando MoneyDash…”) por tempo indeterminado, sem redirecionar para o dashboard nem exibir erro.
- **Suspeita:** Ajustes feitos pelo agente builder para correção de problemas ao editar tipo de envelope podem ter introduzido efeito colateral no fluxo de login.
- **Objetivo:** Garantir que o login sempre finalize o estado de carregamento (sucesso ou erro) e que falhas no pós-login (ex.: busca de perfil) não deixem a UI travada.

## B) ESCOPO

- **INCLUI:**
  - Corrigir o fluxo de autenticação para que `isLoading` do AuthContext nunca fique indefinidamente `true` após tentativa de login.
  - Proteger o callback de `onAuthStateChange` para que erros ou demora em `fetchProfile` não impeçam a atualização de `isLoading`.
  - Adicionar failsafe (timeout) na função `login` para que, em caso de `signInWithPassword` nunca resolver, o usuário deixe de ver o loader e receba feedback (ex.: erro de timeout).
  - Verificar e documentar inconsistência de nome de tabela (envelope_type vs envelope_types) que pode causar erros em outras telas; corrigir se for a causa raiz do problema.
- **NÃO INCLUI:**
  - Alterar fluxo de signup ou logout além do necessário para consistência.
  - Implementar retry automático ou lógica nova de autenticação (ex.: refresh token customizado).

## C) REQUISITOS FUNCIONAIS

- Após submeter credenciais na tela de login, uma das três situações deve ocorrer em tempo finito: (1) redirecionamento para a rota protegida (ex.: `/`) com usuário logado; (2) permanência na tela de login com mensagem de erro exibida; (3) em caso de timeout ou falha não tratada, fim do loader e mensagem de erro acionável (ex.: “Tempo esgotado. Tente novamente.”).
- O estado global de loading de autenticação (`isLoading`) não pode permanecer `true` indefinidamente após o usuário acionar login.
- Qualquer erro ou rejeição dentro do callback de `onAuthStateChange` (em especial em `fetchProfile`) não pode impedir que `isLoading` seja setado para `false`.

## D) REQUISITOS NÃO-FUNCIONAIS

- **Observabilidade mínima:** Em desenvolvimento, logar (console) timeout de login e erros no callback de auth (sem dados sensíveis).
- **Segurança:** Não alterar validação de credenciais nem expor detalhes internos ao usuário final.
- **Performance básica:** Timeout de login deve ser configurável (ex.: 15–20 s) e não bloquear a thread.
- **Acessibilidade (se UI):** Mensagens de erro devem ser lidas por leitores de tela; botão de tentar novamente deve ser focável.

## E) CONTRATOS (API / FUNÇÕES)

- **AuthContext (fluxo existente):**
  - `login(email, pass)`: deve sempre concluir (resolve ou reject) e, em qualquer saída (sucesso, erro ou timeout), garantir que `isLoading` seja setado para `false`.
  - Callback de `supabase.auth.onAuthStateChange`: ao tratar `SIGNED_IN` ou `TOKEN_REFRESHED`, deve chamar `setIsLoading(false)` em todos os caminhos (sucesso, erro ou rejeição de `fetchProfile`), por exemplo via `try/finally` ou equivalente.
- **Erros esperados:**
  - 400: credenciais inválidas (já tratado pelo Supabase; exibir mensagem ao usuário).
  - 401/403: falha de autenticação ou permissão (ex.: RLS em `profiles`); não deixar loading indefinido.
  - 404: perfil não encontrado; usar fallback (metadata) e ainda assim setar usuário e `isLoading = false`.
  - 500 / rede / timeout: exibir mensagem genérica e garantir `isLoading = false`.

## F) DADOS / SCHEMAS (SUPABASE)

- **Tabelas envolvidas no login:** `auth.users` (Supabase Auth), `public.profiles` (usada em `fetchProfile` no AuthContext).
- **Relevante:** A tabela de tipos de envelope no migration 003 foi criada como `public.envelope_type` (singular); o código em `envelopeTypeService.ts` e o script RLS em `004_envelope_types_rls_policies.sql` referenciam `envelope_types` (plural). Essa inconsistência **não** é a causa direta do login travado (o login só usa `profiles`), mas pode causar falhas em telas que carregam tipos (ex.: Home com EnvelopeBoard). Se o builder tiver criado/renomeado tabelas ou triggers que afetem `profiles` ou a sessão, reverter ou ajustar.
- **Regras de integridade:** Garantir que `profiles` tenha política RLS de SELECT para o próprio usuário autenticado (`auth.uid() = id`), para que `fetchProfile` não falhe por RLS após login.

## G) UI / FLUXO

- **Telas/Componentes:** Tela de Login (`Login.tsx`), rota pública (`PublicRoute`), loader full-page (“Carregando MoneyDash…”).
- **Fluxo atual:** Usuário submete formulário → `login()` é chamado → `isLoading` = true → `PublicRoute` renderiza `FullPageLoader` → usuário vê loader. Em seguida, `signInWithPassword` resolve e `onAuthStateChange(SIGNED_IN)` dispara → `fetchProfile` → `setUser` → `setIsLoading(false)`. Se algo falhar ou nunca resolver, o loader pode ficar para sempre.
- **Estados desejados:** loading (durante login/refresh), success (redirecionamento), error (mensagem na tela de login), timeout (loader para, mensagem de tempo esgotado).
- **Confirmações e validações:** Manter validação de email/senha no formulário; após correção, nenhuma confirmação extra é obrigatória além da existente.

## H) VALIDAÇÕES E CASOS DE BORDA

- **signInWithPassword nunca resolve (rede lenta, Supabase indisponível):** timeout deve disparar, `isLoading` = false, mensagem de erro ou timeout exibida.
- **signInWithPassword rejeita (credenciais inválidas):** fluxo atual já trata no `catch` de `login()`; garantir que `finally` rode e `isLoading` = false.
- **onAuthStateChange dispara e fetchProfile lança exceção (ex.: tabela `profiles` ausente, RLS bloqueando):** callback deve usar `try/finally` (ou equivalente) e sempre chamar `setIsLoading(false)`; opcionalmente setar usuário a partir de `metadata` para permitir acesso ao app mesmo sem perfil.
- **Múltiplos eventos de auth em sequência:** garantir que um único “loading” não fique preso por um evento que nunca chama `setIsLoading(false)`.

## I) ARQUIVOS (paths) A CRIAR/ALTERAR

- **Alterar:**
  - `src/contexts/AuthContext.tsx`: (1) garantir que o callback de `onAuthStateChange` rode `setIsLoading(false)` em todos os caminhos (ex.: `try/finally` em volta do bloco que chama `fetchProfile` e depois `setIsLoading(false)`); (2) na função `login`, adicionar timeout (ex.: 15 s) que rejeita e no `finally` (ou no handler do timeout) chama `setIsLoading(false)` e opcionalmente `setError(...)`; (3) assegurar que o `finally` de `login()` sempre execute (já deve ocorrer; apenas revisar).
- **Opcional (se for causa raiz):**
  - Alinhar nome da tabela de tipos: ou renomear no banco para `envelope_types` e manter RLS 004, ou alterar `envelopeTypeService.ts` e `004_envelope_types_rls_policies.sql` para usar `envelope_type`. Isso evita erros em Home/EnvelopeTypeManagement após o login ser corrigido.

## J) PLANO EM ETAPAS (CHECKPOINTS)

1. **Proteger onAuthStateChange:** Envolver em `try/finally` o bloco que, em `SIGNED_IN`/`TOKEN_REFRESHED`, chama `fetchProfile` e `setUser`, e chamar `setIsLoading(false)` no `finally`. Em caso de erro em `fetchProfile`, ainda assim preencher usuário com fallback (id, email, metadata) para não bloquear acesso.
2. **Failsafe no login:** Na função `login`, usar `Promise.race` (ou equivalente) entre `signInWithPassword` e um timeout (ex.: 15 s). Em caso de timeout, rejeitar com erro amigável e garantir `setIsLoading(false)` (e opcionalmente `setError`).
3. **Testes manuais:** Executar login com credenciais válidas, inválidas, e com rede desligada/simulação de timeout; verificar que o loader nunca fica indefinido e que mensagens de erro aparecem quando esperado.
4. **Verificar tabela de tipos (opcional):** Confirmar no Supabase se a tabela é `envelope_type` ou `envelope_types`; alinhar código e scripts SQL para evitar 42P01 em outras telas.

## K) CRITÉRIOS DE ACEITE (CHECKLIST)

- [ ] Após submeter login com credenciais válidas, o usuário é redirecionado para a rota protegida (ex.: `/`) e o loader some.
- [ ] Após submeter login com credenciais inválidas, o loader some e uma mensagem de erro é exibida na tela de login.
- [ ] Se `signInWithPassword` não resolver em até X segundos (ex.: 15), o loader some e é exibida mensagem de timeout ou falha de conexão.
- [ ] Se `fetchProfile` falhar (ex.: erro em `profiles`), o loader some; o usuário pode ser setado com fallback (metadata) ou a tela de login continua com opção de tentar novamente.
- [ ] Nenhum caminho do AuthContext deixa `isLoading` indefinidamente `true` após acionar login.
- [ ] (Opcional) Nome da tabela de tipos de envelope consistente entre migration, RLS e `envelopeTypeService`; sem erro 42P01 ao abrir Home ou Tipos de Envelope.

## L) ASSUNÇÕES (máx. 5)

- A causa mais provável do loader infinito é que `login()` seta `isLoading = true` e, por `signInWithPassword` nunca resolver ou por erro não tratado no callback de `onAuthStateChange`, `isLoading` nunca volta a `false`.
- O timeout de 5 segundos no `useEffect` do AuthContext aplica-se apenas à inicialização (`initSession`), não ao fluxo de login após submit; por isso um timeout específico no `login` é necessário.
- A tabela `profiles` existe e está acessível por RLS ao usuário autenticado; se não estiver, o fallback com metadata ainda permite concluir o fluxo sem travar o loader.
- Não há middleware ou interceptor no cliente Supabase que bloqueie respostas de auth; qualquer bloqueio é por rede ou por comportamento do Supabase.
- Ajustes no “editar tipo de envelope” não alteraram diretamente AuthContext nem `profiles`; o efeito colateral seria indireto (ex.: erro em outra parte do app que impeça o callback de auth de concluir, ou alteração acidental em AuthContext). A correção deve ser defensiva no próprio fluxo de login e `onAuthStateChange`.

=== /SPEC ===
