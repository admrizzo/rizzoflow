import { ReactNode } from 'react';
import { Board } from '@/types/database';
import { cn } from '@/lib/utils';

interface BoardSelectorProps {
  boards: Board[];
  selectedBoard: Board | null;
  onSelectBoard: (board: Board | null) => void;
  cardCounts?: Record<string, number>;
  rightSlot?: ReactNode;
}

export function BoardSelector({ boards, selectedBoard, onSelectBoard, cardCounts = {}, rightSlot }: BoardSelectorProps) {
  return (
    <div className="h-11 px-4 flex items-center gap-2 overflow-x-auto lp-thin-scroll border-b bg-sidebar/95 text-white border-white/5 scrollbar-none">
      {boards.map((board) => {
        const isSelected = selectedBoard?.id === board.id;
        const count = cardCounts[board.id] || 0;
        const displayName = board.name.replace(/^Fluxo\s+(de\s+)?/i, '');

        return (
          <button
            key={board.id}
            onClick={() => onSelectBoard(board)}
            className={cn(
              "inline-flex items-center gap-2 px-3 h-7 rounded-full whitespace-nowrap text-[12.5px] font-bold transition-colors border",
              isSelected
                ? "bg-white/12 text-white border-white/20"
                : "bg-transparent text-white/75 border-transparent hover:bg-white/8 hover:text-white"
            )}
          >
            <span>{displayName}</span>
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded-full text-[10.5px] font-extrabold",
                isSelected ? "bg-accent text-white" : "bg-white/14 text-white/85"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}

      {rightSlot && (
        <>
          <div className="flex-1 min-w-2" />
          <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
        </>
      )}
    </div>
  );
}

