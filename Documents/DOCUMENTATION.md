# MoneyDash - Dashboard Financeiro Inteligente

Este documento fornece uma visão técnica e funcional do estado atual da aplicação **MoneyDash**.

## 1. Visão Geral
O **MoneyDash** é uma plataforma de controle financeiro baseada no método de "Envelopes". O objetivo é permitir que o usuário distribua seu saldo total em categorias específicas (envelopes), garantindo que cada real tenha um propósito definido.

## 2. Pilha Tecnológica (Tech Stack)
- **Frontend:** React 18 (Hooks, Context API).
- **Estilização:** Tailwind CSS (com suporte nativo a Dark Mode).
- **Backend/BAAS:** Supabase (Auth, PostgreSQL, Realtime Subscriptions).
- **Iconografia:** Lucide React.
- **Roteamento:** React Router DOM (HashRouter).
- **Performance:** React Window (Virtualização de listas) e AutoSizer.
- **Interatividade:** @dnd-kit (Drag and Drop para organização de envelopes).

## 3. Estrutura de Arquivos
A aplicação segue uma estrutura modular e escalável:

- `/src` (Raiz)
    - `App.tsx`: Gerenciador de rotas e provedores de contexto.
    - `index.tsx`: Ponto de entrada da aplicação.
    - `types.ts`: Definições globais de interfaces TypeScript.
    - `constants.ts`: Constantes de configuração.
- `/contexts`: Gerenciamento de estado global.
    - `AuthContext.tsx`: Autenticação e perfil do usuário (Supabase).
    - `ThemeContext.tsx`: Controle de tema Claro/Escuro.
    - `ToastContext.tsx`: Sistema de notificações (Toasts).
- `/services`: Comunicação com APIs externas.
    - `envelopeService.ts`: CRUD e transferências de saldo entre envelopes.
    - `transactionService.ts`: Gestão de lançamentos e sincronização automática de saldos.
- `/components`: Componentes de UI reutilizáveis e modulares.
    - `EnvelopeBoard.tsx`: Painel interativo com Drag & Drop.
    - `TransactionTable.tsx`: Tabela virtualizada com filtros avançados e importação.
    - `FinancialSummary.tsx`: Cards de indicadores (Saldo, Distribuído, Disponível).
    - `Navbar.tsx`, `Button.tsx`, `Input.tsx`, `Modal.tsx`, `Logo.tsx`.
- `/utils`: Funções auxiliares.
    - `format.ts`: Formatadores de moeda (BRL) e datas.
- `/lib`: Configurações de bibliotecas.
    - `supabase.ts`: Inicialização do cliente Supabase.

## 4. Funcionalidades Principais (Features)

### 🟢 Gestão de Envelopes
- Criação, edição e exclusão de envelopes categorizados (Rotina, Fixo, Investimento, etc).
- Organização visual via Drag and Drop.
- Transferência direta de saldo entre envelopes.

### 🟢 Lançamentos (Transações)
- Tabela de alta performance capaz de lidar com milhares de registros (Virtualização).
- Filtros por texto, data e status (Não distribuídos).
- **Ações em Massa:** Seleção múltipla para mover transações entre envelopes de uma só vez.
- Sincronização automática: ao criar/deletar/mover uma transação, o saldo do envelope é recalculado no banco de dados.

### 🟢 Importação de Dados
- Upload de arquivos CSV.
- Integração via Webhook (n8n) para processamento externo de extratos bancários.
- Fluxo de feedback com contagem de registros importados.

### 🟢 Interface e Experiência (UX/UI)
- **Dark Mode:** Suporte completo e persistente.
- **Realtime:** Atualização instantânea da interface quando dados mudam no banco (via Supabase Channels).
- **Segurança:** Rotas protegidas; o usuário só acessa o dashboard após autenticação.
- **Resiliência:** Tratamento de erros de conexão e estados de "Loading" otimizados para evitar loops de carregamento.

## 5. Alterações Recentes e Correções
1. **Estabilização do Auth:** Correção do loop infinito no logout e no carregamento inicial da sessão.
2. **Performance da Tabela:** Implementação do `react-window` para garantir fluidez mesmo com grandes volumes de dados.
3. **Lógica de Saldo:** Centralização do recálculo de saldo no `transactionService`, eliminando inconsistências de ponto flutuante.
4. **Resiliência de Dados:** Implementação de `isMounted` refs e carregamentos "silenciosos" (Silent Refresh) para uma navegação sem travamentos.

---
*Gerado automaticamente pelo Assistente de Engenharia MoneyDash.*
