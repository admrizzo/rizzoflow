import { useAuth } from '@/contexts/AuthContext';
import { Header, FilterState } from '@/components/layout';
import { BoardSelector } from '@/components/layout/BoardSelector';
import { BoardProductivityDashboard } from '@/components/admin-flow';
import { TrendingUp } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useBoards } from '@/hooks/useBoards';
import { Board } from '@/types/database';

export default function AdminFlowPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { boards } = useBoards();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    guaranteeType: null,
    contractType: null,
    labelId: null,
    memberId: null,
    proposalResponsible: null,
    showArchived: false,
    ownerId: null,
    creatorId: null,
    deadlineStatus: null,
    providerName: null,
  });

  const handleSelectBoard = (board: Board | null) => {
    if (board) {
      // Navigate to dashboard with the board selected via URL state
      navigate('/dashboard', { state: { selectedBoardId: board.id } });
    } else {
      navigate('/dashboard');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  // Only admins can access this page
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        selectedBoard={null}
        archivedCount={0}
      />
      
      {/* Board selector for navigation */}
      <BoardSelector 
        boards={boards} 
        selectedBoard={null} 
        onSelectBoard={handleSelectBoard} 
        cardCounts={{}}
      />
      
      <main className="pt-4 px-4">
        <div className="flex items-center gap-2 mb-4 text-foreground">
          <TrendingUp className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Métricas de Produtividade</h1>
        </div>
        <BoardProductivityDashboard />
      </main>
    </div>
  );
}
