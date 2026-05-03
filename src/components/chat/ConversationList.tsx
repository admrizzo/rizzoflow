import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChatConversations } from "@/hooks/useChatConversations";
 import { useChat } from "./ChatProvider";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquarePlus, X, User, MessageSquare, Users, Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
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
  const { data: conversations = [], isLoading, refetch: refetchConversations } = useChatConversations();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "people" | "groups">("chats");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { toast } = useToast();

  // Group Creation State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredConversations = useMemo(() => {
    let base = conversations;
    if (activeTab === "groups") base = conversations.filter(c => c.type === "group");
    if (activeTab === "chats") base = conversations; // All recent for the main tab
    
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (c) => (c.other_user_name || c.name || "").toLowerCase().includes(q) || (c.last_message || "").toLowerCase().includes(q),
    );
  }, [conversations, search, activeTab]);

  const { data: people = [] } = useQuery({
    queryKey: ["chat", "people", debouncedSearch],
    enabled: activeTab === "people" || isCreatingGroup,
    queryFn: async () => {
      let q = supabase.from("profiles").select("user_id, full_name, avatar_url, email, department").neq("user_id", user!.id).limit(50);
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
    setActiveTab("chats");
    setSearch("");
    onSelect?.(id);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      toast({ title: "Nome obrigatório", description: "Dê um nome ao grupo", variant: "destructive" });
      return;
    }
    if (selectedUsers.length === 0) {
      toast({ title: "Sem participantes", description: "Selecione ao menos uma pessoa", variant: "destructive" });
      return;
    }

    setIsSubmittingGroup(true);
    try {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        _name: newGroupName.trim(),
        _participant_ids: selectedUsers
      });

      if (error) throw error;

      const id = data as string;
      await refetchConversations();
      setActiveConversationId(id);
      setIsCreatingGroup(false);
      setNewGroupName("");
      setSelectedUsers([]);
      setActiveTab("chats");
      onSelect?.(id);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao criar grupo", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingGroup(false);
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="flex h-full flex-col bg-background chat-conversation-list min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 shrink-0">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="chats" className="text-xs">Conversas</TabsTrigger>
            <TabsTrigger value="people" className="text-xs">Usuários</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">Grupos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-3 border-b border-border shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "people" ? "Buscar por nome ou e-mail..." : "Buscar..."}
            className="pl-8 h-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 text-xs"
          />
        </div>
        
        {activeTab === "groups" && (
          <Button 
            variant="outline" 
            className="w-full h-8 text-xs gap-2 border-dashed hover:border-primary/50 hover:bg-primary/5"
            onClick={() => setIsCreatingGroup(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Novo grupo
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {activeTab === "people" ? (
            people.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma pessoa encontrada</p>
            ) : (
              people.map((p) => {
                const hasConversation = conversations.some(c => c.other_user_id === p.user_id && c.type === "dm");
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
              })
            )
          ) : isLoading ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Carregando...</p>
          ) : filteredConversations.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                {activeTab === "groups" ? <Users className="h-6 w-6 text-muted-foreground" /> : <User className="h-6 w-6 text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {activeTab === "groups" ? "Nenhum grupo encontrado." : "Nenhuma conversa encontrada."}
              </p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => activeTab === "groups" ? setIsCreatingGroup(true) : setActiveTab("people")}>
                {activeTab === "groups" ? "Criar grupo" : "Buscar usuários"}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredConversations.map((c) => {
                const isGroup = c.type === "group";
                const display = isGroup ? (c.name || "Grupo") : (c.other_user_name || "Conversa");
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
                    <Avatar className={cn("h-10 w-10 shrink-0 border border-border/50", isGroup && "rounded-lg")}>
                      {isGroup ? (
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      ) : (
                        <>
                          {c.other_user_avatar && <AvatarImage src={c.other_user_avatar} alt={display} />}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(display)}</AvatarFallback>
                        </>
                      )}
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
        </div>
      </ScrollArea>

      {/* Create Group Dialog */}
      <Dialog open={isCreatingGroup} onOpenChange={(o) => !o && !isSubmittingGroup && setIsCreatingGroup(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Criar novo grupo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nome do grupo</label>
              <Input 
                value={newGroupName} 
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Contratos, Documentação..."
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Participantes ({selectedUsers.length})</label>
                <span className="text-[10px] text-muted-foreground">Selecione usuários abaixo</span>
              </div>
              
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar participantes..."
                  className="pl-7 h-7 text-xs bg-muted/30"
                />
              </div>

              <ScrollArea className="h-[200px] border rounded-md p-1">
                <div className="space-y-0.5">
                  {people.map((p) => (
                    <div 
                      key={p.user_id} 
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent/50 cursor-pointer transition-colors",
                        selectedUsers.includes(p.user_id) && "bg-primary/5"
                      )}
                      onClick={() => toggleUserSelection(p.user_id)}
                    >
                      <Checkbox 
                        checked={selectedUsers.includes(p.user_id)} 
                        onCheckedChange={() => toggleUserSelection(p.user_id)}
                        className="h-3.5 w-3.5"
                      />
                      <Avatar className="h-6 w-6 shrink-0">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-[8px]">{initials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{p.full_name}</p>
                        {p.department && <p className="text-[9px] text-muted-foreground truncate uppercase">{p.department}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCreatingGroup(false)} disabled={isSubmittingGroup}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateGroup} disabled={isSubmittingGroup || !newGroupName.trim() || selectedUsers.length === 0}>
              {isSubmittingGroup ? "Criando..." : "Criar grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
