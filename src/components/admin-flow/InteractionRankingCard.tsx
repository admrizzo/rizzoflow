import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Medal, Star, Flame, Zap, Target, 
  CheckSquare, MessageSquare, ArrowLeftRight, 
  Search, ChevronDown, ChevronUp, Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractionData {
  user_id: string;
  user_name: string;
  checklist_completions: number;
  comments_count: number;
  card_moves: number;
  total_interactions: number;
}

interface InteractionRankingCardProps {
  data: InteractionData[];
  isLoading?: boolean;
}

// Level thresholds and badges
const LEVELS = [
  { min: 0, name: 'Iniciante', color: 'bg-slate-500', icon: Star },
  { min: 50, name: 'Ativo', color: 'bg-blue-500', icon: Zap },
  { min: 150, name: 'Dedicado', color: 'bg-green-500', icon: Target },
  { min: 300, name: 'Expert', color: 'bg-purple-500', icon: Flame },
  { min: 500, name: 'Mestre', color: 'bg-amber-500', icon: Trophy },
  { min: 1000, name: 'Lenda', color: 'bg-gradient-to-r from-amber-500 to-orange-500', icon: Crown },
];

function getLevel(interactions: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (interactions >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(interactions: number) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (interactions < LEVELS[i].min) return LEVELS[i];
  }
  return null;
}

function getProgressToNextLevel(interactions: number) {
  const currentLevel = getLevel(interactions);
  const nextLevel = getNextLevel(interactions);
  if (!nextLevel) return 100;
  
  const currentMin = currentLevel.min;
  const nextMin = nextLevel.min;
  const progress = ((interactions - currentMin) / (nextMin - currentMin)) * 100;
  return Math.min(100, Math.max(0, progress));
}

const ITEMS_PER_PAGE = 8;

export function InteractionRankingCard({ data, isLoading }: InteractionRankingCardProps) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-avatars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .not('avatar_url', 'is', null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'total' | 'checklists' | 'comments' | 'moves'>('total');

  const avatarMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    profiles.forEach(p => { map[p.user_id] = p.avatar_url; });
    return map;
  }, [profiles]);

  const sortedData = useMemo(() => {
    let sorted = [...data];
    
    // Filter by search
    if (searchTerm) {
      sorted = sorted.filter(u => 
        u.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by selected metric
    switch (sortBy) {
      case 'checklists':
        sorted.sort((a, b) => b.checklist_completions - a.checklist_completions);
        break;
      case 'comments':
        sorted.sort((a, b) => b.comments_count - a.comments_count);
        break;
      case 'moves':
        sorted.sort((a, b) => b.card_moves - a.card_moves);
        break;
      default:
        sorted.sort((a, b) => b.total_interactions - a.total_interactions);
    }

    return sorted;
  }, [data, searchTerm, sortBy]);

  const displayData = expanded ? sortedData : sortedData.slice(0, ITEMS_PER_PAGE);
  const maxInteractions = Math.max(...data.map(d => d.total_interactions), 1);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Header with gradient accent */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
      
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Trophy className="h-5 w-5 text-white" />
            </div>
             Interações de Produtividade
            <Badge variant="secondary" className="ml-2 bg-white/10 text-white/80">
              {data.length} pessoas
            </Badge>
          </CardTitle>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Sort buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy('total')}
            className={cn(
              "text-white/60 hover:text-white hover:bg-white/10 gap-1.5",
              sortBy === 'total' && "bg-white/10 text-white"
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Total
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy('checklists')}
            className={cn(
              "text-white/60 hover:text-white hover:bg-white/10 gap-1.5",
              sortBy === 'checklists' && "bg-blue-500/20 text-blue-400"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Checklists
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy('comments')}
            className={cn(
              "text-white/60 hover:text-white hover:bg-white/10 gap-1.5",
              sortBy === 'comments' && "bg-green-500/20 text-green-400"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Comentários
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy('moves')}
            className={cn(
              "text-white/60 hover:text-white hover:bg-white/10 gap-1.5",
              sortBy === 'moves' && "bg-amber-500/20 text-amber-400"
            )}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Movimentações
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {sortedData.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Sem dados para exibir'}
          </div>
        ) : (
          <>
            {/* Podium for top 3 */}
            {!searchTerm && sortedData.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-6 px-2">
                {/* 2nd place */}
                 <div className="flex flex-col items-center">
                   <Avatar className="h-12 w-12 border-2 border-slate-400 mb-1">
                     {avatarMap[sortedData[1].user_id] && (
                       <AvatarImage src={avatarMap[sortedData[1].user_id]!} alt={sortedData[1].user_name} />
                     )}
                     <AvatarFallback className="bg-slate-600 text-white text-sm font-bold">
                       {sortedData[1].user_name.charAt(0)}
                     </AvatarFallback>
                   </Avatar>
                  <div className="text-2xl mb-1">🥈</div>
                  <div className="bg-slate-700 rounded-t-lg w-20 h-16 flex flex-col items-center justify-end pb-2">
                    <span className="text-white/90 text-xs font-medium truncate w-full text-center px-1">
                      {sortedData[1].user_name.split(' ')[0]}
                    </span>
                    <span className="text-white/60 text-[10px]">{sortedData[1].total_interactions}</span>
                  </div>
                </div>

                {/* 1st place */}
                <div className="flex flex-col items-center -mt-4">
                  <div className="relative">
                     <Avatar className="h-16 w-16 border-3 border-amber-400 mb-1 ring-2 ring-amber-400/30">
                       {avatarMap[sortedData[0].user_id] && (
                         <AvatarImage src={avatarMap[sortedData[0].user_id]!} alt={sortedData[0].user_name} />
                       )}
                       <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-lg font-bold">
                         {sortedData[0].user_name.charAt(0)}
                       </AvatarFallback>
                     </Avatar>
                    <div className="absolute -top-2 -right-1">
                      <Crown className="h-5 w-5 text-amber-400" />
                    </div>
                  </div>
                  <div className="text-3xl mb-1">🥇</div>
                  <div className="bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg w-24 h-20 flex flex-col items-center justify-end pb-2">
                    <span className="text-white font-semibold text-sm truncate w-full text-center px-1">
                      {sortedData[0].user_name.split(' ')[0]}
                    </span>
                    <span className="text-amber-200 text-xs">{sortedData[0].total_interactions}</span>
                  </div>
                </div>

                {/* 3rd place */}
                 <div className="flex flex-col items-center">
                   <Avatar className="h-10 w-10 border-2 border-orange-700 mb-1">
                     {avatarMap[sortedData[2].user_id] && (
                       <AvatarImage src={avatarMap[sortedData[2].user_id]!} alt={sortedData[2].user_name} />
                     )}
                     <AvatarFallback className="bg-orange-800 text-white text-xs font-bold">
                       {sortedData[2].user_name.charAt(0)}
                     </AvatarFallback>
                   </Avatar>
                  <div className="text-xl mb-1">🥉</div>
                  <div className="bg-orange-900/80 rounded-t-lg w-18 h-12 flex flex-col items-center justify-end pb-2">
                    <span className="text-white/90 text-xs font-medium truncate w-full text-center px-1">
                      {sortedData[2].user_name.split(' ')[0]}
                    </span>
                    <span className="text-white/60 text-[10px]">{sortedData[2].total_interactions}</span>
                  </div>
                </div>
              </div>
            )}

            {/* User list */}
            <div className="space-y-2">
              {displayData.map((user, index) => {
                const level = getLevel(user.total_interactions);
                const progress = getProgressToNextLevel(user.total_interactions);
                const LevelIcon = level.icon;
                const barWidth = (user.total_interactions / maxInteractions) * 100;
                const isTopThree = !searchTerm && index < 3;

                return (
                  <div
                    key={user.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all",
                      "bg-white/5 hover:bg-white/10",
                      isTopThree && "border border-white/10"
                    )}
                  >
                    {/* Rank number */}
                    <div className="w-8 text-center shrink-0">
                      {isTopThree ? (
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-white/40 font-medium text-sm">
                          {index + 1}º
                        </span>
                      )}
                    </div>

                    {/* Avatar with level badge */}
                     <div className="relative shrink-0">
                       <Avatar className="h-10 w-10">
                         {avatarMap[user.user_id] && (
                           <AvatarImage src={avatarMap[user.user_id]!} alt={user.user_name} />
                         )}
                         <AvatarFallback className={cn("text-white font-semibold text-sm", level.color)}>
                           {user.user_name.charAt(0)}
                         </AvatarFallback>
                       </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 rounded-full p-0.5",
                        level.color
                      )}>
                        <LevelIcon className="h-3 w-3 text-white" />
                      </div>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                   <span className="text-white font-medium text-sm truncate">
                     {user.user_name}
                   </span>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0", level.color, "text-white")}
                        >
                          {level.name}
                        </Badge>
                      </div>
                      
                      {/* Progress bar to next level */}
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={progress} className="h-1 flex-1 bg-white/10" />
                        <span className="text-[10px] text-white/40 shrink-0">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1" title="Checklists concluídos">
                        <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                        <span className={cn(
                          "text-xs font-medium",
                          sortBy === 'checklists' ? 'text-blue-400' : 'text-white/60'
                        )}>
                          {user.checklist_completions}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" title="Comentários">
                        <MessageSquare className="h-3.5 w-3.5 text-green-400" />
                        <span className={cn(
                          "text-xs font-medium",
                          sortBy === 'comments' ? 'text-green-400' : 'text-white/60'
                        )}>
                          {user.comments_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" title="Movimentações">
                        <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
                        <span className={cn(
                          "text-xs font-medium",
                          sortBy === 'moves' ? 'text-amber-400' : 'text-white/60'
                        )}>
                          {user.card_moves}
                        </span>
                      </div>
                    </div>

                    {/* Total score */}
                    <div className="shrink-0 text-right">
                      <div className="text-white font-bold text-lg">
                        {user.total_interactions}
                      </div>
                      <div className="text-white/40 text-[10px]">pontos</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more/less button */}
            {sortedData.length > ITEMS_PER_PAGE && (
              <Button
                variant="ghost"
                className="w-full mt-4 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Ver todos ({sortedData.length - ITEMS_PER_PAGE} restantes)
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
