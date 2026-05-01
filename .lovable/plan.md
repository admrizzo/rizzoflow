# Chat Interno Global — Rizzo Flow

Adiciona um **chat interno global** acessível em todas as páginas do sistema, no estilo do preview Modelo C — Focus Semi-Dark. Apenas usuários internos (com role) participam.

## Escopo

- Botão flutuante (FAB) no canto inferior direito, presente em todas as rotas autenticadas, com badge de mensagens não lidas.
- Painel lateral (Sheet) à direita, em duas colunas no desktop:
  - **Esquerda**: lista de conversas (DMs e grupos) + busca de usuários.
  - **Direita**: thread de mensagens da conversa selecionada, com composer no rodapé.
- Mensagens em **tempo real** via Supabase Realtime.
- Indicador de não lidas por conversa + total no FAB.
- Mobile: o painel ocupa a tela inteira; alternância entre lista e thread.

## Não-escopo (desta fase)

- Sem anexos/imagens/áudio.
- Sem reações, edição ou exclusão de mensagens.
- Sem typing indicator nem presença online.
- Sem notificação por e-mail/push.
- Sem menções a card/imóvel (pode vir em fase 2).

## Backend (migration)

Tabelas novas em `public`:

- `chat_conversations` — `id`, `type` ('dm' | 'group'), `name` (nullable, para grupos), `created_by`, timestamps.
- `chat_participants` — `conversation_id`, `user_id`, `last_read_at`, `joined_at`. PK composta.
- `chat_messages` — `id`, `conversation_id`, `sender_id`, `content` (text), `created_at`.

Função `is_chat_participant(_user_id, _conversation_id)` SECURITY DEFINER (evita recursão de RLS) e função RPC `get_or_create_dm(_other_user_id)` que retorna a conversa DM existente entre dois usuários ou cria uma nova.

RLS:

- Apenas team members (`is_team_member(auth.uid())`) acessam o chat.
- Conversa/participantes/mensagens visíveis apenas se o usuário é participante.
- Mensagens só podem ser inseridas pelo próprio `sender_id` se for participante.
- `last_read_at` atualizável apenas pelo próprio participante.

Realtime habilitado em `chat_messages` e `chat_participants`.

## Frontend

Novos arquivos:

- `src/components/chat/ChatProvider.tsx` — contexto com estado de abertura, conversa ativa, contagem não lidas.
- `src/components/chat/ChatLauncher.tsx` — FAB global com badge.
- `src/components/chat/ChatPanel.tsx` — Sheet lateral com layout de duas colunas.
- `src/components/chat/ConversationList.tsx` — conversas + busca de usuários internos.
- `src/components/chat/MessageThread.tsx` — mensagens, scroll, composer.
- `src/hooks/useChatConversations.ts`, `useChatMessages.ts`, `useUnreadChatCount.ts`.

Integração: montar `<ChatProvider>` + `<ChatLauncher />` dentro do layout autenticado (provavelmente `App.tsx` ou layout raiz das rotas privadas), de forma que **não apareça em /demo, /login, /proposta pública**.

## Visual

Segue Modelo C — Focus Semi-Dark já consolidado:

- FAB redondo `bg-primary text-primary-foreground` com badge `bg-accent`.
- Sheet com `bg-card`, header `bg-muted/40`, cabeçalhos uppercase tracking-wider.
- Bolhas de mensagem: enviadas em `bg-primary/10` à direita, recebidas em `bg-muted` à esquerda. Avatar com iniciais.

## Preservação

- Nenhuma alteração em hooks de cards/kanban/dashboard.
- Nenhuma alteração em RLS/tabelas existentes.
- Nenhuma alteração em rotas existentes; apenas montagem de provider/launcher no layout autenticado.

## Plano de execução

1. Criar migration (tabelas + RLS + funções + realtime).
2. Criar hooks e componentes do chat.
3. Montar provider + launcher no layout autenticado.
4. Build, smoke test (abrir painel, iniciar DM, enviar mensagem, ver não lida em outra aba).
