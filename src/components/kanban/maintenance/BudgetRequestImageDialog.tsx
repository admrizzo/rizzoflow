import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageDown, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoImg from '@/assets/logo-ia-naimobiliaria.png';

interface BudgetRequestImageDialogProps {
  cardTitle?: string;
  cardDescription?: string | null;
  superlogicaId?: string | null;
  address?: string | null;
  negotiationDetails?: string | null;
  operatorName?: string | null;
  trigger?: React.ReactNode;
}

export function BudgetRequestImageDialog({
  cardTitle,
  cardDescription,
  superlogicaId,
  address,
  negotiationDetails,
  operatorName,
  trigger,
}: BudgetRequestImageDialogProps) {
  const [open, setOpen] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [accessType, setAccessType] = useState<'chave' | 'agendar'>('chave');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize access info from card's saved data
  useEffect(() => {
    if (negotiationDetails) {
      try {
        const data = JSON.parse(negotiationDetails);
        if (data.access_type) {
          setAccessType(data.access_type);
          setContactName(data.contact_name || '');
          setContactPhone(data.contact_phone || '');
        }
      } catch {
        // Not JSON
      }
    }
  }, [negotiationDetails]);

  const deadlineDate = format(addDays(new Date(), deadlineDays), "dd/MM/yyyy", { locale: ptBR });
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const accessText = accessType === 'chave'
    ? 'Chave na imobiliária'
    : `Agendar com: ${contactName || '—'}${contactPhone ? ` (${contactPhone})` : ''}`;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      // Clone element to body to avoid dialog overflow/transform issues with html2canvas
      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.zIndex = '-1';
      clone.style.width = '460px';
      document.body.appendChild(clone);

      // Wait for images to load in clone
      const images = clone.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 460,
      });
      
      document.body.removeChild(clone);
      
      const link = document.createElement('a');
      link.download = `orcamento-${superlogicaId || 'solicitacao'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsGenerating(false);
    }
  }, [superlogicaId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <ImageDown className="h-3 w-3" />
            Gerar cartão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cartão de Solicitação de Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Prazo para resposta:</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value) || 3)}
              className="w-20 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">dias ({deadlineDate})</span>
          </div>

          {/* Access type */}
          <div className="space-y-2">
            <Label className="text-xs">Como acessar o imóvel:</Label>
            <RadioGroup value={accessType} onValueChange={(v) => setAccessType(v as 'chave' | 'agendar')} className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="chave" id="access-chave" />
                <Label htmlFor="access-chave" className="text-xs font-normal cursor-pointer">Chave na imobiliária</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="agendar" id="access-agendar" />
                <Label htmlFor="access-agendar" className="text-xs font-normal cursor-pointer">Agendar com inquilino</Label>
              </div>
            </RadioGroup>

            {accessType === 'agendar' && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nome do contato"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Telefone do contato"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          {/* Rendered card for export */}
          <div className="border rounded-lg overflow-hidden">
            <div
              ref={cardRef}
              style={{
                width: '460px',
                padding: '28px',
                backgroundColor: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Header with logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #0891b2', paddingBottom: '16px' }}>
                <img src={logoImg} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} crossOrigin="anonymous" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Solicitação de Orçamento</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ia.naimobiliária</div>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {superlogicaId && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#0891b2', minWidth: '80px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{superlogicaId}</div>
                  </div>
                )}

                {address && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#0891b2', minWidth: '80px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endereço</div>
                    <div style={{ fontSize: '13px', color: '#1e293b' }}>{address}</div>
                  </div>
                )}

                {/* Access info */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#0891b2', minWidth: '80px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acesso</div>
                  <div style={{ fontSize: '13px', color: '#1e293b' }}>{accessText}</div>
                </div>

                {cardDescription && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Descrição do serviço</div>
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                      {cardDescription}
                    </div>
                  </div>
                )}
              </div>

              {/* Deadline footer */}
              <div style={{ marginTop: '20px', padding: '10px 14px', backgroundColor: '#0891b2', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#ffffff', fontWeight: '600' }}>Prazo para envio do orçamento</div>
                <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '700' }}>{deadlineDate}</div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '10px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.6' }}>
                Favor enviar orçamento detalhado com valores e prazo de execução.
                <br />
                Gerado em {generatedAt}{operatorName ? ` por ${operatorName}` : ''}
              </div>
            </div>
          </div>

          <Button onClick={handleDownload} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isGenerating ? 'Gerando...' : 'Baixar imagem PNG'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
