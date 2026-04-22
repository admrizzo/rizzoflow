import { useState } from 'react';
import { CardPartyWithChecklist, PartyType, CardType } from '@/types/database';
import { useCardParties } from '@/hooks/useCardParties';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  UserPlus,
  Briefcase,
  UserCheck,
  History,
  Home,
  CheckCircle,
  X,
  User,
  Shield,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Board IDs
const VENDA_BOARD_ID = '04ab7bde-6142-4644-a158-a3a232486b30';
const LOCACAO_BOARD_ID = '158b0361-7cd2-4a37-8f3d-a5e9c85f040f';
const CAPTACAO_BOARD_ID = '03f27629-1ab8-49dc-b202-f6c39dc8ed6e';
const DEV_BOARD_ID = 'd548ee8f-a2af-430c-9160-17c72bb14576';

interface CardPartiesSectionProps {
  cardId: string;
  cardType?: CardType;
  boardId: string;
  canEdit: boolean;
}

interface PartyTypeConfig {
  type: PartyType;
  label: string;
  pluralLabel: string;
  icon: React.ReactNode;
  isMain?: boolean;
}

// Party types configuration per board
const VENDA_MAIN_PARTIES: PartyTypeConfig[] = [
  { type: 'vendedor', label: 'Vendedor', pluralLabel: 'Vendedores', icon: <Briefcase className="w-4 h-4" />, isMain: true },
  { type: 'comprador', label: 'Comprador', pluralLabel: 'Compradores', icon: <UserPlus className="w-4 h-4" />, isMain: true },
  { type: 'imovel', label: 'Imóvel', pluralLabel: 'Imóveis', icon: <Home className="w-4 h-4" />, isMain: true },
];

const VENDA_ADDITIONAL_PARTIES: PartyTypeConfig[] = [
  { type: 'vendedor_anterior', label: 'Vendedor Anterior', pluralLabel: 'Vendedores Anteriores', icon: <History className="w-4 h-4" /> },
  { type: 'procurador', label: 'Procurador', pluralLabel: 'Procuradores', icon: <UserCheck className="w-4 h-4" /> },
];

const LOCACAO_MAIN_PARTIES: PartyTypeConfig[] = [
  { type: 'locatario', label: 'Locatário', pluralLabel: 'Locatários', icon: <User className="w-4 h-4" />, isMain: true },
];

const LOCACAO_ADDITIONAL_PARTIES: PartyTypeConfig[] = [
  { type: 'fiador', label: 'Fiador', pluralLabel: 'Fiadores', icon: <Shield className="w-4 h-4" /> },
];

const CAPTACAO_MAIN_PARTIES: PartyTypeConfig[] = [
  { type: 'proprietario', label: 'Proprietário', pluralLabel: 'Proprietários', icon: <Building className="w-4 h-4" />, isMain: true },
];

const CAPTACAO_ADDITIONAL_PARTIES: PartyTypeConfig[] = [];

const DEV_MAIN_PARTIES: PartyTypeConfig[] = [
  { type: 'comprador', label: 'Comprador', pluralLabel: 'Compradores', icon: <UserPlus className="w-4 h-4" />, isMain: true },
  { type: 'imovel', label: 'Imóvel', pluralLabel: 'Imóveis', icon: <Home className="w-4 h-4" />, isMain: true },
];

const DEV_ADDITIONAL_PARTIES: PartyTypeConfig[] = [];

// Get party configuration based on board
function getPartyConfig(boardId: string): { main: PartyTypeConfig[]; additional: PartyTypeConfig[] } {
  switch (boardId) {
    case VENDA_BOARD_ID:
      return { main: VENDA_MAIN_PARTIES, additional: VENDA_ADDITIONAL_PARTIES };
    case LOCACAO_BOARD_ID:
      return { main: LOCACAO_MAIN_PARTIES, additional: LOCACAO_ADDITIONAL_PARTIES };
    case CAPTACAO_BOARD_ID:
      return { main: CAPTACAO_MAIN_PARTIES, additional: CAPTACAO_ADDITIONAL_PARTIES };
    case DEV_BOARD_ID:
      return { main: DEV_MAIN_PARTIES, additional: DEV_ADDITIONAL_PARTIES };
    default:
      return { main: [], additional: [] };
  }
}

export function CardPartiesSection({ cardId, cardType, boardId, canEdit }: CardPartiesSectionProps) {
  const { parties, isLoading, addParty, removeParty, updatePartyName } = useCardParties(cardId);
  const { isEditor } = useAuth();
  const [partyToDelete, setPartyToDelete] = useState<CardPartyWithChecklist | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const partyConfig = getPartyConfig(boardId);

  // If no party types configured for this board, don't render
  if (partyConfig.main.length === 0 && partyConfig.additional.length === 0) {
    return null;
  }

  const handleAddParty = async (partyType: PartyType) => {
    await addParty.mutateAsync({
      cardId,
      partyType,
      cardType,
      boardId,
    });
  };

  const handleRemoveParty = async () => {
    if (!partyToDelete) return;
    await removeParty.mutateAsync(partyToDelete.id);
    setPartyToDelete(null);
  };

  const handleStartEditName = (party: CardPartyWithChecklist) => {
    setEditingPartyId(party.id);
    setEditingName(party.name || '');
  };

  const handleSaveName = async (partyId: string) => {
    await updatePartyName.mutateAsync({ partyId, name: editingName });
    setEditingPartyId(null);
    setEditingName('');
  };

  const handleCancelEditName = () => {
    setEditingPartyId(null);
    setEditingName('');
  };

  const getPartiesOfType = (type: PartyType) => 
    parties.filter(p => p.party_type === type);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Carregando partes...</span>
        </div>
      </div>
    );
  }

  const renderPartyCard = (party: CardPartyWithChecklist, label: string, showDelete: boolean = true) => {
    const isEditing = editingPartyId === party.id;
    
    return (
      <div key={party.id} className="border rounded-lg bg-background p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-sm">
              {label} {party.party_number}
            </span>
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Nome da parte..."
                  className="h-7 text-xs flex-1 max-w-[200px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName(party.id);
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveName(party.id)}
                  className="h-6 w-6 p-0"
                >
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditName}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                {party.name ? (
                  <span 
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => canEdit && handleStartEditName(party)}
                    title={canEdit ? "Clique para editar" : undefined}
                  >
                    ({party.name})
                  </span>
                ) : canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEditName(party)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    + Nome
                  </Button>
                )}
              </>
            )}
            {party.checklist && (
              <Badge variant="outline" className="text-xs">
                {party.checklist.items?.filter(i => i.is_completed && !i.is_dismissed).length || 0}/
                {party.checklist.items?.filter(i => !i.is_dismissed).length || 0} itens
              </Badge>
            )}
          </div>
          {canEdit && showDelete && party.party_number > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPartyToDelete(party);
              }}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderMainPartySection = (config: PartyTypeConfig) => {
    const { type, label, pluralLabel, icon } = config;
    const partiesOfType = getPartiesOfType(type);
    
    return (
      <div key={type} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icon}
            <span>{pluralLabel}</span>
            {partiesOfType.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {partiesOfType.length}
              </Badge>
            )}
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddParty(type)}
              disabled={addParty.isPending}
              className="h-7 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          )}
        </div>

        <div className="space-y-2 pl-2">
          {partiesOfType.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-4">
              Nenhum {label.toLowerCase()} adicionado
            </p>
          ) : (
            partiesOfType.map(party => renderPartyCard(party, label))
          )}
        </div>
      </div>
    );
  };

  const renderAdditionalPartySection = (config: PartyTypeConfig) => {
    const { type, label, pluralLabel, icon } = config;
    const partiesOfType = getPartiesOfType(type);
    
    // If no parties of this type exist, show add button
    if (partiesOfType.length === 0) {
      return (
        <div key={type} className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icon}
            <span>{pluralLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground italic pl-6">
            Nenhum {label.toLowerCase()} adicionado
          </p>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddParty(type)}
              disabled={addParty.isPending}
              className="h-8 text-xs gap-1 w-full justify-center border-dashed ml-2"
            >
              <Plus className="w-3 h-3" />
              Adicionar {label}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div key={type} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icon}
            <span>{pluralLabel}</span>
            <Badge variant="outline" className="text-xs">
              {partiesOfType.length}
            </Badge>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddParty(type)}
              disabled={addParty.isPending}
              className="h-7 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          )}
        </div>

        <div className="space-y-2 pl-2">
          {partiesOfType.map(party => renderPartyCard(party, label))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-semibold">Partes do Negócio</span>
              <Badge variant="secondary" className="text-xs">
                {parties.length}
              </Badge>
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-6 mt-2 pl-2">
          {/* Main parties - always visible */}
          {partyConfig.main.map(config => renderMainPartySection(config))}

          {/* Divider for additional parties - only if there are additional party types */}
          {partyConfig.additional.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3">Partes adicionais</p>
              
              {/* Additional parties */}
              {partyConfig.additional.map(config => renderAdditionalPartySection(config))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!partyToDelete} onOpenChange={() => setPartyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover parte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a parte e seu checklist associado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveParty}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
