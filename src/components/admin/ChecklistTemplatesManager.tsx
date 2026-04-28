import { useState } from 'react';
import { useChecklistTemplates, ChecklistItemTemplate } from '@/hooks/useChecklistTemplates';
import { useBoards } from '@/hooks/useBoards';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { supabase } from '@/integrations/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ArrowLeft, Plus, Pencil, Trash2, GripVertical, ListChecks, 
  ChevronDown, ChevronRight, Check, X, Copy, Settings, CalendarDays, ListCheck, FileText, Save
} from 'lucide-react';
import { Board } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ChecklistTemplatesManagerProps {
  board: Board;
  onClose: () => void;
}

export function ChecklistTemplatesManager({ board, onClose }: ChecklistTemplatesManagerProps) {
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    reorderTemplates,
    createTemplateItem,
    updateTemplateItem,
    deleteTemplateItem,
    reorderTemplateItems,
  } = useChecklistTemplates(board.id);
  
  const { boards } = useBoards();
  const { config, updateConfig } = useBoardConfig(board.id);
  const { toast } = useToast();

  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  
  // Item editing states
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState('');

  // Item subfield config dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configuringItem, setConfiguringItem] = useState<ChecklistItemTemplate | null>(null);
  const [configRequiresDate, setConfigRequiresDate] = useState(false);
  const [configRequiresStatus, setConfigRequiresStatus] = useState(false);
  const [configRequiresObservation, setConfigRequiresObservation] = useState(false);
  const [configStatusOptions, setConfigStatusOptions] = useState<string[]>([]);
  const [newStatusOption, setNewStatusOption] = useState('');

  // Active templates (persisted on board_config.auto_apply_checklist_templates)
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingActive, setIsSavingActive] = useState(false);

  // Clone states (separated from active selection)
  const [cloneMode, setCloneMode] = useState(false);
  const [selectedForClone, setSelectedForClone] = useState<Set<string>>(new Set());
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneTargetBoardId, setCloneTargetBoardId] = useState<string>('');
  const [isCloning, setIsCloning] = useState(false);

  const otherBoards = boards.filter(b => b.id !== board.id);

  // Hydrate activeIds from board_config
  if (activeIds === null && config) {
    const initial = new Set<string>(config.auto_apply_checklist_templates || []);
    // setState in render is safe here because guarded by null check (one-shot init)
    setActiveIds(initial);
  }

  const toggleExpanded = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  // ---- Active selection (persisted) ----
  const toggleActive = (templateId: string) => {
    const next = new Set(activeIds || []);
    if (next.has(templateId)) next.delete(templateId);
    else next.add(templateId);
    setActiveIds(next);
    setHasUnsavedChanges(true);
  };

  const toggleActiveAll = () => {
    const all = new Set(templates.map(t => t.id));
    const current = activeIds || new Set();
    // If all are active, clear; otherwise mark all
    const allActive = templates.length > 0 && templates.every(t => current.has(t.id));
    setActiveIds(allActive ? new Set() : all);
    setHasUnsavedChanges(true);
  };

  const handleSaveActive = async () => {
    setIsSavingActive(true);
    try {
      await updateConfig.mutateAsync({
        auto_apply_checklist_templates: Array.from(activeIds || []),
      });
      setHasUnsavedChanges(false);
    } finally {
      setIsSavingActive(false);
    }
  };

  // ---- Clone selection (separate) ----
  const toggleSelection = (templateId: string) => {
    const newSelected = new Set(selectedForClone);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedForClone(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedForClone.size === templates.length) {
      setSelectedForClone(new Set());
    } else {
      setSelectedForClone(new Set(templates.map(t => t.id)));
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    await createTemplate.mutateAsync({ name: newTemplateName.trim(), boardId: board.id });
    setNewTemplateName('');
  };

  const handleUpdateTemplate = async (id: string) => {
    if (!editingTemplateName.trim()) return;
    await updateTemplate.mutateAsync({ id, name: editingTemplateName.trim() });
    setEditingTemplateId(null);
  };

  const handleDeleteTemplate = async () => {
    if (deleteConfirm) {
      await deleteTemplate.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleCreateItem = async (templateId: string) => {
    const content = newItemContent[templateId]?.trim();
    if (!content) return;
    await createTemplateItem.mutateAsync({ content, templateId });
    setNewItemContent({ ...newItemContent, [templateId]: '' });
  };

  const handleUpdateItem = async (id: string) => {
    if (!editingItemContent.trim()) return;
    await updateTemplateItem.mutateAsync({ id, content: editingItemContent.trim() });
    setEditingItemId(null);
  };

  const handleDeleteItem = async (id: string) => {
    await deleteTemplateItem.mutateAsync(id);
  };

  // Open config dialog for an item
  const handleOpenConfig = (item: ChecklistItemTemplate) => {
    setConfiguringItem(item);
    setConfigRequiresDate(item.requires_date || false);
    setConfigRequiresStatus(item.requires_status || false);
    setConfigRequiresObservation(item.requires_observation || false);
    setConfigStatusOptions(item.status_options || []);
    setNewStatusOption('');
    setConfigDialogOpen(true);
  };

  // Save subfield configuration
  const handleSaveConfig = async () => {
    if (!configuringItem) return;
    
    await updateTemplateItem.mutateAsync({
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

  // Add status option
  const handleAddStatusOption = () => {
    if (!newStatusOption.trim()) return;
    if (configStatusOptions.includes(newStatusOption.trim())) return;
    setConfigStatusOptions([...configStatusOptions, newStatusOption.trim()]);
    setNewStatusOption('');
  };

  // Remove status option
  const handleRemoveStatusOption = (option: string) => {
    setConfigStatusOptions(configStatusOptions.filter(o => o !== option));
  };

  // Get item subfield badges
  const getItemSubfieldBadges = (item: ChecklistItemTemplate) => {
    const badges = [];
    if (item.requires_date) badges.push({ icon: CalendarDays, label: 'Data', color: 'bg-blue-100 text-blue-700' });
    if (item.requires_status) badges.push({ icon: ListCheck, label: 'Status', color: 'bg-green-100 text-green-700' });
    if (item.requires_observation) badges.push({ icon: FileText, label: 'Obs', color: 'bg-amber-100 text-amber-700' });
    return badges;
  };

  const handleCloneMultiple = async () => {
    if (selectedForClone.size === 0 || !cloneTargetBoardId) return;

    setIsCloning(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const templatesToClone = templates.filter(t => selectedForClone.has(t.id));

      for (const template of templatesToClone) {
        try {
          // Check for duplicates
          const { data: existing } = await supabase
            .from('checklist_templates')
            .select('id')
            .eq('name', template.name)
            .eq('board_id', cloneTargetBoardId)
            .maybeSingle();

          if (existing) {
            errorCount++;
            continue;
          }

          // Create new template
          const { data: newTemplate } = await supabase
            .from('checklist_templates')
            .insert({
              name: template.name,
              board_id: cloneTargetBoardId,
              position: template.position,
            })
            .select()
            .single();

          // Clone items with subfield config
          if (newTemplate && template.items?.length > 0) {
            const newItems = template.items.map(item => ({
              content: item.content,
              template_id: newTemplate.id,
              position: item.position,
              requires_date: item.requires_date || false,
              requires_status: item.requires_status || false,
              requires_observation: item.requires_observation || false,
              status_options: item.status_options || [],
            }));

            await supabase.from('checklist_item_templates').insert(newItems);
          }

          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: `${successCount} checklist(s) clonado(s)!`,
          description: errorCount > 0 
            ? `${errorCount} já existiam no destino e foram ignorados.` 
            : undefined,
        });
      } else if (errorCount > 0) {
        toast({
          title: 'Nenhum checklist clonado',
          description: 'Todos já existem no fluxo de destino.',
          variant: 'destructive',
        });
      }

      setShowCloneDialog(false);
      setSelectedForClone(new Set());
      setCloneTargetBoardId('');
    } catch (error: any) {
      toast({
        title: 'Erro ao clonar checklists',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Handle drag end for templates and items reordering
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'TEMPLATE') {
      // Reordering templates
      const reordered = Array.from(templates);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      reorderTemplates.mutate(reordered.map(t => t.id));
    } else if (type === 'ITEM') {
      // Reordering items within the same template
      const templateId = source.droppableId.replace('items-', '');
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const reorderedItems = Array.from(template.items);
      const [removed] = reorderedItems.splice(source.index, 1);
      reorderedItems.splice(destination.index, 0, removed);
      reorderTemplateItems.mutate(reorderedItems.map(i => i.id));
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
          <span className="text-muted-foreground">/ Templates de Checklist</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Marque os checklists que devem ser criados automaticamente em cada novo card deste fluxo.
      </p>

      {/* Active templates bar (persisted) */}
      {templates.length > 0 && (
        <div className={`flex items-center justify-between rounded-lg p-2 border ${
          hasUnsavedChanges ? 'bg-amber-50 border-amber-300' : 'bg-muted/50 border-transparent'
        }`}>
          <div className="flex items-center gap-3">
            {cloneMode ? (
              <>
                <Checkbox
                  checked={selectedForClone.size === templates.length && templates.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedForClone.size > 0
                    ? `${selectedForClone.size} marcado(s) para clonar`
                    : 'Selecionar todos para clonar'}
                </span>
              </>
            ) : (
              <>
                <Checkbox
                  checked={
                    templates.length > 0 &&
                    templates.every(t => activeIds?.has(t.id))
                  }
                  onCheckedChange={toggleActiveAll}
                />
                <span className="text-sm">
                  <strong>{activeIds?.size || 0}</strong> de {templates.length} ativo(s) neste fluxo
                </span>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">
                    Alterações não salvas
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cloneMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCloneMode(false);
                    setSelectedForClone(new Set());
                  }}
                >
                  Cancelar
                </Button>
                {selectedForClone.size > 0 && otherBoards.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCloneDialog(true)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clonar selecionados
                  </Button>
                )}
              </>
            ) : (
              <>
                {otherBoards.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCloneMode(true)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clonar para outro fluxo
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveActive}
                  disabled={!hasUnsavedChanges || isSavingActive}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar configuração
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add new template */}
      <div className="flex gap-2">
        <Input
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          placeholder="Nome do novo checklist..."
          onKeyDown={(e) => e.key === 'Enter' && handleCreateTemplate()}
        />
        <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <ScrollArea className="h-[280px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum template de checklist.</p>
            <p className="text-xs mt-1">Adicione templates que serão aplicados nos novos cards.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="templates-list" type="TEMPLATE">
              {(provided) => (
                <div 
                  className="space-y-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {templates.map((template, templateIndex) => (
                    <Draggable key={template.id} draggableId={template.id} index={templateIndex}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}
                        >
                          <Collapsible 
                            open={expandedTemplates.has(template.id)}
                            onOpenChange={() => toggleExpanded(template.id)}
                          >
                            <CardHeader className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <Checkbox 
                                    checked={selectedForClone.has(template.id)}
                                    onCheckedChange={() => toggleSelection(template.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </div>
                                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                                    {expandedTemplates.has(template.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </CollapsibleTrigger>
                                  
                                  {editingTemplateId === template.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={editingTemplateName}
                                        onChange={(e) => setEditingTemplateName(e.target.value)}
                                        className="h-7 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleUpdateTemplate(template.id);
                                          if (e.key === 'Escape') setEditingTemplateId(null);
                                        }}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleUpdateTemplate(template.id)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setEditingTemplateId(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <CardTitle className="text-sm font-medium">
                                      {template.name}
                                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                                        ({template.items.length} itens)
                                      </span>
                                    </CardTitle>
                                  )}
                                </div>

                                {editingTemplateId !== template.id && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingTemplateId(template.id);
                                        setEditingTemplateName(template.name);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteConfirm({ id: template.id, name: template.name })}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardHeader>

                            <CollapsibleContent>
                              <CardContent className="pt-0 pb-3 px-3">
                                <Droppable droppableId={`items-${template.id}`} type="ITEM">
                                  {(itemsProvided) => (
                                    <div 
                                      className="space-y-2 pl-8 border-l-2 border-muted ml-2"
                                      {...itemsProvided.droppableProps}
                                      ref={itemsProvided.innerRef}
                                    >
                                      {template.items.map((item, itemIndex) => {
                                        const subfieldBadges = getItemSubfieldBadges(item);
                                        
                                        return (
                                          <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                            {(itemProvided, itemSnapshot) => (
                                              <div 
                                                key={item.id} 
                                                className={`flex items-center gap-2 group ${itemSnapshot.isDragging ? 'bg-muted rounded p-1' : ''}`}
                                                ref={itemProvided.innerRef}
                                                {...itemProvided.draggableProps}
                                              >
                                                <div
                                                  {...itemProvided.dragHandleProps}
                                                  className="cursor-grab active:cursor-grabbing"
                                                >
                                                  <GripVertical className="h-3 w-3 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100" />
                                                </div>
                                                
                                                {editingItemId === item.id ? (
                                                  <div className="flex items-center gap-2 flex-1">
                                                    <Input
                                                      value={editingItemContent}
                                                      onChange={(e) => setEditingItemContent(e.target.value)}
                                                      className="h-7 text-sm"
                                                      autoFocus
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateItem(item.id);
                                                        if (e.key === 'Escape') setEditingItemId(null);
                                                      }}
                                                    />
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0"
                                                      onClick={() => handleUpdateItem(item.id)}
                                                    >
                                                      <Check className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0"
                                                      onClick={() => setEditingItemId(null)}
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                      <span className="text-sm">{item.content}</span>
                                                      {subfieldBadges.length > 0 && (
                                                        <div className="flex gap-1">
                                                          {subfieldBadges.map((badge, idx) => (
                                                            <TooltipProvider key={idx}>
                                                              <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                  <Badge 
                                                                    variant="secondary" 
                                                                    className={`text-[10px] px-1 py-0 h-4 ${badge.color}`}
                                                                  >
                                                                    <badge.icon className="h-2.5 w-2.5" />
                                                                  </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="text-xs">
                                                                  {badge.label === 'Status' && item.status_options?.length 
                                                                    ? `Status: ${item.status_options.join(', ')}`
                                                                    : badge.label === 'Data' 
                                                                      ? 'Exige data de emissão'
                                                                      : badge.label === 'Obs'
                                                                        ? 'Exige observação'
                                                                        : badge.label
                                                                  }
                                                                </TooltipContent>
                                                              </Tooltip>
                                                            </TooltipProvider>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                                            onClick={() => handleOpenConfig(item)}
                                                          >
                                                            <Settings className="h-3 w-3" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                          Configurar subcampos
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
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
                                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                                      onClick={() => handleDeleteItem(item.id)}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                      {itemsProvided.placeholder}

                                      {/* Add new item */}
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={newItemContent[template.id] || ''}
                                          onChange={(e) => setNewItemContent({ 
                                            ...newItemContent, 
                                            [template.id]: e.target.value 
                                          })}
                                          placeholder="Novo item..."
                                          className="h-7 text-sm"
                                          onKeyDown={(e) => e.key === 'Enter' && handleCreateItem(template.id)}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleCreateItem(template.id)}
                                          disabled={!newItemContent[template.id]?.trim()}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Droppable>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
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

      {/* Subfield Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Subcampos
            </DialogTitle>
            <DialogDescription>
              Configure os campos adicionais que aparecerão quando este item for marcado como concluído.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{configuringItem?.content}</p>
            </div>

            {/* Requires Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Exigir Data</p>
                  <p className="text-xs text-muted-foreground">Campo de data de emissão</p>
                </div>
              </div>
              <Switch 
                checked={configRequiresDate}
                onCheckedChange={setConfigRequiresDate}
              />
            </div>

            {/* Requires Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListCheck className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Exigir Status</p>
                    <p className="text-xs text-muted-foreground">Seleção de status (ex: Positiva/Negativa)</p>
                  </div>
                </div>
                <Switch 
                  checked={configRequiresStatus}
                  onCheckedChange={setConfigRequiresStatus}
                />
              </div>

              {configRequiresStatus && (
                <div className="pl-6 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Opções de status:</p>
                  <div className="flex flex-wrap gap-1">
                    {configStatusOptions.map((option) => (
                      <Badge 
                        key={option} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
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
                      onChange={(e) => setNewStatusOption(e.target.value)}
                      placeholder="Nova opção..."
                      className="h-7 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStatusOption()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddStatusOption}
                      disabled={!newStatusOption.trim()}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {configStatusOptions.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Adicione pelo menos uma opção ou use: Positiva, Negativa
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Requires Observation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Exigir Observação</p>
                  <p className="text-xs text-muted-foreground">Campo de texto para anotações</p>
                </div>
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
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Clonar Checklists
            </DialogTitle>
            <DialogDescription>
              Clone os {selectedForClone.size} checklist(s) selecionado(s) para outro fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fluxo de destino</label>
              <Select value={cloneTargetBoardId} onValueChange={setCloneTargetBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fluxo..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {otherBoards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: b.color }}
                        />
                        {b.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Checklists a clonar:</label>
              <div className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {templates
                  .filter(t => selectedForClone.has(t.id))
                  .map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <ListChecks className="h-3 w-3" />
                      {t.name} ({t.items.length} itens)
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCloneMultiple} 
              disabled={!cloneTargetBoardId || isCloning}
            >
              {isCloning ? 'Clonando...' : `Clonar ${selectedForClone.size} checklist(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation with double confirmation */}
      <DoubleConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir template de checklist?"
        description={`O template "${deleteConfirm?.name}" e todos os seus itens serão excluídos. Isso não afeta checklists já criados em cards existentes.`}
        confirmText="EXCLUIR"
        onConfirm={handleDeleteTemplate}
      />
    </div>
  );
}
