import { useUserRoles } from '@/hooks/useUserRoles';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserBoards } from '@/hooks/useUserBoards';
import { useBoards } from '@/hooks/useBoards';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Shield, UserCog, UserX, Crown, Workflow } from 'lucide-react';
import { AppRole } from '@/types/database';

interface UserRolesManagerProps {
  open: boolean;
  onClose: () => void;
}

const ROLE_LABELS: Record<AppRole | 'none', string> = {
  admin: 'Super Admin',
  editor: 'Editor',
  viewer: 'Visualizador',
  none: 'Sem acesso',
};

const ROLE_ICONS: Record<AppRole | 'none', React.ReactNode> = {
  admin: <Shield className="h-4 w-4 text-red-500" />,
  editor: <UserCog className="h-4 w-4 text-blue-500" />,
  viewer: <Users className="h-4 w-4 text-gray-500" />,
  none: <UserX className="h-4 w-4 text-gray-400" />,
};

export function UserRolesManager({ open, onClose }: UserRolesManagerProps) {
  const { profiles, isLoading: isLoadingProfiles } = useProfiles();
  const { userRoles, isLoading: isLoadingRoles, setUserRole, removeUserRole, getUserRole } = useUserRoles();
  const { allUserBoards, isLoading: isLoadingBoards } = useUserBoards();
  const { boards } = useBoards();
  const { user: currentUser } = useAuth();

  const isLoading = isLoadingProfiles || isLoadingRoles || isLoadingBoards;

  const handleRoleChange = (userId: string, newRole: string) => {
    if (newRole === 'none') {
      removeUserRole.mutate({ userId });
    } else {
      setUserRole.mutate({ userId, role: newRole as AppRole });
    }
  };

  // Get board info for a user
  const getUserBoardsInfo = (userId: string) => {
    const userBoardEntries = allUserBoards.filter(ub => ub.user_id === userId);
    return userBoardEntries.map(ub => {
      const board = boards.find(b => b.id === ub.board_id);
      return {
        boardId: ub.board_id,
        boardName: board?.name || 'Fluxo desconhecido',
        boardColor: board?.color || '#6b7280',
        isAdmin: ub.is_board_admin,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Gerenciar Funções dos Usuários
          </DialogTitle>
          <DialogDescription>
            Defina as permissões de cada usuário. Super Admins têm acesso total. Outros usuários precisam de acesso específico aos fluxos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const currentRole = getUserRole(profile.user_id);
                const isCurrentUser = profile.user_id === currentUser?.id;
                const isSuperAdmin = currentRole === 'admin';
                const userBoardsInfo = getUserBoardsInfo(profile.user_id);
                const adminBoardsCount = userBoardsInfo.filter(b => b.isAdmin).length;
                
                return (
                  <Card 
                    key={profile.user_id}
                    className={`transition-colors ${isCurrentUser ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {profile.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{profile.full_name}</span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                          {profile.department && (
                            <span className="text-xs text-muted-foreground">
                              {profile.department}
                            </span>
                          )}
                        </div>

                        {/* Role Selector */}
                        <Select
                          value={currentRole || 'none'}
                          onValueChange={(value) => handleRoleChange(profile.user_id, value)}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-red-500" />
                                <span>Super Admin</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-blue-500" />
                                <span>Editor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span>Visualizador</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <UserX className="h-4 w-4 text-gray-400" />
                                <span>Sem acesso</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Role & Boards Info */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {/* Current Role Display */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-16">Função:</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              currentRole === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                              currentRole === 'editor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              currentRole === 'viewer' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            }`}
                          >
                            <span className="mr-1.5">{ROLE_ICONS[currentRole || 'none']}</span>
                            {ROLE_LABELS[currentRole || 'none']}
                          </Badge>
                          {isSuperAdmin && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (acesso a todos os fluxos)
                            </span>
                          )}
                        </div>

                        {/* Boards Access */}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-16 pt-0.5">Fluxos:</span>
                          <div className="flex-1">
                            {isSuperAdmin ? (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Acesso total a todos os fluxos
                              </span>
                            ) : userBoardsInfo.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">
                                Nenhum fluxo atribuído
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {userBoardsInfo.map((boardInfo) => (
                                  <Badge 
                                    key={boardInfo.boardId}
                                    variant="secondary"
                                    className="text-xs flex items-center gap-1"
                                    style={{ 
                                      backgroundColor: `${boardInfo.boardColor}20`,
                                      borderColor: boardInfo.boardColor,
                                      color: boardInfo.boardColor,
                                    }}
                                  >
                                    <Workflow className="h-3 w-3" />
                                    {boardInfo.boardName.replace('Fluxo de ', '')}
                                    {boardInfo.isAdmin && (
                                      <Crown className="h-3 w-3 text-amber-500 ml-0.5" />
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Admin boards count */}
                        {!isSuperAdmin && adminBoardsCount > 0 && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-medium text-muted-foreground w-16"></span>
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              Admin de {adminBoardsCount} fluxo{adminBoardsCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium">Níveis de Permissão:</h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
              <Shield className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <span className="font-medium text-red-700">Super Admin</span>
                <p className="text-red-600/80">Acesso total, gerencia todos os fluxos e usuários</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
              <Crown className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <span className="font-medium text-amber-700">Admin de Fluxo</span>
                <p className="text-amber-600/80">Gerencia configurações de fluxos específicos</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
              <UserCog className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <span className="font-medium text-blue-700">Editor</span>
                <p className="text-blue-600/80">Cria e edita cards nos fluxos atribuídos</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-gray-100 rounded-lg">
              <Users className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium text-gray-700">Visualizador</span>
                <p className="text-gray-600/80">Apenas visualização dos fluxos atribuídos</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
