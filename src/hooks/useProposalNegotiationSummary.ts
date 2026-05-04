import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProposalNegotiationSummary {
  hasData: boolean;
  source: 'draft' | 'link' | 'none';
  aluguel: number | null;
  condominio: number | null;
  iptu: number | null;
  seguro: number | null;
  totalMensal: number | null;
  aceitouValor: 'sim' | 'nao' | null;
  valorProposto: number | null;
  justificativa: string | null;
  // Assinatura
  tipoAssinatura: 'digital' | 'fisico' | null;
  tipoGarantia: string | null;
  // Observação livre da etapa de Garantia
  observacaoGarantia: string | null;
  // Códigos
  codigoRobust: number | null;
  endereco: string | null;
  // ── Contrato (informado pelo cliente na proposta pública) ──
  contratoDataInicio: string | null; // YYYY-MM-DD
  diaVencimento: string | null;      // '1'..'30'
  // ── Retirada de chaves ──
  retiradaPorTerceiro: boolean;
  retiradaNome: string | null;
  retiradaWhatsapp: string | null;
  retiradaCpf: string | null;
  retiradaEmail: string | null;
  retiradaObservacao: string | null;
  documentosObservacao: string | null;
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  // Aceita BR ("1.800,00") e JS-numérico ("1800.00").
  // Se contém vírgula → formato BR (ponto = milhar). Caso contrário, o ponto é decimal.
  const cleaned = s.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

export function useProposalNegotiationSummary(
  proposalLinkId: string | null | undefined
) {
  return useQuery({
    queryKey: ['proposal-negotiation-summary', proposalLinkId],
    queryFn: async (): Promise<ProposalNegotiationSummary> => {
      const empty: ProposalNegotiationSummary = {
        hasData: false,
        source: 'none',
        aluguel: null,
        condominio: null,
        iptu: null,
        seguro: null,
        totalMensal: null,
        aceitouValor: null,
        valorProposto: null,
        justificativa: null,
        tipoAssinatura: null,
        tipoGarantia: null,
        observacaoGarantia: null,
        codigoRobust: null,
        endereco: null,
        contratoDataInicio: null,
        diaVencimento: null,
        retiradaPorTerceiro: false,
        retiradaNome: null,
        retiradaWhatsapp: null,
        retiradaCpf: null,
        retiradaEmail: null,
        retiradaObservacao: null,
        documentosObservacao: null,
      };
      if (!proposalLinkId) return empty;

      // Busca link (sempre traz aluguel base + endereço)
      const { data: link } = await supabase
        .from('proposal_links')
        .select('id, codigo_robust, address_summary, rent_value')
        .eq('id', proposalLinkId)
        .maybeSingle();

      // Busca o draft mais recente desse link
      const { data: drafts } = await supabase
        .from('proposal_drafts')
        .select('form_data, updated_at')
        .eq('proposal_link_id', proposalLinkId)
        .order('updated_at', { ascending: false })
        .limit(1);

      const draft = drafts?.[0];
      const fd: any = draft?.form_data || null;

      const { data: prop } = link?.codigo_robust
        ? await supabase
            .from('properties')
            .select('valor_aluguel, condominio, iptu, seguro_incendio, logradouro, numero, bairro, cidade, estado')
            .eq('codigo_robust', link.codigo_robust)
            .maybeSingle()
        : { data: null };

      // Dados financeiros do imóvel sempre vêm primeiro do CRM sincronizado.
      // Draft/link são fallback para propostas antigas ou imóvel ausente no feed.
      const aluguel =
        num(prop?.valor_aluguel) ?? num(fd?.imovel?.valor_aluguel) ?? num(link?.rent_value) ?? null;
      const condominio = num(prop?.condominio) ?? num(fd?.imovel?.condominio) ?? num(fd?.encargos?.condominio);
      const iptu = num(prop?.iptu) ?? num(fd?.imovel?.iptu) ?? num(fd?.encargos?.iptu);
      const seguro =
        num(prop?.seguro_incendio) ?? num(fd?.imovel?.seguro_incendio) ?? num(fd?.encargos?.seguro_incendio);

      const totalMensal =
        (aluguel ?? 0) + (condominio ?? 0) + (iptu ?? 0) + (seguro ?? 0);

      const aceitou: 'sim' | 'nao' | null =
        fd?.negociacao?.aceitou_valor === 'sim'
          ? 'sim'
          : fd?.negociacao?.aceitou_valor === 'nao'
          ? 'nao'
          : null;

      const valorProposto =
        aceitou === 'nao' ? num(fd?.negociacao?.valor_proposto) : null;

      const justificativa: string | null =
        (typeof fd?.negociacao?.observacao === 'string' &&
          fd.negociacao.observacao.trim()) ||
        null;

      const observacaoGarantia: string | null =
        (typeof fd?.garantia?.observacao === 'string' &&
          fd.garantia.observacao.trim()) ||
        null;

       const tipoAssinaturaRaw = fd?.assinatura?.tipo_contrato_assinatura || fd?.garantia?.tipo_contrato_assinatura;
      const tipoAssinatura: 'digital' | 'fisico' | null =
        tipoAssinaturaRaw === 'digital' || tipoAssinaturaRaw === 'fisico'
          ? tipoAssinaturaRaw
          : null;

      const hasData = !!(fd || link);

      // Contrato e retirada de chaves (vindos do form_data)
      const contratoDataInicio: string | null =
        (typeof fd?.contrato?.data_inicio === 'string' && fd.contrato.data_inicio.trim()) || null;
      const diaVencimentoRaw = fd?.contrato?.dia_vencimento;
      const diaVencimento: string | null =
        diaVencimentoRaw !== undefined && diaVencimentoRaw !== null && String(diaVencimentoRaw).trim() !== ''
          ? String(diaVencimentoRaw).trim()
          : null;

      const retiradaPorTerceiro = !!fd?.composicao?.responsavel_retirada;
      const retiradaNome: string | null =
        (typeof fd?.composicao?.retirada_nome === 'string' && fd.composicao.retirada_nome.trim()) || null;
      const retiradaWhatsapp: string | null =
        (typeof fd?.composicao?.retirada_whatsapp === 'string' && fd.composicao.retirada_whatsapp.trim()) || null;
      const retiradaCpf: string | null =
        (typeof fd?.composicao?.retirada_cpf === 'string' && fd.composicao.retirada_cpf.trim()) || null;
      const retiradaEmail: string | null =
        (typeof fd?.composicao?.retirada_email === 'string' && fd.composicao.retirada_email.trim()) || null;
      const retiradaObservacao: string | null =
        (typeof fd?.composicao?.retirada_observacao === 'string' && fd.composicao.retirada_observacao.trim()) || null;

       const tipoGarantia = fd?.garantia?.tipo_garantia || null;

       const documentosObservacao = fd?.documentos?.observacao || fd?.documentos_observacao || null;

       return {
        hasData,
        source: fd ? 'draft' : link ? 'link' : 'none',
        aluguel,
        condominio,
        iptu,
        seguro,
        totalMensal: totalMensal > 0 ? totalMensal : null,
        aceitouValor: aceitou,
        valorProposto,
        justificativa,
        tipoAssinatura,
         tipoGarantia,
        observacaoGarantia,
        codigoRobust: link?.codigo_robust ?? null,
        endereco: prop
          ? [prop.logradouro, prop.numero, prop.bairro, prop.cidade, prop.estado].filter(Boolean).join(', ')
          : link?.address_summary ?? null,
        contratoDataInicio,
        diaVencimento,
        retiradaPorTerceiro,
        retiradaNome,
        retiradaWhatsapp,
        retiradaCpf,
        retiradaEmail,
        retiradaObservacao,
        documentosObservacao,
      };
    },
    enabled: !!proposalLinkId,
    staleTime: 30_000,
  });
}
