import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Search, LogOut, User, Filter, Settings2, Archive, RefreshCw, BarChart3, Inbox } from 'lucide-react';
import { useSync, formatLastSync } from '@/hooks/useSync';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { NotificationsPopover } from './NotificationsPopover';
import { FilterPopover } from './FilterPopover';
import { AdminPanel } from '@/components/admin';
import { useNavigate } from 'react-router-dom';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { Board } from '@/types/database';
import { cn } from '@/lib/utils';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  selectedBoard?: Board | null;
  archivedCount?: number;
  showArchivedView?: boolean;
  onToggleArchivedView?: () => void;
  onOpenCardFromNotification?: (cardId: string, boardId: string) => void;
}

export interface FilterState {
  guaranteeType: string | null;
  contractType: string | null;
  labelId: string | null;
  memberId: string | null;
  proposalResponsible: string | null;
  showArchived: boolean;
  ownerId: string | null;
  creatorId: string | null;
  deadlineStatus: string | null;
  providerName: string | null;
}

export function Header({ searchQuery, onSearchChange, filters, onFiltersChange, selectedBoard, archivedCount = 0, showArchivedView, onToggleArchivedView, onOpenCardFromNotification }: HeaderProps) {
  const { user, profile, signOut, roles } = useAuth();
  const { isAdmin, canManageUsers, canViewAllProposals, hasAnyRole } = usePermissions();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const { sync, isSyncing, canSync, lastSyncedAt } = useSync();
  const navigate = useNavigate();

  const handleSync = async () => {
    if (isSyncing) return;
    const result = await sync();
    if (result.success) {
      const { upserted, errors } = result;
      if (errors > 0) {
        toast.warning(`Sincronização concluída com ${errors} erro(s).`);
      } else if (upserted === 0) {
        toast.success('Sincronização concluída. Nenhuma alteração encontrada.');
      } else {
        toast.success(`Sincronização concluída: ${upserted} imóveis atualizados.`);
      }
      return;
    }
    if (result.error === 'forbidden') return;
    const message =
      typeof result.error === 'string' && result.error.length > 0
        ? result.error
        : 'Não foi possível sincronizar. Tente novamente.';
    toast.error(message);
  };

  const lastSyncLabel = formatLastSync(lastSyncedAt);

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => key !== 'showArchived' && Boolean(value)).length + (filters.showArchived ? 1 : 0);

  return (
    <header className="h-[52px] sticky top-0 z-[60] border-b bg-sidebar text-white border-white/5 shadow-md overflow-hidden">
      <div className="flex items-center h-full px-4 gap-4 overflow-x-auto lp-thin-scroll scrollbar-none">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-2 group shrink-0" title="Rizzo Flow Home">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-red-700 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-lg group-hover:scale-105 transition-transform">R</div>
          <span className="font-bold text-[15px] tracking-tight hidden sm:block">Rizzo Flow</span>
        </Link>

        {/* Main Nav (Meus Fluxos) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className={cn(
            "h-8 gap-2 text-[12.5px] font-semibold transition-all rounded-lg shrink-0",
            window.location.pathname === '/dashboard' ? "bg-white/10 text-white shadow-inner" : "text-white/70 hover:bg-white/5 hover:text-white"
          )}
        >
          <Inbox className="h-4 w-4" />
          <span className="hidden md:inline">Meus Fluxos</span>
        </Button>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar em todos os fluxos..."
            className="pl-9 h-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 rounded-lg text-xs"
          />
        </div>

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Global Actions */}
          <div className="hidden lg:flex items-center gap-1 mr-2 border-r border-white/10 pr-2">
            {hasAnyRole && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white/70 hover:bg-white/5 hover:text-white gap-2 px-3 text-xs font-medium rounded-lg"
                onClick={() => navigate('/minha-fila')}
              >
                <Inbox className="h-4 w-4" />
                Minha Fila
                <Badge className="h-4 min-w-[16px] px-1 bg-accent text-white border-none text-[9px] font-bold">5</Badge>
              </Button>
            )}

            {canSync && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white/70 hover:bg-white/5 hover:text-white gap-2 px-3 text-xs font-medium rounded-lg"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                Sincronizar
              </Button>
            )}

            {canViewAllProposals && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white/70 hover:bg-white/5 hover:text-white gap-2 px-3 text-xs font-medium rounded-lg"
                onClick={() => navigate('/central-propostas')}
              >
                <BarChart3 className="h-4 w-4" />
                Propostas
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <NotificationsPopover onOpenCard={onOpenCardFromNotification} />
            
            {canManageUsers && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white rounded-lg"
                onClick={() => setShowAdminPanel(true)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 pl-1 pr-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 ml-2">
                  <Avatar className="h-6 w-6 border border-white/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent text-white text-[10px] font-bold">
                      {profile?.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[12px] font-semibold text-white/90 hidden md:inline">{profile?.full_name?.split(' ')[0]}</span>
                  <ChevronDown className="h-3 w-3 text-white/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{profile?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground leading-none mt-1">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                  <User className="mr-2 h-4 w-4" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

        {/* Current Board Name */}
        {selectedBoard && (
          <div className="flex items-center ml-3">
            <div className="w-px h-5 bg-white/30 mr-3 hidden sm:block" />
            <span className="text-white font-semibold text-sm truncate max-w-[150px] sm:max-w-none">
              {selectedBoard.name}
            </span>
          </div>
        )}

        {/* Search, Archived Button, and Filters */}
        <div className="flex items-center gap-2 flex-1 max-w-lg mx-4 justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={selectedBoard ? "Buscar qualquer termo..." : "Buscar em todos os fluxos..."}
              className="pl-8 h-8 bg-white/20 border-0 text-white placeholder:text-white/60 focus-visible:ring-white/30"
            />
          </div>
          
          {/* Archived/Kanban toggle button - only when board is selected */}
          {selectedBoard && onToggleArchivedView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleArchivedView}
              className={cn(
                "h-8 gap-2 transition-all rounded-full font-medium",
                showArchivedView 
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md px-4" 
                  : "text-white/80 hover:bg-white/20 hover:text-white px-3"
              )}
              title={showArchivedView ? "Voltar ao Kanban" : "Ver arquivados"}
            >
              {showArchivedView ? (
              <>
                <Archive className="h-4 w-4" />
                <span className="text-xs font-semibold tracking-wide">Arquivados</span>
                <span className="text-[10px] bg-white/20 rounded px-1.5 py-0.5">Esc para sair</span>
              </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {archivedCount > 0 && (
                    <span className="text-xs bg-white/20 rounded-full px-1.5 min-w-[20px] text-center">
                      {archivedCount}
                    </span>
                  )}
                </>
              )}
            </Button>
          )}
          
          <FilterPopover filters={filters} onFiltersChange={onFiltersChange} archivedCount={archivedCount} boardId={selectedBoard?.id}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 relative">
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-red-500">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </FilterPopover>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {hasAnyRole && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-white/20 gap-1.5 px-2"
              onClick={() => navigate('/minha-fila')}
              title="Minha Fila — processos que precisam de ação"
            >
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Minha Fila</span>
            </Button>
          )}
          {canSync && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-white/20 gap-1.5 px-2"
              onClick={handleSync}
              disabled={isSyncing}
              title={
                isSyncing
                  ? 'Sincronizando...'
                  : lastSyncLabel
                    ? `Sincronizar dados do CRM\nÚltima sincronização: ${lastSyncLabel}`
                    : 'Sincronizar dados do CRM'
              }
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-xs">
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            </Button>
          )}
          {canManageUsers && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => setShowAdminPanel(true)}
              title="Configurações administrativas"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          {canViewAllProposals && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-white/20 gap-1.5 px-2"
              onClick={() => navigate('/central-propostas')}
              title="Central de Propostas"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Propostas</span>
            </Button>
          )}

          <NotificationsPopover onOpenCard={onOpenCardFromNotification} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/20">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                  <AvatarFallback className="bg-orange-700 text-white text-sm">
                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {roles.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void signOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdminPanel open={showAdminPanel} onOpenChange={setShowAdminPanel} />
      <ProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />
    </header>
  );
}
