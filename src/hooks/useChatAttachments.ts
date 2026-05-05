 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useEffect } from "react";
 import { Database } from "@/integrations/supabase/types";
 
 export type ChatAttachment = Database["public"]["Tables"]["chat_message_attachments"]["Row"];
 
 export function useChatAttachments(conversationId?: string) {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   const { data: attachments = [], isLoading } = useQuery({
     queryKey: ['chat-attachments', conversationId],
     enabled: !!conversationId,
     queryFn: async (): Promise<ChatAttachment[]> => {
       if (!conversationId) return [];
       const { data, error } = await supabase
         .from('chat_message_attachments')
         .select('*')
         .eq('conversation_id', conversationId)
         .order('created_at', { ascending: true });
 
       if (error) throw error;
       return (data || []) as ChatAttachment[];
     },
   });
 
   // Realtime updates for chat attachments
   useEffect(() => {
     if (!conversationId) return;
 
     const channel = supabase
       .channel(`chat-attachments-${conversationId}`)
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'chat_message_attachments',
           filter: `conversation_id=eq.${conversationId}`,
         },
         () => {
           queryClient.invalidateQueries({ queryKey: ['chat-attachments', conversationId] });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [conversationId, queryClient]);
 
   // Grouping by message_id
   const byMessage: Record<string, ChatAttachment[]> = {};
   attachments.forEach((att) => {
     (byMessage[att.message_id] ||= []).push(att);
   });
 
   const uploadAttachments = useMutation({
     mutationFn: async ({
       messageId,
       conversationId: convId,
       files,
       uploadedBy,
     }: {
       messageId: string;
       conversationId: string;
       files: File[];
       uploadedBy: string;
     }) => {
       const results: ChatAttachment[] = [];
 
       for (const file of files) {
         const attachmentType = getAttachmentType(file.type);
         const safeName = file.name.replace(/[^\w.\-]+/g, "_");
         const storagePath = `${convId}/${messageId}/${Date.now()}-${safeName}`;
 
         // 1. Upload to storage
         const { error: uploadError } = await supabase.storage
           .from("chat-attachments")
           .upload(storagePath, file, {
             contentType: file.type || "application/octet-stream",
             upsert: false,
           });
 
         if (uploadError) throw uploadError;
 
         try {
           // 2. Insert metadata
           const { data: metadata, error: insertError } = await supabase
             .from("chat_message_attachments")
             .insert({
               message_id: messageId,
               conversation_id: convId,
               uploaded_by: uploadedBy,
               file_name: file.name,
               file_size: file.size,
               mime_type: file.type || null,
               storage_path: storagePath,
               attachment_type: attachmentType,
             })
             .select("*")
             .single();
 
           if (insertError) throw insertError;
           results.push(metadata as ChatAttachment);
         } catch (err) {
           // Rollback storage if metadata fails
           await supabase.storage.from("chat-attachments").remove([storagePath]);
           throw err;
         }
       }
       return results;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["chat-attachments", conversationId] });
       // Also invalidate chat query key from useChatMessages if needed
       queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
     },
     onError: (err: any) => {
       toast({
         title: 'Erro ao enviar anexo',
         description: err?.message || 'Tente novamente.',
         variant: 'destructive',
       });
     },
   });
 
   return {
     attachments,
     byMessage,
     isLoading,
     uploadAttachments,
   };
 }
 
 export function getAttachmentType(mimeType: string): 'image' | 'file' | 'audio' {
   if (mimeType.startsWith('image/')) return 'image';
   if (mimeType.startsWith('audio/')) return 'audio';
   return 'file';
 }
 
 export async function getChatAttachmentSignedUrl(storagePath: string): Promise<string | null> {
   const { data, error } = await supabase.storage
     .from('chat-attachments')
     .createSignedUrl(storagePath, 3600);
 
   if (error) {
     console.warn('[chat_attachments] signed url failed:', error.message);
     return null;
   }
   return data?.signedUrl || null;
 }