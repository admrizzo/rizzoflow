import { useMemo, useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChatConversations } from "@/hooks/useChatConversations";
 import { useChat } from "./ChatProvider";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
 import { Search, MessageSquarePlus, X, User, MessageSquare } from "lucide-react";
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
    <div className="flex h-full flex-col bg-background chat-conversation-list min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 shrink-0">
        <Tabs value={showNew ? "people" : "chats"} onValueChange={(v) => setShowNew(v === "people")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="chats" className="text-xs">Conversas</TabsTrigger>
            <TabsTrigger value="people" className="text-xs">Usuários</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

       <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
             placeholder={showNew ? "Buscar por nome ou e-mail..." : "Buscar conversas..."}
              className="pl-8 h-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {showNew ? (
          <div className="py-1">
            {people.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma pessoa encontrada</p>
            )}
             {people.map((p) => {
               const hasConversation = conversations.some(c => c.other_user_id === p.user_id);
               return (
                 <button
                   key={p.user_id}
                   onClick={() => startDm(p.user_id)}
                   className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 text-left transition-colors relative group"
                 >
                   <Avatar className="h-9 w-9 border border-border/50 shadow-sm shrink-0">
                     {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
                     <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(p.full_name)}</AvatarFallback>
                   </Avatar>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between gap-1">
                       <p className="text-xs font-semibold truncate text-foreground">{p.full_name}</p>
                       {hasConversation && (
                         <MessageSquare className="h-3 w-3 text-primary/40 shrink-0" />
                       )}
                     </div>
                     {p.email && <p className="text-[10px] text-muted-foreground truncate opacity-80">{p.email}</p>}
                   </div>
                 </button>
               );
             })}
          </div>
        ) : isLoading ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
           <div className="px-4 py-12 text-center">
             <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
               <User className="h-6 w-6 text-muted-foreground" />
             </div>
             <p className="text-xs text-muted-foreground mb-4">Selecione uma conversa ou inicie uma nova.</p>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNew(true)}>
               Buscar usuários
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
                    "w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/20 text-left transition-all border-l-2 border-transparent relative",
                    isActive ? "bg-accent/30 border-l-primary" : "hover:border-l-border/30",
                  )}
                >
                   <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                    {c.other_user_avatar && <AvatarImage src={c.other_user_avatar} alt={display} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(display)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <span className={cn("text-sm font-semibold truncate flex-1", isActive ? "text-primary" : "text-foreground")}>{display}</span>
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