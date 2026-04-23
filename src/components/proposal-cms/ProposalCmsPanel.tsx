import { useState, useEffect } from 'react';
import { useProposalPageConfig, ProposalPageConfig } from '@/hooks/useProposalPageConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings2, Type, ShieldCheck, Palette, FileText, Plus, Trash2, 
  GripVertical, Save, HelpCircle, Eye, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalCmsPanel({ open, onOpenChange }: Props) {
  const { config, isLoading, updateConfig } = useProposalPageConfig();
  const [draft, setDraft] = useState<ProposalPageConfig | null>(null);
  const [activeTab, setActiveTab] = useState('texts');

  useEffect(() => {
    if (config && !draft) setDraft(JSON.parse(JSON.stringify(config)));
  }, [config]);

  useEffect(() => {
    if (open && config) setDraft(JSON.parse(JSON.stringify(config)));
  }, [open]);

  if (!draft) return null;

  const handleSave = () => {
    if (draft) updateConfig.mutate(draft);
  };

  const updateText = (key: string, value: string) => {
    setDraft(prev => prev ? { ...prev, texts: { ...prev.texts, [key]: value } } : prev);
  };

  const updateBranding = (key: string, value: string) => {
    setDraft(prev => prev ? { ...prev, branding: { ...prev.branding, [key]: value } } : prev);
  };

  const updateGarantia = (index: number, field: string, value: any) => {
    setDraft(prev => {
      if (!prev) return prev;
      const opts = [...prev.garantia_options];
      (opts[index] as any)[field] = value;
      return { ...prev, garantia_options: opts };
    });
  };

  const addGarantia = () => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, garantia_options: [...prev.garantia_options, {
        value: 'Nova Garantia', icon: '🆕', badge: null, subtitle: '', detail: '',
        estimatePercent: 0, vantagens: [], atencao: [], enabled: true,
      }]};
    });
  };

  const removeGarantia = (index: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, garantia_options: prev.garantia_options.filter((_, i) => i !== index) };
    });
  };

  const updateDocCategory = (index: number, field: string, value: any) => {
    setDraft(prev => {
      if (!prev) return prev;
      const cats = [...prev.doc_categories];
      (cats[index] as any)[field] = value;
      return { ...prev, doc_categories: cats };
    });
  };

  const addDocCategory = () => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, doc_categories: [...prev.doc_categories, {
        key: `custom_${Date.now()}`, label: 'Novo documento', help: '', enabled: true,
      }]};
    });
  };

  const removeDocCategory = (index: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, doc_categories: prev.doc_categories.filter((_, i) => i !== index) };
    });
  };

  const updateFaq = (index: number, field: string, value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const faqs = [...prev.faq];
      (faqs[index] as any)[field] = value;
      return { ...prev, faq: faqs };
    });
  };

  const addFaq = () => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, faq: [...prev.faq, { question: '', answer: '' }] };
    });
  };

  const removeFaq = (index: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, faq: prev.faq.filter((_, i) => i !== index) };
    });
  };

  const TEXT_FIELDS = [
    { key: 'step1_title', label: 'Título - Etapa Imóvel' },
    { key: 'step2_title', label: 'Título - Etapa Dados Pessoais' },
    { key: 'step2_subtitle', label: 'Subtítulo - Etapa Dados Pessoais' },
    { key: 'step3_title', label: 'Título - Etapa Renda' },
    { key: 'step3_subtitle', label: 'Subtítulo - Etapa Renda' },
    { key: 'step4_title', label: 'Título - Etapa Moradores' },
    { key: 'step4_subtitle', label: 'Subtítulo - Etapa Moradores' },
    { key: 'step5_title', label: 'Título - Etapa Garantia' },
    { key: 'step5_subtitle', label: 'Subtítulo - Etapa Garantia' },
    { key: 'step5_warning', label: 'Aviso - Etapa Garantia' },
    { key: 'step6_title', label: 'Título - Etapa Documentos' },
    { key: 'step6_subtitle', label: 'Subtítulo - Etapa Documentos' },
    { key: 'step7_title', label: 'Título - Etapa Revisão' },
    { key: 'step7_subtitle', label: 'Subtítulo - Etapa Revisão' },
    { key: 'submit_button', label: 'Texto do Botão de Envio' },
    { key: 'success_title', label: 'Título de Sucesso' },
    { key: 'success_message', label: 'Mensagem de Sucesso' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Painel CMS - Proposta de Locação
          </DialogTitle>
          <DialogDescription>
            Edite textos, opções de garantia, documentos e aparência da página de propostas.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="texts" className="flex items-center gap-1">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Textos</span>
            </TabsTrigger>
            <TabsTrigger value="garantias" className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Garantias</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Estilo</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TEXTOS ── */}
          <TabsContent value="texts" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Edite os títulos e textos exibidos em cada etapa do formulário.
                </p>
                {TEXT_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      value={draft.texts[key] || ''}
                      onChange={(e) => updateText(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── GARANTIAS ── */}
          <TabsContent value="garantias" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Configure as opções de garantia disponíveis.
                  </p>
                  <Button size="sm" variant="outline" onClick={addGarantia}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {draft.garantia_options.map((opt, i) => (
                    <AccordionItem key={i} value={`g-${i}`} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{opt.icon}</span>
                          <span className="font-medium">{opt.value}</span>
                          {!opt.enabled && <Badge variant="secondary" className="text-xs">Desativado</Badge>}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <Label>Ativo</Label>
                          <Switch checked={opt.enabled} onCheckedChange={(v) => updateGarantia(i, 'enabled', v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nome</Label>
                            <Input value={opt.value} onChange={(e) => updateGarantia(i, 'value', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Ícone (emoji)</Label>
                            <Input value={opt.icon} onChange={(e) => updateGarantia(i, 'icon', e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Badge (ex: "Mais escolhida ⭐")</Label>
                          <Input value={opt.badge || ''} onChange={(e) => updateGarantia(i, 'badge', e.target.value || null)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Subtítulo</Label>
                          <Input value={opt.subtitle} onChange={(e) => updateGarantia(i, 'subtitle', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descrição detalhada</Label>
                          <Textarea value={opt.detail} onChange={(e) => updateGarantia(i, 'detail', e.target.value)} rows={3} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">% estimado (0 = não mostrar)</Label>
                          <Input type="number" value={opt.estimatePercent} onChange={(e) => updateGarantia(i, 'estimatePercent', Number(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vantagens (uma por linha)</Label>
                          <Textarea
                            value={opt.vantagens.join('\n')}
                            onChange={(e) => updateGarantia(i, 'vantagens', e.target.value.split('\n').filter(Boolean))}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pontos de atenção (um por linha)</Label>
                          <Textarea
                            value={opt.atencao.join('\n')}
                            onChange={(e) => updateGarantia(i, 'atencao', e.target.value.split('\n').filter(Boolean))}
                            rows={3}
                          />
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => removeGarantia(i)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Remover garantia
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── DOCUMENTOS ── */}
          <TabsContent value="docs" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Configure as categorias de documentos solicitados.
                  </p>
                  <Button size="sm" variant="outline" onClick={addDocCategory}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {draft.doc_categories.map((cat, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{cat.label || 'Sem nome'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={cat.enabled} onCheckedChange={(v) => updateDocCategory(i, 'enabled', v)} />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeDocCategory(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome da categoria</Label>
                        <Input value={cat.label} onChange={(e) => updateDocCategory(i, 'label', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Texto de ajuda</Label>
                        <Input value={cat.help} onChange={(e) => updateDocCategory(i, 'help', e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── FAQ ── */}
          <TabsContent value="faq" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Perguntas frequentes exibidas na etapa de garantia.
                  </p>
                  <Button size="sm" variant="outline" onClick={addFaq}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {draft.faq.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Pergunta {i + 1}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeFaq(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pergunta</Label>
                        <Input value={item.question} onChange={(e) => updateFaq(i, 'question', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Resposta</Label>
                        <Textarea value={item.answer} onChange={(e) => updateFaq(i, 'answer', e.target.value)} rows={2} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── BRANDING ── */}
          <TabsContent value="branding" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Personalize a aparência da página de propostas.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Nome da Empresa</Label>
                  <Input value={draft.branding.company_name} onChange={(e) => updateBranding('company_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Título da Página</Label>
                  <Input value={draft.branding.page_title} onChange={(e) => updateBranding('page_title', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subtítulo da Página</Label>
                  <Input value={draft.branding.page_subtitle} onChange={(e) => updateBranding('page_subtitle', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL do Logo</Label>
                  <Input value={draft.branding.logo_url} onChange={(e) => updateBranding('logo_url', e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cor Principal</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={draft.branding.primary_color}
                      onChange={(e) => updateBranding('primary_color', e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded border"
                    />
                    <Input
                      value={draft.branding.primary_color}
                      onChange={(e) => updateBranding('primary_color', e.target.value)}
                      className="w-32"
                    />
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: draft.branding.primary_color }} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Etapas do Formulário</h4>
                  <p className="text-xs text-muted-foreground mb-3">Ative ou desative etapas e renomeie-as.</p>
                  {draft.steps.map((step, i) => (
                    <div key={step.key} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <Switch
                        checked={step.enabled}
                        onCheckedChange={(v) => {
                          setDraft(prev => {
                            if (!prev) return prev;
                            const steps = [...prev.steps];
                            steps[i] = { ...steps[i], enabled: v };
                            return { ...prev, steps };
                          });
                        }}
                      />
                      <Input
                        value={step.label}
                        onChange={(e) => {
                          setDraft(prev => {
                            if (!prev) return prev;
                            const steps = [...prev.steps];
                            steps[i] = { ...steps[i], label: e.target.value };
                            return { ...prev, steps };
                          });
                        }}
                        className="flex-1"
                      />
                      <Badge variant="outline" className="text-xs">{step.key}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateConfig.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}