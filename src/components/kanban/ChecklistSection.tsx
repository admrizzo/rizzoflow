import { useState, useRef, useEffect } from 'react';
import { ChecklistWithItems, ChecklistItem, Profile } from '@/types/database';
import { useChecklists } from '@/hooks/useChecklists';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
 import {
   CheckSquare,
   Trash2,
   ChevronDown,
   ChevronRight,
   EyeOff,
   Eye,
   Ban,
   UserCheck,
   Pencil,
   CalendarIcon,
   FileCheck,
   DollarSign,
   User,
   Building,
   AlertCircle,
   HelpCircle,
   ClipboardCheck,
   FileText,
   Info,
   CheckCheck,
 } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import { ChecklistObservationInput } from './ChecklistObservationInput';

interface ChecklistItemExtended extends ChecklistItem {
  is_dismissed?: boolean;
  dismissed_reason?: string | null;
  completed_by_profile?: Profile | null;
  dismissed_by_profile?: Profile | null;
}

interface ChecklistWithItemsExtended extends Omit<ChecklistWithItems, 'items'> {
  items: ChecklistItemExtended[];
}

interface PartyNameInfo {
  checklistId: string;
  partyType: string;
  partyNumber: number;
  name: string | null;
}

interface ChecklistSectionProps {
  checklists: ChecklistWithItemsExtended[];
  cardId: string;
  partyNames?: PartyNameInfo[];
}

// Helper function to format checklist names (convert from UPPERCASE to Title Case)
const formatChecklistName = (name: string): string => {
  if (!name) return name;
  
  // Common patterns to format properly
  const patterns: Record<string, string> = {
    'COMPRADOR': 'Comprador',
    'VENDEDOR': 'Vendedor',
    'LOCATÁRIO': 'Locatário',
    'LOCATARIO': 'Locatário',
    'FIADOR': 'Fiador',
    'PROPRIETÁRIO': 'Proprietário',
    'PROPRIETARIO': 'Proprietário',
    'PROCURADOR': 'Procurador',
    'COMERCIAL': 'Comercial',
    'JURÍDICO': 'Jurídico',
    'JURIDICO': 'Jurídico',
    'ADM': 'Adm',
    'ANEXOS': 'Anexos',
    'IMÓVEL': 'Imóvel',
    'IMOVEL': 'Imóvel',
  };
  
  let result = name;
  
  // Replace known uppercase words with proper case
  for (const [upper, proper] of Object.entries(patterns)) {
    const regex = new RegExp(upper, 'gi');
    result = result.replace(regex, proper);
  }
  
  // If still all uppercase, convert to title case
  if (result === result.toUpperCase() && result.length > 2) {
    result = result
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return result;
};

// Helper function to check if item is "Comprovante de residência"
const isResidenceProof = (content: string) => {
  return /comprovante de resid[eê]ncia/i.test(content);
};

// Helper function to check if item is "Saldo devedor"
const isDebtBalance = (content: string) => {
  return /saldo devedor/i.test(content);
};

// Helper function to check if item is "Certidão de estado civil"
const isCivilStatusCertificate = (content: string) => {
  return /certid[aã]o de estado civil/i.test(content);
};

// Helper function to check if item is a certificate (contains "certidão" or "CNDT")
const isCertificateItem = (content: string) => {
  return /certid[aã]o|cndt/i.test(content);
};

// Helper function to check if item is "Condomínio - administradora"
const isCondominiumAdmin = (content: string) => {
  return /condom[íi]nio.*administradora/i.test(content);
};

// Helper function to check if item is any "Pesquisa Cadastral" (includes Caixa Aqui and others)
const isPesquisaCadastral = (content: string) => {
  return /pesquisa cadastral/i.test(content);
};

// Helper function to get color classes based on status text semantics
const getStatusColor = (status: string): string => {
  const lowerStatus = status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Positive/Success patterns - Green
  if (/aprovad[ao]|ok|conferid[ao]|verificad[ao].*sem|negativa|concluido|finalizado|liberado|sucesso|pronto|entregue|pago|quitado|regularizado|em\s*dia|atualizado|completo|feito|realizado|cumprido/i.test(lowerStatus)) {
    return 'bg-green-100 text-green-700';
  }
  
  // Negative/Error patterns - Red
  if (/reprovad[ao]|erro|falha|recusad[ao]|negad[ao]|vencid[ao]|cancelad[ao]|pendente|atrasad[ao]|bloqueado|irregular|inadimplente|divida|problema|faltan/i.test(lowerStatus)) {
    return 'bg-red-100 text-red-700';
  }
  
  // Warning/Attention patterns - Amber
  if (/positiva|verificad[ao].*com|alterac[ao]|necessid|atencao|revisar|analisar|aguardando|em\s*analise/i.test(lowerStatus)) {
    return 'bg-amber-100 text-amber-700';
  }
  
  // Information/Neutral patterns - Blue
  if (/info|observ|nota|novo|contrato/i.test(lowerStatus)) {
    return 'bg-blue-100 text-blue-700';
  }
  
  // Default - Gray
  return 'bg-gray-100 text-gray-700';
};

 export function ChecklistSection({ checklists, cardId, partyNames = [] }: ChecklistSectionProps) {
   const allItems = checklists.flatMap(c => c.items || []);
   const activeItemsGlobal = allItems.filter(i => !i.is_dismissed);
   
   // Natureza operacional: obrigatorio, condicional, conferencia, evidencia, informativo
    // Filtrar pendências apenas da etapa atual ou globais (is_ready_to_advance context)
    const currentColumnId = checklists[0]?.column_id || null; // Simplified, ideally passed as prop
    
    const stageBlockingPending = activeItemsGlobal.filter(i => {
      const isBlockingNature = (i.operational_nature === 'obrigatorio' || !i.operational_nature);
      if (!isBlockingNature || i.is_completed) return false;
      
      const parentChecklist = checklists.find(cl => cl.id === i.checklist_id);
      const isGlobal = i.is_global_blocker || parentChecklist?.is_global_blocker;
      const isCurrentStage = (i.column_id === currentColumnId) || (parentChecklist?.column_id === currentColumnId);
      
      return isGlobal || isCurrentStage;
    });

    const isReadyToAdvance = stageBlockingPending.length === 0 && activeItemsGlobal.length > 0;
 
  const { 
    deleteChecklist, 
    updateChecklistItem,
    toggleChecklistItem, 
    deleteChecklistItem,
    dismissChecklistItem,
    dismissChecklist,
    updateItemIssueDate,
    updateCertificateStatus,
    updateCreditorInfo,
    updateCivilStatus,
    updateAdministratorName,
    updateObservationText,
    updateCustomStatus,
  } = useChecklists();
  const { isEditor, isAdmin, user } = useAuth();

  const [hideCompleted, setHideCompleted] = useState<Record<string, boolean>>({});
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>(() => {
    // Start all checklists open
    const initial: Record<string, boolean> = {};
    checklists.forEach(c => {
      initial[c.id] = true;
    });
    return initial;
  });
  
  // Track dismissed checklists locally for immediate UI feedback
  const [dismissedChecklists, setDismissedChecklists] = useState<Record<string, boolean>>({});
  
  // Local state for immediate checkbox feedback - use ref to track pending updates
  const [localCompletedState, setLocalCompletedState] = useState<Record<string, boolean>>({});
  const pendingUpdates = useRef<Set<string>>(new Set());
  
  // Get the effective completed state (local override or server state)
  const getIsCompleted = (item: ChecklistItemExtended) => {
    if (localCompletedState.hasOwnProperty(item.id)) {
      return localCompletedState[item.id];
    }
    return item.is_completed;
  };
  
  // Check if a checklist is fully dismissed (all items dismissed)
  const isChecklistDismissed = (checklist: ChecklistWithItemsExtended) => {
    if (dismissedChecklists[checklist.id]) return true;
    const items = checklist.items || [];
    if (items.length === 0) return false;
    return items.every(item => item.is_dismissed);
  };
  
  // Clear local overrides when server state catches up
  useEffect(() => {
    if (Object.keys(localCompletedState).length === 0) return;
    
    const allItems = checklists.flatMap(c => c.items || []);
    const toRemove: string[] = [];
    
    for (const itemId of Object.keys(localCompletedState)) {
      const serverItem = allItems.find(item => item.id === itemId);
      if (serverItem && serverItem.is_completed === localCompletedState[itemId]) {
        toRemove.push(itemId);
      }
    }
    
    if (toRemove.length > 0) {
      setLocalCompletedState(prev => {
        const updated = { ...prev };
        toRemove.forEach(id => delete updated[id]);
        return updated;
      });
    }
  }, [checklists]);

  // Sync dismissed checklists state with server data
  useEffect(() => {
    const newDismissedState: Record<string, boolean> = {};
    checklists.forEach(c => {
      const items = c.items || [];
      if (items.length > 0 && items.every(item => item.is_dismissed)) {
        newDismissedState[c.id] = true;
      }
    });
    setDismissedChecklists(newDismissedState);
  }, [checklists]);
  
  // Handle checkbox toggle with immediate local update
  const handleToggle = (itemId: string, currentState: boolean) => {
    if (!isEditor || pendingUpdates.current.has(itemId)) return;
    
    const newState = !currentState;
    pendingUpdates.current.add(itemId);
    
    setLocalCompletedState(prev => ({
      ...prev,
      [itemId]: newState
    }));
    
    toggleChecklistItem.mutate({ itemId, isCompleted: newState }, {
      onSettled: () => {
        pendingUpdates.current.delete(itemId);
      }
    });
  };
  
  // Dismiss dialog state for items
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [dismissingItem, setDismissingItem] = useState<ChecklistItemExtended | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  
  // Dismiss dialog state for full checklists
  const [dismissChecklistDialogOpen, setDismissChecklistDialogOpen] = useState(false);
  const [dismissingChecklist, setDissmissingChecklist] = useState<ChecklistWithItemsExtended | null>(null);
  const [dismissChecklistReason, setDismissChecklistReason] = useState('');
  
  // Edit state - ONLY for admins
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when editing starts
  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  const handleDismissClick = (item: ChecklistItemExtended) => {
    setDismissingItem(item);
    setDismissReason(item.dismissed_reason || '');
    setDismissDialogOpen(true);
  };

  const handleDismissConfirm = () => {
    if (!dismissingItem || !dismissReason.trim()) return;
    dismissChecklistItem.mutate(
      { 
        itemId: dismissingItem.id, 
        isDismissed: true, 
        reason: dismissReason.trim() 
      },
      {
        onSuccess: () => {
          setDismissDialogOpen(false);
          setDismissingItem(null);
          setDismissReason('');
        },
      }
    );
  };

  const handleUndismiss = (item: ChecklistItemExtended) => {
    dismissChecklistItem.mutate({ 
      itemId: item.id, 
      isDismissed: false, 
      reason: null 
    });
  };

  // Only admins can edit items
  const handleEditClick = (item: ChecklistItemExtended) => {
    if (!isAdmin) return;
    setEditingItemId(item.id);
    setEditingContent(item.content);
  };

  const handleEditSave = () => {
    if (!editingItemId || !editingContent.trim()) return;
    updateChecklistItem.mutate(
      { itemId: editingItemId, content: editingContent.trim() },
      {
        onSuccess: () => {
          setEditingItemId(null);
          setEditingContent('');
        },
      }
    );
  };

  const handleEditCancel = () => {
    setEditingItemId(null);
    setEditingContent('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const toggleChecklist = (checklistId: string) => {
    setOpenChecklists(prev => ({
      ...prev,
      [checklistId]: !prev[checklistId]
    }));
  };

  const toggleHideCompleted = (checklistId: string) => {
    setHideCompleted(prev => ({
      ...prev,
      [checklistId]: !prev[checklistId]
    }));
  };

  // Handle issue date change
  const handleIssueDateChange = (itemId: string, date: Date | undefined) => {
    if (date) {
      // Normalize to local date string to avoid timezone shift
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      updateItemIssueDate.mutate({ itemId, issueDate: `${yyyy}-${mm}-${dd}` });
    } else {
      updateItemIssueDate.mutate({ itemId, issueDate: null });
    }
  };

  // Handle certificate status change
  const handleCertificateStatusChange = (itemId: string, status: 'positive' | 'negative') => {
    updateCertificateStatus.mutate({ itemId, status });
  };

  // Handle dismiss entire checklist
  const handleDismissChecklistClick = (checklist: ChecklistWithItemsExtended) => {
    setDissmissingChecklist(checklist);
    setDismissChecklistReason('');
    setDismissChecklistDialogOpen(true);
  };

  const handleDismissChecklistConfirm = () => {
    if (!dismissingChecklist || !dismissChecklistReason.trim()) return;
    
    // Mark locally for immediate UI feedback
    setDismissedChecklists(prev => ({
      ...prev,
      [dismissingChecklist.id]: true
    }));
    
    dismissChecklist.mutate(
      { 
        checklistId: dismissingChecklist.id, 
        isDismissed: true, 
        reason: dismissChecklistReason.trim() 
      },
      {
        onSuccess: () => {
          setDismissChecklistDialogOpen(false);
          setDissmissingChecklist(null);
          setDismissChecklistReason('');
        },
        onError: () => {
          // Revert local state on error
          setDismissedChecklists(prev => {
            const updated = { ...prev };
            delete updated[dismissingChecklist.id];
            return updated;
          });
        }
      }
    );
  };

  const handleUndismissChecklist = (checklist: ChecklistWithItemsExtended) => {
    // Mark locally for immediate UI feedback
    setDismissedChecklists(prev => {
      const updated = { ...prev };
      delete updated[checklist.id];
      return updated;
    });
    
    dismissChecklist.mutate(
      { 
        checklistId: checklist.id, 
        isDismissed: false, 
        reason: null 
      },
      {
        onError: () => {
          // Revert local state on error
          setDismissedChecklists(prev => ({
            ...prev,
            [checklist.id]: true
          }));
        }
      }
    );
  };

  // Separate active and dismissed checklists
  const activeChecklists = checklists.filter(c => !isChecklistDismissed(c));
  const dismissedChecklistsList = checklists.filter(c => isChecklistDismissed(c));

   const getNatureBadge = (nature: string) => {
     switch (nature) {
       case 'obrigatorio':
         return <Badge variant="outline" className="text-[10px] py-0 h-4 bg-red-50 text-red-700 border-red-200">Obrigatório</Badge>;
       case 'condicional':
         return <Badge variant="outline" className="text-[10px] py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">Condicional</Badge>;
       case 'conferencia':
         return <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">Conferência</Badge>;
       case 'evidencia':
         return <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Evidência</Badge>;
       case 'informativo':
         return <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50 text-slate-700 border-slate-200">Informativo</Badge>;
       default:
         return <Badge variant="outline" className="text-[10px] py-0 h-4 bg-red-50 text-red-700 border-red-200">Obrigatório</Badge>;
     }
   };

   const getNatureIcon = (nature: string) => {
     switch (nature) {
       case 'obrigatorio': return <AlertCircle className="h-3 w-3 text-red-500" />;
       case 'condicional': return <HelpCircle className="h-3 w-3 text-amber-500" />;
       case 'conferencia': return <ClipboardCheck className="h-3 w-3 text-blue-500" />;
       case 'evidencia': return <FileText className="h-3 w-3 text-emerald-500" />;
       case 'informativo': return <Info className="h-3 w-3 text-slate-500" />;
       default: return <AlertCircle className="h-3 w-3 text-red-500" />;
     }
   };

   const renderChecklist = (checklist: ChecklistWithItemsExtended, isDismissedChecklist: boolean) => {
     const items = checklist.items || [];
     const activeItems = items.filter(i => !i.is_dismissed);
     const completedCount = activeItems.filter((i) => i.is_completed).length;
     const totalActive = activeItems.length;
     const progress = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;
     const isOpen = openChecklists[checklist.id] !== false;
     const shouldHideCompleted = hideCompleted[checklist.id] || false;

     let partyInfo = partyNames.find(p => p.checklistId === checklist.id);
     
     if (!partyInfo && checklist.name) {
       const checklistNameUpper = checklist.name.toUpperCase();
       if (checklistNameUpper.includes('COMPRADOR')) {
         partyInfo = partyNames.find(p => p.partyType === 'comprador' && p.partyNumber === 1);
       } else if (checklistNameUpper.includes('VENDEDOR') && !checklistNameUpper.includes('ANTERIOR')) {
         partyInfo = partyNames.find(p => p.partyType === 'vendedor' && p.partyNumber === 1);
       } else if (checklistNameUpper.includes('IMÓVEL') || checklistNameUpper.includes('IMOVEL')) {
         const numMatch = checklist.name.match(/(\d+)/);
         const partyNum = numMatch ? parseInt(numMatch[1]) : 1;
         partyInfo = partyNames.find(p => p.partyType === 'imovel' && p.partyNumber === partyNum);
         if (!partyInfo) {
           partyInfo = partyNames.find(p => p.partyType === 'imovel' && p.partyNumber === 1);
         }
       }
     }
     
     const formattedName = formatChecklistName(checklist.name);
     const displayName = partyInfo?.name 
       ? `${formattedName} (${partyInfo.name})`
       : formattedName;

    const sortedItems = [...items].sort((a, b) => a.position - b.position);
    
    const visibleItems = shouldHideCompleted 
      ? sortedItems.filter(i => !i.is_completed && !i.is_dismissed)
      : sortedItems.filter(i => !i.is_dismissed);
    
    const dismissedItems = sortedItems.filter(i => i.is_dismissed);

    return (
      <div key={checklist.id} className={cn(
        "border rounded-lg overflow-hidden",
        isDismissedChecklist && "opacity-60 bg-muted/20"
      )}>
        {/* Header */}
        <div 
          className={cn(
            "flex items-center justify-between p-3 cursor-pointer",
            isDismissedChecklist ? "bg-amber-100/50" : "bg-muted/30"
          )}
          onClick={() => toggleChecklist(checklist.id)}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CheckSquare className="h-4 w-4" />
            <span className={cn("font-medium", isDismissedChecklist && "line-through text-muted-foreground")}>
              {displayName}
            </span>
            {isDismissedChecklist ? (
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Dispensado</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                ({completedCount}/{totalActive})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {isDismissedChecklist ? (
              // Restaurar checklist
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-amber-600 hover:text-amber-700"
                onClick={() => handleUndismissChecklist(checklist)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Restaurar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => toggleHideCompleted(checklist.id)}
                >
                  {shouldHideCompleted ? (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Mostrar marcados
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Ocultar marcados
                    </>
                  )}
                </Button>
                {isEditor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-amber-600 hover:text-amber-700"
                    onClick={() => handleDismissChecklistClick(checklist)}
                    title="Dispensar lista (não se aplica a este card)"
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Dispensar
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Excluir lista? Esta ação é permanente.')) {
                        deleteChecklist.mutate(checklist.id);
                      }
                    }}
                    title="Excluir lista (apenas Super Admin)"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

              {/* Progress Bar */}
              <div className="px-3 py-2 flex items-center gap-3">
                <span className="text-sm font-medium min-w-[40px]">
                  {Math.round(progress)}%
                </span>
                <Progress value={progress} className="h-2 flex-1" />
              </div>

              {/* Items */}
              {isOpen && (
                <div className="px-3 pb-3">
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isCompleted = getIsCompleted(item);
                      const isResidence = isResidenceProof(item.content);
                      const isDebt = isDebtBalance(item.content);
                      const isCivilStatus = isCivilStatusCertificate(item.content);
                      const isCertificate = isCertificateItem(item.content);
                      const isCondominium = isCondominiumAdmin(item.content);
                      const isPesquisa = isPesquisaCadastral(item.content);
                      
                      // Template-configured dynamic fields
                      const hasTemplateDate = item.requires_date === true;
                      const hasTemplateStatus = item.requires_status === true && item.status_options && item.status_options.length > 0;
                      const hasTemplateObservation = item.requires_observation === true;
                      const hasTemplateDynamicFields = hasTemplateDate || hasTemplateStatus || hasTemplateObservation;
                      
                      // Show secondary fields when completed and has pattern-based OR template-based fields
                      const showSecondaryFields = isCompleted && (isResidence || isDebt || isCivilStatus || isCertificate || isCondominium || isPesquisa || hasTemplateDynamicFields);
                      return (
                        <div
                          key={item.id}
                          className="py-2 group"
                        >
                          {/* Main item row */}
                          <div className="flex items-start gap-2 hover:bg-muted/20 rounded px-2 -mx-2">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={() => handleToggle(item.id, isCompleted)}
                              disabled={!isEditor}
                              className={cn(
                                "mt-0.5",
                                isCompleted && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              )}
                            />
                            <div className="flex-1">
                              {editingItemId === item.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    ref={editInputRef}
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    onKeyDown={handleEditKeyDown}
                                    onBlur={handleEditSave}
                                    className="h-7 text-sm"
                                  />
                                </div>
                              ) : (
                                <>
                                   <div className="flex flex-wrap items-center gap-1.5">
                                     {getNatureIcon(item.operational_nature)}
                                     <span
                                       className={cn(
                                         "text-sm",
                                         isCompleted && "text-green-600",
                                         isAdmin && "cursor-pointer hover:underline hover:text-primary"
                                       )}
                                       onClick={() => isAdmin && handleEditClick(item)}
                                       title={isAdmin ? "Clique para editar" : undefined}
                                     >
                                       {item.content}
                                     </span>
                                     {getNatureBadge(item.operational_nature)}
                                   </div>
                                  {isCompleted && item.completed_by_profile && item.completed_at && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                            <UserCheck className="h-3 w-3" />
                                            <span>{item.completed_by_profile.full_name}</span>
                                            <span>•</span>
                                            <span>{format(new Date(item.completed_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Marcado por {item.completed_by_profile.full_name} em {format(new Date(item.completed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </>
                              )}
                            </div>
                            {/* Only admins can edit */}
                            {isAdmin && editingItemId !== item.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => handleEditClick(item)}
                                title="Editar item (apenas Admin)"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {/* Editors can dismiss (but not edit) */}
                            {isEditor && !isCompleted && editingItemId !== item.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => handleDismissClick(item)}
                                title="Dispensar item"
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            )}
                            {isAdmin && editingItemId !== item.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('Excluir item permanentemente?')) {
                                    deleteChecklistItem.mutate(item.id);
                                  }
                                }}
                                title="Excluir item (apenas Super Admin)"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Secondary fields when item is completed */}
                          {showSecondaryFields && (
                            <div className="ml-6 mt-2 space-y-2">
                              {/* Comprovante de residência - data do comprovante */}
                              {isResidence && (
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Data do comprovante:</span>
                                  <div className="w-[180px]">
                                    <DatePickerInput
                                      value={item.issue_date ? parseDateOnly(item.issue_date) : undefined}
                                      onChange={(date) => handleIssueDateChange(item.id, date)}
                                      disabled={!isEditor}
                                      className="[&>input]:h-7 [&>input]:text-xs [&>button]:h-7 [&>button]:w-7"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Saldo devedor - valor e nome do credor */}
                              {isDebt && (
                                <DebtBalanceFields
                                  item={item}
                                  isEditor={isEditor}
                                  updateCreditorInfo={updateCreditorInfo}
                                />
                              )}

                              {/* Certidão de estado civil - tipo e data de emissão */}
                              {isCivilStatus && (
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Tipo:</span>
                                    <Select
                                      value={item.civil_status_type || ''}
                                      onValueChange={(value) => {
                                        updateCivilStatus.mutate({ 
                                          itemId: item.id, 
                                          civilStatusType: value as 'nascimento' | 'casamento' | 'outros',
                                          civilStatusOther: value !== 'outros' ? null : item.civil_status_other || null
                                        });
                                      }}
                                      disabled={!isEditor}
                                    >
                                      <SelectTrigger className="h-7 w-[140px] text-xs">
                                        <SelectValue placeholder="Selecionar..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="nascimento">Nascimento</SelectItem>
                                        <SelectItem value="casamento">Casamento</SelectItem>
                                        <SelectItem value="outros">Outros</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {item.civil_status_type === 'outros' && (
                                    <Input
                                      type="text"
                                      placeholder="Especifique..."
                                      value={item.civil_status_other || ''}
                                      onChange={(e) => {
                                        updateCivilStatus.mutate({ 
                                          itemId: item.id, 
                                          civilStatusType: 'outros',
                                          civilStatusOther: e.target.value || null
                                        });
                                      }}
                                      className="h-7 w-40 text-xs"
                                      disabled={!isEditor}
                                    />
                                  )}
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Data de emissão:</span>
                                    <div className="w-[180px]">
                                      <DatePickerInput
                                        value={item.issue_date ? parseDateOnly(item.issue_date) : undefined}
                                        onChange={(date) => handleIssueDateChange(item.id, date)}
                                        disabled={!isEditor}
                                        className="[&>input]:h-7 [&>input]:text-xs [&>button]:h-7 [&>button]:w-7"
                                      />
                                    </div>
                                  </div>
                                 </div>
                               )}

                              {/* Condomínio - administradora field */}
                              {isCondominium && (
                                <AdministratorNameField
                                  item={item}
                                  isEditor={isEditor}
                                  updateAdministratorName={updateAdministratorName}
                                />
                              )}

                              {/* Pesquisa Cadastral - positive/negative status */}
                              {isPesquisa && (
                                <div className="flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Resultado:</span>
                                  <Select
                                    value={item.certificate_status || ''}
                                    onValueChange={(value) => handleCertificateStatusChange(item.id, value as 'positive' | 'negative')}
                                    disabled={!isEditor}
                                  >
                                    <SelectTrigger className="h-7 w-[140px] text-xs">
                                      <SelectValue placeholder="Selecionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="negative">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-green-500" />
                                          Negativa
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="positive">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                                          Positiva
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {item.certificate_status && (
                                    <span className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded",
                                      item.certificate_status === 'negative' 
                                        ? "bg-green-100 text-green-700" 
                                        : "bg-amber-100 text-amber-700"
                                    )}>
                                      {item.certificate_status === 'negative' ? 'Negativa' : 'Positiva'}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Certificate status for certidão items (except civil status which has its own handling) */}
                              {isCertificate && !isCivilStatus && (
                                <div className="flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Status:</span>
                                  <Select
                                    value={item.certificate_status || ''}
                                    onValueChange={(value) => handleCertificateStatusChange(item.id, value as 'positive' | 'negative')}
                                    disabled={!isEditor}
                                  >
                                    <SelectTrigger className="h-7 w-[140px] text-xs">
                                      <SelectValue placeholder="Selecionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="negative">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-green-500" />
                                          Negativa
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="positive">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                                          Positiva
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {item.certificate_status && (
                                    <span className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded",
                                      item.certificate_status === 'negative' 
                                        ? "bg-green-100 text-green-700" 
                                        : "bg-amber-100 text-amber-700"
                                    )}>
                                      {item.certificate_status === 'negative' ? 'Negativa' : 'Positiva'}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Template-configured dynamic fields */}
                              {hasTemplateDynamicFields && (
                                <div className="space-y-2 mt-2 pt-2 border-t border-muted/50">
                                  {/* Template: requires_date */}
                                  {hasTemplateDate && (
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Data:</span>
                                      <div className="w-[180px]">
                                        <DatePickerInput
                                          value={item.issue_date ? parseDateOnly(item.issue_date) : undefined}
                                          onChange={(date) => handleIssueDateChange(item.id, date)}
                                          disabled={!isEditor}
                                          className="[&>input]:h-7 [&>input]:text-xs [&>button]:h-7 [&>button]:w-7"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Template: requires_status with custom status_options */}
                                  {hasTemplateStatus && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Status:</span>
                                      <Select
                                        value={item.certificate_status || ''}
                                        onValueChange={(value) => updateCustomStatus.mutate({ itemId: item.id, status: value || null })}
                                        disabled={!isEditor}
                                      >
                                        <SelectTrigger className="h-7 w-auto min-w-[180px] text-xs">
                                          <SelectValue placeholder="Selecionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {item.status_options?.map((option) => (
                                            <SelectItem key={option} value={option}>
                                              {option}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {item.certificate_status && (
                                        <span className={cn(
                                          "text-xs font-medium px-2 py-0.5 rounded",
                                          getStatusColor(item.certificate_status)
                                        )}>
                                          {item.certificate_status}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Template: requires_observation */}
                                  {hasTemplateObservation && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Observação:</span>
                                      </div>
                                      <ChecklistObservationInput
                                        value={item.observation_text}
                                        isEditor={isEditor}
                                        placeholder="Adicionar observação..."
                                        className="min-h-[60px] text-xs"
                                        onSave={(nextValue) =>
                                          updateObservationText.mutate({
                                            itemId: item.id,
                                            observationText: nextValue,
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Dismissed items section */}
                    {dismissedItems.length > 0 && (
                      <Collapsible className="mt-2">
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1">
                          <ChevronRight className="h-3 w-3" />
                          <span>Itens dispensados ({dismissedItems.length})</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-1 mt-1 pl-4 border-l-2 border-muted">
                            {dismissedItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-2 py-2 group text-muted-foreground"
                              >
                                <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-sm line-through">
                                    {item.content}
                                  </span>
                                  {item.dismissed_reason && (
                                    <p className="text-xs italic mt-0.5">
                                      Motivo: {item.dismissed_reason}
                                    </p>
                                  )}
                                  {item.dismissed_by_profile && item.dismissed_at && (
                                    <p className="text-xs mt-0.5">
                                      Dispensado por {item.dismissed_by_profile.full_name} em {format(new Date(item.dismissed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                    </p>
                                  )}
                                </div>
                                {isEditor && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs opacity-0 group-hover:opacity-100"
                                    onClick={() => handleUndismiss(item)}
                                  >
                                    Restaurar
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Mapa de Segurança Operacional</span>
      </div>

      {/* Summary Header */}
      {activeItemsGlobal.length > 0 && (
        <div className={cn(
          "p-3 rounded-lg border flex items-center justify-between",
          isReadyToAdvance ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center gap-2">
            {isReadyToAdvance ? (
              <CheckCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <h4 className={cn(
                "text-sm font-semibold",
                isReadyToAdvance ? "text-emerald-900" : "text-amber-900"
              )}>
                {isReadyToAdvance ? "Pronto para avançar" : "Pendências impeditivas"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {isReadyToAdvance 
                  ? "Todos os itens obrigatórios foram concluídos." 
                  : `Faltam ${blockingItems.length} itens obrigatórios para poder mover o card.`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-muted-foreground block">Progresso total</span>
            <span className="text-sm font-bold">
              {activeItemsGlobal.filter(i => i.is_completed).length}/{activeItemsGlobal.length}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeChecklists.map((checklist) => renderChecklist(checklist, false))}
        
        {/* Dismissed Checklists Section */}
        {dismissedChecklistsList.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 py-2">
              <ChevronRight className="h-4 w-4" />
              <span>Listas dispensadas ({dismissedChecklistsList.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 mt-2">
                {dismissedChecklistsList.map(checklist => renderChecklist(checklist, true))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      </div>

      {/* Dismiss Item Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispensar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está dispensando: <strong>{dismissingItem?.content}</strong>
            </p>
            <div>
              <label className="text-sm font-medium">Justificativa *</label>
              <Textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="Informe o motivo da dispensa..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismissDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDismissConfirm}
              disabled={!dismissReason.trim() || dismissChecklistItem.isPending}
            >
              Confirmar Dispensa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Checklist Dialog */}
      <Dialog open={dismissChecklistDialogOpen} onOpenChange={setDismissChecklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispensar Lista Completa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está dispensando: <strong>{dismissingChecklist?.name}</strong>
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              Todos os itens desta lista serão marcados como dispensados. Use quando esta lista não se aplica a este card específico.
            </p>
            <div>
              <label className="text-sm font-medium">Justificativa *</label>
              <Textarea
                value={dismissChecklistReason}
                onChange={(e) => setDismissChecklistReason(e.target.value)}
                placeholder="Informe o motivo da dispensa..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismissChecklistDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDismissChecklistConfirm}
              disabled={!dismissChecklistReason.trim() || dismissChecklist.isPending}
            >
              Confirmar Dispensa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for debt balance fields with local state
interface DebtBalanceFieldsProps {
  item: ChecklistItemExtended;
  isEditor: boolean;
  updateCreditorInfo: ReturnType<typeof useChecklists>['updateCreditorInfo'];
}

function DebtBalanceFields({ item, isEditor, updateCreditorInfo }: DebtBalanceFieldsProps) {
  const [localValue, setLocalValue] = useState(item.creditor_value || '');
  const [localCreditorName, setLocalCreditorName] = useState(item.creditor_name || '');

  // Sync with server state when item changes
  useEffect(() => {
    setLocalValue(item.creditor_value || '');
    setLocalCreditorName(item.creditor_name || '');
  }, [item.creditor_value, item.creditor_name]);

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const numValue = parseFloat(value) / 100;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    setLocalValue(rawValue);
  };

  const handleValueBlur = () => {
    if (localValue !== (item.creditor_value || '')) {
      updateCreditorInfo.mutate({
        itemId: item.id,
        creditorName: localCreditorName || null,
        creditorValue: localValue || null
      });
    }
  };

  const handleCreditorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalCreditorName(e.target.value);
  };

  const handleCreditorNameBlur = () => {
    if (localCreditorName !== (item.creditor_name || '')) {
      updateCreditorInfo.mutate({
        itemId: item.id,
        creditorName: localCreditorName || null,
        creditorValue: localValue || null
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Valor:</span>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            value={formatCurrency(localValue)}
            onChange={handleValueChange}
            onBlur={handleValueBlur}
            className="h-7 w-32 text-xs pl-7"
            disabled={!isEditor}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Credor:</span>
        <Input
          type="text"
          placeholder="Nome do credor"
          value={localCreditorName}
          onChange={handleCreditorNameChange}
          onBlur={handleCreditorNameBlur}
          className="h-7 w-48 text-xs"
          disabled={!isEditor}
        />
      </div>
    </div>
  );
}

// Separate component for administrator name field with local state
interface AdministratorNameFieldProps {
  item: ChecklistItemExtended;
  isEditor: boolean;
  updateAdministratorName: ReturnType<typeof useChecklists>['updateAdministratorName'];
}

function AdministratorNameField({ item, isEditor, updateAdministratorName }: AdministratorNameFieldProps) {
  const [localValue, setLocalValue] = useState(item.administrator_name || '');

  // Sync with server state when item changes
  useEffect(() => {
    setLocalValue(item.administrator_name || '');
  }, [item.administrator_name]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue !== (item.administrator_name || '')) {
      updateAdministratorName.mutate({
        itemId: item.id,
        administratorName: localValue || null
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Nome da administradora:</span>
      <Input
        type="text"
        placeholder="Digite o nome da administradora"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="h-7 w-64 text-xs"
        disabled={!isEditor}
      />
    </div>
  );
}