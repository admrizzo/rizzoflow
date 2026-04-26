import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';

const LAST_SYNC_KEY = 'rizzoflow:last-sync-at';

/**
 * Sincronização operacional do sistema:
 *  - dispara a Edge Function `sync-properties` (carga de imóveis do CRM)
 *  - invalida as queries locais que dependem desses dados
 *
 * Permissões: admin, gestor e administrativo.
 * Corretor não dispara sincronização global.
 */
export function useSync() {
  const queryClient = useQueryClient();
  const { isAdmin, isGestor, isAdministrativo } = usePermissions();
  const canSync = isAdmin || isGestor || isAdministrativo;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_SYNC_KEY);
  });

  const sync = useCallback(async () => {
    if (isSyncing || !canSync) return { success: false as const, error: 'forbidden' };
    setIsSyncing(true);
    try {
      // 1. Sincronização remota: imóveis do CRM via edge function
      const { data, error } = await supabase.functions.invoke('sync-properties');
      if (error) throw error;

      // 2. Invalidar queries locais que dependem dos dados sincronizados
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['cards'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['card-detail-from-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['proposal-links'] }),
        queryClient.invalidateQueries({ queryKey: ['proposals'] }),
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
        queryClient.invalidateQueries({ queryKey: ['columns'] }),
      ]);

      const now = new Date().toISOString();
      setLastSyncedAt(now);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, now);
      }
      return { success: true as const, data };
    } catch (err) {
      console.error('[useSync] sync error:', err);
      return { success: false as const, error: err };
    } finally {
      setIsSyncing(false);
    }
  }, [canSync, isSyncing, queryClient]);

  return { sync, isSyncing, canSync, lastSyncedAt };
}

/**
 * Formata o horário da última sincronização para exibição compacta.
 * Hoje → "hoje às HH:MM"
 * Ontem → "ontem às HH:MM"
 * Outros → "DD/MM às HH:MM"
 */
export function formatLastSync(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (sameDay) return `hoje às ${hh}:${mm}`;
  if (isYesterday) return `ontem às ${hh}:${mm}`;
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} às ${hh}:${mm}`;
}