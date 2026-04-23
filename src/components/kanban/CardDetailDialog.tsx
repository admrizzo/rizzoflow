import { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { CardWithRelations, GuaranteeType, ContractType, CardType } from '@/types/database';
import { useCards } from '@/hooks/useCards';
import { useLabels } from '@/hooks/useLabels';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
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
  Ban,
  Eye,
  MoreVertical,
  ArrowRightCircle,
  Loader2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ChecklistSection } from './ChecklistSection';
import { CardNotesSidebar } from './CardNotesSidebar';
import { CustomFieldsSection } from './CustomFieldsSection';
import { CardPartiesSection } from './CardPartiesSection';
import { MaintenanceProvidersSection } from './MaintenanceProvidersSection';
import { CardTypeBadge } from './CardTypeBadge';
import { CloneToCaptacaoDialog } from './CloneToCaptacaoDialog';
import { useCardParties } from '@/hooks/useCardParties';
import { useCloneToFlow } from '@/hooks/useCloneToFlow';
import { format } from 'date-fns';
import { isDateOverdue } from '@/lib/dateUtils';
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

interface NavigationInfo {
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  total: number;
}

interface CardDetailDialogProps {
  card: CardWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  navigationInfo?: NavigationInfo;
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

export function CardDetailDialog({ card, open, onOpenChange, onNavigatePrevious, onNavigateNext, navigationInfo }: CardDetailDialogProps) {
  const { updateCard, deleteCard, archiveCard, setDeadlineMet, setDeadlineDispensed, notifyDeadlineOverdue, transferCard, ownerOnlyVisibility } = useCards(card?.board_id);
  const { labels, addLabelToCard, removeLabelFromCard } = useLabels(card?.board_id);
  const { profiles, addMemberToCard, removeMemberFromCard } = useProfiles();
  const { isEditor, isAdmin, user } = useAuth();
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
  const [hasNotifiedOverdue, setHasNotifiedOverdue] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransferUser, setSelectedTransferUser] = useState<string>('');

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

  // Check if deadline is overdue - moved before early return
  const isDeadlineOverdue = card?.document_deadline && !card?.deadline_met && isDateOverdue(new Date(card.document_deadline));
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

  // Send notification when deadline is overdue (only once) - MUST be before early return
  useEffect(() => {
    // Only run if all required values are present
    if (!card?.id || !card?.created_by || !open) return;
    if (!isDeadlineOverdue || hasNotifiedOverdue) return;
    
    notifyDeadlineOverdue.mutate({
      cardId: card.id,
      userId: card.created_by,
      cardTitle: card.title || card.building_name || 'Card'
    });
    setHasNotifiedOverdue(true);
  }, [isDeadlineOverdue, hasNotifiedOverdue, card?.id, card?.created_by, open]);

  // Reset notification state when dialog closes or card changes
  useEffect(() => {
    if (!open) {
      setHasNotifiedOverdue(false);
    }
  }, [open, card?.id]);

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

  // Keyboard navigation between cards
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.key === 'ArrowLeft' && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onNavigatePrevious, onNavigateNext]);

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
  const handleDeadlineUpdate = (newDeadline: string | null) => {
    updateCard.mutate({ 
      id: card.id, 
      document_deadline: newDeadline,
      deadline_edited_at: new Date().toISOString(),
      deadline_edited_by: user?.id || null
    });
  };

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
        className="max-w-6xl h-[100dvh] md:h-[90vh] md:max-h-[90vh] flex flex-col p-0 overflow-hidden"
        hideCloseButton
        onEscapeKeyDown={(e) => {
          // Nested dialogs (confirm/archive/transfer/clone) must close first.
          if (archiveDialogOpen || deleteConfirmOpen || cloneDialogOpen || transferDialogOpen) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (archiveDialogOpen || deleteConfirmOpen || cloneDialogOpen || transferDialogOpen) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (archiveDialogOpen || deleteConfirmOpen || cloneDialogOpen || transferDialogOpen) {
            e.preventDefault();
          }
        }}
      >
        {/* Navigation arrows - fixed on sides */}
        {(onNavigatePrevious || onNavigateNext) && (
          <>
            {/* Previous button - left side */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigatePrevious}
              disabled={!onNavigatePrevious}
              className={cn(
                "fixed left-2 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border",
                "hover:bg-background hover:scale-110 transition-all",
                "hidden md:flex",
                !onNavigatePrevious && "opacity-30 cursor-not-allowed"
              )}
              title="Card anterior (←)"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            {/* Next button - right side */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateNext}
              disabled={!onNavigateNext}
              className={cn(
                "fixed right-2 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border",
                "hover:bg-background hover:scale-110 transition-all",
                "hidden md:flex",
                !onNavigateNext && "opacity-30 cursor-not-allowed"
              )}
              title="Próximo card (→)"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Mobile header with back button */}
        <DialogHeader className="flex-shrink-0 p-4 md:p-6 pb-2 md:pb-0 relative">
          <DialogDescription className="sr-only">
            Detalhes do card {card.title}
          </DialogDescription>
          {/* Desktop close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={requestClose}
            className="absolute right-4 top-4 z-10 h-8 w-8 rounded-full hover:bg-muted hidden md:flex"
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
              className="h-8 px-2 text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            
            {/* Mobile navigation */}
            {(onNavigatePrevious || onNavigateNext) && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNavigatePrevious}
                  disabled={!onNavigatePrevious}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {navigationInfo && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {navigationInfo.currentIndex}/{navigationInfo.total}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNavigateNext}
                  disabled={!onNavigateNext}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono mt-1">
                #{card.card_number}
              </span>
              {/* Desktop navigation counter */}
              {navigationInfo && (
                <span className="hidden md:inline text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1">
                  {navigationInfo.currentIndex} de {navigationInfo.total}
                </span>
              )}
            </div>
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                autoFocus
                className="text-lg font-semibold"
              />
            ) : (
              <DialogTitle
                className="cursor-pointer hover:text-primary text-base md:text-lg break-words"
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
          {/* Card creation info - hidden on mobile for space */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <UserCircle className="h-3 w-3" />
            <span>
              Criado por{' '}
              <span className="font-medium">
                {card.created_by_profile?.full_name || 'Usuário desconhecido'}
              </span>
            </span>
            <CalendarIcon className="h-3 w-3 ml-2" />
            <span>
              {format(new Date(card.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </DialogHeader>

        {/* Desktop: Two-column layout. Mobile: Single scroll with everything */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Main content - uses native overflow for reliable mobile touch scrolling */}
          <div className={cn(
            "flex-1 px-4 md:px-6 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch",
            "md:w-[55%]"
          )}>
          <div className="space-y-6 pb-6">
            {/* Archived Banner */}
            {card.is_archived && (
              <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <Archive className="h-5 w-5" />
                  <span className="font-medium">Este card está arquivado</span>
                </div>
                {card.archived_by_profile && card.archived_at && (
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Arquivado por {card.archived_by_profile.full_name} em{' '}
                    {format(new Date(card.archived_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {card.archive_reason && (
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
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
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                </div>
              </div>
            )}

            {hasReviewDeadline && !card.is_archived && (
              <div className={cn(
                "p-4 rounded-lg border",
                reviewOverdue ? "bg-orange-100 border-orange-400" : "bg-blue-50 border-blue-200"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Prazo de Revisão da Coluna</h3>
                  </div>
                  {reviewOverdue ? (
                    <Badge variant="destructive" className="bg-orange-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Revisão Necessária
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Em Dia
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Esta coluna requer revisão a cada <strong>{currentColumn?.review_deadline_days}</strong>{' '}
                    {currentColumn?.review_deadline_days === 1 ? 'dia' : 'dias'}.
                  </p>
                  
                  {timeUntilReview && (
                    <p className={cn(
                      "text-sm",
                      reviewOverdue ? "text-orange-700 font-medium" : "text-muted-foreground"
                    )}>
                      {timeUntilReview}
                    </p>
                  )}

                  {card.last_reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      Última revisão em{' '}
                      {format(new Date(card.last_reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {card.last_reviewed_by_profile && ` por ${card.last_reviewed_by_profile.full_name}`}
                    </p>
                  )}

                  {isEditor && (
                    <Button
                      variant={reviewOverdue ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "mt-2",
                        reviewOverdue && "bg-orange-600 hover:bg-orange-700"
                      )}
                      onClick={() => markAsReviewed.mutate(card.id)}
                      disabled={markAsReviewed.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como Checado
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Document Deadline Section - Only show for non-Rescisão, non-Venda, and non-DEV boards */}
            {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isManutencaoBoard && (
              <div className={cn(
                "p-4 rounded-lg border",
                card.deadline_dispensed ? "bg-muted/50 border-muted" :
                isDeadlineOverdue ? "bg-amber-100 border-amber-400" : 
                card.deadline_met ? "bg-green-50 border-green-300" : 
                "bg-blue-50 border-blue-200"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Prazo para Documentos</h3>
                  </div>
                  {card.deadline_dispensed && (
                    <Badge variant="secondary" className="bg-muted">
                      <Ban className="h-3 w-3 mr-1" />
                      Dispensado
                    </Badge>
                  )}
                  {!card.deadline_dispensed && isDeadlineOverdue && (
                    <Badge variant="destructive" className="bg-amber-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Prazo Vencido
                    </Badge>
                  )}
                  {!card.deadline_dispensed && card.deadline_met && (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Prazo Cumprido
                    </Badge>
                  )}
                </div>

                {/* Dispensed state */}
                {card.deadline_dispensed ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Este card não requer prazo para documentos.
                    </p>
                    {card.deadline_dispensed_at && (
                      <p className="text-xs text-muted-foreground">
                        Dispensado em{' '}
                        {format(new Date(card.deadline_dispensed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {card.deadline_dispensed_by_profile && ` por ${card.deadline_dispensed_by_profile.full_name}`}
                      </p>
                    )}
                    {isEditor && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeadlineDispensed.mutate({ cardId: card.id, isDispensed: false })}
                        disabled={setDeadlineDispensed.isPending}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Definir prazo
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Date Picker with Input */}
                      <div className="flex-1 min-w-[200px]">
                        <DatePickerInput
                          value={card.document_deadline ? new Date(card.document_deadline) : undefined}
                          onChange={(date) => {
                            if (date) {
                              handleDeadlineUpdate(date.toISOString());
                            }
                          }}
                          disabled={!isEditor || card.deadline_met}
                          placeholder="dd/mm/aaaa"
                        />
                      </div>

                      {/* Dispense deadline button - shows when no deadline set */}
                      {!card.document_deadline && isEditor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeadlineDispensed.mutate({ cardId: card.id, isDispensed: true })}
                          disabled={setDeadlineDispensed.isPending}
                          className="text-muted-foreground"
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Dispensar prazo
                        </Button>
                      )}

                      {/* Clear deadline button - shows when deadline is set */}
                      {card.document_deadline && isEditor && !card.deadline_met && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeadlineUpdate(null)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      )}

                      {/* Deadline Met Button */}
                      {card.document_deadline && isEditor && !card.deadline_met && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setDeadlineMet.mutate({ cardId: card.id, isMet: true })}
                          disabled={setDeadlineMet.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Prazo Cumprido
                        </Button>
                      )}

                      {/* Reopen Deadline Button */}
                      {card.deadline_met && isEditor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeadlineMet.mutate({ cardId: card.id, isMet: false })}
                          disabled={setDeadlineMet.isPending}
                        >
                          Reabrir Prazo
                        </Button>
                      )}
                    </div>

                    {/* Deadline Met Info */}
                    {card.deadline_met && card.deadline_met_at && (
                      <p className="text-xs text-green-700 mt-2">
                        Marcado como cumprido em{' '}
                        {format(new Date(card.deadline_met_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {card.deadline_met_by_profile && ` por ${card.deadline_met_by_profile.full_name}`}
                      </p>
                    )}

                    {/* Deadline Edited Info */}
                    {card.deadline_edited_at && !card.deadline_met && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Prazo editado em{' '}
                        {format(new Date(card.deadline_edited_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {card.deadline_edited_by_profile && ` por ${card.deadline_edited_by_profile.full_name}`}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Card Identification Fields - Different for each board type */}
            {isRescisaoBoard ? (
              // Rescisão Board: Nome do Inquilino (title) + ID Superlógica (required)
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação do Contrato</h3>
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
            ) : isVendaBoard ? (
              // Venda Board: Opening data
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação</h3>
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
            ) : isDevBoard ? (
              // DEV Board: Cód Robust + Empreendimento + Unidade + Comprador
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação</h3>
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
            ) : isAdministrativoBoard && (hasVendaImovelAlugadoLabel || hasPedidoImovelLocadorLabel) ? (
              // Administrativo Board with "Venda de imóvel alugado" or "Pedido de imóvel alugado pelo locador" label
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação do Contrato</h3>
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
            ) : isAdministrativoBoard ? (
              // Administrativo Board without special labels: No identification fields needed
              null
            ) : isCaptacaoBoard ? (
              // Captação Board: Only Robust Code + Building Name (Superlógica ID is a custom field)
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação do Imóvel</h3>
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
                </div>
              </div>
            ) : isManutencaoBoard ? (
              // Manutenção Board: Cód. do imóvel no Superlógica + Endereço
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação do Imóvel</h3>
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
            ) : (
              // Other Boards (Locação): Robust Code + Building Name + Superlógica ID
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação do Imóvel</h3>
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

            {/* Address - Only for Locação boards (not Rescisão, Venda, DEV, Administrativo, or Captação - which uses custom fields) */}
            {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isAdministrativoBoard && !isCaptacaoBoard && !isManutencaoBoard && (
              <div>
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
            )}

            {/* Proposal Responsible - Different label for Administrativo board, hidden for special templates and Captação (uses custom fields) */}
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

            {/* Negotiation Details - Different label/placeholder for special Administrativo templates, hidden for Captação (uses custom fields) */}
            {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isCaptacaoBoard && !isManutencaoBoard && (
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
                  rows={2}
                  disabled={!isEditor}
                  className={!isAdministrativoBoard && !localNegotiationDetails ? 'border-amber-400' : ''}
                />
                {!isAdministrativoBoard && !localNegotiationDetails && (
                  <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
                )}
              </div>
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
              <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação do Contrato</h3>
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
            )}

            {/* Description - Only for Locação boards (not Rescisão, Venda, DEV, Administrativo, Captação, or Manutenção) */}
            {!isRescisaoBoard && !isVendaBoard && !isDevBoard && !isAdministrativoBoard && !isCaptacaoBoard && !isManutencaoBoard && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Descrição adicional</Label>
                </div>
                <Textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => handleFieldBlur('description', localDescription, card.description)}
                  placeholder="Outras informações relevantes..."
                  rows={2}
                  disabled={!isEditor}
                />
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

            {/* Guarantee and Contract Type - Uses board config for visibility */}
            {(showGuaranteeType || showContractType) && (
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
        <div className="hidden md:flex md:w-[45%] border-l flex-shrink-0 flex-col">
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
