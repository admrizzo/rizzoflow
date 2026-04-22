import { useState } from 'react';
import { useAdminCards } from '@/hooks/useAdminCards';
import { AdminTaskType, AdminTaskCategory, AdminChecklistItem } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Wrench, Plus, X, ListChecks } from 'lucide-react';

interface CreateAdminCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTypes: AdminTaskType[];
}

const categoryConfig: Record<AdminTaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  financeiro: { label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-500' },
  cadastral: { label: 'Cadastral', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-500' },
  operacional: { label: 'Operacional', icon: <Wrench className="h-4 w-4" />, color: 'bg-orange-500' },
};

export function CreateAdminCardDialog({ open, onOpenChange, taskTypes }: CreateAdminCardDialogProps) {
  const { createCard } = useAdminCards();
  const [selectedCategory, setSelectedCategory] = useState<AdminTaskCategory>('operacional');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useChecklist, setUseChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<AdminChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Filter task types by selected category
  const filteredTaskTypes = taskTypes.filter(t => t.category === selectedCategory);

  const handleSelectTaskType = (taskTypeId: string) => {
    setSelectedTaskType(taskTypeId);
    const taskType = taskTypes.find(t => t.id === taskTypeId);
    if (taskType) {
      setTitle(taskType.name);
      setDescription(taskType.description || '');
      if (taskType.has_checklist && taskType.checklist_items.length > 0) {
        setUseChecklist(true);
        setChecklistItems(taskType.checklist_items.map(content => ({
          content: String(content),
          is_completed: false,
        })));
      }
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, { content: newChecklistItem.trim(), is_completed: false }]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    createCard.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      category: selectedCategory,
      task_type_id: selectedTaskType || undefined,
      checklist_items: useChecklist ? checklistItems : undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedTaskType('');
        setUseChecklist(false);
        setChecklistItems([]);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa Administrativa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa para você executar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category selection */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="flex gap-2">
              {(Object.keys(categoryConfig) as AdminTaskCategory[]).map((cat) => {
                const config = categoryConfig[cat];
                return (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    className={`flex-1 ${selectedCategory === cat ? config.color : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedTaskType('');
                    }}
                  >
                    {config.icon}
                    <span className="ml-1">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Task type selection (optional) */}
          {filteredTaskTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Modelo (opcional)</Label>
              <Select value={selectedTaskType} onValueChange={handleSelectTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo ou crie do zero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem modelo</SelectItem>
                  {filteredTaskTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                      {type.has_checklist && <ListChecks className="inline ml-2 h-3 w-3" />}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva a tarefa..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={2}
            />
          </div>

          {/* Checklist toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <Label htmlFor="useChecklist">Usar checklist</Label>
            </div>
            <Switch
              id="useChecklist"
              checked={useChecklist}
              onCheckedChange={setUseChecklist}
            />
          </div>

          {/* Checklist items */}
          {useChecklist && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label>Itens do Checklist</Label>
              
              {checklistItems.length > 0 && (
                <div className="space-y-1">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-background p-2 rounded">
                      <span className="flex-1 text-sm">{item.content}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveChecklistItem(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Novo item..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                />
                <Button type="button" size="icon" onClick={handleAddChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || createCard.isPending}
          >
            {createCard.isPending ? 'Criando...' : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
