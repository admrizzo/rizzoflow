import { useState, useRef } from 'react';
import { useUserBoards } from '@/hooks/useUserBoards';
import { useBoards } from '@/hooks/useBoards';
import { useAuth } from '@/contexts/AuthContext';
import { useInternalUsers, InternalUser } from '@/hooks/useInternalUsers';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Shield,
  UserCog,
  UserX,
  Crown,
  ChevronDown,
  Trash2,
  Info,
  Camera,
  Briefcase,
  Building2,
  ClipboardList,
  Mail,
  AlertTriangle,
  UserPlus,
  Loader2,
  Send,
  Link2,
  Copy,
  AlertTriangle as AlertTriangleIcon,
} from 'lucide-react';
import { AppRole } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildPublicUrl } from '@/lib/appUrl';
import { useQueryClient } from '@tanstack/react-query';

// ─────────────────────────────────────────────────────────────────────────────
// Apenas os 4 papéis oficiais aparecem na interface.
// Roles legadas (editor/viewer) só existem como ALIAS interno para exibição
// e nunca são gravadas pelo usuário.
// ─────────────────────────────────────────────────────────────────────────────
type DisplayRole = 'admin' | 'gestor' | 'corretor' | 'administrativo';
const DISPLAY_ROLES: DisplayRole[] = ['admin', 'gestor', 'corretor', 'administrativo'];

const ROLE_META: Record<DisplayRole, {
  label: string;
  short: string;
  icon: typeof Shield;
  color: string;
  badgeClass: string;
  permissions: string[];
}> = {
  admin: {
    label: 'Admin',
    short: 'Admin',
    icon: Shield,
    color: 'text-red-500',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    permissions: [
      'Acesso total a todos os fluxos',
      'Gerenciar usuários e permissões',
      'Criar/editar/excluir fluxos e cards',
      'Configurações críticas do sistema',
    ],
  },
  gestor: {
    label: 'Gestor',
    short: 'Gestor',
    icon: Briefcase,
    color: 'text-purple-500',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    permissions: [
      'Operar propostas e fluxos',
      'Criar e editar cards',
      'Visualizar e baixar documentos',
      'Não gerencia usuários',
    ],
  },
  corretor: {
    label: 'Corretor',
    short: 'Corretor',
    icon: Building2,
    color: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    permissions: [
      'Gerar novas propostas',
      'Acompanhar as próprias propostas',
      'Acesso restrito aos próprios cards',
    ],
  },
  administrativo: {
    label: 'Administrativo',
    short: 'Administrativo',
    icon: ClipboardList,
    color: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    permissions: [
      'Operar propostas, cards e checklists',
      'Visualizar documentos',
      'Não gerencia usuários nem fluxos',
    ],
  },
};

async function getInviteErrorMessage(error: unknown, data: unknown) {
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error);
  }

  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : null;

  if (context instanceof Response) {
    const text = await context.clone().text().catch(() => '');
    try {
      const payload = JSON.parse(text) as { error?: string; message?: string; requestId?: string };
      const message = payload.error || payload.message;
      return payload.requestId && message ? `${message} (ID: ${payload.requestId})` : message || text;
    } catch {
      return text || 'A função de convite retornou erro sem detalhes.';
    }
  }

  return error instanceof Error ? error.message : 'Tente novamente.';
}

/**
 * Mapeia roles vindas do banco (incluindo aliases legados) para o papel
 * exibido na UI. Garante que "Editor"/"Visualizador" nunca aparecem.
 */
function toDisplayRole(role: AppRole | null): DisplayRole | null {
  if (!role) return null;
  if (role === 'editor') return 'gestor';   // alias legado
  if (role === 'viewer') return 'corretor'; // alias legado
  if ((DISPLAY_ROLES as string[]).includes(role)) return role as DisplayRole;
  return null;
}

export function UsersAndAccessManager() {
  const { users, isLoading: isLoadingUsers, adminCount, setUserRole, removeUserRole } = useInternalUsers();
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

  // Convite de novo usuário interno
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<DisplayRole>('corretor');
  const [inviting, setInviting] = useState(false);

  // Reenvio de convite / geração de link de primeiro acesso
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [generatingLinkUserId, setGeneratingLinkUserId] = useState<string | null>(null);
  const [accessLinkDialog, setAccessLinkDialog] = useState<{
    open: boolean;
    name: string;
    email: string;
    link: string;
  }>({ open: false, name: '', email: '', link: '' });

  const handleResendInvite = async (u: InternalUser) => {
    if (!u.email) {
      toast({ title: 'Usuário sem e-mail', variant: 'destructive' });
      return;
    }
    setResendingUserId(u.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          fullName: u.full_name,
          email: u.email,
          role: (toDisplayRole(u.role) ?? 'corretor') as DisplayRole,
          redirectTo: buildPublicUrl('/redefinir-senha?invite=1'),
        },
      });
      if (error || data?.error) {
        throw new Error(await getInviteErrorMessage(error, data));
      }
      toast({
        title: 'Convite reenviado',
        description: `${u.full_name} receberá um novo e-mail para definir a senha.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao reenviar convite',
        description: err.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setResendingUserId(null);
    }
  };

  const handleGenerateAccessLink = async (u: InternalUser) => {
    if (!u.email) {
      toast({ title: 'Usuário sem e-mail', variant: 'destructive' });
      return;
    }
    setGeneratingLinkUserId(u.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-access-link', {
        body: {
          email: u.email,
          type: 'recovery',
          redirectTo: buildPublicUrl('/redefinir-senha'),
        },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Falha ao gerar link.');
      }
      if (!data?.action_link) {
        throw new Error('Link não retornado pelo servidor.');
      }
      setAccessLinkDialog({
        open: true,
        name: u.full_name,
        email: u.email,
        link: data.action_link as string,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar link',
        description: err.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingLinkUserId(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(accessLinkDialog.link);
      toast({ title: 'Link copiado!', description: 'Cole no WhatsApp ou e-mail do usuário.' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleInviteUser = async () => {
    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();
    if (!name || !email || !inviteRole) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'E-mail inválido', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          fullName: name,
          email,
          role: inviteRole,
          redirectTo: buildPublicUrl('/redefinir-senha?invite=1'),
        },
      });
      if (error || data?.error) {
        throw new Error(await getInviteErrorMessage(error, data));
      }

      toast({
        title: data?.existing ? 'Usuário atualizado!' : 'Convite enviado!',
        description: data?.message || data?.warning || `${name} receberá um e-mail para definir a senha.`,
      });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('corretor');
    } catch (err: any) {
      toast({
        title: 'Erro ao convidar usuário',
        description: err.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const isLoading = isLoadingUsers || isLoadingBoards;

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) newExpanded.delete(userId);
    else newExpanded.add(userId);
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
    if (hasAccess) removeUserFromBoard.mutate({ userId, boardId });
    else addUserToBoard.mutate({ userId, boardId });
  };

  const handleToggleBoardAdmin = (userId: string, boardId: string, currentlyAdmin: boolean) => {
    updateBoardAdmin.mutate({ userId, boardId, isBoardAdmin: !currentlyAdmin });
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await supabase.from('user_roles').delete().eq('user_id', userToDelete.userId);
      await supabase.from('user_boards').delete().eq('user_id', userToDelete.userId);
      await supabase.from('profiles').delete().eq('user_id', userToDelete.userId);
      toast({ title: 'Usuário excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-boards'] });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir usuário', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleInactivateUser = async (userId: string, userName: string) => {
    try {
      await supabase.rpc('remove_user_role', { _user_id: userId });
      await supabase.from('user_boards').delete().eq('user_id', userId);
      toast({ title: `${userName} foi inativado com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-boards'] });
    } catch (error: any) {
      toast({ title: 'Erro ao inativar usuário', description: error.message, variant: 'destructive' });
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
      await supabase.storage.from('avatars').remove([filePath]);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      toast({ title: 'Foto atualizada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar foto', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingUserId(null);
      pendingUploadUserId.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com ação de convite (somente admin) */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? 'usuário interno' : 'usuários internos'}
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar usuário
          </Button>
        </div>
      )}

      {/* Legenda dos 4 papéis oficiais */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DISPLAY_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const Icon = meta.icon;
            return (
              <TooltipProvider key={role}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                      <div>
                        <span className="text-xs font-semibold">{meta.label}</span>
                        <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold mb-1">{meta.label} pode:</p>
                    <ul className="text-xs space-y-0.5">
                      {meta.permissions.map((perm, i) => (
                        <li key={i}>• {perm}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Lista de usuários */}
      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          ) : (
            users.map((u) => (
              <UserCard
                key={u.user_id}
                user={u}
                isCurrentUser={u.user_id === currentUser?.id}
                isOnlyAdmin={u.role === 'admin' && adminCount <= 1}
                isExpanded={expandedUsers.has(u.user_id)}
                onToggleExpand={() => toggleUserExpanded(u.user_id)}
                onRoleChange={(value) => handleRoleChange(u.user_id, value)}
                onAvatarUpload={() => handleAvatarUpload(u.user_id)}
                isUploadingAvatar={uploadingUserId === u.user_id}
                isAdminViewer={isAdmin}
                userBoardsInfo={getUserBoardsInfo(u.user_id)}
                allBoards={boards.filter(b => b.is_active)}
                allUserBoards={allUserBoards}
                onToggleBoardAccess={handleToggleBoardAccess}
                onToggleBoardAdmin={handleToggleBoardAdmin}
                onInactivate={() => handleInactivateUser(u.user_id, u.full_name)}
                onRequestDelete={() => {
                  setUserToDelete({ userId: u.user_id, name: u.full_name });
                  setDeleteDialogOpen(true);
                }}
                isSaving={setUserRole.isPending || removeUserRole.isPending}
                onResendInvite={() => handleResendInvite(u)}
                onGenerateAccessLink={() => handleGenerateAccessLink(u)}
                isResendingInvite={resendingUserId === u.user_id}
                isGeneratingLink={generatingLinkUserId === u.user_id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <DoubleConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Excluir Usuário"
        description={`Tem certeza que deseja excluir ${userToDelete?.name}? Esta ação é permanente e removerá o perfil do usuário do sistema.`}
        confirmText="EXCLUIR"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dialog de convite */}
      <Dialog open={inviteOpen} onOpenChange={(o) => !inviting && setInviteOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar novo usuário
            </DialogTitle>
            <DialogDescription>
              O usuário receberá um e-mail para definir a senha e acessar o sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nome completo</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="João da Silva"
                disabled={inviting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                disabled={inviting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Papel</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as DisplayRole)}
                disabled={inviting}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {DISPLAY_ROLES.map((r) => {
                    const m = ROLE_META[r];
                    const Icon = m.icon;
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                          <span>{m.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={inviting}
            >
              Cancelar
            </Button>
            <Button onClick={handleInviteUser} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar convite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de usuário (extraído para legibilidade)
// ─────────────────────────────────────────────────────────────────────────────

interface UserCardProps {
  user: InternalUser;
  isCurrentUser: boolean;
  isOnlyAdmin: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRoleChange: (value: string) => void;
  onAvatarUpload: () => void;
  isUploadingAvatar: boolean;
  isAdminViewer: boolean;
  userBoardsInfo: Array<{ boardId: string; boardName: string; boardColor: string; isAdmin: boolean }>;
  allBoards: Array<{ id: string; name: string; color: string | null; is_active: boolean }>;
  allUserBoards: Array<{ user_id: string; board_id: string; is_board_admin: boolean }>;
  onToggleBoardAccess: (userId: string, boardId: string, hasAccess: boolean) => void;
  onToggleBoardAdmin: (userId: string, boardId: string, currentlyAdmin: boolean) => void;
  onInactivate: () => void;
  onRequestDelete: () => void;
  isSaving: boolean;
  onResendInvite: () => void;
  onGenerateAccessLink: () => void;
  isResendingInvite: boolean;
  isGeneratingLink: boolean;
}

function UserCard({
  user,
  isCurrentUser,
  isOnlyAdmin,
  isExpanded,
  onToggleExpand,
  onRoleChange,
  onAvatarUpload,
  isUploadingAvatar,
  isAdminViewer,
  userBoardsInfo,
  allBoards,
  allUserBoards,
  onToggleBoardAccess,
  onToggleBoardAdmin,
  onInactivate,
  onRequestDelete,
  isSaving,
  onResendInvite,
  onGenerateAccessLink,
  isResendingInvite,
  isGeneratingLink,
}: UserCardProps) {
  const displayRole = toDisplayRole(user.role);
  const meta = displayRole ? ROLE_META[displayRole] : null;
  const isAdminRole = displayRole === 'admin';
  // Bloqueia o seletor se o admin atual seria removido sendo o único.
  const lockSelector = isCurrentUser && isOnlyAdmin;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card className={isCurrentUser ? 'border-primary/50' : ''}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isAdminViewer && (
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAvatarUpload();
                    }}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate text-sm">{user.full_name}</span>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Você</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {meta ? (
                    <Badge className={`text-[10px] px-1.5 py-0 ${meta.badgeClass}`}>
                      <meta.icon className="h-2.5 w-2.5 mr-1" />
                      {meta.short}
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500">
                      <UserX className="h-2.5 w-2.5 mr-1" />
                      Sem papel definido
                    </Badge>
                  )}
                  {!isAdminRole && userBoardsInfo.length > 0 && (
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
            {/* Seletor de papel */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Papel:</span>
                {lockSelector && (
                  <span className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    Único admin — papel bloqueado
                  </span>
                )}
              </div>
              <Select
                value={displayRole ?? 'none'}
                onValueChange={onRoleChange}
                disabled={lockSelector || isSaving}
              >
                <SelectTrigger className="w-[170px] h-8 text-xs">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {DISPLAY_ROLES.map((role) => {
                    const m = ROLE_META[role];
                    const Icon = m.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                          <span>{m.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <UserX className="h-3.5 w-3.5 text-gray-400" />
                      <span>Sem acesso</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Acesso a fluxos (não exibido para Admin, que tem acesso total) */}
            {!isAdminRole && (
              <div className="py-3 space-y-2 border-b">
                <span className="text-sm font-medium">Acesso aos Fluxos:</span>
                <div className="space-y-1.5 mt-2">
                  {allBoards.map((board) => {
                    const userBoard = allUserBoards.find(
                      ub => ub.user_id === user.user_id && ub.board_id === board.id
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
                            onCheckedChange={() => onToggleBoardAccess(user.user_id, board.id, hasAccess)}
                          />
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: board.color || '#6b7280' }}
                          />
                          <span className="text-sm">
                            {board.name.replace('Fluxo de ', '').replace('Fluxo ', '')}
                          </span>
                        </div>

                        {hasAccess && (
                          <div className="flex items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Crown className="h-3 w-3 text-amber-500" />
                                  Gestor do fluxo
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Quando ativo, o usuário pode gerenciar este fluxo específico.
                              </TooltipContent>
                            </Tooltip>
                            <Switch
                              checked={isFlowAdmin}
                              onCheckedChange={() => onToggleBoardAdmin(user.user_id, board.id, isFlowAdmin)}
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

            {isAdminRole && (
              <div className="py-3 text-sm text-emerald-600 flex items-center gap-2 border-b">
                <Shield className="h-4 w-4" />
                Acesso total a todos os fluxos
              </div>
            )}

            {/* Ações */}
            {!isCurrentUser && isAdminViewer && (
              <div className="py-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Inativar ${user.full_name}? O usuário perderá todas as permissões.`)) {
                      onInactivate();
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
                    onRequestDelete();
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
}
