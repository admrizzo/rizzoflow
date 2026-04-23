import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Settings2, BarChart3, FileText, ListChecks, FormInput, Shield
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { ProposalCmsPanel } from '@/components/proposal-cms/ProposalCmsPanel';
import { ProposalDashboardTab } from '@/components/central-propostas/ProposalDashboardTab';
import { ProposalManagementTab } from '@/components/central-propostas/ProposalManagementTab';
import { ProposalStagesTab } from '@/components/central-propostas/ProposalStagesTab';
import { ProposalFieldsTab } from '@/components/central-propostas/ProposalFieldsTab';
import { ProposalRulesTab } from '@/components/central-propostas/ProposalRulesTab';

export default function CentralPropostas() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const canEditPage = isAdmin || user?.email === 'adm@rizzoimobiliaria.com';
  const [cmsOpen, setCmsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: allLinks = [] } = useQuery({
    queryKey: ['proposal-links-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: canEditPage,
  });

  if (!authLoading && !canEditPage) {
    return <Navigate to="/dashboard" replace />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Central de Propostas</h1>
              <p className="text-xs text-muted-foreground">Painel administrativo completo</p>
            </div>
          </div>
          {canEditPage && (
            <Button
              variant="outline"
              onClick={() => setCmsOpen(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Editar Página
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="propostas" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Propostas</span>
            </TabsTrigger>
            <TabsTrigger value="etapas" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Etapas</span>
            </TabsTrigger>
            <TabsTrigger value="campos" className="flex items-center gap-2">
              <FormInput className="h-4 w-4" />
              <span className="hidden sm:inline">Campos</span>
            </TabsTrigger>
            <TabsTrigger value="regras" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Regras</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ProposalDashboardTab allLinks={allLinks} />
          </TabsContent>

          <TabsContent value="propostas">
            <ProposalManagementTab allLinks={allLinks} />
          </TabsContent>

          <TabsContent value="etapas">
            <ProposalStagesTab />
          </TabsContent>

          <TabsContent value="campos">
            <ProposalFieldsTab />
          </TabsContent>

          <TabsContent value="regras">
            <ProposalRulesTab />
          </TabsContent>
        </Tabs>
      </div>

      <ProposalCmsPanel open={cmsOpen} onOpenChange={setCmsOpen} />
    </div>
  );
}