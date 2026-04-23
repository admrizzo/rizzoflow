import { useState } from 'react';
import { useBoards } from '@/hooks/useBoards';
import { useColumns } from '@/hooks/useColumns';
import { useChecklistTemplates } from '@/hooks/useChecklistTemplates';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MoreVertical, Columns, ListChecks, Pencil, Archive, ClipboardList, Copy, FileBox, BarChart3 } from 'lucide-react';
import { BoardFormDialog } from './BoardFormDialog';
import { ColumnsManager } from './ColumnsManager';
import { ChecklistTemplatesManager } from './ChecklistTemplatesManager';
import { CardTemplateChecklistsManager } from './CardTemplateChecklistsManager';
import { Board } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function BoardsManager() {
  const { boards, isLoading, createBoard } = useBoards();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<Board | null>(null);
  const [managingColumns, setManagingColumns] = useState<Board | null>(null);
  const [managingChecklists, setManagingChecklists] = useState<Board | null>(null);
  const [managingCardTemplateChecklists, setManagingCardTemplateChecklists] = useState<Board | null>(null);
  
  // Clone flow state
  const [cloningBoard, setCloningBoard] = useState<Board | null>(null);
  const [cloneColumns, setCloneColumns] = useState(true);
  const [cloneChecklists, setCloneChecklists] = useState(true);
  const [isCloning, setIsCloning] = useState(false);

  const handleEdit = (board: Board) => {
    setEditingBoard(board);
    setShowFormDialog(true);
  };

  const handleArchive = async () => {
    if (archiveConfirm) {
      await supabase
        .from('boards')
        .update({ is_active: false })
        .eq('id', archiveConfirm.id);
      setArchiveConfirm(null);
      window.location.reload();
    }
  };

  const handleCloneBoard = async () => {
    if (!cloningBoard) return;
    
    setIsCloning(true);
    try {
      // 1. Create the new board
      const { data: newBoard, error: boardError } = await supabase
        .from('boards')
        .insert({
          name: `${cloningBoard.name} (Cópia)`,
          description: cloningBoard.description,
          color: cloningBoard.color,
          icon: cloningBoard.icon,
          position: boards.length,
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // 2. Clone columns if selected
      if (cloneColumns) {
        const { data: columnsData } = await supabase
          .from('columns')
          .select('*')
          .eq('board_id', cloningBoard.id)
          .order('position');

        if (columnsData && columnsData.length > 0) {
          const newColumns = columnsData.map(col => ({
            name: col.name,
            color: col.color,
            department: col.department,
            position: col.position,
            board_id: newBoard.id,
            review_deadline_days: col.review_deadline_days,
          }));

          await supabase.from('columns').insert(newColumns);
        }
      }

      // 3. Clone checklist templates if selected
      if (cloneChecklists) {
        const { data: templatesData } = await supabase
          .from('checklist_templates')
          .select('*, checklist_item_templates(*)')
          .eq('board_id', cloningBoard.id)
          .order('position');

        if (templatesData && templatesData.length > 0) {
          for (const template of templatesData) {
            // Create new template
            const { data: newTemplate } = await supabase
              .from('checklist_templates')
              .insert({
                name: template.name,
                board_id: newBoard.id,
                position: template.position,
              })
              .select()
              .single();

            // Clone items
            if (newTemplate && template.checklist_item_templates?.length > 0) {
              const newItems = template.checklist_item_templates.map((item: any) => ({
                content: item.content,
                template_id: newTemplate.id,
                position: item.position,
              }));

              await supabase.from('checklist_item_templates').insert(newItems);
            }
          }
        }
      }

      toast({
        title: 'Fluxo clonado com sucesso!',
        description: `"${cloningBoard.name}" foi duplicado.`,
      });

      setCloningBoard(null);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro ao clonar fluxo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Show columns manager
  if (managingColumns) {
    return (
      <ColumnsManager 
        board={managingColumns} 
        onClose={() => setManagingColumns(null)} 
      />
    );
  }

  // Show checklists manager
  if (managingChecklists) {
    return (
      <ChecklistTemplatesManager 
        board={managingChecklists} 
        onClose={() => setManagingChecklists(null)} 
      />
    );
  }

  // Show card template checklists manager
  if (managingCardTemplateChecklists) {
    return (
      <CardTemplateChecklistsManager 
        board={managingCardTemplateChecklists} 
        onClose={() => setManagingCardTemplateChecklists(null)} 
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Gerencie os fluxos de trabalho, suas colunas e checklists modelo.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/central-propostas')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Central de Propostas
            </Button>
            <Button onClick={() => { setEditingBoard(null); setShowFormDialog(true); }} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fluxo
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum fluxo encontrado.</p>
              <p className="text-xs mt-1">Clique em "Novo Fluxo" para criar o primeiro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {boards.map((board) => (
                <Card key={board.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                      {/* Color indicator */}
                      <div 
                        className="w-2 self-stretch" 
                        style={{ backgroundColor: board.color }}
                      />
                      
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {board.name}
                                <Badge variant="secondary" className="text-xs">
                                  Ativo
                                </Badge>
                              </div>
                              {board.description && (
                                <div className="text-sm text-muted-foreground mt-0.5">
                                  {board.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setManagingColumns(board)}
                              className="h-8 px-2"
                            >
                              <Columns className="h-4 w-4 mr-1" />
                              Colunas
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                >
                                  <ListChecks className="h-4 w-4 mr-1" />
                                  Checklists
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => setManagingChecklists(board)}>
                                  <ListChecks className="h-4 w-4 mr-2" />
                                  Templates Gerais
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setManagingCardTemplateChecklists(board)}>
                                  <FileBox className="h-4 w-4 mr-2" />
                                  Por Modelo de Card
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => handleEdit(board)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCloningBoard(board)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clonar Fluxo
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setArchiveConfirm(board)}
                                  className="text-destructive"
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <BoardFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        board={editingBoard}
      />

      {/* Clone Board Dialog */}
      <Dialog open={!!cloningBoard} onOpenChange={() => setCloningBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Clonar Fluxo
            </DialogTitle>
            <DialogDescription>
              Crie uma cópia de "{cloningBoard?.name}" com suas configurações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="clone-columns" 
                checked={cloneColumns}
                onCheckedChange={(checked) => setCloneColumns(!!checked)}
              />
              <label htmlFor="clone-columns" className="text-sm font-medium cursor-pointer">
                Clonar colunas
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="clone-checklists" 
                checked={cloneChecklists}
                onCheckedChange={(checked) => setCloneChecklists(!!checked)}
              />
              <label htmlFor="clone-checklists" className="text-sm font-medium cursor-pointer">
                Clonar templates de checklist
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloningBoard(null)}>
              Cancelar
            </Button>
            <Button onClick={handleCloneBoard} disabled={isCloning}>
              {isCloning ? 'Clonando...' : 'Clonar Fluxo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DoubleConfirmDialog
        open={!!archiveConfirm}
        onOpenChange={(open) => !open && setArchiveConfirm(null)}
        title="Arquivar fluxo?"
        description={`O fluxo "${archiveConfirm?.name}" será arquivado e não aparecerá mais na lista. Os cards existentes serão mantidos.`}
        confirmText="ARQUIVAR"
        onConfirm={handleArchive}
      />
    </>
  );
}
