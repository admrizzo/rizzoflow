import { useMemo } from 'react';
import { useCardActivityLogs, CardActivityLog } from '@/hooks/useCardActivityLogs';
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
  Sparkles,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CardActivityHistoryProps {
  cardId: string;
}

// Eventos exibidos no "Registro de andamento" (somente automáticos).
// Comentários manuais (`comment_added`) são exibidos no painel direito
// "Comentários e atividade" e foram removidos daqui para evitar duplicidade.
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
};

const AUTOMATIC_EVENT_TYPES = new Set(Object.keys(EVENT_META));

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
          'flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center',
          meta.bg,
          meta.color,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-tight">{log.title}</p>
        {log.description && (
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
            {log.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          {log.actor_profile && (
            <div className="flex items-center gap-1">
              <Avatar className="h-3.5 w-3.5">
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
  const { logs, isLoading } = useCardActivityLogs(cardId);

  // Esta área é SOMENTE LEITURA: exibe apenas eventos automáticos do card.
  // Comentários manuais ficam no painel "Comentários e atividade" à direita
  // para evitar duplicidade visual.
  const automaticLogs = useMemo(
    () => logs.filter((l) => AUTOMATIC_EVENT_TYPES.has(l.event_type)),
    [logs],
  );

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Registro de andamento
        </h3>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {automaticLogs.length}{' '}
          {automaticLogs.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      <ScrollArea className="max-h-[260px]">
        <div className="px-3 divide-y">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Carregando registro…
            </div>
          ) : automaticLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum andamento registrado.
            </div>
          ) : (
            automaticLogs.map((log) => <LogItem key={log.id} log={log} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}