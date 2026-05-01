## Objetivo

Replicar o layout do preview **Modelo C — Focus / Semi-Dark** (`src/pages/DesignPreview.tsx`) nas três áreas principais do sistema real:

1. **Dashboard** (`src/pages/Dashboard.tsx`, `Header`, `BoardSelector`, `FlowsOverview`)
2. **Kanban** (`KanbanBoard`, `KanbanColumn`, `KanbanCard`, `ColumnHeader`)
3. **CardDetailDialog** (corpo, ordem dos blocos, sidebar de comentários)

Sem alterar **nenhuma** lógica, hook, query, regra, banco, RLS, edge function ou permissão. Reposicionar blocos é permitido.

---

## Princípios

- **Layout & estilo do preview** → aplicado.
- **Dados, handlers, condicionais por board, validações, fluxos** → preservados exatamente como estão hoje.
- **Reposicionamento permitido**: ordem dos blocos do card seguirá o preview.
- Sem novos mocks, sem componentes fake, sem inventar etapas.
- Sem migrations, sem alteração de tipos, sem novas dependências.

---

## Fase 1 — Dashboard / Chrome global

Referência preview: `HeaderC` (linha 157), `FlowTab` (291), `Kanban` shell (314), `CardStatesShowcase` (387).

Mudanças visuais:

- **Header (`Header.tsx`)**: barra superior em `bg-primary` (navy) com altura compacta, busca centralizada estilo "pill" com ícone, ações à direita (notificações/perfil) com translucência sobre o fundo escuro. Mantém todos os links, dropdowns e handlers existentes.
- **BoardSelector**: pílulas de fluxo no padrão `FlowTab` do preview — fundo neutro, pílula ativa em navy, contador discreto à direita. Linha fina de acento na cor do board selecionado já existe (Fase 2 anterior); apenas ajustar tipografia/espaçamento.
- **FlowsOverview / Dashboard cards**: cards neutros com borda discreta, header em uppercase pequeno, KPI em destaque (padrão `summaryBox` + `Kpi` do preview).
- **Background da página**: `bg-background` neutro tipo off-white do preview.

Não tocar:
- Roteamento, dropdowns, busca global, notificações, lógica de seleção de board, contagem de cards.

---

## Fase 2 — Kanban (board, colunas e cards)

Referência preview: `Kanban` (314), `KanbanColumn` (444), `KanbanCard` (528).

Mudanças visuais:

- **Board canvas**: fundo `bg-muted/40` (semi-dark sutil), padding lateral confortável, scroll horizontal com scrollbar fina já existente.
- **Coluna**: largura fixa ~300px, header com bolinha de cor + nome em uppercase tracking-wider + contador entre parênteses + menu (...) à direita. Fundo da coluna `bg-card` com borda `border-border` e cantos arredondados.
- **Card**: 
  - Linha 1: badge de tipo (Locação/Venda/Captação...) + status pill (recebido/correção/preenchimento) à direita.
  - Linha 2: título em `font-semibold` com line-clamp-2.
  - Linha 3: endereço em `text-muted-foreground text-xs`.
  - Linha 4: pílulas de KPI (valor, prazo) quando disponíveis nos dados reais.
  - Footer: avatares de responsáveis (iniciais, sem fotos reais) + ícones de docs/comentários com contadores.
  - Borda discreta, hover sutil, sombra mínima.
- Drag-and-drop, click para abrir modal, badges, contadores reais — preservados.

Não tocar:
- DnD (`@dnd-kit`), `useCards`, mutations, realtime, filtros, ordenação, atribuição.

---

## Fase 3 — CardDetailDialog (corpo completo)

Referência preview: `CardDialog` (645).

**Header**: já está no padrão (Fase anterior). Não refazer.

**Corpo — duas colunas**: já está no padrão (main flex + sidebar 380-400px `bg-muted/30`). Manter.

**Reordenar blocos da coluna principal exatamente como o preview:**

1. **Status** (badge + prazo de revisão) — atual existe.
2. **Andamento** (stepper de colunas reais — já implementado) + formulário próxima ação/responsável/prazo abaixo.
3. **Responsáveis internos** (chips com avatar de iniciais) — `InternalBrokersSection`.
4. **Dados do imóvel** — bloco de identificação/imóvel real.
5. **Resumo da proposta** — `ProposalNegotiationSummary` em estilo KPI grid (3 colunas).
6. **Dados de contrato** — `ProposalContractSummary` no padrão KV grid.
7. **Retirada de chaves** — bloco condicional (se existir no fluxo de locação).
8. **Correção da proposta** — bloco em destaque âmbar quando `pendingCorrection`, mantendo `RequestCorrectionDialog`.
9. **Documentos da proposta** — `ProposalDocumentsSection` em estilo lista com linhas separadoras.
10. **Listas de verificação** — `ChecklistSection` + `StageChecklistButton`.
11. **Pessoas** — `CardPartiesSection` / `ProposalPartiesView` no padrão de chips.
12. **Demais blocos condicionais** (manutenção, custom fields) — em seguida, mantendo condicionais por board.
13. **Histórico de andamentos** — `CardActivityHistory` se ainda fizer sentido na coluna principal (preview coloca tudo de atividade na sidebar; manteremos `CardActivityHistory` na coluna principal porque é histórico estruturado distinto de comentários).
14. **Ações** (Transferir, Arquivar, Excluir) — no fim, padronizado.

**Padrão visual de seção** (já consolidado em fases anteriores):
```
<section className="rounded-lg border border-border bg-card overflow-hidden">
  <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">…</h3>
  </header>
  <div className="p-4">{conteúdo funcional intacto}</div>
</section>
```

Aplicar a **todos** os blocos da coluna principal.

**Sidebar (Comentários e atividade)**: `CardNotesSidebar` já tem header, filtros e composer no estilo do preview. Apenas refinar tipografia se necessário (sem tocar lógica).

---

## Fora de escopo (não tocar)

- Central Interna, Ajuda, AdminFlow, Minha Fila, CentralPropostas, PropostaPublica, ProviderPortal, Auth, Demo, RedefinirSenha.
- Banco, RLS, migrations, edge functions, hooks, AuthContext, queries, realtime.
- Lógica de propostas, documentos, correção, SLA, badges, drag-and-drop, salvamento.
- Componentes funcionais existentes — apenas wrappers/className/ordem.

---

## Estratégia de execução

Para reduzir risco, vou aplicar nesta ordem dentro desta fase:

1. **Header global** (mais isolado, alto impacto visual).
2. **Dashboard / FlowsOverview** (já parcialmente migrado).
3. **KanbanColumn + KanbanCard + ColumnHeader** (cuidado com DnD — só className).
4. **CardDetailDialog** — reordenar blocos da coluna principal conforme lista acima, padronizando todos no `<section>`.

Após cada subfase: build automático roda, eu confirmo.

---

## Entregáveis ao final

- Lista de arquivos alterados.
- Resumo do que foi reposicionado/restilizado por área.
- Confirmação de preservação de lógica.
- Confirmação: sem migrations, sem banco, sem RLS, sem hooks, sem regras alteradas.
- Instruções de teste desktop e mobile (375–414).
