import { useState } from 'react';
import { useAdminTaskTypes } from '@/hooks/useAdminTaskTypes';
import { AdminTaskType, AdminTaskCategory } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  DollarSign, 
  FileText, 
  Wrench,
  ListChecks,
  Clock
} from 'lucide-react';

const categoryConfig: Record<AdminTaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  financeiro: { label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-500 text-white' },
  cadastral: { label: 'Cadastral', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-500 text-white' },
  operacional: { label: 'Operacional', icon: <Wrench className="h-4 w-4" />, color: 'bg-orange-500 text-white' },
};

export function AdminTaskTypesManager() {
  const { taskTypes, isLoading, createTaskType, updateTaskType, deleteTaskType } = useAdminTaskTypes();
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<AdminTaskType | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AdminTaskCategory>('operacional');
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('operacional');
    setHasChecklist(false);
    setChecklistItems([]);
    setNewChecklistItem('');
    setEstimatedMinutes('');
    setEditingType(null);
    setShowForm(false);
  };

  const handleEdit = (type: AdminTaskType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || '');
    setCategory(type.category);
    setHasChecklist(type.has_checklist);
    setChecklistItems(type.checklist_items.map(String));
    setEstimatedMinutes(type.estimated_minutes || '');
    setShowForm(true);
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      has_checklist: hasChecklist,
      checklist_items: hasChecklist ? checklistItems : [],
      estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
    };

    if (editingType) {
      updateTaskType.mutate({ id: editingType.id, ...data }, {
        onSuccess: resetForm,
      });
    } else {
      createTaskType.mutate(data, {
        onSuccess: resetForm,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Modelos de Tarefas</h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Modelo
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingType ? 'Editar Modelo' : 'Novo Modelo de Tarefa'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                {(Object.keys(categoryConfig) as AdminTaskCategory[]).map((cat) => {
                  const config = categoryConfig[cat];
                  return (
                    <Button
                      key={cat}
                      type="button"
                      variant={category === cat ? 'default' : 'outline'}
                      size="sm"
                      className={category === cat ? config.color : ''}
                      onClick={() => setCategory(cat)}
                    >
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Emissão de Boleto"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do que essa tarefa envolve..."
                rows={2}
              />
            </div>

            {/* Estimated time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Estimado (minutos)
              </Label>
              <Input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 30"
              />
            </div>

            {/* Checklist toggle */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Incluir Checklist Padrão
              </Label>
              <Switch checked={hasChecklist} onCheckedChange={setHasChecklist} />
            </div>

            {/* Checklist items */}
            {hasChecklist && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <Label>Itens do Checklist</Label>
                
                {checklistItems.length > 0 && (
                  <div className="space-y-1">
                    {checklistItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 bg-background p-2 rounded text-sm">
                        <span className="flex-1">{item}</span>
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

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!name.trim() || createTaskType.isPending || updateTaskType.isPending}
              >
                {editingType ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List of task types */}
      {taskTypes.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nenhum modelo de tarefa criado.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Primeiro Modelo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {taskTypes.map((type) => {
            const config = categoryConfig[type.category];
            return (
              <Card key={type.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                        {type.has_checklist && (
                          <Badge variant="outline">
                            <ListChecks className="h-3 w-3 mr-1" />
                            {type.checklist_items.length} itens
                          </Badge>
                        )}
                        {type.estimated_minutes && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {type.estimated_minutes} min
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium">{type.name}</h4>
                      {type.description && (
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600"
                        onClick={() => deleteTaskType.mutate(type.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
