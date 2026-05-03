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

export type BadgeKind = 'secondary_status' | 'progress' | 'alert' | 'manual_label' | 'time';
export type BadgeTone = 'emerald' | 'orange' | 'amber' | 'red' | 'slate' | 'blue' | 'indigo';

export interface OperationalBadge {
  key: string;
  label: string;
  tone: BadgeTone;
  icon: LucideIcon;
  priority: number;
  kind: BadgeKind;
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

  // --- 3. Progresso Documental / Checklist (kind: progress) ---
  const allItems = card.checklists?.flatMap(cl => cl.items || []) || [];
  const activeItems = allItems.filter(i => !i.is_dismissed);
  const totalItems = activeItems.length;
  const completedItems = activeItems.filter(i => i.is_completed).length;

  if (totalItems > 0) {
    const isCompleted = completedItems === totalItems;
    badges.push({
      key: 'checklist_progress',
      label: `${completedItems}/${totalItems}`,
      tone: isCompleted ? 'emerald' : 'slate',
      icon: CheckSquare,
      priority: 60,
      kind: 'progress'
    });
  }

  // --- 4. Etiquetas Manuais (kind: manual_label) ---
  if (card.labels && card.labels.length > 0) {
    card.labels.forEach(label => {
      badges.push({
        key: `label_${label.id}`,
        label: label.name,
        tone: 'slate', 
        icon: Tag,
        priority: 40,
        kind: 'manual_label'
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
