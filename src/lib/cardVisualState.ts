 import { CardWithRelations, Column } from '@/types/database';
 import { isDateOverdue } from '@/lib/dateUtils';
 
 export type CardVisualState = 'overdue' | 'correction_requested' | 'pending' | 'in_day' | 'fallback';
 
 export interface VisualStateContext {
   column?: Column | null;
   vacancyDeadline?: string | null;
   completionDeadline?: string | null;
   budgetDeadline?: string | null;
   hasUnseenChanges?: boolean;
 }
 
 export function getCardVisualState(
   card: CardWithRelations,
   context?: VisualStateContext
 ): CardVisualState {
   // 1. Check for OVERDUE (Priority 1)
   const isDeadlineOverdue = card.document_deadline && !card.deadline_met && isDateOverdue(new Date(card.document_deadline!));
   const isVacancyDeadlineOverdue = context?.vacancyDeadline && !card.vacancy_deadline_met && isDateOverdue(new Date(context.vacancyDeadline!));
   const isCompletionDeadlineOverdue = context?.completionDeadline && isDateOverdue(new Date(context.completionDeadline!));
 
   const budgetDeadlineRaw = context?.budgetDeadline;
   let isBudgetDeadlineOverdue = false;
   if (budgetDeadlineRaw) {
     try {
       const p = JSON.parse(budgetDeadlineRaw);
       const budgetDate = (p && typeof p === 'object' && 'dispensed' in p) ? (p.dispensed ? null : p.date) : budgetDeadlineRaw;
       if (budgetDate) isBudgetDeadlineOverdue = isDateOverdue(new Date(budgetDate));
     } catch {
       isBudgetDeadlineOverdue = isDateOverdue(new Date(budgetDeadlineRaw));
     }
   }
 
   if (isDeadlineOverdue || isVacancyDeadlineOverdue || isCompletionDeadlineOverdue || isBudgetDeadlineOverdue) {
     return 'overdue';
   }
 
   // 2. Check for CORRECTION REQUESTED (Priority 2)
   const linkStatus = card.proposal_link?.status ?? null;
   const correctionPending = linkStatus === 'correction_requested';
   
   if (correctionPending) {
     return 'correction_requested';
   }
 
   // 3. Check for PENDING (Priority 3)
   // proposal_in_progress logic from cardOperationalBadges
   const docsReceived = !!card.proposal_submitted_at;
   const linkPending =
     linkStatus === null
       ? !!card.proposal_link_id
       : !['enviada', 'recebida', 'finalizada'].includes(linkStatus);
   
   const proposalInProgress = !docsReceived && linkPending && !correctionPending;
 
   if (proposalInProgress) {
     return 'pending';
   }
 
   // 4. IN DAY (Priority 4)
   // If it reached here, it's not overdue, not correction requested, and not "proposal in progress".
   // We check if we have enough information to say it's "in_day"
   if (card.id && card.column_id) {
     return 'in_day';
   }
 
   // 5. FALLBACK (Priority 5)
   return 'fallback';
 }