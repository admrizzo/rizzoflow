import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import {
  ArrowLeft, Plus, Pencil, Trash2, GripVertical, ListChecks, 
  ChevronDown, ChevronRight, Check, X, Settings, CalendarDays, ListCheck, FileText,
  FileBox
} from 'lucide-react';
import { Board } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CardTemplateChecklistsManagerProps {
  board: Board;
  onClose: () => void;
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  position: number;
  requires_date?: boolean;
  requires_status?: boolean;
  requires_observation?: boolean;
  status_options?: string[];
}

interface Checklist {
  id: string;
  template_id: string;
  name: string;
  position: number;
  items: ChecklistItem[];
}

interface CardTemplate {
  id: string;
  name: string;
  icon: string;
  position: number;
  checklists: Checklist[];
}

export function CardTemplateChecklistsManager({ board, onClose }: CardTemplateChecklistsManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  
  // Editing states
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistName, setEditingChecklistName] = useState('');
  const [newChecklistName, setNewChecklistName] = useState<Record<string, string>>({});
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'checklist' | 'item' } | null>(null);

  // Item config dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configuringItem, setConfiguringItem] = useState<ChecklistItem | null>(null);
  const [configRequiresDate, setConfigRequiresDate] = useState(false);
  const [configRequiresStatus, setConfigRequiresStatus] = useState(false);
  const [configRequiresObservation, setConfigRequiresObservation] = useState(false);
  const [configStatusOptions, setConfigStatusOptions] = useState<string[]>([]);
  const [newStatusOption, setNewStatusOption] = useState('');

  // Fetch card templates with their checklists and items
  const { data: cardTemplates = [], isLoading } = useQuery({
    queryKey: ['card-templates-with-checklists', board.id],
    queryFn: async () => {
      // Fetch templates
      const { data: templates, error: templatesError } = await supabase
        .from('card_templates')
        .select('id, name, icon, position')
        .eq('board_id', board.id)
        .eq('is_active', true)
        .order('position');

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) return [];

      const templateIds = templates.map(t => t.id);

      // Fetch checklists
      const { data: checklists, error: checklistsError } = await supabase
        .from('card_template_checklists')
        .select('*')
        .in('template_id', templateIds)
        .order('position');

      if (checklistsError) throw checklistsError;

      // Fetch items
      const checklistIds = checklists?.map(c => c.id) || [];
      let items: ChecklistItem[] = [];
      
      if (checklistIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('card_template_checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('position');

        if (itemsError) throw itemsError;
        items = (itemsData || []) as ChecklistItem[];
      }

      // Build the complete structure
      return templates.map(template => ({
        ...template,
        checklists: (checklists || [])
          .filter(c => c.template_id === template.id)
          .map(checklist => ({
            ...checklist,
            items: items.filter(i => i.checklist_id === checklist.id)
          }))
      })) as CardTemplate[];
    },
    enabled: !!board.id,
  });

  const toggleTemplate = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  const toggleChecklist = (checklistId: string) => {
    const newExpanded = new Set(expandedChecklists);
    if (newExpanded.has(checklistId)) {
      newExpanded.delete(checklistId);
    } else {
      newExpanded.add(checklistId);
    }
    setExpandedChecklists(newExpanded);
  };

  // Create checklist
  const createChecklist = useMutation({
    mutationFn: async ({ templateId, name }: { templateId: string; name: string }) => {
      const template = cardTemplates.find(t => t.id === templateId);
      const maxPosition = template && template.checklists.length > 0
        ? Math.max(...template.checklists.map(c => c.position ?? 0)) + 1
        : 0;

      const { data, error } = await supabase
        .from('card_template_checklists')
        .insert({ template_id: templateId, name, position: maxPosition })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-templates-with-checklists', board.id] });
      toast({ title: 'Checklist criado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar checklist', description: error.message, variant: 'destructive' });
    },
  });

  // Update checklist
  const updateChecklist = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('card_template_checklists')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-templates-with-checklists', board.id] });
      setEditingChecklistId(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  // Delete checklist
  const deleteChecklist = useMutation({
    mutationFn: async (id: string) => {
      // Delete items first
      await supabase.from('card_template_checklist_items').delete().eq('checklist_id', id);
      // Delete checklist
      const { error } = await supabase.from('card_template_checklists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-templates-with-checklists', board.id] });
      toast({ title: 'Checklist excluído!' });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  // Create item
  const createItem = useMutation({
    mutationFn: async ({ checklistId, content }: { checklistId: string; content: string }) => {
      // Find max position
      const template = cardTemplates.find(t => t.checklists.some(c => c.id === checklistId));
      const checklist = template?.checklists.find(c => c.id === checklistId);
      const maxPosition = checklist && checklist.items.length > 0
        ? Math.max(...checklist.items.map(i => i.position ?? 0)) + 1
        : 0;

      const { data, error } = await supabase
        .from('card_template_checklist_items')
        .insert({ checklist_id: checklistId, content, position: maxPosition })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-templates-with-checklists', board.id] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar item', description: error.message, variant: 'destructive' });
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async (params: { 
      id: string; 
      content?: string;
      requires_date?: boolean;
      requires_status?: boolean;
      requires_observation?: boolean;
      status_options?: string[];
    }) => {
      const { id, ...updateData } = params;
      const { data, error } = await supabase
        .from('card_template_checklist_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-templates-with-checklists', board.id] });
      setEditingItemId(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('card_template_checklist_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-templates-with-checklists', board.id] });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreateChecklist = (templateId: string) => {
    const name = newChecklistName[templateId]?.trim();
    if (!name) return;
    createChecklist.mutate({ templateId, name });
    setNewChecklistName({ ...newChecklistName, [templateId]: '' });
  };

  const handleCreateItem = (checklistId: string) => {
    const content = newItemContent[checklistId]?.trim();
    if (!content) return;
    createItem.mutate({ checklistId, content });
    setNewItemContent({ ...newItemContent, [checklistId]: '' });
  };

  const handleOpenConfig = (item: ChecklistItem) => {
    setConfiguringItem(item);
    setConfigRequiresDate(item.requires_date || false);
    setConfigRequiresStatus(item.requires_status || false);
    setConfigRequiresObservation(item.requires_observation || false);
    setConfigStatusOptions(item.status_options || []);
    setNewStatusOption('');
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configuringItem) return;
    
    await updateItem.mutateAsync({
      id: configuringItem.id,
      requires_date: configRequiresDate,
      requires_status: configRequiresStatus,
      requires_observation: configRequiresObservation,
      status_options: configStatusOptions,
    });
    
    setConfigDialogOpen(false);
    setConfiguringItem(null);
    toast({ title: 'Configuração salva!' });
  };

  const handleAddStatusOption = () => {
    if (!newStatusOption.trim()) return;
    if (configStatusOptions.includes(newStatusOption.trim())) return;
    setConfigStatusOptions([...configStatusOptions, newStatusOption.trim()]);
    setNewStatusOption('');
  };

  const handleRemoveStatusOption = (option: string) => {
    setConfigStatusOptions(configStatusOptions.filter(o => o !== option));
  };

  const getItemSubfieldBadges = (item: ChecklistItem) => {
    const badges = [];
    if (item.requires_date) badges.push({ icon: CalendarDays, label: 'Data', color: 'bg-blue-100 text-blue-700' });
    if (item.requires_status) badges.push({ icon: ListCheck, label: 'Status', color: 'bg-green-100 text-green-700' });
    if (item.requires_observation) badges.push({ icon: FileText, label: 'Obs', color: 'bg-amber-100 text-amber-700' });
    return badges;
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'checklist') {
      deleteChecklist.mutate(deleteConfirm.id);
    } else {
      deleteItem.mutate(deleteConfirm.id);
    }
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
          <span className="text-muted-foreground">/ Checklists por Modelo de Card</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure os checklists específicos de cada modelo de card. Esses checklists são aplicados automaticamente quando um card é criado usando o modelo correspondente.
      </p>

      <ScrollArea className="h-[400px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : cardTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileBox className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum modelo de card configurado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cardTemplates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <Collapsible 
                  open={expandedTemplates.has(template.id)}
                  onOpenChange={() => toggleTemplate(template.id)}
                >
                  <CardHeader className="p-3 bg-muted/30">
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-muted/50 rounded px-2 py-1 -mx-2">
                      <div className="flex items-center gap-2">
                        {expandedTemplates.has(template.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="text-lg">{template.icon || '📋'}</span>
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {template.checklists.length} checklist(s)
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="p-3 space-y-3">
                      {/* Existing checklists */}
                      {template.checklists.map((checklist) => (
                        <Card key={checklist.id} className="border-dashed">
                          <Collapsible
                            open={expandedChecklists.has(checklist.id)}
                            onOpenChange={() => toggleChecklist(checklist.id)}
                          >
                            <CardHeader className="p-2">
                              <div className="flex items-center justify-between">
                                <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                                  {expandedChecklists.has(checklist.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  
                                  {editingChecklistId === checklist.id ? (
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                      <Input
                                        value={editingChecklistName}
                                        onChange={e => setEditingChecklistName(e.target.value)}
                                        className="h-7 text-sm w-48"
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') updateChecklist.mutate({ id: checklist.id, name: editingChecklistName });
                                          if (e.key === 'Escape') setEditingChecklistId(null);
                                        }}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => updateChecklist.mutate({ id: checklist.id, name: editingChecklistName })}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setEditingChecklistId(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <ListChecks className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium text-sm">{checklist.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({checklist.items.length} itens)
                                      </span>
                                    </>
                                  )}
                                </CollapsibleTrigger>
                                
                                {editingChecklistId !== checklist.id && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChecklistId(checklist.id);
                                        setEditingChecklistName(checklist.name);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({ id: checklist.id, name: checklist.name, type: 'checklist' });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardHeader>

                            <CollapsibleContent>
                              <CardContent className="p-2 pt-0 space-y-2">
                                {/* Items */}
                                {checklist.items.map((item) => (
                                  <div 
                                    key={item.id} 
                                    className="flex items-start gap-2 pl-6 py-1 group hover:bg-muted/50 rounded"
                                  >
                                    {editingItemId === item.id ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          value={editingItemContent}
                                          onChange={e => setEditingItemContent(e.target.value)}
                                          className="h-7 text-sm flex-1"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') updateItem.mutate({ id: item.id, content: editingItemContent });
                                            if (e.key === 'Escape') setEditingItemId(null);
                                          }}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => updateItem.mutate({ id: item.id, content: editingItemContent })}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => setEditingItemId(null)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-sm flex-1">{item.content}</span>
                                        
                                        {/* Subfield badges */}
                                        <div className="flex items-center gap-1">
                                          {getItemSubfieldBadges(item).map((badge, idx) => (
                                            <Badge key={idx} variant="outline" className={`text-[10px] px-1 py-0 ${badge.color}`}>
                                              <badge.icon className="h-3 w-3 mr-0.5" />
                                              {badge.label}
                                            </Badge>
                                          ))}
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleOpenConfig(item)}
                                            title="Configurar subcampos"
                                          >
                                            <Settings className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              setEditingItemId(item.id);
                                              setEditingItemContent(item.content);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteConfirm({ id: item.id, name: item.content, type: 'item' })}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}

                                {/* Add new item */}
                                <div className="flex items-center gap-2 pl-6">
                                  <Input
                                    value={newItemContent[checklist.id] || ''}
                                    onChange={e => setNewItemContent({ ...newItemContent, [checklist.id]: e.target.value })}
                                    placeholder="Novo item..."
                                    className="h-7 text-sm"
                                    onKeyDown={e => e.key === 'Enter' && handleCreateItem(checklist.id)}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleCreateItem(checklist.id)}
                                    disabled={!newItemContent[checklist.id]?.trim()}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}

                      {/* Add new checklist */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Input
                          value={newChecklistName[template.id] || ''}
                          onChange={e => setNewChecklistName({ ...newChecklistName, [template.id]: e.target.value })}
                          placeholder="Nome do novo checklist..."
                          className="h-8 text-sm"
                          onKeyDown={e => e.key === 'Enter' && handleCreateChecklist(template.id)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateChecklist(template.id)}
                          disabled={!newChecklistName[template.id]?.trim()}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Checklist
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <DoubleConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={`Excluir ${deleteConfirm?.type === 'checklist' ? 'checklist' : 'item'}?`}
        description={`Tem certeza que deseja excluir "${deleteConfirm?.name}"?${deleteConfirm?.type === 'checklist' ? ' Todos os itens serão excluídos.' : ''}`}
        confirmText="Excluir"
        onConfirm={handleDelete}
      />

      {/* Item config dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Subcampos</DialogTitle>
            <DialogDescription>
              Configure os campos adicionais que aparecerão quando o item for marcado como concluído.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Item: {configuringItem?.content}
            </div>

            {/* Requires Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Requer Data de Emissão</span>
              </div>
              <Switch
                checked={configRequiresDate}
                onCheckedChange={setConfigRequiresDate}
              />
            </div>

            {/* Requires Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Requer Seleção de Status</span>
                </div>
                <Switch
                  checked={configRequiresStatus}
                  onCheckedChange={setConfigRequiresStatus}
                />
              </div>
              
              {configRequiresStatus && (
                <div className="pl-6 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {configStatusOptions.map((option, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {option}
                        <button
                          onClick={() => handleRemoveStatusOption(option)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newStatusOption}
                      onChange={e => setNewStatusOption(e.target.value)}
                      placeholder="Nova opção..."
                      className="h-8 text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddStatusOption()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddStatusOption}
                      disabled={!newStatusOption.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Requires Observation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-sm">Requer Campo de Observação</span>
              </div>
              <Switch
                checked={configRequiresObservation}
                onCheckedChange={setConfigRequiresObservation}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
