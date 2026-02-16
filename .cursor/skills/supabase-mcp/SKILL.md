# Skill: Supabase via MCP (Money Dash)

## Objetivo
Conectar ao Supabase via MCP para inspecionar schema e executar operações no banco **com segurança** durante o desenvolvimento do Money Dash.

## Princípios de segurança (obrigatório)
1) **Read-only por padrão.** Comece sempre por inspeção e consultas SELECT.
2) **NUNCA exponha segredos** (tokens, anon keys, service keys, URLs privadas). Se precisar referenciar credenciais, use apenas nomes de variáveis de ambiente.
3) **Escritas e mudanças estruturais exigem permissão explícita do usuário** antes de executar:
   - INSERT / UPDATE / DELETE / UPSERT
   - TRUNCATE
   - ALTER / DROP / CREATE (tabelas, views, funções, políticas, índices, triggers, etc.)
   - GRANT / REVOKE
   - Qualquer operação que possa impactar dados, schema, permissões ou custos

## Conexão
- Use o servidor MCP chamado **`supabase`** (já configurado no projeto).
- Nunca tente “reconfigurar” o MCP automaticamente.
- Se o MCP não estiver disponível, informe o usuário o erro e o que você tentou fazer.

## Fluxo padrão (sempre seguir)
### A) Descoberta / leitura
1) Identifique o objetivo (ex.: “listar tabelas”, “ver colunas”, “buscar transações do mês”).
2) Inspecione schema antes de assumir nomes:
   - liste schemas/tabelas relevantes
   - descreva colunas e tipos
   - identifique PK/FK/índices/RLS quando aplicável
3) Execute consultas **SELECT** pequenas e paginadas (LIMIT), evitando varrer tabelas inteiras.

### B) Proposta antes de mudar algo (modo seguro)
Antes de qualquer operação de escrita/DDL, apresente:
- **Resumo do que vai mudar**
- **SQL exato** (ou operação exata) que pretende executar
- **Tabelas/objetos afetados**
- **Estimativa de impacto** (ex.: quantas linhas podem ser afetadas; se não souber, proponha um SELECT COUNT primeiro)
- **Plano de rollback** quando aplicável (ex.: transação, backup lógico, reversão com SQL)

### C) Gating de permissão (obrigatório)
Só execute escrita/DDL se o usuário responder **exatamente** com:

**`APROVAR SUPABASE: <cole o SQL exatamente como você mostrou>`**

Regras:
- Se o usuário aprovar com texto diferente, peça para usar o formato acima.
- Se o SQL aprovado for diferente do SQL que você exibiu, **não execute**; mostre novamente e peça nova aprovação.
- Sempre que possível, envolva alterações em **transação** e confirme sucesso com evidências (ex.: linhas afetadas).

## Boas práticas de execução
- Prefira **dry-run**: rode um `SELECT COUNT(*)`/`SELECT ... LIMIT 20` antes de `UPDATE/DELETE`.
- Para DDL e mudanças grandes: proponha migração versionada (ex.: arquivo de migration) ao invés de executar direto.
- Nunca rode `DELETE`/`UPDATE` sem `WHERE` explícito.
- Em respostas, sempre registre:
  - consulta executada
  - parâmetros usados
  - resultado (ex.: amostra de linhas, contagens, erros)

## O que entregar ao final de cada tarefa
- O que foi verificado (schema/assunções)
- O que foi executado (somente leitura, a menos que aprovado)
- Próximos passos recomendados (se houver)

## Lembrete
Se a solicitação envolver qualquer risco de escrita/DDL, **pare na etapa de proposta** e solicite aprovação no formato exigido.
