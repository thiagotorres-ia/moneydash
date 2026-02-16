# Plano: Corrigir erro "duplicate key value violates unique constraint envelope_types_relative_order_key"

## 1. Causa do bug

A mensagem refere-se à tabela **envelope_types** (tipos de envelope), não à de categorias. O banco tem uma constraint **UNIQUE** na coluna `relative_order`.  

O `updateOrder` em [envelopeTypeService.ts](src/services/envelopeTypeService.ts) faz **vários UPDATEs em sequência**, um por tipo:

```ts
for (let i = 0; i < orderedIds.length; i++) {
  await supabase.from('envelope_types').update({ relative_order: i }).eq('id', orderedIds[i]);
}
```

Exemplo que quebra:

- Estado inicial: A=0, B=1, C=2.  
- Nova ordem (após drag): **B, A, C** → B deve ficar 0, A=1, C=2.

O que acontece:

1. Primeiro UPDATE: B passa a `relative_order = 0`.  
   Ficamos com **A=0 e B=0** → violação da UNIQUE em `relative_order`.
2. O segundo UPDATE nem chega a rodar; o erro já foi lançado.

Ou seja: ao atribuir um valor que **já existe** em outra linha (no meio do processo), a constraint UNIQUE é violada. O bug vem de **atualizar em sequência** sob uma coluna UNIQUE.

---

## 2. Objetivo da correção

- Manter a constraint UNIQUE em `relative_order` (se for desejado) **ou** documentar a decisão de removê-la.
- Fazer a reordenação **sem** gerar, em nenhum momento, dois registros com o mesmo `relative_order`.
- Não mudar o contrato da tela (drag & drop e “Salvar ordem” continuam iguais).

---

## 3. Opções de solução

### Opção A – Dois passos no backend (recomendada)

Evitar qualquer valor duplicado durante os UPDATEs:

1. **Fase 1:** atualizar **todos** os tipos para um `relative_order` “temporário” fora da faixa usada (ex.: `relative_order = índice + 1000`), de forma que não haja duplicata.
2. **Fase 2:** atualizar **todos** para o valor final (0, 1, 2, …) na nova ordem.

Assim, em nenhum momento duas linhas ficam com o mesmo `relative_order`. A constraint UNIQUE pode permanecer.

- **Onde:** só em [envelopeTypeService.ts](src/services/envelopeTypeService.ts), em `updateOrder`.
- **Vantagem:** não exige mudar o banco (nem RPC); continua usando apenas a API do Supabase (ou um único script SQL se preferir fazer em uma chamada).

### Opção B – Um único UPDATE atômico (RPC ou SQL)

Criar no Supabase uma função (RPC) que recebe a lista `(id, relative_order)` e faz um único `UPDATE` (por exemplo com `FROM (VALUES (...))`), atribuindo todos os `relative_order` de uma vez. Não há estado intermediário com duplicata.

- **Onde:** novo RPC no Supabase + chamada a esse RPC em `envelopeTypeService.updateOrder`.
- **Vantagem:** uma única operação atômica; boa para muitos registros.

### Opção C – Remover a UNIQUE em `relative_order`

Remover a constraint `envelope_types_relative_order_key` e deixar só um índice (ou nada) em `relative_order`. O loop atual passaria a “funcionar” sem erro de duplicata, mas ainda haveria um instante em que duas linhas têm o mesmo `relative_order` (estado intermediário). A ordenação final ficaria correta, porém o modelo do banco deixaria de garantir unicidade.

- **Onde:** migration/script SQL no Supabase + eventualmente comentário no código.
- **Desvantagem:** perde a garantia de integridade; a SPEC já dizia que UNIQUE em `relative_order` é opcional.

---

## 4. Plano de implementação (recomendação: Opção A)

### Passo 1 – Ajustar `updateOrder` (dois passos)

Arquivo: **`src/services/envelopeTypeService.ts`**.

- Manter a assinatura `updateOrder(orderedIds: string[]): Promise<void>`.
- Implementar:
  1. **Passo 1:** loop que atualiza cada `id` em `orderedIds` para `relative_order = índice + offset` (ex.: `offset = 1000`), para não colidir com 0, 1, 2, …
  2. **Passo 2:** loop que atualiza cada `id` para `relative_order = índice` (0, 1, 2, …).

Garantir que os dois passos rodem na mesma “sessão” (um após o outro no mesmo `async`); em caso de erro em qualquer UPDATE, fazer throw e não deixar dados pela metade (comportamento atual já é esse).

### Passo 2 – Testar

- Reordenar tipos de envelope na tela (drag & drop) e clicar em “Salvar ordem”.
- Verificar que:
  - não aparece mais o erro `duplicate key value violates unique constraint "envelope_types_relative_order_key"`;
  - a ordem salva é a esperada ao recarregar a página.

### Passo 3 – (Opcional) Documentar no banco

Se no Supabase a tabela for `envelope_type` (singular) e a constraint estiver em outra migration, anotar em comentário ou em doc que a reordenação é feita em dois passos justamente por causa da UNIQUE em `relative_order`.

---

## 5. Resumo

| Item | Detalhe |
|------|--------|
| **Causa** | Vários UPDATEs em sequência em coluna com UNIQUE; estado intermediário gera duplicata e dispara a constraint. |
| **Onde** | `envelopeTypeService.updateOrder` (e, se aplicável, nome da tabela: `envelope_type` vs `envelope_types`). |
| **Correção recomendada** | Dois passos: primeiro todos para um offset (ex.: +1000), depois todos para 0, 1, 2, … |
| **Arquivos** | `src/services/envelopeTypeService.ts` (mudança em `updateOrder`). |
| **Banco** | Nenhuma alteração obrigatória; pode manter a UNIQUE. |

Com isso, o bug da “duplicate key” ao editar a ordem dos tipos de envelope fica resolvido de forma estável e sem relaxar a integridade no banco.
