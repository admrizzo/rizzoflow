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
import { ArrowRight, User, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, RotateCcw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isDateOverdue, parseDatabaseDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logCardActivity } from '@/hooks/useCardActivityLogs';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCardQueries } from '@/lib/queryInvalidation';

interface AndamentoSectionProps {
  card: CardWithRelations;
  canEdit: boolean;
}

const NONE_VALUE = '__none__';

/**
 * Seção "Andamento" do card: próxima ação, responsável e prazo.
 * Layout limpo e responsivo.
 */
export function AndamentoSection({ card, canEdit }: AndamentoSectionProps) {
  const { updateCard } = useCards(card.board_id);
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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