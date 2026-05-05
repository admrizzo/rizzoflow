  import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
 import { Database } from "@/integrations/supabase/types";
 
 type MessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
 type ParticipantRow = Database["public"]["Tables"]["chat_participants"]["Row"];

type ChatContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
   unreadTotal: number;
   onlineUserIds: Set<string>;
   refreshUnread: () => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
   const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
   const [unreadTotal, setUnreadTotal] = useState(0);
   const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const lastSoundTimeRef = useRef<number>(0);

  // Recompute unread count from conversations + last_read_at
  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadTotal(0);
      return;
    }
    const { data: parts } = await supabase
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    if (!parts || parts.length === 0) {
      setUnreadTotal(0);
      return;
    }
    const ids = parts.map((p) => p.conversation_id);
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("conversation_id, created_at, sender_id")
      .in("conversation_id", ids)
      .neq("sender_id", user.id);
    if (!msgs) {
      setUnreadTotal(0);
      return;
    }
    const lastReadMap = new Map(parts.map((p) => [p.conversation_id, p.last_read_at]));
    let total = 0;
    for (const m of msgs) {
      const lr = lastReadMap.get(m.conversation_id);
      if (!lr || new Date(m.created_at) > new Date(lr)) total += 1;
    }
    setUnreadTotal(total);
  }, [user]);

  useEffect(() => {
    refreshUnread();
   }, [refreshUnread, lastUpdate]);

   // Presence tracking channel
   useEffect(() => {
     if (!user) return;
     
     const presenceChannel = supabase.channel("online-users");
 
     presenceChannel
       .on("presence", { event: "sync" }, () => {
         const state = presenceChannel.presenceState();
         const onlineIds = new Set<string>();
         Object.values(state).forEach((presences: any) => {
           presences.forEach((p: any) => {
             if (p.user_id) onlineIds.add(p.user_id);
           });
         });
         setOnlineUserIds(onlineIds);
       })
       .subscribe(async (status) => {
         if (status === "SUBSCRIBED") {
           await presenceChannel.track({
             user_id: user.id,
             online_at: new Date().toISOString(),
           });
         }
       });
 
     return () => {
       presenceChannel.unsubscribe();
     };
   }, [user]);
 
   const playNotificationSound = useCallback(() => {
     const now = Date.now();
     if (now - lastSoundTimeRef.current < 2000) return;
     lastSoundTimeRef.current = now;
 
     const audio = new Audio("/chat-notification.mp3");
     audio.play().catch(() => {
       // Autoplay blocked fallback or file missing
       try {
         const context = new (window.AudioContext || (window as any).webkitAudioContext)();
         const oscillator = context.createOscillator();
         const gain = context.createGain();
         oscillator.connect(gain);
         gain.connect(context.destination);
         oscillator.type = "sine";
         oscillator.frequency.setValueAtTime(880, context.currentTime);
         oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1);
         gain.gain.setValueAtTime(0.1, context.currentTime);
         gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
         oscillator.start();
         oscillator.stop(context.currentTime + 0.1);
       } catch (e) {
         // Silent fail
       }
     });
   }, []);
 
   // Messages and notifications channel
   useEffect(() => {
     if (!user) return;
     
     const msgChannel = supabase.channel("chat-messages");
 
     msgChannel
       .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
         const newMessage = payload.new as MessageRow;
         setLastUpdate(Date.now());
         
         if (newMessage && newMessage.conversation_id) {
           qc.invalidateQueries({ queryKey: ["chat", "messages", newMessage.conversation_id] });
           
           // Sound logic
           if (newMessage.sender_id !== user.id) {
             // Check if user is participant (security/filter)
             const { data: participation } = await supabase
               .from("chat_participants")
               .select("id")
               .eq("conversation_id", newMessage.conversation_id)
               .eq("user_id", user.id)
               .maybeSingle();
 
             if (participation) {
               // Play sound if chat is closed OR active conversation is different
               if (!isOpen || activeConversationId !== newMessage.conversation_id) {
                 playNotificationSound();
               }
             }
           }
         }
         qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
       })
       .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_participants" }, (payload) => {
         const update = payload.new as ParticipantRow;
         if (update.user_id === user.id) {
           refreshUnread();
         }
         qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
       })
       .subscribe();
 
     return () => {
       msgChannel.unsubscribe();
     };
   }, [user, refreshUnread, qc, isOpen, activeConversationId, playNotificationSound]);

  const value = useMemo<ChatContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
       activeConversationId,
       setActiveConversationId,
       unreadTotal,
        onlineUserIds,
       refreshUnread,
     }),
      [isOpen, activeConversationId, unreadTotal, onlineUserIds, refreshUnread],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}