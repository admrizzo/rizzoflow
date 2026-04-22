import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Building2, User, CheckCircle2, AlertTriangle, Calendar, Banknote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const paymentResponsibleOptions = [
  { value: 'imobiliaria', label: 'Imobiliária', icon: Building2, color: 'bg-blue-600 hover:bg-blue-700' },
  { value: 'proprietario', label: 'Proprietário', icon: User, color: 'bg-orange-600 hover:bg-orange-700' },
  { value: 'locatario', label: 'Locatário', icon: User, color: 'bg-purple-600 hover:bg-purple-700' },
] as const;

interface ApproveServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  budgetValue: number | null;
  onConfirm: (data: {
    agreed_value: number | null;
    completion_deadline: string | null;
    payment_responsible: string;
  }) => void;
}

export function ApproveServiceDialog({
  open,
  onOpenChange,
  providerName,
  budgetValue,
  onConfirm,
}: ApproveServiceDialogProps) {
  const [agreedValue, setAgreedValue] = useState(budgetValue?.toString() || '');
  const [completionDeadline, setCompletionDeadline] = useState<Date | undefined>(undefined);
  const [paymentResponsible, setPaymentResponsible] = useState('');

  const parsedValue = agreedValue ? parseFloat(agreedValue) : null;
  const isValid = parsedValue !== null && parsedValue > 0 && completionDeadline && paymentResponsible;

  const missingFields = [];
  if (!parsedValue || parsedValue <= 0) missingFields.push('Valor fechado');
  if (!completionDeadline) missingFields.push('Previsão de término');
  if (!paymentResponsible) missingFields.push('Responsável pelo pagamento');

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      agreed_value: parsedValue,
      completion_deadline: completionDeadline ? completionDeadline.toISOString().split('T')[0] : null,
      payment_responsible: paymentResponsible,
    });
    // Reset state
    setAgreedValue('');
    setCompletionDeadline(undefined);
    setPaymentResponsible('');
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setAgreedValue(budgetValue?.toString() || '');
      setCompletionDeadline(undefined);
      setPaymentResponsible('');
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Liberar para Execução
          </DialogTitle>
          <DialogDescription>
            Confirme os dados para liberar o serviço de <strong>{providerName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Valor fechado */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Valor fechado (R$) <span className="text-destructive">*</span>
            </Label>
            <CurrencyInput
              value={agreedValue}
              onValueChange={setAgreedValue}
              placeholder={budgetValue ? budgetValue.toFixed(2).replace('.', ',') : '0,00'}
              className={cn(
                "h-10",
                !agreedValue && "border-amber-400 bg-amber-50/50"
              )}
              autoFocus
            />
            {budgetValue && (
              <p className="text-[11px] text-muted-foreground">
                Orçamento: R$ {budgetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Previsão de término */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Previsão de término <span className="text-destructive">*</span>
            </Label>
            <DatePickerInput
              value={completionDeadline}
              onChange={(d) => setCompletionDeadline(d || undefined)}
              className={cn(
                !completionDeadline && "[&>input]:border-amber-400 [&>input]:bg-amber-50/50"
              )}
            />
          </div>

          {/* Quem paga */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Quem paga? <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              {paymentResponsibleOptions.map(({ value, label, icon: Icon, color }) => (
                <Button
                  key={value}
                  type="button"
                  variant={paymentResponsible === value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1 h-10 text-xs gap-1.5",
                    paymentResponsible === value && color,
                    !paymentResponsible && "border-amber-400 bg-amber-50/50 hover:bg-amber-100/50"
                  )}
                  onClick={() => setPaymentResponsible(value)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Missing fields warning */}
          {missingFields.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs">
                Preencha: <strong>{missingFields.join(', ')}</strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmar Liberação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
