import { CardWithRelations, Column } from '@/types/database';
import { 
  CheckSquare, 
  Archive, 
  AlertTriangle, 
  Wrench, 
  CheckCheck, 
  FileEdit,
  Tag
} from 'lucide-react';
import { isDateOverdue } from '@/lib/dateUtils';
import { LucideIcon } from 'lucide-react';

export type BadgeKind = 'secondary_status' | 'progress' | 'alert' | 'manual_label' | 'time' | 'priority' | 'risk' | 'dependency';
export type BadgeTone = 'emerald' | 'orange' | 'amber' | 'red' | 'slate' | 'blue' | 'indigo' | 'rose';

export interface OperationalBadge {
  key: string;
  label: string;
  tone: BadgeTone;
  icon: LucideIcon;
  priority: number;
  kind: BadgeKind;
  show_on_card?: boolean;
  show_on_header?: boolean;
}

export function getCardOperationalBadges(
  card: CardWithRelations,
  context?: {
    column?: Column | null;
    vacancyDeadline?: string | null;
    completionDeadline?: string | null;
    budgetDeadline?: string | null;
  }
): OperationalBadge[] {
  const badges: OperationalBadge[] = [];

  // --- 1. Status Secundário Operacional (kind: secondary_status) ---
  const docsReceived = !!card.proposal_submitted_at;
  const linkStatus = card.proposal_link?.status ?? null;
  const linkPending =
    linkStatus === null
      ? !!card.proposal_link_id
      : !['enviada', 'recebida', 'finalizada'].includes(linkStatus);
  const correctionPending = linkStatus === 'correction_requested';
  const proposalInProgress = !docsReceived && linkPending && !correctionPending;

  if (correctionPending) {
    badges.push({
      key: 'correction',
      label: 'CORREÇÃO',
      tone: 'orange',
      icon: Wrench,
      priority: 80,
      kind: 'secondary_status'
    });
  } else if (docsReceived) {
    badges.push({
      key: 'docs_received',
      label: 'DOCS RECEBIDOS',
      tone: 'emerald',
      icon: CheckCheck,
      priority: 80,
      kind: 'secondary_status'
    });
  } else if (proposalInProgress) {
    badges.push({
      key: 'proposal_in_progress',
      label: 'EM PREENCHIMENTO',
      tone: 'amber',
      icon: FileEdit,
      priority: 80,
      kind: 'secondary_status'
    });
  }

  // --- 2. Alertas de Prazo (kind: alert) ---
  const isDeadlineOverdue = card.document_deadline && !card.deadline_met && isDateOverdue(new Date(card.document_deadline!));
  const isVacancyDeadlineOverdue = context?.vacancyDeadline && !card.vacancy_deadline_met && isDateOverdue(new Date(context.vacancyDeadline!));
  const isCompletionDeadlineOverdue = context?.completionDeadline && isDateOverdue(new Date(context.completionDeadline!));

  // Budget deadline logic
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
    badges.push({
      key: 'deadline_overdue',
      label: 'PRAZO VENCIDO',
      tone: 'red',
      icon: AlertTriangle,
      priority: 100,
      kind: 'alert'
    });
  }

   // --- 3. Mapa de Segurança Operacional / Checklist (kind: progress) ---
   const allChecklists = card.checklists || [];
   const allItems = allChecklists.flatMap(cl => cl.items || []) || [];
   const activeItemsGlobal = allItems.filter(i => !i.is_dismissed);
   
   if (activeItemsGlobal.length > 0) {
     const currentColumnId = card.column_id;
     
     // 3.1 Pendências impeditivas (Etapa atual + Global Blocker)
     const stageBlockingPending = activeItemsGlobal.filter(i => {
       const isBlockingNature = (i.operational_nature === 'obrigatorio' || !i.operational_nature);
       if (!isBlockingNature || i.is_completed) return false;
       
       const parentChecklist = allChecklists.find(cl => cl.id === i.checklist_id);
       if (!parentChecklist && !i.column_id) return false; // Fail safe for broken data

       const isGlobal = i.is_global_blocker || parentChecklist?.is_global_blocker;
       const isCurrentStage = (i.column_id === currentColumnId) || (parentChecklist?.column_id === currentColumnId);
       
       return isGlobal || isCurrentStage;
     });
 
     // Status da etapa atual baseado SOMENTE nos itens da etapa atual/globais
     const stageTotalItems = activeItemsGlobal.filter(i => {
       const parentChecklist = allChecklists.find(cl => cl.id === i.checklist_id);
       if (!parentChecklist && !i.column_id) return false; // Fail safe

       const isGlobal = i.is_global_blocker || parentChecklist?.is_global_blocker;
       const isCurrentStage = (i.column_id === currentColumnId) || (parentChecklist?.column_id === currentColumnId);
       return isGlobal || isCurrentStage;
     });
 
     const isReady = stageBlockingPending.length === 0 && stageTotalItems.length > 0;
 
     if (isReady) {
       badges.push({
         key: 'checklist_ready',
         label: 'ETAPA PRONTA',
         tone: 'emerald',
         icon: CheckCheck,
         priority: 65,
         kind: 'progress'
       });
     } else if (stageBlockingPending.length > 0) {
       badges.push({
         key: 'checklist_pending_stage',
         label: `FALTAM ${stageBlockingPending.length} ITENS DA ETAPA`,
         tone: 'amber',
         icon: AlertTriangle,
         priority: 65,
         kind: 'progress'
       });
     } else if (stageTotalItems.length > 0) {
       // Tem itens na etapa mas nenhum é obrigatório ou já estão concluídos (mas isReady falhou por algum motivo lógico)
       badges.push({
         key: 'checklist_in_progress',
         label: 'ETAPA EM ANDAMENTO',
         tone: 'blue',
         icon: CheckSquare,
         priority: 65,
         kind: 'progress'
       });
     }
 
     // 3.2 Progresso total (Sempre secundário)
     const completedTotal = activeItemsGlobal.filter(i => i.is_completed).length;
     badges.push({
       key: 'checklist_total_progress',
       label: `TOTAL DO PROCESSO: ${completedTotal}/${activeItemsGlobal.length}`,
       tone: 'slate',
       icon: CheckSquare,
       priority: 60,
       kind: 'progress'
     });
   }

  // --- 4. Etiquetas Manuais (kind: manual_label, priority, risk, etc.) ---
  if (card.labels && card.labels.length > 0) {
    card.labels.forEach(label => {
      let kind: BadgeKind = 'manual_label';
      let tone: BadgeTone = 'slate';
      let priority = 40 + (label.criticality || 0);

      // Mapping categories to visual styles
      if (label.category === 'prioridade') {
        kind = 'priority';
        tone = 'indigo';
        priority += 10;
      } else if (label.category === 'risco') {
        kind = 'risk';
        tone = 'rose';
        priority += 15;
      } else if (label.category === 'dependencia_externa') {
        kind = 'dependency';
        tone = 'blue';
        priority += 5;
      } else if (label.category === 'tipo_processo') {
        tone = 'amber';
      }

      if (label.counts_as_alert) {
        kind = 'alert';
        tone = 'red';
        priority += 50;
      }

      badges.push({
        key: `label_${label.id}`,
        label: label.name,
        tone,
        icon: Tag,
        priority,
        kind,
        show_on_card: label.show_on_card !== false,
        show_on_header: label.show_on_modal_header !== false
      });
    });
  }

  // --- 5. Arquivado ---
  if (card.is_archived) {
    badges.push({
      key: 'archived',
      label: 'ARQUIVADO',
      tone: 'slate',
      icon: Archive,
      priority: 90,
      kind: 'alert'
    });
  }

  return badges.sort((a, b) => b.priority - a.priority);
}
