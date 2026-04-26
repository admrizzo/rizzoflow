import { Button } from '@/components/ui/button';
import { ListChecks, Loader2 } from 'lucide-react';
import { Column, CardWithRelations } from '@/types/database';
import { useStageChecklist, parseStageDefaultItems } from '@/hooks/useStageChecklist';
import { usePermissions } from '@/hooks/usePermissions';

interface StageChecklistButtonProps {
  card: CardWithRelations;
  column?: Column | null;
}

/**
 * Renders a "Criar checklist da etapa" button when:
 * - the current column has default_checklist_items configured;
 * - no checklist with the stage name already exists on the card;
 * - the user has edit permission.
 */
export function StageChecklistButton({ card, column }: StageChecklistButtonProps) {
  const { isAdmin, isGestor, isAdministrativo } = usePermissions();
  const { createStageChecklist } = useStageChecklist();

  const canManageChecklist = isAdmin || isGestor || isAdministrativo;
  if (!canManageChecklist || !column) return null;

  const defaultItems = parseStageDefaultItems(column);
  if (defaultItems.length === 0) return null;

  const stageChecklistName = `Checklist da etapa: ${column.name}`;
  const alreadyExists = (card.checklists || []).some((c) => c.name === stageChecklistName);
  if (alreadyExists) return null;

  const handleCreate = () => {
    createStageChecklist.mutate({ cardId: card.id, column });
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-dashed bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <ListChecks className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">Checklist desta etapa</p>
          <p className="text-xs text-muted-foreground truncate">
            {defaultItems.length} {defaultItems.length === 1 ? 'item padrão disponível' : 'itens padrão disponíveis'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="default"
        onClick={handleCreate}
        disabled={createStageChecklist.isPending}
        className="flex-shrink-0"
      >
        {createStageChecklist.isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            Criando...
          </>
        ) : (
          'Criar checklist da etapa'
        )}
      </Button>
    </div>
  );
}