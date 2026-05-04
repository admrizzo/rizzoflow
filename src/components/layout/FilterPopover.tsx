import { ReactNode, useMemo } from 'react';
import { useProviderRegistry } from '@/hooks/useProviderRegistry';
import { useLabels } from '@/hooks/useLabels';
import { useProfiles } from '@/hooks/useProfiles';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { useAuth } from '@/contexts/AuthContext';
import { FilterState } from './Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { X, Archive, User, Users, Clock, AlertTriangle, CheckCircle2, RotateCcw, Wrench } from 'lucide-react';

interface FilterPopoverProps {
  children: ReactNode;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  archivedCount?: number;
  boardId?: string | null;
}

const guaranteeOptions = [
  { value: 'carta_fianca', label: 'Carta Fiança' },
  { value: 'caucao', label: 'Caução' },
  { value: 'fiador', label: 'Fiador' },
  { value: 'seguro_fianca', label: 'Seguro Fiança' },
  { value: 'sem_garantia', label: 'Sem Garantia' },
  { value: 'titulo_capitalizacao', label: 'Título de Capitalização' },
  { value: 'outro', label: 'Outro' },
];

const contractOptions = [
  { value: 'digital', label: 'Digital' },
  { value: 'fisico', label: 'Físico' },
];

const deadlineOptions = [
  { value: 'overdue', label: 'Vencido', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'upcoming', label: 'Próximo (7 dias)', icon: Clock, color: 'text-amber-500' },
  { value: 'met', label: 'Cumprido', icon: CheckCircle2, color: 'text-green-500' },
];

export function FilterPopover({ children, filters, onFiltersChange, archivedCount = 0, boardId }: FilterPopoverProps) {
  const { labels } = useLabels();
  const { profiles } = useProfiles();
  const { config: boardConfig } = useBoardConfig(boardId || '');
  const { isAdmin } = useAuth();
  const { providers: registeredProviders } = useProviderRegistry();
  const providerNames = useMemo(() => 
    registeredProviders.map(p => p.name).sort(),
    [registeredProviders]
  );

  const clearFilters = () => {
    onFiltersChange({
      guaranteeType: null,
      contractType: null,
      labelId: null,
      memberId: null,
      proposalResponsible: null,
      showArchived: false,
      ownerId: null,
      creatorId: null,
      deadlineStatus: null,
      providerName: null,
      visualState: null,
      docsReceived: false,
      unseenOnly: false,
    });
  };

  const hasActiveFilters = 
    filters.guaranteeType || 
    filters.contractType || 
    filters.labelId || 
    filters.memberId ||
    filters.proposalResponsible || 
    filters.showArchived || 
    filters.ownerId ||
    filters.creatorId ||
    filters.deadlineStatus ||
    filters.providerName;

  // Show owner filter only for boards with owner_only_visibility and only for admins
  const showOwnerFilter = boardConfig?.owner_only_visibility && isAdmin;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl border-white/10" align="end">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Filtros</h4>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive">
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpar todos
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Member/Responsible filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Membro Atribuído
            </Label>
            <Select
              value={filters.memberId || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, memberId: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                          {profile.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {profile.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Creator filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Criador do Card
            </Label>
            <Select
              value={filters.creatorId || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, creatorId: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                          {profile.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {profile.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline status filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Prazo de Documentação
            </Label>
            <Select
              value={filters.deadlineStatus || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, deadlineStatus: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {deadlineOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Provider filter */}
          {providerNames.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Prestador
              </Label>
              <Select
                value={filters.providerName || 'all'}
                onValueChange={(v) => onFiltersChange({ ...filters, providerName: v === 'all' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {providerNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full h-px bg-border my-2" />

          <div className="space-y-2">
            <Label>Tipo de Garantia</Label>
            <Select
              value={filters.guaranteeType || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, guaranteeType: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {guaranteeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <Select
              value={filters.contractType || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, contractType: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {contractOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Etiqueta</Label>
            <Select
              value={filters.labelId || 'all'}
              onValueChange={(v) => onFiltersChange({ ...filters, labelId: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {labels.map((label) => (
                  <SelectItem key={label.id} value={label.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável pela Proposta</Label>
            <Input
              value={filters.proposalResponsible || ''}
              onChange={(e) => onFiltersChange({ ...filters, proposalResponsible: e.target.value || null })}
              placeholder="Buscar por nome..."
            />
          </div>

          {/* Owner filter - only visible for admins on boards with owner_only_visibility */}
          {showOwnerFilter && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsável pelo Card
              </Label>
              <Select
                value={filters.ownerId || 'all'}
                onValueChange={(v) => onFiltersChange({ ...filters, ownerId: v === 'all' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                            {profile.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {profile.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-archived" className="cursor-pointer">
                Mostrar arquivados {archivedCount > 0 && `(${archivedCount})`}
              </Label>
            </div>
            <Switch
              id="show-archived"
              checked={filters.showArchived}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, showArchived: checked })}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
