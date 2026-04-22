import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Board IDs
const RESCISAO_BOARD_ID = 'e13c73e2-9c03-458c-a759-20c291a7266c';
const CAPTACAO_BOARD_ID = '03f27629-1ab8-49dc-b202-f6c39dc8ed6e';

// Field mapping: Rescisão field names → Captação field names
const FIELD_MAPPING: Record<string, string> = {
  'Imóvel endereço': 'Imóvel endereço',
  'Detalhes da negociação': 'Detalhes da negociação',
};

interface CloneParams {
  sourceCardId: string;
  sourceCardTitle: string;
  sourceCardSuperlogicaId?: string | null;
  archiveOriginal: boolean;
}

export function useCloneToFlow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const cloneToCaptacao = useMutation({
    mutationFn: async ({ 
      sourceCardId, 
      sourceCardTitle, 
      sourceCardSuperlogicaId,
      archiveOriginal 
    }: CloneParams) => {
      // 1. Get source card field values and source card data
      const [
        { data: sourceFieldValues },
        { data: sourceCard }
      ] = await Promise.all([
        supabase
          .from('card_field_values')
          .select('*, field:board_fields(*)')
          .eq('card_id', sourceCardId),
        supabase
          .from('cards')
          .select('robust_code')
          .eq('id', sourceCardId)
          .single()
      ]);

      // 2. Get Captação board first column and config
      const [
        { data: captacaoColumns, error: colError },
        { data: captacaoConfig }
      ] = await Promise.all([
        supabase
          .from('columns')
          .select('id')
          .eq('board_id', CAPTACAO_BOARD_ID)
          .order('position')
          .limit(1),
        supabase
          .from('board_config')
          .select('title_pattern')
          .eq('board_id', CAPTACAO_BOARD_ID)
          .single()
      ]);

      if (colError || !captacaoColumns?.length) {
        throw new Error('Não foi possível encontrar a coluna inicial do Fluxo de Captação');
      }

      const firstColumnId = captacaoColumns[0].id;

      // 3. Get max position in that column
      const { data: existingCards } = await supabase
        .from('cards')
        .select('position')
        .eq('column_id', firstColumnId)
        .order('position', { ascending: false })
        .limit(1);

      const newPosition = existingCards?.length ? existingCards[0].position + 1 : 0;

      // 4. Create new card in Captação with placeholder title
      // Title will be updated once parties/fields are filled
      // Captação pattern: "{party:proprietario} - {robust_code}"
      const robustCode = sourceCard?.robust_code || '';
      const placeholderTitle = robustCode 
        ? `Proprietário - ${robustCode}` 
        : 'Novo card de captação';

      const { data: newCard, error: cardError } = await supabase
        .from('cards')
        .insert({
          title: placeholderTitle,
          board_id: CAPTACAO_BOARD_ID,
          column_id: firstColumnId,
          position: newPosition,
          created_by: user?.id,
          column_entered_at: new Date().toISOString(),
          superlogica_id: sourceCardSuperlogicaId,
          robust_code: robustCode, // Copy robust_code to help with title
          description: `Clonado do Fluxo de Rescisão (Card original: ${sourceCardTitle})`,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // 5. Get Captação board fields for mapping
      const { data: captacaoFields } = await supabase
        .from('board_fields')
        .select('*')
        .eq('board_id', CAPTACAO_BOARD_ID);

      // 6. Map and copy field values
      if (sourceFieldValues && captacaoFields) {
        const fieldValueInserts = [];
        
        for (const sourceValue of sourceFieldValues) {
          const sourceFieldName = sourceValue.field?.field_name;
          const targetFieldName = FIELD_MAPPING[sourceFieldName];
          
          if (targetFieldName && sourceValue.value) {
            const targetField = captacaoFields.find(f => f.field_name === targetFieldName);
            if (targetField) {
              fieldValueInserts.push({
                card_id: newCard.id,
                field_id: targetField.id,
                value: sourceValue.value,
              });
            }
          }
        }

        if (fieldValueInserts.length > 0) {
          await supabase.from('card_field_values').insert(fieldValueInserts);
        }
      }

      // 7. Copy comments
      const { data: sourceComments } = await supabase
        .from('comments')
        .select('*')
        .eq('card_id', sourceCardId)
        .order('created_at');

      if (sourceComments && sourceComments.length > 0) {
        const commentInserts = sourceComments.map(comment => ({
          card_id: newCard.id,
          content: `[Histórico do Fluxo de Rescisão]\n${comment.content}`,
          user_id: comment.user_id,
        }));

        await supabase.from('comments').insert(commentInserts);
      }

      // 8. Create default checklists from Captação templates
      const { data: templates } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('board_id', CAPTACAO_BOARD_ID)
        .order('position');

      if (templates && templates.length > 0) {
        for (const template of templates) {
          const { data: newChecklist } = await supabase
            .from('checklists')
            .insert({
              card_id: newCard.id,
              name: template.name,
              position: template.position || 0,
            })
            .select()
            .single();

          if (newChecklist) {
            const { data: templateItems } = await supabase
              .from('checklist_item_templates')
              .select('*')
              .eq('template_id', template.id)
              .order('position');

            if (templateItems && templateItems.length > 0) {
              const items = templateItems.map(item => ({
                checklist_id: newChecklist.id,
                content: item.content,
                position: item.position || 0,
              }));

              await supabase.from('checklist_items').insert(items);
            }
          }
        }
      }

      // 9. Archive original if requested
      if (archiveOriginal) {
        await supabase
          .from('cards')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archived_by: user?.id,
            archive_reason: `Enviado para Fluxo de Captação (Card #${newCard.card_number})`,
          })
          .eq('id', sourceCardId);
      }

      return newCard;
    },
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({ 
        title: 'Card clonado com sucesso!',
        description: `Novo card #${newCard.card_number} criado no Fluxo de Captação`,
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao clonar card', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    cloneToCaptacao,
    isRescisaoBoard: (boardId: string) => boardId === RESCISAO_BOARD_ID,
  };
}
