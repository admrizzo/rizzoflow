 import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
 import { Send, ArrowLeft, X, Paperclip, Image as ImageIcon, Mic, Smile } from "lucide-react";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
 import { useChat } from "./ChatProvider";

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
   const { close } = useChat();
  const qc = useQueryClient();
  const { data: messages = [], isLoading } = useChatMessages(conversationId);
  const { data: conversations = [] } = useChatConversations();
  const conv = conversations.find((c) => c.id === conversationId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
   const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea logic
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      // Base height 44px, max 120px (about 4-5 lines)
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 96), 220);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);
 
   // autoscroll on message change
   useLayoutEffect(() => {
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

   const displayName = conv?.other_user_name || conv?.name || (isLoading ? "Carregando..." : "Conversa");

  return (
     <div className="flex h-full flex-col bg-background relative min-h-0">
      <header className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-3">
         {onBack ? (
           <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
         ) : null}
        <Avatar className="h-8 w-8">
          {conv?.other_user_avatar && <AvatarImage src={conv.other_user_avatar} />}
          <AvatarFallback className="text-[11px] bg-primary/10 text-primary">{initials(displayName)}</AvatarFallback>
        </Avatar>
         <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">
            {conv?.type === "group" ? "Grupo" : "Mensagem direta"}
          </p>
        </div>
      </header>

       <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                 <div className="w-8 shrink-0">
                  {showAvatar && (
                     <Avatar className="h-8 w-8 border border-background shadow-sm">
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
                   "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] shadow-sm",
               mine ? "bg-primary text-primary-foreground rounded-tr-none shadow-md" : "bg-muted/80 text-foreground rounded-tl-none border border-border/20",
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

      <div className="border-t border-border bg-background px-4 py-3 md:pb-6">
        <TooltipProvider>
          <div className="flex flex-col gap-1 bg-muted/40 rounded-2xl border border-border/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escreva sua mensagem..."
              rows={3}
              className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm min-h-[96px] outline-none placeholder:text-muted-foreground/60 leading-relaxed"
            />
            
            <div className="flex items-center justify-between px-2.5 pb-2.5">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-50 cursor-not-allowed"
                      onClick={() => toast.info("Envio de arquivos será ativado em breve.")}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Anexar arquivo (Em breve)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-50 cursor-not-allowed"
                      onClick={() => toast.info("Envio de imagens será ativado em breve.")}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Anexar imagem (Em breve)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-50 cursor-not-allowed"
                      onClick={() => toast.info("Envio de áudio será ativado em breve.")}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Gravar áudio (Em breve)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-50 cursor-not-allowed"
                      onClick={() => toast.info("Seletor de emojis será ativado em breve.")}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Emojis (Em breve)</TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={send} 
                  disabled={!text.trim() || sending} 
                  size="sm" 
                  className={cn(
                    "h-8 gap-2 px-4 rounded-full transition-all shadow-md active:scale-95",
                    text.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="text-xs font-semibold">Enviar</span>
                  <Send className={cn("h-3.5 w-3.5", sending && "animate-pulse")} />
                </Button>
              </div>
            </div>
          </div>
        </TooltipProvider>
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2 hidden md:block">
          <strong>Enter</strong> envia • <strong>Shift + Enter</strong> quebra linha
        </p>
      </div>
    </div>
  );
}