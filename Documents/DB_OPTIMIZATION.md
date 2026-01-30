# Planejamento de Performance de Banco de Dados - MoneyDash

Este documento detalha as otimizações aplicadas ao banco de dados em 25/01/2025.

## 1. Análise de Impacto

| Tabela | Índices Criados | Objetivo | Ganho Estimado |
| :--- | :--- | :--- | :--- |
| `transactions` | 3 | Extrato veloz e recálculo de saldo instantâneo | 85-95% em tabelas > 10k rows |
| `envelopes` | 2 | Filtros por tipo e busca por código | 70% em dashboards complexos |
| `subcategories` | 2 | Carregamento da árvore de categorias | 60% na navegação |
| `categories` | 1 | Listagem inicial | Estabilização de leitura |

## 2. Instruções de Execução no Supabase

1. Abra o [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Copie o conteúdo do arquivo `sql/002_add_performance_indexes.sql`.
3. **Importante**: Certifique-se de que não há transações pendentes. 
4. Clique em **Run**.

## 3. Scripts de Verificação e Monitoramento

### Verificar se os índices foram criados:
```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename;
```

### Monitorar o uso dos índices (Health Check):
Use esta query após 24h de uso para ver quais índices estão sendo mais aproveitados:
```sql
SELECT
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM
    pg_stat_user_indexes
WHERE
    schemaname = 'public'
ORDER BY
    idx_scan DESC;
```

## 4. Próximos Passos
- Monitorar o tempo de execução da query de `totalBalance` na Home.
- Se o volume de transações ultrapassar 100 mil registros, considerar **Partitioning** por `user_id` ou por `year`.
