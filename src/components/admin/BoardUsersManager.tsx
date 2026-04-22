import { useState } from 'react';
import { useUserBoards } from '@/hooks/useUserBoards';
import { useBoards } from '@/hooks/useBoards';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Shield, Crown } from 'lucide-react';

interface BoardUsersManagerProps {
  boardId: string;
  onClose: () => void;
}

export function BoardUsersManager({ boardId, onClose }: BoardUsersManagerProps) {
  const { boards } = useBoards();
  const { profiles, isLoading: isLoadingProfiles } = useProfiles();
  const { isAdmin } = useAuth();
  const { 
    boardUsers, 
    isLoading, 
    addUserToBoard, 
    removeUserFromBoard,
    updateBoardAdmin,
    isBoardAdmin,
  } = useUserBoards(boardId);
  
  const board = boards.find(b => b.id === boardId);
  const assignedUserIds = boardUsers.map(ub => ub.user_id);

  const handleToggleUser = (userId: string) => {
    if (assignedUserIds.includes(userId)) {
      removeUserFromBoard.mutate({ userId, boardId });
    } else {
      addUserToBoard.mutate({ userId, boardId });
    }
  };

  const handleToggleBoardAdmin = (userId: string, currentlyAdmin: boolean) => {
    updateBoardAdmin.mutate({ userId, boardId, isBoardAdmin: !currentlyAdmin });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários com Acesso - {board?.name}
          </DialogTitle>
          <DialogDescription>
            Selecione quais usuários podem visualizar e trabalhar neste fluxo.
            {isAdmin && " Administradores de fluxo podem gerenciar configurações deste fluxo."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[400px]">
          {isLoading || isLoadingProfiles ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => {
                const hasAccess = assignedUserIds.includes(profile.user_id);
                const userBoardAdmin = boardUsers.find(ub => ub.user_id === profile.user_id)?.is_board_admin || false;
                
                return (
                  <Card 
                    key={profile.user_id}
                    className={`transition-colors ${hasAccess ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <Checkbox 
                        checked={hasAccess}
                        onCheckedChange={() => handleToggleUser(profile.user_id)}
                      />
                      
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {profile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {profile.full_name}
                          {userBoardAdmin && (
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        {profile.department && (
                          <Badge variant="secondary" className="text-xs mt-0.5">
                            {profile.department}
                          </Badge>
                        )}
                      </div>

                      {hasAccess && isAdmin && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Admin</span>
                          <Switch
                            checked={userBoardAdmin}
                            onCheckedChange={() => handleToggleBoardAdmin(profile.user_id, userBoardAdmin)}
                            className="scale-75"
                          />
                        </div>
                      )}

                      {hasAccess && !isAdmin && (
                        <Badge variant="outline" className="text-xs text-primary border-primary">
                          {userBoardAdmin ? 'Administrador' : 'Com acesso'}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-2 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span><strong>Super Administradores</strong> têm acesso total a todos os fluxos.</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <span><strong>Administradores de Fluxo</strong> podem gerenciar campos, checklists e usuários deste fluxo.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
