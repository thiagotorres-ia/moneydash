# Plano de Execução – Tarefa 1: Criar estrutura shared/

Conforme o plano de migração feature-based e a regra [feature-based-folders.mdc](.cursor/rules/feature-based-folders.mdc).  
**Logo não será movido para shared/** nesta tarefa (ficará em app/ na Tarefa 2).

---

## Objetivo

Criar `src/shared/` com componentes, contextos, utils, lib, types e constants genéricos; atualizar todos os imports para `@/shared`; remover os arquivos originais. Ao final, a aplicação deve continuar funcional (build e dev server OK).

---

## Escopo

### O que entra em shared/

| Categoria    | Arquivos originais | Destino em shared/ |
|-------------|--------------------|--------------------|
| Componentes | Button, Input, Modal, ConfirmModal, SearchableSelect, ThemeToggle, RouteErrorBoundary | `shared/components/<Nome>.tsx` |
| Contextos   | ToastContext, ThemeContext | `shared/contexts/ToastContext.tsx`, `shared/contexts/ThemeContext.tsx` |
| Utils       | format.ts | `shared/utils/format.ts` |
| Lib         | supabase.ts | `shared/lib/supabase.ts` |
| Types       | Extrair de types.ts | `shared/types/shared.types.ts` |
| Constants   | constants.ts | `shared/constants.ts` |
| Barrel      | — | `shared/index.ts` |

### O que NÃO é alterado na Tarefa 1

- `src/types.ts` — permanece com os tipos de domínio (Envelope, Category, Transaction, etc.) até as tarefas das features.
- `src/components/Logo.tsx` — permanece no lugar; será movido para app/ na Tarefa 2.
- `src/App.tsx`, `src/main.tsx`, `src/pages/*`, `src/contexts/AuthContext.tsx`, demais componentes de domínio — apenas terão imports atualizados.

---

## Tipos em shared.types.ts

Extrair de `src/types.ts` para `src/shared/types/shared.types.ts` **apenas**:

- `User`
- `ThemeContextType`
- `Theme` (enum)
- `ToastType`
- `Toast`
- `ToastContextType`

Manter em `src/types.ts` (não mexer nesta tarefa): AuthContextType, EnvelopeTypeRecord, Envelope, CategoryType, Category, Subcategory, TransactionType, Transaction, EnvelopeTransferLogEntry, EnvelopeTransferPayload.

---

## Ordem de execução (passo a passo)

### Fase 1: Criar pastas e arquivos em shared/

1. **Criar estrutura de pastas**
   - `src/shared/components/`
   - `src/shared/contexts/`
   - `src/shared/utils/`
   - `src/shared/lib/`
   - `src/shared/types/`

2. **Criar shared/types/shared.types.ts**
   - Conteúdo: User, ThemeContextType, Theme, ToastType, Toast, ToastContextType (copiar de types.ts).
   - Não importar de `../types`; arquivo autocontido.

3. **Mover/copiar componentes**
   - Copiar conteúdo de cada arquivo abaixo para o destino indicado; em seguida ajustar **apenas** os imports internos do próprio arquivo para usar `@/shared` onde fizer sentido (ou imports relativos dentro de shared).
   - `src/components/Button.tsx` → `src/shared/components/Button.tsx` (sem dependências de outros módulos locais)
   - `src/components/Input.tsx` → `src/shared/components/Input.tsx`
   - `src/components/Modal.tsx` → `src/shared/components/Modal.tsx` (Modal importa Button → `import { Button } from '../components/Button'` ou `@/shared`; usar `@/shared` para consistência)
   - `src/components/ConfirmModal.tsx` → `src/shared/components/ConfirmModal.tsx` (verificar se usa Button/outros; ajustar import para `@/shared`)
   - `src/components/SearchableSelect.tsx` → `src/shared/components/SearchableSelect.tsx` (usa Envelope do types — SearchableSelect recebe `options` genéricas com `id` e `name`; hoje tipa com Envelope. Manter interface genérica ou importar tipo de `@/types` por enquanto para não quebrar. Melhor: usar tipo genérico `{ id: string; name: string }` em shared e deixar quem chama passar; assim shared não importa de types. Ajustar no componente.)
   - `src/components/ThemeToggle.tsx` → `src/shared/components/ThemeToggle.tsx` (importa useTheme de ThemeContext → `import { useTheme } from '../contexts/ThemeContext'` ou `@/shared`)
   - `src/components/RouteErrorBoundary.tsx` → `src/shared/components/RouteErrorBoundary.tsx` (importa Button → `@/shared`)

   Dentro de shared, preferir imports relativos entre pastas de shared (ex.: `../contexts/ThemeContext`) para evitar dependência circular com barrel. Ou importar do barrel `@/shared` se o barrel exportar tudo (pode causar circular). **Recomendação:** dentro de shared usar apenas relativos (ex.: `../contexts/ThemeContext`, `./Button`).

4. **Mover contextos**
   - `src/contexts/ToastContext.tsx` → `src/shared/contexts/ToastContext.tsx`  
     - Trocar `import { ToastContextType, Toast, ToastType } from '../types'` por `import type { ToastContextType, Toast, ToastType } from '../types/shared.types'`.
   - `src/contexts/ThemeContext.tsx` → `src/shared/contexts/ThemeContext.tsx`  
     - Trocar `import { ThemeContextType, Theme } from '../types'` por `import type { ThemeContextType, Theme } from '../types/shared.types'`.

5. **Mover utils e lib**
   - `src/utils/format.ts` → `src/shared/utils/format.ts` (sem imports locais).
   - `src/lib/supabase.ts` → `src/shared/lib/supabase.ts` (sem imports de types).

6. **Mover constants**
   - `src/constants.ts` → `src/shared/constants.ts` (sem imports).

7. **Criar shared/index.ts (barrel)**
   - Exportar: Button, Input, Modal, ConfirmModal, SearchableSelect, ThemeToggle, RouteErrorBoundary (de components).
   - Exportar: ToastProvider, useToast, ThemeProvider, useTheme (de contexts).
   - Exportar: formatCurrency, formatDate (de utils).
   - Exportar: supabase (de lib).
   - Exportar: APP_NAME, MOCK_CREDENTIALS (de constants).
   - Exportar types: User, Theme, ThemeContextType, Toast, ToastType, ToastContextType.

   Exemplo:

   ```ts
   export { Button } from './components/Button';
   export { Input } from './components/Input';
   export { Modal } from './components/Modal';
   export { ConfirmModal } from './components/ConfirmModal';
   export { SearchableSelect } from './components/SearchableSelect';
   export { ThemeToggle } from './components/ThemeToggle';
   export { RouteErrorBoundary } from './components/RouteErrorBoundary';
   export { ToastProvider, useToast } from './contexts/ToastContext';
   export { ThemeProvider, useTheme } from './contexts/ThemeContext';
   export { formatCurrency, formatDate } from './utils/format';
   export { supabase } from './lib/supabase';
   export { APP_NAME, MOCK_CREDENTIALS } from './constants';
   export type { User, ThemeContextType, Theme, ToastType, Toast, ToastContextType } from './types/shared.types';
   ```

---

### Fase 2: Atualizar imports em todo o projeto

Atualizar **somente** os arquivos que importam algo que passou para shared. Não alterar ainda imports de AuthContext, Navbar, Logo, páginas, ou tipos de domínio (Category, Envelope, etc.) — esses continuam em seus caminhos atuais.

**Regra:** Qualquer import que aponte para:
- `./contexts/ThemeContext` ou `./contexts/ToastContext`
- `./components/Button`, `./components/Input`, `./components/Modal`, `./components/ConfirmModal`, `./components/SearchableSelect`, `./components/ThemeToggle`, `./components/RouteErrorBoundary`
- `./lib/supabase`
- `./utils/format`
- `./constants`

deve ser substituído por import a partir de `@/shared`.

Lista de arquivos e alterações:

| Arquivo | Alterações de import |
|---------|------------------------|
| `src/App.tsx` | `./contexts/ThemeContext` → `@/shared`; `./contexts/ToastContext` → `@/shared`; `./components/RouteErrorBoundary` → `@/shared`. Manter Auth e páginas. |
| `src/contexts/AuthContext.tsx` | `../lib/supabase` → `@/shared`. Manter `../types` (User, AuthContextType) em types.ts. |
| `src/components/Navbar.tsx` | `../constants` (APP_NAME) → `@/shared`. Manter AuthContext. |
| `src/pages/Login.tsx` | Input, Button, ThemeToggle, APP_NAME, Logo: Button, Input, ThemeToggle, APP_NAME → `@/shared`; Logo permanece `../components/Logo`. |
| `src/pages/Home.tsx` | Modal, Button, useToast, supabase → `@/shared`. Manter Navbar, EnvelopeBoard, FinancialSummary, TransactionTable, types, services, AuthContext. |
| `src/pages/CategoryManagement.tsx` | Navbar, useToast, Button → useToast, Button de `@/shared`. Navbar e CategoryModal permanecem relativos. |
| `src/pages/EnvelopeManagement.tsx` | useToast, formatCurrency, Button, EnvelopeModal, Modal, Input → useToast, formatCurrency, Button, Modal, Input de `@/shared`. Navbar e EnvelopeModal permanecem. |
| `src/pages/EnvelopeTypeManagement.tsx` | Navbar, useToast, Button, EnvelopeTypeModal, Modal → useToast, Button, Modal de `@/shared`. Navbar e EnvelopeTypeModal permanecem. |
| `src/pages/SpendingByCategoryReport.tsx` | Navbar, Button, formatCurrency, useToast → Button, formatCurrency, useToast de `@/shared`. Navbar permanece. |
| `src/components/CategoryModal.tsx` | Modal, Input, Button, useToast → `@/shared`. Manter categoryService e types. |
| `src/components/EnvelopeBoard.tsx` | formatCurrency, Button, Modal, Input, SearchableSelect → `@/shared`. Manter types e envelopeTypeService. |
| `src/components/EnvelopeModal.tsx` | Modal, Input, Button, useToast → `@/shared`. Manter envelopeService e types. |
| `src/components/EnvelopeTypeModal.tsx` | Modal, Input, Button, useToast → `@/shared`. Manter envelopeTypeService e types. |
| `src/components/TransactionModal.tsx` | Modal, Button, Input, SearchableSelect, useToast → `@/shared`. Manter types. |
| `src/components/TransactionTable.tsx` | formatCurrency, formatDate, Button, Modal, SearchableSelect, ConfirmModal, useToast → `@/shared`. Manter types e TransactionModal. |
| `src/components/FinancialSummary.tsx` | formatCurrency → `@/shared`. Manter types. |
| `src/components/CreateTransactionModal.tsx` | Modal, useToast → `@/shared`. Manter types. |
| `src/components/RouteErrorBoundary.tsx` | Será removido após mover para shared; não precisa atualizar (já está em shared). |
| `src/services/categoryService.ts` | supabase → `@/shared`. Manter types. |
| `src/services/envelopeService.ts` | supabase → `@/shared`. Manter types. |
| `src/services/envelopeTypeService.ts` | supabase → `@/shared`. Manter types. |
| `src/services/transactionService.ts` | supabase → `@/shared`. Manter types. |
| `src/services/transferLogService.ts` | supabase → `@/shared`. Manter types. |

**SearchableSelect:** hoje em `SearchableSelect.tsx` há `import { Envelope } from '../types'` para tipar options. Em shared, o componente não deve depender de tipos de domínio. Opções: (a) tipar como `Array<{ id: string; name: string }>` em shared e manter uso nos call sites com Envelope/Category; (b) usar genérico `<T extends { id: string; name: string }>`. Fazer (a) ou (b) ao mover para shared e ajustar os arquivos que usam SearchableSelect (EnvelopeBoard, TransactionTable, TransactionModal) para continuar passando os arrays; os tipos de retorno podem continuar sendo Envelope/Category nos call sites.

---

### Fase 3: Ajustes internos em shared (evitar circular)

- **Modal.tsx** (em shared): se importar Button, usar `import { Button } from './Button'` (relativo dentro de components).
- **RouteErrorBoundary.tsx** (em shared): `import { Button } from './Button'`.
- **ThemeToggle.tsx** (em shared): `import { useTheme } from '../contexts/ThemeContext'`.
- **ConfirmModal.tsx**: verificar se usa Button; se sim, `import { Button } from './Button'`.

Assim, nenhum arquivo dentro de shared importa `@/shared` (evita circular com o barrel).

---

### Fase 4: Remover arquivos antigos

Após confirmar que todos os imports do projeto apontam para `@/shared` e que não resta referência aos caminhos antigos:

- Remover: `src/components/Button.tsx`, `Input.tsx`, `Modal.tsx`, `ConfirmModal.tsx`, `SearchableSelect.tsx`, `ThemeToggle.tsx`, `RouteErrorBoundary.tsx`.
- Remover: `src/contexts/ToastContext.tsx`, `src/contexts/ThemeContext.tsx`.
- Remover: `src/utils/format.ts`, `src/lib/supabase.ts`, `src/constants.ts`.

**Não remover:** `src/types.ts`, `src/components/Logo.tsx`, `src/contexts/AuthContext.tsx`, demais componentes e páginas.

---

### Fase 5: Validação

1. `npm run build` — deve concluir sem erros.
2. `npm run lint` — sem erros.
3. `npm run dev` — abrir app no browser: login, home, uma ação (ex.: abrir modal de transação). Smoke test manual.

Se algo quebrar: reverter remoções e checar imports (paths e nomes exportados no barrel).

---

## Resumo de arquivos

**Criados:**  
`src/shared/types/shared.types.ts`, `src/shared/components/Button.tsx`, `Input.tsx`, `Modal.tsx`, `ConfirmModal.tsx`, `SearchableSelect.tsx`, `ThemeToggle.tsx`, `RouteErrorBoundary.tsx`, `src/shared/contexts/ToastContext.tsx`, `ThemeContext.tsx`, `src/shared/utils/format.ts`, `src/shared/lib/supabase.ts`, `src/shared/constants.ts`, `src/shared/index.ts`.

**Modificados (apenas imports):**  
`src/App.tsx`; `src/contexts/AuthContext.tsx`; `src/components/Navbar.tsx`, `CategoryModal.tsx`, `EnvelopeBoard.tsx`, `EnvelopeModal.tsx`, `EnvelopeTypeModal.tsx`, `TransactionModal.tsx`, `TransactionTable.tsx`, `FinancialSummary.tsx`, `CreateTransactionModal.tsx`; `src/pages/Login.tsx`, `Home.tsx`, `CategoryManagement.tsx`, `EnvelopeManagement.tsx`, `EnvelopeTypeManagement.tsx`, `SpendingByCategoryReport.tsx`; `src/services/categoryService.ts`, `envelopeService.ts`, `envelopeTypeService.ts`, `transactionService.ts`, `transferLogService.ts`.

**Removidos:**  
Os 7 componentes, 2 contextos, format.ts, supabase.ts e constants.ts listados na Fase 4.

---

## Riscos e teste sugerido

- **Risco:** Muitos pontos de import; um path ou export errado quebra o build.
- **Mitigação:** Fazer Fase 1 e 2, rodar build antes de remover arquivos; só então Fase 4.
- **Teste opcional:** Após Fase 4, executar um teste de automação de browser (login → home → abrir modal de nova transação) se disponível; caso contrário, smoke test manual é suficiente.
