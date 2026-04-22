import { useState, useEffect } from 'react';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { isDateOverdue } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CardWithRelations, BoardField } from '@/types/database';

interface VacancyDeadlineFieldProps {
  field: BoardField;
  cardId: string;
  card: CardWithRelations;
  value: string | null;
  onSave: (value: string | null) => void;
  isEditor: boolean;
}

export function VacancyDeadlineField({ 
  field, 
  cardId, 
  card, 
  value, 
  onSave, 
  isEditor 
}: VacancyDeadlineFieldProps) {
  const { setVacancyDeadlineMet, notifyVacancyDeadlineOverdue } = useCards();
  const { user } = useAuth();
  const [hasNotified, setHasNotified] = useState(false);

  const dateValue = value ? new Date(value) : undefined;
  const isOverdue = dateValue && !card.vacancy_deadline_met && isDateOverdue(dateValue);
  const isMet = card.vacancy_deadline_met;

  // Notify when overdue (only once per session)
  useEffect(() => {
    if (isOverdue && !hasNotified && card.created_by) {
      notifyVacancyDeadlineOverdue.mutate({
        cardId,
        userId: card.created_by,
        cardTitle: card.title || card.building_name || 'Card'
      });
      setHasNotified(true);
    }
  }, [isOverdue, hasNotified, cardId, card.created_by, card.title, card.building_name]);

  const handleConfirmDelivery = () => {
    setVacancyDeadlineMet.mutate({ cardId, isMet: true });
  };

  const handleReopenDeadline = () => {
    setVacancyDeadlineMet.mutate({ cardId, isMet: false });
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isOverdue && "bg-amber-100 border-amber-400",
      isMet && "bg-green-50 border-green-300",
      !isOverdue && !isMet && "bg-muted/30 border-muted"
    )}>
      <Label className="text-sm font-medium flex items-center gap-2">
        {isOverdue && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        {isMet && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1">
          <DatePickerInput
            value={dateValue}
            onChange={(date) => {
              if (date) {
                const isoDate = date.toISOString();
                onSave(isoDate);
              } else {
                onSave(null);
              }
            }}
            disabled={!isEditor}
            className={cn(
              isOverdue && "[&>input]:border-amber-400 [&>input]:bg-amber-50",
              isMet && "[&>input]:border-green-300 [&>input]:bg-green-50"
            )}
          />
        </div>

        {/* Confirm Delivery Button - shows when date is set and not yet confirmed */}
        {dateValue && isEditor && !isMet && (
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
            onClick={handleConfirmDelivery}
            disabled={setVacancyDeadlineMet.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Entrega Confirmada
          </Button>
        )}

        {/* Reopen Deadline Button - shows when delivery was confirmed */}
        {isMet && isEditor && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReopenDeadline}
            disabled={setVacancyDeadlineMet.isPending}
          >
            Reabrir
          </Button>
        )}
      </div>

      {isOverdue && (
        <p className="text-xs text-amber-700 mt-2 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Prazo de desocupação vencido!
        </p>
      )}

      {isMet && card.vacancy_deadline_met_by_profile && (
        <p className="text-xs text-green-700 mt-2">
          Entrega confirmada por {card.vacancy_deadline_met_by_profile.full_name}
          {card.vacancy_deadline_met_at && (
            <> em {format(new Date(card.vacancy_deadline_met_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
          )}
        </p>
      )}

      {field.is_required && !dateValue && (
        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
      )}
    </div>
  );
}
