# Relatório Consolidado de Engenharia - MoneyDash
**Data de Atualização:** 26 de Janeiro de 2025
**Status do Projeto:** Estável / Resiliente / Alta Performance

## 1. Histórico de Evolução (Dia 0 ao Presente)

O projeto **MoneyDash** nasceu com a premissa de ser um dashboard financeiro minimalista focado no "Método dos Envelopes". Ao longo dos dias, a aplicação evoluiu de um MVP (Produto Mínimo Viável) para uma ferramenta robusta de gestão.

### Fase 1: Fundação e Autenticação (Dia 0 - Inicial)
*   Integração inicial com **Supabase** para Autenticação e Banco de Dados.
*   Criação das rotas protegidas e fluxo de sessão.
*   Estrutura base do Context API para Temas e Toasts.

### Fase 2: Gestão Financeira Core (Janeiro 24)
*   **Envelopes:** Implementação do sistema de alocação de saldo.
*   **Transações:** Criação da tabela de lançamentos com suporte a créditos e débitos.
*   **Performance:** Introdução da virtualização (`react-window`) para suportar milhares de registros sem perda de FPS.
*   **Precisão:** Correção de erros de arredondamento de ponto flutuante no cálculo de saldos.

### Fase 3: Estabilização e Simplificação (Janeiro 25)
*   **Modo Resiliente:** Devido a instabilidades causadas por queries relacionais complexas (JOINs de categorias), a arquitetura foi simplificada.
*   **Foco no Core:** Remoção temporária de categorias complexas para garantir 100% de disponibilidade no fluxo de Envelopes e Transações.
*   **Otimização DB:** Aplicação de índices de performance no PostgreSQL para otimizar buscas por `user_id` e `envelope_id`.

### Fase 4: Ações em Massa e Filtros Avançados (Janeiro 26 - Hoje)
*   **Bulk Operations:** Implementação de exclusão e atribuição de envelope para múltiplas transações simultâneas.
*   **UX de Seleção:** Adição de checkboxes, barra de ações flutuante e modal de atribuição simplificado para maior confiabilidade.
*   **Filtro "Órfão":** Adição de filtro para identificar rapidamente transações sem envelope vinculado.

---

## 2. Arquitetura Atual do Sistema

### Frontend (React 18 + TypeScript)
*   **Contextos:** 
    * `AuthContext`: Gerencia tokens de sessão e perfil.
    * `ThemeContext`: Persiste preferência Dark/Light Mode.
    * `ToastContext`: Feedback visual global.
*   **Componentes Principais:**
    * `TransactionTable`: Virtualizada, com lógica de seleção múltipla (usando `Set` para performance O(1)).
    * `EnvelopeBoard`: Painel interativo com Drag & Drop (`@dnd-kit`).
    * `FinancialSummary`: Motor de cálculo em tempo real baseado no estado das transações.
    * `SearchableSelect`: Componente híbrido para busca rápida de envelopes.

### Backend (Supabase / PostgreSQL)
*   **Realtime:** Subscrições em canais específicos garantem que a UI reflita mudanças de saldo instantaneamente.
*   **Serviços:** 
    * `transactionService`: Centraliza a sincronização automática entre transações e saldos de envelopes.
    * `envelopeService`: Gerencia transferências internas e movimentação de capital.

---

## 3. Estrutura de Dados (Core)

```typescript
interface Transaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;      // Sinalizado (+/-) na UI, absoluto no DB
  envelopeId: string | null;
}

interface Envelope {
  id: string;
  code: string;        // Ex: "ALIM", "FIXO"
  name: string;
  amount: number;      // Calculado via sincronização de transações
  type: EnvelopeType;  // routine, income, investment, fixed, temporary
}
```

---

## 4. Situação Atual e Próximos Passos

A aplicação está em seu estado mais estável. As operações em lote foram depuradas e agora contam com logs de auditoria no console para rastreamento técnico. O uso de componentes nativos em partes críticas (como o seletor de envelope em massa) garantiu que a ferramenta não falhe em cenários de alta densidade de dados.

**Próximos Marcos:**
1.  Reintrodução gradual de Categorias (com arquitetura otimizada).
2.  Processamento local de CSV (eliminando dependência total de webhooks externos).
3.  Gráficos de tendência temporal de gastos por envelope.

---
*Gerado e Consolidado pela Engenharia MoneyDash.*