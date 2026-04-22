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
import { Search, LogOut, User, Filter, Settings2, Archive, RefreshCw } from 'lucide-react';
import { useForceRefresh } from '@/hooks/useForceRefresh';
import { toast } from 'sonner';
import { NotificationsPopover } from './NotificationsPopover';
import { FilterPopover } from './FilterPopover';
import { AdminPanel } from '@/components/admin';
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
  const { user, profile, signOut, roles, isAdmin } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const { triggerForceRefresh } = useForceRefresh();

  const handleForceRefresh = async () => {
    try {
      await triggerForceRefresh.mutateAsync();
      toast.success('Atualização forçada enviada para todos os usuários!');
    } catch (error) {
      console.error('Erro ao forçar atualização:', error);
      toast.error('Erro ao forçar atualização');
    }
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => key !== 'showArchived' && Boolean(value)).length + (filters.showArchived ? 1 : 0);

  return (
    <header className="h-12 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo - clickable to go home */}
        <Link 
          to="/dashboard"
          className="flex items-center gap-2" 
          title="Voltar para home"
          onClick={(e) => {
            // Prevent navigation if already on dashboard to avoid unnecessary re-renders
            if (window.location.pathname === '/dashboard') {
              e.preventDefault();
            }
          }}
        >
          <img 
            src="/logo-rizzo-white.png" 
            alt="Rizzo Imobiliária" 
            className="h-6 w-auto"
          />
        </Link>

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
          {isAdmin && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-white hover:bg-white/20 gap-1.5 px-2"
                onClick={handleForceRefresh}
                disabled={triggerForceRefresh.isPending}
                title="Forçar todos os usuários a atualizar a página"
              >
                <RefreshCw className={`h-4 w-4 ${triggerForceRefresh.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-xs">Atualizar Todos</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setShowAdminPanel(true)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </>
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
              <DropdownMenuItem onClick={() => signOut()}>
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
