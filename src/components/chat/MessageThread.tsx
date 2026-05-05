  import { useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
   import { Send, ArrowLeft, X, Paperclip, Image as ImageIcon, Mic, Smile, Download, FileIcon, Loader2, StopCircle, Trash2, Search, ChevronUp, ChevronDown, Check, CheckCheck } from "lucide-react";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
   import { useChat } from "./ChatProvider";
   import { isToday, isYesterday, isSameDay } from "date-fns";
  import { useChatAttachments, getChatAttachmentSignedUrl } from "@/hooks/useChatAttachments";
  import { Input } from "@/components/ui/input";
 function AttachmentPreview({ attachment }: { attachment: any }) {
   const [localUrl, setLocalUrl] = useState<string | null>(null);
   const [isDownloading, setIsDownloading] = useState(false);
 
   useEffect(() => {
     // For images and audio, we still use signed URLs for direct rendering if possible
     // but we'll fetch them as blobs for download to avoid blockages
     getChatAttachmentSignedUrl(attachment.storage_path).then(setLocalUrl);
     
     return () => {
       if (localUrl && localUrl.startsWith('blob:')) {
         URL.revokeObjectURL(localUrl);
       }
     };
   }, [attachment.storage_path]);
 
   const handleDownload = async (e: React.MouseEvent) => {
     e.preventDefault();
     if (isDownloading) return;
     
     setIsDownloading(true);
     try {
       const { data, error } = await supabase.storage
         .from('chat-attachments')
         .download(attachment.storage_path);
 
       if (error) throw error;
 
       const blobUrl = URL.createObjectURL(data);
       const link = document.createElement('a');
       link.href = blobUrl;
       link.download = attachment.file_name;
       link.rel = "noopener noreferrer";
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
     } catch (err) {
       console.error('Download error:', err);
       toast.error("Não foi possível baixar o anexo");
     } finally {
       setIsDownloading(false);
     }
   };
 
   if (attachment.attachment_type === 'image') {
     return (
       <div className="mt-2 group relative max-w-sm overflow-hidden rounded-lg border border-border/20 bg-muted/30 transition-all hover:border-border/40">
         {localUrl ? (
           <button onClick={handleDownload} className="block w-full text-left">
             <img 
               src={localUrl} 
               alt={attachment.file_name} 
               className="max-h-60 w-full object-cover transition-transform hover:scale-[1.02]"
             />
           </button>
         ) : (
           <div className="flex h-32 items-center justify-center">
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
           </div>
         )}
       </div>
     );
   }
 
   if (attachment.attachment_type === 'audio') {
     return (
       <div className="mt-2 w-full max-w-xs">
         {localUrl ? (
           <audio controls className="h-10 w-full" src={localUrl}>
             Seu navegador não suporta o elemento de áudio.
           </audio>
         ) : (
           <div className="flex items-center gap-2 rounded-lg border border-border/20 bg-background/50 p-2">
             <Loader2 className="h-4 w-4 animate-spin" />
             <span className="text-[10px]">Carregando áudio...</span>
           </div>
         )}
       </div>
     );
   }
 
   return (
     <div className="mt-1 flex items-center gap-2 rounded-lg border border-border/20 bg-background/50 p-2 text-[12px] transition-all hover:bg-background/80">
       <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
         <FileIcon className="h-4 w-4" />
       </div>
       <div className="flex-1 min-w-0">
         <p className="truncate font-medium leading-tight">{attachment.file_name}</p>
         <p className="text-[10px] text-muted-foreground">
           {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
         </p>
       </div>
       <Button 
         variant="ghost" 
         size="icon" 
         className="h-7 w-7 shrink-0" 
         onClick={handleDownload}
         disabled={isDownloading}
       >
         {isDownloading ? (
           <Loader2 className="h-4 w-4 animate-spin" />
         ) : (
           <Download className="h-4 w-4" />
         )}
       </Button>
     </div>
   );
 }
 

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

 function normalizeText(text: string) {
   return text
     .toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "");
 }
 
 export function MessageThread({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack?: () => void;
}) {
   const { user } = useAuth();
    const { close, onlineUserIds } = useChat();
  const qc = useQueryClient();
   const { data: messages = [], isLoading: messagesLoading } = useChatMessages(conversationId);
   const { byMessage, uploadAttachments, isLoading: attachmentsLoading } = useChatAttachments(conversationId);
   const isLoading = messagesLoading;
    const { data: conversations = [], refetch: refetchConversations } = useChatConversations();

   // participants real-time for read status
   useEffect(() => {
     if (!conversationId || !user) return;
     
     const channel = supabase
       .channel(`chat-participants-${conversationId}`)
       .on(
         'postgres_changes',
         {
           event: 'UPDATE',
           schema: 'public',
           table: 'chat_participants',
           filter: `conversation_id=eq.${conversationId}`
         },
         () => {
           // Quando um participante atualiza seu last_read_at, atualizamos a lista de conversas local
           refetchConversations();
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [conversationId, user, refetchConversations]);
 
   // Vamos carregar os participantes aqui para buscar o status de leitura
   const { data: participants = [] } = useQuery({
     queryKey: ['chat-participants-status', conversationId],
     enabled: !!conversationId,
     queryFn: async () => {
       const { data } = await supabase
         .from('chat_participants')
         .select('user_id, last_read_at')
         .eq('conversation_id', conversationId);
       return data || [];
     },
     refetchInterval: 10000, // Fallback
   });
 
   const isGroup = conv?.type === "group";
 
   const otherParticipantReadAt = useMemo(() => {
     if (!user || !participants.length || isGroup) return null;
     const other = participants.find(p => p.user_id !== user.id);
     return other?.last_read_at || null;
   }, [participants, user, isGroup]);
 
   const getMessageReadStatus = (messageCreatedAt: string) => {
     if (isGroup) return null;
     if (!otherParticipantReadAt) return 'sent';
     return new Date(otherParticipantReadAt) >= new Date(messageCreatedAt) ? 'read' : 'sent';
   };
  const conv = conversations.find((c) => c.id === conversationId);
    const [text, setText] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [sending, setSending] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchIndex, setSearchIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

   const searchResults = useMemo(() => {
     if (!searchQuery.trim() || !isSearchOpen) return [];
     const normalizedQuery = normalizeText(searchQuery);
     return messages.filter(m => {
       const contentMatch = m.content && normalizeText(m.content).includes(normalizedQuery);
       const attachments = byMessage[m.id] || [];
       const attachmentMatch = attachments.some(a => normalizeText(a.file_name).includes(normalizedQuery));
       return contentMatch || attachmentMatch;
     }).map(m => m.id);
   }, [searchQuery, messages, byMessage, isSearchOpen]);
 
   useEffect(() => {
     if (searchResults.length > 0) {
       setSearchIndex(searchResults.length - 1);
     } else {
       setSearchIndex(-1);
     }
   }, [searchResults.length]);
 
   useEffect(() => {
     if (searchIndex >= 0 && searchResults[searchIndex]) {
       const msgId = searchResults[searchIndex];
       const el = messageRefs.current[msgId];
       if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
     }
   }, [searchIndex, searchResults]);
 
   useEffect(() => {
     if (isSearchOpen && searchInputRef.current) {
       searchInputRef.current.focus();
     } else if (!isSearchOpen) {
       setSearchQuery("");
       setSearchIndex(-1);
     }
   }, [isSearchOpen]);
 
   const nextSearchResult = () => {
     if (searchResults.length === 0) return;
     setSearchIndex(prev => (prev + 1) % searchResults.length);
   };
 
   const prevSearchResult = () => {
     if (searchResults.length === 0) return;
     setSearchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
   };

  // Auto-resize textarea logic
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      // Base height 44px, max 120px
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

   useEffect(() => {
     adjustHeight();
   }, [text]);
 
   useEffect(() => {
     if (isRecording) {
       timerRef.current = setInterval(() => {
         setRecordingDuration(prev => {
           if (prev >= 300) { // 5 minutes limit
             stopRecording();
             return prev;
           }
           return prev + 1;
         });
       }, 1000);
     } else {
       if (timerRef.current) clearInterval(timerRef.current);
       setRecordingDuration(0);
     }
     return () => {
       if (timerRef.current) clearInterval(timerRef.current);
     };
   }, [isRecording]);
 
    // autoscroll on message change
    useLayoutEffect(() => {
      if (isSearchOpen && searchQuery.trim()) return;
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, conversationId, isSearchOpen, searchQuery]);

  // mark as read
  useEffect(() => {
    if (!user || !conversationId) return;
    const markAsRead = async () => {
      if (!user || !conversationId) return;
      
      const { error } = await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
        
      if (!error) {
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      }
    };

    markAsRead();
  }, [conversationId, user, messages, qc]);

 
   async function send() {
     const content = text.trim();
     if ((!content && selectedFiles.length === 0) || !user || sending) return;
     setSending(true);
     const filesToUpload = [...selectedFiles];
    setText("");
     try {
       const { data: msg, error } = await supabase
         .from("chat_messages")
         .insert({
           conversation_id: conversationId,
           sender_id: user.id,
           content,
         })
         .select()
         .single();
 
       if (error) throw error;
 
       if (filesToUpload.length > 0 && msg) {
         await uploadAttachments.mutateAsync({
           messageId: msg.id,
           conversationId,
           files: filesToUpload,
           uploadedBy: user.id,
         });
       }
 
       setText("");
       setSelectedFiles([]);
       adjustHeight();
       
      qc.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      } catch (err) {
        console.error(err);
        toast.error("Erro ao enviar mensagem");
      } finally {
        setSending(false);
      }
   }
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files || []);
     if (files.length + selectedFiles.length > 10) {
       toast.error("Máximo de 10 arquivos por envio");
       return;
     }
     const largeFiles = files.filter(f => f.size > 20 * 1024 * 1024);
     if (largeFiles.length > 0) {
       toast.error("Arquivos devem ter no máximo 20MB");
       return;
     }
     setSelectedFiles(prev => [...prev, ...files]);
   };
 
   const startRecording = async () => {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       const mediaRecorder = new MediaRecorder(stream);
       mediaRecorderRef.current = mediaRecorder;
       recordingChunksRef.current = [];
 
       mediaRecorder.ondataavailable = (e) => {
         if (e.data.size > 0) {
           recordingChunksRef.current.push(e.data);
         }
       };
 
       mediaRecorder.onstop = async () => {
         const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
         if (audioBlob.size > 0) {
           const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
           setSelectedFiles(prev => [...prev, audioFile]);
         }
         stream.getTracks().forEach(track => track.stop());
       };
 
       mediaRecorder.start();
       setIsRecording(true);
     } catch (err) {
       console.error("Microphone permission denied:", err);
       toast.error("Permissão do microfone negada ou não disponível.");
     }
   };
 
   const stopRecording = () => {
     if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
       mediaRecorderRef.current.stop();
     }
     setIsRecording(false);
   };
 
   const cancelRecording = () => {
     if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
       mediaRecorderRef.current.stop();
       recordingChunksRef.current = []; // Discard chunks
     }
     setIsRecording(false);
   };
 
   const formatDuration = (seconds: number) => {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${mins}:${secs.toString().padStart(2, '0')}`;
   };

   const displayName = conv?.other_user_name || conv?.name || (isLoading ? "Carregando..." : "Conversa");
   const isGroup = conv?.type === "group";
   const otherUserId = conv?.other_user_id;
    const isOnline = otherUserId ? onlineUserIds.has(otherUserId) : false;
 
   const formatDateSeparator = (date: Date) => {
     if (isToday(date)) return "Hoje";
     if (isYesterday(date)) return "Ontem";
     return format(date, "dd/MM/yyyy");
   };

   return (
     <div className="flex h-full flex-col bg-background relative min-h-0 chat-message-thread min-w-0 overflow-hidden">
       <header className="border-b border-border bg-muted/20 flex flex-col w-full shrink-0">
         <div className="w-full px-4 py-2 flex items-center gap-3">
           {onBack ? (
             <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={onBack}>
               <ArrowLeft className="h-4 w-4" />
             </Button>
           ) : null}
            <div className="relative">
              <Avatar className="h-7 w-7">
                {conv?.other_user_avatar && <AvatarImage src={conv.other_user_avatar} />}
                <AvatarFallback className="text-[11px] bg-primary/10 text-primary">{initials(displayName)}</AvatarFallback>
              </Avatar>
              {!isGroup && otherUserId && (
                 <span 
                   className={cn(
                     "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm",
                     isOnline ? "bg-emerald-500" : "bg-slate-300"
                   )} 
                 />
              )}
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-xs font-semibold truncate leading-none">{displayName}</p>
              {!isGroup && otherUserId && (
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", isSearchOpen && "bg-accent")} 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
         </div>
         {isSearchOpen && (
           <div className="px-4 py-2 border-t border-border flex items-center gap-2 bg-background/50 animate-in fade-in slide-in-from-top-1 duration-200">
             <div className="relative flex-1">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
               <Input
                 ref={searchInputRef}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Buscar na conversa..."
                 className="h-8 pl-8 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
               />
             </div>
             {searchQuery.trim() && (
               <div className="flex items-center gap-1 shrink-0">
                 <span className="text-[10px] text-muted-foreground px-1 font-medium min-w-[3.5rem] text-center">
                   {searchResults.length > 0 ? `${searchIndex + 1} de ${searchResults.length}` : '0 de 0'}
                 </span>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevSearchResult} disabled={searchResults.length === 0}>
                   <ChevronUp className="h-4 w-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextSearchResult} disabled={searchResults.length === 0}>
                   <ChevronDown className="h-4 w-4" />
                 </Button>
               </div>
             )}
             <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsSearchOpen(false)}>
               <X className="h-4 w-4" />
             </Button>
           </div>
         )}
       </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 scroll-smooth">
        <div className="w-full space-y-3 flex flex-col min-w-0">
          {isLoading && <p className="text-center text-xs text-muted-foreground py-8">Carregando...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda. Diga olá 👋</p>
        )}
           {messages.map((m, idx) => {
             const mine = m.sender_id === user?.id;
             const prev = messages[idx - 1];
             const showAvatar = !mine && (!prev || prev.sender_id !== m.sender_id);
             
             const currentDate = new Date(m.created_at);
             const prevDate = prev ? new Date(prev.created_at) : null;
             const showSeparator = !prevDate || !isSameDay(currentDate, prevDate);
 
              const isHighlighted = isSearchOpen && searchQuery.trim() && searchResults[searchIndex] === m.id;
              
              return (
                <div 
                  key={m.id} 
                  className={cn("space-y-3 transition-colors duration-500", isHighlighted && "bg-primary/5 rounded-lg -mx-2 px-2")}
                  ref={el => messageRefs.current[m.id] = el}
                >
                 {showSeparator && (
                   <div className="my-4 flex items-center gap-3">
                     <div className="h-px flex-1 bg-border" />
                     <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                       {formatDateSeparator(currentDate)}
                     </span>
                     <div className="h-px flex-1 bg-border" />
                   </div>
                 )}
                 <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
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
                       "min-w-0 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] rounded-xl px-3 py-2 text-[13px] shadow-sm",
                       mine
                         ? "bg-primary text-primary-foreground rounded-tr-none"
                         : "bg-muted/80 text-foreground rounded-tl-none border border-border/10",
                     )}
                   >
                      {m.content && (
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug">{m.content}</p>
                      )}
                      
                      {byMessage[m.id]?.map(att => (
                        <AttachmentPreview key={att.id} attachment={att} />
                      ))}
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-[10px] mt-1",
                        mine ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}>
                        <span>{format(new Date(m.created_at), "HH:mm", { locale: ptBR })}</span>
                        {mine && !isGroup && (
                          <span className="shrink-0">
                            {getMessageReadStatus(m.created_at) === 'read' ? (
                              <CheckCheck className="h-3 w-3 text-white" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      <div className="bg-background px-4 pt-2 pb-3 md:pb-4 flex flex-col shrink-0 border-t space-y-2">
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/60 px-2 py-1 rounded-md text-[10px] border border-border/40 group relative">
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button 
                  onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
 
        <TooltipProvider>
          <div className="flex flex-col gap-1 bg-muted/40 rounded-xl border border-border/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-sm w-full">
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
              rows={1}
              className="w-full bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-[13px] min-h-[44px] max-h-[120px] outline-none placeholder:text-muted-foreground/60 leading-normal"
            />
            
            <div className="flex items-center justify-between px-2 pb-2 min-h-[40px]">
              {isRecording ? (
                <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <span className="text-[11px] font-bold tabular-nums">Gravando {formatDuration(recordingDuration)}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          onClick={cancelRecording}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Cancelar</TooltipContent>
                    </Tooltip>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-600 hover:bg-red-50 transition-colors"
                      onClick={stopRecording}
                    >
                      <StopCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                 ) : (
                   <div className="flex items-center gap-1">
                     <input
                       type="file"
                       ref={fileInputRef}
                       className="hidden"
                       multiple
                       onChange={handleFileSelect}
                     />
                     <input
                       type="file"
                       ref={imageInputRef}
                       className="hidden"
                       multiple
                       accept="image/*"
                       onChange={handleFileSelect}
                     />
     
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                           onClick={() => fileInputRef.current?.click()}
                         >
                           <Paperclip className="h-4 w-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent side="top">Anexar arquivo</TooltipContent>
                     </Tooltip>
     
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                           onClick={() => imageInputRef.current?.click()}
                         >
                           <ImageIcon className="h-4 w-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent side="top">Anexar imagem</TooltipContent>
                     </Tooltip>
     
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                           onClick={startRecording}
                         >
                           <Mic className="h-4 w-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent side="top">Gravar áudio</TooltipContent>
                     </Tooltip>
   
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                           onClick={() => toast.info("Recurso em preparação")}
                         >
                           <Smile className="h-4 w-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent side="top">Emojis (Em breve)</TooltipContent>
                     </Tooltip>
                   </div>
                 )}
               
               <div className="flex items-center gap-2">
                <Button 
                  onClick={send} 
                   disabled={(!text.trim() && selectedFiles.length === 0) || sending} 
                  size="sm" 
                  className={cn(
                    "h-7 gap-1.5 px-3 rounded-full transition-all shadow-sm active:scale-95",
                    text.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="text-[11px] font-semibold">Enviar</span>
                  <Send className={cn("h-3 w-3", sending && "animate-pulse")} />
                </Button>
              </div>
            </div>
          </div>
        </TooltipProvider>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2 hidden md:block">
          <strong>Enter</strong> envia • <strong>Shift + Enter</strong> quebra linha
        </p>
      </div>
    </div>
  );
}