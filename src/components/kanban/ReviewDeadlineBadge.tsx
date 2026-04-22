import { Card, Column } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { isReviewOverdue, getDaysInColumn } from '@/hooks/useColumnReview';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReviewDeadlineBadgeProps {
  card: Card;
  column: Column | null;
  onMarkReviewed?: () => void;
  isLoading?: boolean;
  showButton?: boolean;
}

export function ReviewDeadlineBadge({ 
  card, 
  column, 
}: ReviewDeadlineBadgeProps) {
  if (!column?.review_deadline_days) return null;

  const overdue = isReviewOverdue(card, column);
  const daysInColumn = getDaysInColumn(card);
  const deadlineDays = column.review_deadline_days;
  
  // Calculate days remaining or overdue
  const daysRemaining = deadlineDays - daysInColumn;
  
  // Format: D-3 (3 days remaining), D+2 (2 days overdue)
  const displayText = daysRemaining >= 0 
    ? `D-${daysRemaining}` 
    : `D+${Math.abs(daysRemaining)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 gap-1 ${
              overdue 
                ? 'bg-orange-100 text-orange-700 border-orange-300' 
                : 'text-muted-foreground'
            }`}
          >
            <Clock className="w-3 h-3" />
            {displayText}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Prazo da coluna: {deadlineDays} {deadlineDays === 1 ? 'dia' : 'dias'}</p>
          <p className="text-xs text-muted-foreground">
            {daysInColumn} {daysInColumn === 1 ? 'dia' : 'dias'} na coluna
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
