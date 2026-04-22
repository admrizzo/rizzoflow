import { useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useProfiles } from '@/hooks/useProfiles';
import { useMaintenanceProviders, MaintenanceProvider } from '@/hooks/useMaintenanceProviders';
import { useBoardFields } from '@/hooks/useBoardFields';
import { useCardFieldValues } from '@/hooks/useCardFieldValues';
import { useProviderRegistry } from '@/hooks/useProviderRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Plus, Wrench, BarChart3, UserPlus, ChevronDown, ChevronUp, Trash2, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProviderReportDialog } from './maintenance/ProviderReportDialog';
import { BudgetRequestImageDialog } from './maintenance/BudgetRequestImageDialog';
import { ApprovedProviderCard } from './maintenance/ApprovedProviderCard';
import { ApproveServiceDialog } from './maintenance/ApproveServiceDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isDateOverdue } from '@/lib/dateUtils';

const SERVICE_CATEGORIES = [
  'Elétrica',
  'Hidráulica',
  'Alvenaria / Pedreiro',
  'Pintura',
  'Vidraçaria',
  'Serralheria',
  'Marcenaria',
  'Gesso / Drywall',
  'Impermeabilização',
  'Dedetização',
  'Limpeza',
  'Ar Condicionado',
  'Chaveiro',
  'Outro',
];

interface MaintenanceProvidersSectionProps {
  cardId: string;
  boardId: string;
  cardDescription?: string | null;
  cardTitle?: string;
  canEdit: boolean;
  superlogicaId?: string | null;
  address?: string | null;
  negotiationDetails?: string | null;
}

export function MaintenanceProvidersSection({ cardId, boardId, cardDescription, cardTitle, canEdit, superlogicaId, address, negotiationDetails }: MaintenanceProvidersSectionProps) {
  const {
    providers, addProvider, updateProvider, removeProvider,
  } = useMaintenanceProviders(cardId);
  const { fields } = useBoardFields(boardId);
  const { upsertValue, getValueForField } = useCardFieldValues(cardId);
  const { providers: registeredProviders, addProvider: addToRegistry } = useProviderRegistry();
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserName = profiles.find(p => p.user_id === user?.id)?.full_name || null;

  // Column IDs for auto-move
  const COLUMN_AGUARDANDO_ORCAMENTO = '490a5769-a211-472e-aa77-50015f436df7';
  const COLUMN_EM_EXECUCAO = '2442a3a5-cea9-4cf3-83ea-354515c4d347';
  const COLUMN_CONCLUIDO_PAGAMENTOS = '7fad469b-2b2e-471a-8b09-792a19876195';

  const moveCardToColumn = useCallback(async (columnId: string) => {
    try {
      await supabase
        .from('cards')
        .update({
          column_id: columnId,
          last_moved_by: user?.id || null,
          last_moved_at: new Date().toISOString(),
          column_entered_at: new Date().toISOString(),
        })
        .eq('id', cardId);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    } catch (err) {
      console.error('Erro ao mover card:', err);
    }
  }, [cardId, user?.id, queryClient]);

  // Completion deadline is now per-service (stored in maintenance_providers.completion_deadline)

  const [isAdding, setIsAdding] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [approveDialogService, setApproveDialogService] = useState<MaintenanceProvider | null>(null);

  // Add form state
  const [newCategory, setNewCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newBudgetDeadline, setNewBudgetDeadline] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewProvider, setIsNewProvider] = useState(false);

  const existingNames = providers.map(p => p.provider_name.toLowerCase());
  const filteredRegistry = useMemo(() => {
    if (!searchQuery.trim()) return registeredProviders.filter(p => !existingNames.includes(p.name.toLowerCase()));
    return registeredProviders.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [registeredProviders, searchQuery, existingNames]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = (providerName: string, providerPhone?: string) => {
    addProvider.mutate({
      card_id: cardId,
      provider_name: providerName.trim(),
      provider_phone: providerPhone?.trim() || undefined,
      created_by: user?.id,
      service_category: newCategory || undefined,
      budget_deadline: newBudgetDeadline ? newBudgetDeadline.toISOString().split('T')[0] : undefined,
    }, {
      onSuccess: () => {
        resetForm();
        // Auto-move to "Aguardando Orçamento" if it's the first provider being added
        if (providers.length === 0) {
          moveCardToColumn(COLUMN_AGUARDANDO_ORCAMENTO);
        }
      },
    });
  };

  const resetForm = () => {
    setNewCategory('');
    setNewName('');
    setNewPhone('');
    setNewSpecialty('');
    setNewNotes('');
    setNewBudgetDeadline(undefined);
    setSearchQuery('');
    setIsAdding(false);
    setIsNewProvider(false);
  };

  const handleSelectProvider = (provider: MaintenanceProvider) => {
    if (provider.is_selected) {
      // Deselecting
      updateProvider.mutate({
        id: provider.id,
        is_selected: false,
        budget_status: 'recebido',
        approved_by: null,
        approved_at: null,
      });
    } else {
      // Open dialog to collect required fields before approving
      setApproveDialogService(provider);
    }
  };

  const handleConfirmApproval = (provider: MaintenanceProvider, data: {
    agreed_value: number | null;
    completion_deadline: string | null;
    payment_responsible: string;
  }) => {
    updateProvider.mutate({
      id: provider.id,
      is_selected: true,
      budget_status: 'aprovado',
      approved_by: user?.id || null,
      approved_at: new Date().toISOString(),
      agreed_value: data.agreed_value,
      completion_deadline: data.completion_deadline,
      payment_responsible: data.payment_responsible,
    }, {
      onSuccess: () => {
        moveCardToColumn(COLUMN_EM_EXECUCAO);
      },
    });
    setApproveDialogService(null);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Separate services into active (selected/approved) and pending
  const approvedServices = providers.filter(p => p.is_selected);
  const pendingServices = providers.filter(p => !p.is_selected);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Label className="text-sm font-bold tracking-tight">Manutenção</Label>
            {providers.length > 0 && (
              <Badge variant="secondary" className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full">
                {providers.length}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ProviderReportDialog
            trigger={
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 px-2.5 text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Relatório
              </Button>
            }
          />
          <BudgetRequestImageDialog
            cardTitle={cardTitle}
            cardDescription={cardDescription}
            superlogicaId={superlogicaId}
            address={address}
            negotiationDetails={negotiationDetails}
            operatorName={currentUserName}
          />
          {canEdit && (
            <Button variant="default" size="sm" onClick={() => setIsAdding(true)} className="h-7 text-[11px] gap-1.5 px-3 ml-auto">
              <Plus className="h-3.5 w-3.5" />
              Novo Serviço
            </Button>
          )}
        </div>
      </div>

      {/* Add new service form */}
      {isAdding && (
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Novo Serviço</Label>

          {/* Category */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Categoria do serviço</Label>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget deadline */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Prazo para orçamento</Label>
            <DatePickerInput
              value={newBudgetDeadline}
              onChange={(d) => setNewBudgetDeadline(d || undefined)}
              className="text-xs"
            />
          </div>

          {/* Provider selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prestador</Label>
            <Input
              placeholder="Filtrar prestadores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />

            <div className="border rounded-md max-h-40 overflow-y-auto bg-background">
              {filteredRegistry.length > 0 ? (
                filteredRegistry.slice(0, 15).map(rp => (
                  <button
                    key={rp.id}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between border-b last:border-b-0"
                    onClick={() => handleAdd(rp.name, rp.phone || undefined)}
                  >
                    <div>
                      <span className="font-medium">{rp.name}</span>
                      {rp.specialty && <span className="text-muted-foreground ml-1.5 text-[10px]">({rp.specialty})</span>}
                      {rp.phone && <span className="text-muted-foreground ml-1.5 text-[10px]">{rp.phone}</span>}
                    </div>
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  {searchQuery.trim() 
                    ? 'Nenhum prestador encontrado.' 
                    : 'Nenhum prestador cadastrado.'}
                  <br />
                  <span className="text-[10px]">Cadastre prestadores na área de Administração.</span>
                </div>
              )}
            </div>

            <Button size="sm" variant="ghost" className="text-xs" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Approved/Selected services */}
      {approvedServices.map(service => (
        <ApprovedProviderCard
          key={service.id}
          provider={service}
          onUpdate={(updates) => {
            updateProvider.mutate({ id: service.id, ...updates }, {
              onSuccess: () => {
                // Auto-move to "Concluído e Verificando Pagamentos" when service is marked completed
                if (updates.service_completed_at && !service.service_completed_at) {
                  moveCardToColumn(COLUMN_CONCLUIDO_PAGAMENTOS);
                }
              },
            });
          }}
          onDeselect={() => handleSelectProvider(service)}
          canEdit={canEdit}
          formatCurrency={formatCurrency}
          completionDeadline={service.completion_deadline || null}
          onCompletionDeadlineChange={(date) => {
            updateProvider.mutate({ id: service.id, completion_deadline: date });
          }}
          currentUserId={user?.id}
        />
      ))}

      {/* Pending services list */}
      {pendingServices.length > 0 && (
        <div className="space-y-2">
          {approvedServices.length > 0 && (
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Outros Serviços / Orçamentos Pendentes
            </Label>
          )}
          {pendingServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              isExpanded={expandedIds.has(service.id)}
              onToggle={() => toggleExpand(service.id)}
              onUpdate={(updates) => updateProvider.mutate({ id: service.id, ...updates })}
              onRemove={() => removeProvider.mutate(service.id)}
              onApprove={() => handleSelectProvider(service)}
              canEdit={canEdit}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {providers.length === 0 && !isAdding && (
        <div className="text-center py-6 border rounded-lg border-dashed">
          <Wrench className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado.</p>
          {canEdit && (
            <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setIsAdding(true)}>
              Adicionar primeiro serviço
            </Button>
          )}
        </div>
      )}
      {/* Approve service dialog */}
      {approveDialogService && (
        <ApproveServiceDialog
          open={!!approveDialogService}
          onOpenChange={(open) => { if (!open) setApproveDialogService(null); }}
          providerName={approveDialogService.provider_name}
          budgetValue={approveDialogService.budget_value}
          onConfirm={(data) => handleConfirmApproval(approveDialogService, data)}
        />
      )}
    </div>
  );
}
// Individual service card (pending/not yet approved)
function ServiceCard({
  service, isExpanded, onToggle, onUpdate, onRemove, onApprove, canEdit, formatCurrency,
}: {
  service: MaintenanceProvider;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<MaintenanceProvider>) => void;
  onRemove: () => void;
  onApprove: () => void;
  canEdit: boolean;
  formatCurrency: (value: number | null) => string;
}) {
  const isFocusedRef = useRef(false);
  const [localBudget, setLocalBudget] = useState(service.budget_value?.toString() || '');
  const budgetDeadlineDate = service.budget_deadline ? new Date(service.budget_deadline + 'T12:00:00') : undefined;
  const isBudgetOverdue = budgetDeadlineDate && isDateOverdue(budgetDeadlineDate);
  const hasReceivedBudget = service.budget_status === 'recebido' || service.budget_status === 'aprovado';

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-colors",
      isBudgetOverdue && "border-amber-300 bg-amber-50/30",
    )}>
      {/* Compact header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {service.service_category && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {service.service_category}
              </Badge>
            )}
            <span className="text-xs font-semibold truncate">{service.provider_name}</span>
            {service.provider_phone && (
              <a
                href={`https://wa.me/55${service.provider_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-green-600"
              >
                <Phone className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className={cn(
              "text-[10px] px-1.5 py-0",
              service.budget_status === 'enviado' && "bg-blue-100 text-blue-700",
              service.budget_status === 'recebido' && "bg-yellow-100 text-yellow-700",
            )}>
              {service.budget_status === 'enviado' ? 'Aguardando orçamento' : service.budget_status === 'recebido' ? 'Orçamento recebido' : service.budget_status}
            </Badge>
            {service.budget_value !== null && (
              <span className="text-xs font-bold">{formatCurrency(service.budget_value)}</span>
            )}
            {isBudgetOverdue && (
              <span className="text-[10px] text-amber-700 font-medium">Prazo vencido!</span>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          {/* Category */}
          {canEdit && (
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={service.service_category || ''}
                onValueChange={(v) => onUpdate({ service_category: v || null })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Budget deadline */}
          <div>
            <Label className="text-xs text-muted-foreground">Prazo para orçamento</Label>
            <DatePickerInput
              value={budgetDeadlineDate}
              onChange={(d) => onUpdate({ budget_deadline: d ? d.toISOString().split('T')[0] : null })}
              disabled={!canEdit}
              className={cn("text-xs", isBudgetOverdue && "[&>input]:border-amber-400 [&>input]:bg-amber-50")}
            />
          </div>

          {/* Budget value */}
          <div>
            <Label className="text-xs text-muted-foreground">Valor do orçamento (R$)</Label>
            <CurrencyInput
              className="h-8 text-xs"
              value={localBudget}
              onValueChange={setLocalBudget}
              onBlurSave={() => {
                isFocusedRef.current = false;
                const val = localBudget ? parseFloat(localBudget) : null;
                if (val !== service.budget_value) {
                  onUpdate({
                    budget_value: val,
                    budget_status: val !== null ? 'recebido' : 'enviado',
                    budget_received_at: val !== null ? new Date().toISOString() : null,
                  });
                }
              }}
              disabled={!canEdit}
              placeholder="0,00"
            />
          </div>

          {/* Notes */}
          {service.notes && (
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded p-2">{service.notes}</p>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2 pt-1">
              {hasReceivedBudget && (
                <Button size="sm" className="text-xs gap-1 h-7 flex-1" onClick={onApprove}>
                  <CheckCircle2 className="h-3 w-3" />
                  Liberar para execução
                </Button>
              )}
              <Button size="sm" variant="destructive" className="text-xs gap-1 h-7" onClick={onRemove}>
                <Trash2 className="h-3 w-3" />
                Remover
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
