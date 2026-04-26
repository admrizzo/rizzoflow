import { useState, useMemo } from 'react';
import { useCardActivityLogs, CardActivityLog } from '@/hooks/useCardActivityLogs';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  ArrowRight,
  UserCog,
  Target,
  Calendar as CalendarIcon,
  ListChecks,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Sparkles,
  Loader2,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CardActivityHistoryProps {
  cardId: string;
}

const EVENT_META: Record<
  string,
  { icon: typeof History; color: string; bg: string }
> = {
  card_created: { icon: Sparkles, color: 'text-emerald-700', bg: 'bg-emerald-100' },
  column_changed: { icon: ArrowRight, color: 'text-blue-700', bg: 'bg-blue-100' },
  responsible_changed: { icon: UserCog, color: 'text-violet-700', bg: 'bg-violet-100' },
  next_action_changed: { icon: Target, color: 'text-orange-700', bg: 'bg-orange-100' },
  due_date_changed: { icon: CalendarIcon, color: 'text-amber-700', bg: 'bg-amber-100' },
  checklist_created: { icon: ListChecks, color: 'text-teal-700', bg: 'bg-teal-100' },
  checklist_item_completed: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-100' },
  checklist_item_reopened: { icon: RotateCcw, color: 'text-slate-700', bg: 'bg-slate-100' },
  comment_added: { icon: MessageSquare, color: 'text-indigo-700', bg: 'bg-indigo-100' },
};

function initialsOf(name?: string | null) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

function LogItem({ log }: { log: CardActivityLog }) {
  const meta = EVENT_META[log.event_type] || {
    icon: History,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  };
  const Icon = meta.icon;
  const created = new Date(log.created_at);

  return (
    <div className="flex gap-3 py-3">
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
          meta.bg,
          meta.color,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{log.title}</p>
        {log.description && (
          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
            {log.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          {log.actor_profile && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {initialsOf(log.actor_profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{log.actor_profile.full_name}</span>
              <span>·</span>
            </div>
          )}
          <time dateTime={log.created_at}>
            {format(created, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </time>
        </div>
      </div>
    </div>
  );
}

export function CardActivityHistory({ cardId }: CardActivityHistoryProps) {
  const { logs, isLoading, addManualComment } = useCardActivityLogs(cardId);
  const { isAdmin, isGestor, isAdministrativo } = usePermissions();
  const canComment = isAdmin || isGestor || isAdministrativo;

  const [comment, setComment] = useState('');

  const sortedLogs = useMemo(() => logs, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addManualComment.mutate(
      { cardId, text: comment },
      {
        onSuccess: () => setComment(''),
      },
    );
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Histórico de andamentos</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {logs.length} {logs.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="px-4 py-3 border-b space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Registrar um comentário de andamento…"
            rows={2}
            disabled={addManualComment.isPending}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!comment.trim() || addManualComment.isPending}
            >
              {addManualComment.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar ao histórico
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      <ScrollArea className="max-h-[420px]">
        <div className="px-4 divide-y">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Carregando histórico…
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum andamento registrado ainda.
            </div>
          ) : (
            sortedLogs.map((log) => <LogItem key={log.id} log={log} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}