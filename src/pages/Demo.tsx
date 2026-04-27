import { useState } from 'react';
import { DEMO_BOARDS, DEMO_CARD_COUNTS, DEMO_MEMBERS, DemoBoard, DemoCard, DemoColumn } from '@/data/demoData';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MessageSquare, CheckSquare, Calendar, Info, Home, Wrench, TrendingUp, GitBranch } from 'lucide-react';
import logoImg from '@/assets/logo-ia-naimobiliaria.png';
import { isDateOverdue, parseDateOnly } from '@/lib/dateUtils';

function DemoBanner() {
  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm text-primary flex items-center justify-center gap-2">
      <Info className="h-4 w-4" />
      <span className="font-medium">🔍 Demonstração — dados fictícios para visualização do template</span>
    </div>
  );
}

function DemoHeader({ selectedBoard, onSelectBoard }: {
  selectedBoard: DemoBoard | null;
  onSelectBoard: (b: DemoBoard | null) => void;
}) {
  return (
    <header className="bg-card/80 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={logoImg} alt="ia.naimobiliária" className="h-7" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Demonstração</span>
      </div>
      <div className="flex items-center gap-2">
        {DEMO_MEMBERS.slice(0, 4).map((m) => (
          <Avatar key={m.id} className="h-7 w-7 border border-border">
            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{m.initials}</AvatarFallback>
          </Avatar>
        ))}
        <span className="text-xs text-muted-foreground ml-1">+{DEMO_MEMBERS.length - 4}</span>
      </div>
    </header>
  );
}

function BoardSelector({ selectedBoard, onSelectBoard }: {
  selectedBoard: DemoBoard | null;
  onSelectBoard: (b: DemoBoard | null) => void;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    'home': <Home className="h-4 w-4" />,
    'wrench': <Wrench className="h-4 w-4" />,
    'trending-up': <TrendingUp className="h-4 w-4" />,
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
      <button
        onClick={() => onSelectBoard(null)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          !selectedBoard
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        <GitBranch className="h-4 w-4" />
        Todos os Fluxos
      </button>
      {DEMO_BOARDS.map((board) => (
        <button
          key={board.id}
          onClick={() => onSelectBoard(board)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            selectedBoard?.id === board.id
              ? 'text-white'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
          style={selectedBoard?.id === board.id ? { backgroundColor: board.color } : undefined}
        >
          {iconMap[board.icon]}
          {board.name}
          <span className="text-xs opacity-70 ml-1">{DEMO_CARD_COUNTS[board.id]}</span>
        </button>
      ))}
    </div>
  );
}

function DemoCardComponent({ card }: { card: DemoCard }) {
  const isOverdue = card.dueDate && isDateOverdue(parseDateOnly(card.dueDate));

  return (
    <div className="bg-card border border-border rounded-lg p-3 cursor-default hover:border-primary/30 transition-colors">
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-foreground mb-1 leading-snug">
        <span className="text-muted-foreground text-xs mr-1">#{card.cardNumber}</span>
        {card.title}
      </p>

      {/* Address */}
      {card.address && (
        <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{card.address}</p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {/* Checklist progress */}
          {card.checklistTotal != null && (
            <span className={`flex items-center gap-0.5 text-[11px] ${
              card.checklistDone === card.checklistTotal ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <CheckSquare className="h-3 w-3" />
              {card.checklistDone}/{card.checklistTotal}
            </span>
          )}
          {/* Comments */}
          {card.commentsCount != null && card.commentsCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {card.commentsCount}
            </span>
          )}
          {/* Due date */}
          {card.dueDate && (
            <span className={`flex items-center gap-0.5 text-[11px] ${
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              <Calendar className="h-3 w-3" />
              {new Date(card.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>

        {/* Members */}
        <div className="flex -space-x-1.5">
          {card.members.slice(0, 3).map((m) => (
            <Avatar key={m.id} className="h-5 w-5 border border-card">
              <AvatarFallback className="text-[8px] bg-secondary text-secondary-foreground">{m.initials}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoColumnComponent({ column }: { column: DemoColumn }) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col max-h-full bg-secondary rounded-xl border border-border">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border/30">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide font-['Barlow_Condensed']">
          {column.name}
        </h3>
        <span className="text-xs text-muted-foreground ml-auto bg-muted/50 px-1.5 py-0.5 rounded-md">{column.cards.length}</span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto p-2 pb-3">
        {column.cards.map((card) => (
          <DemoCardComponent key={card.id} card={card} />
        ))}
        {column.cards.length === 0 && (
          <div className="text-xs text-muted-foreground/50 text-center py-8 italic">Sem cards</div>
        )}
      </div>
    </div>
  );
}

function DemoKanban({ board }: { board: DemoBoard }) {
  return (
    <ScrollArea className="flex-1">
      <div className="flex gap-3 px-4 py-3 min-h-[calc(100vh-140px)]">
        {board.columns.map((col) => (
          <DemoColumnComponent key={col.id} column={col} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function DemoOverview({ onSelectBoard }: { onSelectBoard: (b: DemoBoard) => void }) {
  const iconMap: Record<string, React.ReactNode> = {
    'home': <Home className="h-8 w-8" />,
    'wrench': <Wrench className="h-8 w-8" />,
    'trending-up': <TrendingUp className="h-8 w-8" />,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1 font-['Barlow_Condensed'] uppercase">
        Visão Geral dos Fluxos
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Selecione um fluxo para visualizar o kanban completo
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEMO_BOARDS.map((board) => {
          const totalCards = board.columns.reduce((sum, col) => sum + col.cards.length, 0);
          return (
            <button
              key={board.id}
              onClick={() => onSelectBoard(board)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 transition-all group"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 text-white"
                style={{ backgroundColor: board.color }}
              >
                {iconMap[board.icon]}
              </div>
              <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors font-['Barlow_Condensed'] uppercase">
                {board.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span>{totalCards} cards</span>
                <span>·</span>
                <span>{board.columns.length} etapas</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Demo() {
  const [selectedBoard, setSelectedBoard] = useState<DemoBoard | null>(null);

  const bgStyle = selectedBoard
    ? { background: `linear-gradient(135deg, ${selectedBoard.color}22, ${selectedBoard.color}11)` }
    : {};

  return (
    <div className="min-h-screen bg-background flex flex-col" style={bgStyle}>
      <DemoBanner />
      <DemoHeader selectedBoard={selectedBoard} onSelectBoard={setSelectedBoard} />
      <BoardSelector selectedBoard={selectedBoard} onSelectBoard={setSelectedBoard} />

      {selectedBoard ? (
        <DemoKanban board={selectedBoard} />
      ) : (
        <DemoOverview onSelectBoard={setSelectedBoard} />
      )}
    </div>
  );
}
