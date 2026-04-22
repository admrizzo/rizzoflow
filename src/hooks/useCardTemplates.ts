import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CardTemplateChecklist {
  id: string;
  name: string;
  position: number;
  items: {
    id: string;
    content: string;
    position: number;
    requires_date?: boolean;
    requires_status?: boolean;
    requires_observation?: boolean;
    status_options?: string[];
  }[];
}

export interface CardTemplate {
  id: string;
  board_id: string;
  name: string;
  description: string | null;
  default_description: string | null;
  icon: string;
  position: number;
  is_active: boolean;
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
  checklists: CardTemplateChecklist[];
}

export function useCardTemplates(boardId?: string) {
  return useQuery({
    queryKey: ['card-templates', boardId],
    queryFn: async () => {
      if (!boardId) return [];

      // Fetch templates
      const { data: templates, error } = await supabase
        .from('card_templates')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      if (!templates || templates.length === 0) return [];

      // Fetch checklists for all templates
      const templateIds = templates.map(t => t.id);
      
      const { data: checklists } = await supabase
        .from('card_template_checklists')
        .select('*')
        .in('template_id', templateIds)
        .order('position');

      // Fetch checklist items
      const checklistIds = checklists?.map(c => c.id) || [];
      const { data: checklistItems } = await supabase
        .from('card_template_checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('position');

      // Fetch template labels
      const { data: templateLabels } = await supabase
        .from('card_template_labels')
        .select('template_id, label:labels(*)')
        .in('template_id', templateIds);

      // Build the complete template objects
      return templates.map(template => ({
        ...template,
        labels: templateLabels
          ?.filter(tl => tl.template_id === template.id)
          .map(tl => tl.label)
          .filter(Boolean) || [],
        checklists: checklists
          ?.filter(c => c.template_id === template.id)
          .map(checklist => ({
            ...checklist,
            items: checklistItems?.filter(i => i.checklist_id === checklist.id) || []
          })) || []
      })) as CardTemplate[];
    },
    enabled: !!boardId,
  });
}
