import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
};

export function useChatMessages(conversationId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["chat", "messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversationId) return [];
      const { data: msgs, error } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const senderIds = Array.from(new Set((msgs || []).map((m) => m.sender_id)));
      let profMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (senderIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", senderIds);
        for (const p of profs || []) profMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      }
      return (msgs || []).map((m) => ({
        ...m,
        sender_name: profMap[m.sender_id]?.full_name || null,
        sender_avatar: profMap[m.sender_id]?.avatar_url || null,
      }));
    },
  });

  // Realtime per-conversation
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-conv-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}