import { forwardRef } from 'react';
import { CardWithRelations, Column } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckSquare, Calendar, Archive, Clock, AlertTriangle, Home, Wrench, User, ArrowRight, Inbox, FileEdit, CheckCheck, MapPin, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import { isDateOverdue, formatDateTimeBR } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { ReviewDeadlineBadge } from './ReviewDeadlineBadge';
import { isReviewOverdue } from '@/hooks/useColumnReview';
import { getSlaStatus, getSlaColors, formatTimeElapsed } from '@/lib/slaUtils';
import { useProfiles } from '@/hooks/useProfiles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KanbanCardProps {
  card: CardWithRelations;
  column?: Column | null;
  onClick: () => void;
  isDragging?: boolean;
  vacancyDeadline?: string | null;
  categoryValue?: string | null;
  selectedProvider?: { name: string; value: number | null } | null;
  completionDeadline?: string | null;
  budgetDeadline?: string | null;
  showOwnerAvatar?: boolean;
  hasUnseenChanges?: boolean;
  responsibleName?: string | null;
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, column, onClick, isDragging, vacancyDeadline, categoryValue, selectedProvider, completionDeadline, budgetDeadline, showOwnerAvatar, hasUnseenChanges, responsibleName }, ref) => {
    // Calculate checklist progress - exclude dismissed items
    const allItems = card.checklists?.flatMap(cl => cl.items || []) || [];
    const activeItems = allItems.filter(i => !i.is_dismissed);
    const totalItems = activeItems.length;
    const completedItems = activeItems.filter(i => i.is_completed).length;
    const hasPendingItems = totalItems > 0 && completedItems < totalItems;

    // Resolve nomes dos responsáveis internos (compacto, só aparece se houver)
    const { profiles } = useProfiles();
    const capturingBrokerName = card.capturing_broker_id
      ? profiles.find((p) => p.user_id === card.capturing_broker_id)?.full_name
      : null;
    const serviceBrokerName = card.service_broker_id
      ? profiles.find((p) => p.user_id === card.service_broker_id)?.full_name
      : null;
    const hasInternalBrokers = !!(capturingBrokerName || serviceBrokerName);

    const hasLabels = card.labels && card.labels.length > 0;
    const hasDueDate = card.due_date;
    const hasChecklists = totalItems > 0;
    const isArchived = card.is_archived;
    const docsReceived = !!card.proposal_submitted_at;
    // Proposta gerada mas ainda não enviada pelo cliente → "Em preenchimento"
    // Mutuamente exclusivo com "Doc. recebidos" (proposal_submitted_at).
    // Usa proposal_link.status quando disponível; cai para presença do link como fallback.
    const linkStatus = card.proposal_link?.status ?? null;
    const linkPending =
      linkStatus === null
        ? !!card.proposal_link_id
        : linkStatus !== 'enviada' && linkStatus !== 'recebida' && linkStatus !== 'finalizada';
    const correctionPending = linkStatus === 'correction_requested';
    const proposalInProgress = !docsReceived && linkPending && !correctionPending;
    
    // Check if document deadline is overdue
    const hasDeadline = card.document_deadline;
    const isDeadlineOverdue = hasDeadline && !card.deadline_met && isDateOverdue(new Date(card.document_deadline!));

    // Check if vacancy deadline is overdue (for Rescisão flow)
    const hasVacancyDeadline = !!vacancyDeadline;
    const isVacancyDeadlineOverdue = hasVacancyDeadline && !card.vacancy_deadline_met && isDateOverdue(new Date(vacancyDeadline!));

    // Check if completion deadline is overdue (for Manutenção flow)
    const hasCompletionDeadline = !!completionDeadline;
    const isCompletionDeadlineOverdue = hasCompletionDeadline && isDateOverdue(new Date(completionDeadline!));

    // Check if budget deadline is overdue (for Manutenção flow)
    const parsedBudgetDeadline = (() => {
      if (!budgetDeadline) return null;
      try {
        const p = JSON.parse(budgetDeadline);
        if (p && typeof p === 'object' && 'dispensed' in p) {
          return p.dispensed ? null : p.date;
        }
        return budgetDeadline;
      } catch {
        return budgetDeadline;
      }
    })();
    const isBudgetDeadlineOverdue = !!parsedBudgetDeadline && isDateOverdue(new Date(parsedBudgetDeadline));

    // Check if column review deadline is overdue (for Venda flow)
    const reviewOverdue = column ? isReviewOverdue(card, column) : false;

    // Any deadline overdue
    const isAnyDeadlineOverdue = isDeadlineOverdue || isVacancyDeadlineOverdue || isCompletionDeadlineOverdue || isBudgetDeadlineOverdue;

    // Has card type (Venda/DEV flow)
    const hasCardType = !!card.card_type;
    const isFinanciamento = card.card_type === 'com_financiamento';

    // Parse category value (may be JSON with "Outro" support)
    const parsedCategory = (() => {
      if (!categoryValue) return null;
      try {
        const p = JSON.parse(categoryValue);
        if (p && typeof p === 'object' && 'selected' in p) {
          return p.selected === 'Outro' && p.otherText ? p.otherText : p.selected;
        }
        return categoryValue;
      } catch {
        return categoryValue;
      }
    })();

    // Get stripe color for financing type
    const getFinancingStripeColor = () => {
      if (!hasCardType) return null;
      return isFinanciamento ? '#3b82f6' : '#facc15';
    };

    const stripeColor = getFinancingStripeColor();

    // SLA status calculation
    const slaStatus = getSlaStatus(card.column_entered_at, column?.sla_hours ?? null);
    const slaColors = getSlaColors(slaStatus); // For stage time colors
    const timeInStage = formatTimeElapsed(card.column_entered_at);
    const hasSla = !!column?.sla_hours;

    // Andamento: próxima ação + prazo
    const nextAction = card.next_action?.trim() || null;
    const nextActionDue = card.next_action_due_date
      ? parseISO(card.next_action_due_date)
      : null;
    const isNextActionOverdue = nextActionDue ? isDateOverdue(nextActionDue) : false;
    const isNextActionToday = nextActionDue ? isToday(nextActionDue) : false;

    return (
      <Card 
        ref={ref}
        onClick={onClick}
        className={cn(
          "cursor-pointer bg-card hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-border/60 rounded-xl overflow-hidden relative will-change-transform select-none transition-all duration-300 group/card",
          isDragging && "shadow-2xl ring-2 ring-accent/20 scale-[1.02] z-50",
          isArchived && "opacity-60 bg-muted/50 grayscale-[0.5]"
        )}
      >
        {/* Status Lateral Highlight (Shadow Inset Style from Design C) */}
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[4px] z-10 transition-colors duration-300",
            docsReceived ? "bg-emerald-500" : 
            correctionPending ? "bg-orange-500" : 
            proposalInProgress ? "bg-amber-500" : 
            isAnyDeadlineOverdue ? "bg-red-500" :
            "bg-slate-300"
          )} 
        />

        {/* Red badge for unseen changes */}
        {hasUnseenChanges && (
          <div className="absolute -top-0.5 -right-0.5 z-10">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}
        <div className="p-3 pl-4 space-y-2.5 relative z-0">
          {/* Linha 1: Código */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              {card.superlogica_id || `ID-${card.id.slice(0, 4)}`}
            </span>
            {isArchived && (
              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                <Archive className="h-2.5 w-2.5" /> Arquivado
              </span>
            )}
          </div>

          {/* Linha 2 & 3: Título e Endereço */}
          <div className="space-y-0.5">
            <h4 className="text-[13px] font-bold text-slate-800 leading-tight line-clamp-2 group-hover/card:text-accent transition-colors">
              {card.title || card.building_name || 'Sem título'}
            </h4>
            {(card.address || card.building_name) && (
              <p className="text-[11px] text-slate-500 leading-tight line-clamp-1 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 shrink-0 opacity-70" />
                {card.address || card.building_name}
              </p>
            )}
          </div>

          {/* Linha 4: Badges/Chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* Status Princial */}
            {docsReceived && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCheck className="h-3 w-3" /> DOCS RECEBIDOS
              </span>
            )}
            {correctionPending && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100 shadow-sm">
                <Wrench className="h-3 w-3" /> CORREÇÃO
              </span>
            )}
            {proposalInProgress && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                <FileEdit className="h-3 w-3" /> EM PREENCHIMENTO
              </span>
            )}
            {isAnyDeadlineOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 shadow-sm animate-pulse">
                <AlertTriangle className="h-3 w-3" /> PENDÊNCIA CRÍTICA
              </span>
            )}

            {/* Progresso Documental */}
            {hasChecklists && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm",
                completedItems === totalItems ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
              )}>
                <CheckSquare className="h-3 w-3" /> {completedItems}/{totalItems}
              </span>
            )}

            {/* Alertas de SLA/Tempo */}
            {hasSla && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm",
                slaStatus === 'red' ? "bg-red-50 text-red-600 border-red-100" :
                slaStatus === 'yellow' ? "bg-amber-50 text-amber-600 border-amber-100" :
                "bg-slate-50 text-slate-600 border-slate-100"
              )}>
                <Clock className="h-3 w-3" /> {timeInStage}
              </span>
            )}

            {/* Financing Badge */}
            {hasCardType && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm",
                isFinanciamento ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-yellow-50 text-yellow-600 border-yellow-100"
              )}>
                {isFinanciamento ? 'FINANCIADO' : 'À VISTA'}
              </span>
            )}
          </div>

          {/* Linha 5: Rodapé do Card */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {/* Responsável/Cliente */}
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 border-2 border-white shadow-sm shrink-0">
                <AvatarImage src={card.created_by_profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                  {(responsibleName || card.created_by_profile?.full_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-semibold text-slate-600 truncate">
                {responsibleName || card.created_by_profile?.full_name?.split(' ')[0] || 'Sem resp.'}
              </span>
            </div>

            {/* Valor e Data (Alinhados à direita) */}
            <div className="flex flex-col items-end shrink-0">
              {/* Prazo decorrido / Data limite */}
              {hasDeadline && (
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-tight",
                  isDeadlineOverdue ? "text-red-500" : "text-slate-400"
                )}>
                  {format(new Date(card.document_deadline!), 'dd/MM', { locale: ptBR })}
                </span>
              )}
              {/* Valor Mensal (Se houver provider ou valor customizado no futuro) */}
              {selectedProvider?.value && (
                <span className="text-[11px] font-bold text-slate-800">
                  {selectedProvider.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

KanbanCard.displayName = 'KanbanCard';
