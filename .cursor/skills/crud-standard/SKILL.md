# crud-standard

Objetivo: padronizar implementação de CRUDs no repo (Node + React + Tailwind + Supabase).

Esta skill é genérica. Use-a para qualquer entidade (ex.: accounts, payees, tags, budgets, categories etc.).
Ela não define a entidade em si; define como construir um CRUD com qualidade e manutenção.

## Padrão mínimo de CRUD (obrigatório)
- Listar (com filtros/paginação se o repo tiver padrão)
- Consultar por id (ou carregar para edição)
- Criar
- Editar
- Deletar (com regra explícita: hard delete / soft delete / bloqueios por FK)

## Regras de dados (Supabase/Postgres)
- Prefira integridade no banco quando fizer sentido:
  - constraints de unicidade
  - FKs e regras de delete
- Validação server-side sempre que houver backend.
- Normalização recomendada:
  - trim em strings
  - tratar case-insensitive quando necessário (se o repo suportar)
- Defina claramente:
  - o que acontece com registros dependentes (bloqueia? cascata? soft delete?)

## Padrão de erros (genérico)
- 400: validação (campos obrigatórios, formato)
- 404: não encontrado
- 409: conflito (duplicidade/unique)
- 500: erro inesperado
- 401/403: autenticação/autorização (se existir no repo)

## UI padrão (React + Tailwind)
- Uma tela de gerenciamento com:
  - listagem
  - ação “novo”
  - ação “editar”
  - ação “excluir” com confirmação
- Estados obrigatórios:
  - loading
  - empty
  - error
  - success feedback (toast/alert se houver padrão)
- Form:
  - validação básica no client (mas nunca só no client)
  - mensagens amigáveis

## Testes mínimos (se o repo tiver infra)
- Happy path: create + list
- Um edge case: duplicidade (409) ou validação (400)
- Evidência de comandos rodados

## Como usar junto do Spec
- No Spec, exija:
  - contratos e payloads
  - regras de delete
  - constraints e índices
  - checklist de aceite

## Evidências obrigatórias
- Arquivos tocados + resumo por arquivo
- Comandos rodados (dev/lint/test/build se existirem)
- Checklist final marcado
