import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProposalFormData } from '@/pages/PropostaLocacao';

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

        const { data: draft } = await supabase
          .from('proposal_drafts')
          .select('*')
          .eq('codigo_robust', codigoNum)
          .eq('browser_id', browserId.current)
          .neq('status', 'enviada')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (draft) {
          setDraftId(draft.id);
          setDraftStatus(draft.status as DraftStatus);
          setLastSavedAt(new Date(draft.updated_at));
          // Remove file data from restore (base64 too large, will be re-uploaded)
          const formData = draft.form_data as any;
          if (formData && typeof formData === 'object') {
            // Clear file uploads from restored data (they contain base64)
            if (formData.documentos) {
              formData.documentos = formData.documentos.map((cat: any) => ({
                ...cat,
                files: [],
              }));
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
  }, [codigoRobust, enabled]);

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