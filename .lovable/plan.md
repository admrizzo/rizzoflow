# Fase 2 — Aplicar Focus / Semi-Dark no "chrome" abaixo do Header

## Contexto

Na Fase 1 trouxemos do `/design-preview` (modelo C — Focus / Semi-Dark) o Header semi-dark e o refinamento dos cards/colunas do Kanban. Agora o problema visível é a faixa **logo abaixo do Header** (BoardSelector + fundo do `<main>`) que ainda usa um **gradiente colorido por board** (`linear-gradient(board.color, board.color+dd)`). Isso quebra a hierarquia "chrome escuro · Kanban claro" do modelo C.

Esta fase trata apenas dessa faixa e da tela de seleção de fluxos. Continuamos sem mexer no chat e sem alterar o Kanban em si.

## Áreas afetadas

1. `src/pages/Dashboard.tsx` — fundo do shell e da `<main>`.
2. `src/components/layout/BoardSelector.tsx` — barra de tabs de fluxos (Meus Fluxos / Métricas / boards).
3. `src/components/layout/FlowsOverview.tsx` — tela inicial "Seus Fluxos" (cards de boards).

## O que NÃO muda

- Nenhum hook, query, realtime, mutation, edge function, RLS, migration.
- Nenhum botão removido (Meus Fluxos, Métricas, todos os boards, toggles Kanban/Prestadores, NewProposalButton).
- Nenhuma rota, nenhum comportamento de seleção de board, nenhum localStorage.
- `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `ColumnHeader` — não tocar.
- `Header.tsx` — não tocar (já está na Fase 1).
- Drag-and-drop, badges, contagens, permissões — intactos.
- Cor do board (`board.color`) **continua** sendo usada como acento (ex.: chip ativo, ícone), só deixa de pintar a tela inteira.

## Mudanças propostas (apenas estilo)

### 1. `Dashboard.tsx`

- Trocar o `bgStyle` (gradiente colorido por board) por **fundo neutro do app**:
  - `bg-background` no shell (área do Kanban segue clara, como o modelo C exige).
  - Faixas de chrome (Header + BoardSelector) usam `--chrome-bg` / `--chrome-bg-elevated`.
- A "memória de cor" do board passa a aparecer só como **fina linha de 2px** abaixo do BoardSelector (`background: board.color`) — preserva identidade visual sem poluir.
- Loader (`authLoading`) mantém `bg-primary` (já é navy Rizzo, ok).

### 2. `BoardSelector.tsx`

- Container ganha fundo `hsl(var(--chrome-bg-elevated))` + `border-b border-[hsl(var(--chrome-border))]`, padding mais confortável (`px-4 py-2`), `lp-thin-scroll` no overflow horizontal.
- Botões dos boards:
  - Inativo: `text-white/75 hover:bg-white/10 hover:text-white`, sem `bg-white/10` por padrão (mais limpo).
  - Ativo: pílula clara (`bg-white text-foreground font-semibold`) com **borda inferior 2px na cor do board** como acento; remove `scale-105` (mexer escala causa jitter na faixa).
  - Badge de contagem: `bg-white/15 text-white/80` quando inativo, `bg-muted text-foreground` quando ativo.
- Botão "Métricas" e "Meus Fluxos": mesmo padrão, sem o `bg-slate-600/50` atual.
- Mantém `iconMap`, `displayName` (regex), `Check` no ativo, todos os handlers.

### 3. `FlowsOverview.tsx`

- Container: fundo `bg-background` (era transparente sobre gradiente). Headline `text-foreground` em vez de `text-white`.
- Cards dos fluxos: usar `Card` com `border-border bg-card`, hover `shadow-md` em vez de `scale + shadow-xl`. Faixa de cor superior do board (`h-1.5`) preservada como acento.
- Skeletons: trocar `bg-white/95` por `bg-card`.
- Mensagem "Nenhum fluxo disponível": `text-muted-foreground`.

## Tokens já existentes (não criar novos)

`--chrome-bg`, `--chrome-bg-elevated`, `--chrome-fg`, `--chrome-fg-muted`, `--chrome-border`, `.lp-thin-scroll`, mais os tokens semânticos (`--background`, `--card`, `--foreground`, `--muted`, `--border`).

## Riscos e mitigação

- **Risco**: usuários acostumados ao "fundo colorido por board" podem estranhar. **Mitigação**: a cor vira acento (linha sob BoardSelector + faixa do card no overview), identidade do board permanece reconhecível.
- **Risco**: contraste do BoardSelector escuro com Kanban claro abaixo. **Mitigação**: borda inferior `--chrome-border` cria separação clara, igual ao preview C.
- **Sem risco de lógica**: nenhuma prop/handler/query alterada.

## Arquivos alterados

- `src/pages/Dashboard.tsx` (apenas o bloco `bgStyle` + classes do wrapper)
- `src/components/layout/BoardSelector.tsx` (apenas `className`/`style`)
- `src/components/layout/FlowsOverview.tsx` (apenas `className`/`style`)

Total estimado: ~30 linhas modificadas, zero linhas de lógica.

## Como testar

**Desktop (1280–1920)**
1. `/dashboard` sem board selecionado → fundo neutro, FlowsOverview com cards claros sobre fundo claro, header escuro continua intacto.
2. Selecionar cada board → BoardSelector mostra board ativo como pílula clara com linha de cor do board; Kanban abre claro como hoje.
3. Drag-and-drop entre colunas, abrir card, sincronizar, notificações, admin, perfil → tudo funcional.
4. Toggle "Arquivados", busca global, filtros → comportamento idêntico.
5. Board Manutenção → toggle Kanban/Prestadores aparece e funciona.

**Mobile (375–414)**
1. BoardSelector rola horizontalmente com scrollbar fina.
2. FlowsOverview empilha em 1 coluna; cards continuam clicáveis.
3. Header e menus colapsam como antes.

**Build**: alteração só de `className`/`style`, sem novas dependências; build deve ficar limpo.

## Fora desta fase (próximas, sob aprovação)

- Fase 3: refinar `FilterPopover`, `NotificationsPopover`, `GlobalSearchResults` para o mesmo padrão semi-dark/elevated.
- Fase 4: `CardDetailDialog` e dialogs de proposta.
- Fase 5: `AdminFlow`, `MinhaFila`, `CentralPropostas`.
- Fase 6 (depende de decisão de produto): chat lateral real (banco + RLS).
