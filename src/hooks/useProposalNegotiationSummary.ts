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
  // Códigos
  codigoRobust: number | null;
  endereco: string | null;
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  // remove R$ e espaços; normaliza vírgula decimal
  const cleaned = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
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
        codigoRobust: null,
        endereco: null,
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

      // Aluguel: prioriza draft.imovel.valor_aluguel, depois link.rent_value
      const aluguel =
        num(fd?.imovel?.valor_aluguel) ?? num(link?.rent_value) ?? null;

      // Condomínio/IPTU/Seguro: o draft normalmente não guarda — vêm do imóvel referenciado
      // Se houver, podem estar em fd.imovel.* ou em fd.encargos
      let condominio = num(fd?.imovel?.condominio) ?? num(fd?.encargos?.condominio);
      let iptu = num(fd?.imovel?.iptu) ?? num(fd?.encargos?.iptu);
      let seguro =
        num(fd?.imovel?.seguro_incendio) ?? num(fd?.encargos?.seguro_incendio);

      // Fallback: busca pelo codigo_robust em properties
      if (
        link?.codigo_robust &&
        (condominio === null || iptu === null || seguro === null)
      ) {
        const { data: prop } = await supabase
          .from('properties')
          .select('condominio, iptu, seguro_incendio')
          .eq('codigo_robust', link.codigo_robust)
          .maybeSingle();
        if (prop) {
          if (condominio === null) condominio = num(prop.condominio);
          if (iptu === null) iptu = num(prop.iptu);
          if (seguro === null) seguro = num(prop.seguro_incendio);
        }
      }

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

      const tipoAssinaturaRaw = fd?.assinatura?.tipo_contrato_assinatura;
      const tipoAssinatura: 'digital' | 'fisico' | null =
        tipoAssinaturaRaw === 'digital' || tipoAssinaturaRaw === 'fisico'
          ? tipoAssinaturaRaw
          : null;

      const hasData = !!(fd || link);

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
        codigoRobust: link?.codigo_robust ?? null,
        endereco: link?.address_summary ?? null,
      };
    },
    enabled: !!proposalLinkId,
    staleTime: 30_000,
  });
}
