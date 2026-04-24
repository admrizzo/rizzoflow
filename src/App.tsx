import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ForceRefreshPrompt } from "@/components/layout/ForceRefreshPrompt";
import { usePermissions } from "@/hooks/usePermissions";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminFlow from "./pages/AdminFlow";
import ProviderPortal from "./pages/ProviderPortal";
import NotFound from "./pages/NotFound";
import Demo from "./pages/Demo";
import PropostaLocacao from "./pages/PropostaLocacao";
import CentralPropostas from "./pages/CentralPropostas";
import PropostaPublica from "./pages/PropostaPublica";

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

// Index component that handles redirects
function IndexRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Redirect based on auth state
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

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
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && !isAuthPasswordFlow()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Role-gated route. `allow` is a predicate over usePermissions().
function RoleRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow: (perms: ReturnType<typeof usePermissions>) => boolean;
}) {
  const { user, isLoading } = useAuth();
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
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ForceRefreshPrompt />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
