import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, AppRole } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';

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
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
          // Limpa caches sensíveis sem await dentro do listener
          queryClient.clear();
          return;
        }

        if (session?.user) {
          setIsLoading(true);
          // Defer fetching to avoid blocking
          setTimeout(() => {
            if (mounted) fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
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
