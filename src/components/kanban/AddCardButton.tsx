import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCards } from '@/hooks/useCards';
import { useLabels } from '@/hooks/useLabels';
import { useAuth } from '@/contexts/AuthContext';
import { useTitlePattern, generateTitleFromPattern, TitleContext } from '@/hooks/useTitlePattern';
import { useCardTemplates, CardTemplate } from '@/hooks/useCardTemplates';
import { useProperties, Property } from '@/hooks/useProperties';
import { getPropertyDisplayName } from '@/lib/propertyIdentification';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Hash, Building2, User, Wallet, CreditCard, FileText, MapPin, Search } from 'lucide-react';
import { CardTemplateSelector } from './CardTemplateSelector';

// Board name constants for conditional rendering
const RESCISAO_BOARD_NAME = 'Fluxo de Rescisão';
const CAPTACAO_BOARD_NAME = 'Fluxo de Captação';
const VENDA_BOARD_NAME = 'Fluxo de Venda';
const VENDA_BOARD_ID = '04ab7bde-6142-4644-a158-a3a232486b30';
const DEV_BOARD_NAME = 'Fluxo do DEV';
const DEV_BOARD_ID = 'd548ee8f-a2af-430c-9160-17c72bb14576';
const ADMINISTRATIVO_BOARD_NAME = 'Fluxo Administrativo';
const ADMINISTRATIVO_BOARD_ID = 'e9a38d52-7403-4aec-87af-c886774af748';
const JUDICIAL_BOARD_NAME = 'Fluxo Judicial';
const JUDICIAL_BOARD_ID = 'c79c77c0-caee-4cfd-bb37-cd3faeaedcd9';
const MANUTENCAO_BOARD_NAME = 'Manutenção';

// Template names mapping for DEV board
const DEV_TEMPLATE_MAP: Record<string, string> = {
  com_financiamento: 'COMPRADOR (COM FINANCIAMENTO)',
  sem_financiamento: 'COMPRADOR (SEM FINANCIAMENTO)',
};

// Template names mapping for Venda board
const PARTY_TEMPLATE_MAP: Record<string, Record<string, string>> = {
  com_financiamento: {
    comprador: 'COMPRADOR (COM FINANCIAMENTO)',
    vendedor: 'VENDEDOR',
  },
  sem_financiamento: {
    comprador: 'COMPRADOR (SEM FINANCIAMENTO)',
    vendedor: 'VENDEDOR',
  },
};

// Display names for party types (capitalized properly)
const PARTY_DISPLAY_MAP: Record<string, string> = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
};

interface AddCardButtonProps {
  columnId: string;
  boardId: string;
  boardName?: string;
  isAdding: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function AddCardButton({ columnId, boardId, boardName, isAdding, onOpen, onClose }: AddCardButtonProps) {
  const { createCard } = useCards(boardId);
  const queryClient = useQueryClient();
  const { labels } = useLabels(boardId);
  const { isEditor } = useAuth();
  const { titlePattern, generateTitle, hasCustomPattern } = useTitlePattern(boardId);
  const formRef = useRef<HTMLFormElement | null>(null);
  
  // Determine board type - use passed boardName prop directly
  const isRescisaoBoard = boardName === RESCISAO_BOARD_NAME;
  const isCaptacaoBoard = boardName === CAPTACAO_BOARD_NAME;
  const isVendaBoard = boardName === VENDA_BOARD_NAME;
  const isDevBoard = boardName === DEV_BOARD_NAME;
  const isAdministrativoBoard = boardName === ADMINISTRATIVO_BOARD_NAME;
  const isJudicialBoard = boardName === JUDICIAL_BOARD_NAME;
  const isManutencaoBoard = boardName === MANUTENCAO_BOARD_NAME;
  
  // Card templates for Administrativo board
  const { data: cardTemplates = [] } = useCardTemplates(isAdministrativoBoard ? boardId : undefined);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  useEffect(() => {
    if (!isAdding) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !formRef.current || formRef.current.contains(target)) return;
      handleCancel();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAdding]);
  
  // Fields for regular boards (Locação, Venda, etc.)
  const [robustCode, setRobustCode] = useState('');
  const [buildingName, setBuildingName] = useState('');

  // Property lookup helpers (regular boards)
  const { properties: allProperties } = useProperties();
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [buildingNameTouched, setBuildingNameTouched] = useState(false);

  const filteredProperties = allProperties.filter((p) => {
    const q = propertySearchQuery.trim().toLowerCase();
    if (!q) return false;
    return (
      String(p.codigo_robust).includes(q) ||
      (p.titulo || '').toLowerCase().includes(q) ||
      (p.bairro || '').toLowerCase().includes(q) ||
      (p.logradouro || '').toLowerCase().includes(q) ||
      (p.cidade || '').toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // Auto-fill building name when robust code matches a known property
  useEffect(() => {
    if (buildingNameTouched) return;
    const code = robustCode.trim();
    if (!code) return;
    const match = allProperties.find((p) => String(p.codigo_robust) === code);
    if (match) {
      setBuildingName(getPropertyDisplayName(match));
    }
  }, [robustCode, allProperties, buildingNameTouched]);

  const handleSelectProperty = (p: Property) => {
    setRobustCode(String(p.codigo_robust));
    setBuildingName(getPropertyDisplayName(p));
    setBuildingNameTouched(false);
    setPropertySearchOpen(false);
    setPropertySearchQuery('');
  };
  
  // Fields for Rescisão board
  const [tenantName, setTenantName] = useState('');
  const [superlogicaId, setSuperlogicaId] = useState('');
  
  // Fields for Captação board
  const [ownerName, setOwnerName] = useState('');
  const [propertyRobustCode, setPropertyRobustCode] = useState('');
  
  // Fields for Venda board
  const [vendaRobustCode, setVendaRobustCode] = useState('');
  const [mainBuyerName, setMainBuyerName] = useState('');
  const [mainSellerName, setMainSellerName] = useState('');
  
  // Fields for DEV board
  const [devRobustCode, setDevRobustCode] = useState('');
  const [devEmpreendimento, setDevEmpreendimento] = useState('');
  const [devUnidade, setDevUnidade] = useState('');
  const [devComprador, setDevComprador] = useState('');
  const [devCardType, setDevCardType] = useState<'com_financiamento' | 'sem_financiamento' | ''>('');
  const [cardType, setCardType] = useState<'com_financiamento' | 'sem_financiamento' | ''>('');
  
  // Fields for Judicial board
  const [judicialIdentification, setJudicialIdentification] = useState('');
  
  // Fields for Manutenção board
  const [manutSuperlogicaId, setManutSuperlogicaId] = useState('');
  const [manutAddress, setManutAddress] = useState('');

  // Helper to generate title using board config pattern
  const buildTitle = (context: TitleContext): string => {
    if (hasCustomPattern) {
      return generateTitle(context);
    }
    // Fallback to default behavior for boards without custom patterns
    const parts: string[] = [];
    if (context.robust_code?.trim()) parts.push(context.robust_code.trim());
    if (context.building_name?.trim()) parts.push(context.building_name.trim());
    return parts.length > 0 ? parts.join(' - ') : 'Novo negócio';
  };

  // Handle creating a card from template (for Administrativo board)
  const handleTemplateSelect = async (template: CardTemplate, cardName: string) => {
    // Create the card
    createCard.mutate(
      {
        title: cardName,
        description: template.default_description || '',
        column_id: columnId,
        board_id: boardId,
      },
      {
        onSuccess: async (newCard) => {
          if (!newCard) return;
          
          // Apply labels from template
          if (template.labels.length > 0) {
            for (const label of template.labels) {
              await supabase.from('card_labels').insert({
                card_id: newCard.id,
                label_id: label.id,
              });
            }
          }
          
          // Create checklists from template
          for (const templateChecklist of template.checklists) {
            const { data: newChecklist } = await supabase
              .from('checklists')
              .insert({
                card_id: newCard.id,
                name: templateChecklist.name,
                position: templateChecklist.position,
              })
              .select()
              .single();
            
            if (newChecklist && templateChecklist.items.length > 0) {
              const items = templateChecklist.items.map(item => ({
                checklist_id: newChecklist.id,
                content: item.content,
                position: item.position,
                requires_date: item.requires_date || false,
                requires_status: item.requires_status || false,
                requires_observation: item.requires_observation || false,
                status_options: item.status_options || [],
              }));
              
              await supabase.from('checklist_items').insert(items);
            }
          }
          
          // Refresh cards
          queryClient.invalidateQueries({ queryKey: ['cards'] });
          queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
        },
      }
    );
  };

  if (!isEditor) return null;

  // Function to create default parties (Vendedor 1 and Comprador 1) for Venda board
  // Order: Vendedor first, then Comprador
  const createDefaultParties = async (
    cardId: string, 
    type: 'com_financiamento' | 'sem_financiamento',
    buyerName?: string,
    sellerName?: string
  ) => {
    // Order: vendedor first, then comprador (standard pattern)
    const partyTypes = ['vendedor', 'comprador'] as const;
    
    // Position bases to maintain order: Vendedor 100-199, Comprador 200-299
    const positionBase: Record<string, number> = {
      vendedor: 100,
      comprador: 200,
    };
    
    for (const partyType of partyTypes) {
      // Get the template name based on card type
      const templateName = PARTY_TEMPLATE_MAP[type][partyType];
      if (!templateName) continue;
      
      // Get the template
      const { data: template } = await supabase
        .from('checklist_templates')
        .select('id')
        .eq('board_id', VENDA_BOARD_ID)
        .eq('name', templateName)
        .single();
      
      if (!template) continue;
      
      // Create the checklist with proper position
      const checklistName = `${PARTY_DISPLAY_MAP[partyType] || partyType} 1`;
      const { data: newChecklist, error: checklistError } = await supabase
        .from('checklists')
        .insert({
          card_id: cardId,
          name: checklistName,
          position: positionBase[partyType] + 1, // Vendedor 1 = 101, Comprador 1 = 201
        })
        .select()
        .single();
      
      if (checklistError || !newChecklist) continue;
      
      // Copy template items to the new checklist
      const { data: templateItems } = await supabase
        .from('checklist_item_templates')
        .select('*')
        .eq('template_id', template.id)
        .order('position');
      
      if (templateItems && templateItems.length > 0) {
        const items = templateItems.map(item => ({
          checklist_id: newChecklist.id,
          content: item.content,
          position: item.position,
          requires_date: item.requires_date || false,
          requires_status: item.requires_status || false,
          requires_observation: item.requires_observation || false,
          status_options: item.status_options || [],
        }));
        
        await supabase.from('checklist_items').insert(items);
      }
      
      // Create the party record with name from form
      const partyName = partyType === 'comprador' ? buyerName : sellerName;
      await supabase.from('card_parties').insert({
        card_id: cardId,
        party_type: partyType,
        party_number: 1,
        name: partyName?.trim() || null,
        checklist_id: newChecklist.id,
      });
    }
  };

  // Function to create default checklists for DEV board (Comprador 1 + ANEXOS de Contrato)
  const createDevDefaultChecklists = async (
    cardId: string, 
    type: 'com_financiamento' | 'sem_financiamento'
  ) => {
    // 1. Create "Comprador 1" checklist based on financing type
    const templateName = DEV_TEMPLATE_MAP[type];
    if (templateName) {
      const { data: template } = await supabase
        .from('checklist_templates')
        .select('id')
        .eq('board_id', DEV_BOARD_ID)
        .eq('name', templateName)
        .maybeSingle();
      
      if (template) {
        const { data: newChecklist } = await supabase
          .from('checklists')
          .insert({
            card_id: cardId,
            name: 'Comprador 1',
            position: 100,
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
              position: item.position,
              requires_date: item.requires_date || false,
              requires_status: item.requires_status || false,
              requires_observation: item.requires_observation || false,
              status_options: item.status_options || [],
            }));
            
            await supabase.from('checklist_items').insert(items);
          }
        }
      }
    }

    // 2. Create "ANEXOS de Contrato" checklist
    const { data: anexosTemplate } = await supabase
      .from('checklist_templates')
      .select('id')
      .eq('board_id', DEV_BOARD_ID)
      .eq('name', 'ANEXOS de Contrato')
      .maybeSingle();
    
    if (anexosTemplate) {
      const { data: anexosChecklist } = await supabase
        .from('checklists')
        .insert({
          card_id: cardId,
          name: 'ANEXOS de Contrato',
          position: 200,
        })
        .select()
        .single();
      
      if (anexosChecklist) {
        const { data: anexosItems } = await supabase
          .from('checklist_item_templates')
          .select('*')
          .eq('template_id', anexosTemplate.id)
          .order('position');
        
        if (anexosItems && anexosItems.length > 0) {
          const items = anexosItems.map(item => ({
            checklist_id: anexosChecklist.id,
            content: item.content,
            position: item.position,
            requires_date: item.requires_date || false,
            requires_status: item.requires_status || false,
            requires_observation: item.requires_observation || false,
            status_options: item.status_options || [],
          }));
          
          await supabase.from('checklist_items').insert(items);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRescisaoBoard) {
      // Rescisão board: Nome do Locatário + ID Superlógica
      if (!tenantName.trim() || !superlogicaId.trim()) return;
      
      // Use title pattern from config
      const title = buildTitle({
        superlogica_id: superlogicaId.trim(),
        parties: {
          locatario: tenantName.trim(),
        },
      });
      
      createCard.mutate(
        { 
          title, 
          superlogica_id: superlogicaId.trim(),
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: () => {
            setTenantName('');
            setSuperlogicaId('');
            onClose();
          },
        }
      );
    } else if (isCaptacaoBoard) {
      // Captação board: Nome do Proprietário + Cód do imóvel no Robust
      if (!ownerName.trim() || !propertyRobustCode.trim()) return;
      
      // Use title pattern from config
      const title = buildTitle({
        robust_code: propertyRobustCode.trim(),
        parties: {
          proprietario: ownerName.trim(),
        },
      });
      
      createCard.mutate(
        { 
          title, 
          robust_code: propertyRobustCode.trim(),
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: () => {
            setOwnerName('');
            setPropertyRobustCode('');
            onClose();
          },
        }
      );
    } else if (isVendaBoard) {
      // Venda board: Use title pattern from config
      const title = buildTitle({
        robust_code: vendaRobustCode.trim(),
        parties: {
          vendedor: mainSellerName.trim(),
          comprador: mainBuyerName.trim(),
        },
      });
      
      createCard.mutate(
        { 
          title, 
          robust_code: vendaRobustCode.trim() || null,
          card_type: cardType || null,
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: async (newCard) => {
            if (!newCard) return;
            
            // Create default parties (Comprador 1, Vendedor 1) with their checklists and names
            // Only if card_type is selected
            if (cardType) {
              await createDefaultParties(newCard.id, cardType, mainBuyerName.trim(), mainSellerName.trim());

              // Party checklists are created AFTER createCard() resolves.
              // Force a refetch so the card detail view receives COMPRADOR 1 / VENDEDOR 1 checklists.
              queryClient.invalidateQueries({ queryKey: ['cards'] });
              queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
            }
            
            setVendaRobustCode('');
            setMainBuyerName('');
            setMainSellerName('');
            setCardType('');
            onClose();
          },
        }
      );
    } else if (isDevBoard) {
      // DEV board: Use title pattern from config
      const title = buildTitle({
        robust_code: devRobustCode.trim(),
        building_name: devEmpreendimento.trim(),
        unidade: devUnidade.trim(),
        parties: {
          comprador: devComprador.trim(),
        },
      });
      
      createCard.mutate(
        { 
          title, 
          robust_code: devRobustCode.trim() || null,
          building_name: devEmpreendimento.trim() || null,
          address: devUnidade.trim() || null, // store unidade in address field
          card_type: devCardType || null,
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: async (newCard) => {
            if (!newCard) return;
            
            // Create default checklists if card_type is selected
            if (devCardType) {
              await createDevDefaultChecklists(newCard.id, devCardType);
            }

            // Create comprador party record with name
            if (devComprador.trim()) {
              await supabase.from('card_parties').insert({
                card_id: newCard.id,
                party_type: 'comprador',
                party_number: 1,
                name: devComprador.trim(),
              });
            }
            
            // Force a refetch so the card detail view receives checklists
            queryClient.invalidateQueries({ queryKey: ['cards'] });
            queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
            
            setDevRobustCode('');
            setDevEmpreendimento('');
            setDevUnidade('');
            setDevComprador('');
            setDevCardType('');
            onClose();
          },
        }
      );
    } else if (isJudicialBoard) {
      // Judicial board: Only needs identification
      if (!judicialIdentification.trim()) return;
      
      createCard.mutate(
        { 
          title: judicialIdentification.trim(),
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: () => {
            setJudicialIdentification('');
            onClose();
          },
        }
      );
    } else if (isManutencaoBoard) {
      // Manutenção board: Cód. Superlógica + Endereço
      const title = manutAddress.trim() || manutSuperlogicaId.trim() || 'Nova manutenção';
      
      createCard.mutate(
        { 
          title,
          superlogica_id: manutSuperlogicaId.trim() || null,
          address: manutAddress.trim() || null,
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: () => {
            setManutSuperlogicaId('');
            setManutAddress('');
            onClose();
          },
        }
      );
    } else {
      // Regular boards: Use title pattern from config
      if (!robustCode.trim() || !buildingName.trim()) return;
      
      const title = buildTitle({
        robust_code: robustCode.trim(),
        building_name: buildingName.trim(),
      });
      
      createCard.mutate(
        { 
          title, 
          robust_code: robustCode.trim(),
          building_name: buildingName.trim(),
          column_id: columnId, 
          board_id: boardId 
        },
        {
          onSuccess: () => {
            setRobustCode('');
            setBuildingName('');
            onClose();
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setRobustCode('');
    setBuildingName('');
    setTenantName('');
    setSuperlogicaId('');
    setOwnerName('');
    setPropertyRobustCode('');
    setVendaRobustCode('');
    setMainBuyerName('');
    setMainSellerName('');
    setCardType('');
    setDevRobustCode('');
    setDevEmpreendimento('');
    setDevUnidade('');
    setDevComprador('');
    setDevCardType('');
    setJudicialIdentification('');
    setManutSuperlogicaId('');
    setManutAddress('');
    onClose();
  };

  // For Administrativo board, show template selector instead of form
  if (isAdministrativoBoard) {
    if (!isAdding) {
      return (
        <>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg text-xs h-8"
            onClick={() => setTemplateSelectorOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar cartão
          </Button>
          <CardTemplateSelector
            open={templateSelectorOpen}
            onOpenChange={setTemplateSelectorOpen}
            templates={cardTemplates}
            onSelect={handleTemplateSelect}
            isLoading={createCard.isPending}
          />
        </>
      );
    }
    // If somehow isAdding is true for Administrativo, just show the selector
    return (
      <CardTemplateSelector
        open={true}
        onOpenChange={(open) => { if (!open) onClose(); }}
        templates={cardTemplates}
        onSelect={handleTemplateSelect}
        isLoading={createCard.isPending}
      />
    );
  }

  if (!isAdding) {
    return (
      <Button 
        variant="ghost" 
        className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg text-xs h-8"
        onClick={onOpen}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Adicionar cartão
      </Button>
    );
  }

  const isValidRescisao = tenantName.trim() && superlogicaId.trim();
  const isValidCaptacao = ownerName.trim() && propertyRobustCode.trim();
  const isValidVenda = true; // No fields are required for Venda board
  const isValidDev = true; // No fields are required for DEV board
  const isValidJudicial = judicialIdentification.trim();
  const isValidManutencao = manutSuperlogicaId.trim() || manutAddress.trim();
  const isValidRegular = robustCode.trim() && buildingName.trim();
  const isValid = isRescisaoBoard ? isValidRescisao : isCaptacaoBoard ? isValidCaptacao : isVendaBoard ? isValidVenda : isDevBoard ? isValidDev : isJudicialBoard ? isValidJudicial : isManutencaoBoard ? isValidManutencao : isValidRegular;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2 bg-white p-2 rounded-lg shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-100">
      {isRescisaoBoard ? (
        // Rescisão Board Form
        <>
          {/* Tenant Name Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do Inquilino <span className="text-destructive">*</span>
              </Label>
            </div>
            <Input
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Nome completo do inquilino"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          {/* Superlógica ID Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                ID do contrato no Superlógica <span className="text-destructive">*</span>
              </Label>
            </div>
            <Input
              value={superlogicaId}
              onChange={(e) => setSuperlogicaId(e.target.value)}
              placeholder="Número do contrato no ERP"
              className="h-9 text-sm"
            />
          </div>
        </>
      ) : isCaptacaoBoard ? (
        // Captação Board Form
        <>
          {/* Owner Name Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do Proprietário <span className="text-destructive">*</span>
              </Label>
            </div>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nome completo do proprietário"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          {/* Property Robust Code Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Cód do imóvel no Robust <span className="text-destructive">*</span>
              </Label>
            </div>
            <Input
              value={propertyRobustCode}
              onChange={(e) => setPropertyRobustCode(e.target.value)}
              placeholder="Ex: 12345"
              className="h-9 text-sm"
            />
          </div>
        </>
      ) : isVendaBoard ? (
        // Venda Board Form
        <>
          {/* Robust Code Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Cód do imóvel no Robust
              </Label>
            </div>
            <Input
              value={vendaRobustCode}
              onChange={(e) => setVendaRobustCode(e.target.value)}
              placeholder="Ex: 12345"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          {/* Main Seller Name Field - Vendedor primeiro */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do vendedor principal
              </Label>
            </div>
            <Input
              value={mainSellerName}
              onChange={(e) => setMainSellerName(e.target.value)}
              placeholder="Nome do vendedor"
              className="h-9 text-sm"
            />
          </div>

          {/* Main Buyer Name Field - Comprador depois */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do comprador principal
              </Label>
            </div>
            <Input
              value={mainBuyerName}
              onChange={(e) => setMainBuyerName(e.target.value)}
              placeholder="Nome do comprador"
              className="h-9 text-sm"
            />
          </div>

          {/* Card Type Selection - Checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">
              Tipo de negociação
            </Label>
            <div className="flex flex-col gap-2">
              <div 
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${cardType === 'com_financiamento' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setCardType(cardType === 'com_financiamento' ? '' : 'com_financiamento')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${cardType === 'com_financiamento' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {cardType === 'com_financiamento' && <span className="text-white text-xs">✓</span>}
                </div>
                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm">Com Financiamento</span>
              </div>
              <div 
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${cardType === 'sem_financiamento' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setCardType(cardType === 'sem_financiamento' ? '' : 'sem_financiamento')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${cardType === 'sem_financiamento' ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300'}`}>
                  {cardType === 'sem_financiamento' && <span className="text-white text-xs">✓</span>}
                </div>
                <Wallet className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-sm">Sem Financiamento</span>
              </div>
            </div>
          </div>
        </>
      ) : isDevBoard ? (
        // DEV Board Form
        <>
          {/* Robust Code Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Cód no Robust
              </Label>
            </div>
            <Input
              value={devRobustCode}
              onChange={(e) => setDevRobustCode(e.target.value)}
              placeholder="Ex: 12345"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          {/* Empreendimento Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do Empreendimento
              </Label>
            </div>
            <Input
              value={devEmpreendimento}
              onChange={(e) => setDevEmpreendimento(e.target.value)}
              placeholder="Ex: Edifício Aurora"
              className="h-9 text-sm"
            />
          </div>

          {/* Unidade Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Número da unidade
              </Label>
            </div>
            <Input
              value={devUnidade}
              onChange={(e) => setDevUnidade(e.target.value)}
              placeholder="Ex: 502"
              className="h-9 text-sm"
            />
          </div>

          {/* Comprador Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do Comprador
              </Label>
            </div>
            <Input
              value={devComprador}
              onChange={(e) => setDevComprador(e.target.value)}
              placeholder="Nome do comprador"
              className="h-9 text-sm"
            />
          </div>

          {/* Card Type Selection - Checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">
              Tipo de negociação
            </Label>
            <div className="flex flex-col gap-2">
              <div 
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${devCardType === 'com_financiamento' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setDevCardType(devCardType === 'com_financiamento' ? '' : 'com_financiamento')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${devCardType === 'com_financiamento' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {devCardType === 'com_financiamento' && <span className="text-white text-xs">✓</span>}
                </div>
                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm">Com Financiamento</span>
              </div>
              <div 
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${devCardType === 'sem_financiamento' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setDevCardType(devCardType === 'sem_financiamento' ? '' : 'sem_financiamento')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${devCardType === 'sem_financiamento' ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300'}`}>
                  {devCardType === 'sem_financiamento' && <span className="text-white text-xs">✓</span>}
                </div>
                <Wallet className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-sm">Sem Financiamento</span>
              </div>
            </div>
          </div>
        </>
      ) : isJudicialBoard ? (
        // Judicial Board Form - Only identification field
        <>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Identificação do processo <span className="text-destructive">*</span>
              </Label>
            </div>
            <Input
              value={judicialIdentification}
              onChange={(e) => setJudicialIdentification(e.target.value)}
              placeholder="Ex: Ação de Despejo - João Silva"
              autoFocus
              className="h-9 text-sm"
            />
          </div>
        </>
      ) : isManutencaoBoard ? (
        // Manutenção Board Form
        <>
          {/* Superlógica ID */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Cód. do imóvel no Superlógica
              </Label>
            </div>
            <Input
              value={manutSuperlogicaId}
              onChange={(e) => setManutSuperlogicaId(e.target.value)}
              placeholder="Ex: 12345"
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          {/* Address */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Endereço do Imóvel
              </Label>
            </div>
            <Input
              value={manutAddress}
              onChange={(e) => setManutAddress(e.target.value)}
              placeholder="Ex: Rua das Flores, 123"
              className="h-9 text-sm"
            />
          </div>
        </>
      ) : (
        // Regular Board Form
        <>
          {/* Robust Code Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-medium text-gray-600">
                  Cód no Robust <span className="text-destructive">*</span>
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setPropertySearchOpen((v) => !v)}
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
              >
                <Search className="h-3 w-3" />
                Buscar imóvel
              </button>
            </div>
            <Input
              value={robustCode}
              onChange={(e) => {
                setRobustCode(e.target.value);
                setBuildingNameTouched(false);
              }}
              placeholder="Ex: 12345"
              autoFocus
              className="h-9 text-sm"
            />
            {propertySearchOpen && (
              <div className="mt-1.5 border rounded-md p-2 space-y-2 bg-card">
                <Input
                  value={propertySearchQuery}
                  onChange={(e) => setPropertySearchQuery(e.target.value)}
                  placeholder="Buscar por código, nome, bairro..."
                  className="h-8 text-xs"
                />
                {propertySearchQuery && filteredProperties.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Nenhum imóvel encontrado
                  </p>
                )}
                {filteredProperties.length > 0 && (
                  <div className="max-h-44 overflow-y-auto divide-y">
                    {filteredProperties.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectProperty(p)}
                        className="w-full text-left text-xs px-1 py-1.5 hover:bg-muted/60 flex items-center gap-2"
                      >
                        <span className="font-medium">#{p.codigo_robust}</span>
                        <span className="truncate flex-1">{getPropertyDisplayName(p)}</span>
                        <span className="text-muted-foreground truncate">{p.bairro}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Building Name Field */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-gray-600">
                Nome do prédio ou identificação <span className="text-destructive">*</span>
              </Label>
            </div>
            <Input
              value={buildingName}
              onChange={(e) => {
                setBuildingName(e.target.value);
                setBuildingNameTouched(true);
              }}
              placeholder="Ex: Edifício Central"
              className="h-9 text-sm"
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <Button 
          type="submit" 
          size="sm" 
          disabled={createCard.isPending || !isValid} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          Adicionar cartão
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon"
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
