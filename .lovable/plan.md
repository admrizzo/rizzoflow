## Objetivo da Fase 1

Trazer para o sistema real **apenas** o "chrome" semi-dark aprovado no `/design-preview` (variante C — Focus) e o refinamento visual de cards/colunas do Kanban. Sem chat, sem dark no Kanban, sem mexer em regra de negócio.

## Escopo confirmado

- **Tema**: semi-dark só nos painéis (Header + faixa superior). Área do Kanban segue clara como hoje.
- **Aplicar em**: Header e Kanban (KanbanBoard, KanbanColumn, ColumnHeader, KanbanCard).
- **Chat lateral**: NÃO criar agora. Apenas reservar uma "sombra" lateral fina de 56px no shell (rail visual desabilitada com tooltip "Em breve") OU adiar totalmente para Fase 2 — ver decisão abaixo.
- **Demais páginas** (CentralPropostas, MinhaFila, AdminFlow, dialogs de card, propostas) ficam para fases seguintes.

## O que NÃO muda nesta fase

- Banco, migrations, RLS, edge functions, automações.
- Regras de propostas, documentos, correção, etapas.
- Permissões, AuthContext, hooks de dados.
- `CardDetailDialog` e fluxo de abertura do card (apenas o card fechado no board recebe refinamento).
- `Header.tsx` mantém TODOS os botões existentes (Minha Fila, Sincronizar, Propostas, Notificações, Admin, Perfil, Filtros, Arquivados, Busca, BoardName).
- Rotas, navegação, comportamento.

## Mudanças propostas

### 1. `src/index.css` — tokens semi-dark do "chrome"

Adicionar variáveis novas (sem mexer nos tokens existentes que regem cards/Kanban):

```css
:root {
  /* Focus semi-dark chrome (Header + painéis superiores) */
  --chrome-bg: 215 28% 14%;          /* fundo escuro do header */
  --chrome-bg-elevated: 215 25% 18%; /* faixa de subtítulo / board name */
  --chrome-fg: 0 0% 96%;
  --chrome-fg-muted: 215 15% 70%;
  --chrome-border: 215 20% 24%;
  --chrome-accent: 340 100% 55%;     /* rosa Rizzo realçado para fundo escuro */
}
```

Acrescentar utilitário `.lp-thin-scroll` (já existe no preview) na camada utilities para uso pontual no Kanban.

### 2. `src/components/layout/Header.tsx` — só estilos, sem remover nada

- Trocar `bg-black/20 backdrop-blur-sm` por `bg-[hsl(var(--chrome-bg))]` com borda inferior `border-b border-[hsl(var(--chrome-border))]`.
- Inputs/Buttons: ajustar contraste sobre o novo fundo (mantendo `text-white` e `hover:bg-white/10`).
- Faixa do `selectedBoard`: divisor mais sutil; nome do board com `text-white/95 font-semibold`.
- Avatar, NotificationsPopover, todos os botões (Minha Fila, Sincronizar, Settings, Propostas) **permanecem**, só ganham espaçamento de 6px e raio 8px consistente.
- Nenhuma prop nova, nenhuma lógica alterada.

### 3. `src/components/kanban/ColumnHeader.tsx` — refinamento

- Header da coluna com fundo `bg-card` claro, borda inferior fina, título 13px/700 e contador em chip neutro 11px.
- Manter ações existentes (menu, contadores) intactas.

### 4. `src/components/kanban/KanbanColumn.tsx` — densidade

- Largura fixa consistente (304px), gap 12px entre cards, padding interno 10px.
- Aplicar `lp-thin-scroll` no scroll vertical da lista de cards.

### 5. `src/components/kanban/KanbanCard.tsx` — padronização visual

Apenas estilos (sem mexer em props, handlers ou lógica de drag):

- `minHeight: 132`, raio 10, sombra suave, borda 1px `hsl(var(--border))`.
- Título: 13px/700, `line-clamp: 2`, `title` attr para tooltip nativo.
- Endereço/resumo: 12px, `line-clamp: 1`.
- Linha inferior com responsável (avatar 22px com iniciais), prazo e valor — sem sobreposição, `flex-wrap` controlado.
- Estados visuais (mantendo a lógica que já existe para deadline/correção):
  - Em dia / docs ok → `borderLeft: 3px solid` verde discreto.
  - Correção solicitada → âmbar.
  - Vencido → vermelho (accent rosa só para alerta crítico).
  - Pendência → cinza com sombra leve.
  - Neutro → sem realce.
- Badges atuais permanecem; só padronizo altura 18px e tipografia 10.5px.

### 6. `src/components/kanban/KanbanBoard.tsx` — somente container

- Faixa superior do board (acima das colunas) ganha fundo `--chrome-bg-elevated` e fica grudada ao Header.
- `lp-thin-scroll` na rolagem horizontal das colunas.
- Drag-to-scroll horizontal: **só adicionar** se não conflitar com o react-beautiful-dnd / dnd-kit já em uso. Se houver risco, fica para Fase 2.

## Estratégia de segurança

- Nenhum hook, nenhuma query, nenhum `useEffect` novo com side-effect de dados.
- Cada arquivo é editado isoladamente; após cada arquivo, conferir build.
- Diff focado em `className`, `style` e tokens — sem renomear props, sem remover JSX.

## Decisão pendente (mini)

Sobre o "espaço lateral reservado" do chat: posso (a) **não fazer nada agora** (mais seguro) ou (b) adicionar um trilho fino de 56px à direita do Kanban com ícone "Chat — Em breve" desabilitado. Vou assumir **(a) não fazer nada** para não introduzir layout novo que depois precise ser refeito quando o chat real existir. Se preferir (b), me avise.

## Como testar (depois da implementação)

**Desktop (1280–1920)**:
1. `/dashboard` — Header escuro, todos os botões clicáveis, busca/filtros/arquivados funcionando.
2. Selecionar um board → cards padronizados, sem texto cortado, badges visíveis.
3. Abrir um card → `CardDetailDialog` continua idêntico.
4. Drag-and-drop entre colunas → funciona como hoje.
5. Sincronizar, Notificações, Admin, Perfil → abrem normalmente.

**Mobile (375–414)**:
1. Header não quebra; menus colapsam como antes.
2. Kanban rola horizontalmente; cards continuam legíveis.

## Entregáveis

Arquivos previstos para Fase 1:
- `src/index.css` (adições)
- `src/components/layout/Header.tsx` (estilos)
- `src/components/kanban/KanbanBoard.tsx` (container)
- `src/components/kanban/KanbanColumn.tsx` (densidade)
- `src/components/kanban/ColumnHeader.tsx` (estilos)
- `src/components/kanban/KanbanCard.tsx` (visual)

Fora desta fase (próximas, sob aprovação):
- Fase 2: Chat lateral real (tabelas, RLS, realtime) — requer aprovação explícita de mudança de banco.
- Fase 3: Refinar dialogs (CardDetail, Propostas) e Central de Propostas.
- Fase 4: AdminFlow / MinhaFila com mesmo padrão.