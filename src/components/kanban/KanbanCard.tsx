import { forwardRef } from 'react';
import { CardWithRelations, Column } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckSquare, Calendar, Archive, Clock, AlertTriangle, Home, Wrench, User, ArrowRight, Inbox, FileEdit, CheckCheck } from 'lucide-react';
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
    const slaColors = getSlaColors(slaStatus);
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
          "cursor-pointer bg-card hover:bg-accent/[0.02] shadow-[0_2px_4px_rgba(0,0,0,0.02),0_1px_0_rgba(0,0,0,0.03)] hover:shadow-lg border border-border/80 rounded-xl overflow-hidden relative will-change-transform select-none min-h-[132px] transition-all duration-200 group/card",
          isDragging && "shadow-2xl ring-2 ring-accent/20 scale-[1.02] z-50",
          isArchived && "opacity-60 bg-muted/50 grayscale-[0.5]",
          isAnyDeadlineOverdue && !isArchived && "border-red-200 bg-red-50/10",
          reviewOverdue && !isAnyDeadlineOverdue && !isArchived && "border-orange-200 bg-orange-50/10",
          hasSla && slaStatus === 'red' && !isAnyDeadlineOverdue && !reviewOverdue && !isArchived && "shadow-[inset_3px_0_0_0_#ef4444]",
          hasSla && slaStatus === 'yellow' && !isAnyDeadlineOverdue && !reviewOverdue && !isArchived && "shadow-[inset_3px_0_0_0_#f59e0b]",
          hasSla && slaStatus === 'green' && !isAnyDeadlineOverdue && !reviewOverdue && !isArchived && "shadow-[inset_3px_0_0_0_#10b981]"
        )}
      >
        {/* Red badge for unseen changes */}
        {hasUnseenChanges && (
          <div className="absolute -top-0.5 -right-0.5 z-10">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}
        {/* Financing type side stripe with tooltip */}
        {stripeColor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg cursor-help"
                style={{ backgroundColor: stripeColor }}
                onClick={(e) => e.stopPropagation()}
              />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {isFinanciamento ? 'Com Financiamento' : 'Sem Financiamento'}
            </TooltipContent>
          </Tooltip>
        )}
        {/* Overdue deadline alert */}
        {isDeadlineOverdue && !isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-amber-700 text-xs font-medium bg-amber-200/50">
            <AlertTriangle className="h-3 w-3" />
            <span>Prazo vencido!</span>
          </div>
        )}

        {/* Overdue vacancy deadline alert */}
        {isVacancyDeadlineOverdue && !isDeadlineOverdue && !isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-amber-700 text-xs font-medium bg-amber-200/50">
            <AlertTriangle className="h-3 w-3" />
            <span>Prazo de desocupação vencido!</span>
          </div>
        )}

        {/* Overdue completion deadline alert (Manutenção) */}
        {isCompletionDeadlineOverdue && !isDeadlineOverdue && !isVacancyDeadlineOverdue && !isBudgetDeadlineOverdue && !isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-amber-700 text-xs font-medium bg-amber-200/50">
            <AlertTriangle className="h-3 w-3" />
            <span>Prazo de término vencido!</span>
          </div>
        )}

        {/* Overdue budget deadline alert (Manutenção) */}
        {isBudgetDeadlineOverdue && !isDeadlineOverdue && !isVacancyDeadlineOverdue && !isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-amber-700 text-xs font-medium bg-amber-200/50">
            <AlertTriangle className="h-3 w-3" />
            <span>Prazo de orçamento vencido!</span>
          </div>
        )}

        {/* Review deadline overdue */}
        {reviewOverdue && !isAnyDeadlineOverdue && !isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-orange-700 text-xs font-medium bg-orange-200/50">
            <AlertTriangle className="h-3 w-3" />
            <span>Revisão necessária</span>
          </div>
        )}

        {/* Pending checklist items alert */}
        {hasPendingItems && !isArchived && !isAnyDeadlineOverdue && !reviewOverdue && (
          <div className="flex items-center gap-1 px-2 pt-1.5 text-amber-700 text-[10px] font-medium">
            <AlertTriangle className="h-3 w-3" />
            <span>Pendências nesta etapa ({completedItems}/{totalItems})</span>
          </div>
        )}

        {/* Archived indicator */}
        {isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-muted-foreground text-xs font-medium">
            <Archive className="h-3 w-3" />
            <span>Arquivado</span>
          </div>
        )}

        {/* Colored labels */}
        {hasLabels && (
          <div className={cn("flex flex-wrap gap-0.5 px-1.5 pt-1.5", stripeColor && "pl-2.5")}>
            {card.labels?.map((label) => (
              <div
                key={label.id}
                className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white truncate max-w-[80px]"
                style={{ backgroundColor: label.color }}
                title={label.name}
              >
                {label.name}
              </div>
            ))}
          </div>
        )}

        {/* Status Shading — Design C - Semi Dark style */}
        {!isArchived && (docsReceived || correctionPending || proposalInProgress) && (
          <div className={cn(
            "px-2.5 py-1.5 flex items-center gap-1.5 border-b border-border/40",
            docsReceived ? "bg-emerald-500/5 text-emerald-700" :
            correctionPending ? "bg-orange-500/5 text-orange-700" :
            "bg-amber-500/5 text-amber-700"
          )}>
            {docsReceived && <CheckCheck className="h-3 w-3" />}
            {correctionPending && <Wrench className="h-3 w-3" />}
            {proposalInProgress && <FileEdit className="h-3 w-3" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {docsReceived ? "Doc. recebidos" : correctionPending ? "Correção solicitada" : "Em preenchimento"}
            </span>
          </div>
        )}

        <div className={cn("p-1.5", stripeColor && "pl-2.5")}>
          {/* Title with inline superlogica code */}
          <div className="text-xs leading-snug min-w-0 mb-1">
            {card.superlogica_id && (
              <span className="text-[10px] text-muted-foreground mr-1">{card.superlogica_id} ·</span>
            )}
            <span className="font-semibold text-foreground break-words whitespace-normal line-clamp-2">
              {card.title || card.address || 'Sem identificação'}
            </span>
          </div>

          {/* Building/Address subtitle */}
          {card.building_name && card.building_name !== card.title && (
            <p className="text-[10px] text-muted-foreground truncate mb-1">{card.building_name}</p>
          )}

          {/* Andamento: próxima ação + prazo */}
          {!isArchived && (nextAction || nextActionDue) && (
            <div
              className={cn(
                "flex items-start gap-1 mt-1 mb-1 px-1.5 py-1 rounded border text-[10px]",
                isNextActionOverdue
                  ? "border-red-300 bg-red-50 text-red-700"
                  : isNextActionToday
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-border bg-muted/40 text-foreground"
              )}
            >
              <ArrowRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {nextAction ? (
                  <p className="leading-snug line-clamp-2 break-words">{nextAction}</p>
                ) : (
                  <p className="leading-snug italic opacity-70">Sem próxima ação</p>
                )}
                {nextActionDue && (
                  <div className="flex items-center gap-0.5 mt-0.5 font-medium">
                    <Calendar className="h-2.5 w-2.5" />
                    <span>
                      {formatDateTimeBR(nextActionDue, { compact: true })}
                      {isNextActionOverdue && " · vencido"}
                      {!isNextActionOverdue && isNextActionToday && " · hoje"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Responsible + Time in stage row */}
          {(!isArchived && (responsibleName || card.column_entered_at)) && (
            <div className="flex items-center justify-between gap-1 mb-1">
              {responsibleName && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{responsibleName}</span>
                </div>
              )}
              {card.column_entered_at && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded",
                  hasSla ? `${slaColors.bg} ${slaColors.text}` : 'text-muted-foreground'
                )}>
                  <Clock className="h-3 w-3" />
                  <span>{timeInStage}</span>
                </div>
              )}
            </div>
          )}

          {/* Owner avatar */}
          {showOwnerAvatar && card.created_by_profile && (
            <div className="flex items-center gap-1.5 mb-1">
              <Avatar className="h-4 w-4 flex-shrink-0">
                <AvatarImage src={card.created_by_profile.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {card.created_by_profile.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate">
                {card.created_by_profile.full_name}
              </span>
            </div>
          )}

          {/* Selected Provider with budget value (Manutenção) */}
          {selectedProvider && (
            <div className="flex items-center gap-1.5 mt-1 px-1.5 py-1 bg-teal-50 rounded border border-teal-200">
              <Wrench className="h-3 w-3 flex-shrink-0 text-teal-600" />
              <span className="text-[11px] text-teal-800 font-semibold truncate">{selectedProvider.name}</span>
              {selectedProvider.value && (
                <span className="text-[10px] text-teal-600 font-medium ml-auto whitespace-nowrap">
                  {selectedProvider.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>
          )}

          {/* Responsáveis internos (compacto — só aparece se houver) */}
          {hasInternalBrokers && (
            <div className="flex flex-col gap-0.5 mt-1">
              {capturingBrokerName && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium">Capt:</span>
                  <span className="truncate">{capturingBrokerName}</span>
                </div>
              )}
              {serviceBrokerName && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium">Atend:</span>
                  <span className="truncate">{serviceBrokerName}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer with icons */}
          {(hasChecklists || hasDueDate || hasDeadline || hasVacancyDeadline || parsedBudgetDeadline || column?.review_deadline_days) && (
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-muted-foreground">
              {hasChecklists && (
                <div className="flex items-center gap-0.5 text-[10px]">
                  <CheckSquare className={cn("h-3 w-3", completedItems === totalItems && totalItems > 0 && "text-emerald-600")} />
                  <span className={cn(completedItems === totalItems && totalItems > 0 && "text-emerald-600 font-medium")}>{completedItems}/{totalItems}</span>
                </div>
              )}

              {hasDeadline && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isDeadlineOverdue && "text-red-600 font-medium",
                  card.deadline_met && "text-emerald-600"
                )}>
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(card.document_deadline!), 'd/MM', { locale: ptBR })}
                    {card.deadline_met && ' ✓'}
                  </span>
                </div>
              )}

              {hasVacancyDeadline && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isVacancyDeadlineOverdue && "text-amber-700 font-medium",
                  card.vacancy_deadline_met && "text-green-600"
                )}>
                  <Home className="h-3 w-3" />
                  <span>
                    {format(new Date(vacancyDeadline!), 'd/MM', { locale: ptBR })}
                    {card.vacancy_deadline_met && ' ✓'}
                  </span>
                </div>
              )}


              {parsedBudgetDeadline && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isBudgetDeadlineOverdue && "text-amber-700 font-medium"
                )}>
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(parsedBudgetDeadline), 'd/MM', { locale: ptBR })}</span>
                </div>
              )}

              {column?.review_deadline_days && (
                <ReviewDeadlineBadge 
                  card={card} 
                  column={column}
                />
              )}

              {hasDueDate && (
                <div className="flex items-center gap-0.5 text-[10px]">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(card.due_date!), 'd/MM', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

KanbanCard.displayName = 'KanbanCard';
