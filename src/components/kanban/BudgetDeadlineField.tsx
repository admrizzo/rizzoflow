import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Clock, Ban, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { isDateOverdue } from '@/lib/dateUtils';
import { BoardField } from '@/types/database';

interface BudgetDeadlineValue {
  date: string | null;
  dispensed: boolean;
  dispensed_at?: string;
}

interface BudgetDeadlineFieldProps {
  field: BoardField;
  value: string | null;
  onSave: (value: string | null) => void;
  isEditor: boolean;
}

function parseValue(raw: string | null): BudgetDeadlineValue {
  if (!raw) return { date: null, dispensed: false };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'dispensed' in parsed) {
      return parsed as BudgetDeadlineValue;
    }
    // Legacy: raw ISO date string
    return { date: raw, dispensed: false };
  } catch {
    // Legacy: raw ISO date string
    return { date: raw, dispensed: false };
  }
}

export function BudgetDeadlineField({ field, value, onSave, isEditor }: BudgetDeadlineFieldProps) {
  const parsed = parseValue(value);
  const dateValue = parsed.date ? new Date(parsed.date) : undefined;
  const isDispensed = parsed.dispensed;
  const isOverdue = dateValue && !isDispensed && isDateOverdue(dateValue);

  const save = (v: BudgetDeadlineValue) => {
    onSave(JSON.stringify(v));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Normalize to noon UTC to avoid timezone-related day shifts
      const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
      save({ ...parsed, date: normalized.toISOString(), dispensed: false });
    } else {
      save({ ...parsed, date: null, dispensed: false });
    }
  };

  const handleDispense = () => {
    save({ ...parsed, dispensed: true, dispensed_at: new Date().toISOString() });
  };

  const handleUndoDispense = () => {
    save({ ...parsed, dispensed: false, dispensed_at: undefined });
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isOverdue && "bg-amber-100 border-amber-400",
      isDispensed && "bg-muted/50 border-muted",
      !isOverdue && !isDispensed && "bg-muted/30 border-muted"
    )}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {field.field_name}
        {isOverdue && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        {isDispensed && <span className="text-xs text-muted-foreground font-normal ml-1">(dispensado)</span>}
      </Label>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1">
          <DatePickerInput
            value={dateValue}
            onChange={handleDateChange}
            disabled={!isEditor || isDispensed}
            className={cn(
              isOverdue && "[&>input]:border-amber-400 [&>input]:bg-amber-50",
              isDispensed && "opacity-50"
            )}
          />
        </div>

        {isEditor && !isDispensed && (
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap text-muted-foreground"
            onClick={handleDispense}
          >
            <Ban className="h-4 w-4 mr-1" />
            Dispensar prazo
          </Button>
        )}

        {isEditor && isDispensed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndoDispense}
          >
            Reabrir
          </Button>
        )}
      </div>

      {isOverdue && (
        <p className="text-xs text-amber-700 mt-2 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Prazo para orçamento vencido!
        </p>
      )}

      {isDispensed && parsed.dispensed_at && (
        <p className="text-xs text-muted-foreground mt-2">
          Prazo dispensado em {format(new Date(parsed.dispensed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
