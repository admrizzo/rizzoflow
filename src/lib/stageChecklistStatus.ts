import { CardWithRelations, Column, ChecklistWithItems, ChecklistItem } from '@/types/database';

export interface StageStatus {
  type: 'ready' | 'pending' | 'no_items';
  requiredTotal: number;
  requiredPending: number;
  totalItems: number;
  completedItems: number;
  hasStageChecklist: boolean;
}

/**
 * Normalizes a string for comparison (lowercase, remove accents, trim)
 */
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Checks if a checklist name matches a column name
 */
export const isNameMatch = (checklistName: string, columnName: string): boolean => {
  const normalizedCol = normalizeString(columnName);
  const normalizedCL = normalizeString(checklistName)
    .replace(/^checklist da etapa:\s*/i, '')
    .replace(/^checklist:\s*/i, '');

  return normalizedCL === normalizedCol || 
         normalizedCL.includes(normalizedCol) || 
         normalizedCol.includes(normalizedCL);
};

/**
 * Determines if a checklist belongs to the current stage/column
 */
export const isChecklistInStage = (
  checklist: { id: string; name: string; column_id?: string | null }, 
  currentColumn: { id: string; name: string } | null | undefined
): boolean => {
  if (!checklist || !currentColumn) return false;

  // 1. Direct match by column_id
  if (checklist.column_id === currentColumn.id) return true;

  // 2. Name match (fallback for legacy data)
  return isNameMatch(checklist.name, currentColumn.name);
};

/**
 * Determines if an item belongs to the current stage
 */
export const isItemInStage = (
  item: { id: string; checklist_id: string; column_id?: string | null },
  currentColumn: { id: string; name: string } | null | undefined,
  allChecklists: { id: string; name: string; column_id?: string | null }[]
): boolean => {
  if (!item || !currentColumn) return false;

  // 1. Direct match by column_id
  if (item.column_id === currentColumn.id) return true;

  // 2. Fallback to parent checklist's stage
  const parentChecklist = allChecklists.find(cl => cl.id === item.checklist_id);
  if (parentChecklist) {
    return isChecklistInStage(parentChecklist, currentColumn);
  }

  return false;
};

/**
 * Calculates the operational status for the current stage
 */
export const calculateStageStatus = (
  card: CardWithRelations,
  currentColumn: Column | null | undefined
): StageStatus => {
  const allChecklists = (card.checklists || []).filter(cl => !!cl) as ChecklistWithItems[];
  const allItems = allChecklists.flatMap(cl => (cl.items || []).filter(i => !!i)) as ChecklistItem[];
  
  // Active items are those not dismissed
  const activeItemsGlobal = allItems.filter(i => !i.is_dismissed);

  // Identify items that belong to current stage or are global blockers
  const stageItems = activeItemsGlobal.filter(i => {
    const isGlobal = i.is_global_blocker || allChecklists.find(cl => cl.id === i.checklist_id)?.is_global_blocker;
    return isGlobal || isItemInStage(i, currentColumn, allChecklists);
  });

  const requiredItems = stageItems.filter(i => i.operational_nature === 'obrigatorio' || !i.operational_nature);
  const requiredPending = requiredItems.filter(i => !i.is_completed);
  
  const hasStageChecklist = allChecklists.some(cl => isChecklistInStage(cl, currentColumn) || cl.is_global_blocker);

  if (requiredItems.length === 0) {
    return {
      type: (hasStageChecklist || stageItems.length > 0) ? 'ready' : 'no_items',
      requiredTotal: 0,
      requiredPending: 0,
      totalItems: stageItems.length,
      completedItems: stageItems.filter(i => i.is_completed).length,
      hasStageChecklist
    };
  }

  return {
    type: requiredPending.length === 0 ? 'ready' : 'pending',
    requiredTotal: requiredItems.length,
    requiredPending: requiredPending.length,
    totalItems: stageItems.length,
    completedItems: stageItems.filter(i => i.is_completed).length,
    hasStageChecklist
  };
};
