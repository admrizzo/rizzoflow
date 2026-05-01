import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Column, CardWithRelations } from '@/types/database';
import { KanbanCard } from './KanbanCard';
import { AddCardButton } from './AddCardButton';
import { ColumnHeader } from './ColumnHeader';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: Column;
  cards: CardWithRelations[];
  onCardClick: (card: CardWithRelations) => void;
  boardId: string;
  boardName?: string;
  isFirstColumn?: boolean;
  vacancyDeadlineValues?: Record<string, string | null>;
  categoryValues?: Record<string, string | null>;
  selectedProviders?: Record<string, { name: string; value: number | null }>;
  completionDeadlineValues?: Record<string, string | null>;
  budgetDeadlineValues?: Record<string, string | null>;
  showOwnerAvatar?: boolean;
  hasUnseenChanges?: (cardId: string, updatedAt: string) => boolean;
  responsibleNames?: Record<string, string>;
}

export function KanbanColumn({ column, cards, onCardClick, boardId, boardName, isFirstColumn = false, vacancyDeadlineValues = {}, categoryValues = {}, selectedProviders = {}, completionDeadlineValues = {}, budgetDeadlineValues = {}, showOwnerAvatar = false, hasUnseenChanges, responsibleNames = {} }: KanbanColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);

  return (
    <div className="flex-shrink-0 w-60 sm:w-64 md:w-[290px] bg-card border border-border rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-10rem)]">
      <ColumnHeader 
        column={column} 
        cardCount={cards.length}
      />
      
      <Droppable droppableId={column.id} type="card">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto px-2 pb-2 lp-thin-scroll",
              // Generous min-height for easier dropping
              "min-h-[280px]",
              // Visual feedback when dragging over
              snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-inset ring-primary/40 rounded-b-xl"
            )}
          >
            {cards.length > 0 && (
              <p className="text-[10px] text-muted-foreground/60 text-center px-1 py-1.5 italic select-none">
                Ordem de entrada e urgências · cima → baixo
              </p>
            )}
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className="mb-2.5"
                    style={{
                      ...dragProvided.draggableProps.style,
                      // Ensure dragging card is always on top
                      zIndex: dragSnapshot.isDragging ? 9999 : undefined,
                    }}
                  >
                    <KanbanCard 
                      card={card}
                      column={column}
                      onClick={() => onCardClick(card)}
                      isDragging={dragSnapshot.isDragging}
                      vacancyDeadline={vacancyDeadlineValues[card.id]}
                      categoryValue={categoryValues[card.id]}
                      selectedProvider={selectedProviders[card.id]}
                      completionDeadline={completionDeadlineValues[card.id]}
                      budgetDeadline={budgetDeadlineValues[card.id]}
                      showOwnerAvatar={showOwnerAvatar}
                      hasUnseenChanges={hasUnseenChanges?.(card.id, card.updated_at) ?? false}
                      responsibleName={responsibleNames[card.id] || null}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {/* Always visible drop zone at the bottom */}
            <div 
              className={cn(
                "min-h-[100px] flex items-center justify-center rounded-lg mt-1",
                snapshot.isDraggingOver 
                  ? "bg-primary/10 border-2 border-dashed border-primary/60 text-primary font-medium text-sm" 
                  : cards.length === 0 
                    ? "text-muted-foreground text-xs border border-dashed border-border" 
                    : "border border-dashed border-transparent"
              )}
            >
              {snapshot.isDraggingOver ? (
                <span>Solte aqui</span>
              ) : cards.length === 0 ? (
                <span>Coluna vazia</span>
              ) : null}
            </div>
          </div>
        )}
      </Droppable>

      {isFirstColumn && (
        <div className="px-2 pb-2 flex-shrink-0">
          <AddCardButton 
            columnId={column.id}
            boardId={boardId}
            boardName={boardName}
            isAdding={isAddingCard}
            onOpen={() => setIsAddingCard(true)}
            onClose={() => setIsAddingCard(false)}
          />
        </div>
      )}
    </div>
  );
}
