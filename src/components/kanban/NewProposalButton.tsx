import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertiesLocacao, Property } from '@/hooks/useProperties';
import { useBrokers } from '@/hooks/useBrokers';
import { useAssignableUsers } from '@/hooks/useAssignableUsers';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Link2, Copy, ExternalLink, MessageCircle,
  Plus, Building2, MapPin, CheckCircle2, UserCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getPropertyIdentification } from '@/lib/propertyIdentification';
import { buildPublicUrl } from '@/lib/appUrl';

function formatCurrency(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LOCACAO_BOARD_ID = '3b619b46-85bf-487d-955b-e1255b1bf174';
const CADASTRO_INICIADO_COLUMN_NAME = 'cadastro iniciado';

export function NewProposalButton({ compact = false }: { compact?: boolean } = {}) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { properties } = usePropertiesLocacao();
  const { brokers, isLoading: loadingBrokers } = useBrokers();
  const { users: assignableUsers, isLoading: loadingAssignable } = useAssignableUsers();
  const { isAdmin, isGestor, isAdministrativo, isCorretor } = usePermissions();

  // Admin/Gestor/Administrativo podem atribuir qualquer usuário interno.
  // Corretor só pode atribuir a si mesmo.
  const canAssignAnyone = isAdmin || isGestor || isAdministrativo;
  const lockedToSelf = isCorretor && !canAssignAnyone;

  // Lista exibida no select. Para roles privilegiados, usa lista expandida
  // (admin/gestor/corretor/administrativo). Para corretor, usa lista de corretores
  // (mas o select fica travado no próprio usuário).
  const selectableUsers = useMemo(() => {
    if (canAssignAnyone) {
      // Mescla por user_id para garantir que corretores apareçam mesmo se
      // assignableUsers ainda estiver carregando.
      const map = new Map<string, { user_id: string; full_name: string; email: string | null; avatar_url: string | null }>();
      assignableUsers.forEach((u) => map.set(u.user_id, u));
      brokers.forEach((b) => { if (!map.has(b.user_id)) map.set(b.user_id, b); });
      return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return brokers;
  }, [canAssignAnyone, assignableUsers, brokers]);
  const loadingUsers = canAssignAnyone ? (loadingAssignable || loadingBrokers) : loadingBrokers;

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [brokerUserId, setBrokerUserId] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<number | null>(null);

  const selectedBroker = useMemo(
    () => selectableUsers.find((b) => b.user_id === brokerUserId) || null,
    [selectableUsers, brokerUserId]
  );

  // Pré-seleciona o usuário logado quando faz sentido:
  // - Corretor: sempre travado no próprio usuário.
  // - Demais roles: pré-seleciona se o próprio usuário aparece na lista.
  useEffect(() => {
    if (lockedToSelf && user?.id && brokerUserId !== user.id) {
      setBrokerUserId(user.id);
      return;
    }
    if (!brokerUserId && user?.id && selectableUsers.some((b) => b.user_id === user.id)) {
      setBrokerUserId(user.id);
    }
  }, [user, selectableUsers, brokerUserId, lockedToSelf]);

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
      if (!selectedBroker) throw new Error('Selecione o corretor responsável');

      const brokerName = selectedBroker.full_name;

      const identification = getPropertyIdentification(selectedProperty);
      const addressParts = [selectedProperty.logradouro, selectedProperty.numero, selectedProperty.bairro, selectedProperty.cidade].filter(Boolean);

      // 1. Cria o proposal_link — public_token é gerado automaticamente pelo banco (UUID)
      const { data: linkData, error: linkError } = await supabase
        .from('proposal_links')
        .insert({
          codigo_robust: selectedProperty.codigo_robust,
          property_name: identification,
          address_summary: addressParts.join(', ') || null,
          rent_value: selectedProperty.valor_aluguel,
           broker_name: brokerName,
           broker_user_id: selectedBroker.user_id,
           created_by: user?.id || null,
        })
        // Selecionamos explicitamente public_token para falhar cedo se não vier
         .select('id, codigo_robust, public_token, proposal_display_code')
        .single();
      if (linkError) throw linkError;
      if (!linkData?.public_token) {
        // Sem token público não há link seguro a compartilhar — abortamos a geração
        throw new Error('Falha ao gerar token público da proposta. Tente novamente.');
      }

      // 2. Find "Cadastro iniciado" column in the Locação board
      const { data: columns } = await supabase
        .from('columns')
        .select('id, name')
        .eq('board_id', LOCACAO_BOARD_ID)
        .order('position', { ascending: true });

      const targetCol = columns?.find(c => c.name.toLowerCase().includes(CADASTRO_INICIADO_COLUMN_NAME)) || columns?.[0];

      if (targetCol) {
        // 3. Create card in the Locação board, vinculado ao proposal_link.
        //    Calcula próxima posição para evitar empilhar todos em position=0.
        const { data: lastCard } = await supabase
          .from('cards')
          .select('position')
          .eq('column_id', targetCol.id)
          .eq('is_archived', false)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextPosition = (lastCard?.position ?? -1) + 1;

        const { error: cardErr } = await supabase.from('cards').insert({
          title: `${selectedProperty.codigo_robust} - ${identification}`,
          board_id: LOCACAO_BOARD_ID,
          column_id: targetCol.id,
          robust_code: String(selectedProperty.codigo_robust),
          building_name: identification,
          address: addressParts.join(', ') || null,
          proposal_responsible: brokerName,
          proposal_link_id: linkData.id,
          responsible_user_id: selectedBroker.user_id,
          capturing_broker_id: selectedProperty.captador_email 
            ? selectableUsers.find(u => u.email?.trim().toLowerCase() === selectedProperty.captador_email.trim().toLowerCase())?.user_id 
            : null,
          description: `Proposta de locação gerada — aguardando preenchimento pelo cliente.\nCorretor: ${brokerName}\nGerado em: ${new Date().toLocaleString('pt-BR')}`,
          created_by: user?.id || null,
          position: nextPosition,
           column_entered_at: new Date().toISOString(),
           proposal_display_code: linkData.proposal_display_code,
        });
        if (cardErr) {
          // Não aborta a geração do link, mas avisa para que admin corrija depois.
          console.error('[NewProposalButton] Falha ao criar card vinculado:', cardErr);
          toast.warning('Link gerado, mas o card no Kanban não pôde ser criado.', {
            description: cardErr.message,
          });
        }
      }

      return linkData as { id: string; codigo_robust: number; public_token: string };
    },
    onSuccess: (data) => {
      // Link público SEMPRE usa public_token. id é apenas relacionamento interno.
      // Em produção força o domínio canônico (https://seurizzo.com.br por enquanto, sem www).
      const link = buildPublicUrl(`/proposta/${data.public_token}`);
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
    if (lockedToSelf && user?.id) {
      setBrokerUserId(user.id);
    } else if (user?.id && selectableUsers.some((b) => b.user_id === user.id)) {
      setBrokerUserId(user.id);
    } else {
      setBrokerUserId('');
    }
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
      const text = encodeURIComponent(`Olá! Segue o link para preencher sua proposta de locação:\n\n${generatedLink}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const totalFinanceiro = (p: Property) =>
    (p.valor_aluguel || 0) + (p.iptu || 0) + (p.condominio || 0) + (p.seguro_incendio || 0);

  return (
    <>
      <Button
        onClick={openModal}
        className={
          compact
            ? "h-8 px-3 gap-1.5 text-[12.5px] font-bold bg-accent hover:bg-accent/90 text-white rounded-lg shadow-md shadow-accent/30 transition-colors"
            : "h-10 px-6 gap-2 text-sm font-bold bg-accent hover:bg-accent/90 text-white rounded-xl shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
        }
      >
        <Plus className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
        {compact ? 'Gerar nova proposta' : 'Gerar nova proposta'}
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
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                    {canAssignAnyone ? 'Responsável pela proposta' : 'Corretor responsável'}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={brokerUserId}
                    onValueChange={setBrokerUserId}
                    disabled={loadingUsers || lockedToSelf}
                  >
                    <SelectTrigger
                      className={`h-11 ${!brokerUserId ? 'border-amber-400/70' : ''}`}
                    >
                      <SelectValue
                        placeholder={
                          loadingUsers
                            ? 'Carregando usuários...'
                            : canAssignAnyone
                              ? 'Selecione o responsável'
                              : 'Selecione um corretor'
                        }
                      >
                        {selectedBroker && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {selectedBroker.avatar_url && (
                                <AvatarImage src={selectedBroker.avatar_url} alt={selectedBroker.full_name} />
                              )}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                                {selectedBroker.full_name
                                  .split(' ')
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{selectedBroker.full_name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {selectableUsers.length === 0 && !loadingUsers && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4 mx-auto mb-2 text-amber-500" />
                          Nenhum usuário disponível.
                          <br />
                          <span className="text-xs">
                            Cadastre usuários em Administração → Usuários.
                          </span>
                        </div>
                      )}
                      {selectableUsers.map((b) => (
                        <SelectItem key={b.user_id} value={b.user_id} className="py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              {b.avatar_url && <AvatarImage src={b.avatar_url} alt={b.full_name} />}
                              <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                                {b.full_name
                                  .split(' ')
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium leading-tight">{b.full_name}</span>
                              {b.email && (
                                <span className="text-[11px] text-muted-foreground leading-tight">
                                  {b.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {lockedToSelf && (
                    <p className="text-xs text-muted-foreground">
                      Como corretor, a proposta é gerada em seu nome.
                    </p>
                  )}
                  {!lockedToSelf && !brokerUserId && selectableUsers.length > 0 && (
                    <p className="text-xs text-amber-600">
                      Selecione o responsável para gerar o link.
                    </p>
                  )}
                </div>
                <Button className="w-full" size="lg" disabled={!selectedBroker || createLink.isPending} onClick={() => createLink.mutate()}>
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