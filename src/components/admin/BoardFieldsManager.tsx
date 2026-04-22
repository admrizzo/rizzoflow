import { useState } from 'react';
import { useBoardFields } from '@/hooks/useBoardFields';
import { useBoards } from '@/hooks/useBoards';
import { FieldType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  AlignLeft, 
  List, 
  Calendar, 
  CheckSquare, 
  Hash,
  Pencil,
  X,
  ListChecks
} from 'lucide-react';

const fieldTypeLabels: Record<FieldType, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Texto curto', icon: <Type className="h-4 w-4" /> },
  textarea: { label: 'Texto longo', icon: <AlignLeft className="h-4 w-4" /> },
  select: { label: 'Seleção', icon: <List className="h-4 w-4" /> },
  date: { label: 'Data', icon: <Calendar className="h-4 w-4" /> },
  checkbox: { label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" /> },
  number: { label: 'Número', icon: <Hash className="h-4 w-4" /> },
  multi_checkbox: { label: 'Múltipla escolha', icon: <ListChecks className="h-4 w-4" /> },
};

interface BoardFieldsManagerProps {
  boardId: string;
  onClose: () => void;
}

export function BoardFieldsManager({ boardId, onClose }: BoardFieldsManagerProps) {
  const { boards } = useBoards();
  const { fields, isLoading, createField, updateField, deleteField } = useBoardFields(boardId);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  
  // Form state
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  const board = boards.find(b => b.id === boardId);

  const resetForm = () => {
    setFieldName('');
    setFieldType('text');
    setIsRequired(false);
    setOptions([]);
    setNewOption('');
    setEditingField(null);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setOptions(options.filter(o => o !== option));
  };

  const handleSubmit = () => {
    if (!fieldName.trim()) return;

    if (editingField) {
      updateField.mutate({
        id: editingField,
        field_name: fieldName.trim(),
        field_type: fieldType,
        is_required: isRequired,
        field_options: (fieldType === 'select' || fieldType === 'multi_checkbox') ? options : [],
      });
    } else {
      createField.mutate({
        board_id: boardId,
        field_name: fieldName.trim(),
        field_type: fieldType,
        is_required: isRequired,
        field_options: (fieldType === 'select' || fieldType === 'multi_checkbox') ? options : [],
      });
    }

    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (field: typeof fields[0]) => {
    setFieldName(field.field_name);
    setFieldType(field.field_type);
    setIsRequired(field.is_required);
    setOptions(field.field_options || []);
    setEditingField(field.id);
    setShowAddDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteFieldId) {
      deleteField.mutate(deleteFieldId);
      setDeleteFieldId(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Campos - {board?.name}</DialogTitle>
          <DialogDescription>
            Configure os campos personalizados que aparecerão nos cards deste fluxo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Campo
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum campo configurado.</p>
                <p className="text-sm">Clique em "Adicionar Campo" para começar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <Card key={field.id} className="group">
                    <CardContent className="flex items-center gap-4 p-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      
                      <div className="flex items-center gap-2 min-w-[120px]">
                        {fieldTypeLabels[field.field_type].icon}
                        <span className="text-sm text-muted-foreground">
                          {fieldTypeLabels[field.field_type].label}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="font-medium">{field.field_name}</div>
                        {(field.field_type === 'select' || field.field_type === 'multi_checkbox') && field.field_options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {field.field_options.slice(0, 3).map((opt) => (
                              <Badge key={opt} variant="secondary" className="text-xs">
                                {opt}
                              </Badge>
                            ))}
                            {field.field_options.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{field.field_options.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {field.is_required && (
                        <Badge variant="outline" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(field)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteFieldId(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Add/Edit Field Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => { 
          if (!open) resetForm(); 
          setShowAddDialog(open); 
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? 'Editar Campo' : 'Adicionar Campo'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-name">Nome do Campo</Label>
                <Input
                  id="field-name"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Ex: CPF do Locatário"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo do Campo</Label>
                <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldTypeLabels).map(([value, { label, icon }]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          {icon}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(fieldType === 'select' || fieldType === 'multi_checkbox') && (
                <div className="space-y-2">
                  <Label>Opções</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Adicionar opção..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                    />
                    <Button type="button" onClick={handleAddOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {options.map((opt) => (
                        <Badge key={opt} variant="secondary" className="gap-1">
                          {opt}
                          <button onClick={() => handleRemoveOption(opt)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is-required">Campo obrigatório</Label>
                <Switch
                  id="is-required"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!fieldName.trim()}>
                {editingField ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog with double confirmation */}
        <DoubleConfirmDialog
          open={!!deleteFieldId}
          onOpenChange={(open) => !open && setDeleteFieldId(null)}
          title="Excluir campo?"
          description="Os valores existentes deste campo em todos os cards serão perdidos. Esta ação não pode ser desfeita."
          confirmText="EXCLUIR"
          onConfirm={handleDeleteConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
