import { useEffect, useRef, useState } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export function MessageThread({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: messages = [], isLoading } = useChatMessages(conversationId);
  const { data: conversations = [] } = useChatConversations();
  const conv = conversations.find((c) => c.id === conversationId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, conversationId]);

  // mark as read
  useEffect(() => {
    if (!user || !conversationId) return;
    supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      });
  }, [conversationId, user, messages.length, qc]);

  async function send() {
    const content = text.trim();
    if (!content || !user || sending) return;
    setSending(true);
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });
    setSending(false);
    if (error) {
      console.error(error);
      setText(content);
    } else {
      qc.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    }
  }

  const displayName = conv?.other_user_name || conv?.name || "Conversa";

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-8 w-8">
          {conv?.other_user_avatar && <AvatarImage src={conv.other_user_avatar} />}
          <AvatarFallback className="text-[11px] bg-primary/10 text-primary">{initials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">
            {conv?.type === "group" ? "Grupo" : "Mensagem direta"}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && <p className="text-center text-xs text-muted-foreground py-8">Carregando...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda. Diga olá 👋</p>
        )}
        {messages.map((m, idx) => {
          const mine = m.sender_id === user?.id;
          const prev = messages[idx - 1];
          const showAvatar = !mine && (!prev || prev.sender_id !== m.sender_id);
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && (
                <div className="w-7 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-7 w-7">
                      {m.sender_avatar && <AvatarImage src={m.sender_avatar} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {initials(m.sender_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-[0_1px_2px_rgba(20,30,40,0.04)]",
                  mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                <p
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {format(new Date(m.created_at), "HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escreva uma mensagem... (Enter envia, Shift+Enter quebra linha)"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
          />
          <Button onClick={send} disabled={!text.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}