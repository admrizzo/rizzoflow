import { useInternalUsers, InternalUser } from '@/hooks/useInternalUsers';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
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
import {
  Users,
  Shield,
  UserCog,
  UserX,
  Briefcase,
  ClipboardList,
  Building2,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { AppRole } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserRolesManagerProps {
  open: boolean;
  onClose: () => void;
}

// Apenas os 4 papéis oficiais aparecem na interface.
// editor/viewer continuam existindo no backend como aliases legados,
// mas não são exibidos no seletor.
type DisplayRole = 'admin' | 'gestor' | 'corretor' | 'administrativo';

const DISPLAY_ROLES: DisplayRole[] = ['admin', 'gestor', 'corretor', 'administrativo'];

const ROLE_META: Record<DisplayRole, {
  label: string;
  description: string;
  icon: JSX.Element;
  badgeClass: string;
}> = {
  admin: {
    label: 'Admin',
    description: 'Acesso total. Gerencia usuários e fluxos.',
    icon: <Shield className="h-4 w-4 text-red-500" />,
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  gestor: {
    label: 'Gestor',
    description: 'Opera propostas, fluxos e documentos.',
    icon: <Briefcase className="h-4 w-4 text-purple-500" />,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  corretor: {
    label: 'Corretor',
    description: 'Gera e acompanha as próprias propostas.',
    icon: <Building2 className="h-4 w-4 text-emerald-600" />,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  administrativo: {
    label: 'Administrativo',
    description: 'Opera propostas, cards e checklists.',
    icon: <ClipboardList className="h-4 w-4 text-amber-600" />,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

/**
 * Mapeia roles legados (editor, viewer) para a representação visual mais próxima.
 * Isso só afeta a EXIBIÇÃO. Quando o admin salva, salva sempre um dos 4 oficiais.
 */
function toDisplayRole(role: AppRole | null): DisplayRole | null {
  if (!role) return null;
  if (role === 'editor') return 'gestor';   // alias legado
  if (role === 'viewer') return 'corretor'; // alias legado
  if (DISPLAY_ROLES.includes(role as DisplayRole)) return role as DisplayRole;
  return null;
}

export function UserRolesManager({ open, onClose }: UserRolesManagerProps) {
  const { user: currentUser } = useAuth();
  const { isAdmin } = usePermissions();
  const { users, isLoading, error, adminCount, setUserRole, removeUserRole } = useInternalUsers();

  const handleRoleChange = (userId: string, value: string) => {
    if (value === 'none') {
      removeUserRole.mutate({ userId });
    } else {
      setUserRole.mutate({ userId, role: value as AppRole });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Usuários do sistema
          </DialogTitle>
          <DialogDescription>
            Defina o papel de cada usuário interno. Apenas administradores podem fazer alterações.
          </DialogDescription>
        </DialogHeader>

        {!isAdmin ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">Acesso restrito</p>
            <p className="text-sm text-muted-foreground">
              Somente administradores podem gerenciar usuários.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4 h-[440px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive flex flex-col items-center gap-2">
                  <AlertTriangle className="h-10 w-10" />
                  <p className="font-medium">Não foi possível carregar a lista</p>
                  <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((u) => (
                    <UserRow
                      key={u.user_id}
                      user={u}
                      isCurrentUser={u.user_id === currentUser?.id}
                      isOnlyAdmin={u.role === 'admin' && adminCount <= 1}
                      onChange={(value) => handleRoleChange(u.user_id, value)}
                      isSaving={setUserRole.isPending || removeUserRole.isPending}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="pt-4 border-t space-y-3">
              <h4 className="text-sm font-medium">Níveis de Permissão</h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                {DISPLAY_ROLES.map((role) => {
                  const meta = ROLE_META[role];
                  return (
                    <div key={role} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                      <div className="mt-0.5">{meta.icon}</div>
                      <div>
                        <span className="font-medium text-foreground">{meta.label}</span>
                        <p>{meta.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface UserRowProps {
  user: InternalUser;
  isCurrentUser: boolean;
  isOnlyAdmin: boolean;
  onChange: (value: string) => void;
  isSaving: boolean;
}

function UserRow({ user, isCurrentUser, isOnlyAdmin, onChange, isSaving }: UserRowProps) {
  const displayRole = toDisplayRole(user.role);
  const meta = displayRole ? ROLE_META[displayRole] : null;
  const hasNoRole = !user.role;

  // O admin não pode rebaixar a si mesmo se for o único admin.
  // (O backend também bloqueia, mas evitamos a tentativa na UI.)
  const lockSelector = isCurrentUser && isOnlyAdmin;

  return (
    <Card className={isCurrentUser ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{user.full_name}</span>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">Você</Badge>
              )}
              {hasNoRole && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                  Sem papel definido
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </div>
            {user.created_at && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Cadastrado em {format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            )}
          </div>

          <Select
            value={displayRole ?? 'none'}
            onValueChange={onChange}
            disabled={lockSelector || isSaving}
          >
            <SelectTrigger className="w-[180px] shrink-0">
              <SelectValue placeholder="Selecionar papel" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {DISPLAY_ROLES.map((role) => {
                const m = ROLE_META[role];
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      {m.icon}
                      <span>{m.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-muted-foreground" />
                  <span>Sem acesso</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Papel atual:</span>
          {meta ? (
            <Badge variant="outline" className={`text-xs ${meta.badgeClass}`}>
              <span className="mr-1.5">{meta.icon}</span>
              {meta.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
              <UserX className="h-3 w-3 mr-1.5" />
              Sem acesso
            </Badge>
          )}
          {lockSelector && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Você é o único admin — papel bloqueado
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
