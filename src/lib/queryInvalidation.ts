import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida todas as queries relacionadas a cards que afetam a Minha Fila.
 *
 * Centraliza a invalidação para evitar repetição: sempre que algo muda no
 * card (próxima ação, responsável, prazo, coluna, checklist, arquivamento)
 * a Minha Fila precisa ser atualizada imediatamente para refletir o estado novo.
 */
export function invalidateCardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['cards'] });
  queryClient.invalidateQueries({ queryKey: ['my-queue'] });
  // Modal aberto a partir da Minha Fila usa essa query para hidratar o card.
  // Sem invalidar aqui, alterações feitas dentro do modal não refletiriam
  // no próprio modal nem na fila imediatamente.
  queryClient.invalidateQueries({ queryKey: ['card-detail-from-queue'] });
}
