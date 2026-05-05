import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

 import { OperationalNature } from '@/types/database';
 
 export interface ChecklistItemTemplate {
   id: string;
   template_id: string;
   content: string;
   position: number;
   requires_date?: boolean;
   requires_status?: boolean;
   requires_observation?: boolean;
   status_options?: string[];
   operational_nature?: OperationalNature;
 }

export interface ChecklistTemplate {
  id: string;
  board_id: string;
  name: string;
  position: number;
  items: ChecklistItemTemplate[];
}

export function useChecklistTemplates(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklist-templates', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('board_id', boardId)
        .order('position');
      
      if (templatesError) throw templatesError;
      
      // Fetch items for all templates
      const templateIds = templatesData.map(t => t.id);
      
      if (templateIds.length === 0) return [];
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_item_templates')
        .select('*')
        .in('template_id', templateIds)
        .order('position');
      
      if (itemsError) throw itemsError;
      
      // Combine templates with their items
      return templatesData.map(template => ({
        ...template,
        items: (itemsData || []).filter(item => item.template_id === template.id)
      })) as ChecklistTemplate[];
    },
    enabled: !!boardId,
  });

  // Template mutations
  const createTemplate = useMutation({
    mutationFn: async ({ name, boardId: bId }: { name: string; boardId: string }) => {
      const maxPosition = templates.length > 0 
        ? Math.max(...templates.map(t => t.position ?? 0)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('checklist_templates')
        .insert({ name, board_id: bId, position: maxPosition })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
      toast({ title: 'Template de checklist criado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // First delete all items
      await supabase
        .from('checklist_item_templates')
        .delete()
        .eq('template_id', id);

      // Then delete the template
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
      toast({ title: 'Template excluído!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const reorderTemplates = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from('checklist_templates').update({ position: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
    },
  });

  // Template item mutations
  const createTemplateItem = useMutation({
    mutationFn: async ({ 
      content, 
      templateId, 
      requires_date = false,
      requires_status = false,
       requires_observation = false,
       status_options = [],
       operational_nature = 'obrigatorio',
     }: { 
       content: string; 
       templateId: string;
       requires_date?: boolean;
       requires_status?: boolean;
       requires_observation?: boolean;
       status_options?: string[];
       operational_nature?: OperationalNature;
     }) => {
      const template = templates.find(t => t.id === templateId);
      const maxPosition = template && template.items.length > 0 
        ? Math.max(...template.items.map(i => i.position ?? 0)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('checklist_item_templates')
        .insert({ 
          content, 
          template_id: templateId, 
          position: maxPosition,
          requires_date,
          requires_status,
           requires_observation,
           status_options,
           operational_nature,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateTemplateItem = useMutation({
    mutationFn: async ({ 
      id, 
      content,
      requires_date,
      requires_status,
       requires_observation,
       status_options,
       operational_nature,
     }: { 
       id: string; 
       content?: string;
       requires_date?: boolean;
       requires_status?: boolean;
       requires_observation?: boolean;
       status_options?: string[];
       operational_nature?: OperationalNature;
     }) => {
      const updateData: Record<string, unknown> = {};
      if (content !== undefined) updateData.content = content;
      if (requires_date !== undefined) updateData.requires_date = requires_date;
      if (requires_status !== undefined) updateData.requires_status = requires_status;
       if (requires_observation !== undefined) updateData.requires_observation = requires_observation;
       if (status_options !== undefined) updateData.status_options = status_options;
       if (operational_nature !== undefined) updateData.operational_nature = operational_nature;

      const { data, error } = await supabase
        .from('checklist_item_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteTemplateItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_item_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const reorderTemplateItems = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from('checklist_item_templates').update({ position: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', boardId] });
    },
  });

  return {
    templates,
    isLoading,
    // Template operations
    createTemplate,
    updateTemplate,
    deleteTemplate,
    reorderTemplates,
    // Item operations
    createTemplateItem,
    updateTemplateItem,
    deleteTemplateItem,
    reorderTemplateItems,
  };
}
