import { useState } from 'react';
import { useLabels } from '@/hooks/useLabels';
import { useBoards } from '@/hooks/useBoards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import { Plus, Pencil, Trash2, Check, X, Tag, Copy } from 'lucide-react';
import { Label as LabelType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const defaultColors = [
  // Reds
  '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
  // Oranges
  '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412',
  // Yellows
  '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e',
  // Limes
  '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212',
  // Greens
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534',
  // Teals
  '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59',
  // Cyans
  '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75',
  // Blues
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
  // Indigos
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3',
  // Violets
  '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6',
  // Purples
  '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8',
  // Pinks
  '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d',
  // Roses
  '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239',
  // Neutrals
  '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524',
  '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937',
];

interface LabelsManagerProps {
  accessibleBoardIds?: string[];
}

export function LabelsManager({ accessibleBoardIds }: LabelsManagerProps = {}) {
  const { boards: allBoards, isLoading: boardsLoading } = useBoards();
  
  // Filter boards based on permissions
  const boards = accessibleBoardIds 
    ? allBoards.filter(b => accessibleBoardIds.includes(b.id))
    : allBoards;
    
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const { toast } = useToast();
  
  const { labels, isLoading: labelsLoading, createLabel, updateLabel, deleteLabel } = useLabels(selectedBoardId || undefined);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Multi-select clone state
  const [selectedLabelsForClone, setSelectedLabelsForClone] = useState<Set<string>>(new Set());
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneTargetBoardId, setCloneTargetBoardId] = useState<string>('');
  const [isCloning, setIsCloning] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(defaultColors[0]);
  
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = () => {
    if (!newName.trim() || !selectedBoardId) return;
    createLabel.mutate(
      { name: newName.trim(), color: newColor, board_id: selectedBoardId },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(defaultColors[0]);
          setIsCreating(false);
        },
      }
    );
  };

  const handleStartEdit = (label: { id: string; name: string; color: string }) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateLabel.mutate(
      { id: editingId, name: editName.trim(), color: editColor },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditName('');
          setEditColor('');
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteLabel.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const handleCloneMultiple = async () => {
    if (selectedLabelsForClone.size === 0 || !cloneTargetBoardId) return;
    
    setIsCloning(true);
    const labelsToClone = labels.filter(l => selectedLabelsForClone.has(l.id));
    
    try {
      for (const label of labelsToClone) {
        await new Promise<void>((resolve, reject) => {
          createLabel.mutate(
            { name: label.name, color: label.color, board_id: cloneTargetBoardId },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }
      
      toast({
        title: 'Etiquetas clonadas com sucesso!',
        description: `${labelsToClone.length} etiqueta(s) clonada(s) para o fluxo selecionado.`,
      });
      
      setSelectedLabelsForClone(new Set());
      setIsCloneDialogOpen(false);
      setCloneTargetBoardId('');
    } catch (error) {
      toast({
        title: 'Erro ao clonar etiquetas',
        description: 'Ocorreu um erro ao clonar algumas etiquetas.',
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabelsForClone(prev => {
      const newSet = new Set(prev);
      if (newSet.has(labelId)) {
        newSet.delete(labelId);
      } else {
        newSet.add(labelId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLabelsForClone.size === labels.length) {
      setSelectedLabelsForClone(new Set());
    } else {
      setSelectedLabelsForClone(new Set(labels.map(l => l.id)));
    }
  };

  // Filter out current board from clone targets
  const cloneTargetBoards = boards.filter(b => b.id !== selectedBoardId);

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Board selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecione o Fluxo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um fluxo para gerenciar etiquetas" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedBoardId ? (
        <div className="text-center py-8 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Selecione um fluxo para gerenciar suas etiquetas.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Etiquetas do {selectedBoard?.name}
            </h3>
          </div>

          {/* Create new label */}
          {isCreating ? (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da etiqueta</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Urgente"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newColor === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge style={{ backgroundColor: newColor, color: '#fff' }}>
                    {newName || 'Preview'}
                  </Badge>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                    <Check className="h-4 w-4 mr-1" />
                    Criar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Etiqueta
            </Button>
          )}

          {/* Labels list */}
          {labelsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : labels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma etiqueta cadastrada para este fluxo.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Clone multiple action bar */}
              <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedLabelsForClone.size === labels.length && labels.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedLabelsForClone.size > 0 
                      ? `${selectedLabelsForClone.size} selecionada(s)` 
                      : 'Selecionar todas'}
                  </span>
                </div>
                {selectedLabelsForClone.size > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setIsCloneDialogOpen(true);
                      setCloneTargetBoardId('');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clonar {selectedLabelsForClone.size} para outro fluxo
                  </Button>
                )}
              </div>

              {labels.map((label) => (
                <Card key={label.id}>
                  <CardContent className="p-4">
                    {editingId === label.id ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cor</Label>
                          <div className="flex flex-wrap gap-2">
                            {defaultColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  editColor === color ? 'border-foreground scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setEditColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge style={{ backgroundColor: editColor, color: '#fff' }}>
                            {editName || 'Preview'}
                          </Badge>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>
                            <Check className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedLabelsForClone.has(label.id)}
                            onCheckedChange={() => toggleLabelSelection(label.id)}
                          />
                          <Badge style={{ backgroundColor: label.color, color: '#fff' }}>
                            {label.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(label)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(label.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog with double confirmation */}
      <DoubleConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir etiqueta?"
        description="Esta ação removerá a etiqueta de todos os cards que a utilizam. Esta ação não pode ser desfeita."
        confirmText="EXCLUIR"
        onConfirm={handleDelete}
      />

      {/* Clone multiple dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCloneDialogOpen(false);
          setCloneTargetBoardId('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar etiquetas</DialogTitle>
            <DialogDescription>
              Selecione o fluxo de destino para clonar {selectedLabelsForClone.size} etiqueta(s).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Etiquetas selecionadas:</span>
              <div className="flex flex-wrap gap-2">
                {labels.filter(l => selectedLabelsForClone.has(l.id)).map(label => (
                  <Badge key={label.id} style={{ backgroundColor: label.color, color: '#fff' }}>
                    {label.name}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Fluxo de destino</Label>
              <Select value={cloneTargetBoardId} onValueChange={setCloneTargetBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fluxo de destino" />
                </SelectTrigger>
                <SelectContent>
                  {cloneTargetBoards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)} disabled={isCloning}>
              Cancelar
            </Button>
            <Button onClick={handleCloneMultiple} disabled={!cloneTargetBoardId || isCloning}>
              {isCloning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Clonando...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Clonar {selectedLabelsForClone.size} etiqueta(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
