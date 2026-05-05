 import { useMemo } from "react";
 import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ChatConversationListItem = {
  id: string;
  type: "dm" | "group";
  name: string | null;
  updated_at: string;
  last_read_at: string;
  other_user_id: string | null;
  other_user_name: string | null;
  other_user_avatar: string | null;
   last_message_content: string | null;
   last_message_type: 'text' | 'image' | 'file' | 'audio' | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
};

 export function useChatConversations() {
   const { user } = useAuth();
   const query = useQuery({
     queryKey: ["chat", "conversations", user?.id],
     enabled: !!user,
     queryFn: async (): Promise<ChatConversationListItem[]> => {
      if (!user) return [];

      // 1) participações do usuário
      const { data: myParts, error: e1 } = await supabase
        .from("chat_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);
      if (e1) throw e1;
      if (!myParts || myParts.length === 0) return [];

      const ids = myParts.map((p) => p.conversation_id);
      const lastReadMap = new Map(myParts.map((p) => [p.conversation_id, p.last_read_at]));

      // 2) conversas
      const { data: convs, error: e2 } = await supabase
        .from("chat_conversations")
        .select("id, type, name, updated_at")
        .in("id", ids)
        .order("updated_at", { ascending: false });
      if (e2) throw e2;

      // 3) outros participantes (para DM)
      const { data: allParts, error: e3 } = await supabase
        .from("chat_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", ids);
      if (e3) throw e3;

      const otherIds = new Set<string>();
      const otherByConv = new Map<string, string>();
      for (const p of allParts || []) {
        if (p.user_id !== user.id) {
          otherByConv.set(p.conversation_id, p.user_id);
          otherIds.add(p.user_id);
        }
      }

      // 4) profiles
      let profiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (otherIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", Array.from(otherIds));
        for (const p of profs || []) profiles[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      }

       // 5) Mensagens e anexos para preview e unread
       const { data: msgs } = await supabase
         .from("chat_messages")
         .select(`
           conversation_id, 
           content, 
           created_at, 
           sender_id,
           chat_message_attachments (
             attachment_type
           )
         `)
         .in("conversation_id", ids)
         .order("created_at", { ascending: false });
 
       const lastMsgByConv = new Map<string, { content: string; created_at: string; sender_id: string; type: 'text' | 'image' | 'file' | 'audio' }>();
       const unreadByConv = new Map<string, number>();
 
       for (const m of msgs || []) {
         // Determinar o tipo da mensagem para o preview
         let type: 'text' | 'image' | 'file' | 'audio' = 'text';
         const attachments = m.chat_message_attachments as any[];
         if (attachments && attachments.length > 0) {
           // Se houver múltiplos, priorizamos o tipo mais "relevante" ou apenas o primeiro
           type = attachments[0].attachment_type || 'file';
         }
 
         if (!lastMsgByConv.has(m.conversation_id)) {
           lastMsgByConv.set(m.conversation_id, { 
             content: m.content, 
             created_at: m.created_at, 
             sender_id: m.sender_id,
             type: type
           });
         }
 
         // Unread count
         if (m.sender_id !== user.id) {
           const lr = lastReadMap.get(m.conversation_id);
           if (!lr || new Date(m.created_at) > new Date(lr)) {
             unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) || 0) + 1);
           }
         }
       }

      return (convs || []).map((c) => {
        const otherId = otherByConv.get(c.id) || null;
        const profile = otherId ? profiles[otherId] : null;
        const lm = lastMsgByConv.get(c.id);
        return {
          id: c.id,
          type: c.type as "dm" | "group",
          name: c.name,
          updated_at: c.updated_at,
          last_read_at: lastReadMap.get(c.id) || c.updated_at,
          other_user_id: otherId,
          other_user_name: profile?.full_name || null,
          other_user_avatar: profile?.avatar_url || null,
         last_message_content: lm?.content || null,
         last_message_type: lm?.type || null,
         last_message_at: lm?.created_at || c.updated_at,
         last_message_sender_id: lm?.sender_id || null,
          unread_count: unreadByConv.get(c.id) || 0,
        };
      });
     },
     staleTime: 10000,
   });
 
   const sortedData = useMemo(() => {
     if (!query.data) return [];
     return [...query.data].sort((a, b) => {
       const dateA = new Date(a.last_message_at || a.updated_at).getTime();
       const dateB = new Date(b.last_message_at || b.updated_at).getTime();
       return dateB - dateA;
     });
   }, [query.data]);
 
   return { ...query, data: sortedData };
 }