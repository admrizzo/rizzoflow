import { useState, useRef } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserBoards } from '@/hooks/useUserBoards';
import { useBoards } from '@/hooks/useBoards';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import { Users, Shield, UserCog, UserX, Crown, Workflow, ChevronDown, Eye, Trash2, Info, Camera } from 'lucide-react';
import { AppRole } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const ROLE_CONFIG = {
  admin: {
    label: 'Super Admin',
    description: 'Acesso total, cria fluxos',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-50 border-red-200',
  },
  editor: {
    label: 'Editor',
    description: 'Cria e edita cards',
    icon: UserCog,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  viewer: {
    label: 'Visualizador',
    description: 'Apenas leitura',
    icon: Eye,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
  },
  none: {
    label: 'Sem acesso',
    description: 'Sem permissões',
    icon: UserX,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 border-gray-200',
  },
} as const;

const ROLE_PERMISSIONS = {
  super_admin: [
    'Acesso total a todos os fluxos',
    'Criar/editar/excluir fluxos',
    'Gerenciar usuários e permissões',
    'Criar/editar/excluir cards',
    'Gerenciar etiquetas e campos',
    'Excluir checklists e itens',
  ],
  flow_admin: [
    'Gerenciar fluxos específicos',
    'Gerenciar acesso ao fluxo',
    'Gerenciar etiquetas do fluxo',
    'Criar/editar cards',
    'Não pode excluir itens permanentemente',
  ],
  editor: [
    'Criar e editar cards',
    'Completar checklists',
    'Adicionar comentários',
    'Dispensar itens (com justificativa)',
    'Não pode excluir permanentemente',
  ],
  viewer: [
    'Visualizar cards e checklists',
    'Sem permissão de edição',
    'Sem permissão de exclusão',
  ],
};

export function UsersAndAccessManager() {
  const { profiles, isLoading: isLoadingProfiles } = useProfiles();
  const { userRoles, isLoading: isLoadingRoles, setUserRole, removeUserRole, getUserRole } = useUserRoles();
  const { allUserBoards, addUserToBoard, removeUserFromBoard, updateBoardAdmin, isLoading: isLoadingBoards } = useUserBoards();
  const { boards } = useBoards();
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ userId: string; name: string } | null>(null);
  const [uploadingUserId, setUploadingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadUserId = useRef<string | null>(null);

  const isLoading = isLoadingProfiles || isLoadingRoles || isLoadingBoards;

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    if (newRole === 'none') {
      removeUserRole.mutate({ userId });
    } else {
      setUserRole.mutate({ userId, role: newRole as AppRole });
    }
  };

  const handleToggleBoardAccess = (userId: string, boardId: string, hasAccess: boolean) => {
    if (hasAccess) {
      removeUserFromBoard.mutate({ userId, boardId });
    } else {
      addUserToBoard.mutate({ userId, boardId });
    }
  };

  const handleToggleBoardAdmin = (userId: string, boardId: string, isAdmin: boolean) => {
    updateBoardAdmin.mutate({ userId, boardId, isBoardAdmin: !isAdmin });
  };

  // Delete user (remove from user_roles, user_boards, and profiles)
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Remove user_roles
      await supabase.from('user_roles').delete().eq('user_id', userToDelete.userId);
      // Remove user_boards
      await supabase.from('user_boards').delete().eq('user_id', userToDelete.userId);
      // Remove profile
      await supabase.from('profiles').delete().eq('user_id', userToDelete.userId);
      
      toast({ title: 'Usuário excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-boards'] });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Inactivate user (remove all roles and board access)
  const handleInactivateUser = async (userId: string, userName: string) => {
    try {
      // Remove user_roles
      await supabase.from('user_roles').delete().eq('user_id', userId);
      // Remove user_boards
      await supabase.from('user_boards').delete().eq('user_id', userId);
      
      toast({ title: `${userName} foi inativado com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-boards'] });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao inativar usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleAvatarUpload = (userId: string) => {
    pendingUploadUserId.current = userId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = pendingUploadUserId.current;
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 2MB', variant: 'destructive' });
      return;
    }

    setUploadingUserId(userId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Remove old avatar if exists
      await supabase.storage.from('avatars').remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({ title: 'Foto atualizada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar foto', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingUserId(null);
      pendingUploadUserId.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Get effective role label
  const getEffectiveRole = (userId: string) => {
    const role = getUserRole(userId);
    if (role === 'admin') return 'super_admin';
    
    const userBoardsInfo = getUserBoardsInfo(userId);
    const isFlowAdmin = userBoardsInfo.some(b => b.isAdmin);
    
    if (isFlowAdmin) return 'flow_admin';
    if (role === 'editor') return 'editor';
    if (role === 'viewer') return 'viewer';
    return 'none';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend with Permissions */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Shield className="h-4 w-4 text-red-500" />
                  <div>
                    <span className="text-xs font-semibold">Super Admin</span>
                    <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold mb-1">Super Admin pode:</p>
                <ul className="text-xs space-y-0.5">
                  {ROLE_PERMISSIONS.super_admin.map((perm, i) => (
                    <li key={i}>• {perm}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold">Admin de Fluxo</span>
                    <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold mb-1">Admin de Fluxo pode:</p>
                <ul className="text-xs space-y-0.5">
                  {ROLE_PERMISSIONS.flow_admin.map((perm, i) => (
                    <li key={i}>• {perm}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <UserCog className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="text-xs font-semibold">Editor</span>
                    <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold mb-1">Editor pode:</p>
                <ul className="text-xs space-y-0.5">
                  {ROLE_PERMISSIONS.editor.map((perm, i) => (
                    <li key={i}>• {perm}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Eye className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs font-semibold">Visualizador</span>
                    <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold mb-1">Visualizador pode:</p>
                <ul className="text-xs space-y-0.5">
                  {ROLE_PERMISSIONS.viewer.map((perm, i) => (
                    <li key={i}>• {perm}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Users List */}
      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-2">
          {profiles.map((profile) => {
            const currentRole = getUserRole(profile.user_id);
            const isCurrentUser = profile.user_id === currentUser?.id;
            const isSuperAdmin = currentRole === 'admin';
            const userBoardsInfo = getUserBoardsInfo(profile.user_id);
            const effectiveRole = getEffectiveRole(profile.user_id);
            const isExpanded = expandedUsers.has(profile.user_id);
            
            return (
              <Collapsible 
                key={profile.user_id}
                open={isExpanded}
                onOpenChange={() => toggleUserExpanded(profile.user_id)}
              >
                <Card className={isCurrentUser ? 'border-primary/50' : ''}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                              {profile.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isAdmin && (
                            <button
                              type="button"
                              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAvatarUpload(profile.user_id);
                              }}
                              disabled={uploadingUserId === profile.user_id}
                            >
                              {uploadingUserId === profile.user_id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              ) : (
                                <Camera className="h-4 w-4 text-white" />
                              )}
                            </button>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate text-sm">{profile.full_name}</span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Você</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {/* Effective Role Badge */}
                            {effectiveRole === 'super_admin' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
                                <Shield className="h-2.5 w-2.5 mr-1" />
                                Super Admin
                              </Badge>
                            )}
                            {effectiveRole === 'flow_admin' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                                <Crown className="h-2.5 w-2.5 mr-1" />
                                Admin de Fluxo
                              </Badge>
                            )}
                            {effectiveRole === 'editor' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">
                                <UserCog className="h-2.5 w-2.5 mr-1" />
                                Editor
                              </Badge>
                            )}
                            {effectiveRole === 'viewer' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-700 border-gray-200">
                                <Eye className="h-2.5 w-2.5 mr-1" />
                                Visualizador
                              </Badge>
                            )}
                            {effectiveRole === 'none' && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500">
                                <UserX className="h-2.5 w-2.5 mr-1" />
                                Sem acesso
                              </Badge>
                            )}
                            
                            {/* Flow count for non-super-admins */}
                            {!isSuperAdmin && userBoardsInfo.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                • {userBoardsInfo.length} fluxo{userBoardsInfo.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/20">
                      {/* Role Selection */}
                      <div className="flex items-center justify-between py-3 border-b">
                        <span className="text-sm font-medium">Função Base:</span>
                        <Select
                          value={currentRole || 'none'}
                          onValueChange={(value) => handleRoleChange(profile.user_id, value)}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-[150px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-red-500" />
                                <span>Super Admin</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-3.5 w-3.5 text-blue-500" />
                                <span>Editor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-gray-500" />
                                <span>Visualizador</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <UserX className="h-3.5 w-3.5 text-gray-400" />
                                <span>Sem acesso</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Board Access - only show for non-super-admins */}
                      {!isSuperAdmin && (
                        <div className="py-3 space-y-2 border-b">
                          <span className="text-sm font-medium">Acesso aos Fluxos:</span>
                          <div className="space-y-1.5 mt-2">
                            {boards.filter(b => b.is_active).map((board) => {
                              const userBoard = allUserBoards.find(
                                ub => ub.user_id === profile.user_id && ub.board_id === board.id
                              );
                              const hasAccess = !!userBoard;
                              const isFlowAdmin = userBoard?.is_board_admin || false;

                              return (
                                <div 
                                  key={board.id}
                                  className="flex items-center justify-between py-1.5 px-2 rounded bg-background"
                                >
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={hasAccess}
                                      onCheckedChange={() => handleToggleBoardAccess(profile.user_id, board.id, hasAccess)}
                                    />
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: board.color }}
                                    />
                                    <span className="text-sm">{board.name.replace('Fluxo de ', '').replace('Fluxo ', '')}</span>
                                  </div>
                                  
                                  {hasAccess && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-muted-foreground">Admin</span>
                                      <Switch
                                        checked={isFlowAdmin}
                                        onCheckedChange={() => handleToggleBoardAdmin(profile.user_id, board.id, isFlowAdmin)}
                                        className="scale-75"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isSuperAdmin && (
                        <div className="py-3 text-sm text-green-600 flex items-center gap-2 border-b">
                          <Shield className="h-4 w-4" />
                          Acesso total a todos os fluxos
                        </div>
                      )}

                      {/* Action buttons - only for non-current users */}
                      {!isCurrentUser && isAdmin && (
                        <div className="py-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Inativar ${profile.full_name}? O usuário perderá todas as permissões.`)) {
                                handleInactivateUser(profile.user_id, profile.full_name);
                              }
                            }}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Inativar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserToDelete({ userId: profile.user_id, name: profile.full_name });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <DoubleConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Excluir Usuário"
        description={`Tem certeza que deseja excluir ${userToDelete?.name}? Esta ação é permanente e removerá o perfil do usuário do sistema.`}
        confirmText="EXCLUIR"
      />

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
