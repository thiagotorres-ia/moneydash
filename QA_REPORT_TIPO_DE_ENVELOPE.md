# Relatório QA – CRUD Tipo de Envelope (SPEC v1)

Validação da entrega do builder contra o SPEC e checklist QA.

---

## 1) Achados por prioridade

### P0 (quebra / risco alto)

| # | Achado | Status |
|---|--------|--------|
| 1 | **Nome da tabela divergente do SPEC e da migração:** O SPEC (seção F) e o script `sql/003_envelope_type_fk_migration.sql` definem a tabela como **`envelope_type`** (singular). O código usava **`envelope_types`** (plural) em `envelopeTypeService.ts` e no join de `envelopeService.getAll()`. Com a migração executada como no SPEC, a aplicação falharia com relação inexistente. | **Corrigido** no código: todos os usos passaram a `envelope_type` e `envelope_type(name)`. |

### P1 (manutenibilidade)

| # | Achado | Status |
|---|--------|--------|
| 1 | Responsabilidade bem separada: serviço (`envelopeTypeService`), página, modal e regras de delete (FK 23503) tratadas no service. | OK |
| 2 | Logs: `console.error` apenas em erros, sem dados sensíveis (apenas objeto de erro do Supabase). | OK |
| 3 | Estados de UI: loading, empty e error tratados em `EnvelopeTypeManagement`. | OK |
| 4 | Script `lint` não existe em `package.json` — apenas `dev`, `build`, `preview`. Não é bloqueante; opcional adicionar ESLint depois. | Info |

### P2 (polimento)

| # | Achado | Status |
|---|--------|--------|
| 1 | Acessibilidade: drag handle com `aria-label="Arrastar para reordenar"`, botões Editar/Excluir com `aria-label`, confirmação antes de excluir. | OK |
| 2 | Performance: lista de tipos única; reorder envia batch de updates (N chamadas sequenciais). Para muitos tipos, considerar `updateOrder` em lote no backend; para uso atual, aceitável. | OK |

---

## 2) Correções recomendadas (aplicadas)

- **Tabela no Supabase:** alinhar ao SPEC e à migração.
  - **Arquivos alterados:**
    - `src/services/envelopeTypeService.ts`: todas as ocorrências de `.from('envelope_types')` → `.from('envelope_type')`.
    - `src/services/envelopeService.ts`: no `select`, `envelope_types(name)` → `envelope_type(name)` e no mapeamento `env.envelope_types` → `env.envelope_type`.

**Importante:** Se no seu projeto Supabase a tabela foi criada como **`envelope_types`** (plural), será necessário **reverter** essas alterações nos dois arquivos (voltar para `envelope_types`). O SPEC e o script de migração do repositório usam **`envelope_type`** (singular).

---

## 3) Evidências – comandos rodados

```bash
$ npm run build
# ✅ Build concluído com sucesso (após correção da tabela)

$ npm run lint
# ⚠️ Script "lint" não existe no package.json (não bloqueante)
```

---

## 4) SPEC atendido? Sim, com ressalva

**Sim**, desde que o nome da tabela no banco esteja alinhado ao código:

- Se a migração `sql/003_envelope_type_fk_migration.sql` foi executada como está → a tabela é **`envelope_type`** e o código **corrigido** (após este QA) está alinhado.
- Se no seu ambiente a tabela se chama **`envelope_types`** → use no código `envelope_types` (como estava na entrega do builder) e ajuste a migração ou o schema para manter consistência.

### Divergências tratadas

| SPEC | Entrega original | Ajuste QA |
|------|------------------|-----------|
| Tabela `envelope_type` (F, script SQL) | Uso de `envelope_types` no código | Código alterado para `envelope_type` e `envelope_type(name)` |

### Conferência dos critérios de aceite (SPEC K)

- Lista ordenada por `relative_order` (menor no topo): OK.
- Criar tipo apenas com nome; novo tipo no final: OK.
- Editar nome do tipo: OK.
- Excluir só sem envelopes vinculados; bloqueio com mensagem (FK 23503): OK.
- Drag & drop persiste `relative_order`: OK.
- Cadastro/edição de envelope usa tipo da tabela; grupos por `relative_order`: OK.
- Sem `type_slug`; apenas `envelope_type_id`: OK.
- Rota `/tipos-envelope` protegida; link na Navbar: OK.
- Estados loading, empty e error na tela de tipos: OK.
- Acessibilidade (labels, confirmação, drag handle): OK.

---

## 5) Resumo

- **P0:** 1 achado (nome da tabela) — **corrigido** para bater com SPEC e migração.
- **P1/P2:** sem bloqueios; estados de UI, logs e acessibilidade adequados.
- **Build:** OK após correção.
- **SPEC:** Atendido com a correção aplicada, desde que o banco use a tabela `envelope_type` como no script de migração.
