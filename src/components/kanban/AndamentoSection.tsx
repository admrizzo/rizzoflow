import { useEffect, useState } from 'react';
import { CardWithRelations } from '@/types/database';
import { useCards } from '@/hooks/useCards';
import { useProfiles } from '@/hooks/useProfiles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, User, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday } from 'date-fns';
import { formatDateOnly, isDateOverdue, parseDatabaseDate } from '@/lib/dateUtils';

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

  const [localNextAction, setLocalNextAction] = useState(card.next_action || '');

  useEffect(() => {
    setLocalNextAction(card.next_action || '');
  }, [card.id, card.next_action]);

  const responsibleProfile =
    card.responsible_user_profile ||
    (card.responsible_user_id
      ? profiles.find((p) => p.user_id === card.responsible_user_id)
      : null);

  const dueDate = parseDatabaseDate(card.next_action_due_date);
  const overdue = dueDate ? isDateOverdue(dueDate) : false;
  const today = dueDate ? isToday(dueDate) : false;

  const handleNextActionBlur = () => {
    const next = localNextAction.trim();
    if (next === (card.next_action || '')) return;
    updateCard.mutate({ id: card.id, next_action: next || null });
  };

  const handleResponsibleChange = (value: string) => {
    const userId = value === NONE_VALUE ? null : value;
    updateCard.mutate({ id: card.id, responsible_user_id: userId });
  };

  const handleDueDateChange = (date: Date | undefined) => {
    // Store as YYYY-MM-DD (DATE column)
    const iso = date ? formatDateOnly(date) : null;
    updateCard.mutate({ id: card.id, next_action_due_date: iso });
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
        {dueDate && (overdue || today) && (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Próxima ação - ocupa linha cheia */}
        <div className="md:col-span-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            Próxima ação
          </Label>
          <Input
            value={localNextAction}
            onChange={(e) => setLocalNextAction(e.target.value)}
            onBlur={handleNextActionBlur}
            placeholder='Ex: "Cobrar comprovante de renda do fiador 2"'
            disabled={!canEdit}
          />
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
          <DatePickerInput
            value={dueDate || undefined}
            onChange={handleDueDateChange}
            disabled={!canEdit || updateCard.isPending}
            placeholder="dd/mm/aaaa"
          />
        </div>
      </div>
    </div>
  );
}