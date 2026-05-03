import { useEffect, useState } from 'react';
import { CardWithRelations } from '@/types/database';
import { useCards } from '@/hooks/useCards';
import { useProfiles } from '@/hooks/useProfiles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, User, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, RotateCcw, Inbox, History, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isDateOverdue, parseDatabaseDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logCardActivity } from '@/hooks/useCardActivityLogs';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCardQueries } from '@/lib/queryInvalidation';
import { useColumns } from '@/hooks/useColumns';
import { CircleDashed, LucideIcon } from 'lucide-react';
import { OperationalBadge, BadgeTone } from '@/lib/cardOperationalBadges';
import { formatTimeElapsed } from '@/lib/slaUtils';

interface AndamentoSectionProps {
  card: CardWithRelations;
  canEdit: boolean;
  badges?: OperationalBadge[];
  getToneClasses?: (tone: BadgeTone) => string;
}

const NONE_VALUE = '__none__';

/**
 * Seção "Andamento" do card: próxima ação, responsável e prazo.
 * Layout limpo e responsivo.
 */
export function AndamentoSection({ card, canEdit, badges = [], getToneClasses }: AndamentoSectionProps) {
  const currentColumn = columns.find(c => c.id === card.column_id);

  const defaultGetToneClasses = (tone: BadgeTone) => {
    switch (tone) {
      case 'emerald': return "bg-emerald-50 text-emerald-600 border-emerald-100/60";
      case 'orange': return "bg-orange-50 text-orange-600 border-orange-100/60";
      case 'amber': return "bg-amber-50 text-amber-600 border-amber-100/60";
      case 'red': return "bg-red-50 text-red-600 border-red-100/60";
      case 'slate': return "bg-slate-50 text-slate-500 border-slate-100/80";
      case 'blue': return "bg-blue-50 text-blue-600 border-blue-100/60";
      case 'indigo': return "bg-indigo-50 text-indigo-600 border-indigo-100/60";
      case 'rose': return "bg-rose-50 text-rose-600 border-rose-100/60";
      default: return "bg-slate-50 text-slate-500 border-slate-100/80";
    }
  };

  const toneClassesResolver = getToneClasses || defaultGetToneClasses;

  const { updateCard } = useCards(card.board_id);
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { columns } = useColumns(card.board_id);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const [localNextAction, setLocalNextAction] = useState(card.next_action || '');
  const [localDueDate, setLocalDueDate] = useState<Date | null>(parseDatabaseDate(card.next_action_due_date));
  const [localDueTime, setLocalDueTime] = useState<string>(() => {
    const d = parseDatabaseDate(card.next_action_due_date);
    if (!d) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return hh === '00' && mm === '00' ? '' : `${hh}:${mm}`;
  });

  useEffect(() => {
    setLocalNextAction(card.next_action || '');
    const d = parseDatabaseDate(card.next_action_due_date);
    setLocalDueDate(d);
    if (d) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setLocalDueTime(hh === '00' && mm === '00' ? '' : `${hh}:${mm}`);
    } else {
      setLocalDueTime('');
    }
  }, [card.id, card.next_action, card.next_action_due_date]);

  const responsibleProfile =
    card.responsible_user_profile ||
    (card.responsible_user_id
      ? profiles.find((p) => p.user_id === card.responsible_user_id)
      : null);

  const dueDate = localDueDate;
  const overdue = dueDate ? isDateOverdue(dueDate) : false;
  const today = dueDate ? isToday(dueDate) : false;

  const hasPendingAction = !!(card.next_action && card.next_action.trim());
  const lastCompletedAt = parseDatabaseDate(card.last_completed_action_at);
  const lastCompletedProfile = card.last_completed_action_by
    ? profiles.find((p) => p.user_id === card.last_completed_action_by)
    : null;
  // Mostra botão "Reabrir" se houve conclusão nas últimas 24h e não há ação pendente
  const canReopen =
    !hasPendingAction &&
    !!card.last_completed_action &&
    !!lastCompletedAt &&
    Date.now() - lastCompletedAt.getTime() < 24 * 60 * 60 * 1000;

  const handleNextActionBlur = () => {
    const next = localNextAction.trim();
    if (next === (card.next_action || '')) return;
    updateCard.mutate({ id: card.id, next_action: next || null });
  };

  const handleResponsibleChange = (value: string) => {
    const userId = value === NONE_VALUE ? null : value;
    updateCard.mutate({ id: card.id, responsible_user_id: userId });
  };

  const persistDueDateTime = (date: Date | null, time: string) => {
    let iso: string | null = null;
    if (date) {
      const [hh, mm] = (time && /^\d{2}:\d{2}$/.test(time))
        ? time.split(':').map(Number)
        : [0, 0];
      const composed = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hh,
        mm,
        0,
        0,
      );
      iso = composed.toISOString();
    }
    const previousDate = localDueDate;
    const previousTime = localDueTime;
    updateCard.mutate(
      { id: card.id, next_action_due_date: iso },
      {
        onError: () => {
          setLocalDueDate(previousDate);
          setLocalDueTime(previousTime);
        },
      },
    );
  };

  const handleDueDateChange = (date: Date | undefined) => {
    const next = date ?? null;
    setLocalDueDate(next);
    persistDueDateTime(next, localDueTime);
  };

  const handleDueTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalDueTime(e.target.value);
  };

  const handleDueTimeBlur = () => {
    if (!localDueDate) return;
    persistDueDateTime(localDueDate, localDueTime);
  };

  const handleMarkAsDone = async () => {
    if (!hasPendingAction) return;
    const actionText = (card.next_action || '').trim();
    setIsCompleting(true);
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          next_action: null,
          next_action_due_date: null,
          last_completed_action: actionText,
          last_completed_action_at: now,
          last_completed_action_by: user?.id ?? null,
          next_action_completed_at: now,
          next_action_completed_by: user?.id ?? null,
        })
        .eq('id', card.id);
      if (error) throw error;

      setLocalNextAction('');
      setLocalDueDate(null);
      setLocalDueTime('');

      void logCardActivity({
        cardId: card.id,
        actorUserId: user?.id,
        eventType: 'next_action_changed',
        title: 'Próxima ação realizada',
        description: `Próxima ação realizada: ${actionText}`,
        oldValue: actionText,
        newValue: null,
        metadata: { completed: true, completed_at: now },
      });

      invalidateCardQueries(queryClient);
      toast({ title: 'Próxima ação marcada como realizada.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao concluir ação',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReopen = async () => {
    if (!card.last_completed_action) return;
    const actionText = card.last_completed_action;
    setIsReopening(true);
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          next_action: actionText,
          last_completed_action: null,
          last_completed_action_at: null,
          last_completed_action_by: null,
          next_action_completed_at: null,
          next_action_completed_by: null,
        })
        .eq('id', card.id);
      if (error) throw error;
      setLocalNextAction(actionText);

      void logCardActivity({
        cardId: card.id,
        actorUserId: user?.id,
        eventType: 'next_action_changed',
        title: 'Ação reaberta',
        description: `Ação reaberta: ${actionText}`,
        oldValue: null,
        newValue: actionText,
        metadata: { reopened: true },
      });

      invalidateCardQueries(queryClient);
      toast({ title: 'Ação reaberta.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao reabrir ação',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsReopening(false);
    }
  };

  const initials = (name?: string | null) =>
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Andamento
        </h3>
        {hasPendingAction && dueDate && (overdue || today) && (
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              overdue
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-warning/30 bg-warning/10 text-warning'
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            {overdue ? 'Prazo vencido' : 'Vence hoje'}
          </Badge>
        )}
      </div>

      {/* Stage Stepper — etapas reais do board */}
      <StageStepper columns={columns} currentColumnId={card.column_id} />

      {/* Etapa Atual e Info Operacional */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h4 className="text-lg font-bold text-foreground">
            {currentColumn?.name || 'Etapa não identificada'}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium gap-1.5 h-6">
              <Clock className="h-3 w-3" />
              {formatTimeElapsed(card.column_entered_at)} na etapa
            </Badge>
            
            {badges.filter(b => b.kind === 'secondary_status').map((badge) => (
              <Badge 
                key={badge.key}
                variant="outline"
                className={cn("font-bold gap-1.5 h-6", toneClassesResolver(badge.tone))}
              >
                <badge.icon className="h-3 w-3" />
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Metadados discretos */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 py-3 border-y border-dashed border-border/60">
          {card.last_moved_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="h-3.5 w-3.5 opacity-70" />
              <span>
                Última movimentação: <span className="font-medium text-foreground/80">{format(new Date(card.last_moved_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                {card.last_moved_by_profile && (
                  <span className="opacity-70"> por {card.last_moved_by_profile.full_name.split(' ')[0]}</span>
                )}
              </span>
            </div>
          )}
          {card.updated_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCcw className="h-3.5 w-3.5 opacity-70" />
              <span>
                Última atualização: <span className="font-medium text-foreground/80">{format(new Date(card.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasPendingAction && (
        <div className="mb-3 rounded-md border border-dashed bg-muted/30 px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Inbox className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground/80">Nenhuma próxima ação definida</p>
              {card.last_completed_action && lastCompletedAt && (
                <p className="text-xs truncate">
                  Última: "{card.last_completed_action}" — concluída{' '}
                  {formatDistanceToNow(lastCompletedAt, { addSuffix: true, locale: ptBR })}
                  {lastCompletedProfile ? ` por ${lastCompletedProfile.full_name}` : ''}
                </p>
              )}
            </div>
          </div>
          {canReopen && canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={isReopening}
              className="flex-shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reabrir ação
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Próxima ação - ocupa linha cheia */}
        <div className="md:col-span-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            Próxima ação
          </Label>
          <div className="flex gap-2">
            <Input
              value={localNextAction}
              onChange={(e) => setLocalNextAction(e.target.value)}
              onBlur={handleNextActionBlur}
              placeholder='Ex: "Cobrar comprovante de renda do fiador 2"'
              disabled={!canEdit}
              className="flex-1"
            />
            {hasPendingAction && canEdit && (
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={handleMarkAsDone}
                disabled={isCompleting}
                className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Marcar próxima ação como realizada"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Marcar como realizada</span>
              </Button>
            )}
          </div>
        </div>

        {/* Responsável */}
        <div>
          <Label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Responsável
          </Label>
          <Select
            value={card.responsible_user_id || NONE_VALUE}
            onValueChange={handleResponsibleChange}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione…">
                {responsibleProfile ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {initials(responsibleProfile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{responsibleProfile.full_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Sem responsável</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                <span className="text-muted-foreground">Sem responsável</span>
              </SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {initials(p.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{p.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prazo */}
        <div>
          <Label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Prazo
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePickerInput
                value={dueDate || undefined}
                onChange={handleDueDateChange}
                disabled={!canEdit || updateCard.isPending}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="relative w-[110px]">
              <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="time"
                value={localDueTime}
                onChange={handleDueTimeChange}
                onBlur={handleDueTimeBlur}
                disabled={!canEdit || !localDueDate || updateCard.isPending}
                className="h-9 pl-7 text-sm"
                placeholder="--:--"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stepper horizontal mostrando as etapas reais (columns) do board do card.
 * Inspirado no preview Modelo C — Focus Semi-Dark. Visual apenas: não altera
 * column_id; movimentação continua via drag-and-drop / fluxos existentes.
 */
function StageStepper({
  columns,
  currentColumnId,
}: {
  columns: Array<{ id: string; name: string; position: number }>;
  currentColumnId: string | null | undefined;
}) {
  if (!columns || columns.length === 0) return null;

  const currentIndex = columns.findIndex((c) => c.id === currentColumnId);

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-4 overflow-x-auto lp-thin-scroll">
      <div className="flex items-start gap-0 min-w-max md:min-w-0">
        {columns.map((col, i) => {
          const state: 'done' | 'current' | 'todo' =
            currentIndex === -1
              ? 'todo'
              : i < currentIndex
              ? 'done'
              : i === currentIndex
              ? 'current'
              : 'todo';
          const isLast = i === columns.length - 1;
          return (
            <div
              key={col.id}
              className="relative flex-1 min-w-[110px] flex flex-col items-center gap-2 px-1"
            >
              {/* Connector line (atrás do círculo) */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-[11px] left-1/2 right-[-50%] h-[2px] z-0',
                    i < currentIndex
                      ? 'bg-emerald-500'
                      : 'bg-border'
                  )}
                />
              )}
              {/* Bolinha do passo */}
              <div
                className={cn(
                  'relative z-10 h-[22px] w-[22px] rounded-full inline-flex items-center justify-center border-2',
                  state === 'done' &&
                    'bg-emerald-500 border-transparent text-white',
                  state === 'current' &&
                    'bg-amber-500 border-transparent text-white',
                  state === 'todo' && 'bg-background border-border text-muted-foreground'
                )}
                title={col.name}
              >
                {state === 'done' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : state === 'current' ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-[10.5px] font-semibold text-center leading-tight max-w-[100px] uppercase tracking-wider',
                  state === 'current'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {col.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}