import { useState, useMemo } from 'react';
import { useBoards } from '@/hooks/useBoards';
import { useUserBoards } from '@/hooks/useUserBoards';
import { useAuth } from '@/contexts/AuthContext';
import { BoardFieldsManager } from './BoardFieldsManager';
import { BoardConfigManager } from './BoardConfigManager';
import { LabelsManager } from './LabelsManager';
import { BoardsManager } from './BoardsManager';
import { UsersAndAccessManager } from './UsersAndAccessManager';
import { ProviderRegistryManager } from './ProviderRegistryManager';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings2, ChevronRight, ClipboardList, Shield, Users, FormInput, Tag, Workflow, Crown, Settings, Wrench } from 'lucide-react';

type AdminView = 'main' | 'fields' | 'config';

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { boards, isLoading } = useBoards();
  const { adminBoards, isLoading: isLoadingPermissions } = useUserBoards();
  const { isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('main');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'flows' | 'fields' | 'users' | 'labels' | 'providers'>('flows');

  // Filter boards based on permissions
  const accessibleBoards = useMemo(() => {
    if (isAdmin) return boards;
    return boards.filter(b => adminBoards.includes(b.id));
  }, [boards, adminBoards, isAdmin]);

  // Check if user can manage anything
  const canManageAnything = isAdmin || adminBoards.length > 0;

  const handleBoardClick = (boardId: string) => {
    setSelectedBoardId(boardId);
    setCurrentView('fields');
  };

  const handleClose = () => {
    if (currentView !== 'main') {
      setCurrentView('main');
      setSelectedBoardId(null);
    } else {
      onOpenChange(false);
    }
  };

  // Show restricted message only if user can't manage anything
  if (!canManageAnything) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso Restrito</DialogTitle>
            <DialogDescription>
              Você não tem permissão para gerenciar nenhum fluxo.
              Entre em contato com um administrador para obter acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Shield className="h-16 w-16 text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show field manager
  if (currentView === 'fields' && selectedBoardId) {
    return (
      <BoardFieldsManager 
        boardId={selectedBoardId} 
        onClose={handleClose} 
      />
    );
  }

  // Show config manager
  if (currentView === 'config' && selectedBoardId) {
    return (
      <BoardConfigManager 
        boardId={selectedBoardId} 
        onClose={handleClose} 
      />
    );
  }

  // Main admin panel
  // Determine available tabs based on permissions
  const availableTabs = isAdmin 
    ? ['flows', 'fields', 'users', 'labels', 'providers'] 
    : ['fields', 'users', 'labels'];

  // Set default tab if current is not available
  const effectiveTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Administração
            {!isAdmin && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                <Crown className="h-3 w-3 mr-1 text-amber-500" />
                Gestor de Fluxo
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? "Gerencie fluxos, campos, usuários e permissões."
              : `Gerencie os fluxos que você administra (${accessibleBoards.length} fluxo${accessibleBoards.length !== 1 ? 's' : ''}).`
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'}`}>
            {isAdmin && (
              <TabsTrigger value="flows" className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                <span className="hidden sm:inline">Fluxos</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <FormInput className="h-4 w-4" />
              <span className="hidden sm:inline">Campos</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="labels" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Etiquetas</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="providers" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Prestadores</span>
              </TabsTrigger>
            )}
          </TabsList>

          {isAdmin && (
            <TabsContent value="flows" className="mt-4">
              <ScrollArea className="h-[450px] pr-4">
                <BoardsManager />
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="fields" className="mt-4">
            <ScrollArea className="h-[450px] pr-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure campos personalizados dos cards de cada fluxo.
              </p>

              {isLoading || isLoadingPermissions ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : accessibleBoards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum fluxo disponível.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessibleBoards.map((board) => (
                    <Card 
                      key={board.id} 
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => handleBoardClick(board.id)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: board.color }}
                          />
                          <div>
                            <div className="font-medium">{board.name}</div>
                            {board.description && (
                              <div className="text-sm text-muted-foreground">
                                {board.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBoardId(board.id);
                              setCurrentView('config');
                            }}
                            className="h-8 px-2"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Configurar
                          </Button>
                          <ChevronRight 
                            className="h-5 w-5 text-muted-foreground cursor-pointer" 
                            onClick={() => handleBoardClick(board.id)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UsersAndAccessManager />
          </TabsContent>

          <TabsContent value="labels" className="mt-4">
            <ScrollArea className="h-[450px] pr-4">
              <p className="text-sm text-muted-foreground mb-4">
                Gerencie as etiquetas disponíveis para categorizar os cards.
              </p>
              <LabelsManager accessibleBoardIds={isAdmin ? undefined : adminBoards} />
            </ScrollArea>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="providers" className="mt-4">
              <ScrollArea className="h-[450px] pr-4">
                <ProviderRegistryManager />
              </ScrollArea>
            </TabsContent>
          )}

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
