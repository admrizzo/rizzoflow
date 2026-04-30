// Catálogo de etapas, campos e pessoas usados nas solicitações de correção
// estruturada da proposta pública.
//
// O array `requested_sections` em `proposal_correction_requests` é jsonb e
// agora aceita objetos `CorrectionItem` (formato novo) misturados com strings
// no formato legado (`'documentos'`, `'fiador'`, etc.) — toda renderização
// trata os dois casos.

export type CorrectionStep =
  | 'personal'
  | 'documents'
  | 'residents'
  | 'guarantee'
  | 'negotiation'
  | 'contract'
  | 'review';

export type CorrectionAction = 'edit_field' | 'replace_document';

export type CorrectionPartyKind =
  | 'locatario_principal'
  | 'locatario_adicional'
  | 'conjuge'
  | 'fiador'
  | 'conjuge_fiador'
  | 'empresa'
  | 'representante'
  | 'imovel';

export interface CorrectionItem {
  step: CorrectionStep;
  field: string;
  field_label?: string;
  party_id?: string | null;
  party_kind?: CorrectionPartyKind | null;
  party_label?: string | null;
  action: CorrectionAction;
  note?: string | null;
}

// Mapeia a etapa lógica para o índice do stepper em PropostaPublica.tsx
// STEP_CONFIG = [Imóvel(0), Dados Pessoais(1), Cônjuge/Sócios(2), Documentos(3),
//                Moradores(4), Garantia(5), Negociação(6), Revisão(7)]
export const STEP_TO_PUBLIC_STEP: Record<CorrectionStep, number> = {
  personal: 1,
  documents: 3,
  residents: 4,
  guarantee: 5,
  negotiation: 6,
  contract: 6, // a etapa "Contrato" no público vive dentro de Negociação
  review: 7,
};

export const STEP_LABELS: Record<CorrectionStep, string> = {
  personal: 'Dados Pessoais',
  documents: 'Documentos',
  residents: 'Moradores',
  guarantee: 'Garantia',
  negotiation: 'Negociação',
  contract: 'Contrato / Retirada de chaves',
  review: 'Revisão / Outros',
};

export const PARTY_KIND_LABELS: Record<CorrectionPartyKind, string> = {
  locatario_principal: 'Locatário principal',
  locatario_adicional: 'Locatário adicional',
  conjuge: 'Cônjuge do locatário',
  fiador: 'Fiador',
  conjuge_fiador: 'Cônjuge do fiador',
  empresa: 'Empresa',
  representante: 'Representante legal',
  imovel: 'Imóvel',
};

export interface FieldDef {
  key: string;
  label: string;
  action: CorrectionAction;
  parties?: CorrectionPartyKind[]; // se omitido, não exige pessoa
}

export const FIELD_CATALOG: Record<CorrectionStep, FieldDef[]> = {
  personal: [
    { key: 'nome_completo', label: 'Nome completo', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador', 'conjuge_fiador', 'representante'] },
    { key: 'cpf', label: 'CPF', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador', 'conjuge_fiador', 'representante'] },
    { key: 'rg', label: 'RG', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador', 'conjuge_fiador'] },
    { key: 'whatsapp', label: 'WhatsApp / telefone', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'fiador', 'representante'] },
    { key: 'email', label: 'E-mail', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'fiador', 'representante'] },
    { key: 'data_nascimento', label: 'Data de nascimento', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador', 'conjuge_fiador'] },
    { key: 'profissao', label: 'Profissão', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador'] },
    { key: 'renda', label: 'Renda', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador'] },
    { key: 'fonte_renda', label: 'Tipo / fonte de renda', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'fiador'] },
    { key: 'estado_civil', label: 'Estado civil', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'fiador'] },
    { key: 'regime_bens', label: 'Regime de bens', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'fiador'] },
    { key: 'nacionalidade', label: 'Nacionalidade', action: 'edit_field', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador'] },
    { key: 'cnpj', label: 'CNPJ', action: 'edit_field', parties: ['empresa'] },
    { key: 'razao_social', label: 'Razão social', action: 'edit_field', parties: ['empresa'] },
  ],
  documents: [
    { key: 'documento_foto', label: 'Documento com foto', action: 'replace_document', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador', 'conjuge_fiador', 'representante'] },
    { key: 'comprovante_residencia', label: 'Comprovante de residência', action: 'replace_document', parties: ['locatario_principal', 'locatario_adicional', 'fiador'] },
    { key: 'comprovante_renda', label: 'Comprovante de renda', action: 'replace_document', parties: ['locatario_principal', 'locatario_adicional', 'conjuge', 'fiador'] },
    { key: 'certidao_estado_civil', label: 'Certidão de estado civil', action: 'replace_document', parties: ['locatario_principal', 'locatario_adicional', 'fiador'] },
    { key: 'documento_conjuge', label: 'Documento do cônjuge', action: 'replace_document', parties: ['conjuge', 'conjuge_fiador'] },
    { key: 'renda_conjuge', label: 'Renda do cônjuge', action: 'replace_document', parties: ['conjuge', 'conjuge_fiador'] },
    { key: 'matricula_imovel', label: 'Matrícula do imóvel', action: 'replace_document', parties: ['fiador', 'imovel'] },
    { key: 'contrato_social', label: 'Contrato social', action: 'replace_document', parties: ['empresa'] },
  ],
  residents: [
    { key: 'qtde_moradores', label: 'Quantidade de moradores', action: 'edit_field' },
    { key: 'morador_dados', label: 'Dados de um morador', action: 'edit_field' },
    { key: 'possui_pets', label: 'Pets', action: 'edit_field' },
  ],
  guarantee: [
    { key: 'tipo_garantia', label: 'Tipo de garantia', action: 'edit_field' },
    { key: 'fiador_dados', label: 'Dados do fiador', action: 'edit_field', parties: ['fiador'] },
    { key: 'seguro_fianca', label: 'Seguro fiança', action: 'edit_field' },
    { key: 'caucao_valor', label: 'Valor da caução', action: 'edit_field' },
    { key: 'titulo_capitalizacao', label: 'Título de capitalização', action: 'edit_field' },
  ],
  negotiation: [
    { key: 'valor_proposto', label: 'Valor proposto', action: 'edit_field' },
    { key: 'condicoes_proposta', label: 'Condições da proposta', action: 'edit_field' },
    { key: 'observacoes_negociacao', label: 'Observações da negociação', action: 'edit_field' },
  ],
  contract: [
    { key: 'data_inicio', label: 'Data de início do contrato', action: 'edit_field' },
    { key: 'dia_vencimento', label: 'Dia de vencimento', action: 'edit_field' },
    { key: 'tipo_assinatura', label: 'Tipo de assinatura', action: 'edit_field' },
    { key: 'retirada_chaves', label: 'Quem retira as chaves', action: 'edit_field' },
  ],
  review: [
    { key: 'outros', label: 'Outros / mensagem geral', action: 'edit_field' },
  ],
};

// Mapeamento legado: nomes antigos → CorrectionStep aproximada (para banner).
export function legacySectionToStep(s: string): CorrectionStep {
  switch (s) {
    case 'locatario_principal':
    case 'locatario_adicional':
    case 'conjuge':
      return 'personal';
    case 'fiador':
    case 'garantia':
      return 'guarantee';
    case 'documentos':
      return 'documents';
    case 'negociacao':
      return 'negotiation';
    default:
      return 'review';
  }
}

export function isStructuredItem(x: unknown): x is CorrectionItem {
  return !!x && typeof x === 'object' && 'step' in (x as any) && 'field' in (x as any);
}

export function describeItem(item: CorrectionItem): string {
  const stepLabel = STEP_LABELS[item.step];
  const fieldLabel = item.field_label
    || FIELD_CATALOG[item.step]?.find((f) => f.key === item.field)?.label
    || item.field;
  const partyLabel = item.party_label
    || (item.party_kind ? PARTY_KIND_LABELS[item.party_kind] : null);
  return partyLabel ? `${stepLabel} → ${fieldLabel} (${partyLabel})` : `${stepLabel} → ${fieldLabel}`;
}
