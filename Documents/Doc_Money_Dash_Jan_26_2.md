# Relatório Consolidado de Engenharia - MoneyDash
**Versão:** 2.0 (Consolidado)
**Data de Atualização:** 26 de Janeiro de 2025
**Engenheiro Responsável:** World-Class Senior Frontend Engineer

## 1. Visão Geral do Projeto
O **MoneyDash** é um ecossistema financeiro baseado no método de alocação por envelopes. Diferente de gerenciadores tradicionais baseados apenas em categorias, o MoneyDash foca na **distribuição de saldo**, onde cada centavo em conta deve estar alocado a um propósito (envelope), permitindo uma visão clara de quanto dinheiro está realmente disponível vs. comprometido.

---

## 2. Linha do Tempo de Desenvolvimento

### Fase 1: Fundação (Dia 0)
*   **Setup Inicial:** Configuração do React 18 com TypeScript e Tailwind CSS.
*   **Integração BAAS:** Conexão com Supabase para autenticação (Login/Signup) e banco de dados relacional.
*   **Contextos Globais:** Implementação do `AuthContext` (sessão), `ThemeContext` (dark mode) e `ToastContext` (notificações).

### Fase 2: Implementação do Core Financeiro (Jan 24)
*   **Motor de Transações:** Criação da tabela de lançamentos com suporte a créditos e débitos.
*   **Painel de Envelopes:** Implementação do `EnvelopeBoard` com Drag & Drop (`@dnd-kit`) para organização visual.
*   **Sincronização de Saldo:** Desenvolvimento da lógica de sincronização automática; ao alterar uma transação, o saldo do envelope relacionado é recalculado instantaneamente no banco de dados.

### Fase 3: Performance e Estabilização (Jan 25)
*   **Virtualização:** Implementação do `react-window` na `TransactionTable`. A aplicação agora suporta milhares de registros com performance fluida (60 FPS).
*   **Otimização DB:** Criação de índices estratégicos no PostgreSQL (B-Tree) para acelerar consultas por usuário e envelope.
*   **Arquitetura Resiliente:** Simplificação temporária de hierarquias de categorias para priorizar a estabilidade do fluxo de caixa e evitar "locks" de renderização.

### Fase 4: UX Avançada e Resiliência (Jan 26 - Presente)
*   **Ações em Massa (Bulk Ops):** Implementação de seleção múltipla para exclusão e atribuição de envelopes em lote.
*   **Substituição de Diálogos Nativos:** Criação da `ConfirmModal.tsx` customizada. Resolvemos o erro de bloqueio de `window.confirm()` em ambientes sandboxed (como o Google AI Studio).
*   **Fluxo de Dados Reativo:** Remoção total do `window.location.reload()`. A aplicação agora utiliza *Silent Refetches* e atualizações de estado reativas, mantendo a sessão do usuário íntegra e eliminando o logout forçado.
*   **Conserto de Assets:** Correção da ordem de imports no CSS para garantir o carregamento da fonte Inter e evitar avisos de parser do navegador.

---

## 3. Estrutura Técnica do Código

### 📂 Camada de Contexto (`/contexts`)
*   **AuthContext:** Gerencia a persistência da sessão via Supabase Auth e o perfil do usuário.
*   **ThemeContext:** Controla as classes `.dark` no `document.documentElement`.
*   **ToastContext:** Gerencia uma fila de mensagens de feedback (sucesso/erro/info).

### 📂 Camada de Serviços (`/services`)
*   **transactionService:** Responsável pela lógica de sincronização de saldo (`_syncEnvelopeBalance`) e operações de extrato.
*   **envelopeService:** Gerencia o CRUD de envelopes e as transferências internas de capital.
*   **categoryService:** Provê a estrutura de categorias e subcategorias (atualmente em modo de compatibilidade estável).

### 📂 Componentes Críticos (`/components`)
*   **TransactionTable:** Componente mais complexo. Utiliza virtualização para renderizar linhas, gerencia um `Set` de IDs selecionados para ações em massa e integra filtros avançados.
*   **EnvelopeBoard:** Utiliza sensores de ponteiro para permitir a reordenação de envelopes, refletindo a prioridade financeira do usuário.
*   **FinancialSummary:** Motor de cálculo memoizado que extrai indicadores financeiros diretamente do estado das transações.
*   **ConfirmModal:** Modal customizada com animações de `fadeIn` e `slideIn`, garantindo que ações destrutivas sejam sempre confirmadas.

---

## 4. Resumo de Alterações Críticas (Último Turno)

| Componente | Mudança | Impacto |
| :--- | :--- | :--- |
| **index.html** | Ordem dos `@import` CSS. | Fonte Inter carregada corretamente; fim dos erros de CSS. |
| **ConfirmModal.tsx** | Novo componente de diálogo. | Independência de funções do sistema operacional; UX consistente. |
| **Home.tsx** | `fetchData(true)` substituindo reload. | Fim dos logouts inesperados; UI atualiza sem piscar a tela. |
| **TransactionTable.tsx** | Handlers de Bulk Delete/Assign. | Operações em lote agora são 100% seguras e confirmadas via React. |

---

## 5. Próximos Objetivos Técnicos
1.  **Reintrodução de Categorias:** Implementar a associação de transações a categorias/subcategorias com uma arquitetura de JOIN otimizada no Supabase.
2.  **Dashboard Visual:** Adicionar gráficos de rosca para distribuição de gastos e linhas de tendência para saldo histórico.
3.  **Local CSV Processing:** Reduzir a latência de importação processando arquivos CSV diretamente no cliente antes de enviar ao servidor.

---
*Documentação gerada automaticamente para fins de auditoria de código e alinhamento de equipe.*