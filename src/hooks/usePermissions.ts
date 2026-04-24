import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';

/**
 * Hook centralizado de permissões baseado no role do usuário logado.
 *
 * Roles atuais:
 *  - admin           → acesso total
 *  - gestor          → opera propostas, fluxos, documentos. NÃO gerencia usuários.
 *  - corretor        → gera propostas e acompanha as suas. Acesso restrito.
 *  - administrativo  → opera propostas/cards/checklists. NÃO gerencia usuários nem fluxos.
 *
 * Roles legados ainda suportados como aliases (transição):
 *  - editor → tratado como gestor
 *  - viewer → tratado como corretor (mais restrito)
 *
 * Esta camada é usada APENAS para controle visual no frontend.
 * O fechamento real de RLS no banco será feito em etapa posterior.
 */
export function usePermissions() {
  const { roles, isLoading, user } = useAuth();

  const has = (role: AppRole) => roles.includes(role);

  const isAdmin = has('admin');
  const isGestor = has('gestor') || has('editor'); // editor = alias legado
  const isCorretor = has('corretor');
  const isAdministrativo = has('administrativo');
  const isViewerLegacy = has('viewer');

  // Tem qualquer papel reconhecido (usuário "ativo" no sistema)
  const hasAnyRole = isAdmin || isGestor || isCorretor || isAdministrativo || isViewerLegacy;

  // Capabilities de alto nível
  const canManageUsers = isAdmin;
  const canManageFlows = isAdmin;
  const canAccessCriticalSettings = isAdmin;

  const canViewAllProposals = isAdmin || isGestor || isAdministrativo;
  const canCreateProposal = isAdmin || isGestor || isCorretor || isAdministrativo;
  const canMoveCards = isAdmin || isGestor || isAdministrativo;
  const canViewDocuments = isAdmin || isGestor || isCorretor || isAdministrativo;
  const canDownloadDocuments = canViewDocuments;

  // Corretor só vê o que é dele (filtro aplicado pela camada de dados / UI)
  const seesOnlyOwnProposals = isCorretor && !isAdmin && !isGestor && !isAdministrativo;

  return {
    // estado
    isLoading,
    user,
    roles,
    hasAnyRole,

    // identidade de papel
    isAdmin,
    isGestor,
    isCorretor,
    isAdministrativo,

    // capabilities
    canManageUsers,
    canManageFlows,
    canAccessCriticalSettings,
    canViewAllProposals,
    canCreateProposal,
    canMoveCards,
    canViewDocuments,
    canDownloadDocuments,
    seesOnlyOwnProposals,
  };
}