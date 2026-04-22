import { useState } from 'react';
import { MaintenanceProvider } from '@/hooks/useMaintenanceProviders';
import { useProfiles } from '@/hooks/useProfiles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { CheckCircle2, Phone, XCircle, Calendar, AlertTriangle, Banknote, Building2, User, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isDateOverdue } from '@/lib/dateUtils';

const reimbursementStatusLabels: Record<string, { label: string; color: string }> = {
  reembolsado: { label: 'Proprietário reembolsou a imobiliária', color: 'bg-green-100 text-green-700' },
  assumido: { label: 'Imobiliária assumiu o custo', color: 'bg-blue-100 text-blue-700' },
  descontar_repasse: { label: 'Lançado para descontar no repasse do aluguel', color: 'bg-amber-100 text-amber-700' },
};

const paymentResponsibleLabels: Record<string, { label: string; icon: typeof Building2 }> = {
  imobiliaria: { label: 'Imobiliária paga', icon: Building2 },
  proprietario: { label: 'Proprietário paga direto', icon: User },
  locatario: { label: 'Locatário paga direto', icon: User },
};

interface ApprovedProviderCardProps {
  provider: MaintenanceProvider;
  onUpdate: (updates: Partial<MaintenanceProvider>) => void;
  onDeselect: () => void;
  canEdit: boolean;
  formatCurrency: (value: number | null) => string;
  completionDeadline?: string | null;
  onCompletionDeadlineChange?: (date: string | null) => void;
  currentUserId?: string;
}

export function ApprovedProviderCard({ 
  provider, onUpdate, onDeselect, canEdit, formatCurrency,
  completionDeadline, onCompletionDeadlineChange, currentUserId,
}: ApprovedProviderCardProps) {
  const [localAgreedValue, setLocalAgreedValue] = useState(provider.agreed_value?.toString() || '');
  const [localPaymentNotes, setLocalPaymentNotes] = useState(provider.payment_notes || '');
  const { profiles } = useProfiles();
  const now = () => new Date().toISOString();
  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find(p => p.user_id === userId)?.full_name || null;
  };
  
  const deadlineDate = completionDeadline ? new Date(completionDeadline) : undefined;
  const isPaid = provider.payment_status === 'pago';
  const isServiceCompleted = !!provider.service_completed_at;
  const isImobiliariaPays = provider.payment_responsible === 'imobiliaria';
  const isOverdue = deadlineDate && !isPaid && isDateOverdue(deadlineDate);

  // Check if reimbursement is resolved (for archive blocking)
  const isReimbursementPending = isImobiliariaPays && isPaid && !provider.reimbursement_status;

  const handleMarkServiceCompleted = () => {
    onUpdate({
      service_completed_at: now(),
      service_completed_by: currentUserId || null,
    });
  };

  const handleUndoServiceCompleted = () => {
    onUpdate({
      service_completed_at: null,
      service_completed_by: null,
    });
  };

  const handleRegisterPayment = () => {
    onUpdate({
      payment_status: 'pago',
      paid_at: now(),
      payment_value: provider.agreed_value || provider.budget_value,
      payment_status_changed_by: currentUserId || null,
      payment_status_changed_at: now(),
    });
  };

  const handleUndoPayment = () => {
    onUpdate({
      payment_status: 'pendente',
      paid_at: null,
      payment_status_changed_by: null,
      payment_status_changed_at: null,
    });
  };

  return (
    <div className={cn(
      "border-2 rounded-lg p-3 space-y-3",
      isPaid && !isReimbursementPending
        ? "border-green-400 bg-green-50/60 dark:bg-green-950/20 dark:border-green-700"
        : isReimbursementPending
          ? "border-amber-400 bg-amber-50/60"
          : isOverdue 
            ? "border-amber-400 bg-amber-50/60" 
            : "border-green-300 bg-green-50/60 dark:bg-green-950/20 dark:border-green-800"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Serviço Aprovado</span>
          {provider.service_category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {provider.service_category}
            </Badge>
          )}
        </div>
        {canEdit && !isPaid && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1" onClick={onDeselect}>
            <XCircle className="h-3 w-3" />
            Desfazer
          </Button>
        )}
      </div>

      {/* Approval audit info */}
      {provider.approved_at && (
        <p className="text-[10px] text-green-700 dark:text-green-400">
          Liberado em {format(new Date(provider.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          {provider.approved_by && (() => {
            const name = getProfileName(provider.approved_by);
            return name ? ` por ${name}` : '';
          })()}
        </p>
      )}

      {/* Provider info + budget value */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{provider.provider_name}</span>
          {provider.provider_phone && (
            <a
              href={`https://wa.me/55${provider.provider_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-green-600"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-bold">{formatCurrency(provider.agreed_value ?? provider.budget_value)}</span>
          {provider.agreed_value && provider.budget_value && provider.agreed_value !== provider.budget_value && (
            <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(provider.budget_value)}</p>
          )}
        </div>
      </div>

      {/* Completion deadline */}
      {onCompletionDeadlineChange && (
        <div className={cn(
          "pt-2 border-t",
          isOverdue ? "border-amber-300" : "border-green-200 dark:border-green-800"
        )}>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="h-3 w-3" />
            Previsão de Término
            {isOverdue && <AlertTriangle className="h-3 w-3 text-amber-600 ml-1" />}
          </Label>
          <DatePickerInput
            value={deadlineDate}
            onChange={(date) => onCompletionDeadlineChange(date ? date.toISOString() : null)}
            disabled={!canEdit}
            className={cn(
              "text-xs",
              isOverdue && "[&>input]:border-amber-400 [&>input]:bg-amber-50"
            )}
          />
          {isOverdue && (
            <p className="text-[10px] text-amber-700 mt-1 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Prazo de término vencido!
            </p>
          )}
        </div>
      )}

      {/* Financial control */}
      <div className={cn(
        "pt-2 border-t space-y-3",
        isOverdue ? "border-amber-300" : "border-green-200 dark:border-green-800"
      )}>
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Controle Financeiro</Label>
        </div>

        {/* Payment responsible selector */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1">Quem paga?</Label>
          {canEdit ? (
            <div className="flex gap-1.5">
              {Object.entries(paymentResponsibleLabels).map(([value, { label, icon: Icon }]) => (
                <Button
                  key={value}
                  variant={provider.payment_responsible === value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 text-[11px] gap-1 flex-1",
                    provider.payment_responsible === value && value === 'imobiliaria' && "bg-blue-600 hover:bg-blue-700",
                    provider.payment_responsible === value && value === 'proprietario' && "bg-orange-600 hover:bg-orange-700",
                    provider.payment_responsible === value && value === 'locatario' && "bg-purple-600 hover:bg-purple-700",
                  )}
                  onClick={() => onUpdate({ payment_responsible: value })}
                >
                  <Icon className="h-3 w-3" />
                  {label.replace(' paga', '').replace(' direto', '')}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {(() => {
                const info = paymentResponsibleLabels[provider.payment_responsible] || paymentResponsibleLabels.imobiliaria;
                const Icon = info.icon;
                return (
                  <Badge variant="secondary" className={cn(
                    "text-[10px]",
                    provider.payment_responsible === 'proprietario' ? 'bg-orange-100 text-orange-700' 
                    : provider.payment_responsible === 'locatario' ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                  )}>
                    <Icon className="h-3 w-3 mr-1" />
                    {info.label}
                  </Badge>
                );
              })()}
            </div>
          )}
        </div>

        {/* Agreed value (valor fechado) */}
        <div className="max-w-[200px]">
          <Label className="text-xs text-muted-foreground">Valor fechado (R$)</Label>
          <CurrencyInput
            className="h-8 text-xs"
            value={localAgreedValue}
            onValueChange={setLocalAgreedValue}
            onBlurSave={() => {
              const val = localAgreedValue ? parseFloat(localAgreedValue) : null;
              if (val !== provider.agreed_value) onUpdate({ agreed_value: val });
            }}
            disabled={!canEdit}
            placeholder={provider.budget_value ? provider.budget_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Valor real da execução (pode diferir do orçamento)</p>
        </div>


        {/* Service completed milestone */}
        <div className={cn(
          "pt-2 border-t",
          isOverdue ? "border-amber-300" : "border-green-200 dark:border-green-800"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conclusão do Serviço</Label>
          </div>
          {!isServiceCompleted ? (
            canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-9 text-xs gap-1.5 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                onClick={handleMarkServiceCompleted}
              >
                <Wrench className="h-3.5 w-3.5" />
                Marcar serviço como concluído
              </Button>
            )
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-teal-700">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  Concluído em {format(new Date(provider.service_completed_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {provider.service_completed_by && (() => {
                    const name = getProfileName(provider.service_completed_by);
                    return name ? ` por ${name}` : '';
                  })()}
                </span>
              </div>
              {canEdit && !isPaid && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-muted-foreground px-1" onClick={handleUndoServiceCompleted}>
                  Desfazer
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Payment action — only available after service completed */}
        {!isPaid ? (
          canEdit && isServiceCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs gap-1.5 border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800"
              onClick={handleRegisterPayment}
            >
              <Banknote className="h-3.5 w-3.5" />
              {isImobiliariaPays ? 'Registrar pagamento' : 'Registrar que o prestador recebeu'}
            </Button>
          )
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  {isImobiliariaPays ? 'Pago' : 'Prestador recebeu'} em {format(new Date(provider.paid_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {provider.payment_status_changed_by && (() => {
                    const name = getProfileName(provider.payment_status_changed_by);
                    return name ? ` por ${name}` : '';
                  })()}
                </span>
              </div>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-muted-foreground px-1" onClick={handleUndoPayment}>
                  Desfazer
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Reimbursement tracking — only for imobiliária after payment */}
        {isImobiliariaPays && isPaid && (
          <div className={cn(
            "pt-2 border-t",
            isReimbursementPending ? "border-amber-300" : "border-green-200 dark:border-green-800"
          )}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Confirmação do reembolso
              {isReimbursementPending && (
                <span className="text-amber-600 ml-1 font-medium">⚠ Pendente</span>
              )}
            </Label>
            {canEdit ? (
              <div className="flex flex-col gap-1.5">
                {Object.entries(reimbursementStatusLabels).map(([value, { label, color }]) => (
                  <Button
                    key={value}
                    variant={provider.reimbursement_status === value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto py-1.5 px-3 text-xs justify-start text-left whitespace-normal",
                      provider.reimbursement_status === value && color,
                    )}
                    onClick={() => onUpdate({
                      reimbursement_status: provider.reimbursement_status === value ? null : value,
                      reimbursement_status_changed_by: currentUserId || null,
                      reimbursement_status_changed_at: now(),
                    })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            ) : provider.reimbursement_status ? (
              <Badge variant="secondary" className={cn(
                "text-[10px]",
                reimbursementStatusLabels[provider.reimbursement_status]?.color
              )}>
                {reimbursementStatusLabels[provider.reimbursement_status]?.label || provider.reimbursement_status}
              </Badge>
            ) : (
              <p className="text-[10px] text-amber-600 italic">Pendente de definição</p>
            )}
            {provider.reimbursement_status && provider.reimbursement_status_changed_at && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Definido em {format(new Date(provider.reimbursement_status_changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {provider.reimbursement_status_changed_by && (() => {
                  const name = getProfileName(provider.reimbursement_status_changed_by);
                  return name ? ` por ${name}` : '';
                })()}
              </p>
            )}
          </div>
        )}

        {/* Payment notes */}
        {canEdit ? (
          <div>
            <Label className="text-xs text-muted-foreground">Observação do pagamento</Label>
            <Textarea
              className="text-xs min-h-[40px]"
              value={localPaymentNotes}
              onChange={(e) => setLocalPaymentNotes(e.target.value)}
              onBlur={() => {
                if (localPaymentNotes !== (provider.payment_notes || '')) {
                  onUpdate({ payment_notes: localPaymentNotes || null });
                }
              }}
              placeholder="Ex: NF nº 1234, pago via PIX..."
              rows={2}
            />
          </div>
        ) : provider.payment_notes ? (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{provider.payment_notes}</p>
        ) : null}
      </div>
    </div>
  );
}
