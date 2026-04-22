import { useState, useEffect, useRef } from 'react';
import { useBoardFields } from '@/hooks/useBoardFields';
import { useCardFieldValues } from '@/hooks/useCardFieldValues';
import { useMaintenanceProviders } from '@/hooks/useMaintenanceProviders';
import { BoardField, CardWithRelations } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VacancyDeadlineField } from './VacancyDeadlineField';
import { BudgetDeadlineField } from './BudgetDeadlineField';

interface CustomFieldsSectionProps {
  boardId: string;
  cardId: string;
  card: CardWithRelations;
  isEditor: boolean;
  isMaintenanceBoard?: boolean;
}

export function CustomFieldsSection({ boardId, cardId, card, isEditor, isMaintenanceBoard }: CustomFieldsSectionProps) {
  const { fields, isLoading: fieldsLoading } = useBoardFields(boardId);
  const { values, upsertValue, getValueForField } = useCardFieldValues(cardId);
  const { selectedProvider } = useMaintenanceProviders(isMaintenanceBoard ? cardId : undefined);

  if (fieldsLoading || fields.length === 0) {
    return null;
  }

  // Check if this is the vacancy deadline field
  const isVacancyDeadlineField = (field: BoardField) => 
    field.field_type === 'date' && field.field_name.toLowerCase().includes('desocupação');

  // Check if this is the budget deadline field (with dispense support)
  const isBudgetDeadlineField = (field: BoardField) =>
    field.field_type === 'date' && field.field_name.toLowerCase().includes('prazo para orçamento');

  // Check if this is the "Previsão de Término" field (only show when provider is selected)
  const isCompletionDeadlineField = (field: BoardField) =>
    field.field_type === 'date' && field.field_name.toLowerCase().includes('previsão de término');

  // Check if this is the "Responsável pelo Pagamento" field (handled by provider section)
  const isPaymentResponsibleField = (field: BoardField) =>
    field.field_name.toLowerCase().includes('responsável pelo pagamento');

  // Check if this is the "Categoria do serviço" field (handled by service section)
  const isServiceCategoryField = (field: BoardField) =>
    field.field_name.toLowerCase().includes('categoria do serviço') || 
    field.field_name.toLowerCase().includes('categoria do servico');

  // Filter fields: hide fields already handled by service section in maintenance boards
  const visibleFields = fields.filter(field => {
    if (isMaintenanceBoard) {
      // These fields are now managed within each service entry
      if (isPaymentResponsibleField(field)) return false;
      if (isServiceCategoryField(field)) return false;
      if (isBudgetDeadlineField(field)) return false;
      if (isCompletionDeadlineField(field)) return false;
    }
    return true;
  });

  if (visibleFields.length === 0) return null;

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Campos Personalizados
      </h3>
      <div className="space-y-4">
        {visibleFields.map((field) => (
          isVacancyDeadlineField(field) ? (
            <VacancyDeadlineField
              key={field.id}
              field={field}
              cardId={cardId}
              card={card}
              value={getValueForField(field.id)}
              onSave={(value) => upsertValue.mutate({ cardId, fieldId: field.id, value })}
              isEditor={isEditor}
            />
          ) : isBudgetDeadlineField(field) ? (
            <BudgetDeadlineField
              key={field.id}
              field={field}
              value={getValueForField(field.id)}
              onSave={(value) => upsertValue.mutate({ cardId, fieldId: field.id, value })}
              isEditor={isEditor}
            />
          ) : (
            <CustomFieldInput
              key={field.id}
              field={field}
              cardId={cardId}
              value={getValueForField(field.id)}
              onSave={(value) => upsertValue.mutate({ cardId, fieldId: field.id, value })}
              isEditor={isEditor}
            />
          )
        ))}
      </div>
    </div>
  );
}

interface CustomFieldInputProps {
  field: BoardField;
  cardId: string;
  value: string | null;
  onSave: (value: string | null) => void;
  isEditor: boolean;
}

function CustomFieldInput({ field, value, onSave, isEditor }: CustomFieldInputProps) {
  const [localValue, setLocalValue] = useState(value || '');
  // Use ref to track focus to avoid re-render triggering useEffect sync
  const isFocusedRef = useRef(false);

  useEffect(() => {
    // Only sync from prop when not focused to avoid overwriting user input
    if (!isFocusedRef.current) {
      setLocalValue(value || '');
    }
  }, [value]);

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (localValue !== (value || '')) {
      onSave(localValue || null);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (localValue !== (value || '')) {
        onSave(localValue || null);
      }
    }
  };

  // Check if this is a currency field (for text type too)
  const isCurrencyField = field.field_name.toLowerCase().includes('valor') || 
                          field.field_name.toLowerCase().includes('avaliação');

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const numValue = parseFloat(value.replace(/[^\d]/g, '')) / 100;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    setLocalValue(rawValue);
  };

  const handleCurrencyBlur = () => {
    isFocusedRef.current = false;
    if (localValue !== (value || '')) {
      onSave(localValue || null);
    }
  };

  const handleCurrencyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (localValue !== (value || '')) {
        onSave(localValue || null);
      }
    }
  };

  switch (field.field_type) {
    case 'text':
      // Check if this should be a currency input
      if (isCurrencyField) {
        return (
          <div>
            <Label className="text-sm font-medium">
              {field.field_name}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatCurrency(localValue)}
                onChange={handleCurrencyChange}
                onFocus={handleFocus}
                onBlur={handleCurrencyBlur}
                onKeyDown={handleCurrencyKeyDown}
                placeholder="0,00"
                disabled={!isEditor}
                className={cn(
                  "pl-10",
                  field.is_required && !localValue && "border-amber-400"
                )}
              />
            </div>
            {field.is_required && !localValue && (
              <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
            )}
          </div>
        );
      }
      
      return (
        <div>
          <Label className="text-sm font-medium">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={`Digite ${field.field_name.toLowerCase()}`}
            disabled={!isEditor}
            className={field.is_required && !localValue ? 'border-amber-400 mt-1' : 'mt-1'}
          />
          {field.is_required && !localValue && (
            <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div>
          <Label className="text-sm font-medium">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={`Digite ${field.field_name.toLowerCase()}`}
            rows={2}
            disabled={!isEditor}
            className={field.is_required && !localValue ? 'border-amber-400 mt-1' : 'mt-1'}
          />
          {field.is_required && !localValue && (
            <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
          )}
        </div>
      );

    case 'number':
      return (
        <div>
          <Label className="text-sm font-medium">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {isCurrencyField ? (
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatCurrency(localValue)}
                onChange={handleCurrencyChange}
                onBlur={handleCurrencyBlur}
                onKeyDown={handleCurrencyKeyDown}
                placeholder="0,00"
                disabled={!isEditor}
                className={cn(
                  "pl-10",
                  field.is_required && !localValue && "border-amber-400"
                )}
              />
            </div>
          ) : (
            <Input
              type="number"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={`Digite ${field.field_name.toLowerCase()}`}
              disabled={!isEditor}
              className={field.is_required && !localValue ? 'border-amber-400 mt-1' : 'mt-1'}
            />
          )}
          {field.is_required && !localValue && (
            <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
          )}
        </div>
      );

    case 'date':
      const dateValue = localValue ? new Date(localValue) : undefined;
      return (
        <div>
          <Label className="text-sm font-medium">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="mt-1">
            <DatePickerInput
              value={dateValue}
              onChange={(date) => {
                if (date) {
                  const isoDate = date.toISOString();
                  setLocalValue(isoDate);
                  onSave(isoDate);
                } else {
                  setLocalValue('');
                  onSave(null);
                }
              }}
              disabled={!isEditor}
              className={field.is_required && !dateValue ? '[&>input]:border-amber-400' : ''}
            />
          </div>
          {field.is_required && !dateValue && (
            <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
          )}
        </div>
      );

    case 'select':
      // Parse JSON value for "Outro" support: { selected: string, otherText: string }
      let selectParsed: { selected: string; otherText: string } = { selected: '', otherText: '' };
      try {
        if (localValue) {
          const p = JSON.parse(localValue);
          if (p && typeof p === 'object' && 'selected' in p) {
            selectParsed = p;
          } else {
            selectParsed = { selected: localValue, otherText: '' };
          }
        }
      } catch {
        selectParsed = { selected: localValue, otherText: '' };
      }

      const hasOutroOption = field.field_options.includes('Outro');
      const isOutroSelected = selectParsed.selected === 'Outro';

      const handleSelectChange = (v: string) => {
        if (hasOutroOption && v === 'Outro') {
          const newVal = JSON.stringify({ selected: 'Outro', otherText: selectParsed.otherText });
          setLocalValue(newVal);
          onSave(newVal);
        } else {
          setLocalValue(v);
          onSave(v || null);
        }
      };

      const handleSelectOtherBlur = () => {
        const newVal = JSON.stringify({ selected: 'Outro', otherText: selectParsed.otherText });
        setLocalValue(newVal);
        onSave(newVal);
      };

      return (
        <div>
          <Label className="text-sm font-medium">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select
            value={selectParsed.selected || ''}
            onValueChange={handleSelectChange}
            disabled={!isEditor}
          >
            <SelectTrigger className={field.is_required && !selectParsed.selected ? 'border-amber-400 mt-1' : 'mt-1'}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {field.field_options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOutroSelected && (
            <div className="mt-2">
              <Input
                value={selectParsed.otherText}
                onChange={(e) => {
                  const newVal = JSON.stringify({ selected: 'Outro', otherText: e.target.value });
                  setLocalValue(newVal);
                }}
                onBlur={handleSelectOtherBlur}
                placeholder="Especifique..."
                disabled={!isEditor}
                className="h-8 text-sm"
              />
            </div>
          )}
          {field.is_required && !selectParsed.selected && (
            <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
          )}
        </div>
      );

    case 'checkbox':
      const isChecked = localValue === 'true';
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.id}
            checked={isChecked}
            onCheckedChange={(checked) => {
              const newValue = checked ? 'true' : 'false';
              setLocalValue(newValue);
              onSave(newValue);
            }}
            disabled={!isEditor}
          />
          <Label htmlFor={field.id} className="text-sm font-medium cursor-pointer">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      );

    case 'multi_checkbox':
      // Parse JSON value: { selected: string[], otherText: string }
      let multiCheckValue: { selected: string[]; otherText: string } = { selected: [], otherText: '' };
      try {
        if (localValue) {
          multiCheckValue = JSON.parse(localValue);
        }
      } catch {
        multiCheckValue = { selected: [], otherText: '' };
      }

      const handleMultiCheckChange = (option: string, checked: boolean) => {
        const newSelected = checked
          ? [...multiCheckValue.selected, option]
          : multiCheckValue.selected.filter((s) => s !== option);
        const newValue = { ...multiCheckValue, selected: newSelected };
        const jsonValue = JSON.stringify(newValue);
        setLocalValue(jsonValue);
        onSave(jsonValue);
      };

      const handleOtherTextChange = (text: string) => {
        const newValue = { ...multiCheckValue, otherText: text };
        const jsonValue = JSON.stringify(newValue);
        setLocalValue(jsonValue);
      };

      const handleOtherTextBlur = () => {
        onSave(localValue);
      };

      return (
        <div>
          <Label className="text-sm font-medium">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="mt-2 space-y-2">
            {field.field_options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={multiCheckValue.selected.includes(option)}
                  onCheckedChange={(checked) => handleMultiCheckChange(option, checked as boolean)}
                  disabled={!isEditor}
                />
                <Label htmlFor={`${field.id}-${option}`} className="text-sm cursor-pointer font-normal">
                  {option}
                </Label>
              </div>
            ))}
            {/* If "Outro" is selected, show text input */}
            {multiCheckValue.selected.includes('Outro') && (
              <div className="ml-6 mt-1">
                <Input
                  value={multiCheckValue.otherText}
                  onChange={(e) => handleOtherTextChange(e.target.value)}
                  onBlur={handleOtherTextBlur}
                  placeholder="Especifique..."
                  disabled={!isEditor}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
          {field.is_required && multiCheckValue.selected.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
