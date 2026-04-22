import { forwardRef } from 'react';
import { CardWithRelations, Column } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckSquare, Calendar, Archive, Clock, AlertTriangle, Home, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { isDateOverdue } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { ReviewDeadlineBadge } from './ReviewDeadlineBadge';
import { isReviewOverdue } from '@/hooks/useColumnReview';
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
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ card, column, onClick, isDragging, vacancyDeadline, categoryValue, selectedProvider, completionDeadline, budgetDeadline, showOwnerAvatar, hasUnseenChanges }, ref) => {
    // Calculate checklist progress - exclude dismissed items
    const allItems = card.checklists?.flatMap(cl => cl.items || []) || [];
    const activeItems = allItems.filter(i => !i.is_dismissed);
    const totalItems = activeItems.length;
    const completedItems = activeItems.filter(i => i.is_completed).length;

    const hasLabels = card.labels && card.labels.length > 0;
    const hasDueDate = card.due_date;
    const hasChecklists = totalItems > 0;
    const isArchived = card.is_archived;
    
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

    return (
      <Card 
        ref={ref}
        onClick={onClick}
        className={cn(
          "cursor-pointer bg-white hover:bg-gray-50 shadow-sm hover:shadow-md border-0 rounded-lg overflow-hidden relative will-change-transform select-none",
          isDragging && "shadow-xl ring-2 ring-blue-400 opacity-95",
          isArchived && "opacity-60 bg-amber-50",
          isAnyDeadlineOverdue && !isArchived && "bg-amber-100 border-2 border-amber-400 hover:bg-amber-50",
          reviewOverdue && !isAnyDeadlineOverdue && !isArchived && "bg-orange-100 border-2 border-orange-400 hover:bg-orange-50"
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

        {/* Archived indicator */}
        {isArchived && (
          <div className="flex items-center gap-1 px-2 pt-2 text-amber-700 text-xs font-medium">
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

        <div className={cn("p-1.5", stripeColor && "pl-2.5")}>
          {/* Card title with owner avatar */}
          {showOwnerAvatar && card.created_by_profile && (
            <div className="flex items-center gap-1.5 mb-1">
              <Avatar className="h-5 w-5 flex-shrink-0 ring-1 ring-gray-200">
                <AvatarImage src={card.created_by_profile.avatar_url || undefined} />
                <AvatarFallback className="text-[9px] bg-orange-100 text-orange-700">
                  {card.created_by_profile.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-gray-500 font-medium truncate">
                {card.created_by_profile.full_name}
              </span>
            </div>
          )}
          
          {/* Title with inline superlogica code */}
          <div className="text-xs leading-snug min-w-0">
            {card.superlogica_id && (
              <span className="text-[10px] text-muted-foreground mr-1">{card.superlogica_id} ·</span>
            )}
            <span className="font-medium text-gray-800 break-words whitespace-normal line-clamp-2">
              {card.title || card.address || 'Sem identificação'}
            </span>
          </div>

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

          {/* Footer with icons */}
          {(hasChecklists || hasDueDate || hasDeadline || hasVacancyDeadline || parsedBudgetDeadline || column?.review_deadline_days) && (
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-gray-500">
              {hasChecklists && (
                <div className="flex items-center gap-0.5 text-[10px]">
                  <CheckSquare className="h-3 w-3" />
                  <span>{completedItems}/{totalItems}</span>
                </div>
              )}

              {hasDeadline && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isDeadlineOverdue && "text-amber-700 font-medium",
                  card.deadline_met && "text-green-600"
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
