import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DocumentCategory, ProposalFormData, UploadedFile } from '@/pages/PropostaLocacao';

type ExistingProposalDocument = {
  id: string;
  category: string;
  category_label: string;
  owner_type: string;
  owner_label: string | null;
  file_name: string;
  original_file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  party_id: string | null;
};

type ExistingProposalParty = {
  id: string;
  role: string;
  position: number | null;
  related_party_id: string | null;
  metadata: Record<string, any> | null;
};

const SPOUSE_DOC_KEYS = new Set(['documento_conjuge', 'renda_conjuge']);

function existingDocToFile(doc: ExistingProposalDocument): UploadedFile {
  return {
    id: `existing-${doc.id}`,
    name: doc.original_file_name || doc.file_name,
    size: Number(doc.file_size || 0),
    type: doc.mime_type || 'application/octet-stream',
    dataUrl: '',
    persisted: true,
    existingDocumentId: doc.id,
    storagePath: doc.storage_path,
  };
}

function mergeFilesByCategory(categories: any[] | undefined, docs: ExistingProposalDocument[]): DocumentCategory[] | undefined {
  if (!Array.isArray(categories)) return categories as DocumentCategory[] | undefined;
  return categories.map((cat) => {
    const existingFiles = docs
      .filter((doc) => doc.category === cat.key)
      .map(existingDocToFile);
    if (existingFiles.length === 0) return cat;
    const currentFiles = Array.isArray(cat.files) ? cat.files : [];
    const currentIds = new Set(currentFiles.map((file: any) => file.existingDocumentId || file.id));
    return {
      ...cat,
      files: [
        ...currentFiles,
        ...existingFiles.filter((file) => !currentIds.has(file.existingDocumentId || file.id)),
      ],
    };
  });
}

function cleanDraftFiles(formData: any): any {
  const cleanCategories = (categories: any[] | undefined) => Array.isArray(categories)
    ? categories.map((cat) => ({ ...cat, files: [] }))
    : categories;

  const cleaned = {
    ...formData,
    documentos: cleanCategories(formData?.documentos),
    conjuge: formData?.conjuge
      ? { ...formData.conjuge, documentos: cleanCategories(formData.conjuge.documentos) }
      : formData?.conjuge,
    locatarios_adicionais: Array.isArray(formData?.locatarios_adicionais)
      ? formData.locatarios_adicionais.map((loc: any) => ({
          ...loc,
          documentos: cleanCategories(loc?.documentos),
          conjuge: loc?.conjuge
            ? { ...loc.conjuge, documentos: cleanCategories(loc.conjuge.documentos) }
            : loc?.conjuge,
        }))
      : formData?.locatarios_adicionais,
    garantia: formData?.garantia
      ? {
          ...formData.garantia,
          fiadores: Array.isArray(formData.garantia.fiadores)
            ? formData.garantia.fiadores.map((fiador: any) => ({
                ...fiador,
                documentos: cleanCategories(fiador?.documentos),
              }))
            : formData.garantia.fiadores,
        }
      : formData?.garantia,
  };
  return cleaned;
}

function hydrateDraftWithExistingDocuments(
  formData: any,
  documents: ExistingProposalDocument[],
  parties: ExistingProposalParty[],
): any {
  if (!formData || documents.length === 0) return formData;

  const docsByParty = new Map<string, ExistingProposalDocument[]>();
  const fallbackDocs: ExistingProposalDocument[] = [];
  documents.forEach((doc) => {
    if (doc.party_id) {
      docsByParty.set(doc.party_id, [...(docsByParty.get(doc.party_id) || []), doc]);
    } else {
      fallbackDocs.push(doc);
    }
  });

  const partiesByRole = (role: string) => parties
    .filter((party) => party.role === role)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const primary = partiesByRole('primary_tenant')[0];
  const company = partiesByRole('company')[0];
  const additionalTenants = partiesByRole('additional_tenant');
  const guarantors = partiesByRole('guarantor');
  const spouses = parties.filter((party) => party.role === 'tenant_spouse' || party.role === 'guarantor_spouse');
  const spouseFor = (parentId?: string | null, metadataPrefix?: string) => spouses.find((spouse) => {
    if (parentId && spouse.related_party_id === parentId) return true;
    const spouseOf = String(spouse.metadata?.spouse_of || '');
    return !!metadataPrefix && spouseOf === metadataPrefix;
  });

  const ownFallback = (ownerTypes: string[], categoryFilter?: (doc: ExistingProposalDocument) => boolean) => fallbackDocs.filter((doc) => {
    if (!ownerTypes.includes(doc.owner_type)) return false;
    return categoryFilter ? categoryFilter(doc) : true;
  });
  const nonSpouseDoc = (doc: ExistingProposalDocument) => !SPOUSE_DOC_KEYS.has(doc.category);
  const spouseDoc = (doc: ExistingProposalDocument) => SPOUSE_DOC_KEYS.has(doc.category);

  const hydrated = { ...formData };
  const principalDocs = docsByParty.get((company || primary)?.id || '') || ownFallback(['empresa', 'proponente'], nonSpouseDoc);
  hydrated.documentos = mergeFilesByCategory(formData.documentos, principalDocs);

  const primarySpouse = spouseFor(primary?.id, 'primary_tenant');
  const primarySpouseDocs = docsByParty.get(primarySpouse?.id || '') || ownFallback(['tenant_spouse', 'conjuge'], spouseDoc);
  if (formData.conjuge && primarySpouseDocs.length > 0) {
    hydrated.conjuge = {
      ...formData.conjuge,
      documentos: mergeFilesByCategory(formData.conjuge.documentos, primarySpouseDocs),
    };
  }

  if (Array.isArray(formData.locatarios_adicionais)) {
    hydrated.locatarios_adicionais = formData.locatarios_adicionais.map((loc: any, idx: number) => {
      const party = additionalTenants[idx];
      const spouse = spouseFor(party?.id, `additional_tenant_${idx + 1}`);
      return {
        ...loc,
        documentos: mergeFilesByCategory(loc.documentos, docsByParty.get(party?.id || '') || []),
        conjuge: loc.conjuge
          ? { ...loc.conjuge, documentos: mergeFilesByCategory(loc.conjuge.documentos, docsByParty.get(spouse?.id || '') || []) }
          : loc.conjuge,
      };
    });
  }

  if (formData.garantia && Array.isArray(formData.garantia.fiadores)) {
    hydrated.garantia = {
      ...formData.garantia,
      fiadores: formData.garantia.fiadores.map((fiador: any, idx: number) => {
        const party = guarantors[idx];
        const spouse = spouseFor(party?.id, `guarantor_${idx + 1}`);
        const ownDocs = docsByParty.get(party?.id || '') || ownFallback(['fiador'], nonSpouseDoc);
        const spouseDocsForFiador = docsByParty.get(spouse?.id || '') || ownFallback(['guarantor_spouse'], spouseDoc);
        return {
          ...fiador,
          documentos: mergeFilesByCategory(fiador.documentos, [...ownDocs, ...spouseDocsForFiador]),
        };
      }),
    };
  }

  return hydrated;
}

function getBrowserId(): string {
  const key = 'proposal_browser_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

interface StepWeight {
  step: number;
  weight: number;
  requiredFields: ((data: ProposalFormData) => boolean)[];
}

export function calcFormProgress(
  data: ProposalFormData,
  stepWeights: StepWeight[],
  skipConjuge: boolean
): { totalPercent: number; stepStatuses: Record<number, 'done' | 'partial' | 'pending'> } {
  let totalWeight = 0;
  let filledWeight = 0;
  const stepStatuses: Record<number, 'done' | 'partial' | 'pending'> = {};

  for (const sw of stepWeights) {
    if (skipConjuge && sw.step === (stepWeights.length > 8 ? 3 : 2)) continue;
    totalWeight += sw.weight;
    const total = sw.requiredFields.length;
    if (total === 0) {
      filledWeight += sw.weight;
      stepStatuses[sw.step] = 'done';
      continue;
    }
    const filled = sw.requiredFields.filter(fn => fn(data)).length;
    const ratio = filled / total;
    filledWeight += sw.weight * ratio;
    stepStatuses[sw.step] = ratio >= 1 ? 'done' : ratio > 0 ? 'partial' : 'pending';
  }

  const totalPercent = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;
  return { totalPercent, stepStatuses };
}

// Step weights for the PUBLIC form (8 steps, 0-indexed)
export const PUBLIC_STEP_WEIGHTS: StepWeight[] = [
  {
    step: 0, weight: 10, // Imóvel - auto-preenchido
    requiredFields: [
      d => !!d.imovel.codigo.trim(),
      d => !!d.imovel.endereco.trim(),
    ],
  },
  {
    step: 1, weight: 25, // Dados pessoais + renda (merged in public)
    requiredFields: [
      d => !!d.dados_pessoais.nome.trim(),
      d => !!d.dados_pessoais.cpf.trim(),
      d => !!d.dados_pessoais.whatsapp.trim(),
      d => !!d.dados_pessoais.email.trim(),
      d => !!d.perfil_financeiro.estado_civil,
      d => !!d.perfil_financeiro.fonte_renda,
      d => !!d.perfil_financeiro.renda_mensal.trim(),
    ],
  },
  {
    step: 2, weight: 10, // Cônjuge
    requiredFields: [
      d => !!d.conjuge.nome.trim(),
    ],
  },
  {
    step: 3, weight: 10, // Documentos
    requiredFields: [
      d => d.documentos.some(c => c.files.length > 0),
    ],
  },
  {
    step: 4, weight: 10, // Moradores
    requiredFields: [
      d => d.composicao.moradores.length > 0 && d.composicao.moradores.every(m => !!m.tipo),
    ],
  },
  {
    step: 5, weight: 20, // Garantia
    requiredFields: [
      d => !!d.garantia.tipo_garantia,
    ],
  },
  {
    step: 6, weight: 10, // Negociação
    requiredFields: [], // optional
  },
  {
    step: 7, weight: 5, // Revisão
    requiredFields: [],
  },
];

// Step weights for the INTERNAL form (9 steps, 0-indexed)
export const INTERNAL_STEP_WEIGHTS: StepWeight[] = [
  {
    step: 0, weight: 10,
    requiredFields: [
      d => !!d.imovel.codigo.trim(),
      d => !!d.imovel.endereco.trim(),
      d => !!d.imovel.tipo_pessoa,
    ],
  },
  {
    step: 1, weight: 15,
    requiredFields: [
      d => !!d.dados_pessoais.nome.trim(),
      d => !!d.dados_pessoais.cpf.trim(),
      d => !!d.dados_pessoais.whatsapp.trim(),
      d => !!d.dados_pessoais.email.trim(),
    ],
  },
  {
    step: 2, weight: 15,
    requiredFields: [
      d => !!d.perfil_financeiro.estado_civil,
      d => !!d.perfil_financeiro.fonte_renda,
      d => !!d.perfil_financeiro.renda_mensal.trim(),
    ],
  },
  {
    step: 3, weight: 10, // Cônjuge
    requiredFields: [
      d => !!d.conjuge.nome.trim(),
    ],
  },
  {
    step: 4, weight: 10, // Documentos
    requiredFields: [
      d => d.documentos.some(c => c.files.length > 0),
    ],
  },
  {
    step: 5, weight: 10, // Moradores
    requiredFields: [
      d => d.composicao.moradores.length > 0 && d.composicao.moradores.every(m => !!m.tipo),
    ],
  },
  {
    step: 6, weight: 15, // Garantia
    requiredFields: [
      d => !!d.garantia.tipo_garantia,
    ],
  },
  {
    step: 7, weight: 10, // Negociação
    requiredFields: [],
  },
  {
    step: 8, weight: 5, // Revisão
    requiredFields: [],
  },
];

type DraftStatus = 'rascunho' | 'em_andamento' | 'enviada';

interface UseProposalDraftOptions {
  codigoRobust?: string;
  proposalLinkId?: string | null;
  enabled?: boolean;
}

export function useProposalDraft({ codigoRobust, proposalLinkId, enabled = true }: UseProposalDraftOptions) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('rascunho');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoredData, setRestoredData] = useState<ProposalFormData | null>(null);
  const [restoredStep, setRestoredStep] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const browserId = useRef(getBrowserId());

  // Restore draft on mount
  useEffect(() => {
    if (!enabled || !codigoRobust) {
      setIsRestoring(false);
      return;
    }

    async function restore() {
      try {
        const codigoNum = parseInt(codigoRobust!, 10);
        if (isNaN(codigoNum)) { setIsRestoring(false); return; }

        // 1) Em modo correção (proposalLinkId presente), SEMPRE buscamos o último
        //    rascunho da proposta — inclusive 'enviada' — para que o cliente
        //    NÃO precise preencher tudo de novo, apenas sanar a pendência.
        let draft: any = null;
        if (proposalLinkId) {
          const { data: anyDraft } = await supabase
            .from('proposal_drafts')
            .select('*')
            .eq('proposal_link_id', proposalLinkId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          draft = anyDraft || null;
        }

        // 2) Caso normal (sem link de correção): rascunho deste navegador
        //    que ainda não foi enviado.
        if (!draft) {
          const { data: ownDraft } = await supabase
            .from('proposal_drafts')
            .select('*')
            .eq('codigo_robust', codigoNum)
            .eq('browser_id', browserId.current)
            .neq('status', 'enviada')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          draft = ownDraft || null;
        }

        if (draft) {
          setDraftId(draft.id);
          setDraftStatus(draft.status as DraftStatus);
          setLastSavedAt(new Date(draft.updated_at));
          const rawFormData = draft.form_data as any;
          let formData = rawFormData && typeof rawFormData === 'object'
            ? cleanDraftFiles(rawFormData)
            : rawFormData;
          if (formData && typeof formData === 'object') {
            if (proposalLinkId) {
              const [{ data: existingDocuments }, { data: existingParties }] = await Promise.all([
                supabase
                  .from('proposal_documents')
                  .select('id, category, category_label, owner_type, owner_label, file_name, original_file_name, file_size, mime_type, storage_path, party_id')
                  .eq('proposal_link_id', proposalLinkId),
                supabase
                  .from('proposal_parties' as any)
                  .select('id, role, position, related_party_id, metadata')
                  .eq('proposal_link_id', proposalLinkId)
                  .order('position', { ascending: true }),
              ]);
              formData = hydrateDraftWithExistingDocuments(
                formData,
                ((existingDocuments || []) as unknown as ExistingProposalDocument[]),
                ((existingParties || []) as unknown as ExistingProposalParty[]),
              );
            }
            setRestoredData(formData as ProposalFormData);
            setRestoredStep(draft.current_step);
          }
        }
      } catch (err) {
        console.error('Erro ao restaurar rascunho:', err);
      } finally {
        setIsRestoring(false);
      }
    }

    restore();
  }, [codigoRobust, enabled, proposalLinkId]);

  const saveDraft = useCallback(async (formData: ProposalFormData, currentStep: number, progressPercent: number) => {
    if (!enabled || !codigoRobust) return;
    setIsSaving(true);

    try {
      const codigoNum = parseInt(codigoRobust, 10);
      if (isNaN(codigoNum)) return;

      // Strip base64 file data from form_data to keep payload small
      const cleanData = {
        ...formData,
        documentos: formData.documentos.map(cat => ({
          ...cat,
          files: cat.files.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type, dataUrl: '' })),
        })),
      };

      const newStatus: DraftStatus = progressPercent > 5 ? 'em_andamento' : 'rascunho';

      if (draftId) {
        await supabase
          .from('proposal_drafts')
          .update({
            form_data: cleanData as any,
            current_step: currentStep,
            progress_percent: progressPercent,
            status: newStatus,
          })
          .eq('id', draftId);
      } else {
        const { data: newDraft } = await supabase
          .from('proposal_drafts')
          .insert({
            codigo_robust: codigoNum,
            proposal_link_id: proposalLinkId || null,
            browser_id: browserId.current,
            form_data: cleanData as any,
            current_step: currentStep,
            progress_percent: progressPercent,
            status: newStatus,
          })
          .select('id')
          .single();

        if (newDraft) setDraftId(newDraft.id);
      }

      setDraftStatus(newStatus);
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err);
    } finally {
      setIsSaving(false);
    }
  }, [codigoRobust, draftId, proposalLinkId, enabled]);

  // Debounced auto-save
  const scheduleSave = useCallback((formData: ProposalFormData, currentStep: number, progressPercent: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(formData, currentStep, progressPercent);
    }, 3000);
  }, [saveDraft]);

  // Mark as submitted
  const markAsSubmitted = useCallback(async () => {
    if (draftId) {
      await supabase
        .from('proposal_drafts')
        .update({ status: 'enviada', progress_percent: 100 })
        .eq('id', draftId);
      setDraftStatus('enviada');
    }
  }, [draftId]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return {
    draftId,
    draftStatus,
    lastSavedAt,
    isSaving,
    isRestoring,
    restoredData,
    restoredStep,
    scheduleSave,
    saveDraft,
    markAsSubmitted,
  };
}