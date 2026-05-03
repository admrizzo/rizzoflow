import { forwardRef } from 'react';
import { CardWithRelations, Column } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Archive, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import { isDateOverdue, formatDateTimeBR } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { getCardOperationalBadges, BadgeTone } from '@/lib/cardOperationalBadges';
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
    const badges = getCardOperationalBadges(card, {
      column,
      vacancyDeadline,
      completionDeadline,
      budgetDeadline
    });

    const isArchived = card.is_archived;
    const hasDeadline = !!card.document_deadline;
    const isAnyDeadlineOverdue = badges.some(b => b.key === 'deadline_overdue');

    const getToneClasses = (tone: BadgeTone) => {
      switch (tone) {
        case 'emerald': return "bg-emerald-50 text-emerald-600 border-emerald-100/60";
        case 'orange': return "bg-orange-50 text-orange-600 border-orange-100/60";
        case 'amber': return "bg-amber-50 text-amber-600 border-amber-100/60";
        case 'red': return "bg-red-50 text-red-600 border-red-100/60";
        case 'slate': return "bg-slate-50 text-slate-500 border-slate-100/80";
        default: return "bg-slate-50 text-slate-500 border-slate-100/80";
      }
    };
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

    // 2. Título do Card: Prioriza card.title quando já possui o nome do inquilino
    const storedTitle = card.title?.trim() || null;
    const robustCode = card.robust_code;

    // Verifica se o título atual é apenas o código legível (ex: #169 - ...)
    const legacyPropertyOnlyTitle =
      !!storedTitle &&
      !!robustCode &&
      new RegExp(`^#?${robustCode}\\s*[-–—]\\s*`, 'i').test(storedTitle);

    const primaryTenantName = card.parties?.find(p => p.party_type === 'locatario')?.name || null;
    const propertyIdentification = card.building_name;

    const cardTitle =
      storedTitle && !legacyPropertyOnlyTitle
        ? storedTitle
        : primaryTenantName
          ? [primaryTenantName, propertyIdentification].filter(Boolean).join(' • ')
          : propertyIdentification || storedTitle || 'Inquilino não informado';

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
        {/* Status Lateral Highlight */}
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
        <div className="p-3.5 pl-4.5 space-y-3 relative z-0 min-h-[160px] flex flex-col">
          {/* 1. Cabeçalho: Código Robust */}
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase opacity-80">
              {card.robust_code ? `#${card.robust_code}` : "Sem código CRM"}
            </span>
            {isArchived && (
              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 bg-slate-100/80 px-1.5 py-0.5 rounded-full">
                <Archive className="h-2.5 w-2.5" /> ARQUIVADO
              </span>
            )}
          </div>

          {/* 2. Título: Inquilino + Unidade + Bairro */}
          <div className="flex-1 space-y-1">
            <h4 
              className="text-[13px] font-extrabold text-slate-900 leading-[1.3] line-clamp-2 group-hover/card:text-accent transition-colors"
              title={cardTitle}
            >
              {cardTitle}
            </h4>
            
            {/* 3. Subtítulo: Endereço completo do imóvel */}
            {card.address && (
              <p className="text-[11px] font-medium text-slate-500 leading-tight line-clamp-1 flex items-center gap-1.5">
                <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                {card.address}
              </p>
            )}
          </div>

          {/* 4. Badges (Máximo 3 badges operacionais) */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {/* Status Secundário Operacional (Apenas um por vez para economizar espaço) */}
            {correctionPending ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-50 text-orange-600 border border-orange-100/60 shadow-sm">
                <Wrench className="h-2.5 w-2.5" /> CORREÇÃO
              </span>
            ) : docsReceived ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-sm">
                <CheckCheck className="h-2.5 w-2.5" /> DOCS RECEBIDOS
              </span>
            ) : proposalInProgress ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100/60 shadow-sm">
                <FileEdit className="h-2.5 w-2.5" /> EM PREENCHIMENTO
              </span>
            ) : null}

            {/* Alerta quando existir (Prioridade máxima) */}
            {isAnyDeadlineOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-red-600 border border-red-100/60 shadow-sm animate-pulse">
                <AlertTriangle className="h-2.5 w-2.5" /> PRAZO VENCIDO
              </span>
            )}

            {/* Progresso Documental / Checklist */}
            {hasChecklists && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border border-slate-100/80 shadow-sm",
                completedItems === totalItems ? "bg-emerald-50/50 text-emerald-600" : "bg-slate-50/80 text-slate-500"
              )}>
                <CheckSquare className="h-2.5 w-2.5" /> {completedItems}/{totalItems}
              </span>
            )}
          </div>

          {/* 5. Rodapé: Originador do Card */}
          <div className="pt-3 mt-auto border-t border-slate-100/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 border border-slate-200 shadow-xs shrink-0 ring-2 ring-white">
                <AvatarImage src={card.created_by_profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-black">
                  {(card.created_by_profile?.full_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-700 truncate leading-tight">
                  {card.created_by_profile?.full_name || 'Sistema'}
                </span>
              </div>
            </div>

            {/* Valor do Provedor Selecionado (Manutenção) ou Prazo */}
            <div className="flex flex-col items-end shrink-0 text-right">
              {selectedProvider?.value && (
                <span className="text-[11px] font-black text-slate-900 tracking-tight leading-tight">
                  {selectedProvider.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
              
              {hasDeadline && !isAnyDeadlineOverdue && (
                <span className="text-[9px] font-bold tracking-tight mt-0.5 text-slate-400">
                  {format(new Date(card.document_deadline!), 'dd MMM', { locale: ptBR })}
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
