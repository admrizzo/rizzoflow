import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardParty, CardPartyWithChecklist, PartyType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Board IDs
const VENDA_BOARD_ID = '04ab7bde-6142-4644-a158-a3a232486b30';
const LOCACAO_BOARD_ID = '158b0361-7cd2-4a37-8f3d-a5e9c85f040f';
const CAPTACAO_BOARD_ID = '03f27629-1ab8-49dc-b202-f6c39dc8ed6e';
const DEV_BOARD_ID = 'd548ee8f-a2af-430c-9160-17c72bb14576';

// Template names mapping per board and card type
type PartialPartyTemplates = Partial<Record<PartyType, string>>;

const VENDA_TEMPLATE_MAP: Record<string, PartialPartyTemplates> = {
  com_financiamento: {
    comprador: 'COMPRADOR (COM FINANCIAMENTO)',
    vendedor: 'VENDEDOR',
    procurador: 'PROCURADOR',
    vendedor_anterior: 'VENDEDORES ANTERIORES',
    imovel: 'IMÓVEL',
  },
  sem_financiamento: {
    comprador: 'COMPRADOR (SEM FINANCIAMENTO)',
    vendedor: 'VENDEDOR',
    procurador: 'PROCURADOR',
    vendedor_anterior: 'VENDEDORES ANTERIORES',
    imovel: 'IMÓVEL',
  },
};

const LOCACAO_TEMPLATE_MAP: PartialPartyTemplates = {
  locatario: 'Locatário 1',
  fiador: 'Fiador 1',
};

const CAPTACAO_TEMPLATE_MAP: PartialPartyTemplates = {
  proprietario: 'Proprietário 1',
};

const DEV_TEMPLATE_MAP: Record<string, PartialPartyTemplates> = {
  com_financiamento: {
    comprador: 'COMPRADOR (COM FINANCIAMENTO)',
  },
  sem_financiamento: {
    comprador: 'COMPRADOR (SEM FINANCIAMENTO)',
  },
};

const PARTY_DISPLAY_NAMES: Record<PartyType, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
  procurador: 'Procurador',
  vendedor_anterior: 'Vendedor anterior',
  locatario: 'Locatário',
  locador: 'Locador',
  fiador: 'Fiador',
  proprietario: 'Proprietário',
  imovel: 'Imóvel',
};

// Position ranges for each party type
const POSITION_BASE: Record<PartyType, number> = {
  vendedor: 100,
  locador: 100,
  proprietario: 100,
  comprador: 200,
  locatario: 200,
  fiador: 300,
  procurador: 300,
  vendedor_anterior: 400,
  imovel: 500,
};

export function useCardParties(cardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['card-parties', cardId],
    queryFn: async () => {
      if (!cardId) return [];

      const { data, error } = await supabase
        .from('card_parties')
        .select('*')
        .eq('card_id', cardId)
        .order('party_type')
        .order('party_number');

      if (error) throw error;

      // Collect all checklist IDs and user IDs upfront
      const checklistIds = data.map(p => p.checklist_id).filter(Boolean) as string[];
      const createdByIds = data.map(p => p.created_by).filter(Boolean) as string[];

      // Fetch all checklists in ONE query
      let checklistsMap: Record<string, any> = {};
      if (checklistIds.length > 0) {
        const { data: checklists } = await supabase
          .from('checklists')
          .select('*, items:checklist_items(*)')
          .in('id', checklistIds);
        
        if (checklists) {
          checklistsMap = checklists.reduce((acc, cl) => {
            acc[cl.id] = cl;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Collect all user IDs from checklist items
      const itemUserIds = Object.values(checklistsMap).flatMap((cl: any) =>
        (cl.items || []).flatMap((item: any) => 
          [item.completed_by, item.dismissed_by].filter(Boolean)
        )
      );

      // Fetch all profiles in ONE query
      const allUserIds = [...new Set([...createdByIds, ...itemUserIds])];
      let profilesMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', allUserIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Build the response with all data already fetched
      const partiesWithChecklists: CardPartyWithChecklist[] = data.map(party => {
        let checklist = null;
        
        if (party.checklist_id && checklistsMap[party.checklist_id]) {
          const checklistData = checklistsMap[party.checklist_id];
          checklist = {
            ...checklistData,
            items: (checklistData.items || []).map((item: any) => ({
              ...item,
              completed_by_profile: item.completed_by ? profilesMap[item.completed_by] : null,
              dismissed_by_profile: item.dismissed_by ? profilesMap[item.dismissed_by] : null,
            })),
          };
        }

        return {
          ...party,
          party_type: party.party_type as PartyType,
          checklist,
          created_by_profile: party.created_by ? profilesMap[party.created_by] : null,
        };
      });

      return partiesWithChecklists;
    },
    enabled: !!cardId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const addParty = useMutation({
    mutationFn: async ({ 
      cardId, 
      partyType, 
      cardType,
      boardId,
      name 
    }: { 
      cardId: string; 
      partyType: PartyType;
      cardType?: 'com_financiamento' | 'sem_financiamento';
      boardId: string;
      name?: string;
    }) => {
      // Fetch current parties from DB to get accurate next number
      const { data: currentParties } = await supabase
        .from('card_parties')
        .select('id, party_type, party_number')
        .eq('card_id', cardId)
        .eq('party_type', partyType);
      
      // Calculate next party number from actual DB data
      const maxNumber = currentParties?.reduce((max, p) => Math.max(max, p.party_number || 0), 0) || 0;
      const nextNumber = maxNumber + 1;

      // Find the template for this party type based on the board
      let templateName: string | undefined;
      let targetBoardId = boardId;

      if (boardId === VENDA_BOARD_ID && cardType) {
        templateName = VENDA_TEMPLATE_MAP[cardType]?.[partyType];
      } else if (boardId === LOCACAO_BOARD_ID) {
        templateName = LOCACAO_TEMPLATE_MAP[partyType];
      } else if (boardId === CAPTACAO_BOARD_ID) {
        templateName = CAPTACAO_TEMPLATE_MAP[partyType];
      } else if (boardId === DEV_BOARD_ID && cardType) {
        templateName = DEV_TEMPLATE_MAP[cardType]?.[partyType];
      }

      let newChecklist = null;
      
      // Only create checklist if template exists
      if (templateName) {
        // Get the template
        const { data: template } = await supabase
          .from('checklist_templates')
          .select('id')
          .eq('board_id', targetBoardId)
          .eq('name', templateName)
          .single();

        if (template) {
          // Create the checklist with position based on party type
          const checklistPosition = POSITION_BASE[partyType] + nextNumber;
          
          const checklistName = `${PARTY_DISPLAY_NAMES[partyType]} ${nextNumber}`;
          const { data: createdChecklist, error: checklistError } = await supabase
            .from('checklists')
            .insert({
              card_id: cardId,
              name: checklistName,
              position: checklistPosition,
            })
            .select()
            .single();

          if (checklistError) throw checklistError;
          newChecklist = createdChecklist;

          // Copy template items to the new checklist
          const { data: templateItems } = await supabase
            .from('checklist_item_templates')
            .select('*')
            .eq('template_id', template.id)
            .order('position');

          if (templateItems && templateItems.length > 0) {
            const items = templateItems.map(item => ({
              checklist_id: createdChecklist.id,
              content: item.content,
              position: item.position,
            }));

            await supabase.from('checklist_items').insert(items);
          }
        }
      }

      // Create the party record
      const { data: newParty, error: partyError } = await supabase
        .from('card_parties')
        .insert({
          card_id: cardId,
          party_type: partyType,
          party_number: nextNumber,
          name: name || null,
          checklist_id: newChecklist?.id || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (partyError) throw partyError;

      return newParty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-parties', cardId] });
      invalidateCardQueries(queryClient);
      toast({ title: 'Parte adicionada com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar parte',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeParty = useMutation({
    mutationFn: async (partyId: string) => {
      // Get the party to find its checklist
      const party = parties.find(p => p.id === partyId);
      
      // Delete the checklist first (items will cascade)
      if (party?.checklist_id) {
        await supabase
          .from('checklists')
          .delete()
          .eq('id', party.checklist_id);
      }

      // Delete the party
      const { error } = await supabase
        .from('card_parties')
        .delete()
        .eq('id', partyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-parties', cardId] });
      invalidateCardQueries(queryClient);
      toast({ title: 'Parte removida com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover parte',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePartyName = useMutation({
    mutationFn: async ({ partyId, name }: { partyId: string; name: string }) => {
      const { error } = await supabase
        .from('card_parties')
        .update({ name })
        .eq('id', partyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-parties', cardId] });
    },
  });

  return {
    parties,
    isLoading,
    addParty,
    removeParty,
    updatePartyName,
  };
}
