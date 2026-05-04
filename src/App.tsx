import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ForceRefreshPrompt } from "@/components/layout/ForceRefreshPrompt";
import { usePermissions } from "@/hooks/usePermissions";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PropostaLocacao from "./pages/PropostaLocacao";

// Code splitting: rotas pesadas viram chunks separados.
// Carregamento sob demanda evita custo no bundle inicial pós-login.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MinhaFila = lazy(() => import("./pages/MinhaFila"));
const CentralPropostas = lazy(() => import("./pages/CentralPropostas"));
const AdminFlow = lazy(() => import("./pages/AdminFlow"));
const PropostaPublica = lazy(() => import("./pages/PropostaPublica"));
const ProviderPortal = lazy(() => import("./pages/ProviderPortal"));
const Demo = lazy(() => import("./pages/Demo"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const DesignPreview = lazy(() => import("./pages/DesignPreview"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30s default
      gcTime: 300000, // 5 min cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function needsPasswordReset(profile?: { must_change_password?: boolean } | null): boolean {
  try {
    if (sessionStorage.getItem('rizzo:needs-password-reset') === '1') return true;
  } catch {
    // ignore
  }
  // Fonte da verdade persistente: a flag em profiles. Garante que o bloqueio
  // sobreviva a fechar/abrir aba ou trocar de dispositivo.
  return !!profile?.must_change_password;
}

// Index component that handles redirects
function IndexRedirect() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Sessão de recovery/invite: NUNCA entra direto no sistema.
  if (user && needsPasswordReset(profile)) {
    return <Navigate to="/redefinir-senha" replace />;
  }

  // Redirect based on auth state
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Bloqueia acesso ao app até a senha ser definida.
  if (needsPasswordReset(profile)) {
    return <Navigate to="/redefinir-senha" replace />;
  }

  return <>{children}</>;
}

// Public route that redirects if already logged in
function isAuthPasswordFlow() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const type = params.get('type') || hashParams.get('type');
  return params.get('invite') === '1' || type === 'invite' || type === 'recovery';
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Em fluxo de recovery/invite, manda para a página dedicada de senha.
  if (user && (needsPasswordReset(profile) || isAuthPasswordFlow())) {
    return <Navigate to="/redefinir-senha" replace />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Mostra o Chat global apenas em rotas autenticadas internas.
function GlobalChat() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading || !user) return null;
  if (needsPasswordReset(profile)) return null;
  const path = location.pathname;
  // Rotas públicas / fluxos onde o chat não deve aparecer
  const hidden =
    path.startsWith("/auth") ||
    path.startsWith("/demo") ||
    path.startsWith("/proposta/") ||
    path.startsWith("/prestador/") ||
    path.startsWith("/redefinir-senha") ||
    path.startsWith("/design-preview");
  if (hidden) return null;
  return <ChatLauncher />;
}

// Role-gated route. `allow` is a predicate over usePermissions().
function RoleRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow: (perms: ReturnType<typeof usePermissions>) => boolean;
}) {
  const { user, profile, isLoading } = useAuth();
  const perms = usePermissions();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needsPasswordReset(profile)) {
    return <Navigate to="/redefinir-senha" replace />;
  }

  if (!allow(perms)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary label="app">
        <BrowserRouter>
          <AuthProvider>
            <ChatProvider>
              <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<IndexRedirect />} />
              <Route
                path="/auth"
                element={
                  <PublicRoute>
                    <Auth />
                  </PublicRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-flow"
                element={
                  <RoleRoute allow={(p) => p.canManageFlows}>
                    <AdminFlow />
                  </RoleRoute>
                }
              />
              <Route path="/prestador/:token" element={<ProviderPortal />} />
              <Route
                path="/proposta-locacao"
                element={
                  <ProtectedRoute>
                    <PropostaLocacao />
                  </ProtectedRoute>
                }
              />
              <Route path="/demo" element={<Demo />} />
              <Route
                path="/design-preview"
                element={
                  <RoleRoute allow={(p) => p.isAdmin}>
                    <DesignPreview />
                  </RoleRoute>
                }
              />
              <Route
                path="/redefinir-senha"
                element={<RedefinirSenha />}
              />
              {/*
                Token público único da proposta (UUID) — caminho oficial.
                A mesma página aceita também codigo_robust como fallback p/ links antigos
                (o componente detecta o formato do parâmetro automaticamente).
              */}
              <Route path="/proposta/:proposalToken" element={<PropostaPublica />} />
              <Route
                path="/central-propostas"
                element={
                  <RoleRoute allow={(p) => p.canViewAllProposals}>
                    <CentralPropostas />
                  </RoleRoute>
                }
              />
              <Route
                path="/minha-fila"
                element={
                  <RoleRoute allow={(p) => p.hasAnyRole}>
                    <MinhaFila />
                  </RoleRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
              </Suspense>
              <ForceRefreshPrompt />
              <GlobalChat />
            </ChatProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
