import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertiesLocacao, Property } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Link2, Copy, ExternalLink, MessageCircle,
  Plus, Building2, MapPin, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

function getPropertyIdentification(prop: Property): string {
  const raw = (prop as any).raw_data as Record<string, any> | null;
  const endereco = raw?.endereco as Record<string, any> | null;
  const complemento = endereco?.complemento || prop.complemento;
  if (prop.bairro && prop.bairro.length > 3) return prop.bairro;
  if (complemento) return String(complemento);
  return prop.titulo || `Imóvel ${prop.codigo_robust}`;
}

function formatCurrency(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LOCACAO_BOARD_ID = '3b619b46-85bf-487d-955b-e1255b1bf174';
const CADASTRO_INICIADO_COLUMN_NAME = 'cadastro iniciado';

export function NewProposalButton() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { properties } = usePropertiesLocacao();

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [brokerName, setBrokerName] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<number | null>(null);

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

  const createLink = useMutation({
    mutationFn: async () => {
      if (!selectedProperty) throw new Error('Selecione um imóvel');
      if (!brokerName.trim()) throw new Error('Informe o corretor');

      const identification = getPropertyIdentification(selectedProperty);
      const addressParts = [selectedProperty.logradouro, selectedProperty.numero, selectedProperty.bairro, selectedProperty.cidade].filter(Boolean);

      // 1. Create proposal link
      const { data: linkData, error: linkError } = await supabase
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
      if (linkError) throw linkError;

      // 2. Find "Cadastro iniciado" column in the Locação board
      const { data: columns } = await supabase
        .from('columns')
        .select('id, name')
        .eq('board_id', LOCACAO_BOARD_ID)
        .order('position', { ascending: true });

      const targetCol = columns?.find(c => c.name.toLowerCase().includes(CADASTRO_INICIADO_COLUMN_NAME)) || columns?.[0];

      if (targetCol) {
        // 3. Create card in the Locação board
        await supabase.from('cards').insert({
          title: `${selectedProperty.codigo_robust} - ${identification}`,
          board_id: LOCACAO_BOARD_ID,
          column_id: targetCol.id,
          robust_code: String(selectedProperty.codigo_robust),
          address: addressParts.join(', ') || null,
          proposal_responsible: brokerName.trim(),
          description: `Proposta de locação gerada automaticamente.\nAluguel: ${formatCurrency(selectedProperty.valor_aluguel)}\nCorretor: ${brokerName.trim()}\nData: ${new Date().toLocaleString('pt-BR')}`,
          created_by: user?.id || null,
          position: 0,
          column_entered_at: new Date().toISOString(),
        });
      }

      return linkData;
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/proposta/${data.codigo_robust}`;
      setGeneratedLink(link);
      setGeneratedCode(data.codigo_robust);
      queryClient.invalidateQueries({ queryKey: ['proposal-links'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast.success('Proposta gerada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao gerar proposta');
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

  const totalFinanceiro = (p: Property) =>
    (p.valor_aluguel || 0) + (p.iptu || 0) + (p.condominio || 0) + (p.seguro_incendio || 0);

  return (
    <>
      <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={openModal}>
        <Plus className="h-4 w-4" />
        Gerar nova proposta
      </Button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Gerar nova proposta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Search */}
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
                        onClick={() => { setSelectedProperty(prop); setSearchQuery(''); setGeneratedLink(null); }}
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

            {/* Selected property */}
            {selectedProperty && !generatedLink && (
              <>
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm">Cód. {selectedProperty.codigo_robust}</span>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">LOCAÇÃO</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProperty(null)}>Trocar</Button>
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
                    {(selectedProperty.iptu ?? 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">IPTU</span>
                        <span>{formatCurrency(selectedProperty.iptu)}</span>
                      </div>
                    )}
                    {(selectedProperty.condominio ?? 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Condomínio</span>
                        <span>{formatCurrency(selectedProperty.condominio)}</span>
                      </div>
                    )}
                    {(selectedProperty.seguro_incendio ?? 0) > 0 && (
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
                <div className="space-y-2">
                  <Label>Corretor responsável</Label>
                  <Input value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="Nome do corretor" />
                </div>
                <Button className="w-full" size="lg" disabled={!brokerName.trim() || createLink.isPending} onClick={() => createLink.mutate()}>
                  <Link2 className="h-4 w-4 mr-2" />
                  {createLink.isPending ? 'Gerando...' : 'Gerar link da proposta'}
                </Button>
              </>
            )}

            {/* Link generated */}
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
    </>
  );
}