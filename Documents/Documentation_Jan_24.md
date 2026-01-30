
# Relatório de Varredura do Projeto - MoneyDash (24 de Jan)

Este documento fornece um resumo detalhado do estado atual da aplicação, arquitetura de software, funcionalidades implementadas e resolução de problemas técnicos.

## 1. Arquitetura do Sistema
A aplicação segue uma arquitetura moderna de **Single Page Application (SPA)** com separação clara de responsabilidades:

- **Camada de Interface (UI):** Desenvolvida em React 18, utilizando Tailwind CSS para estilização e Lucide React para iconografia. Suporte nativo a Dark Mode persistente via `ThemeContext`.
- **Camada de Gerenciamento de Estado:** Utilização de Context API para autenticação (`AuthContext`), notificações (`ToastContext`) e temas.
- **Camada de Serviços (API):** Modularizada em arquivos específicos (`envelopeService`, `transactionService`, `categoryService`) que interagem diretamente com o **Supabase (PostgreSQL)**.
- **Camada de Dados:** Estrutura relacional no Supabase com tabelas para Perfis, Envelopes, Transações, Categorias e Subcategorias.

## 2. Funcionalidades Implementadas até o Momento

### 🟢 Gestão de Envelopes (Método de Alocação)
- CRUD completo de envelopes.
- Painel interativo com **Drag & Drop** para organização visual.
- Lógica de transferência de saldo entre envelopes com geração automática de histórico de transações.

### 🟢 Gestão de Lançamentos (Transações)
- Tabela de alta performance com **Virtualização** (`react-window`) para suportar grandes volumes de dados.
- Filtros em tempo real por descrição e categorias.
- Sistema de **Categorização Profunda**: Associação de transações a uma categoria e uma subcategoria específica.
- Importação de extratos via CSV integrada a webhooks externos.

### 🟢 Gestão de Categorias
- Interface dedicada para criação e edição de categorias e subcategorias.
- Gerenciamento de subcategorias (N-níveis reduzidos para 1 nível de profundidade).
- Seleção inteligente de categorias diretamente na tabela de transações com visual moderno e padronizado.

### 🟢 Segurança e Realtime
- Fluxo completo de Autenticação (Login/Signup/Logout).
- **Sincronização em Tempo Real:** A interface reflete mudanças feitas por outros dispositivos ou diretamente no banco de dados através de `Supabase Realtime Channels`.

## 3. Histórico de Problemas e Correções (Jan/24)

| Problema Relatado | Causa Identificada | Status | Solução Aplicada |
| :--- | :--- | :--- | :--- |
| **Erro ao cadastrar categoria** | Restrição `.single()` no Supabase e inconsistência de ID do usuário. | ✅ Resolvido | Removido `.single()` para evitar falhas de leitura imediata e garantida a injeção do `user_id`. |
| **Botão de Reload App** | A função não disparava o refresh nativo do navegador. | ✅ Resolvido | Implementado `window.location.reload()` no componente `Navbar`. |
| **Sincronização de Saldo** | Arredondamentos de ponto flutuante no JavaScript. | ✅ Resolvido | Implementado `Math.round(val * 100) / 100` no `transactionService`. |
| **Performance da Tabela** | Renderização excessiva de DOM em tabelas longas. | ✅ Resolvido | Implementada virtualização de lista para renderizar apenas itens visíveis. |
| **Inconsistência da coluna 'color'** | A coluna 'color' era referenciada no código mas não existia no banco de dados. | ✅ Resolvido | Removidas todas as referências à propriedade 'color' e padronizada a UI de categorias. |

## 4. Erros e Pendências Atuais
1. **Race Condition no Realtime:** Embora raro, o `fetchData(true)` pode ser disparado múltiplas vezes em sucessão rápida durante atualizações em massa.
2. **Tipagem de Bibliotecas Externas:** Algumas bibliotecas como `react-window` e `auto-sizer` exigem `@ts-ignore` devido à ausência de definições de tipos ESM atualizadas.
3. **Validação de CSV:** A importação de CSV depende de um Webhook externo (n8n). Se o serviço estiver offline, a aplicação não fornece um modo "fallback" local.

---
*Assinado: Senior Frontend Engineer (Gemini API Expert)*
