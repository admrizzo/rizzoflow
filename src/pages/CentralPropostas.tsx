import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertiesLocacao, Property } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText, Search, ArrowLeft, Link2, Copy, ExternalLink, MessageCircle,
  Home, Clock, Plus, Building2, MapPin, CheckCircle2, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProposalCmsPanel } from '@/components/proposal-cms/ProposalCmsPanel';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  nao_acessado: { label: 'Não acessado', color: 'bg-muted text-muted-foreground' },
  em_preenchimento: { label: 'Em preenchimento', color: 'bg-amber-100 text-amber-800' },
  enviada: { label: 'Enviada', color: 'bg-green-100 text-green-800' },
};

/** Identifica o imóvel pela regra de prioridade: bairro (condomínio) > complemento > titulo */
function getPropertyIdentification(prop: Property): string {
  const raw = (prop as any).raw_data as Record<string, any> | null;
  const endereco = raw?.endereco as Record<string, any> | null;
  const complemento = endereco?.complemento || prop.complemento;
  // Bairro geralmente carrega o nome do condomínio/residencial
  if (prop.bairro && prop.bairro.length > 3) return prop.bairro;
  if (complemento) return String(complemento);
  return prop.titulo || `Imóvel ${prop.codigo_robust}`;
}

function formatCurrency(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CentralPropostas() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { properties, isLoading: propsLoading, syncProperties } = usePropertiesLocacao();

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [brokerName, setBrokerName] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<number | null>(null);
  const [cmsOpen, setCmsOpen] = useState(false);

  // Auto-fill broker name from logged user
  useEffect(() => {
    if (profile?.full_name && !brokerName) {
      setBrokerName(profile.full_name);
    }
  }, [profile]);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return properties.filter(p => {
      const code = String(p.codigo_robust);
      return (
        code.includes(q) ||
        (p.titulo || '').toLowerCase().includes(q) ||
        (p.bairro || '').toLowerCase().includes(q) ||
        (p.logradouro || '').toLowerCase().includes(q) ||
        (p.cidade || '').toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [searchQuery, properties]);

  const { data: recentLinks = [] } = useQuery({
    queryKey: ['proposal-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      if (!selectedProperty) throw new Error('Selecione um imóvel');
      if (!brokerName.trim()) throw new Error('Informe o corretor');

      const identification = getPropertyIdentification(selectedProperty);
      const addressParts = [selectedProperty.logradouro, selectedProperty.numero, selectedProperty.bairro, selectedProperty.cidade].filter(Boolean);

      const { data, error } = await supabase
        .from('proposal_links')
        .insert({
          codigo_robust: selectedProperty.codigo_robust,
          property_name: identification,
          address_summary: addressParts.join(', ') || null,
          rent_value: selectedProperty.valor_aluguel,
          broker_name: brokerName.trim(),
          broker_user_id: user?.id || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/proposta/${data.codigo_robust}`;
      setGeneratedLink(link);
      setGeneratedCode(data.codigo_robust);
      queryClient.invalidateQueries({ queryKey: ['proposal-links'] });
      toast.success('Link gerado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao gerar link');
    },
  });

  const openModal = () => {
    setSelectedProperty(null);
    setSearchQuery('');
    setGeneratedLink(null);
    setGeneratedCode(null);
    if (profile?.full_name) setBrokerName(profile.full_name);
    setModalOpen(true);
  };

  const handleSelectProperty = (prop: Property) => {
    setSelectedProperty(prop);
    setSearchQuery('');
    setGeneratedLink(null);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Link copiado!');
    }
  };

  const handleWhatsApp = () => {
    if (generatedLink) {
      const text = encodeURIComponent(`Olá! Segue o link para preencher a proposta de locação do imóvel Cód. ${generatedCode}:\n\n${generatedLink}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const totalFinanceiro = (p: Property) => {
    return (p.valor_aluguel || 0) + (p.iptu || 0) + (p.condominio || 0) + (p.seguro_incendio || 0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Central de Propostas</h1>
          </div>
          <div className="flex items-center gap-2">
            {!authLoading && isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setCmsOpen(true)} className="gap-1">
                <Settings2 className="h-4 w-4" />
                Editar Página
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => syncProperties.mutate()} disabled={syncProperties.isPending}>
              {syncProperties.isPending ? 'Sincronizando...' : 'Atualizar imóveis'}
            </Button>
            <Button size="lg" onClick={openModal} className="gap-2">
              <Plus className="h-5 w-5" />
              Gerar nova proposta
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', count: recentLinks.length, color: 'text-foreground' },
            { label: 'Não acessados', count: recentLinks.filter((l: any) => l.status === 'nao_acessado').length, color: 'text-muted-foreground' },
            { label: 'Enviadas', count: recentLinks.filter((l: any) => l.status === 'enviada').length, color: 'text-green-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3 text-center">
                <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLinks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma proposta gerada ainda.</p>
                <Button onClick={openModal} className="gap-2">
                  <Plus className="h-4 w-4" /> Gerar primeira proposta
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLinks.map((link: any) => {
                  const statusInfo = STATUS_LABELS[link.status] || STATUS_LABELS.nao_acessado;
                  const linkUrl = `${window.location.origin}/proposta/${link.codigo_robust}`;
                  return (
                    <div key={link.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors">
                      <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Cód. {link.codigo_robust} — {link.property_name || 'Imóvel'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {link.broker_name} · {new Date(link.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(linkUrl);
                          toast.success('Link copiado!');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Modal Gerar Proposta ─── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Gerar nova proposta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Step 1: Search */}
            {!selectedProperty && !generatedLink && (
              <div className="space-y-3">
                <Label>Cód no Robust ou buscar imóvel</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: 2096, nome, bairro..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-destructive text-center py-4">Imóvel não localizado no CRM</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg bg-card shadow-md max-h-60 overflow-y-auto">
                    {searchResults.map(prop => (
                      <button
                        key={prop.id}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                        onClick={() => handleSelectProperty(prop)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Cód. {prop.codigo_robust}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(prop.valor_aluguel)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {getPropertyIdentification(prop)} — {prop.bairro || ''}, {prop.cidade || ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Selected property */}
            {selectedProperty && !generatedLink && (
              <>
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm">Cód. {selectedProperty.codigo_robust}</span>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">LOCAÇÃO</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProperty(null)}>
                      Trocar
                    </Button>
                  </div>

                  <p className="text-sm font-medium">{getPropertyIdentification(selectedProperty)}</p>

                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{[selectedProperty.logradouro, selectedProperty.numero, selectedProperty.bairro, selectedProperty.cidade].filter(Boolean).join(', ')}</span>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Aluguel</span>
                      <span className="font-medium">{formatCurrency(selectedProperty.valor_aluguel)}</span>
                    </div>
                    {selectedProperty.iptu != null && selectedProperty.iptu > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">IPTU</span>
                        <span>{formatCurrency(selectedProperty.iptu)}</span>
                      </div>
                    )}
                    {selectedProperty.condominio != null && selectedProperty.condominio > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Condomínio</span>
                        <span>{formatCurrency(selectedProperty.condominio)}</span>
                      </div>
                    )}
                    {selectedProperty.seguro_incendio != null && selectedProperty.seguro_incendio > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Seguro Incêndio</span>
                        <span>{formatCurrency(selectedProperty.seguro_incendio)}</span>
                      </div>
                    )}
                    {totalFinanceiro(selectedProperty) > 0 && (
                      <>
                        <Separator />
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Total mensal</span>
                          <span className="text-primary">{formatCurrency(totalFinanceiro(selectedProperty))}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Broker */}
                <div className="space-y-2">
                  <Label>Corretor responsável</Label>
                  <Input
                    placeholder="Nome do corretor"
                    value={brokerName}
                    onChange={e => setBrokerName(e.target.value)}
                  />
                </div>

                {/* Generate */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!brokerName.trim() || createLink.isPending}
                  onClick={() => createLink.mutate()}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {createLink.isPending ? 'Gerando...' : 'Gerar link da proposta'}
                </Button>
              </>
            )}

            {/* Step 3: Link generated */}
            {generatedLink && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Proposta gerada com sucesso!</span>
                </div>

                <div className="bg-muted/40 rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Link da proposta</p>
                  <p className="text-sm font-mono truncate">{generatedLink}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" /> Copiar link
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => window.open(generatedLink, '_blank')}>
                    <ExternalLink className="h-4 w-4" /> Abrir proposta
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={handleWhatsApp}>
                    <MessageCircle className="h-4 w-4" /> Enviar via WhatsApp
                  </Button>
                </div>

                <Button variant="default" className="w-full" onClick={openModal}>
                  <Plus className="h-4 w-4 mr-2" /> Gerar outra proposta
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {!authLoading && isAdmin && <ProposalCmsPanel open={cmsOpen} onOpenChange={setCmsOpen} />}
    </div>
  );
}