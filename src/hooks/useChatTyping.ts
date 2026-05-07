import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useChatTyping(conversationId: string | null) {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});

  useEffect(() => {
    if (!conversationId || !user) return;

    const channelName = `typing:${conversationId}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId === user.id) return;

        setTypingUsers((prev) => ({
          ...prev,
          [payload.userId]: { name: payload.userName, timestamp: Date.now() },
        }));
      })
      .subscribe();

    const cleanupInterval = setInterval(() => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        let changed = false;
        const now = Date.now();
        Object.keys(next).forEach((uid) => {
          if (now - next[uid].timestamp > 4000) {
            delete next[uid];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [conversationId, user]);

  const sendTyping = () => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: user.id,
        userName: profile?.full_name || user.email?.split("@")[0] || "Usuário",
      },
    });
  };

  return {
    typingUsers: Object.values(typingUsers).map((u) => u.name),
    sendTyping,
  };
}
