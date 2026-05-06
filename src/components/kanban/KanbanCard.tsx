import { forwardRef, useMemo } from 'react';
import { CardWithRelations, Column } from '@/types/database';
 import { Card } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Archive, MapPin, CheckSquare, AlertTriangle, Wrench, FileEdit, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import { isDateOverdue, formatDateTimeBR } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { getCardOperationalBadges, OperationalBadge, BadgeTone } from '@/lib/cardOperationalBadges';
import { getCardVisualState } from '@/lib/cardVisualState';
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
   unreadCount?: number;
  responsibleName?: string | null;
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
   ({ card, column, onClick, isDragging, vacancyDeadline, categoryValue, selectedProvider, completionDeadline, budgetDeadline, showOwnerAvatar, unreadCount, responsibleName }, ref) => {
      const operationalContext = {
        column,
        vacancyDeadline,
        completionDeadline,
        budgetDeadline,
        hasUnseenChanges: (unreadCount ?? 0) > 0
      };
 
      const badges = useMemo(() => {
        try {
          return getCardOperationalBadges(card, operationalContext);
        } catch (err) {
          console.error(`[KanbanCard] Erro ao obter badges para o card ${card.id}:`, err);
          return [];
        }
      }, [card, operationalContext]);
     const visualState = getCardVisualState(card, operationalContext);
 
     const isArchived = card.is_archived;
     const hasDeadline = !!card.document_deadline;
     const isAnyDeadlineOverdue = visualState === 'overdue';
 
      const getToneClasses = (tone: BadgeTone) => {
      switch (tone) {
        case 'emerald': return "bg-emerald-50 text-emerald-600 border-emerald-100/60";
        case 'orange': return "bg-orange-50 text-orange-600 border-orange-100/60";
        case 'amber': return "bg-amber-50 text-amber-600 border-amber-100/60";
        case 'red': return "bg-red-50 text-red-600 border-red-100/60";
        case 'slate': return "bg-slate-50 text-slate-500 border-slate-100/80";
        case 'blue': return "bg-blue-50 text-blue-600 border-blue-100/60";
        case 'indigo': return "bg-indigo-50 text-indigo-600 border-indigo-100/60";
        case 'rose': return "bg-rose-50 text-rose-600 border-rose-100/60";
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

    // Priority logic for the person to display in footer
    const displayPerson = useMemo(() => {
      // 1. Service Broker (Responsável pela proposta)
      if (card.service_broker_id && card.service_broker_profile) {
        return {
          profile: card.service_broker_profile,
          label: "Responsável pela proposta"
        };
      }

      // 2. Next Action Responsible (ONLY IF next_action exists)
      if (card.next_action?.trim() && card.responsible_user_id && card.responsible_user_profile) {
        return {
          profile: card.responsible_user_profile,
          label: "Próxima ação"
        };
      }

      // 3. Capturing Broker (Captador)
      if (card.capturing_broker_id && card.capturing_broker_profile) {
        return {
          profile: card.capturing_broker_profile,
          label: "Captador"
        };
      }

      // 4. Fallback to creator or first member
      const fallbackProfile = card.created_by_profile || card.members?.[0] || null;
      return {
        profile: fallbackProfile,
        label: fallbackProfile ? "Criador" : "Sistema"
      };
    }, [
      card.service_broker_id, card.service_broker_profile,
      card.next_action, card.responsible_user_id, card.responsible_user_profile,
      card.capturing_broker_id, card.capturing_broker_profile,
      card.created_by_profile, card.members
    ]);

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

     // 2. Título do Card: Prioriza o título ARMAZENADO no banco.
     // O sistema agora garante que o título no banco seja o mais completo e protegido.
     // Removida a lógica reativa que sobrescrevia o título visualmente, causando
     // o bug de "Inquilino não informado" quando as partes ainda não carregaram.
     const cardTitle = card.title?.trim() || card.building_name || 'Nova Proposta';

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
              visualState === 'overdue' && "bg-red-600",
              visualState === 'correction_requested' && "bg-orange-500",
              visualState === 'next_action_overdue' && "bg-rose-400",
              visualState === 'in_day' && "bg-emerald-500",
              visualState === 'fallback' && "bg-slate-200"
           )} 
         />

          {/* Indicador de não lido (Smile Rizzo) */}
          {unreadCount !== undefined && unreadCount > 0 && (
            <div className="absolute top-2 right-2 z-20 pointer-events-auto animate-pulse">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group/smile cursor-help flex items-center justify-center">
                    <div className="w-4 h-4 transition-transform group-hover/smile:scale-110">
                      <img 
                        src="/rizzo-sorriso.png" 
                        alt="Não lido" 
                        className="w-full h-full object-contain drop-shadow-sm"
                      />
                    </div>
                    {unreadCount > 0 && (
                      <span className="ml-1 text-[9px] font-black text-rose-600 tracking-tighter">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="text-[10px] px-2 py-1 bg-slate-900 text-white border-none font-medium">
                  {unreadCount} atualização(ões) não lida(s)
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        <div className="p-3.5 pl-4.5 space-y-3 relative z-0 min-h-[160px] flex flex-col">
          {/* 1. Cabeçalho: Código Robust */}
           <div className="flex items-center justify-between mb-0.5">
             <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase opacity-80">
               {card.proposal_display_code || (card.robust_code ? `#${card.robust_code}` : "Sem código CRM")}
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

           {/* 4. Badges (Informação operacional relevante) */}
           <div className="flex flex-wrap gap-1.5 pt-1 min-h-[22px]">
             {badges
               .filter(b => b.kind !== 'manual_label' || b.show_on_card !== false)
               .slice(0, 3)
               .map((badge: OperationalBadge) => (
                <span 
                  key={badge.key}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border shadow-sm transition-all duration-200",
                    getToneClasses(badge.tone),
                    badge.kind === 'alert' && badge.tone === 'red' && "animate-pulse"
                  )}
                >
                  <badge.icon className="h-2.5 w-2.5" /> 
                  {badge.label}
                </span>
              ))}
          </div>

          {/* 5. Rodapé: Pessoa de referência (Responsável, Próxima Ação ou Captador) */}
          <div className="pt-3 mt-auto border-t border-slate-100/60 flex items-center justify-between gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6 border border-slate-200 shadow-xs shrink-0 ring-2 ring-white">
                    <AvatarImage src={displayPerson.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-black">
                      {(displayPerson.profile?.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-700 truncate leading-tight">
                      {displayPerson.profile?.full_name || 'Sistema'}
                    </span>
                    <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter truncate">
                      {displayPerson.label}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="text-[10px] px-2 py-1">
                {displayPerson.label}: {displayPerson.profile?.full_name || 'Sistema'}
              </TooltipContent>
            </Tooltip>

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
