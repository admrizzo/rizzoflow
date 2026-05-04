import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AppSettings {
  id: string;
  force_refresh_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useForceRefresh() {
  const { user, isAdmin } = useAuth();
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const queryClient = useQueryClient();
  
  // Store when the user loaded the page
  const pageLoadTime = useRef(new Date().toISOString());

  // Check for force refresh on mount and subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const checkForceRefresh = async () => {
      const isDev = import.meta.env.DEV;
      if (isDev) console.log('[ForceRefresh] Checking for force refresh, pageLoadTime:', pageLoadTime.current);
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('force_refresh_at')
        .eq('id', 'main')
        .single();

      if (error) {
        if (isDev) console.error('[ForceRefresh] Error fetching app_settings:', error);
        return;
      }

      if (isDev) console.log('[ForceRefresh] Received data:', data);

      if (data?.force_refresh_at) {
        const forceTime = new Date(data.force_refresh_at);
        const loadTime = new Date(pageLoadTime.current);
        
        if (isDev) console.log('[ForceRefresh] Comparing:', { forceTime: forceTime.toISOString(), loadTime: loadTime.toISOString(), shouldRefresh: forceTime > loadTime });
        
        if (forceTime > loadTime) {
          if (isDev) console.log('[ForceRefresh] Showing refresh prompt');
          setShowRefreshPrompt(true);
        }
      }
    };

    checkForceRefresh();

    const isDev = import.meta.env.DEV;
    if (isDev) console.log('[ForceRefresh] Subscribing to realtime channel');
    
    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'id=eq.main',
        },
        (payload) => {
          if (isDev) console.log('[ForceRefresh] Realtime update received:', payload);
          const newSettings = payload.new as AppSettings;
          if (newSettings.force_refresh_at) {
            const forceTime = new Date(newSettings.force_refresh_at);
            const loadTime = new Date(pageLoadTime.current);
            
            if (isDev) console.log('[ForceRefresh] Realtime comparing:', { forceTime: forceTime.toISOString(), loadTime: loadTime.toISOString() });
            
            if (forceTime > loadTime) {
              if (isDev) console.log('[ForceRefresh] Showing refresh prompt from realtime');
              setShowRefreshPrompt(true);
            }
          }
        }
      )
      .subscribe((status) => {
        if (isDev) console.log('[ForceRefresh] Subscription status:', status);
      });

    return () => {
      if (isDev) console.log('[ForceRefresh] Cleaning up channel');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mutation to trigger force refresh for all users
  const triggerForceRefresh = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('app_settings')
        .update({
          force_refresh_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', 'main');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });
    },
  });

  const dismissPrompt = useCallback(() => {
    setShowRefreshPrompt(false);
  }, []);

  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    showRefreshPrompt,
    dismissPrompt,
    refreshPage,
    triggerForceRefresh,
    isAdmin,
  };
}
