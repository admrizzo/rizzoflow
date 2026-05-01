import { useChat } from "./ChatProvider";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { cn } from "@/lib/utils";

export function ChatLauncher() {
  const { user } = useAuth();
  const { toggle, unreadTotal, isOpen } = useChat();

  if (!user) return null;

  return (
    <>
      <button
        onClick={toggle}
        aria-label="Abrir chat interno"
        className={cn(
          "fixed z-50 bottom-5 right-5 md:bottom-6 md:right-6",
          "h-13 w-13 md:h-14 md:w-14 rounded-full bg-primary text-primary-foreground",
          "shadow-[0_8px_24px_-6px_rgba(20,30,40,0.35)] hover:shadow-[0_12px_28px_-6px_rgba(20,30,40,0.45)]",
          "flex items-center justify-center transition-all hover:scale-105",
          isOpen && "opacity-0 pointer-events-none",
        )}
        style={{ width: 56, height: 56 }}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadTotal > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10.5px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ring-2 ring-background">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </button>
      <ChatPanel />
    </>
  );
}