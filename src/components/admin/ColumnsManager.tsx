import { useState } from 'react';
import { useColumns } from '@/hooks/useColumns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Columns as ColumnsIcon, Clock, X, Check } from 'lucide-react';
import { Board, Column, Department } from '@/types/database';

const PRESET_COLORS = [
  '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4',
  '#10b981', '#84cc16', '#f59e0b', '#ec4899', '#6366f1',
];

const DEPARTMENTS: { value: Department | 'none'; label: string }[] = [
  { value: 'none', label: 'Nenhum' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'vistoriadores', label: 'Vistoriadores' },
  { value: 'administrativo', label: 'Administrativo' },
];

interface ColumnsManagerProps {
  board: Board;
  onClose: () => void;
}

export function ColumnsManager({ board, onClose }: ColumnsManagerProps) {
  const { columns, isLoading, createColumn, updateColumn, deleteColumn, reorderColumns } = useColumns(board.id);
  const [showForm, setShowForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Column | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [department, setDepartment] = useState<Department | 'none'>('none');
  const [reviewDeadlineDays, setReviewDeadlineDays] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setColor(PRESET_COLORS[0]);
    setDepartment('none');
    setReviewDeadlineDays('');
    setEditingColumn(null);
  };

  const handleOpenForm = (column?: Column) => {
    if (column) {
      setEditingColumn(column);
      setName(column.name);
      setColor(column.color || PRESET_COLORS[0]);
      setDepartment(column.department || 'none');
      setReviewDeadlineDays(column.review_deadline_days?.toString() || '');
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const reviewDays = reviewDeadlineDays ? parseInt(reviewDeadlineDays, 10) : null;

    setIsSubmitting(true);
    try {
      if (editingColumn) {
        await updateColumn.mutateAsync({
          id: editingColumn.id,
          name: name.trim(),
          color,
          department: department === 'none' ? null : department,
          review_deadline_days: reviewDays,
        });
      } else {
        await createColumn.mutateAsync({
          name: name.trim(),
          color,
          department: department === 'none' ? undefined : department,
          board_id: board.id,
          review_deadline_days: reviewDays,
        });
      }
      handleCloseForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteColumn.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(columns);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    reorderColumns.mutate(reordered.map(c => c.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: board.color }}
          />
          <h3 className="font-medium">{board.name}</h3>
          <span className="text-muted-foreground">/ Colunas</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Defina as etapas (colunas) deste fluxo de trabalho. Arraste para reordenar.
        </p>
        {!showForm && (
          <Button onClick={() => handleOpenForm()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Coluna
          </Button>
        )}
      </div>

      {/* Inline Form - Replaces Dialog to avoid nesting issues */}
      {showForm && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">
                {editingColumn ? 'Editar Coluna' : 'Nova Coluna'}
              </h4>
              <Button variant="ghost" size="sm" onClick={handleCloseForm} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {editingColumn 
                ? 'Altere as informações da coluna.'
                : 'Adicione uma nova etapa ao fluxo.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="columnName">Nome *</Label>
                <Input
                  id="columnName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Em Análise"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Departamento Responsável</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as Department | 'none')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[200]">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      className={`w-7 h-7 rounded-full transition-all ${
                        color === presetColor 
                          ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => setColor(presetColor)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewDeadlineDays">Prazo de Revisão (dias)</Label>
                <Input
                  id="reviewDeadlineDays"
                  type="number"
                  min="1"
                  max="365"
                  value={reviewDeadlineDays}
                  onChange={(e) => setReviewDeadlineDays(e.target.value)}
                  placeholder="Ex: 3 (deixe vazio para não exigir)"
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de dias que um card pode ficar nesta coluna antes de ser considerado desatualizado.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!name.trim() || isSubmitting}>
                  <Check className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Salvando...' : editingColumn ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[300px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ColumnsIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma coluna definida.</p>
            <p className="text-xs mt-1">Adicione colunas para estruturar o fluxo.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns-list">
              {(provided) => (
                <div 
                  className="space-y-2"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {columns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}
                        >
                          <CardContent className="p-0">
                            <div className="flex items-center">
                              <div 
                                className="p-3 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                {...provided.dragHandleProps}
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <div 
                                className="w-1 self-stretch" 
                                style={{ backgroundColor: column.color || '#f97316' }}
                              />
                              <div className="flex-1 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                      {column.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {column.department && (
                                        <span className="text-xs text-muted-foreground">
                                          {DEPARTMENTS.find(d => d.value === column.department)?.label}
                                        </span>
                                      )}
                                      {column.review_deadline_days && (
                                        <span className="text-xs text-blue-600 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Prazo: {column.review_deadline_days} {column.review_deadline_days === 1 ? 'dia' : 'dias'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenForm(column)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteConfirm(column)}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </ScrollArea>

      {/* Delete Confirmation - AlertDialog is fine at top level */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna?</AlertDialogTitle>
            <AlertDialogDescription>
              A coluna "{deleteConfirm?.name}" será excluída permanentemente.
              Cards nesta coluna precisarão ser movidos antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
