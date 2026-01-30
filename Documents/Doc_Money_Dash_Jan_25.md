# Relatório de Arquitetura e Estado do Projeto - MoneyDash (25 de Janeiro)

## 1. Contexto Histórico e Evolução
O **MoneyDash** evoluiu de um simples gestor de gastos para uma plataforma robusta de alocação financeira baseada no "Método dos Envelopes".

*   **Início:** Foco na interface limpa e integração básica com Supabase.
*   **Janeiro/2024:** Introdução de funcionalidades complexas como Drag & Drop e Virtualização de tabelas. Foram corrigidos bugs críticos de arredondamento e sincronização de saldo.
*   **Estado Atual (25 de Janeiro):** Após episódios de instabilidade (looping de carregamento e locks no banco de dados), a aplicação foi simplificada. Removemos temporariamente a lógica pesada de categorias relacionais para garantir que o **Core Financeiro (Envelopes e Transações)** funcione com 100% de disponibilidade e performance.

## 2. Visão Geral da Tecnologia
- **Frontend:** React 18 com Context API para estado global.
- **Backend:** Supabase (PostgreSQL + Auth + Realtime).
- **Estilização:** Tailwind CSS com suporte a Dark Mode.
- **Componentes:** Lucide-React para ícones e @dnd-kit para interatividade.

## 3. Guia de Arquivos e Componentes

### 📂 Raiz do Projeto
- `App.tsx`: Gerente de rotas. Define o que é público (Login) e o que é protegido (Home), além de injetar os provedores de Contexto.
- `index.tsx`: Ponto de entrada que monta a aplicação React no DOM.
- `types.ts`: "Cérebro" da tipagem. Define as interfaces de Envelopes, Transações e Usuários, garantindo consistência em todo o código.
- `constants.ts`: Armazena valores globais como o nome da aplicação.
- `metadata.json`: Metadados da aplicação para a plataforma.

### 📂 Contextos (Estado Global)
- `contexts/AuthContext.tsx`: Gerencia login, cadastro e sessão do usuário com o Supabase.
- `contexts/ThemeContext.tsx`: Controla a alternância entre modo claro e escuro, persistindo a preferência no navegador.
- `contexts/ToastContext.tsx`: Sistema de notificações flutuantes para feedback ao usuário.

### 📂 Serviços (Lógica de Negócio e API)
- `services/envelopeService.ts`: Lida com CRUD de envelopes e a lógica de transferência de saldo entre eles.
- `services/transactionService.ts`: O módulo mais crítico. Gerencia lançamentos e garante que o saldo dos envelopes seja recalculado automaticamente no banco de dados.
- `services/categoryService.ts`: Atualmente simplificado (stub) para evitar queries complexas que causavam instabilidade.

### 📂 Componentes (UI)
- `components/EnvelopeBoard.tsx`: Painel visual onde os envelopes são exibidos e organizados via Drag and Drop.
- `components/TransactionTable.tsx`: Tabela de alta performance (virtualizada) para listagem de milhares de transações sem lentidão.
- `components/FinancialSummary.tsx`: Cards de resumo que mostram o Saldo Total, Valor Comprometido e Disponível.
- `components/Navbar.tsx`: Barra de navegação com perfil do usuário, troca de tema e botão de logout.
- `components/Logo.tsx`: Identidade visual em SVG.
- `components/Modal.tsx`, `Button.tsx`, `Input.tsx`: Componentes base de interface seguindo o design system.
- `components/SearchableSelect.tsx`: Seletor inteligente usado para vincular transações a envelopes de forma rápida.

### 📂 Páginas
- `pages/Login.tsx`: Interface de acesso e criação de conta.
- `pages/Home.tsx`: O dashboard principal que orquestra a busca de dados e a integração entre Envelopes e Transações.

## 4. Status de Estabilidade
A aplicação encontra-se em modo **Resiliente**. Queries pesadas de `JOIN` entre transações e categorias foram removidas para evitar o "looping infinito" relatado em versões anteriores. O sistema agora foca em uma comunicação direta e rápida com o Supabase, garantindo que o usuário consiga gerenciar seu dinheiro sem travamentos.

---
*Gerado pelo Especialista em Engenharia MoneyDash em 25/01.*