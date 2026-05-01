import { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { CardWithRelations, GuaranteeType, ContractType, CardType } from '@/types/database';
import { useCardMutations } from '@/hooks/useCardMutations';
import { useLabels } from '@/hooks/useLabels';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useBoards } from '@/hooks/useBoards';
import { useColumns } from '@/hooks/useColumns';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { useTitlePattern, TitleContext, extractPartyNames } from '@/hooks/useTitlePattern';
import { useColumnReview, isReviewOverdue, getTimeUntilReview } from '@/hooks/useColumnReview';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  MapPin,
  Building2,
  FileText,
  Users,
  Tag,
  Plus,
  Trash2,
  X,
  UserCircle,
  Calendar as CalendarIcon,
  Archive,
  ArchiveRestore,
   Hash,
   KeyRound,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  ArrowRightCircle,
  Loader2,
  UserPlus,
  Home,
  Search,
  ArrowRight,
  Inbox,
  FileEdit,
  Wrench,
  CheckCheck,
} from 'lucide-react';
import { Copy, ExternalLink } from 'lucide-react';
import { ChecklistSection } from './ChecklistSection';
import { StageChecklistButton } from './StageChecklistButton';
import { CardActivityHistory } from './CardActivityHistory';
import { CardNotesSidebar } from './CardNotesSidebar';
import { CustomFieldsSection } from './CustomFieldsSection';
import { CardPartiesSection } from './CardPartiesSection';
import { MaintenanceProvidersSection } from './MaintenanceProvidersSection';
import { ProposalDocumentsSection } from './ProposalDocumentsSection';
import { ProposalPartiesView } from '@/components/proposta/ProposalPartiesView';
import { useProposalParties } from '@/hooks/useProposalParties';
import { ProposalNegotiationSummary } from './ProposalNegotiationSummary';
import { ProposalContractSummary } from './ProposalContractSummary';
import { useProposalNegotiationSummary } from '@/hooks/useProposalNegotiationSummary';
import { CardTypeBadge } from './CardTypeBadge';
import { CloneToCaptacaoDialog } from './CloneToCaptacaoDialog';
import { AndamentoSection } from './AndamentoSection';
import { InternalBrokersSection } from './InternalBrokersSection';
import { useCardParties } from '@/hooks/useCardParties';
import { RequestCorrectionDialog } from './RequestCorrectionDialog';
import {
  useCardCorrectionRequests,
  SECTION_LABELS,
  type CorrectionRequest,
} from '@/hooks/useCorrectionRequests';
import { describeItem as describeCorrectionItem } from '@/lib/correctionCatalog';
import { useProposalLinkPublicToken } from '@/hooks/useProposalLinkPublicToken';
import { useOpenCardRealtime } from '@/hooks/useOpenCardRealtime';
import { buildPublicUrl } from '@/lib/appUrl';
import { toast as sonnerToast } from 'sonner';
import { useCloneToFlow } from '@/hooks/useCloneToFlow';
import { usePropertiesLight, type PropertyLight } from '@/hooks/useProperties';
import { getPropertyDisplayName } from '@/lib/propertyIdentification';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getSlaStatus, getSlaColors, formatTimeElapsed } from '@/lib/slaUtils';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';

// Board name constants for conditional rendering
const RESCISAO_BOARD_NAME = 'Fluxo de Rescisão';
const VENDA_BOARD_NAME = 'Fluxo de Venda';
const DEV_BOARD_NAME = 'Fluxo do DEV';
const CAPTACAO_BOARD_NAME = 'Fluxo de Captação';
const LOCACAO_BOARD_NAME = 'Fluxo de Locação';
const ADMINISTRATIVO_BOARD_NAME = 'Fluxo Administrativo';
const MANUTENCAO_BOARD_NAME = 'Manutenção';

// Label name for "Imóvel que veio alugado" template
const IMOVEL_ALUGADO_LABEL = 'Imóvel que veio alugado';

// Label name for "Venda de imóvel alugado" template
const VENDA_IMOVEL_ALUGADO_LABEL = 'Venda de imóvel alugado';

// Label name for "Pedido de imóvel alugado pelo locador" template (Devolução solicitada pelo locador)
const PEDIDO_IMOVEL_LOCADOR_LABEL = 'Pedido de imóvel alugado pelo locador';

interface CardDetailDialogProps {
  card: CardWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const guaranteeLabels: Record<GuaranteeType, string> = {
  carta_fianca: 'Carta Fiança',
  caucao: 'Caução',
  fiador: 'Fiador',
  seguro_fianca: 'Seguro Fiança',
  sem_garantia: 'Sem Garantia',
  titulo_capitalizacao: 'Título de Capitalização',
  outro: 'Outro',
};

const contractLabels: Record<ContractType, string> = {
  digital: 'Digital',
  fisico: 'Físico',
};

const REDUNDANT_DESCRIPTION_LABELS = new Set([
  'tipo', 'cliente', 'cpf', 'whatsapp', 'e-mail', 'email', 'imóvel', 'imovel',
  'endereço', 'endereco', 'valor aluguel', 'condomínio', 'condominio', 'iptu',
  'seguro incêndio', 'seguro incendio', 'valor proposto', 'valor proposto pelo cliente',
  'renda mensal', 'comprometimento', 'garantia', 'score', 'corretor',
  'total mensal aproximado', 'aceitou o valor anunciado',
]);

function getVisibleAdditionalDescription(description: string | null | undefined): string {
  if (!description) return '';
  return description
    .split('\n')
    .filter((line) => {
      const normalized = line.trim().replace(/^[-*]\s*/, '').replace(/^\*\*/, '');
      const label = normalized.split(':')[0]?.replace(/\*\*$/g, '').trim().toLowerCase();
      return label ? !REDUNDANT_DESCRIPTION_LABELS.has(label) : !!normalized;
    })
    .join('\n')
    .trim();
}

export function CardDetailDialog({ card, open, onOpenChange }: CardDetailDialogProps) {
  // Hook leve: traz APENAS as mutations necessárias, sem carregar a lista
  // do board inteiro. Reduz o tempo de abertura do card em ~1-2s quando o
  // dialog é aberto a partir de fora do Kanban (ex: Minha Fila, notificações).
  const { updateCard, deleteCard, archiveCard, transferCard, ownerOnlyVisibility } =
    useCardMutations(card?.board_id);
  const { labels, addLabelToCard, removeLabelFromCard } = useLabels(card?.board_id);
  const { profiles, addMemberToCard, removeMemberFromCard } = useProfiles();
  const { isAdmin, user } = useAuth();
  // Permissões operacionais centralizadas: admin, gestor e administrativo
  // podem editar; corretor permanece restrito.
  const { canMoveCards, isAdmin: isAdminRole, isGestor, isAdministrativo } = usePermissions();
  const isEditor = canMoveCards;
  // Edição dos responsáveis internos: somente admin/gestor/administrativo.
  const canEditInternalBrokers = isAdminRole || isGestor || isAdministrativo;
  // Solicitação de correção: mesmo grupo (admin/gestor/administrativo).
  const canRequestCorrection = isAdminRole || isGestor || isAdministrativo;
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const { data: correctionRequests = [] } = useCardCorrectionRequests(card?.id);
  // Realtime focado no card aberto: reflete automaticamente envio de proposta,
  // resposta de correção, novos documentos e novos eventos de histórico vindos
  // do link público — sem fechar o modal nem sobrescrever inputs em edição.
  useOpenCardRealtime({
    cardId: card?.id ?? null,
    proposalLinkId: card?.proposal_link_id ?? null,
    enabled: !!open && !!card?.id,
    currentUserId: user?.id ?? null,
  });
  // Public token do proposal_link — usado para Copiar/Abrir link da proposta.
  const { data: proposalPublicToken } = useProposalLinkPublicToken(card?.proposal_link_id || null);
  const proposalPublicUrl = proposalPublicToken
    ? buildPublicUrl(`/proposta/${proposalPublicToken}`)
    : null;
  const handleCopyProposalLink = useCallback(() => {
    if (!proposalPublicUrl) return;
    navigator.clipboard.writeText(proposalPublicUrl).then(
      () => sonnerToast.success('Link copiado'),
      () => sonnerToast.error('Não foi possível copiar o link'),
    );
  }, [proposalPublicUrl]);
  const handleOpenProposalLink = useCallback(() => {
    if (!proposalPublicUrl) return;
    window.open(proposalPublicUrl, '_blank', 'noopener,noreferrer');
  }, [proposalPublicUrl]);
  const pendingCorrection: CorrectionRequest | undefined = correctionRequests.find(
    (c) => c.status === 'pending'
  );
  const lastResponded: CorrectionRequest | undefined = correctionRequests.find(
    (c) => c.status === 'responded'
  );
  // "Correção/Complementação recebida": existe uma solicitação respondida e nenhuma pendente,
  // e a resposta veio depois do último submitted_at conhecido.
  const correctionReceived =
    !pendingCorrection &&
    !!lastResponded &&
    !!card?.proposal_submitted_at &&
    new Date(lastResponded.responded_at || 0).getTime() >=
      new Date(card.proposal_submitted_at).getTime() - 5000;
  const correctionReceivedLabel = (() => {
    if (!lastResponded) return '';
    const sections = lastResponded.requested_sections || [];
    const onlyDocs = sections.length > 0 && sections.every((s) => s === 'documentos');
    return onlyDocs ? 'Complementação recebida' : 'Correção recebida';
  })();
  const { boards } = useBoards();
  const { columns } = useColumns(card?.board_id);
  const { config: boardConfig } = useBoardConfig(card?.board_id);
  const { generateTitle, fieldAffectsTitle, partyAffectsTitle, hasCustomPattern } = useTitlePattern(card?.board_id);
  const { markAsReviewed } = useColumnReview(card?.board_id);
  const { cloneToCaptacao, isRescisaoBoard: checkIsRescisao } = useCloneToFlow();

  // Check if current user can transfer this card
  const canTransferCard = isAdmin || (card?.created_by === user?.id && ownerOnlyVisibility);

  // Determine board type
  const currentBoard = boards.find(b => b.id === card?.board_id);
  const isRescisaoBoard = currentBoard?.name === RESCISAO_BOARD_NAME;
  const isVendaBoard = currentBoard?.name === VENDA_BOARD_NAME;
  const isDevBoard = currentBoard?.name === DEV_BOARD_NAME;
  const isCaptacaoBoard = currentBoard?.name === CAPTACAO_BOARD_NAME;
  const isLocacaoBoard = currentBoard?.name === LOCACAO_BOARD_NAME;
  const isAdministrativoBoard = currentBoard?.name === ADMINISTRATIVO_BOARD_NAME;
  const isManutencaoBoard = currentBoard?.name === MANUTENCAO_BOARD_NAME;
  
  // Check if card has "Imóvel que veio alugado" label (for Administrativo board)
  const hasImovelAlugadoLabel = card?.labels?.some(l => l.name === IMOVEL_ALUGADO_LABEL) || false;
  
  // Check if card has "Venda de imóvel alugado" label (for Administrativo board)
  const hasVendaImovelAlugadoLabel = card?.labels?.some(l => l.name === VENDA_IMOVEL_ALUGADO_LABEL) || false;
  
  // Check if card has "Pedido de imóvel alugado pelo locador" label (Devolução solicitada pelo locador)
  const hasPedidoImovelLocadorLabel = card?.labels?.some(l => l.name === PEDIDO_IMOVEL_LOCADOR_LABEL) || false;
  
  // Use board config for field visibility (fallback to hardcoded logic for special boards)
  const showGuaranteeType = boardConfig?.show_guarantee_type !== false && !isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard;
  const showContractType = boardConfig?.show_contract_type !== false && !isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard;

  // Get current column for review deadline
  const currentColumn = columns.find(c => c.id === card?.column_id);
  const hasReviewDeadline = !!currentColumn?.review_deadline_days;
  const reviewOverdue = card && currentColumn ? isReviewOverdue(card, currentColumn) : false;
  const timeUntilReview = card && currentColumn ? getTimeUntilReview(card, currentColumn) : null;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransferUser, setSelectedTransferUser] = useState<string>('');
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  // Lista leve de imóveis (sem `raw_data`). Antes carregávamos MB de JSON
  // por imóvel só para resolver o seletor de imóvel dentro do card.
  const { properties: allProperties } = usePropertiesLight();

  // Check if property is still available in CRM
  const linkedProperty = card?.robust_code ? allProperties.find(p => String(p.codigo_robust) === card.robust_code) : null;
  const propertyUnavailable = card?.robust_code && allProperties.length > 0 && !linkedProperty;

  const filteredProperties = allProperties.filter(p => {
    if (!propertySearchQuery) return true;
    const q = propertySearchQuery.toLowerCase();
    return (
      String(p.codigo_robust).includes(q) ||
      (p.titulo || '').toLowerCase().includes(q) ||
      (p.bairro || '').toLowerCase().includes(q) ||
      (p.logradouro || '').toLowerCase().includes(q)
    );
  }).slice(0, 15);

  const selectProperty = (p: PropertyLight) => {
    const endereco = [p.logradouro, p.numero, p.bairro, p.cidade, p.estado].filter(Boolean).join(', ');
    const displayName = getPropertyDisplayName(p);
    setLocalRobustCode(String(p.codigo_robust));
    setLocalBuildingName(displayName);
    setLocalAddress(endereco);
    updateCard.mutate({
      id: card!.id,
      robust_code: String(p.codigo_robust),
      building_name: displayName || null,
      address: endereco || null,
    });
    setPropertySearchOpen(false);
    setPropertySearchQuery('');
  };

  const resetLocalDialogs = useCallback(() => {
    setArchiveDialogOpen(false);
    setDeleteConfirmOpen(false);
    setCloneDialogOpen(false);
    setTransferDialogOpen(false);
    setIsEditingTitle(false);
  }, []);

  /**
   * CRITICAL FIX for removeChild errors and flickering:
   * 
   * The problem: Radix Dialog uses portals that can conflict when:
   * 1. Multiple portals are nested (Dialog > Select/Popover/Dropdown)
   * 2. The dialog closes while a nested portal is still unmounting
   * 3. The same click event that opens the dialog is interpreted as "outside click"
   * 
   * Solution: Close the dialog synchronously but let React handle the cleanup.
   * We no longer defer with setTimeout/requestAnimationFrame which can cause
   * race conditions between portal cleanup and state updates.
   */
  const requestClose = useCallback(() => {
    resetLocalDialogs();
    // Close synchronously - let React handle the unmount order
    onOpenChange(false);
  }, [onOpenChange, resetLocalDialogs]);
  
  
  // Local state for text fields to prevent lag
  const [localRobustCode, setLocalRobustCode] = useState(card?.robust_code || '');
  const [localBuildingName, setLocalBuildingName] = useState(card?.building_name || '');
  const [localSuperlogicaId, setLocalSuperlogicaId] = useState(card?.superlogica_id || '');
  const [localAddress, setLocalAddress] = useState(card?.address || '');
  const [localProposalResponsible, setLocalProposalResponsible] = useState(card?.proposal_responsible || '');
  const [localNegotiationDetails, setLocalNegotiationDetails] = useState(card?.negotiation_details || '');
  const [localDescription, setLocalDescription] = useState(card?.description || '');

  // Venda/DEV: opening data lives in parties (#1)
  const { parties: vendaParties, updatePartyName } = useCardParties((isVendaBoard || isDevBoard) ? card?.id : undefined);
  // Locação: estrutura de partes da proposta pública (proposal_parties)
  const { data: proposalParties = [] } = useProposalParties(card?.id);
  // Locação: resumo estruturado da negociação (vem do proposal_drafts/proposal_links)
  const { data: negotiationSummary } = useProposalNegotiationSummary(card?.proposal_link_id);
  const hasStructuredNegotiation = !!(
    negotiationSummary?.hasData &&
    (negotiationSummary.aluguel !== null ||
      negotiationSummary.aceitouValor !== null ||
      negotiationSummary.tipoAssinatura !== null)
  );
  const visibleAdditionalDescription = useMemo(
    () => getVisibleAdditionalDescription(localDescription),
    [localDescription],
  );
  const compradorPrincipal = isVendaBoard
    ? vendaParties.find(p => p.party_type === 'comprador' && p.party_number === 1)
    : undefined;
  const vendedorPrincipal = isVendaBoard
    ? vendaParties.find(p => p.party_type === 'vendedor' && p.party_number === 1)
    : undefined;
  const [localBuyerName, setLocalBuyerName] = useState('');
  const [localSellerName, setLocalSellerName] = useState('');

  // DEV Board: local state for unit number stored in description field
  // We'll use the description field to store the unit number for DEV board
  const [localDevUnidade, setLocalDevUnidade] = useState('');
  const [localDevComprador, setLocalDevComprador] = useState('');

  // Maintenance: access info stored as JSON in negotiation_details
  const [accessType, setAccessType] = useState<'chave' | 'agendar'>('chave');
  const [accessContactName, setAccessContactName] = useState('');
  const [accessContactPhone, setAccessContactPhone] = useState('');

  // Sync local state when card changes
  useEffect(() => {
    if (card) {
      setLocalRobustCode(card.robust_code || '');
      setLocalBuildingName(card.building_name || '');
      setLocalSuperlogicaId(card.superlogica_id || '');
      setLocalAddress(card.address || '');
      setLocalProposalResponsible(card.proposal_responsible || '');
      setLocalNegotiationDetails(card.negotiation_details || '');
      setLocalDescription(card.description || '');

      // Parse access info from negotiation_details for maintenance boards
      if (card.negotiation_details) {
        try {
          const accessData = JSON.parse(card.negotiation_details);
          if (accessData.access_type) {
            setAccessType(accessData.access_type);
            setAccessContactName(accessData.contact_name || '');
            setAccessContactPhone(accessData.contact_phone || '');
          } else {
            setAccessType('chave');
            setAccessContactName('');
            setAccessContactPhone('');
          }
        } catch {
          // Not JSON, reset
          setAccessType('chave');
          setAccessContactName('');
          setAccessContactPhone('');
        }
      } else {
        setAccessType('chave');
        setAccessContactName('');
        setAccessContactPhone('');
      }
      
      // For DEV board: unidade is stored in the address field
      // Fallback: if address is empty, try parsing from title for legacy cards
      if (isDevBoard) {
        if (card.address) {
          setLocalDevUnidade(card.address);
        } else {
          // Legacy fallback: try to extract from title
          const titleParts = (card.title || '').split(' - ');
          if (titleParts.length >= 4) {
            setLocalDevUnidade(titleParts[2] || '');
          } else {
            setLocalDevUnidade('');
          }
        }
      }
    }
  }, [card?.id, isDevBoard]);

  // DEV board: load comprador name from party record
  const devCompradorParty = isDevBoard
    ? vendaParties.find(p => p.party_type === 'comprador' && p.party_number === 1)
    : undefined;

  useEffect(() => {
    if (!isDevBoard) return;
    if (devCompradorParty) {
      setLocalDevComprador(devCompradorParty.name || '');
    } else if (vendaParties.length === 0) {
      // No parties loaded yet or legacy card without party records
      // Fallback: try to extract comprador from title
      const titleParts = (card?.title || '').split(' - ');
      if (titleParts.length >= 4) {
        setLocalDevComprador(titleParts[3] || '');
      } else if (titleParts.length === 3) {
        // Legacy: when unidade was empty, comprador ended up at position 2
        // But we can't distinguish, so leave empty
        setLocalDevComprador('');
      }
    }
  }, [isDevBoard, devCompradorParty?.id, vendaParties.length]);

  useEffect(() => {
    if (!isVendaBoard) return;
    setLocalBuyerName(compradorPrincipal?.name || '');
    setLocalSellerName(vendedorPrincipal?.name || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVendaBoard, compradorPrincipal?.id, vendedorPrincipal?.id]);

  // Helper to build title context for current card state - MUST be before early return
  const buildCurrentTitleContext = useCallback((overrides?: Partial<TitleContext>): TitleContext => {
    return {
      robust_code: overrides?.robust_code ?? localRobustCode,
      building_name: overrides?.building_name ?? localBuildingName,
      address: overrides?.address ?? localAddress,
      superlogica_id: overrides?.superlogica_id ?? localSuperlogicaId,
      description: overrides?.description ?? localDescription,
      unidade: overrides?.unidade ?? localDevUnidade,
      parties: {
        vendedor: overrides?.parties?.vendedor ?? localSellerName,
        comprador: overrides?.parties?.comprador ?? (localBuyerName || localDevComprador),
        proprietario: overrides?.parties?.proprietario,
        locatario: overrides?.parties?.locatario,
      },
    };
  }, [localRobustCode, localBuildingName, localAddress, localSuperlogicaId, localDescription, localDevUnidade, localSellerName, localBuyerName, localDevComprador]);

  // Update card title using the title pattern from board config - MUST be before early return
  const updateCardTitle = useCallback((overrides?: Partial<TitleContext>) => {
    if (!card || !hasCustomPattern) return;
    
    const context = buildCurrentTitleContext(overrides);
    const newTitle = generateTitle(context);
    
    // Only update if title actually changed
    if (newTitle !== card.title) {
      updateCard.mutate({ id: card.id, title: newTitle });
    }
  }, [card, hasCustomPattern, buildCurrentTitleContext, generateTitle, updateCard]);

  // Legacy functions for backwards compatibility - MUST be before early return
  const updateVendaTitle = useCallback((newRobustCode?: string, newSellerName?: string, newBuyerName?: string) => {
    if (!isVendaBoard || !card) return;
    
    updateCardTitle({
      robust_code: newRobustCode,
      parties: {
        vendedor: newSellerName,
        comprador: newBuyerName,
      },
    });
  }, [isVendaBoard, card, updateCardTitle]);

  const updateDevTitle = useCallback((newRobustCode?: string, newEmpreendimento?: string, newUnidade?: string, newComprador?: string) => {
    if (!isDevBoard || !card) return;
    
    updateCardTitle({
      robust_code: newRobustCode,
      building_name: newEmpreendimento,
      unidade: newUnidade,
      parties: {
        comprador: newComprador,
      },
    });
  }, [isDevBoard, card, updateCardTitle]);

  // Early return AFTER all hooks
  if (!card) return null;

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== card.title) {
      updateCard.mutate({ id: card.id, title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleFieldUpdate = (field: string, value: any) => {
    updateCard.mutate({ id: card.id, [field]: value });
  };

  // Special handler for deadline updates that tracks editor
  const handleFieldBlur = (field: string, localValue: string, originalValue: string | null) => {
    if (localValue !== (originalValue || '')) {
      updateCard.mutate({ id: card.id, [field]: localValue || null });
      
      // Check if this field affects the title based on board config pattern
      if (hasCustomPattern && fieldAffectsTitle(field)) {
        updateCardTitle({ [field]: localValue });
      }
      
      // Legacy: For Venda board, also update title when robust_code changes
      if (field === 'robust_code' && isVendaBoard && !hasCustomPattern) {
        updateVendaTitle(localValue, undefined, undefined);
      }
      
      // Legacy: For DEV board, update title when robust_code or building_name changes
      if (isDevBoard && !hasCustomPattern && (field === 'robust_code' || field === 'building_name')) {
        if (field === 'robust_code') {
          updateDevTitle(localValue, undefined, undefined, undefined);
        } else if (field === 'building_name') {
          updateDevTitle(undefined, localValue, undefined, undefined);
        }
      }
    }
  };

  const handleDeleteConfirm = () => {
    deleteCard.mutate(card.id);
    setDeleteConfirmOpen(false);
    requestClose();
  };

  const handleArchive = () => {
    if (!archiveReason.trim()) return;
    archiveCard.mutate(
      { cardId: card.id, isArchived: true, reason: archiveReason.trim() },
      {
        onSuccess: () => {
          setArchiveDialogOpen(false);
          setArchiveReason('');
          requestClose();
        },
      }
    );
  };

  const handleRestore = () => {
    archiveCard.mutate(
      { cardId: card.id, isArchived: false, reason: null },
      {
        onSuccess: () => {
          requestClose();
        },
      }
    );
  };

  const handleCloneToCaptacao = (archiveOriginal: boolean) => {
    cloneToCaptacao.mutate(
      {
        sourceCardId: card.id,
        sourceCardTitle: card.title,
        sourceCardSuperlogicaId: card.superlogica_id,
        archiveOriginal,
      },
      {
        onSuccess: () => {
          setCloneDialogOpen(false);
          if (archiveOriginal) {
            requestClose();
          }
        },
      }
    );
  };

  const cardLabels = card.labels || [];
  const cardMembers = card.members || [];
  const checklists = card.checklists || [];

  // All checklists (including party checklists) should be shown in ChecklistSection
  // CardPartiesSection only manages party CRUD operations, not checklist display
  // Sort by position to ensure proper order (Vendedor 100+, Comprador 200+, etc.)
  // Secondary: group by party type prefix so same types stay together
  const sortedChecklists = [...checklists].sort((a, b) => {
    // Primary: sort by position
    if (a.position !== b.position) return a.position - b.position;
    // Secondary: sort by name to group same types
    return (a.name || '').localeCompare(b.name || '');
  });

  // Filter checklists based on board type and card_type (financing)
  const filteredChecklists = (() => {
    // Helper: check if numbered versions exist for a given base name pattern
    const hasNumberedVersions = (basePattern: RegExp) => {
      return sortedChecklists.some(cl => {
        const lower = (cl.name || '').trim().toLowerCase();
        return basePattern.test(lower);
      });
    };

    // Safety rule: never hide checklists that already contain user progress/data
    const hasChecklistProgress = (checklist: { items?: any[] }) => {
      const items = checklist.items || [];
      return items.some(item =>
        item.is_completed ||
        item.is_dismissed ||
        !!item.completed_at ||
        !!item.dismissed_at ||
        !!item.issue_date ||
        !!(item.observation_text && String(item.observation_text).trim()) ||
        !!(item.certificate_status && String(item.certificate_status).trim()) ||
        !!(item.creditor_name && String(item.creditor_name).trim()) ||
        !!(item.creditor_value && String(item.creditor_value).trim()) ||
        !!(item.administrator_name && String(item.administrator_name).trim()) ||
        !!(item.civil_status_type && String(item.civil_status_type).trim()) ||
        !!(item.civil_status_other && String(item.civil_status_other).trim())
      );
    };

    if (isDevBoard) {
      // DEV board: hide generic template checklists ONLY if numbered versions exist
      // and ONLY when the generic checklist has no progress.
      const hasNumberedComprador = hasNumberedVersions(/^comprador\s+\d+$/i);
      const hasNumberedImovel = hasNumberedVersions(/^im[oó]vel\s+\d+$/i);

      return sortedChecklists.filter((cl) => {
        const lower = (cl.name || '').trim().toLowerCase();
        const hasProgress = hasChecklistProgress(cl);

        // Hide generic "COMPRADOR (COM/SEM FINANCIAMENTO)" only if numbered versions exist and generic is empty
        if (hasNumberedComprador && lower.includes('comprador') && (lower.includes('com financiamento') || lower.includes('sem financiamento')) && !hasProgress) {
          return false;
        }

        // Hide bare "IMÓVEL" only if numbered versions exist and generic is empty
        if (hasNumberedImovel && /^im[oó]vel$/i.test(lower) && !hasProgress) {
          return false;
        }

        return true;
      });
    }

    if (isVendaBoard) {
      // Venda board: hide generic template checklists ONLY if numbered versions exist
      // and ONLY when the generic checklist has no progress.
      const hasNumberedComprador = hasNumberedVersions(/^comprador\s+\d+$/i);
      const hasNumberedVendedor = hasNumberedVersions(/^vendedor\s+\d+$/i);
      const hasNumberedImovel = hasNumberedVersions(/^im[oó]vel\s+\d+$/i);
      const hasNumberedVendedorAnterior = hasNumberedVersions(/^vendedor(es)?\s*anterior(es)?\s+\d+$/i);
      const hasNumberedProcurador = hasNumberedVersions(/^procurador\s+\d+$/i);

      return sortedChecklists.filter((cl) => {
        const lower = (cl.name || '').trim().toLowerCase();
        const hasProgress = hasChecklistProgress(cl);

        // Hide template-style buyer checklists only if numbered versions exist and generic is empty
        if (hasNumberedComprador && lower.includes('comprador') && (lower.includes('com financiamento') || lower.includes('sem financiamento')) && !hasProgress) {
          return false;
        }

        // Hide bare "vendedor" only if numbered versions exist and generic is empty
        if (hasNumberedVendedor && lower === 'vendedor' && !hasProgress) {
          return false;
        }

        // Hide bare "imóvel"/"imovel" only if numbered versions exist and generic is empty
        if (hasNumberedImovel && /^im[oó]vel$/i.test(lower) && !hasProgress) {
          return false;
        }

        // Hide bare "vendedores anteriores" only if numbered versions exist and generic is empty
        if (hasNumberedVendedorAnterior && /^vendedor(es)?\s*anterior(es)?$/i.test(lower) && !hasProgress) {
          return false;
        }

        // Hide bare "procurador" only if numbered versions exist and generic is empty
        if (hasNumberedProcurador && /^procurador$/i.test(lower) && !hasProgress) {
          return false;
        }

        return true;
      });
    }

    // Other boards: no special filtering
    return sortedChecklists;
  })();

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // Close nested dialogs first, then close main dialog
          resetLocalDialogs();
          onOpenChange(false);
        } else {
          onOpenChange(true);
        }
      }} 
      modal
    >
      <DialogContent
        className="max-w-6xl h-[100dvh] md:h-[90vh] md:max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border"
        hideCloseButton
        onEscapeKeyDown={(e) => {
          // Nested dialogs (confirm/archive/transfer/clone) must close first.
          if (archiveDialogOpen || deleteConfirmOpen || cloneDialogOpen || transferDialogOpen) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Sempre prevenimos o fechamento por clique fora.
          // O usuário pode estar interagindo com popovers/menus que renderizam
          // em portais separados — o card só deve fechar via X, Voltar ou Esc.
          e.preventDefault();
        }}
        onFocusOutside={(e) => {
          // Trocar de aba/janela e voltar não deve fechar o card aberto.
          // O Radix dispara este evento quando o foco vai para fora do dialog
          // (incluindo mudanças de aba), então prevenimos sempre.
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Cobre clique e foco fora — bloqueamos qualquer fechamento
          // implícito. Fechamentos só acontecem via X, Voltar ou Esc.
          e.preventDefault();
        }}
      >
        {/* Mobile header with back button */}
        <DialogHeader
          className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 relative border-b border-primary/30 bg-primary text-primary-foreground"
        >
          <DialogDescription className="sr-only">
            Detalhes do card {card.title}
          </DialogDescription>
          {/* Desktop close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={requestClose}
            className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 hidden md:flex"
            title="Fechar (Esc)"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Back button for mobile + navigation */}
          <div className="flex items-center justify-between gap-2 mb-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={requestClose}
              className="h-8 px-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
          <div className="flex items-start gap-2 pr-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono mt-1.5 px-1.5 py-0.5 rounded bg-white/10 text-primary-foreground/90">
                #{card.card_number}
              </span>
            </div>
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                autoFocus
                className="text-base md:text-lg font-semibold bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/60"
              />
            ) : (
              <DialogTitle
                className="cursor-pointer text-primary-foreground hover:text-primary-foreground/90 text-base md:text-lg break-words font-semibold leading-snug"
                onClick={() => {
                  if (isEditor) {
                    setEditTitle(card.title);
                    setIsEditingTitle(true);
                  }
                }}
              >
                {card.title}
              </DialogTitle>
            )}
          </div>
          {/* Badge: documentos/proposta recebidos pelo cliente */}
          {card.proposal_submitted_at && !pendingCorrection && !correctionReceived && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-400/15 text-emerald-100 border border-emerald-300/30"
                title={`Proposta enviada em ${format(new Date(card.proposal_submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
              >
                <Inbox className="h-3 w-3" />
                Doc. recebidos
              </span>
            </div>
          )}
          {/* Badge: correção solicitada (pendente) */}
          {pendingCorrection && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-400/15 text-orange-100 border border-orange-300/30"
                title="Aguardando o cliente reenviar com as correções solicitadas"
              >
                <Wrench className="h-3 w-3" />
                Correção solicitada
              </span>
            </div>
          )}
          {/* Badge: correção/complementação recebida */}
          {correctionReceived && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-400/15 text-sky-100 border border-sky-300/30"
                title="Cliente reenviou após uma solicitação de correção"
              >
                <CheckCheck className="h-3 w-3" />
                {correctionReceivedLabel}
              </span>
            </div>
          )}
          {/* Badge: proposta em preenchimento pelo cliente (link gerado, ainda não enviado) */}
          {!card.proposal_submitted_at && card.proposal_link_id && (
            (() => {
              const st = (card as any).proposal_link?.status as string | undefined;
              const pending = st == null
                ? true
                : st !== 'enviada' && st !== 'recebida' && st !== 'finalizada';
              if (!pending) return null;
              return (
                <div className="mt-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-400/15 text-amber-100 border border-amber-300/30"
                    title="Cliente ainda preenchendo a proposta pública"
                  >
                    <FileEdit className="h-3 w-3" />
                    Em preenchimento
                  </span>
                </div>
              );
            })()
          )}
          {/* Card creation info - hidden on mobile for space */}
          <div className="hidden md:flex items-center gap-2 text-xs text-primary-foreground/70 mt-2">
            <UserCircle className="h-3 w-3" />
            <span>
              Criado por{' '}
              <span className="font-medium text-primary-foreground/90">
                {card.created_by_profile?.full_name || 'Usuário desconhecido'}
              </span>
            </span>
            <CalendarIcon className="h-3 w-3 ml-2" />
            <span>
              {format(new Date(card.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </DialogHeader>

        {/* Desktop: Two-column layout (preview Modelo C: main + 380px sidebar). Mobile: Single scroll with everything */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Main content - uses native overflow for reliable mobile touch scrolling */}
          <div className={cn(
            "flex-1 min-w-0 px-4 md:px-7 py-5 md:py-6 overflow-y-auto overscroll-contain lp-thin-scroll -webkit-overflow-scrolling-touch bg-background"
          )}>
          <div className="space-y-5 pb-8 max-w-3xl mx-auto">
            {/* Archived Banner */}
            {card.is_archived && (
              <div className="rounded-lg border border-amber-300/70 bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <Archive className="h-5 w-5" />
                  <span className="font-medium">Este card está arquivado</span>
                </div>
                {card.archived_by_profile && card.archived_at && (
                  <p className="text-sm text-amber-800 dark:text-amber-200/90 mt-1">
                    Arquivado por {card.archived_by_profile.full_name} em{' '}
                    {format(new Date(card.archived_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {card.archive_reason && (
                  <p className="text-sm text-amber-800 dark:text-amber-200/90 mt-1">
                    <strong>Motivo:</strong> {card.archive_reason}
                  </p>
                )}
                {isEditor && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleRestore}
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restaurar Card
                  </Button>
                )}
              </div>
            )}


            {/* Review Deadline Section - Only show for columns with review_deadline_days */}
            {/* === BLOCO A: STATUS === */}
            {!card.is_archived && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>
                </header>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Current stage */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Etapa atual</p>
                    <p className="text-sm font-semibold text-foreground">{currentColumn?.name || '—'}</p>
                  </div>
                  {/* Time in stage */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Tempo na etapa</p>
                    <p className="text-sm font-semibold text-foreground">{formatTimeElapsed(card.column_entered_at)}</p>
                  </div>
                  {/* SLA indicator */}
                  {currentColumn?.sla_hours && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">SLA</p>
                      {(() => {
                        const status = getSlaStatus(card.column_entered_at, currentColumn.sla_hours);
                        const colors = getSlaColors(status);
                        return (
                          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold", colors.bg, colors.text)}>
                            <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
                            {status === 'green' ? 'No prazo' : status === 'yellow' ? 'Atenção' : 'Atrasado'}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* Last moved */}
                  {card.last_moved_at && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Última movimentação</p>
                      <p className="text-xs text-foreground">
                        {format(new Date(card.last_moved_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        {card.last_moved_by_profile && (
                          <span className="text-muted-foreground"> por {card.last_moved_by_profile.full_name}</span>
                        )}
                      </p>
                    </div>
                  )}
                  {/* Última atualização (qualquer alteração relevante: docs, status, comentário, etapa) */}
                  {card.updated_at && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Última atualização</p>
                      <p className="text-xs text-foreground">
                        {format(new Date(card.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* === BLOCO: ANDAMENTO === */}
            {!card.is_archived && (
              <AndamentoSection card={card} canEdit={isEditor} />
            )}

            {/* === BLOCO: RESPONSÁVEIS INTERNOS === */}
            {!card.is_archived && (
              <InternalBrokersSection
                capturingBrokerId={card.capturing_broker_id ?? null}
                serviceBrokerId={card.service_broker_id ?? null}
                canEdit={canEditInternalBrokers}
                onChange={(field, value) =>
                  updateCard.mutate({ id: card.id, [field]: value })
                }
              />
            )}

            {hasReviewDeadline && !card.is_archived && reviewOverdue && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-warning/40 bg-warning/10">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                  <span className="text-xs text-warning font-medium truncate">
                    Revisão da etapa pendente
                    {timeUntilReview ? ` · ${timeUntilReview}` : ''}
                  </span>
                </div>
                {isEditor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-warning hover:text-warning hover:bg-warning/20"
                    onClick={() => markAsReviewed.mutate(card.id)}
                    disabled={markAsReviewed.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Marcar checado
                  </Button>
                )}
              </div>
            )}


            {/* Card Identification Fields - Different for each board type */}
            {isRescisaoBoard ? (
              // Rescisão Board: Nome do Inquilino (title) + ID Superlógica (required)
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação do Contrato</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Superlógica ID - Required for Rescisão */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">
                          ID do contrato no Superlógica <span className="text-destructive">*</span>
                        </Label>
                      </div>
                      <Input
                        value={localSuperlogicaId}
                        onChange={(e) => setLocalSuperlogicaId(e.target.value)}
                        onBlur={() => handleFieldBlur('superlogica_id', localSuperlogicaId, card.superlogica_id)}
                        placeholder="Número do contrato no ERP"
                        disabled={!isEditor}
                        className={!localSuperlogicaId ? 'border-amber-400' : ''}
                      />
                      {!localSuperlogicaId && (
                        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : isVendaBoard ? (
              // Venda Board: Opening data
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Cód do imóvel no Robust</Label>
                        </div>
                        <CardTypeBadge cardType={card.card_type as CardType | null} size="md" />
                      </div>
                      <Input
                        value={localRobustCode}
                        onChange={(e) => setLocalRobustCode(e.target.value)}
                        onBlur={() => handleFieldBlur('robust_code', localRobustCode, card.robust_code)}
                        placeholder="Ex: 12345"
                        disabled={!isEditor}
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Nome do vendedor principal</Label>
                      </div>
                      <Input
                        value={localSellerName}
                        onChange={(e) => setLocalSellerName(e.target.value)}
                        onBlur={() => {
                          if (!isEditor) return;
                          if (!vendedorPrincipal?.id) return;
                          const next = localSellerName.trim();
                          if ((vendedorPrincipal.name || '') !== next) {
                            updatePartyName.mutate({ partyId: vendedorPrincipal.id, name: next });
                            // Update card title with new seller name
                            updateVendaTitle(undefined, next, undefined);
                          }
                        }}
                        placeholder="Nome do vendedor"
                        disabled={!isEditor}
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Nome do comprador principal</Label>
                      </div>
                      <Input
                        value={localBuyerName}
                        onChange={(e) => setLocalBuyerName(e.target.value)}
                        onBlur={() => {
                          if (!isEditor) return;
                          if (!compradorPrincipal?.id) return;
                          const next = localBuyerName.trim();
                          if ((compradorPrincipal.name || '') !== next) {
                            updatePartyName.mutate({ partyId: compradorPrincipal.id, name: next });
                            // Update card title with new buyer name
                            updateVendaTitle(undefined, undefined, next);
                          }
                        }}
                        placeholder="Nome do comprador"
                        disabled={!isEditor}
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-sm font-medium">Com ou sem financiamento</Label>
                      </div>
                      <Select
                        value={(card.card_type as string) || ''}
                        onValueChange={(v) => handleFieldUpdate('card_type', v || null)}
                        disabled={!isEditor}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="com_financiamento">Com financiamento</SelectItem>
                          <SelectItem value="sem_financiamento">Sem financiamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>
            ) : isDevBoard ? (
              // DEV Board: Cód Robust + Empreendimento + Unidade + Comprador
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Cód no Robust</Label>
                        </div>
                        <CardTypeBadge cardType={card.card_type as CardType | null} size="md" />
                      </div>
                      <Input
                        value={localRobustCode}
                        onChange={(e) => setLocalRobustCode(e.target.value)}
                        onBlur={() => handleFieldBlur('robust_code', localRobustCode, card.robust_code)}
                        placeholder="Ex: 12345"
                        disabled={!isEditor}
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Nome do Empreendimento</Label>
                      </div>
                      <Input
                        value={localBuildingName}
                        onChange={(e) => setLocalBuildingName(e.target.value)}
                        onBlur={() => handleFieldBlur('building_name', localBuildingName, card.building_name)}
                        placeholder="Ex: Edifício Aurora"
                        disabled={!isEditor}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Número da unidade</Label>
                      </div>
                      <Input
                        value={localDevUnidade}
                        onChange={(e) => setLocalDevUnidade(e.target.value)}
                        onBlur={() => {
                          if (!isEditor) return;
                          // Save unidade to address field
                          if (localDevUnidade.trim() !== (card.address || '')) {
                            updateCard.mutate({ id: card.id, address: localDevUnidade.trim() || null });
                          }
                          updateDevTitle(undefined, undefined, localDevUnidade.trim(), undefined);
                        }}
                        placeholder="Ex: 502"
                        disabled={!isEditor}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Nome do Comprador</Label>
                      </div>
                      <Input
                        value={localDevComprador}
                        onChange={(e) => setLocalDevComprador(e.target.value)}
                        onBlur={() => {
                          if (!isEditor) return;
                          // Save comprador name to party record
                          if (devCompradorParty) {
                            updatePartyName.mutate({ partyId: devCompradorParty.id, name: localDevComprador.trim() });
                          }
                          updateDevTitle(undefined, undefined, undefined, localDevComprador.trim());
                        }}
                        placeholder="Nome do comprador"
                        disabled={!isEditor}
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-sm font-medium">Com ou sem financiamento</Label>
                      </div>
                      <Select
                        value={(card.card_type as string) || ''}
                        onValueChange={(v) => handleFieldUpdate('card_type', v || null)}
                        disabled={!isEditor}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="com_financiamento">Com financiamento</SelectItem>
                          <SelectItem value="sem_financiamento">Sem financiamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>
            ) : isAdministrativoBoard && (hasVendaImovelAlugadoLabel || hasPedidoImovelLocadorLabel) ? (
              // Administrativo Board with "Venda de imóvel alugado" or "Pedido de imóvel alugado pelo locador" label
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação do Contrato</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Superlógica ID */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">ID no Superlógica</Label>
                      </div>
                      <Input
                        value={localSuperlogicaId}
                        onChange={(e) => setLocalSuperlogicaId(e.target.value)}
                        onBlur={() => handleFieldBlur('superlogica_id', localSuperlogicaId, card.superlogica_id)}
                        placeholder="Número do contrato no ERP"
                        disabled={!isEditor}
                      />
                    </div>

                    {/* Nome do Locador - stored in proposal_responsible field */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Nome do Locador</Label>
                      </div>
                      <Input
                        value={localProposalResponsible}
                        onChange={(e) => setLocalProposalResponsible(e.target.value)}
                        onBlur={() => handleFieldBlur('proposal_responsible', localProposalResponsible, card.proposal_responsible)}
                        placeholder="Nome do proprietário do imóvel"
                        disabled={!isEditor}
                      />
                    </div>
                  </div>
                </div>
              </section>
            ) : isAdministrativoBoard ? (
              // Administrativo Board without special labels: No identification fields needed
              null
            ) : isCaptacaoBoard ? (
              // Captação Board: Only Robust Code + Building Name (Superlógica ID is a custom field)
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação do Imóvel</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 items-start">
                    {/* Robust Code */}
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2 mb-2 min-h-[40px]">
                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Label className="text-sm font-medium">
                          Cód no Robust <span className="text-destructive">*</span>
                        </Label>
                      </div>
                      <Input
                        value={localRobustCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalRobustCode(val);
                          // Auto-search: if exact match found, auto-fill
                          if (val.trim()) {
                            const match = allProperties.find(p => String(p.codigo_robust) === val.trim());
                            if (match) {
                              selectProperty(match);
                            }
                          }
                        }}
                        onBlur={() => {
                          handleFieldBlur('robust_code', localRobustCode, card.robust_code);
                          // Show warning if code typed but not found
                          if (localRobustCode.trim() && !allProperties.find(p => String(p.codigo_robust) === localRobustCode.trim())) {
                            // Property not found - warning shown via propertyUnavailable
                          }
                        }}
                        placeholder="Ex: 12345"
                        disabled={!isEditor}
                        className={!localRobustCode ? 'border-amber-400' : ''}
                      />
                      {!localRobustCode ? (
                        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                      ) : localRobustCode.trim() && allProperties.length > 0 && !allProperties.find(p => String(p.codigo_robust) === localRobustCode.trim()) ? (
                        <p className="text-xs text-destructive mt-1">Imóvel não localizado no CRM</p>
                      ) : localRobustCode.trim() && allProperties.find(p => String(p.codigo_robust) === localRobustCode.trim()) ? (
                        <p className="text-xs text-green-600 mt-1">✓ Imóvel encontrado</p>
                      ) : null}
                    </div>

                    {/* Building Name */}
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2 mb-2 min-h-[40px]">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Label className="text-sm font-medium">
                          Nome do prédio ou identificação <span className="text-destructive">*</span>
                        </Label>
                      </div>
                      <Input
                        value={localBuildingName}
                        onChange={(e) => setLocalBuildingName(e.target.value)}
                        onBlur={() => handleFieldBlur('building_name', localBuildingName, card.building_name)}
                        placeholder="Ex: Edifício Central"
                        disabled={!isEditor}
                        className={!localBuildingName ? 'border-amber-400' : ''}
                      />
                      {!localBuildingName && (
                        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : isManutencaoBoard ? (
              // Manutenção Board: Cód. do imóvel no Superlógica + Endereço
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação do Imóvel</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 items-start">
                    {/* Superlógica ID */}
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2 mb-2 min-h-[40px]">
                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Label className="text-sm font-medium">
                          Cód. do imóvel no Superlógica
                        </Label>
                      </div>
                      <Input
                        value={localSuperlogicaId}
                        onChange={(e) => setLocalSuperlogicaId(e.target.value)}
                        onBlur={() => handleFieldBlur('superlogica_id', localSuperlogicaId, card.superlogica_id)}
                        placeholder="Ex: 12345"
                        disabled={!isEditor}
                      />
                    </div>

                    {/* Endereço */}
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2 mb-2 min-h-[40px]">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Label className="text-sm font-medium">
                          Endereço do Imóvel
                        </Label>
                      </div>
                      <Input
                        value={localAddress}
                        onChange={(e) => setLocalAddress(e.target.value)}
                        onBlur={() => handleFieldBlur('address', localAddress, card.address)}
                        placeholder="Ex: Rua das Flores, 123"
                        disabled={!isEditor}
                      />
                    </div>
                  </div>

                  {/* Como acessar o imóvel */}
                  <div className="mt-4">
                    <div className="flex items-start gap-2 mb-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <Label className="text-sm font-medium">Como acessar o imóvel</Label>
                    </div>
                    <RadioGroup
                      value={accessType}
                      onValueChange={(v: string) => {
                        const newType = v as 'chave' | 'agendar';
                        setAccessType(newType);
                        const accessData = JSON.stringify({
                          access_type: newType,
                          contact_name: newType === 'agendar' ? accessContactName : '',
                          contact_phone: newType === 'agendar' ? accessContactPhone : '',
                        });
                        updateCard.mutate({ id: card.id, negotiation_details: accessData });
                      }}
                      className="flex gap-4 mb-2"
                      disabled={!isEditor}
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="chave" id="access-chave" />
                        <Label htmlFor="access-chave" className="text-xs font-normal cursor-pointer">Chave na imobiliária</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="agendar" id="access-agendar" />
                        <Label htmlFor="access-agendar" className="text-xs font-normal cursor-pointer">Agendar com inquilino</Label>
                      </div>
                    </RadioGroup>

                    {accessType === 'agendar' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome do contato"
                          value={accessContactName}
                          onChange={(e) => setAccessContactName(e.target.value)}
                          onBlur={() => {
                            const accessData = JSON.stringify({
                              access_type: accessType,
                              contact_name: accessContactName,
                              contact_phone: accessContactPhone,
                            });
                            if (accessData !== (card.negotiation_details || '')) {
                              updateCard.mutate({ id: card.id, negotiation_details: accessData });
                            }
                          }}
                          disabled={!isEditor}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Telefone do contato"
                          value={accessContactPhone}
                          onChange={(e) => setAccessContactPhone(e.target.value)}
                          onBlur={() => {
                            const accessData = JSON.stringify({
                              access_type: accessType,
                              contact_name: accessContactName,
                              contact_phone: accessContactPhone,
                            });
                            if (accessData !== (card.negotiation_details || '')) {
                              updateCard.mutate({ id: card.id, negotiation_details: accessData });
                            }
                          }}
                          disabled={!isEditor}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : (
              // Other Boards (Locação): Robust Code + Building Name + Superlógica ID
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação do Imóvel</h3>
                  </div>
                  {isEditor && (
                  <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPropertySearchOpen(!propertySearchOpen)}
                  className="text-xs h-7"
                  >
                  <Home className="h-3 w-3 mr-1" /> Buscar imóvel
                  </Button>
                  )}
                </header>
                <div className="p-4">
                  {propertyUnavailable && (
                    <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      Imóvel indisponível ou alterado no CRM
                    </div>
                  )}
                  {propertySearchOpen && (
                    <div className="mb-3 border rounded-md p-2 space-y-2">
                      <Input
                        value={propertySearchQuery}
                        onChange={(e) => setPropertySearchQuery(e.target.value)}
                        placeholder="Buscar por código, nome, bairro, endereço..."
                        className="h-8 text-xs"
                        autoFocus
                      />
                      <div className="max-h-[180px] overflow-y-auto divide-y">
                        {filteredProperties.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 text-xs"
                            onClick={() => selectProperty(p)}
                          >
                            <span className="font-medium">#{p.codigo_robust}</span>
                            <span className="truncate flex-1">{p.titulo || 'Sem título'}</span>
                            <span className="text-muted-foreground">{p.bairro}</span>
                          </div>
                        ))}
                        {filteredProperties.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum imóvel encontrado</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 items-start">
                    {/* Robust Code */}
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2 mb-2 min-h-[40px]">
                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Label className="text-sm font-medium">
                          Cód no Robust <span className="text-destructive">*</span>
                        </Label>
                      </div>
                      <Input
                        value={localRobustCode}
                        onChange={(e) => setLocalRobustCode(e.target.value)}
                        onBlur={() => handleFieldBlur('robust_code', localRobustCode, card.robust_code)}
                        placeholder="Ex: 12345"
                        disabled={!isEditor}
                        className={!localRobustCode ? 'border-amber-400' : ''}
                      />
                      {!localRobustCode && (
                        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                      )}
                    </div>

                    {/* Building Name */}
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2 mb-2 min-h-[40px]">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Label className="text-sm font-medium">
                          Nome do prédio ou identificação <span className="text-destructive">*</span>
                        </Label>
                      </div>
                      <Input
                        value={localBuildingName}
                        onChange={(e) => setLocalBuildingName(e.target.value)}
                        onBlur={() => handleFieldBlur('building_name', localBuildingName, card.building_name)}
                        placeholder="Ex: Edifício Central"
                        disabled={!isEditor}
                        className={!localBuildingName ? 'border-amber-400' : ''}
                      />
                      {!localBuildingName && (
                        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                      )}
                    </div>

                    {/* Superlógica ID */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">
                          ID no Superlógica
                        </Label>
                      </div>
                      <Input
                        value={localSuperlogicaId}
                        onChange={(e) => setLocalSuperlogicaId(e.target.value)}
                        onBlur={() => handleFieldBlur('superlogica_id', localSuperlogicaId, card.superlogica_id)}
                        placeholder="Número do contrato no ERP"
                        disabled={!isEditor}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Labels Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Etiquetas</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Render all labels in fixed order - only change appearance based on selection */}
                {labels.map((label) => {
                  const isSelected = cardLabels.some(cl => cl.id === label.id);
                  
                  return (
                    <Badge
                      key={label.id}
                      variant={isSelected ? "default" : "outline"}
                      style={isSelected ? { backgroundColor: label.color, color: '#fff' } : undefined}
                      className={cn(
                        "cursor-pointer transition-all",
                        !isSelected && "opacity-50 hover:opacity-100"
                      )}
                      onClick={() => {
                        if (!isEditor) return;
                        if (isSelected) {
                          removeLabelFromCard.mutate({ cardId: card.id, labelId: label.id });
                        } else {
                          addLabelToCard.mutate({ cardId: card.id, labelId: label.id });
                        }
                      }}
                    >
                      {!isSelected && <Plus className="h-3 w-3 mr-1" />}
                      {label.name}
                      {isSelected && isEditor && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
                {labels.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Nenhuma etiqueta configurada para este fluxo</p>
                )}
              </div>
            </div>

            {/* Custom Fields Section - Display for ALL boards with custom fields */}
            {card.board_id && (
              <CustomFieldsSection 
                boardId={card.board_id} 
                cardId={card.id}
                card={card}
                isEditor={isEditor}
                isMaintenanceBoard={isManutencaoBoard}
              />
            )}

            {/* === BLOCO: IMÓVEL (endereço) === */}
            {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isAdministrativoBoard && !isCaptacaoBoard && !isManutencaoBoard && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Imóvel</h3>
                </header>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Endereço</Label>
                  </div>
                  <Input
                    value={localAddress}
                    onChange={(e) => setLocalAddress(e.target.value)}
                    onBlur={() => handleFieldBlur('address', localAddress, card.address)}
                    placeholder="Endereço do imóvel"
                    disabled={!isEditor}
                  />
                </div>
              </section>
            )}

            {/* === BLOCO: RESUMO DA PROPOSTA (responsável + negociação) === */}
            {((!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard && !isManutencaoBoard && !(isAdministrativoBoard && (hasVendaImovelAlugadoLabel || hasPedidoImovelLocadorLabel))) ||
              (!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard && !isManutencaoBoard)) && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo da proposta</h3>
                </header>
                <div className="p-4 space-y-4">

                {/* Proposal Responsible */}
                {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard && !isManutencaoBoard && !(isAdministrativoBoard && (hasVendaImovelAlugadoLabel || hasPedidoImovelLocadorLabel)) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        {isAdministrativoBoard ? 'Responsável pelo imóvel' : 'Responsável pela proposta'} {!isAdministrativoBoard && <span className="text-destructive">*</span>}
                      </Label>
                    </div>
                    <Input
                      value={localProposalResponsible}
                      onChange={(e) => setLocalProposalResponsible(e.target.value)}
                      onBlur={() => handleFieldBlur('proposal_responsible', localProposalResponsible, card.proposal_responsible)}
                      placeholder={isAdministrativoBoard ? "Nome do responsável pelo imóvel" : "Nome do responsável"}
                      disabled={!isEditor}
                      className={!isAdministrativoBoard && !localProposalResponsible ? 'border-amber-400' : ''}
                    />
                    {!isAdministrativoBoard && !localProposalResponsible && (
                      <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                    )}
                  </div>
                )}

                {/* Negotiation Details */}
                {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard && !isManutencaoBoard && !hasStructuredNegotiation && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        {isAdministrativoBoard && (hasVendaImovelAlugadoLabel || hasPedidoImovelLocadorLabel)
                          ? 'Observações'
                          : 'Detalhes da negociação'} {!isAdministrativoBoard && <span className="text-destructive">*</span>}
                      </Label>
                    </div>
                    <Textarea
                      value={localNegotiationDetails}
                      onChange={(e) => setLocalNegotiationDetails(e.target.value)}
                      onBlur={() => handleFieldBlur('negotiation_details', localNegotiationDetails, card.negotiation_details)}
                      placeholder={
                        isAdministrativoBoard && (hasVendaImovelAlugadoLabel || hasPedidoImovelLocadorLabel)
                          ? ""
                          : isAdministrativoBoard
                            ? "Acordos, detalhes da locação, taxas da imobiliária e detalhes"
                            : "Ex: 1000,00 + taxas"
                      }
                      rows={8}
                      disabled={!isEditor}
                      className={cn(
                        'min-h-44 resize-y',
                        !isAdministrativoBoard && !localNegotiationDetails ? 'border-amber-400' : ''
                      )}
                    />
                    {!isAdministrativoBoard && !localNegotiationDetails && (
                      <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                    )}
                  </div>
                )}
                </div>
              </section>
            )}

            {/* === BLOCO: RESUMO DA NEGOCIAÇÃO (estruturado) === */}
            {hasStructuredNegotiation && (
              <ProposalNegotiationSummary proposalLinkId={card.proposal_link_id} />
            )}

            {/* === BLOCO: CONTRATO (data início, vencimento, retirada de chaves) === */}
            {card.proposal_link_id && (
              <ProposalContractSummary proposalLinkId={card.proposal_link_id} />
            )}

            {/* === BLOCO: SOLICITAÇÃO DE CORREÇÃO === */}
            {card.proposal_link_id && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Correção da proposta
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        Use o mesmo link público para pedir ao cliente que corrija blocos específicos.
                      </p>
                    </div>
                  </div>
                  {canRequestCorrection && !pendingCorrection && (
                    <Button size="sm" variant="outline" onClick={() => setCorrectionDialogOpen(true)} className="shrink-0">
                      <Wrench className="h-3.5 w-3.5 mr-2" />
                      Solicitar correção
                    </Button>
                  )}
                </header>
                <div className="p-4 space-y-3">
                {proposalPublicUrl && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyProposalLink}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copiar link da proposta
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleOpenProposalLink}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Abrir proposta
                    </Button>
                  </div>
                )}

                {pendingCorrection && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-orange-800 text-sm font-semibold">
                      <Wrench className="h-4 w-4" /> Correção pendente
                    </div>
                    {pendingCorrection.requested_sections?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pendingCorrection.requested_sections.map((s, idx) => {
                          if (typeof s === 'string') {
                            return (
                              <span
                                key={`s-${idx}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-orange-200 text-orange-800"
                              >
                                {(SECTION_LABELS as any)[s] || s}
                              </span>
                            );
                          }
                          return (
                            <span
                              key={`i-${idx}`}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-orange-200 text-orange-800"
                              title={s.note || undefined}
                            >
                              {describeCorrectionItem(s)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-sm text-orange-900 whitespace-pre-wrap">
                      {pendingCorrection.message}
                    </p>
                    <p className="text-[11px] text-orange-700">
                      Solicitado em {format(new Date(pendingCorrection.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}

                {!pendingCorrection && lastResponded && (
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sky-800 text-sm font-semibold">
                      <CheckCheck className="h-4 w-4" /> {correctionReceivedLabel || 'Correção recebida'}
                    </div>
                    <p className="text-xs text-sky-900">
                      Cliente respondeu em{' '}
                      {lastResponded.responded_at
                        ? format(new Date(lastResponded.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : '—'}
                    </p>
                    <p className="text-sm text-sky-900 whitespace-pre-wrap">
                      {lastResponded.message}
                    </p>
                  </div>
                )}
                </div>
              </section>
            )}

            {card.proposal_link_id && (
              <RequestCorrectionDialog
                open={correctionDialogOpen}
                onOpenChange={setCorrectionDialogOpen}
                proposalLinkId={card.proposal_link_id}
                cardId={card.id}
              />
            )}

            {/* === BLOCO: DOCUMENTOS DA PROPOSTA === */}
            {card.robust_code && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documentos da proposta</h3>
                </header>
                <div className="p-4">
                  <ProposalDocumentsSection cardId={card.id} guaranteeType={card.guarantee_type} />
                </div>
              </section>
            )}

            {/* === BLOCO: PESSOAS / PARTES DA PROPOSTA === */}
            {card.proposal_link_id && proposalParties.length > 0 && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pessoas envolvidas na proposta
                  </h3>
                </header>
                <div className="p-4">
                  <ProposalPartiesView parties={proposalParties} compact />
                </div>
              </section>
            )}

            {/* Motivo da transferência - Only for Administrativo board with "Imóvel que veio alugado" label */}
            {isAdministrativoBoard && hasImovelAlugadoLabel && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium"><Label className="text-sm font-medium">Motivo da transferência para a imobiliária</Label></Label>
                </div>
                <Textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => handleFieldBlur('description', localDescription, card.description)}
                  placeholder=""
                  rows={2}
                  disabled={!isEditor}
                />
              </div>
            )}

            {/* Venda de imóvel alugado - Only for Administrativo board with this label */}
            {isAdministrativoBoard && hasVendaImovelAlugadoLabel && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação do Contrato</h3>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* ID no Superlógica */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">ID no Superlógica</Label>
                      </div>
                      <Input
                        value={localSuperlogicaId}
                        onChange={(e) => setLocalSuperlogicaId(e.target.value)}
                        onBlur={() => handleFieldBlur('superlogica_id', localSuperlogicaId, card.superlogica_id)}
                        placeholder="Número do contrato no ERP"
                        disabled={!isEditor}
                      />
                    </div>

                    {/* Nome do Locador */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Nome do Locador</Label>
                      </div>
                      <Input
                        value={localProposalResponsible}
                        onChange={(e) => setLocalProposalResponsible(e.target.value)}
                        onBlur={() => handleFieldBlur('proposal_responsible', localProposalResponsible, card.proposal_responsible)}
                        placeholder="Nome do proprietário/locador"
                        disabled={!isEditor}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Description - Only for Locação boards (not Rescisão, Venda, DEV, Administrativo, Captação, or Manutenção) */}
            {/* Mostra apenas observações livres; linhas de resumo automático legado são filtradas. */}
            {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isAdministrativoBoard && !isCaptacaoBoard && !isManutencaoBoard &&
              !!visibleAdditionalDescription && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Descrição adicional</Label>
                </div>
                <Textarea
                  value={visibleAdditionalDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => handleFieldBlur('description', localDescription, card.description)}
                  placeholder="Outras informações relevantes..."
                  rows={2}
                  disabled={!isEditor}
                />
                {hasStructuredNegotiation && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use apenas para observações livres. Os valores e a negociação já aparecem no resumo acima.
                  </p>
                )}
              </div>
            )}

            {/* Manutenção: single "Detalhes do chamado" field using description */}
            {isManutencaoBoard && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Detalhes do chamado de manutenção</Label>
                </div>
                <Textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => handleFieldBlur('description', localDescription, card.description)}
                  placeholder="Descreva o problema, urgência e detalhes relevantes..."
                  rows={3}
                  disabled={!isEditor}
                />
              </div>
            )}

            {/* === BLOCO: GARANTIA E TIPO DE CONTRATO === */}
            {(showGuaranteeType || showContractType) && (
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {showGuaranteeType && showContractType ? 'Garantia e contrato' : showGuaranteeType ? 'Garantia' : 'Contrato'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {showGuaranteeType && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Tipo de Garantia</Label>
                      </div>
                      <Select
                        value={card.guarantee_type || ''}
                        onValueChange={(v) => handleFieldUpdate('guarantee_type', v)}
                        disabled={!isEditor}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(guaranteeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                    {showContractType && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Tipo de Contrato</Label>
                      </div>
                      <Select
                        value={card.contract_type || ''}
                        onValueChange={(v) => handleFieldUpdate('contract_type', v)}
                        disabled={!isEditor}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(contractLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                  </div>
                  {/* Observação livre da etapa de Garantia (preenchida pelo cliente) */}
                  {negotiationSummary?.observacaoGarantia && (
                    <div className="mt-4 rounded-md border bg-background p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Observação da garantia
                      </p>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {negotiationSummary.observacaoGarantia}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Card Parties Section - For boards with party management */}
            {card.board_id && (isVendaBoard || isLocacaoBoard || isCaptacaoBoard || isDevBoard) && (
              <CardPartiesSection 
                cardId={card.id} 
                cardType={card.card_type as CardType | undefined}
                boardId={card.board_id}
                canEdit={isEditor}
              />
            )}

            {/* Maintenance Providers Section */}
            {card.board_id && isManutencaoBoard && (
              <MaintenanceProvidersSection
                cardId={card.id}
                boardId={card.board_id}
                cardDescription={card.description}
                cardTitle={card.title}
                canEdit={isEditor}
                superlogicaId={card.superlogica_id}
                address={card.address}
                negotiationDetails={card.negotiation_details}
              />
            )}

            {/* Checklists */}
            <StageChecklistButton card={card} column={currentColumn} />
            <ChecklistSection 
              checklists={filteredChecklists} 
              cardId={card.id} 
              partyNames={vendaParties.map(p => ({
                checklistId: p.checklist_id || '',
                partyType: p.party_type,
                partyNumber: p.party_number,
                name: p.name,
              }))}
            />

            {/* Histórico de Andamentos */}
            <CardActivityHistory cardId={card.id} />

            {/* Actions Section */}
            {isEditor && !card.is_archived && (
              <div className="pt-4 border-t space-y-2">
                {/* Transfer button - only show for boards with owner_only_visibility */}
                {canTransferCard && ownerOnlyVisibility && (
                  <Button
                    variant="outline"
                    onClick={() => setTransferDialogOpen(true)}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Transferir Card
                  </Button>
                )}

                {/* Context Menu for special actions */}
                {isRescisaoBoard && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MoreVertical className="h-4 w-4 mr-2" />
                        Mais ações
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem 
                        onClick={() => setCloneDialogOpen(true)}
                        className="cursor-pointer"
                      >
                        <ArrowRightCircle className="h-4 w-4 mr-2" />
                        Enviar para Captação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setArchiveDialogOpen(true)}
                  className="w-full"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar Card
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Card
                  </Button>
                )}
              </div>
            )}

            {/* Delete only for admin on archived cards */}
            {isAdmin && card.is_archived && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Card Permanentemente
                </Button>
              </div>
            )}
            {/* Mobile: Comments section inline at the bottom */}
            <div className="md:hidden mt-6 border-t pt-4 pb-8 min-h-[400px]">
              <CardNotesSidebar 
                cardId={card.id} 
                showDetails={true}
              />
            </div>
          </div>
        </div>

        {/* Desktop: Notes/Comments Sidebar - side by side */}
        <div
          className="hidden md:flex md:w-[45%] border-l border-border flex-shrink-0 flex-col bg-card"
        >
          <CardNotesSidebar 
            cardId={card.id} 
            showDetails={true}
          />
        </div>
        </div>
      </DialogContent>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Card</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo do arquivamento. O card poderá ser restaurado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Motivo do arquivamento..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiveReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={!archiveReason.trim() || archiveCard.isPending}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation with double confirmation */}
      <DoubleConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir card permanentemente?"
        description={`O card #${card.card_number} - "${card.title}" será excluído permanentemente. Esta ação não pode ser desfeita.`}
        confirmText="EXCLUIR"
        onConfirm={handleDeleteConfirm}
      />

      {/* Clone to Captação Dialog - Only for Rescisão board */}
      {isRescisaoBoard && (
        <CloneToCaptacaoDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          cardTitle={card.title}
          onConfirm={handleCloneToCaptacao}
          isPending={cloneToCaptacao.isPending}
        />
      )}

      {/* Transfer Card Dialog */}
      <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transferir Card</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o usuário que irá assumir este card. Após a transferência, apenas ele poderá visualizá-lo (exceto administradores).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium mb-2 block">Novo responsável</Label>
            <Select
              value={selectedTransferUser}
              onValueChange={setSelectedTransferUser}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {profiles
                  .filter(p => p.user_id !== card.created_by)
                  .map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTransferUser('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTransferUser) {
                  transferCard.mutate({ cardId: card.id, newOwnerId: selectedTransferUser });
                  setTransferDialogOpen(false);
                  setSelectedTransferUser('');
                }
              }}
              disabled={!selectedTransferUser || transferCard.isPending}
            >
              Transferir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
