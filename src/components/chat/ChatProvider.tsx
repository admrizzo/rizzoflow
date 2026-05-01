import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type ChatContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  unreadTotal: number;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

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
  }, [refreshUnread]);

  // Realtime: refresh on any new message or participant update
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        refreshUnread();
        qc.invalidateQueries({ queryKey: ["chat", "messages"] });
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_participants" }, () => {
        refreshUnread();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUnread, qc]);

  const value = useMemo<ChatContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      activeConversationId,
      setActiveConversationId,
      unreadTotal,
    }),
    [isOpen, activeConversationId, unreadTotal],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}