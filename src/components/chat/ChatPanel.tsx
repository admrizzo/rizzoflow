 import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useChat } from "./ChatProvider";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
 import { MessageSquare } from "lucide-react";

export function ChatPanel() {
   const { isOpen, close, activeConversationId, setActiveConversationId } = useChat();

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent
        side="right"
          className="p-0 w-full sm:max-w-[420px] md:max-w-[900px] lg:max-w-[1100px] xl:max-w-[1280px] flex flex-col gap-0 border-l shadow-2xl"
      >
         <SheetHeader className="sr-only">
           <SheetTitle>Chat interno</SheetTitle>
           <SheetDescription>Sistema de comunicação interna para a equipe Rizzo Flow.</SheetDescription>
         </SheetHeader>
 
        <div className="flex flex-1 min-h-0">
          {/* Lista — esconde no mobile quando há conversa ativa */}
          <div
            className={`${
              activeConversationId ? "hidden md:flex" : "flex"
            } w-full md:w-[320px] border-r border-border flex-col min-h-0`}
          >
            <ConversationList />
          </div>

          {/* Thread */}
          <div className={`${activeConversationId ? "flex" : "hidden md:flex"} flex-1 min-h-0`}>
            {activeConversationId ? (
              <MessageThread
                conversationId={activeConversationId}
                onBack={() => setActiveConversationId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-background">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-semibold mb-1">Chat Interno</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Selecione uma conversa à esquerda ou inicie uma nova com qualquer pessoa da equipe.
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}