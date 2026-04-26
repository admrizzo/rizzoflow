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
}
