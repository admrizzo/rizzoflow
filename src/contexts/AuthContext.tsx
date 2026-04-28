import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, AppRole } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Limpa qualquer resíduo de sessão Supabase do storage local.
 * Usado quando detectamos sessão inválida/corrompida ou erro de rede
 * impedindo refresh de token.
 */
function clearSupabaseStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase.auth')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase.auth')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

/**
 * Heurística: o erro veio de falha de rede/token e deve invalidar a sessão?
 */
function isAuthFatalError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as { message?: string })?.message?.toLowerCase?.() ?? '';
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('refresh token') ||
    msg.includes('invalid refresh') ||
    msg.includes('jwt') ||
    msg.includes('invalid session') ||
    msg.includes('session_not_found') ||
    msg.includes('not authenticated')
  );
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isEditor: boolean;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    // Track which user we've already fetched profile/roles for, so events
    // like TOKEN_REFRESHED (disparado ao voltar para a aba) não recarreguem
    // tudo e desmontem componentes (ex.: card aberto fechando sozinho).
    let loadedUserId: string | null = null;
    // Detecta logo de cara se a URL atual é um link de recovery/invite
    // (hash com type=recovery / type=invite, ou query ?invite=1 / ?type=...).
    // Nesse caso, marca a flag ANTES do Supabase consumir o hash, para
    // garantir que o usuário caia em /redefinir-senha mesmo após refresh.
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const t = search.get('type') || hash.get('type');
      if (search.get('invite') === '1' || t === 'recovery' || t === 'invite') {
        sessionStorage.setItem('rizzo:needs-password-reset', '1');
      }
    } catch {
      // ignore
    }
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        // Sessão de recuperação de senha do Supabase: o usuário NÃO deve
        // entrar no sistema antes de definir uma nova senha.
        if (event === 'PASSWORD_RECOVERY') {
          try {
            sessionStorage.setItem('rizzo:needs-password-reset', '1');
          } catch {
            // ignore
          }
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
          loadedUserId = null;
          try {
            sessionStorage.removeItem('rizzo:needs-password-reset');
          } catch {
            // ignore
          }
          // Limpa caches sensíveis sem await dentro do listener
          queryClient.clear();
          return;
        }

        if (session?.user) {
          // Só refazer fetch (e mostrar loading) quando o usuário muda
          // de fato — não em TOKEN_REFRESHED, USER_UPDATED, etc.
          // Isso evita desmontar a árvore ao voltar para a aba.
          if (loadedUserId !== session.user.id) {
            loadedUserId = session.user.id;
            setIsLoading(true);
            // Defer fetching to avoid blocking
            setTimeout(() => {
              if (mounted) fetchUserData(session.user.id);
            }, 0);
          }
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
          loadedUserId = null;
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      // Se houver erro ao obter a sessão (token inválido/expirado/corrompido),
      // limpa tudo para evitar estado "logado fantasma".
      if (error) {
        console.warn('Sessão inválida detectada, limpando:', error.message);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // ignora
        }
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setIsLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadedUserId = session.user.id;
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (rolesData) {
        setRoles(rolesData.map(r => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (_email: string, _password: string, _fullName: string) => {
    // Cadastro público desabilitado: este sistema é por convite (admin → usuário).
    return {
      error: new Error('Cadastro público desabilitado. Solicite um convite ao administrador.'),
    };
  };

  const signOut = async () => {
    // Tenta encerrar a sessão no servidor, mas não bloqueia o logout local
    // se a sessão já estiver inválida/expirada (evita travar em 403 session_not_found).
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('signOut error (ignorado):', err);
    }

    // Limpa estado local imediatamente.
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setIsLoading(false);

    // Defesa em profundidade: remove qualquer token Supabase remanescente do localStorage.
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase.auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Erro ao limpar localStorage:', err);
    }

    // Limpa todo o cache do React Query (usuários internos, permissões, listas).
    queryClient.clear();

    // Redireciona forçando recarga para garantir que nenhum estado em memória sobrevive.
    window.location.replace('/auth');
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  // "isEditor" representa hoje a CAPACIDADE OPERACIONAL de editar cards,
  // checklists, andamento e propostas. Inclui:
  //  - admin           → acesso total
  //  - gestor          → opera fluxos e propostas
  //  - administrativo  → opera cards/checklists/documentos
  //  - editor          → alias legado (mantido durante a transição)
  // Corretor NÃO entra aqui: continua restrito apenas às próprias propostas.
  const isEditor =
    isAdmin ||
    hasRole('editor') ||
    hasRole('gestor') ||
    hasRole('administrativo');

  const refreshProfile = async () => {
    if (user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }
    }
  };

  const refreshRoles = async () => {
    if (!user?.id) return;
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    if (rolesData) {
      setRoles(rolesData.map((r) => r.role as AppRole));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        signIn,
        signUp,
        signOut,
        hasRole,
        isAdmin,
        isEditor,
        refreshProfile,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
