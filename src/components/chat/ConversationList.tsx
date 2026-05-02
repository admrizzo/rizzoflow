 import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChatConversations } from "@/hooks/useChatConversations";
 import { useChat } from "./ChatProvider";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
 import { Search, MessageSquarePlus, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function ConversationList({ onSelect }: { onSelect?: (id: string) => void }) {
  const { user } = useAuth();
   const { activeConversationId, setActiveConversationId, close } = useChat();
  const { data: conversations = [], isLoading } = useChatConversations();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
   const [debouncedSearch, setDebouncedSearch] = useState("");
 
   // Debounce search
   useEffect(() => {
     const timer = setTimeout(() => {
       setDebouncedSearch(search);
     }, 300);
     return () => clearTimeout(timer);
   }, [search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) => (c.other_user_name || c.name || "").toLowerCase().includes(q) || (c.last_message || "").toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const { data: people = [] } = useQuery({
     queryKey: ["chat", "people", debouncedSearch],
    enabled: showNew,
    queryFn: async () => {
       let q = supabase.from("profiles").select("user_id, full_name, avatar_url, email").neq("user_id", user!.id).limit(50);
       const term = debouncedSearch.trim();
       if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
      const { data } = await q;
      return data || [];
    },
  });

  async function startDm(otherUserId: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm", { _other_user_id: otherUserId });
    if (error) {
      console.error(error);
      return;
    }
    const id = data as unknown as string;
    setActiveConversationId(id);
    setShowNew(false);
    setSearch("");
    onSelect?.(id);
  }

  return (
     <div className="flex h-full flex-col bg-background">
       <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Conversas</h3>
         <div className="flex items-center gap-1">
           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNew((v) => !v)} title="Nova conversa">
             {showNew ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
           </Button>
           <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={close}>
             <X className="h-4 w-4" />
           </Button>
         </div>
      </div>

       <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
             placeholder={showNew ? "Buscar por nome ou e-mail..." : "Buscar conversas..."}
             className="pl-8 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {showNew ? (
          <div className="py-1">
            {people.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma pessoa encontrada</p>
            )}
            {people.map((p) => (
              <button
                key={p.user_id}
                onClick={() => startDm(p.user_id)}
                 className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 text-left transition-colors"
              >
                 <Avatar className="h-10 w-10 border border-border shadow-sm">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(p.full_name)}</AvatarFallback>
                </Avatar>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate">{p.full_name}</p>
                   {p.email && <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>}
                 </div>
              </button>
            ))}
          </div>
        ) : isLoading ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
           <div className="px-4 py-12 text-center">
             <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
               <User className="h-6 w-6 text-muted-foreground" />
             </div>
             <p className="text-xs text-muted-foreground mb-4">Selecione uma conversa ou inicie uma nova.</p>
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
               Nova conversa
            </Button>
          </div>
        ) : (
           <div className="divide-y divide-border/50">
            {filtered.map((c) => {
              const display = c.other_user_name || c.name || "Conversa";
              const isActive = c.id === activeConversationId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    onSelect?.(c.id);
                  }}
                  className={cn(
                     "w-full flex items-start gap-3 px-4 py-3.5 hover:bg-accent/40 text-left transition-all border-l-2 border-transparent",
                     isActive && "bg-accent/50 border-l-primary shadow-sm z-10",
                  )}
                >
                   <Avatar className="h-11 w-11 shrink-0 border border-border/50">
                    {c.other_user_avatar && <AvatarImage src={c.other_user_avatar} alt={display} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(display)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate flex-1">{display}</span>
                      {c.last_message_at && (
                        <span className="text-[10.5px] text-muted-foreground shrink-0">
                          {formatDistanceToNowStrict(new Date(c.last_message_at), { locale: ptBR, addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {c.last_message || <span className="italic">Sem mensagens</span>}
                      </p>
                       {c.unread_count > 0 && !isActive && (
                         <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center shrink-0 shadow-sm">
                          {c.unread_count > 99 ? "99+" : c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}