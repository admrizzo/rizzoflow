import { useState, useEffect, forwardRef, type ReactNode } from 'react';
import { useBoards } from '@/hooks/useBoards';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { useBoardFields } from '@/hooks/useBoardFields';
import { useChecklistTemplates } from '@/hooks/useChecklistTemplates';
import { FieldType } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Eye, 
  EyeOff, 
  Type, 
  CheckSquare,
  ListChecks,
  Puzzle,
  Save,
  Info,
  RotateCcw,
  Plus,
  Trash2,
  X,
  AlignLeft,
  List,
  Calendar,
  Hash,
  Pencil,
  GripVertical,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BoardConfigManagerProps {
  boardId: string;
  onClose: () => void;
}

// Standard fields that can be shown/hidden
const STANDARD_FIELDS = [
  { key: 'show_guarantee_type', label: 'Tipo de Garantia', description: 'Fiador, Seguro Fiança, etc.' },
  { key: 'show_contract_type', label: 'Tipo de Contrato', description: 'Digital ou Físico' },
  { key: 'show_robust_code', label: 'Código Robust', description: 'Identificador do imóvel' },
  { key: 'show_building_name', label: 'Nome do Imóvel/Empreendimento', description: 'Nome do edifício ou empreendimento' },
  { key: 'show_address', label: 'Endereço', description: 'Endereço completo' },
  { key: 'show_superlogica_id', label: 'ID Superlógica', description: 'Código no sistema Superlógica' },
  { key: 'show_proposal_responsible', label: 'Responsável pela Proposta', description: 'Quem está conduzindo' },
  { key: 'show_document_deadline', label: 'Prazo de Documentação', description: 'Data limite para documentos' },
  { key: 'show_negotiation_details', label: 'Detalhes da Negociação', description: 'Observações sobre a negociação' },
  { key: 'show_due_date', label: 'Data de Vencimento', description: 'Prazo geral do card' },
] as const;

// Available title pattern tokens
const TITLE_TOKENS = [
  { token: '{title}', label: 'Título livre', description: 'Título editável manualmente' },
  { token: '{robust_code}', label: 'Cód. Robust', description: 'Código do imóvel' },
  { token: '{building_name}', label: 'Empreendimento', description: 'Nome do imóvel' },
  { token: '{address}', label: 'Endereço', description: 'Endereço do imóvel' },
  { token: '{superlogica_id}', label: 'ID Superlógica', description: 'Código Superlógica' },
  { token: '{description}', label: 'Descrição', description: 'Campo de descrição' },
  { token: '{party:vendedor}', label: 'Vendedor', description: 'Nome do vendedor principal' },
  { token: '{party:comprador}', label: 'Comprador', description: 'Nome do comprador principal' },
  { token: '{party:proprietario}', label: 'Proprietário', description: 'Nome do proprietário' },
  { token: '{party:locatario}', label: 'Locatário', description: 'Nome do locatário' },
];

// Available party types for auto-creation
const PARTY_TYPES = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'comprador', label: 'Comprador' },
  { value: 'proprietario', label: 'Proprietário' },
  { value: 'locatario', label: 'Locatário' },
  { value: 'procurador', label: 'Procurador' },
  { value: 'fiador', label: 'Fiador' },
];

// Field type labels and icons
const fieldTypeLabels: Record<FieldType, { label: string; icon: ReactNode }> = {
  text: { label: 'Texto curto', icon: <Type className="h-4 w-4" /> },
  textarea: { label: 'Texto longo', icon: <AlignLeft className="h-4 w-4" /> },
  select: { label: 'Seleção', icon: <List className="h-4 w-4" /> },
  date: { label: 'Data', icon: <Calendar className="h-4 w-4" /> },
  checkbox: { label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" /> },
  number: { label: 'Número', icon: <Hash className="h-4 w-4" /> },
  multi_checkbox: { label: 'Múltipla escolha', icon: <ListChecks className="h-4 w-4" /> },
};

export const BoardConfigManager = forwardRef<HTMLDivElement, BoardConfigManagerProps>(function BoardConfigManager(
  { boardId, onClose },
  ref,
) {
  const { boards } = useBoards();
  const { config, isLoading, updateConfig } = useBoardConfig(boardId);
  const { fields, createField, updateField, deleteField } = useBoardFields(boardId);
  const { templates } = useChecklistTemplates(boardId);
  
  const [activeTab, setActiveTab] = useState<'fields' | 'identification' | 'custom' | 'checklists'>('fields');
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Custom field form state
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  const board = boards.find(b => b.id === boardId);

  // Custom field form helpers
  const resetFieldForm = () => {
    setFieldName('');
    setFieldType('text');
    setIsRequired(false);
    setFieldOptions([]);
    setNewOption('');
    setEditingField(null);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !fieldOptions.includes(newOption.trim())) {
      setFieldOptions([...fieldOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setFieldOptions(fieldOptions.filter(o => o !== option));
  };

  const handleFieldSubmit = () => {
    if (!fieldName.trim()) return;

    if (editingField) {
      updateField.mutate({
        id: editingField,
        field_name: fieldName.trim(),
        field_type: fieldType,
        is_required: isRequired,
        field_options: (fieldType === 'select' || fieldType === 'multi_checkbox') ? fieldOptions : [],
      });
    } else {
      createField.mutate({
        board_id: boardId,
        field_name: fieldName.trim(),
        field_type: fieldType,
        is_required: isRequired,
        field_options: (fieldType === 'select' || fieldType === 'multi_checkbox') ? fieldOptions : [],
      });
    }

    setShowAddFieldDialog(false);
    resetFieldForm();
  };

  const handleEditField = (field: typeof fields[0]) => {
    setFieldName(field.field_name);
    setFieldType(field.field_type);
    setIsRequired(field.is_required);
    setFieldOptions(field.field_options || []);
    setEditingField(field.id);
    setShowAddFieldDialog(true);
  };

  // Initialize local config when config loads
  useEffect(() => {
    if (config && !initialized && !isLoading) {
      setLocalConfig({
        show_guarantee_type: config.show_guarantee_type,
        show_contract_type: config.show_contract_type,
        show_robust_code: config.show_robust_code,
        show_building_name: config.show_building_name,
        show_address: config.show_address,
        show_superlogica_id: config.show_superlogica_id,
        show_proposal_responsible: config.show_proposal_responsible,
        show_document_deadline: config.show_document_deadline,
        show_negotiation_details: config.show_negotiation_details,
        show_due_date: config.show_due_date,
        title_pattern: config.title_pattern,
        creation_required_fields: config.creation_required_fields || [],
        show_financing_toggle: config.show_financing_toggle,
        auto_create_parties: config.auto_create_parties || [],
        auto_apply_checklist_templates: config.auto_apply_checklist_templates || [],
      });
      setInitialized(true);
    }
  }, [config, isLoading, initialized]);

  const handleFieldToggle = (key: string, value: boolean) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTitlePatternChange = (pattern: string) => {
    setLocalConfig(prev => ({ ...prev, title_pattern: pattern }));
    setHasChanges(true);
  };

  const handlePartyToggle = (partyType: string, checked: boolean) => {
    const current = localConfig.auto_create_parties || [];
    const updated = checked 
      ? [...current, partyType]
      : current.filter((p: string) => p !== partyType);
    setLocalConfig(prev => ({ ...prev, auto_create_parties: updated }));
    setHasChanges(true);
  };

  const handleChecklistToggle = (templateId: string, checked: boolean) => {
    const current = localConfig.auto_apply_checklist_templates || [];
    const updated = checked 
      ? [...current, templateId]
      : current.filter((id: string) => id !== templateId);
    setLocalConfig(prev => ({ ...prev, auto_apply_checklist_templates: updated }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateConfig.mutate(localConfig, {
      onSuccess: () => {
        setHasChanges(false);
      }
    });
  };

  const handleReset = () => {
    const defaultConfig = {
      show_guarantee_type: true,
      show_contract_type: true,
      show_robust_code: true,
      show_building_name: true,
      show_address: true,
      show_superlogica_id: true,
      show_proposal_responsible: true,
      show_document_deadline: true,
      show_negotiation_details: true,
      show_due_date: true,
      title_pattern: '{title}',
      creation_required_fields: [],
      show_financing_toggle: false,
      auto_create_parties: [],
      auto_apply_checklist_templates: [],
    };
    setLocalConfig(defaultConfig);
    setHasChanges(true);
    setResetDialogOpen(false);
  };

  const addTokenToPattern = (token: string) => {
    const currentPattern = localConfig.title_pattern || '{title}';
    const newPattern = currentPattern === '{title}' 
      ? token 
      : `${currentPattern} - ${token}`;
    handleTitlePatternChange(newPattern);
  };

  const clearTitlePattern = () => {
    handleTitlePatternChange('{title}');
  };

  // Count active configurations
  const activeFieldsCount = STANDARD_FIELDS.filter(f => localConfig[f.key] !== false).length;
  const activePartiesCount = (localConfig.auto_create_parties || []).length;
  const activeChecklistsCount = (localConfig.auto_apply_checklist_templates || []).length;

  if (isLoading) {
    return (
      <div ref={ref}>
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="sr-only">Carregando configurações</DialogTitle>
              <DialogDescription className="sr-only">
                Aguarde enquanto carregamos as configurações do fluxo.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: board?.color }}
            />
            Configurar - {board?.name}
          </DialogTitle>
          <DialogDescription>
            Configure os campos, identificação e comportamentos dos cards deste fluxo.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fields" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Campos</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                {activeFieldsCount}/{STANDARD_FIELDS.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="identification" className="flex items-center gap-1">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Identificação</span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1">
              <Puzzle className="h-4 w-4" />
              <span className="hidden sm:inline">Personalizados</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                {fields.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-1">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Automáticos</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                {activePartiesCount + activeChecklistsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Standard Fields Tab */}
          <TabsContent value="fields" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Campos Padrão do Sistema</CardTitle>
                      <CardDescription>
                        Escolha quais campos aparecem nos cards deste fluxo.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          STANDARD_FIELDS.forEach(f => handleFieldToggle(f.key, true));
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Todos
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          STANDARD_FIELDS.forEach(f => handleFieldToggle(f.key, false));
                        }}
                      >
                        <EyeOff className="h-3 w-3 mr-1" />
                        Nenhum
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {STANDARD_FIELDS.map((field) => (
                    <div 
                      key={field.key} 
                      className={`flex items-center justify-between py-2 px-3 rounded-md border transition-colors ${
                        localConfig[field.key] !== false 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                          : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {localConfig[field.key] !== false ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <Label className="font-medium">{field.label}</Label>
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={localConfig[field.key] !== false}
                        onCheckedChange={(checked) => handleFieldToggle(field.key, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Opções de Criação de Card</CardTitle>
                  <CardDescription>
                    Configure opções especiais ao criar novos cards.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-center justify-between py-2 px-3 rounded-md border transition-colors ${
                    localConfig.show_financing_toggle 
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900' 
                      : 'bg-muted/30 border-transparent'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CheckSquare className={`h-4 w-4 ${localConfig.show_financing_toggle ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      <div>
                        <Label className="font-medium">Toggle de Financiamento</Label>
                        <p className="text-xs text-muted-foreground">
                          Mostrar opção Com/Sem Financiamento na criação do card
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localConfig.show_financing_toggle === true}
                      onCheckedChange={(checked) => handleFieldToggle('show_financing_toggle', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Identification Tab */}
          <TabsContent value="identification" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Padrão de Título Automático</CardTitle>
                  <CardDescription>
                    Define como o título do card é gerado automaticamente ao salvar os campos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Padrão atual</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={clearTitlePattern}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    </div>
                    <Input
                      value={localConfig.title_pattern || '{title}'}
                      onChange={(e) => handleTitlePatternChange(e.target.value)}
                      placeholder="{robust_code} - {party:vendedor} - {party:comprador}"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Clique nos tokens abaixo para adicioná-los. Separe com " - ".
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tokens disponíveis</Label>
                    <div className="flex flex-wrap gap-2">
                      {TITLE_TOKENS.map((item) => (
                        <TooltipProvider key={item.token}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addTokenToPattern(item.token)}
                                className="h-7 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {item.label}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.description}</p>
                              <code className="text-xs block mt-1">{item.token}</code>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">Exemplos de padrões:</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li><strong>Venda:</strong> <code>{'{robust_code} - {party:vendedor} - {party:comprador}'}</code></li>
                          <li><strong>Rescisão:</strong> <code>{'{party:locatario} - {superlogica_id}'}</code></li>
                          <li><strong>Captação:</strong> <code>{'{party:proprietario} - {robust_code}'}</code></li>
                          <li><strong>DEV:</strong> <code>{'{robust_code} - {building_name} - {description} - {party:comprador}'}</code></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    <Label>Prévia do título</Label>
                    <div className="p-3 bg-muted rounded-md border">
                      <p className="text-sm font-medium">
                        {(localConfig.title_pattern || '{title}')
                          .replace('{robust_code}', 'ABC123')
                          .replace('{building_name}', 'Ed. Solar')
                          .replace('{address}', 'Rua Exemplo, 100')
                          .replace('{superlogica_id}', '54321')
                          .replace('{description}', 'Apt 101')
                          .replace('{party:vendedor}', 'João Silva')
                          .replace('{party:comprador}', 'Maria Santos')
                          .replace('{party:proprietario}', 'Carlos Souza')
                          .replace('{party:locatario}', 'Ana Lima')
                          .replace('{title}', 'Título livre')
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="custom" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Campos Personalizados</CardTitle>
                      <CardDescription>
                        Campos customizados que aparecem dentro de cada card deste fluxo, na seção "Campos Personalizados".
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => { resetFieldForm(); setShowAddFieldDialog(true); }}
                      disabled={showAddFieldDialog}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 flex-shrink-0" />
                      Esses campos aparecerão ao <strong>abrir qualquer card</strong> deste fluxo, logo após as etiquetas.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Inline Add/Edit Form */}
                  {showAddFieldDialog && (
                    <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="field-name" className="text-sm">Nome do Campo</Label>
                          <Input
                            id="field-name"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            placeholder="Ex: CPF do Locatário"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Tipo</Label>
                          <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              {Object.entries(fieldTypeLabels).map(([value, { label, icon }]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    {icon}
                                    {label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(fieldType === 'select' || fieldType === 'multi_checkbox') && (
                        <div className="space-y-1.5">
                          <Label className="text-sm">Opções</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newOption}
                              onChange={(e) => setNewOption(e.target.value)}
                              placeholder="Adicionar opção..."
                              className="h-9"
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                            />
                            <Button type="button" onClick={handleAddOption} size="sm" className="h-9 px-3">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {fieldOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {fieldOptions.map((opt) => (
                                <Badge key={opt} variant="secondary" className="gap-1 text-xs">
                                  {opt}
                                  <button onClick={() => handleRemoveOption(opt)} className="hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="is-required"
                            checked={isRequired}
                            onCheckedChange={setIsRequired}
                          />
                          <Label htmlFor="is-required" className="text-sm font-normal">Obrigatório</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => { setShowAddFieldDialog(false); resetFieldForm(); }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleFieldSubmit} 
                            disabled={!fieldName.trim()}
                          >
                            {editingField ? 'Salvar' : 'Adicionar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fields List */}
                  {fields.length === 0 && !showAddFieldDialog ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Puzzle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">Nenhum campo personalizado</p>
                      <p className="text-sm mt-1">
                        Clique em "Adicionar" para criar novos campos.
                      </p>
                    </div>
                  ) : fields.length > 0 && (
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <div 
                          key={field.id}
                          className={`flex items-center justify-between py-2 px-3 rounded-md border transition-colors ${
                            editingField === field.id 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 min-w-[90px]">
                              {fieldTypeLabels[field.field_type]?.icon}
                              <span className="text-xs text-muted-foreground">
                                {fieldTypeLabels[field.field_type]?.label}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-sm">{field.field_name}</div>
                              {(field.field_type === 'select' || field.field_type === 'multi_checkbox') && field.field_options?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {field.field_options.slice(0, 2).map((opt) => (
                                    <Badge key={opt} variant="secondary" className="text-xs h-5 px-1.5">
                                      {opt}
                                    </Badge>
                                  ))}
                                  {field.field_options.length > 2 && (
                                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                      +{field.field_options.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {field.is_required && (
                              <Badge variant="outline" className="text-xs h-5">
                                Obrigatório
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditField(field)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteField.mutate(field.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Checklists Tab */}
          <TabsContent value="checklists" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Partes Automáticas</CardTitle>
                  <CardDescription>
                    Selecione quais tipos de partes são criadas automaticamente ao criar um card.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {PARTY_TYPES.map((party) => {
                      const isChecked = (localConfig.auto_create_parties || []).includes(party.value);
                      return (
                        <div 
                          key={party.value}
                          className={`flex items-center space-x-3 p-2 rounded-md border transition-colors cursor-pointer ${
                            isChecked 
                              ? 'bg-primary/5 border-primary/30' 
                              : 'hover:bg-muted/50 border-transparent'
                          }`}
                          onClick={() => handlePartyToggle(party.value, !isChecked)}
                        >
                          <Checkbox
                            id={`party-${party.value}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handlePartyToggle(party.value, !!checked)}
                          />
                          <Label 
                            htmlFor={`party-${party.value}`}
                            className="font-normal cursor-pointer flex-1"
                          >
                            {party.label} 1
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Checklists Automáticos</CardTitle>
                  <CardDescription>
                    Selecione quais templates de checklist são aplicados automaticamente ao criar cards.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                      <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">Nenhum template disponível</p>
                      <p className="text-sm">Crie templates na aba "Fluxos" do Admin.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates.map((template) => {
                        const isChecked = (localConfig.auto_apply_checklist_templates || []).includes(template.id);
                        return (
                          <div 
                            key={template.id}
                            className={`flex items-center space-x-3 p-2 rounded-md border transition-colors cursor-pointer ${
                              isChecked 
                                ? 'bg-primary/5 border-primary/30' 
                                : 'hover:bg-muted/50 border-transparent'
                            }`}
                            onClick={() => handleChecklistToggle(template.id, !isChecked)}
                          >
                            <Checkbox
                              id={`template-${template.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleChecklistToggle(template.id, !!checked)}
                            />
                            <Label 
                              htmlFor={`template-${template.id}`}
                              className="font-normal cursor-pointer flex-1"
                            >
                              {template.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {template.items?.length || 0} itens
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer with actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-auto">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar para padrão
          </Button>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Alterações não salvas
              </Badge>
            )}
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || updateConfig.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateConfig.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar configurações?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá restaurar todas as configurações deste fluxo para os valores padrão.
              Você ainda precisará salvar para aplicar as mudanças.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

      </Dialog>
    </div>
  );
});

BoardConfigManager.displayName = 'BoardConfigManager';