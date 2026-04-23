import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Search, ArrowLeft, Link2, Copy, ExternalLink, MessageCircle,
  Home, Clock, CheckCircle2, Edit, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  nao_acessado: { label: 'Não acessado', color: 'bg-muted text-muted-foreground' },
  em_preenchimento: { label: 'Em preenchimento', color: 'bg-amber-100 text-amber-800' },
  enviada: { label: 'Enviada', color: 'bg-green-100 text-green-800' },
};

export default function CentralPropostas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { properties, isLoading: propsLoading, syncProperties } = usePropertiesLocacao();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [brokerName, setBrokerName] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<number | null>(null);

  // Search results
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

  // Fetch recent links
  const { data: recentLinks = [] } = useQuery({
    queryKey: ['proposal-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Create link mutation
  const createLink = useMutation({
    mutationFn: async () => {
      if (!selectedProperty) throw new Error('Selecione um imóvel');
      if (!brokerName.trim()) throw new Error('Informe o corretor');

      const addressParts = [selectedProperty.logradouro, selectedProperty.numero, selectedProperty.bairro, selectedProperty.cidade].filter(Boolean);
      const { data, error } = await supabase
        .from('proposal_links')
        .insert({
          codigo_robust: selectedProperty.codigo_robust,
          property_name: selectedProperty.titulo || `Imóvel ${selectedProperty.codigo_robust}`,
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
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/proposta/${data.codigo_robust}`;
      setGeneratedLink(link);
      setGeneratedCode(data.codigo_robust);
      queryClient.invalidateQueries({ queryKey: ['proposal-links'] });
      toast.success('Link gerado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao gerar link');
    },
  });

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

  const formatCurrency = (v: number | null) => {
    if (v == null) return 'N/A';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
          <Button variant="outline" size="sm" onClick={() => syncProperties.mutate()} disabled={syncProperties.isPending}>
            {syncProperties.isPending ? 'Sincronizando...' : 'Atualizar imóveis'}
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Generate Link Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-primary" />
              Gerar Nova Proposta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property Search */}
            <div className="space-y-2">
              <Label>Buscar imóvel</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cód Robust, nome, bairro, endereço..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setGeneratedLink(null); }}
                  className="pl-9"
                />
              </div>
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
                        {prop.titulo || ''} — {prop.bairro || ''}, {prop.cidade || ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Property Card */}
            {selectedProperty && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Cód. {selectedProperty.codigo_robust}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedProperty(null); setGeneratedLink(null); }}>
                    Trocar
                  </Button>
                </div>
                <p className="text-sm">{selectedProperty.titulo || 'Sem título'}</p>
                <p className="text-xs text-muted-foreground">
                  {[selectedProperty.logradouro, selectedProperty.numero, selectedProperty.bairro, selectedProperty.cidade].filter(Boolean).join(', ')}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>Aluguel: <strong>{formatCurrency(selectedProperty.valor_aluguel)}</strong></span>
                  <span className="text-muted-foreground">Finalidade: {selectedProperty.finalidade || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Broker */}
            <div className="space-y-2">
              <Label>Corretor responsável</Label>
              <Input
                placeholder="Nome do corretor"
                value={brokerName}
                onChange={e => setBrokerName(e.target.value)}
              />
            </div>

            {/* Generate Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedProperty || !brokerName.trim() || createLink.isPending}
              onClick={() => createLink.mutate()}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {createLink.isPending ? 'Gerando...' : 'Gerar link da proposta'}
            </Button>

            {/* Generated Link Result */}
            {generatedLink && (
              <div className="border rounded-lg p-4 bg-green-50 space-y-3">
                <p className="text-sm font-semibold text-green-800">Link gerado com sucesso!</p>
                <div className="flex items-center gap-2 bg-background rounded-md border px-3 py-2">
                  <span className="text-sm flex-1 truncate font-mono">{generatedLink}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(generatedLink, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir proposta
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleWhatsApp}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Enviar por WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum link gerado ainda.</p>
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
    </div>
  );
}