import { CardType } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Building2, Wallet } from 'lucide-react';

interface CardTypeBadgeProps {
  cardType: CardType | null;
  size?: 'sm' | 'md';
}

export function CardTypeBadge({ cardType, size = 'sm' }: CardTypeBadgeProps) {
  if (!cardType) return null;

  const isFinanciamento = cardType === 'com_financiamento';

  return (
    <Badge
      variant="default"
      className={`
        ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5'}
        ${isFinanciamento 
          ? 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' 
          : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-transparent'
        }
        whitespace-nowrap font-semibold
      `}
    >
      {size === 'md' && (
        isFinanciamento ? <Building2 className="w-3 h-3 mr-1" /> : <Wallet className="w-3 h-3 mr-1" />
      )}
      {isFinanciamento ? 'COM FINANCIAMENTO' : 'SEM FINANCIAMENTO'}
    </Badge>
  );
}
