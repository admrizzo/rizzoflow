import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle, Plus, Trash2,
  Upload, FileText, Image, X, HelpCircle, ShieldCheck, ShieldAlert,
  Shield, MapPin, Loader2, Home, BedDouble, Bath, Maximize,
  User, Building, Phone, Mail, Briefcase, ChevronDown, Copy,
  DollarSign, Users, FileCheck, Lock, Handshake, ClipboardCheck,
  Zap, MessageSquare, CalendarDays, Info, Save, CloudOff, Cloud
} from 'lucide-react';
import type {
  ProposalFormData, DadosPessoais, MoradorData, FiadorData, UploadedFile,
  DocumentCategory, DocCategoryKey, FiadorTipo, FiadorDocumentCategory, FiadorConjugeData,
  EmpresaData, RepresentanteLegal, LocatarioAdicional,
} from '@/pages/PropostaLocacao';
import {
  calcPercentualComprometimento,
  emptyEmpresa, emptyRepresentante, REGIME_TRIBUTARIO_OPTIONS, PJ_DOC_CATEGORIES,
  emptyLocatarioAdicional,
} from '@/pages/PropostaLocacao';
import { useProposalDraft, calcFormProgress, PUBLIC_STEP_WEIGHTS } from '@/hooks/useProposalDraft';
import { FiadorSection } from '@/components/proposta/FiadorSection';
import { EmpresaForm } from '@/components/proposta/EmpresaForm';
import { RepresentantesForm } from '@/components/proposta/RepresentantesForm';
import { getPropertyIdentification } from '@/lib/propertyIdentification';
import {
  ProposalPartiesView,
  buildPartiesFromFormData,
  buildDocsByPartyFromFormData,
  countAllUploadedFiles,
  countPendingRequired,
} from '@/components/proposta/ProposalPartiesView';

// ── Upload de documentos da proposta para o Storage ──
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, b64] = dataUrl.split(',');
    if (!b64) return null;
    const mime = /data:([^;]+);base64/.exec(meta)?.[1] || 'application/octet-stream';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch { return null; }
}

const DOC_CATEGORY_LABELS: Record<string, string> = {
  documento_foto: 'Documento com foto',
  comprovante_residencia: 'Comprovante de residência',
  comprovante_renda: 'Comprovante de renda',
  estado_civil: 'Estado civil',
  matricula_imovel: 'Matrícula do imóvel',
  certidao_estado_civil: 'Certidão de estado civil',
  documento_conjuge: 'Documento do cônjuge',
  renda_conjuge: 'Renda do cônjuge',
};

// Chave canônica usada tanto em proposal_parties (mapeamento) como em jobs de upload
// para casar party_id ↔ documento. Idêntica à usada em persistProposalParties.
function partyKey(role: string, indexZeroBased = 0): string {
  return `${role}#${indexZeroBased}`;
}

const SPOUSE_DOC_KEYS = new Set<string>(['documento_conjuge', 'renda_conjuge']);

function isSpouseDocCategory(category: string): boolean {
  return SPOUSE_DOC_KEYS.has(category);
}

function hasUploadedFiles(categories?: Array<{ files?: UploadedFile[] }>): boolean {
  return Array.isArray(categories) && categories.some((cat) => (cat.files || []).length > 0);
}

function hasSpouseUploadedFiles(categories?: Array<{ key?: string; files?: UploadedFile[] }>): boolean {
  return Array.isArray(categories)
    && categories.some((cat) => !!cat.key && SPOUSE_DOC_KEYS.has(cat.key) && (cat.files || []).length > 0);
}

async function uploadProposalDocuments(
  cardId: string | null,
  proposalLinkId: string | null,
  data: ProposalFormData,
  partyMap: Map<string, string> = new Map(),
): Promise<{ attempted: number; succeeded: number }> {
  type Job = {
    ownerType: string;
    ownerKey: string;
    ownerLabel: string;
    ownerPersonName: string;
    ownerPersonRole: string;
    partyKey: string;
    spousePartyKey?: string;
    spouseName?: string;
    category: string;
    files: UploadedFile[];
  };
  type PreparedDocument = {
    path: string;
    payload: {
      card_id: string | null;
      proposal_link_id: string | null;
      party_id: string | null;
      category: string;
      category_label: string;
      owner_type: string;
      owner_label: string;
      file_name: string;
      original_file_name: string;
      file_size: number;
      mime_type: string;
      storage_path: string;
    };
  };

  const jobs: Job[] = [];
  const uploadedPaths: string[] = [];

  const failDocument = (message: string, details: Record<string, any>): never => {
    console.error('[uploadProposalDocuments] Falha crítica no envio de documento', details);
    throw new Error(message);
  };

  const cleanupUploadedPaths = async () => {
    if (uploadedPaths.length === 0) return;
    const { error } = await supabase.storage.from('proposal-documents').remove(uploadedPaths);
    if (error) {
      console.error('[uploadProposalDocuments] Falha ao limpar arquivos após erro', { paths: uploadedPaths, error });
    }
  };

  // Proponente / Empresa
  const isPj = data.imovel.tipo_pessoa === 'juridica';
  const proponentLabel = isPj
    ? (data.empresa.razao_social || data.empresa.nome_fantasia || 'Empresa')
    : (data.dados_pessoais.nome || 'Proponente');
  const proponentOwnerType = isPj ? 'empresa' : 'proponente';
  const proponentOwnerKey = proponentOwnerType; // único por proposta
  const spouseName = (data.conjuge?.nome || '').trim();
  const principalPartyKey = isPj ? partyKey('company') : partyKey('primary_tenant');
  const principalSpousePartyKey = isPj ? undefined : partyKey('tenant_spouse', 0);
  for (const cat of data.documentos || []) {
    if (cat.files.length > 0) {
      jobs.push({
        ownerType: proponentOwnerType,
        ownerKey: proponentOwnerKey,
        ownerLabel: proponentLabel,
        ownerPersonName: proponentLabel,
        ownerPersonRole: isPj ? 'EMPRESA' : 'TITULAR',
        partyKey: principalPartyKey,
        spousePartyKey: principalSpousePartyKey,
        spouseName,
        category: cat.key,
        files: cat.files,
      });
    }
  }

  for (const cat of data.conjuge?.documentos || []) {
    if (cat.files.length > 0 && principalSpousePartyKey) {
      jobs.push({
        ownerType: 'tenant_spouse',
        ownerKey: `${proponentOwnerKey}-conjuge`,
        ownerLabel: spouseName || 'Cônjuge do locatário principal',
        ownerPersonName: proponentLabel,
        ownerPersonRole: 'TITULAR',
        partyKey: principalPartyKey,
        spousePartyKey: principalSpousePartyKey,
        spouseName,
        category: cat.key,
        files: cat.files,
      });
    }
  }

  // Locatários adicionais (PF)
  if (!isPj) {
    (data.locatarios_adicionais || []).forEach((loc, idx) => {
      const label = loc.nome ? `Locatário adicional ${idx + 1} — ${loc.nome}` : `Locatário adicional ${idx + 1}`;
      const personName = loc.nome || `Locatário ${idx + 2}`;
      const ownerKey = `locatario-${idx + 1}`;
      const locSpouseName = (loc.conjuge?.nome || '').trim();
      const locPartyKey = partyKey('additional_tenant', idx);
      // O cônjuge do adicional vem após o adicional na inserção em proposal_parties.
      // Por isso, em vez de tentar prever o índice no mapa de tenant_spouse,
      // resolvemos a partir do metadata.spouse_of (vide buildPartyMap abaixo).
      const locSpousePartyKey = partyKey('tenant_spouse_of_additional', idx);
      for (const cat of loc.documentos || []) {
        if (cat.files.length > 0) {
          jobs.push({
            ownerType: 'proponente',
            ownerKey,
            ownerLabel: label,
            ownerPersonName: personName,
            ownerPersonRole: 'LOCATARIO ADICIONAL',
            partyKey: locPartyKey,
            spousePartyKey: locSpousePartyKey,
            spouseName: locSpouseName,
            category: cat.key,
            files: cat.files,
          });
        }
      }
      for (const cat of loc.conjuge?.documentos || []) {
        if (cat.files.length > 0) {
          jobs.push({
            ownerType: 'tenant_spouse',
            ownerKey: `${ownerKey}-conjuge`,
            ownerLabel: locSpouseName || `Cônjuge do locatário adicional ${idx + 1}`,
            ownerPersonName: personName,
            ownerPersonRole: 'LOCATARIO ADICIONAL',
            partyKey: locPartyKey,
            spousePartyKey: locSpousePartyKey,
            spouseName: locSpouseName,
            category: cat.key,
            files: cat.files,
          });
        }
      }
    });
  }

  // Fiadores. Os documentos de cônjuge do fiador ficam nas categorias
  // documento_conjuge/renda_conjuge do próprio bloco do fiador.
  (data.garantia.fiadores || []).forEach((f, idx) => {
    const label = f.nome ? `Fiador ${idx + 1} — ${f.nome}` : `Fiador ${idx + 1}`;
    const ownerKey = `fiador-${idx + 1}`;
    const fiadorSpouseName = (f.conjuge?.nome || '').trim();
    const fiadorPartyKey = partyKey('guarantor', idx);
    const fiadorSpousePartyKey = partyKey('guarantor_spouse', idx);
    for (const cat of f.documentos || []) {
      if (cat.files.length > 0) {
        jobs.push({
          ownerType: 'fiador',
          ownerKey,
          ownerLabel: label,
          ownerPersonName: f.nome || `Fiador ${idx + 1}`,
          ownerPersonRole: 'FIADOR',
          partyKey: fiadorPartyKey,
          spousePartyKey: fiadorSpousePartyKey,
          spouseName: fiadorSpouseName,
          category: cat.key,
          files: cat.files,
        });
      }
    }
  });

  // Dedup: evita enviar duas vezes o mesmo arquivo (mesmo ownerKey + categoria + nome + tamanho)
  const seen = new Set<string>();
  // Controle de duplicidade do nome final padronizado por proposta
  const usedFinalNames = new Map<string, number>();
  const preparedDocuments: PreparedDocument[] = [];
  let attempted = 0;

  try {
    for (const job of jobs) {
      for (const file of job.files) {
        const dedupKey = `${job.ownerKey}|${job.category}|${file.name}|${file.size ?? 0}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const isSpouseDoc = isSpouseDocCategory(job.category);
        const targetLabel = isSpouseDoc
          ? (job.spouseName || job.ownerLabel || 'Cônjuge')
          : job.ownerLabel;
        const targetGroup = isSpouseDoc
          ? `documento do cônjuge de ${job.ownerPersonName}`
          : `documento de ${targetLabel}`;

        if (!file.dataUrl) {
          failDocument(`Falha ao enviar ${targetGroup}.`, { reason: 'missing_data_url', job, file });
        }
        const blob = dataUrlToBlob(file.dataUrl);
        if (!blob) {
          failDocument(`Falha ao preparar ${targetGroup}.`, { reason: 'invalid_data_url', job, file });
        }
        attempted++;

        // Nome padronizado: TIPO_DOC - NOME_PESSOA - TIPO_PESSOA.EXT
        const personName = isSpouseDoc ? targetLabel : job.ownerPersonName;
        // Para cônjuges, indicamos a quem o cônjuge pertence:
        // CONJUGE DO LOCATARIO PRINCIPAL / DO LOCATARIO ADICIONAL / DO FIADOR / DA EMPRESA
        let personRole = job.ownerPersonRole;
        if (isSpouseDoc) {
          if (job.ownerPersonRole === 'TITULAR') personRole = 'CONJUGE DO LOCATARIO PRINCIPAL';
          else if (job.ownerPersonRole === 'LOCATARIO ADICIONAL') personRole = 'CONJUGE DO LOCATARIO ADICIONAL';
          else if (job.ownerPersonRole === 'FIADOR') personRole = 'CONJUGE DO FIADOR';
          else personRole = 'CONJUGE';
        }
        const docTypeLabel = DOC_CATEGORY_LABELS[job.category] || job.category;
        const standardized = buildStandardDocName(file.name, docTypeLabel, personName, personRole, usedFinalNames);
        const safeName = file.name.replace(/[^\w.\-]/g, '_');
        // Resolve party_id pelo mapa (role+idx). Cônjuge tem party própria.
        const resolvedPartyId = isSpouseDoc && job.spousePartyKey
          ? (partyMap.get(job.spousePartyKey) || null)
          : (partyMap.get(job.partyKey) || null);
        const resolvedOwnerType = isSpouseDoc
          ? (job.ownerPersonRole === 'FIADOR' ? 'guarantor_spouse' : 'tenant_spouse')
          : job.ownerType;
        const resolvedOwnerLabel = isSpouseDoc ? targetLabel : job.ownerLabel;
        if (isSpouseDoc && !resolvedPartyId) {
          failDocument(`Falha ao enviar documento do cônjuge de ${job.ownerPersonName}.`, {
            reason: 'spouse_party_id_missing',
            category: job.category,
            spousePartyKey: job.spousePartyKey,
            partyMapKeys: Array.from(partyMap.keys()),
            job,
          });
        }
        // Caminho: {link}/{party_id || ownerKey}/{categoria}/{timestamp}_{nome_sanitizado}
        const pathPrefix = proposalLinkId || cardId || 'orfaos';
        const personSegment = resolvedPartyId || job.ownerKey;
        const path = `${pathPrefix}/${personSegment}/${job.category}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('proposal-documents')
          .upload(path, blob, { contentType: file.type || blob.type, upsert: false });
        if (upErr) {
          failDocument(`Falha ao enviar ${targetGroup}.`, { reason: 'storage_upload_error', path, upErr, job, file });
        }
        uploadedPaths.push(path);
        preparedDocuments.push({
          path,
          payload: {
            card_id: cardId,
            proposal_link_id: proposalLinkId,
            party_id: resolvedPartyId,
            category: job.category,
            category_label: DOC_CATEGORY_LABELS[job.category] || job.category,
            owner_type: resolvedOwnerType,
            owner_label: resolvedOwnerLabel,
            file_name: standardized,
            original_file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: path,
          },
        });
      }
    }

    if (attempted !== preparedDocuments.length) {
      failDocument('Não foi possível enviar todos os documentos.', {
        reason: 'upload_count_mismatch',
        attempted,
        prepared: preparedDocuments.length,
      });
    }

    if (preparedDocuments.length > 0) {
      const { error: insErr } = await supabase
        .from('proposal_documents')
        .insert(preparedDocuments.map((doc) => doc.payload));
      if (insErr) {
        failDocument('Não foi possível registrar todos os documentos enviados.', {
          reason: 'proposal_documents_bulk_insert_error',
          paths: preparedDocuments.map((doc) => doc.path),
          insErr,
        });
      }
    }
  } catch (err) {
    await cleanupUploadedPaths();
    throw err;
  }

  return { attempted, succeeded: preparedDocuments.length };
}

// ── Persiste partes estruturadas (locatários, cônjuges, fiadores, empresa, representantes) ──
// Idempotente por proposal_link_id: limpa e reescreve.
async function persistProposalParties(
  proposalLinkId: string,
  cardId: string | null,
  data: ProposalFormData,
): Promise<Map<string, string>> {
  const parseNum = (s: string | undefined | null): number | null => {
    if (!s) return null;
    const cleaned = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  };

  type PartyRow = {
    proposal_link_id: string;
    card_id: string | null;
    role: string;
    person_type: 'pf' | 'pj';
    name: string | null;
    cpf: string | null;
    cnpj: string | null;
    rg: string | null;
    email: string | null;
    phone: string | null;
    marital_status: string | null;
    profession: string | null;
    income: number | null;
    address: string | null;
    position: number;
    metadata: Record<string, any>;
  };

  // Acumula linhas com sua "chave canônica" para conseguirmos remontar party_id por papel/índice
  // após a inserção (Supabase retorna na mesma ordem com `.select()`).
  const rows: PartyRow[] = [];
  const rowKeys: string[] = [];
  const pushRow = (key: string, row: PartyRow) => {
    rowKeys.push(key);
    rows.push(row);
  };
  let pos = 0;
  const isPj = data.imovel.tipo_pessoa === 'juridica';

  if (isPj) {
    // Empresa
    const e = data.empresa;
    pushRow(partyKey('company'), {
      proposal_link_id: proposalLinkId,
      card_id: cardId,
      role: 'company',
      person_type: 'pj',
      name: e.razao_social || e.nome_fantasia || null,
      cpf: null,
      cnpj: e.cnpj || null,
      rg: null,
      email: e.email || null,
      phone: e.telefone || null,
      marital_status: null,
      profession: null,
      income: parseNum(e.faturamento_mensal),
      address: [e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep]
        .filter(Boolean).join(', ') || null,
      position: pos++,
      metadata: {
        nome_fantasia: e.nome_fantasia || null,
        ramo_atividade: e.ramo_atividade || null,
        regime_tributario: e.regime_tributario || null,
        data_abertura: e.data_abertura || null,
        tempo_atividade: e.tempo_atividade || null,
      },
    });
    // Representantes legais
    (data.representantes || []).forEach((r, idx) => {
      pushRow(partyKey('legal_representative', idx), {
        proposal_link_id: proposalLinkId,
        card_id: cardId,
        role: 'legal_representative',
        person_type: 'pf',
        name: r.nome || null,
        cpf: r.cpf || null,
        cnpj: null,
        rg: null,
        email: r.email || null,
        phone: r.whatsapp || null,
        marital_status: null,
        profession: r.profissao || null,
        income: null,
        address: [r.logradouro, r.numero, r.complemento, r.bairro, r.cidade, r.uf, r.cep]
          .filter(Boolean).join(', ') || null,
        position: pos++,
        metadata: {
          is_socio: !!r.is_socio,
          is_administrador: !!r.is_administrador,
          is_signatario: !!r.is_signatario,
        },
      });
    });
  } else {
    // Locatário principal (PF)
    const dp = data.dados_pessoais;
    const pf = data.perfil_financeiro;
    pushRow(partyKey('primary_tenant'), {
      proposal_link_id: proposalLinkId,
      card_id: cardId,
      role: 'primary_tenant',
      person_type: 'pf',
      name: dp.nome || null,
      cpf: dp.cpf || null,
      cnpj: null,
      rg: null,
      email: dp.email || null,
      phone: dp.whatsapp || null,
      marital_status: pf.estado_civil || null,
      profession: dp.profissao || null,
      income: parseNum(pf.renda_mensal),
      address: null,
      position: pos++,
      metadata: {
        regime_bens: pf.regime_bens || null,
        conjuge_participa: pf.conjuge_participa || null,
        fonte_renda: pf.fonte_renda || null,
      },
    });
    // Cônjuge do principal (se existir)
    const cj = data.conjuge;
    const hasSpouse = !!(cj && (cj.nome || cj.cpf || cj.email || hasUploadedFiles(cj.documentos)));
    if (hasSpouse) {
      pushRow(partyKey('tenant_spouse', 0), {
        proposal_link_id: proposalLinkId,
        card_id: cardId,
        role: 'tenant_spouse',
        person_type: 'pf',
        name: cj.nome || null,
        cpf: cj.cpf || null,
        cnpj: null,
        rg: null,
        email: cj.email || null,
        phone: cj.whatsapp || null,
        marital_status: null,
        profession: cj.profissao || null,
        income: null,
        address: null,
        position: pos++,
        metadata: { spouse_of: 'primary_tenant' },
      });
    }
    // Locatários adicionais
    (data.locatarios_adicionais || []).forEach((loc, idx) => {
      pushRow(partyKey('additional_tenant', idx), {
        proposal_link_id: proposalLinkId,
        card_id: cardId,
        role: 'additional_tenant',
        person_type: 'pf',
        name: loc.nome || null,
        cpf: loc.cpf || null,
        cnpj: null,
        rg: loc.rg || null,
        email: loc.email || null,
        phone: loc.whatsapp || null,
        marital_status: loc.estado_civil || null,
        profession: loc.profissao || null,
        income: parseNum(loc.renda_mensal),
        address: loc.endereco || null,
        position: pos++,
        metadata: {
          tenant_index: idx + 1,
          regime_bens: loc.regime_bens || null,
          conjuge_participa: loc.conjuge_participa || null,
        },
      });
      const lc = loc.conjuge;
      const hasLocSpouse = !!(lc && (lc.nome || lc.cpf || lc.email || hasUploadedFiles(lc.documentos)));
      if (hasLocSpouse) {
        // Chave dedicada por índice do locatário adicional para casar com job.spousePartyKey
        pushRow(partyKey('tenant_spouse_of_additional', idx), {
          proposal_link_id: proposalLinkId,
          card_id: cardId,
          role: 'tenant_spouse',
          person_type: 'pf',
          name: lc.nome || null,
          cpf: lc.cpf || null,
          cnpj: null,
          rg: lc.rg || null,
          email: lc.email || null,
          phone: lc.whatsapp || null,
          marital_status: null,
          profession: null,
          income: null,
          address: null,
          position: pos++,
          metadata: { spouse_of: `additional_tenant_${idx + 1}` },
        });
      }
    });
  }

  // Fiadores + cônjuges (independente de PF/PJ)
  (data.garantia?.fiadores || []).forEach((f, idx) => {
    pushRow(partyKey('guarantor', idx), {
      proposal_link_id: proposalLinkId,
      card_id: cardId,
      role: 'guarantor',
      person_type: 'pf',
      name: f.nome || null,
      cpf: f.cpf || null,
      cnpj: null,
      rg: null,
      email: f.email || null,
      phone: f.whatsapp || null,
      marital_status: f.estado_civil || null,
      profession: f.profissao || null,
      income: parseNum(f.renda_mensal),
      address: [f.logradouro, f.numero, f.complemento, f.bairro, f.cidade, f.uf, f.cep]
        .filter(Boolean).join(', ') || null,
      position: pos++,
      metadata: {
        guarantor_index: idx + 1,
        tipo_fiador: f.tipo_fiador || null,
        registro_imoveis: f.registro_imoveis || null,
        regime_bens: f.regime_bens || null,
        conjuge_participa: f.conjuge_participa || null,
      },
    });
    const fc = f.conjuge;
    const hasFiadorSpouse = !!(fc && (fc.nome || fc.cpf || fc.email || hasSpouseUploadedFiles(f.documentos)));
    if (hasFiadorSpouse) {
      pushRow(partyKey('guarantor_spouse', idx), {
        proposal_link_id: proposalLinkId,
        card_id: cardId,
        role: 'guarantor_spouse',
        person_type: 'pf',
        name: fc.nome || null,
        cpf: fc.cpf || null,
        cnpj: null,
        rg: fc.documento_identidade || null,
        email: fc.email || null,
        phone: fc.whatsapp || null,
        marital_status: null,
        profession: null,
        income: null,
        address: null,
        position: pos++,
        metadata: { spouse_of: `guarantor_${idx + 1}` },
      });
    }
  });

  if (rows.length === 0) return new Map();

  // Apaga partes anteriores deste link (idempotência) e reinsere.
  await supabase.from('proposal_parties' as any).delete().eq('proposal_link_id', proposalLinkId);
  const { data: inserted, error } = await supabase
    .from('proposal_parties' as any)
    .insert(rows as any)
    .select('id, position');
  if (error) throw error;

  // Constrói o mapa partyKey → party_id, casando por position (preservada na ordem dos rows).
  const map = new Map<string, string>();
  const sorted = [...((inserted as any[]) || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  rows.forEach((r, i) => {
    const ins = sorted[i];
    if (ins?.id) map.set(rowKeys[i], ins.id);
  });

  // ── Segunda passagem: vincula cônjuges ao titular/fiador via related_party_id ──
  // Cônjuge do locatário principal → primary_tenant
  // Cônjuge de locatário adicional N → additional_tenant N
  // Cônjuge de fiador N → guarantor N
  const updates: Array<{ id: string; related_party_id: string }> = [];
  rows.forEach((r, i) => {
    const childKey = rowKeys[i];
    const childId = map.get(childKey);
    if (!childId) return;
    let parentKey: string | null = null;
    if (childKey.startsWith('tenant_spouse#')) {
      parentKey = partyKey('primary_tenant');
    } else if (childKey.startsWith('tenant_spouse_of_additional#')) {
      const idx = Number(childKey.split('#')[1] || '0');
      parentKey = partyKey('additional_tenant', idx);
    } else if (childKey.startsWith('guarantor_spouse#')) {
      const idx = Number(childKey.split('#')[1] || '0');
      parentKey = partyKey('guarantor', idx);
    }
    if (!parentKey) return;
    const parentId = map.get(parentKey);
    if (parentId) updates.push({ id: childId, related_party_id: parentId });
  });
  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        supabase
          .from('proposal_parties' as any)
          .update({ related_party_id: u.related_party_id })
          .eq('id', u.id),
      ),
    );
  }

  return map;
}

// Remove acentos, caracteres inválidos e normaliza para o padrão de nome de arquivo.
function sanitizeForFilename(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[\\/:*?"<>|]/g, ' ') // remove inválidos do filesystem
    .replace(/[^\w\s\-]/g, ' ') // permite letra/número/_/-/espaço
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getFileExtension(originalName: string): string {
  const idx = originalName.lastIndexOf('.');
  if (idx <= 0 || idx === originalName.length - 1) return '';
  return originalName.slice(idx + 1).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildStandardDocName(
  originalName: string,
  docType: string,
  personName: string,
  personRole: string,
  usedNames: Map<string, number>,
): string {
  const ext = getFileExtension(originalName);
  const docPart = sanitizeForFilename(docType) || 'DOCUMENTO';
  const namePart = sanitizeForFilename(personName) || 'SEM NOME';
  const rolePart = sanitizeForFilename(personRole) || 'OUTROS';
  const base = `${docPart} - ${namePart} - ${rolePart}`;
  const finalBase = ext ? `${base}.${ext}` : base;
  const count = usedNames.get(finalBase) || 0;
  usedNames.set(finalBase, count + 1);
  if (count === 0) return finalBase;
  // duplicidade: insere (n) antes da extensão
  if (ext) return `${base} (${count + 1}).${ext}`;
  return `${base} (${count + 1})`;
}

// ── Constants ──
const emptyPerson: DadosPessoais = { nome: '', cpf: '', profissao: '', whatsapp: '', email: '' };
const emptyMorador: MoradorData = { tipo: '', nome: '' };
const emptyFiadorConjuge: FiadorConjugeData = { nome: '', cpf: '', documento_identidade: '', whatsapp: '', email: '' };

const FIADOR_DOC_RENDA: FiadorDocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento oficial com foto', help: 'CNH, ou RG + CPF (frente e verso). Documento dentro da validade.', files: [] },
  { key: 'comprovante_renda', label: 'Comprovante de renda', help: '3 últimos contracheques, extratos bancários ou declaração de IR.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet — emitido nos últimos 90 dias.', files: [] },
  { key: 'certidao_estado_civil', label: 'Certidão de estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];

const FIADOR_DOC_IMOVEL: FiadorDocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento oficial com foto', help: 'CNH, ou RG + CPF (frente e verso). Documento dentro da validade.', files: [] },
  { key: 'matricula_imovel', label: 'Certidão de matrícula do imóvel', help: 'Matrícula atualizada — emitida nos últimos 90 dias. Imóvel quitado em Goiânia.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet — emitido nos últimos 90 dias.', files: [] },
  { key: 'certidao_estado_civil', label: 'Certidão de estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];

const FIADOR_DOC_CONJUGE_OBRIG: FiadorDocumentCategory = {
  key: 'documento_conjuge', label: 'Documento do cônjuge (obrigatório)',
  help: 'CNH, ou RG + CPF do cônjuge (frente e verso). Documento dentro da validade.', files: [],
};
const FIADOR_DOC_CONJUGE_RENDA: FiadorDocumentCategory = {
  key: 'renda_conjuge', label: 'Comprovante de renda do cônjuge (opcional)',
  help: 'Reforça a análise de crédito. Holerite, IR ou extrato bancário.', files: [],
};

function buildFiadorDocs(tipo: FiadorTipo, casadoComConjuge: boolean): FiadorDocumentCategory[] {
  const base = tipo === 'imovel'
    ? FIADOR_DOC_IMOVEL.map(c => ({ ...c, files: [] }))
    : FIADOR_DOC_RENDA.map(c => ({ ...c, files: [] }));
  if (casadoComConjuge) {
    base.push({ ...FIADOR_DOC_CONJUGE_OBRIG, files: [] });
    base.push({ ...FIADOR_DOC_CONJUGE_RENDA, files: [] });
  }
  return base;
}

function makeEmptyFiador(tipo: FiadorTipo = ''): FiadorData {
  return {
    tipo_fiador: tipo,
    nome: '', cpf: '', profissao: '', whatsapp: '', email: '',
    estado_civil: '',
    renda_mensal: '',
    registro_imoveis: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    regime_bens: '', conjuge_participa: '',
    conjuge: { ...emptyFiadorConjuge },
    documentos: tipo ? buildFiadorDocs(tipo, false) : [],
  };
}

const emptyFiador: FiadorData = makeEmptyFiador();

// Helpers regras de cônjuge para fiador (mesma lógica do inquilino)
function fiadorIsCasado(f: FiadorData): boolean {
  return f.estado_civil === 'Casado(a)' || f.estado_civil === 'União Estável';
}
function fiadorNeedsConjuge(f: FiadorData): boolean {
  if (!fiadorIsCasado(f)) return false;
  if (!f.regime_bens) return false;
  if (f.regime_bens === 'Separação total / absoluta de bens') return f.conjuge_participa === 'sim';
  return true;
}

const INITIAL_DOC_CATEGORIES: DocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento com foto (CPF/RG/CNH)', help: 'Envie frente e verso do documento com foto.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet dos últimos 3 meses.', files: [] },
  { key: 'comprovante_renda', label: 'Comprovante de renda', help: 'Holerite, declaração de IR, extrato bancário ou pró-labore.', files: [] },
  { key: 'estado_civil', label: 'Estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];

// Template de documentos por locatário adicional — mesmas categorias do principal PF
function buildLocatarioAdicionalDocs(): DocumentCategory[] {
  return INITIAL_DOC_CATEGORIES.map(c => ({ ...c, files: [] }));
}

function buildConjugeDocs(): DocumentCategory[] {
  return [
    { key: 'documento_conjuge' as DocCategoryKey, label: 'Documento do cônjuge', help: 'CNH, ou RG + CPF do cônjuge (frente e verso). Documento dentro da validade.', files: [] },
    { key: 'renda_conjuge' as DocCategoryKey, label: 'Comprovante de renda do cônjuge (opcional)', help: 'Holerite, declaração de IR, extrato bancário ou pró-labore do cônjuge.', files: [] },
  ];
}

function ensureConjugeDocs(categories?: DocumentCategory[]): DocumentCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) return buildConjugeDocs();
  const byKey = new Map(categories.map((cat) => [cat.key, cat]));
  return buildConjugeDocs().map((cat) => ({ ...cat, files: byKey.get(cat.key)?.files || [] }));
}

function locatarioNeedsConjuge(loc: LocatarioAdicional): boolean {
  return loc.estado_civil === 'Casado(a)' || loc.estado_civil === 'União Estável';
}

const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.pdf';
const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CIVIL_STATUS = [
  { label: 'Solteiro(a)', icon: '👤' },
  { label: 'Casado(a)', icon: '💍' },
  { label: 'Divorciado(a)', icon: '📋' },
  { label: 'Viúvo(a)', icon: '🕊️' },
  { label: 'União Estável', icon: '🤝' },
];

const REGIME_BENS_OPTIONS = [
  'Comunhão parcial de bens',
  'Comunhão universal de bens',
  'Separação total / absoluta de bens',
  'Participação final nos aquestos',
];

const RENDA_SOURCES = [
  { value: 'Empregado(a)', icon: '💼', label: 'Empregado(a)' },
  { value: 'Funcionário Público', icon: '🏛️', label: 'Funcionário Público' },
  { value: 'Autônomo(a)', icon: '🔧', label: 'Autônomo(a)' },
  { value: 'Empresário(a)', icon: '🏢', label: 'Empresário(a)' },
];

const GARANTIA_OPTIONS = [
  {
    value: 'Seguro Fiança', icon: '🛡️', badge: 'Mais escolhida ⭐',
    subtitle: 'Seguradora garante o contrato, sem fiadores',
    detail: 'Nessa modalidade você **não precisa de fiadores** e paga mensalmente um percentual a partir de 15,5% (pode variar conforme aprovação da seguradora) juntamente com seu aluguel.',
    estimatePercent: 15.5,
    vantagens: ['Cobertura completa (inadimplência + danos)', 'Sem envolver terceiros', 'Aceito amplamente no mercado'],
    atencao: ['Necessária aprovação de crédito na seguradora', 'O valor não é ressarcido'],
  },
  {
    value: 'Fiador', icon: '👥', badge: null,
    subtitle: 'Pessoa que garante o contrato',
    detail: 'Informe os dados de 1 ou 2 fiadores. Eles serão contatados para confirmação e envio de documentação.',
    estimatePercent: 0,
    vantagens: ['Sem custo adicional mensal', 'Não envolve seguradora', 'Processo simples com documentação'],
    atencao: ['Fiador precisa ter imóvel quitado', 'Pode ser necessário mais de 1 fiador'],
  },
  {
    value: 'Título de Capitalização', icon: '📈', badge: null,
    subtitle: 'Investimento como garantia',
    detail: 'Você adquire um título de capitalização que serve como caução. Ao final do contrato, o valor é devolvido com correção.',
    estimatePercent: 0,
    vantagens: ['Valor devolvido ao final do contrato', 'Sem envolver terceiros', 'Aceito por todas as imobiliárias'],
    atencao: ['Valor inicial pode ser alto (6 a 12x aluguel)', 'Capital fica bloqueado durante o contrato'],
  },
  {
    value: 'Carta Fiança', icon: '📄', badge: null,
    subtitle: 'Carta bancária de garantia',
    detail: 'O banco emite uma carta garantindo o pagamento. Modalidade segura e aceita no mercado.',
    estimatePercent: 0,
    vantagens: ['Alta credibilidade', 'Sem envolver terceiros', 'Aceita por grandes imobiliárias'],
    atencao: ['Taxas bancárias podem ser elevadas', 'Requer relacionamento com o banco'],
  },
  {
    value: 'Caução', icon: '💰', badge: null,
    subtitle: 'Depósito de até 3 meses de aluguel',
    detail: 'Depósito de até 3 meses de aluguel, que poderá ser utilizado como garantia da locação. Essa modalidade está sujeita à análise de crédito e aprovação, podendo variar conforme o perfil do cliente e do imóvel.',
    estimatePercent: 0,
    vantagens: ['Sem envolver terceiros', 'Sem custo mensal adicional', 'Valor devolvido ao final do contrato'],
    atencao: ['Sujeito à análise de crédito e aprovação', 'Imobilização de capital no início'],
  },
];

const MORADOR_TYPES = [
  { value: 'eu_mesmo', label: 'Eu mesmo' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'terceiro', label: 'Terceiro' },
];

const FAQ_ITEMS = [
  { Icon: Shield, q: 'O que posso apresentar como garantia?', a: 'As modalidades de garantia aceitas são:\n\n• Seguro Fiança\n• Fiador: sendo necessário apresentar 2 fiadores, sendo:\n   - 1 com renda comprovada (mínimo de 3x o valor do aluguel)\n   - 1 com imóvel quitado localizado em um raio de até 200km de Goiânia (para facilitar validação e execução contratual, se necessário)\n• Título de Capitalização\n• Caução (até 3 meses de aluguel, conforme análise)\n\nA definição da garantia está sujeita à análise de crédito e aprovação da imobiliária.' },
  { Icon: Users, q: 'No caso de fiador, pode ser um só?', a: 'Não. Para essa modalidade, normalmente são necessários dois fiadores:\n\n• 1 fiador com renda comprovada (mínimo de 3x o valor do aluguel)\n• 1 fiador com imóvel quitado localizado em um raio de até 200km de Goiânia\n\nEssa estrutura garante mais segurança para o contrato e faz parte da política de análise da imobiliária.\n\nEm casos específicos, a exigência pode variar conforme análise de crédito.' },
  { Icon: FileText, q: 'O que é aceito como comprovação de renda?', a: 'Holerite dos últimos 3 meses, Declaração de Imposto de Renda, extratos bancários dos últimos 3 meses.' },
  { Icon: Home, q: 'O que vale como comprovante de endereço e estado civil?', a: 'Conta de luz, água, gás ou internet dos últimos 3 meses. Para estado civil: certidão de nascimento, casamento ou averbação.' },
  { Icon: FileCheck, q: 'Comprovação de imóvel do fiador — o que serve?', a: 'Para validação do fiador com imóvel, é necessário apresentar a certidão de matrícula atualizada do imóvel (emitida há no máximo 90 dias), comprovando que o bem está quitado.\n\nTambém poderá ser solicitado comprovante de endereço atualizado e, se necessário, documentos complementares para validação da propriedade.\n\nImportante: o imóvel deve estar localizado preferencialmente em Goiânia ou em um raio de até 200km, conforme análise da imobiliária.' },
  { Icon: CalendarDays, q: 'Em quanto tempo pego a chave?', a: 'Após a aprovação da proposta e assinatura do contrato, a liberação das chaves normalmente ocorre em até 3 dias úteis.\n\nEsse prazo pode variar conforme a finalização de etapas como documentação, garantia escolhida e organização do imóvel para entrega.' },
  { Icon: DollarSign, q: 'Tem algum custo no contrato?', a: 'Sim. Durante a locação, é cobrado o FCI (Fundo de Conservação do Imóvel), correspondente a 3% do valor do aluguel mensal.\n\nEsse valor é utilizado para auxiliar na conservação do imóvel ao longo ou fim do contrato de locação.\n\nAlém disso, demais encargos da locação seguem as condições previstas em contrato, como aluguel, condomínio, seguro incêndio, IPTU e consumo de serviços.' },
];

const LOCACAO_BOARD_ID = '3b619b46-85bf-487d-955b-e1255b1bf174';
const CADASTRO_INICIADO_COLUMN_ID = '98579480-4d58-44f4-86dd-82c89e8f9f53';

const STEP_CONFIG = [
  { label: 'Imóvel e Tipo', shortLabel: 'Imóvel e Tipo', icon: Home },
  { label: 'Dados Pessoais', shortLabel: 'Dados Pessoais', icon: User },
  { label: 'Cônjuge / Sócios', shortLabel: 'Cônjuge / Sócios', icon: Users },
  { label: 'Documentos', shortLabel: 'Documentos', icon: FileCheck },
  { label: 'Moradores', shortLabel: 'Moradores', icon: BedDouble },
  { label: 'Garantia', shortLabel: 'Garantia', icon: Lock },
  { label: 'Negociação', shortLabel: 'Negociação', icon: Handshake },
  { label: 'Revisão', shortLabel: 'Revisão', icon: ClipboardCheck },
];

function parseCurrency(val: string): number {
  const cleaned = val.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function vv(val: string | undefined | null): string {
  return val && val.trim() ? val : 'Não informado';
}

function vvCurrency(val: string | undefined | null): string {
  if (!val || !val.trim()) return 'Não informado';
  const num = parseCurrency(val);
  if (!num) return 'Não informado';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isCasadoOuUniao(data: ProposalFormData) {
  const civil = data.perfil_financeiro.estado_civil;
  return civil === 'Casado(a)' || civil === 'União Estável';
}

function needsConjuge(data: ProposalFormData) {
  // PJ não tem cônjuge — empresa não tem estado civil
  if (data.imovel.tipo_pessoa === 'juridica') return false;
  if (!isCasadoOuUniao(data)) return false;
  const regime = data.perfil_financeiro.regime_bens;
  if (!regime) return false;
  if (regime === 'Separação total / absoluta de bens') {
    return data.perfil_financeiro.conjuge_participa === 'sim';
  }
  return true;
}

function isPJ(data: ProposalFormData) {
  return data.imovel.tipo_pessoa === 'juridica';
}

function validateStep(step: number, data: ProposalFormData): string[] {
  const errors: string[] = [];
  const pj = isPJ(data);
  switch (step) {
    case 0: break; // Imóvel e Tipo — auto-preenchido
    case 1:
      if (pj) {
        // PJ: dados da empresa
        if (!data.empresa.razao_social.trim()) errors.push('Razão Social é obrigatória');
        if (!data.empresa.cnpj.trim()) errors.push('CNPJ é obrigatório');
        if (!data.empresa.ramo_atividade.trim()) errors.push('Ramo de atividade é obrigatório');
        if (!data.empresa.telefone.trim()) errors.push('Telefone da empresa é obrigatório');
        if (!data.empresa.email.trim()) errors.push('E-mail da empresa é obrigatório');
        if (!data.empresa.faturamento_mensal.trim()) errors.push('Faturamento mensal é obrigatório');
        if (!data.empresa.regime_tributario) errors.push('Regime tributário é obrigatório');
        break;
      }
      if (!data.dados_pessoais.nome.trim()) errors.push('Nome completo é obrigatório');
      if (!data.dados_pessoais.cpf.trim()) errors.push('CPF/CNPJ é obrigatório');
      if (!data.perfil_financeiro.estado_civil) errors.push('Estado civil é obrigatório');
      if (isCasadoOuUniao(data) && !data.perfil_financeiro.regime_bens) errors.push('Regime de bens é obrigatório');
      if (isCasadoOuUniao(data) && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && !data.perfil_financeiro.conjuge_participa) errors.push('Informe se o cônjuge participará do contrato');
      if (!data.dados_pessoais.whatsapp.trim()) errors.push('WhatsApp é obrigatório');
      if (!data.dados_pessoais.email.trim()) errors.push('E-mail é obrigatório');
      if (!data.perfil_financeiro.fonte_renda) errors.push('Fonte de renda é obrigatória');
      if (!data.perfil_financeiro.renda_mensal.trim()) errors.push('Renda mensal é obrigatória');
      break;
    case 2:
      if (pj) {
        // PJ: representantes legais
        if (data.representantes.length === 0) errors.push('Adicione pelo menos um representante legal');
        data.representantes.forEach((r, i) => {
          const label = `Representante ${i + 1}`;
          if (!r.nome.trim()) errors.push(`${label}: nome é obrigatório`);
          if (!r.cpf.trim()) errors.push(`${label}: CPF é obrigatório`);
          if (!r.whatsapp.trim()) errors.push(`${label}: WhatsApp é obrigatório`);
          if (!r.email.trim()) errors.push(`${label}: e-mail é obrigatório`);
        });
        const hasSignatario = data.representantes.some(r => r.is_signatario);
        if (data.representantes.length > 0 && !hasSignatario) {
          errors.push('Indique pelo menos um representante como signatário do contrato');
        }
        break;
      }
      if (needsConjuge(data) && !data.conjuge.nome.trim()) errors.push('Nome do cônjuge é obrigatório');
      break;
    case 4:
      if (data.composicao.moradores.length === 0) errors.push('Informe pelo menos um morador');
      for (const m of data.composicao.moradores) {
        if (!m.tipo) errors.push('Tipo de morador é obrigatório');
      }
      {
        const t = data.composicao.moradores[0]?.tipo;
        if (t === 'filho' || t === 'terceiro') {
          for (const m of data.composicao.moradores) {
            if (!m.relacao?.trim()) errors.push('Informe a relação do morador');
            if (!m.nome?.trim()) errors.push('Informe o nome do morador');
            if (!m.whatsapp?.trim()) errors.push('Informe o WhatsApp do morador');
            if (!m.email?.trim()) errors.push('Informe o e-mail do morador');
          }
        }
        if (data.composicao.responsavel_retirada) {
          if (!data.composicao.retirada_nome?.trim()) errors.push('Informe o nome de quem vai retirar as chaves');
          if (!data.composicao.retirada_whatsapp?.trim()) errors.push('Informe o WhatsApp de quem vai retirar as chaves');
          if (!data.composicao.retirada_cpf?.trim()) errors.push('Informe o CPF de quem vai retirar as chaves');
        }
      }
      break;
    case 5:
      if (!data.garantia.tipo_garantia) errors.push('Garantia é obrigatória');
      if (!data.garantia.tipo_contrato_assinatura) {
        errors.push('Selecione como prefere assinar o contrato (Digital ou Físico)');
      }
      if (data.garantia.tipo_garantia === 'Fiador') {
        const fs = data.garantia.fiadores;
        const hasRenda = fs.some(f => f.tipo_fiador === 'renda');
        const hasImovel = fs.some(f => f.tipo_fiador === 'imovel');
        if (!hasRenda) errors.push('É necessário adicionar um fiador com renda');
        if (!hasImovel) errors.push('É necessário adicionar um fiador com imóvel quitado');
        fs.forEach((f, i) => {
          const label = `Fiador ${i + 1}`;
          if (!f.tipo_fiador) errors.push(`${label}: selecione o tipo (renda ou imóvel)`);
          if (!f.nome.trim() || !f.cpf.trim() || !f.whatsapp.trim() || !f.email.trim() || !f.profissao.trim() || !f.estado_civil) {
            errors.push(`${label}: dados pessoais incompletos`);
          }
          if (f.tipo_fiador === 'renda' && !f.renda_mensal.trim()) {
            errors.push(`${label}: informe a renda mensal`);
          }
          const isCasado = f.estado_civil === 'Casado(a)' || f.estado_civil === 'União Estável';
          if (isCasado && !f.regime_bens) errors.push(`${label}: informe o regime de bens`);
          const needsConj = isCasado && f.regime_bens && (
            f.regime_bens !== 'Separação total / absoluta de bens' || f.conjuge_participa === 'sim'
          );
          if (needsConj && (!f.conjuge.nome.trim() || !f.conjuge.cpf.trim())) {
            errors.push(`${label}: dados do cônjuge obrigatórios`);
          }
          for (const cat of f.documentos) {
            if (cat.key === 'renda_conjuge') continue; // opcional
            if (cat.files.length === 0) errors.push(`${label}: documento "${cat.label}" pendente`);
          }
        });
      }
      break;
  }
  return errors;
}

interface PropertyData {
  codigo_robust: number;
  titulo: string | null;
  tipo_imovel: string | null;
  finalidade: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  numero: string | null;
  complemento: string | null;
  valor_aluguel: number | null;
  condominio: number | null;
  iptu: number | null;
  seguro_incendio: number | null;
  foto_principal: string | null;
  status_imovel: number | null;
  raw_data?: any;
}

// ── Score ──
type ProposalScore = 'forte' | 'media' | 'risco';
function calcScore(data: ProposalFormData, percentual: number | null): { score: ProposalScore; points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];
  if (percentual !== null && percentual > 0) {
    if (percentual <= 25) points += 40;
    else if (percentual <= 30) { points += 30; reasons.push('Comprometimento 25-30%'); }
    else if (percentual <= 40) { points += 15; reasons.push('Comprometimento acima de 30%'); }
    else { reasons.push('Comprometimento acima de 40%'); }
  }
  const g = data.garantia.tipo_garantia;
  if (g === 'Seguro Fiança' || g === 'Caução') points += 30;
  else if (g === 'Fiador' || g === 'Título de Capitalização' || g === 'Carta Fiança') points += 20;
  else if (g === 'Sem Garantia') reasons.push('Sem garantia');
  const totalDocs = data.documentos.length;
  const completeDocs = data.documentos.filter(c => c.files.length > 0).length;
  if (totalDocs > 0) {
    points += Math.round((completeDocs / totalDocs) * 30);
    if (completeDocs < totalDocs) reasons.push(`${totalDocs - completeDocs} doc(s) pendente(s)`);
  }
  const score: ProposalScore = points >= 70 ? 'forte' : points >= 40 ? 'media' : 'risco';
  return { score, points, reasons };
}

function getPendingSteps(data: ProposalFormData): { step: number; label: string; errors: string[]; critical: boolean }[] {
  const pending: { step: number; label: string; errors: string[]; critical: boolean }[] = [];
  const sc = needsConjuge(data);
  const pj = isPJ(data);
  for (let i = 0; i < 7; i++) {
    // Step 2: cônjuge/sócios — só pula em PF sem cônjuge necessário
    if (i === 2 && !sc && !pj) continue;
    const errs = validateStep(i, data);
    if (errs.length > 0) {
      const critical = [1, 2, 5].includes(i) && (i !== 2 || pj || sc);
      pending.push({ step: i, label: STEP_CONFIG[i].label, errors: errs, critical });
    }
  }
  return pending;
}

function mapGarantia(label: string): string | null {
  const map: Record<string, string> = {
    'Fiador': 'fiador', 'Seguro Fiança': 'seguro_fianca', 'Caução': 'caucao',
    'Título de Capitalização': 'titulo_capitalizacao', 'Carta Fiança': 'carta_fianca', 'Sem Garantia': 'sem_garantia',
  };
  return map[label] || null;
}

// ── Stepper Component ──
function StepperHeader({ currentStep, totalSteps, onGoToStep, visited, data, progressPercent, isSaving, lastSavedAt, draftStatus }: {
  currentStep: number; totalSteps: number; onGoToStep: (s: number) => void;
  visited: Set<number>; data: ProposalFormData;
  progressPercent: number; isSaving: boolean; lastSavedAt: Date | null; draftStatus: string;
}) {
  const showConjuge = needsConjuge(data);
  const pj = isPJ(data);

  // Labels dinâmicos por tipo de pessoa
  const dynamicLabels = STEP_CONFIG.map((cfg, i) => {
    if (pj) {
      if (i === 1) return { ...cfg, shortLabel: 'Empresa', label: 'Empresa' };
      if (i === 2) return { ...cfg, shortLabel: 'Representantes', label: 'Representantes' };
    }
    return cfg;
  });

  const progressMessage = progressPercent >= 85
    ? 'Faltam poucos passos para finalizar! 🎉'
    : progressPercent >= 50
    ? `Você já preencheu ${progressPercent}% da sua proposta`
    : progressPercent > 0
    ? 'Continue preenchendo sua proposta'
    : 'Preencha os dados para iniciar';

  return (
    <div className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <img
            src="/logo-rizzo.png"
            alt="Rizzo Imobiliária"
            className="h-10 sm:h-12 w-auto object-contain"
          />
          <div className="w-px h-8 sm:h-10 bg-border" />
          <p className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
            Registro de Interesse na Locação
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">{progressMessage}</span>
            <span className="font-bold text-accent">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5 [&>div]:bg-accent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <Cloud className="h-3 w-3 text-accent" />
                  <span>Salvo automaticamente às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3" />
                  <span>Ainda não salvo</span>
                </>
              )}
            </div>
            {draftStatus === 'em_andamento' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Em andamento
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-0 overflow-x-auto pb-1">
          {dynamicLabels.map((cfg, i) => {
            // Step 2 só aparece se PF com cônjuge OU PJ (representantes sempre exigidos)
            if (i === 2 && !showConjuge && !pj) return null;
            const isActive = i === currentStep;
            const isDone = visited.has(i) && i !== currentStep && validateStep(i, data).length === 0;
            const displayNum = i + 1;

            return (
              <div key={i} className="flex items-start flex-1 min-w-[60px]">
                {i > 0 && !(i === 2 && !showConjuge) && (
                  <div className={cn(
                    'flex-1 h-px mt-4 sm:mt-5',
                    isDone || isActive ? 'bg-accent' : 'bg-border',
                  )} />
                )}
                <button
                  onClick={() => onGoToStep(i)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer px-1"
                >
                  <div className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold border transition-all',
                    isActive && 'border-accent bg-accent text-accent-foreground shadow-md',
                    isDone && !isActive && 'border-accent bg-accent text-accent-foreground',
                    !isActive && !isDone && 'border-accent/30 bg-accent/5 text-accent',
                  )}>
                    {isDone ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : isActive ? (
                      displayNum
                    ) : (
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-[70px] sm:max-w-[90px]',
                    isActive && 'text-foreground font-semibold',
                    isDone && !isActive && 'text-foreground',
                    !isActive && !isDone && 'text-accent',
                  )}>
                    {cfg.shortLabel}
                  </span>
                </button>
                {i < STEP_CONFIG.length - 1 && !(i === STEP_CONFIG.length - 2 && false) && (
                  <div className="flex-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── FAQ Accordion ──
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-2xl border p-5 sm:p-6 mt-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
          <HelpCircle className="h-5 w-5 text-accent" strokeWidth={2} />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-base">Dúvidas rápidas</h3>
          <p className="text-xs text-muted-foreground">{FAQ_ITEMS.length} perguntas mais comuns</p>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {FAQ_ITEMS.map((faq, i) => {
          const FaqIcon = faq.Icon;
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center gap-3 py-4 text-left hover:bg-muted/30 rounded-lg px-2 transition-colors"
              >
                <FaqIcon className="h-4 w-4 text-accent shrink-0" strokeWidth={2} />
                <span className="flex-1 text-sm font-medium text-foreground">{faq.q}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openIdx === i && 'rotate-180')} />
              </button>
              {openIdx === i && (
                <div className="pl-9 pr-4 pb-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section Wrapper ──
function FormSection({ icon: Icon, title, children, className }: {
  icon: typeof User; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border p-6 sm:p-8', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
          <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
        </div>
        <h3 className="font-bold text-foreground text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ──
export default function PropostaPublica() {
  // O parâmetro de rota pode ser:
  //  - um token público (UUID) da proposta — caminho oficial
  //  - um codigo_robust numérico — fallback temporário p/ links antigos
  const params = useParams<{ proposalToken?: string; codigoRobust?: string }>();
  const routeParam = params.proposalToken || params.codigoRobust || '';
  const isUuidToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeParam);

  // 1) Busca o proposal_link primeiro: por token público (caminho novo) ou por código (fallback legado)
  const { data: proposalLink, isLoading: linkLoading } = useQuery({
    queryKey: ['public-proposal-link', routeParam],
    queryFn: async () => {
      if (!routeParam) return null;
      if (isUuidToken) {
        const { data } = await supabase
          .from('proposal_links')
          .select('*')
          .eq('public_token', routeParam)
          .maybeSingle();
        return data;
      }
      // Fallback legado: link antigo via codigo_robust — pega o mais recente
      const codigoNum = parseInt(routeParam, 10);
      if (isNaN(codigoNum)) return null;
      const { data } = await supabase
        .from('proposal_links')
        .select('*')
        .eq('codigo_robust', codigoNum)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!routeParam,
  });

  // codigo_robust do imóvel — vem do proposal_link (token novo) ou direto da URL (fallback)
  const codigoImovel = proposalLink?.codigo_robust ?? (isUuidToken ? null : parseInt(routeParam, 10));

  // 2) Carrega o imóvel a partir do codigo_robust salvo no proposal_link
  const { data: property, isLoading: propertyLoading, error: propertyError } = useQuery({
    queryKey: ['public-property', codigoImovel],
    queryFn: async () => {
      if (!codigoImovel || isNaN(codigoImovel)) throw new Error('Código inválido');
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('codigo_robust', codigoImovel)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('not_found');
      return data as PropertyData;
    },
    enabled: !!codigoImovel && !linkLoading,
    retry: false,
  });

  // String do código do imóvel — usada por hooks que ainda esperam string
  const codigo = codigoImovel ? String(codigoImovel) : '';

  useEffect(() => {
    if (proposalLink && proposalLink.status === 'nao_acessado') {
      supabase
        .from('proposal_links')
        .update({ status: 'em_preenchimento', accessed_at: new Date().toISOString() })
        .eq('id', proposalLink.id)
        .then();
    }
  }, [proposalLink]);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProposalFormData>({
    imovel: { codigo: '', endereco: '', valor_aluguel: '', tipo_pessoa: 'fisica' },
    dados_pessoais: { ...emptyPerson },
    perfil_financeiro: { estado_civil: '', fonte_renda: '', renda_mensal: '', regime_bens: '', conjuge_participa: '' },
    conjuge: { ...emptyPerson, documentos: buildConjugeDocs() },
    socios: [],
    documentos: INITIAL_DOC_CATEGORIES.map(c => ({ ...c, files: [] })),
    documentos_observacao: '',
    composicao: { moradores: [{ ...emptyMorador }], responsavel_retirada: '' },
    garantia: { tipo_garantia: '', observacao: '', fiadores: [] },
    negociacao: { valor_proposto: '', aceitou_valor: '', observacao: '' },
    empresa: { ...emptyEmpresa },
    representantes: [],
  });
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Auto-save draft hook ──
  const {
    draftStatus,
    lastSavedAt,
    isSaving,
    isRestoring,
    restoredData,
    restoredStep,
    scheduleSave,
    markAsSubmitted,
  } = useProposalDraft({
    codigoRobust: codigo,
    proposalLinkId: proposalLink?.id,
    enabled: !!codigo && !submitted,
  });

  // ── Restore draft data ──
  useEffect(() => {
    if (restoredData) {
      // Sanitize fiadores from older drafts that may be missing newer fields
      const sanitizedGarantia = restoredData.garantia
        ? {
            ...restoredData.garantia,
            fiadores: (restoredData.garantia.fiadores || []).map((f: any) => {
              const base = makeEmptyFiador(f?.tipo_fiador || '');
              return {
                ...base,
                ...f,
                conjuge: { ...base.conjuge, ...(f?.conjuge || {}) },
                documentos: Array.isArray(f?.documentos) && f.documentos.length > 0
                  ? f.documentos
                  : base.documentos,
              };
            }),
          }
        : undefined;
      // Sanitize empresa/representantes for PJ drafts that may be missing fields
      const sanitizedEmpresa = restoredData.empresa
        ? { ...emptyEmpresa, ...restoredData.empresa }
        : undefined;
      const sanitizedConjuge = restoredData.conjuge
        ? { ...emptyPerson, ...restoredData.conjuge, documentos: ensureConjugeDocs((restoredData.conjuge as any)?.documentos) }
        : undefined;
      const sanitizedRepresentantes = Array.isArray(restoredData.representantes)
        ? restoredData.representantes
        : undefined;
      // Sanitiza locatarios_adicionais para garantir slot de documentos
      const sanitizedLocAdicionais = Array.isArray(restoredData.locatarios_adicionais)
        ? restoredData.locatarios_adicionais.map((loc: any) => ({
            ...emptyLocatarioAdicional,
            ...loc,
            conjuge: {
              ...emptyLocatarioAdicional.conjuge,
              ...(loc?.conjuge || {}),
              documentos: ensureConjugeDocs(loc?.conjuge?.documentos),
            },
            documentos: Array.isArray(loc?.documentos) && loc.documentos.length > 0
              ? loc.documentos
              : buildLocatarioAdicionalDocs(),
          }))
        : undefined;
      setData(prev => ({
        ...prev,
        ...restoredData,
        // Keep imovel from property data (auto-filled)
        imovel: prev.imovel,
        // Keep original doc structure but restore non-file data
        documentos: prev.documentos,
        ...(sanitizedConjuge ? { conjuge: sanitizedConjuge } : {}),
        ...(sanitizedGarantia ? { garantia: sanitizedGarantia } : {}),
        ...(sanitizedEmpresa ? { empresa: sanitizedEmpresa } : {}),
        ...(sanitizedRepresentantes ? { representantes: sanitizedRepresentantes } : {}),
        ...(sanitizedLocAdicionais ? { locatarios_adicionais: sanitizedLocAdicionais } : {}),
      }));
      if (restoredStep !== null && restoredStep > 0) {
        setStep(restoredStep);
        const newVisited = new Set<number>();
        for (let i = 0; i <= restoredStep; i++) newVisited.add(i);
        setVisited(newVisited);
        toast.info('Rascunho restaurado!', { description: 'Retomando de onde você parou.' });
      }
    }
  }, [restoredData, restoredStep]);

  // ── Progress calculation ──
  const skipConjuge = !needsConjuge(data);
  const { totalPercent: progressPercent, stepStatuses } = calcFormProgress(data, PUBLIC_STEP_WEIGHTS, skipConjuge);

  // ── Auto-save on data or step change ──
  useEffect(() => {
    if (!submitted && !isRestoring && codigo) {
      scheduleSave(data, step, progressPercent);
    }
  }, [data, step, submitted, isRestoring, codigo, scheduleSave, progressPercent]);

  useEffect(() => {
    if (property) {
      const endereco = [property.logradouro, property.numero, property.bairro, property.cidade, property.estado].filter(Boolean).join(', ');
      setData(prev => ({
        ...prev,
        imovel: {
          ...prev.imovel,
          codigo: String(property.codigo_robust),
          endereco,
          valor_aluguel: property.valor_aluguel ? String(property.valor_aluguel) : '',
        }
      }));
    }
  }, [property]);

  const showConjuge = needsConjuge(data);
  const totalSteps = 8;

  const update = useCallback((updater: (prev: ProposalFormData) => ProposalFormData) => {
    setData(updater);
  }, []);

  const percentualComprometimento = calcPercentualComprometimento(
    data.imovel.valor_aluguel,
    data.perfil_financeiro.renda_mensal
  );

  const stepErrors = validateStep(step, data);
  const isStepValid = stepErrors.length === 0;

  function goNext() {
    if (!isStepValid) {
      toast.error('Preencha os campos obrigatórios', { description: stepErrors[0] });
      return;
    }
    if (step < totalSteps - 1) {
      // PJ: representantes (step 2) sempre exigido; PF: pula step 2 se sem cônjuge
      const next = step === 1 && !showConjuge && !isPJ(data) ? 3 : step + 1;
      setStep(next);
      setVisited(prev => new Set(prev).add(next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goPrev() {
    if (step > 0) {
      const prev = step === 3 && !showConjuge && !isPJ(data) ? 1 : step - 1;
      setStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goToStep(s: number) {
    if (s === 2 && !showConjuge && !isPJ(data)) return;
    setStep(s);
    setVisited(prev => new Set(prev).add(s));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalMensal = useMemo(() => {
    if (!property) return null;
    const aluguel = property.valor_aluguel || 0;
    const cond = property.condominio || 0;
    const iptu = property.iptu || 0;
    const seguro = property.seguro_incendio || 0;
    return { aluguel, cond, iptu, seguro, total: aluguel + cond + iptu + seguro };
  }, [property]);

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const pending = getPendingSteps(data);
    const critical = pending.filter(p => p.critical);
    if (critical.length > 0) {
      toast.error('Pendências críticas', { description: critical[0].errors[0] });
      setStep(critical[0].step);
      setIsSubmitting(false);
      return;
    }

    const renda = parseCurrency(data.perfil_financeiro.renda_mensal);
    const aluguel = parseCurrency(data.imovel.valor_aluguel);
    const percentualCalc = renda > 0 ? (aluguel / renda) * 100 : null;
    const { score, points } = calcScore(data, percentualCalc);
    const scoreLabel = score === 'forte' ? 'Forte' : score === 'media' ? 'Média' : 'Risco';
    const garantiaLabel = data.garantia.tipo_garantia || 'Não informado';
    const pj = isPJ(data);
    const signatario = pj ? data.representantes.find(r => r.is_signatario) : null;
    const clientName = pj
      ? (data.empresa.razao_social || data.empresa.nome_fantasia || 'Empresa não informada')
      : (data.dados_pessoais.nome || 'Não informado');
    const imovelCodigo = data.imovel.codigo;
    const brokerName = proposalLink?.broker_name || 'Não identificado';

    // Identificação do imóvel: condomínio → complemento → bairro+tipo
    const propertyIdentification = property ? getPropertyIdentification(property) : `Imóvel ${imovelCodigo}`;
    const cardTitle = `${clientName} — ${propertyIdentification}`;
    const buildingName = propertyIdentification;

    // Tipo de contrato (Digital / Físico) — mapeia para enum do banco
    const contractTypeRaw = data.garantia.tipo_contrato_assinatura;
    const contractType: 'digital' | 'fisico' | null =
      contractTypeRaw === 'digital' || contractTypeRaw === 'fisico' ? contractTypeRaw : null;

    // Detalhes da negociação preenchidos com valores do imóvel
    const aluguelTotal =
      (property?.valor_aluguel || 0) +
      (property?.condominio || 0) +
      (property?.iptu || 0) +
      (property?.seguro_incendio || 0);
    const negotiationDetailsLines = [
      `**Aluguel:** ${formatCurrency(property?.valor_aluguel)}`,
      property?.condominio ? `**Condomínio:** ${formatCurrency(property.condominio)}` : '',
      property?.iptu ? `**IPTU:** ${formatCurrency(property.iptu)}` : '',
      property?.seguro_incendio ? `**Seguro Incêndio:** ${formatCurrency(property.seguro_incendio)}` : '',
      `**Total mensal aproximado:** ${formatCurrency(aluguelTotal || null)}`,
      data.negociacao.valor_proposto ? `**Valor proposto pelo cliente:** ${data.negociacao.valor_proposto}` : '',
      data.negociacao.aceitou_valor ? `**Aceitou o valor anunciado:** ${data.negociacao.aceitou_valor}` : '',
      data.negociacao.observacao ? `**Observações:** ${data.negociacao.observacao}` : '',
    ].filter(Boolean).join('\n');

    const descriptionLines = pj ? [
      `**Tipo:** Pessoa Jurídica`,
      `**Razão Social:** ${data.empresa.razao_social || 'N/A'}`,
      data.empresa.nome_fantasia ? `**Nome Fantasia:** ${data.empresa.nome_fantasia}` : '',
      `**CNPJ:** ${data.empresa.cnpj || 'N/A'}`,
      `**Ramo:** ${data.empresa.ramo_atividade || 'N/A'}`,
      `**Telefone:** ${data.empresa.telefone || 'N/A'}`,
      `**E-mail:** ${data.empresa.email || 'N/A'}`,
      `**Faturamento mensal:** ${data.empresa.faturamento_mensal || 'N/A'}`,
      `**Regime tributário:** ${data.empresa.regime_tributario || 'N/A'}`,
      '',
      `**Representantes:** ${data.representantes.length}`,
      signatario
        ? `**Signatário:** ${signatario.nome} — CPF ${signatario.cpf || 'N/A'} — ${signatario.whatsapp || 'sem WhatsApp'}`
        : `**Signatário:** ⚠️ não indicado`,
      '',
      `**Imóvel:** ${imovelCodigo}`,
      `**Endereço:** ${data.imovel.endereco || 'N/A'}`,
      `**Valor Aluguel:** ${formatCurrency(property?.valor_aluguel)}`,
      property?.condominio ? `**Condomínio:** ${formatCurrency(property.condominio)}` : '',
      property?.iptu ? `**IPTU:** ${formatCurrency(property.iptu)}` : '',
      property?.seguro_incendio ? `**Seguro Incêndio:** ${formatCurrency(property.seguro_incendio)}` : '',
      `**Valor Proposto:** ${data.negociacao.valor_proposto || 'N/A'}`,
      '',
      `**Garantia:** ${garantiaLabel}`,
      `**Corretor:** ${brokerName}`,
    ] : [
      `**Tipo:** Pessoa Física`,
      `**Cliente:** ${clientName}`,
      `**CPF:** ${data.dados_pessoais.cpf || 'N/A'}`,
      `**WhatsApp:** ${data.dados_pessoais.whatsapp || 'N/A'}`,
      `**E-mail:** ${data.dados_pessoais.email || 'N/A'}`,
      '',
      `**Imóvel:** ${imovelCodigo}`,
      `**Endereço:** ${data.imovel.endereco || 'N/A'}`,
      `**Valor Aluguel:** ${formatCurrency(property?.valor_aluguel)}`,
      property?.condominio ? `**Condomínio:** ${formatCurrency(property.condominio)}` : '',
      property?.iptu ? `**IPTU:** ${formatCurrency(property.iptu)}` : '',
      property?.seguro_incendio ? `**Seguro Incêndio:** ${formatCurrency(property.seguro_incendio)}` : '',
      `**Valor Proposto:** ${data.negociacao.valor_proposto || 'N/A'}`,
      '',
      `**Renda Mensal:** R$ ${renda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `**Comprometimento:** ${percentualCalc ? percentualCalc.toFixed(1) + '%' : 'N/A'}`,
      `**Garantia:** ${garantiaLabel}`,
      `**Score:** ${scoreLabel} (${points}/100)`,
      `**Corretor:** ${brokerName}`,
    ];

    try {
      // 0a) Persistir partes estruturadas ANTES do upload, para que cada documento
      //     já nasça vinculado ao party_id correto (locatário, cônjuge, fiador, etc).
      //     Se falhar, a proposta não pode ser finalizada: documentos de cônjuge
      //     dependem do party_id do próprio cônjuge para aparecer no card correto.
      let partyMap = new Map<string, string>();
      if (proposalLink?.id) {
        try {
          partyMap = await persistProposalParties(proposalLink.id, null, data);
        } catch (partiesErr) {
          console.error('Erro ao salvar partes da proposta (pré-upload):', partiesErr);
          toast.error('Não foi possível preparar os envolvidos da proposta', {
            description: 'Revise os dados preenchidos e tente novamente.',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // 0b) Upload de documentos vinculando-os ao proposal_link_id e party_id.
      //     Isso garante que os arquivos não se percam mesmo que o RPC falhe,
      //     e permite que a query do card os recupere via proposal_link_id.
      let uploadStats = { attempted: 0, succeeded: 0 };
      if (proposalLink?.id) {
        try {
          uploadStats = await uploadProposalDocuments(null, proposalLink.id, data, partyMap);
        } catch (uploadErr: any) {
          console.error('Erro ao enviar documentos (pré-RPC):', uploadErr);
          toast.error('Não foi possível enviar todos os documentos. Revise os anexos e tente novamente.', {
            description: uploadErr?.message || 'Nenhum dado da proposta foi finalizado.',
          });
          setIsSubmitting(false);
          return;
        }
        if (uploadStats.attempted !== uploadStats.succeeded) {
          console.error('Contagem inconsistente no envio de documentos:', uploadStats);
          toast.error('Não foi possível enviar todos os documentos. Revise os anexos e tente novamente.');
          setIsSubmitting(false);
          return;
        }
      }

      // 1) Finaliza a proposta via RPC SECURITY DEFINER.
      //    O frontend público NÃO faz mais INSERT/UPDATE direto em `cards`.
      //    A função garante anti-duplicidade (1 card por proposal_link_id),
      //    move para "Aguardando documentação" e registra atividade.
      if (!proposalLink?.public_token) {
        throw new Error('Token público da proposta não encontrado.');
      }

      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        'finalize_public_proposal' as any,
        {
          _public_token: proposalLink.public_token,
          _payload: {
            title: cardTitle,
            description: descriptionLines.filter(Boolean).join('\n'),
            address: data.imovel.endereco || null,
            robust_code: imovelCodigo || null,
            building_name: buildingName,
            guarantee_type: mapGarantia(garantiaLabel),
            contract_type: contractType,
            proposal_responsible: brokerName,
            negotiation_details: negotiationDetailsLines || null,
            client_name: clientName,
            imovel_codigo: imovelCodigo,
          },
        } as any,
      );
      if (rpcErr) throw rpcErr;
      const targetCardId: string | null = (rpcRes as any)?.card_id || null;

      // 2.5) Backfill: vincular card_id às partes recém-criadas
      if (targetCardId && proposalLink?.id) {
        try {
          await supabase
            .from('proposal_parties' as any)
            .update({ card_id: targetCardId })
            .eq('proposal_link_id', proposalLink.id)
            .is('card_id', null);
        } catch (linkErr) {
          console.error('Erro ao vincular partes ao card:', linkErr);
        }
      }

      // 3) Backfill: vincular ao card recém-criado todos os documentos
      //    que foram enviados via proposal_link_id e ainda estão sem card_id.
      if (targetCardId && proposalLink?.id) {
        try {
          await supabase
            .from('proposal_documents')
            .update({ card_id: targetCardId })
            .eq('proposal_link_id', proposalLink.id)
            .is('card_id', null);
        } catch (linkErr) {
          console.error('Erro ao vincular documentos ao card:', linkErr);
        }
      }

      // 4) Status do link e atividades já são tratados pela RPC finalize_public_proposal.

      // 5) Notifica o time administrativo (admins) que a proposta foi enviada
      if (targetCardId) {
        try {
          const { data: admins } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');
          const userIds = new Set<string>((admins || []).map((r: any) => r.user_id));
          if (proposalLink?.broker_user_id) userIds.add(proposalLink.broker_user_id);
          const notifications = Array.from(userIds).map(uid => ({
            user_id: uid,
            card_id: targetCardId!,
            title: '📬 Nova proposta recebida',
            message: `${clientName} enviou a proposta para o imóvel ${imovelCodigo}. Pronta para análise.`,
          }));
          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        } catch (notifyErr) {
          console.error('Erro ao notificar admins:', notifyErr);
        }
      }

      setSubmitted(true);
      toast.success('Proposta enviada com sucesso!');
      await markAsSubmitted();
    } catch (err: any) {
      console.error('Erro ao enviar proposta:', err);
      toast.error('Erro ao enviar proposta', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading / Error / Submitted states ──
  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-accent" />
          <p className="text-muted-foreground text-sm">Carregando dados do imóvel...</p>
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    const msg = (propertyError as any)?.message === 'not_found'
      ? 'Imóvel não encontrado ou indisponível.'
      : 'Não foi possível carregar os dados do imóvel. Tente novamente mais tarde.';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border max-w-md w-full p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Proposta inválida ou expirada</h2>
          <p className="text-muted-foreground text-sm">{msg}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border max-w-md w-full p-10 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Proposta enviada! 🎉</h2>
          <p className="text-muted-foreground">
            Sua proposta para o imóvel Cód. {property.codigo_robust} foi enviada com sucesso.
            Entraremos em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  // ── Step Renderers ──
  function renderStep0() {
    const addressParts = [property.logradouro, property.numero, property.bairro, property.cidade].filter(Boolean);
    return (
      <div className="space-y-6">
        {/* Welcome */}
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
            <Home className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Bem-vindo à sua proposta! 🏠</h2>
          <p className="text-muted-foreground mt-1 text-sm">Confira os dados do imóvel abaixo e prossiga com sua proposta.</p>
        </div>

        {/* Property Card */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {property.foto_principal && (
              <div className="sm:w-52 h-48 sm:h-auto relative overflow-hidden">
                <img src={property.foto_principal} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full">
                    Cód. {property.codigo_robust}
                  </span>
                  {property.tipo_imovel && (
                    <span className="text-xs text-muted-foreground">{property.tipo_imovel}</span>
                  )}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado!'); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
              </div>

              <h3 className="font-bold text-foreground leading-tight">
                {property.titulo || `Imóvel ${property.codigo_robust}`}
              </h3>

              {addressParts.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {addressParts.join(', ')}
                  {property.estado && `/${property.estado}`}
                </p>
              )}

              {/* Financial breakdown */}
              {totalMensal && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Aluguel</p>
                    <p className="text-sm font-bold text-accent">{formatCurrency(totalMensal.aluguel)}</p>
                  </div>
                  {totalMensal.cond > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Condomínio</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(totalMensal.cond)}</p>
                    </div>
                  )}
                  {totalMensal.iptu > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">IPTU/mês</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(totalMensal.iptu)}</p>
                    </div>
                  )}
                  {totalMensal.seguro > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Seguro incêndio</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(totalMensal.seguro)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fluxo */}
        <div className="bg-white rounded-xl border px-4 py-3 flex items-center gap-2 text-sm">
          <Home className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Fluxo selecionado automaticamente:</span>
          <span className="font-bold text-foreground">Locação</span>
        </div>

        {/* Tipo de proponente */}
        <div>
          <h3 className="font-bold text-foreground mb-3">Tipo de proponente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: 'fisica' as const,
                label: 'Pessoa Física',
                desc: 'Documentos pessoais e comprovação de renda',
                icon: User,
                docs: [
                  'CNH ou RG e CPF',
                  'Comprovante de endereço atualizado',
                  'Comprovante de renda (3 últimos contracheques, extratos bancários ou Imposto de Renda)',
                  'Se casado(a): certidão de casamento + documento do cônjuge',
                  'Se solteiro(a): certidão de nascimento',
                ],
              },
              {
                value: 'juridica' as const,
                label: 'Pessoa Jurídica',
                desc: 'Documentação da empresa e dos sócios',
                icon: Building,
                docs: [
                  'Documentos pessoais dos representantes legais',
                  'Contrato Social',
                  'Cartão CNPJ',
                  'Balanço patrimonial e último balancete',
                  'DRE (Demonstração do Resultado do Exercício) do último ano calendário',
                  'DEFIS (para empresas do Simples Nacional) + recibo de entrega',
                  'Extrato do Simples Nacional do último mês (quando aplicável)',
                ],
              },
            ].map(opt => {
              const selected = data.imovel.tipo_pessoa === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => update(p => {
                    if (p.imovel.tipo_pessoa === opt.value) return p;
                    // Ao trocar tipo de pessoa, limpa os dados específicos do tipo anterior
                    const isNowPJ = opt.value === 'juridica';
                    return {
                      ...p,
                      imovel: { ...p.imovel, tipo_pessoa: opt.value },
                      // Limpa dados PF se virou PJ
                      dados_pessoais: isNowPJ ? { ...emptyPerson } : p.dados_pessoais,
                      perfil_financeiro: isNowPJ
                        ? { estado_civil: '', fonte_renda: '', renda_mensal: '', regime_bens: '', conjuge_participa: '' }
                        : p.perfil_financeiro,
                      conjuge: isNowPJ ? { ...emptyPerson } : p.conjuge,
                      socios: isNowPJ ? [] : p.socios,
                      // Limpa dados PJ se virou PF
                      empresa: !isNowPJ ? { ...emptyEmpresa } : p.empresa,
                      representantes: !isNowPJ ? [] : p.representantes,
                      // Reinicia documentos com o template correto
                      documentos: isNowPJ
                        ? PJ_DOC_CATEGORIES.map(c => ({ ...c, files: [] }))
                        : INITIAL_DOC_CATEGORIES.map(c => ({ ...c, files: [] })),
                    };
                  })}
                  className={cn(
                    'relative rounded-xl border text-left transition-all cursor-pointer px-3.5 py-3',
                    selected
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border bg-white hover:border-accent/40 hover:bg-accent/[0.02]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      selected ? 'bg-accent/10 ring-1 ring-accent/20' : 'bg-muted'
                    )}>
                      <opt.icon className={cn('h-4 w-4', selected ? 'text-accent' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm leading-tight">{opt.label}</p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                            'text-muted-foreground hover:text-accent hover:bg-accent/10'
                          )}
                          aria-label={`Ver documentos exigidos — ${opt.label}`}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="end"
                        className="w-72 p-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">
                          Documentação exigida
                        </p>
                        <ul className="space-y-1.5">
                          {opt.docs.map((d, i) => (
                            <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-snug">
                              <span className="text-accent mt-0.5">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {selected && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-white" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <FAQSection />
      </div>
    );
  }

  function renderStep1() {
    // PJ: renderiza formulário da empresa
    if (isPJ(data)) {
      return (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Building className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Dados da Empresa 🏢</h2>
            <p className="text-muted-foreground mt-1 text-sm">Informe os dados cadastrais e financeiros da empresa.</p>
          </div>
          <EmpresaForm data={data.empresa} onChange={d => update(p => ({ ...p, empresa: d }))} />
        </div>
      );
    }
    const isCnpj = data.imovel.tipo_pessoa === 'juridica';
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <User className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Vamos nos conhecer! 👋</h2>
          <p className="text-muted-foreground mt-1 text-sm">Preencha seus dados pessoais. Campos com <span className="text-red-500">*</span> são obrigatórios.</p>
        </div>

        {/* Informações Pessoais */}
        <FormSection icon={User} title="Informações Pessoais">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome completo <span className="text-red-500">*</span></Label>
              <Input value={data.dados_pessoais.nome} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, nome: e.target.value } }))} placeholder="Nome completo" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{isCnpj ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span></Label>
                <Input value={data.dados_pessoais.cpf} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, cpf: e.target.value } }))} placeholder={isCnpj ? '00.000.000/0000-00' : '000.000.000-00'} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">Profissão <span className="text-red-500">*</span></Label>
                <Input value={data.dados_pessoais.profissao} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, profissao: e.target.value } }))} placeholder="Sua profissão" className="mt-1.5" />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Contato */}
        <FormSection icon={Phone} title="Contato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">WhatsApp <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 mt-1.5">
                <div className="flex items-center gap-1 px-3 bg-muted rounded-md border text-sm text-muted-foreground shrink-0">
                  🇧🇷 +55
                </div>
                <Input value={data.dados_pessoais.whatsapp} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, whatsapp: e.target.value } }))} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">E-mail <span className="text-red-500">*</span></Label>
              <Input type="email" value={data.dados_pessoais.email} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, email: e.target.value } }))} placeholder="seu@email.com" className="mt-1.5" />
            </div>
          </div>
        </FormSection>

        {/* Estado Civil e Renda */}
        <FormSection icon={DollarSign} title="Estado Civil e Renda">
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-3 block">Estado Civil <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {CIVIL_STATUS.map(s => (
                  <button key={s.label} type="button"
                    onClick={() => update(p => ({
                      ...p,
                      perfil_financeiro: {
                        ...p.perfil_financeiro,
                        estado_civil: s.label,
                        regime_bens: (s.label === 'Casado(a)' || s.label === 'União Estável') ? p.perfil_financeiro.regime_bens : '',
                        conjuge_participa: (s.label === 'Casado(a)' || s.label === 'União Estável') ? p.perfil_financeiro.conjuge_participa : '',
                      }
                    }))}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all',
                      data.perfil_financeiro.estado_civil === s.label
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    {data.perfil_financeiro.estado_civil === s.label && <span className="text-xs">●</span>}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {(data.perfil_financeiro.estado_civil === 'Casado(a)' || data.perfil_financeiro.estado_civil === 'União Estável') && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <Label className="text-sm font-medium mb-3 block">Regime de Bens <span className="text-red-500">*</span></Label>
                <div className="space-y-2">
                  {REGIME_BENS_OPTIONS.map(r => (
                    <button key={r} type="button"
                      onClick={() => update(p => ({
                        ...p,
                        perfil_financeiro: {
                          ...p.perfil_financeiro,
                          regime_bens: r,
                          conjuge_participa: r !== 'Separação total / absoluta de bens' ? '' : p.perfil_financeiro.conjuge_participa,
                        }
                      }))}
                      className={cn(
                        'w-full flex items-center gap-2 p-3 rounded-xl border text-sm font-medium text-left transition-all',
                        data.perfil_financeiro.regime_bens === r
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-muted-foreground/40'
                      )}
                    >
                      {data.perfil_financeiro.regime_bens === r && <span className="text-xs">●</span>}
                      {r}
                    </button>
                  ))}
                </div>

                {/* Separação total: perguntar se cônjuge participa */}
                {data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && (
                  <div className="mt-4 p-3 bg-background rounded-lg border space-y-2">
                    <p className="text-sm font-medium">O(a) cônjuge/companheiro(a) também participará do contrato? <span className="text-red-500">*</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={data.perfil_financeiro.conjuge_participa === 'sim' ? 'default' : 'outline'}
                        className="h-10"
                        onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, conjuge_participa: 'sim' } }))}
                      >
                        Sim, vai participar
                      </Button>
                      <Button
                        type="button"
                        variant={data.perfil_financeiro.conjuge_participa === 'nao' ? 'default' : 'outline'}
                        className="h-10"
                        onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, conjuge_participa: 'nao' } }))}
                      >
                        Não, apenas eu
                      </Button>
                    </div>
                  </div>
                )}

                {/* Info: regime obriga cônjuge */}
                {data.perfil_financeiro.regime_bens && data.perfil_financeiro.regime_bens !== 'Separação total / absoluta de bens' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ℹ️ Com o regime selecionado, a etapa de cônjuge/companheiro é obrigatória.
                  </p>
                )}

                {/* Info: cônjuge participará */}
                {needsConjuge(data) && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ Você precisará preencher os dados do cônjuge na próxima etapa.
                  </p>
                )}
                </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-3 block">Fonte de Renda <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {RENDA_SOURCES.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, fonte_renda: r.value } }))}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium text-left transition-all',
                      data.perfil_financeiro.fonte_renda === r.value
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <span className="text-lg">{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Renda Mensal <span className="text-red-500">*</span></Label>
              <CurrencyInput
                value={data.perfil_financeiro.renda_mensal}
                onValueChange={v => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, renda_mensal: v } }))}
                placeholder="0,00"
                className="mt-1.5"
              />
              {percentualComprometimento !== null && parseCurrency(data.imovel.valor_aluguel) > 0 && (
                <div className={cn(
                  'mt-2 p-3 rounded-lg text-sm font-medium flex items-center gap-2',
                  percentualComprometimento > 30 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                )}>
                  {percentualComprometimento > 30 ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  Comprometimento de renda: {percentualComprometimento.toFixed(1)}%
                  {percentualComprometimento > 30 && ' — acima de 30%'}
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {/* Multi-locatários: pergunta + lista de locatários adicionais */}
        <FormSection icon={Users} title="Mais de um locatário?">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Haverá mais de um locatário no contrato?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={data.tem_mais_locatarios === 'sim' ? 'default' : 'outline'}
                  className="h-10"
                  onClick={() =>
                    update(p => ({
                      ...p,
                      tem_mais_locatarios: 'sim',
                      locatarios_adicionais:
                        (p.locatarios_adicionais && p.locatarios_adicionais.length > 0)
                          ? p.locatarios_adicionais
                          : [{ ...emptyLocatarioAdicional }],
                    }))
                  }
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant={data.tem_mais_locatarios === 'nao' ? 'default' : 'outline'}
                  className="h-10"
                  onClick={() =>
                    update(p => ({
                      ...p,
                      tem_mais_locatarios: 'nao',
                      locatarios_adicionais: [],
                    }))
                  }
                >
                  Não, somente eu
                </Button>
              </div>
            </div>

            {data.tem_mais_locatarios === 'sim' && (
              <div className="space-y-4">
                {(data.locatarios_adicionais || []).map((loc, idx) => (
                  <div key={idx} className="p-4 border rounded-xl relative space-y-3 bg-muted/30">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 h-8 w-8"
                      onClick={() =>
                        update(p => ({
                          ...p,
                          locatarios_adicionais: (p.locatarios_adicionais || []).filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label="Remover locatário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Locatário adicional {idx + 1}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nome completo</Label>
                        <Input value={loc.nome} className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], nome: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">CPF</Label>
                        <Input value={loc.cpf} placeholder="000.000.000-00" className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], cpf: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">RG / CNH</Label>
                        <Input value={loc.rg} className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], rg: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">Profissão</Label>
                        <Input value={loc.profissao} className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], profissao: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">E-mail</Label>
                        <Input type="email" value={loc.email} className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], email: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">WhatsApp</Label>
                        <Input value={loc.whatsapp} placeholder="(00) 00000-0000" className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], whatsapp: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">Renda mensal</Label>
                        <CurrencyInput value={loc.renda_mensal} placeholder="0,00" className="mt-1"
                          onValueChange={v => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], renda_mensal: v };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                      <div>
                        <Label className="text-xs">Estado civil</Label>
                        <Select
                          value={loc.estado_civil || undefined}
                          onValueChange={(val) => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            const isCasado = val === 'Casado(a)' || val === 'União Estável';
                            arr[idx] = {
                              ...arr[idx],
                              estado_civil: val,
                              regime_bens: isCasado ? arr[idx].regime_bens : '',
                              conjuge_participa: isCasado ? arr[idx].conjuge_participa : '',
                              conjuge: isCasado ? arr[idx].conjuge : { nome: '', cpf: '', rg: '', whatsapp: '', email: '' },
                            };
                            return { ...p, locatarios_adicionais: arr };
                          })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Separado(a)'].map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Endereço (opcional)</Label>
                        <Input value={loc.endereco} className="mt-1"
                          onChange={e => update(p => {
                            const arr = [...(p.locatarios_adicionais || [])];
                            arr[idx] = { ...arr[idx], endereco: e.target.value };
                            return { ...p, locatarios_adicionais: arr };
                          })} />
                      </div>
                    </div>

                    {/* Cônjuge do locatário adicional */}
                    {(loc.estado_civil === 'Casado(a)' || loc.estado_civil === 'União Estável') && (
                      <div className="mt-3 p-3 rounded-lg border bg-background space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground">Cônjuge / companheiro(a)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={loc.conjuge.nome} className="mt-1"
                              onChange={e => update(p => {
                                const arr = [...(p.locatarios_adicionais || [])];
                                arr[idx] = { ...arr[idx], conjuge: { ...arr[idx].conjuge, nome: e.target.value } };
                                return { ...p, locatarios_adicionais: arr };
                              })} />
                          </div>
                          <div>
                            <Label className="text-xs">CPF</Label>
                            <Input value={loc.conjuge.cpf} className="mt-1"
                              onChange={e => update(p => {
                                const arr = [...(p.locatarios_adicionais || [])];
                                arr[idx] = { ...arr[idx], conjuge: { ...arr[idx].conjuge, cpf: e.target.value } };
                                return { ...p, locatarios_adicionais: arr };
                              })} />
                          </div>
                          <div>
                            <Label className="text-xs">RG / CNH</Label>
                            <Input value={loc.conjuge.rg} className="mt-1"
                              onChange={e => update(p => {
                                const arr = [...(p.locatarios_adicionais || [])];
                                arr[idx] = { ...arr[idx], conjuge: { ...arr[idx].conjuge, rg: e.target.value } };
                                return { ...p, locatarios_adicionais: arr };
                              })} />
                          </div>
                          <div>
                            <Label className="text-xs">WhatsApp</Label>
                            <Input value={loc.conjuge.whatsapp} className="mt-1"
                              onChange={e => update(p => {
                                const arr = [...(p.locatarios_adicionais || [])];
                                arr[idx] = { ...arr[idx], conjuge: { ...arr[idx].conjuge, whatsapp: e.target.value } };
                                return { ...p, locatarios_adicionais: arr };
                              })} />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-xs">E-mail</Label>
                            <Input type="email" value={loc.conjuge.email} className="mt-1"
                              onChange={e => update(p => {
                                const arr = [...(p.locatarios_adicionais || [])];
                                arr[idx] = { ...arr[idx], conjuge: { ...arr[idx].conjuge, email: e.target.value } };
                                return { ...p, locatarios_adicionais: arr };
                              })} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => update(p => ({
                    ...p,
                    locatarios_adicionais: [
                      ...(p.locatarios_adicionais || []),
                      { ...emptyLocatarioAdicional, documentos: buildLocatarioAdicionalDocs() },
                    ],
                  }))}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar outro locatário
                </Button>
              </div>
            )}
          </div>
        </FormSection>
      </div>
    );
  }

  function renderStep2() {
    // PJ: renderiza formulário de representantes legais
    if (isPJ(data)) {
      return (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Representantes Legais 👥</h2>
            <p className="text-muted-foreground mt-1 text-sm">Cadastre sócios, administradores e quem assinará o contrato.</p>
          </div>
          <RepresentantesForm
            representantes={data.representantes}
            onChange={next => update(p => ({ ...p, representantes: next }))}
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Cônjuge e Sócios</h2>
          <p className="text-muted-foreground mt-1 text-sm">Preencha os dados do cônjuge e adicione sócios, se houver.</p>
        </div>

        <FormSection icon={User} title="Dados do Cônjuge">
          <PersonFieldsClean data={data.conjuge} onChange={d => update(p => ({ ...p, conjuge: d }))} />
        </FormSection>

        <FormSection icon={Users} title="Sócios">
          <div className="space-y-4">
            {data.socios.map((s, i) => (
              <div key={i} className="p-4 border rounded-xl relative">
                <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 text-red-500 hover:text-red-700 h-8 w-8"
                  onClick={() => update(p => ({ ...p, socios: p.socios.filter((_, idx) => idx !== i) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <p className="text-xs font-semibold text-muted-foreground mb-3">Sócio {i + 1}</p>
                <PersonFieldsClean data={s} onChange={d => { update(p => { const copy = [...p.socios]; copy[i] = d; return { ...p, socios: copy }; }); }} />
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full rounded-xl"
              onClick={() => update(p => ({ ...p, socios: [...p.socios, { ...emptyPerson }] }))}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar sócio
            </Button>
          </div>
        </FormSection>
      </div>
    );
  }

  function renderStep3() {
    const isPj = isPJ(data);
    const principalLabel = isPj
      ? (data.empresa.razao_social || data.empresa.nome_fantasia || 'Empresa')
      : (data.dados_pessoais.nome || 'Locatário principal');
    const principalRoleLabel = isPj ? 'Empresa / Pessoa Jurídica' : 'Locatário principal';

    // Helper para renderizar a lista de categorias de documentos de uma pessoa.
    const renderDocList = (
      categorias: DocumentCategory[],
      onUpdate: (mutator: (cats: DocumentCategory[]) => DocumentCategory[]) => void,
      keyPrefix: string,
    ) => (
      <div className="space-y-3">
        {categorias.map((cat, catIdx) => {
          const done = cat.files.length > 0;
          return (
            <div key={`${keyPrefix}-${cat.key}-${catIdx}`} className={cn('bg-white rounded-2xl border p-4 space-y-3', done && 'border-green-200')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">{cat.label}</h4>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                      done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {done ? `${cat.files.length} arquivo(s)` : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {cat.help}
                  </p>
                </div>
              </div>
              {cat.files.length > 0 && (
                <div className="space-y-1.5">
                  {cat.files.map(file => (
                    <div key={file.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                      {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="truncate flex-1 text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                      <button className="text-red-400 hover:text-red-600 p-1"
                        onClick={() => onUpdate(cats => {
                          const next = [...cats];
                          next[catIdx] = { ...next[catIdx], files: next[catIdx].files.filter(f => f.id !== file.id) };
                          return next;
                        })}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-accent font-medium hover:bg-accent/5 border-2 border-dashed border-accent/30 rounded-xl py-3 transition-colors">
                <Upload className="h-4 w-4" /> Adicionar arquivo
                <input type="file" accept={ACCEPTED_FILE_TYPES} multiple className="hidden" onChange={e => {
                  const fileList = e.target.files;
                  if (!fileList) return;
                  let rejected = 0;
                  Array.from(fileList).forEach(file => {
                    if (!ACCEPTED_MIMES.includes(file.type)) { rejected++; return; }
                    if (file.size > MAX_FILE_SIZE) { rejected++; return; }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const uploaded: UploadedFile = { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, dataUrl: reader.result as string };
                      onUpdate(cats => {
                        const next = [...cats];
                        next[catIdx] = { ...next[catIdx], files: [...next[catIdx].files, uploaded] };
                        return next;
                      });
                    };
                    reader.readAsDataURL(file);
                  });
                  if (rejected > 0) toast.error(`${rejected} arquivo(s) rejeitado(s)`);
                  e.target.value = '';
                }} />
              </label>
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <FileCheck className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Documentos 📋</h2>
          <p className="text-muted-foreground mt-1 text-sm">Envie os documentos de cada pessoa envolvida na proposta.</p>
        </div>

        {/* Bloco do locatário principal / empresa */}
        <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              {isPj ? <Building className="h-4 w-4 text-accent" /> : <User className="h-4 w-4 text-accent" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{principalRoleLabel}</p>
              <p className="text-sm font-bold text-foreground">{principalLabel}</p>
            </div>
          </div>
          {renderDocList(
            data.documentos,
            (mutator) => update(p => ({ ...p, documentos: mutator(p.documentos) })),
            'principal',
          )}
        </div>

        {!isPj && needsConjuge(data) && (
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cônjuge do locatário principal</p>
                <p className="text-sm font-bold text-foreground">{data.conjuge.nome || 'Cônjuge'}</p>
              </div>
            </div>
            {renderDocList(
              ensureConjugeDocs(data.conjuge.documentos),
              (mutator) => update(p => ({ ...p, conjuge: { ...p.conjuge, documentos: mutator(ensureConjugeDocs(p.conjuge.documentos)) } })),
              'principal-conjuge',
            )}
          </div>
        )}

        {/* Blocos de documentos de cada locatário adicional (somente PF) */}
        {!isPj && (data.locatarios_adicionais || []).map((loc, idx) => {
          const docs = loc.documentos && loc.documentos.length > 0 ? loc.documentos : buildLocatarioAdicionalDocs();
          const spouseDocs = ensureConjugeDocs(loc.conjuge?.documentos);
          return (
            <div key={`loc-add-${idx}`} className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Locatário adicional {idx + 1}</p>
                  <p className="text-sm font-bold text-foreground">{loc.nome || `Locatário ${idx + 2}`}</p>
                </div>
              </div>
              {renderDocList(
                docs,
                (mutator) => update(p => {
                  const arr = [...(p.locatarios_adicionais || [])];
                  const current = arr[idx]?.documentos && arr[idx]!.documentos!.length > 0
                    ? arr[idx]!.documentos!
                    : buildLocatarioAdicionalDocs();
                  arr[idx] = { ...arr[idx], documentos: mutator(current) };
                  return { ...p, locatarios_adicionais: arr };
                }),
                `loc-${idx}`,
              )}
              {locatarioNeedsConjuge(loc) && (
                <div className="mt-4 rounded-xl border bg-background p-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cônjuge do locatário adicional {idx + 1}</p>
                    <p className="text-sm font-bold text-foreground">{loc.conjuge.nome || 'Cônjuge'}</p>
                  </div>
                  {renderDocList(
                    spouseDocs,
                    (mutator) => update(p => {
                      const arr = [...(p.locatarios_adicionais || [])];
                      const currentSpouseDocs = ensureConjugeDocs(arr[idx]?.conjuge?.documentos);
                      arr[idx] = { ...arr[idx], conjuge: { ...arr[idx].conjuge, documentos: mutator(currentSpouseDocs) } };
                      return { ...p, locatarios_adicionais: arr };
                    }),
                    `loc-${idx}-conjuge`,
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Aviso sobre fiadores: documentos vivem na etapa de Garantia */}
        {(data.garantia.fiadores || []).length > 0 && (
          <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Os documentos dos fiadores são anexados na etapa de <strong>Garantia</strong>, dentro do bloco de cada fiador.</span>
          </div>
        )}

        <FormSection icon={FileText} title="Observações">
          <Textarea value={data.documentos_observacao} onChange={e => update(p => ({ ...p, documentos_observacao: e.target.value }))} placeholder="Alguma observação sobre seus documentos?" rows={3} />
        </FormSection>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Home className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Queremos te conhecer melhor! 😊</h2>
          <p className="text-muted-foreground mt-2 text-base">Conte-nos quem vai morar no imóvel para prepararmos tudo da melhor forma pra você.</p>
        </div>

        {/* "Você está alugando..." card selection */}
        <div className="bg-card rounded-2xl border p-6 space-y-5">
          <h3 className="font-bold text-foreground text-lg">Você está alugando…</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: 'eu_mesmo', icon: User, label: 'Para eu mesmo morar', desc: 'Você será o inquilino e morador do imóvel' },
              { value: 'filho', icon: Home, label: 'Para um filho(a)', desc: 'Alugando para seu filho ou filha' },
              { value: 'terceiro', icon: Users, label: 'Para um conhecido', desc: 'Amigo, parente ou outra pessoa' },
            ].map(opt => {
              const firstMorador = data.composicao.moradores[0];
              const isSelected = firstMorador?.tipo === opt.value;
              const Icon = opt.icon;
              return (
                <button key={opt.value} type="button"
                  onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: [{ tipo: opt.value as MoradorData['tipo'], nome: opt.value === 'eu_mesmo' ? '' : p.composicao.moradores[0]?.nome || '' }] } }))}
                  className={cn(
                    'flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all',
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:shadow-sm'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                    isSelected ? 'bg-accent/10' : 'bg-muted'
                  )}>
                    <Icon className={cn('h-6 w-6', isSelected ? 'text-accent' : 'text-muted-foreground')} />
                  </div>
                  <p className={cn('font-bold text-sm', isSelected ? 'text-accent' : 'text-foreground')}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aviso ocupante autorizado */}
        {data.composicao.moradores[0]?.tipo && data.composicao.moradores[0].tipo !== 'eu_mesmo' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
            <span className="text-2xl">👉</span>
            <p className="text-sm text-amber-900">
              <strong>Importante:</strong> mesmo que outra pessoa vá morar no imóvel, o contrato será feito no <strong>seu nome</strong> (locatário). A pessoa que vai morar será registrada como <strong>ocupante autorizado</strong>.
            </p>
          </div>
        )}

        {/* Dados do(a) filho(a) — 1 morador fixo */}
        {data.composicao.moradores[0]?.tipo === 'filho' && (
          <div className="bg-card rounded-2xl border p-6 space-y-5">
            <div>
              <h3 className="font-bold text-foreground text-lg">Dados do(a) filho(a) que vai morar</h3>
              <p className="text-sm text-muted-foreground mt-1">Informe os dados de quem vai morar no imóvel.</p>
            </div>
            <div className="border rounded-xl p-5 space-y-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm">Morador 1</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Qual a relação com você? *</Label>
                  <Input
                    value={data.composicao.moradores[0]?.relacao || ''}
                    onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], relacao: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                    placeholder="Filho(a)"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome completo *</Label>
                  <Input
                    value={data.composicao.moradores[0]?.nome || ''}
                    onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], nome: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                    placeholder="Nome do morador"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp *</Label>
                  <Input
                    value={data.composicao.moradores[0]?.whatsapp || ''}
                    onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], whatsapp: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                    placeholder="(00) 00000-0000"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail *</Label>
                  <Input
                    type="email"
                    value={data.composicao.moradores[0]?.email || ''}
                    onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], email: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                    placeholder="email@exemplo.com"
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de moradores — terceiro (com adicionar) */}
        {data.composicao.moradores[0]?.tipo === 'terceiro' && (
          <div className="bg-card rounded-2xl border p-6 space-y-5">
            <div>
              <h3 className="font-bold text-foreground text-lg">Quem vai morar no imóvel?</h3>
              <p className="text-sm text-muted-foreground mt-1">Adicione as pessoas que vão morar no imóvel.</p>
            </div>
            {data.composicao.moradores.map((m, idx) => (
              <div key={idx} className="border rounded-xl p-5 space-y-4 bg-muted/20 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-sm">Morador {idx + 1}</span>
                  </div>
                  {idx > 0 && (
                    <button type="button" onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: p.composicao.moradores.filter((_, i) => i !== idx) } }))} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qual a relação com você? *</Label>
                    <Input
                      value={m.relacao || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], relacao: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="Filho(a), amigo(a), primo(a)..."
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome completo *</Label>
                    <Input
                      value={m.nome || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], nome: e.target.value, tipo: 'terceiro' }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="Nome do morador"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp *</Label>
                    <Input
                      value={m.whatsapp || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], whatsapp: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="(00) 00000-0000"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail *</Label>
                    <Input
                      type="email"
                      value={m.email || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], email: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="email@exemplo.com"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: [...p.composicao.moradores, { tipo: 'terceiro', nome: '', relacao: '', whatsapp: '', email: '' }] } }))} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Adicionar outro morador
            </Button>
          </div>
        )}

        {/* "Outra pessoa vai retirar as chaves?" toggle */}
        <div className="bg-card rounded-2xl border p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground text-sm">Outra pessoa vai retirar as chaves?</h4>
                <button type="button"
                  onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, responsavel_retirada: p.composicao.responsavel_retirada ? '' : 'terceiro' } }))}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors shrink-0',
                    data.composicao.responsavel_retirada ? 'bg-accent' : 'bg-muted-foreground/20'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-sm',
                    data.composicao.responsavel_retirada ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
                  )} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Se <strong className="text-foreground">você mesmo</strong> vai retirar as chaves, deixe desativado. Ative apenas se <strong className="text-foreground">outra pessoa</strong> ficará responsável por recebê-las na imobiliária.
              </p>
              {data.composicao.responsavel_retirada && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome completo *</Label>
                    <Input value={data.composicao.retirada_nome || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_nome: e.target.value } }))} placeholder="Nome" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp *</Label>
                    <Input value={data.composicao.retirada_whatsapp || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_whatsapp: e.target.value } }))} placeholder="(00) 00000-0000" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CPF *</Label>
                    <Input value={data.composicao.retirada_cpf || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_cpf: e.target.value } }))} placeholder="000.000.000-00" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail</Label>
                    <Input type="email" value={data.composicao.retirada_email || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_email: e.target.value } }))} placeholder="email@exemplo.com" className="h-11" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep5() {
    const selectedGarantia = GARANTIA_OPTIONS.find(g => g.value === data.garantia.tipo_garantia);
    const rentValue = property?.valor_aluguel || 0;
    const updateFiador = (index: number, patch: Partial<FiadorData>) => {
      update(p => {
        const fiadores = [...p.garantia.fiadores];
        const current = { ...fiadores[index], ...patch };
        // Se mudou tipo ou estado civil/regime/conjuge_participa, recalcula categorias de docs preservando arquivos existentes
        const needsConj = fiadorNeedsConjuge(current);
        if (
          patch.tipo_fiador !== undefined ||
          patch.estado_civil !== undefined ||
          patch.regime_bens !== undefined ||
          patch.conjuge_participa !== undefined
        ) {
          const target = buildFiadorDocs(current.tipo_fiador, needsConj);
          // Preserva arquivos previamente enviados nas categorias que ainda existem
          const prevByKey = new Map(current.documentos.map(c => [c.key, c.files]));
          current.documentos = target.map(c => ({ ...c, files: prevByKey.get(c.key) ?? [] }));
          if (!needsConj) {
            current.conjuge = { ...emptyFiadorConjuge };
            if (!fiadorIsCasado(current)) {
              current.regime_bens = '';
              current.conjuge_participa = '';
            }
          }
        }
        fiadores[index] = current;
        return { ...p, garantia: { ...p.garantia, fiadores } };
      });
    };
    const updateFiadorConjuge = (index: number, field: keyof FiadorConjugeData, value: string) => {
      update(p => {
        const fiadores = [...p.garantia.fiadores];
        const current = { ...fiadores[index], conjuge: { ...fiadores[index].conjuge, [field]: value } };
        fiadores[index] = current;
        return { ...p, garantia: { ...p.garantia, fiadores } };
      });
    };
    const addFiadorFile = (fiadorIdx: number, catIdx: number, file: UploadedFile) => {
      update(p => {
        const fiadores = [...p.garantia.fiadores];
        const docs = [...fiadores[fiadorIdx].documentos];
        docs[catIdx] = { ...docs[catIdx], files: [...docs[catIdx].files, file] };
        fiadores[fiadorIdx] = { ...fiadores[fiadorIdx], documentos: docs };
        return { ...p, garantia: { ...p.garantia, fiadores } };
      });
    };
    const removeFiadorFile = (fiadorIdx: number, catIdx: number, fileId: string) => {
      update(p => {
        const fiadores = [...p.garantia.fiadores];
        const docs = [...fiadores[fiadorIdx].documentos];
        docs[catIdx] = { ...docs[catIdx], files: docs[catIdx].files.filter(f => f.id !== fileId) };
        fiadores[fiadorIdx] = { ...fiadores[fiadorIdx], documentos: docs };
        return { ...p, garantia: { ...p.garantia, fiadores } };
      });
    };
    const addFiador = (tipo: FiadorTipo = '') =>
      update(p => ({ ...p, garantia: { ...p.garantia, fiadores: [...p.garantia.fiadores, makeEmptyFiador(tipo)] } }));
    const removeFiador = (i: number) =>
      update(p => ({ ...p, garantia: { ...p.garantia, fiadores: p.garantia.fiadores.filter((_, idx) => idx !== i) } }));

    // Status da regra principal
    const fiadores = data.garantia.fiadores;
    const hasRenda = fiadores.some(f => f.tipo_fiador === 'renda');
    const hasImovel = fiadores.some(f => f.tipo_fiador === 'imovel');

    return (
      <div className="space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Garantia do contrato 🔒</h2>
          <p className="text-muted-foreground mt-2 text-base">A garantia protege tanto você quanto o proprietário. Escolha a modalidade que melhor se encaixa no seu perfil.</p>
        </div>

        {/* FAQ accordion */}
        <div className="bg-card rounded-2xl border p-5">
          <details className="group">
            <summary className="flex items-center gap-3 cursor-pointer list-none">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="font-semibold text-foreground text-sm flex-1">Não sei qual garantia escolher. O que fazer?</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="text-sm text-muted-foreground mt-3 ml-[3.25rem] space-y-2">
              <p>
                A modalidade mais prática e utilizada é o <strong className="text-foreground">Seguro Fiança</strong>, pois dispensa a necessidade de fiador e agiliza o processo de aprovação.
              </p>
              <p>
                Caso tenha dúvidas, você pode seguir com a opção que preferir — nosso time irá analisar sua proposta e orientá-lo na melhor escolha conforme o seu perfil.
              </p>
            </div>
          </details>
        </div>

        {/* Garantia cards - horizontal row like SG */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {GARANTIA_OPTIONS.map(g => {
            const selected = data.garantia.tipo_garantia === g.value;
            return (
              <button key={g.value} type="button" 
                onClick={() => update(p => ({
                  ...p,
                  garantia: {
                    ...p.garantia,
                    tipo_garantia: g.value,
                    fiadores: g.value === 'Fiador' && p.garantia.fiadores.length === 0 ? [{ ...emptyFiador }] : p.garantia.fiadores,
                  }
                }))}
                className={cn(
                  'relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all',
                  selected ? 'border-accent bg-accent/5 shadow-sm' : 'border-border hover:border-muted-foreground/30 hover:shadow-sm'
                )}
              >
                {g.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {g.badge}
                  </span>
                )}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                  selected ? 'bg-accent/10' : 'bg-muted'
                )}>
                  <span className="text-xl">{g.icon}</span>
                </div>
                <p className={cn('font-bold text-xs', selected ? 'text-accent' : 'text-foreground')}>{g.value}</p>
              </button>
            );
          })}
        </div>

        {/* Detail panel for selected guarantee */}
        {selectedGarantia && (
          <div className="bg-card rounded-2xl border overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">{selectedGarantia.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{selectedGarantia.value}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGarantia.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: selectedGarantia.detail.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                }}
              />

              {/* Estimate for Seguro Fiança */}
              {selectedGarantia.estimatePercent > 0 && rentValue > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 border">
                  <p className="text-sm text-foreground">
                    Para este imóvel (R$ {Number(rentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}), estimativa de{' '}
                    <strong>R$ {(rentValue * selectedGarantia.estimatePercent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</strong>{' '}
                    junto ao aluguel.
                  </p>
                </div>
              )}

              {/* Vantagens + Pontos de atenção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Vantagens</p>
                  <ul className="space-y-1.5">
                    {selectedGarantia.vantagens.map((v, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-warning uppercase tracking-wider mb-2">Pontos de atenção</p>
                  <ul className="space-y-1.5">
                    {selectedGarantia.atencao.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fiador form - when Fiador is selected */}
        {data.garantia.tipo_garantia === 'Fiador' && (
          <FiadorSection
            fiadores={fiadores}
            hasRenda={hasRenda}
            hasImovel={hasImovel}
            rentValue={rentValue}
            onUpdateFiador={updateFiador}
            onUpdateConjuge={updateFiadorConjuge}
            onAddFile={addFiadorFile}
            onRemoveFile={removeFiadorFile}
            onAddFiador={addFiador}
            onRemoveFiador={removeFiador}
          />
        )}

        {/* Warning note */}
        <div className="text-sm text-muted-foreground text-center space-y-2 max-w-3xl mx-auto">
          <p>
            ⚠️ A modalidade de caução poderá ser aceita mediante análise de crédito e perfil da locação.
          </p>
          <p>
            A definição da garantia depende da avaliação completa da proposta, podendo variar conforme o imóvel e o perfil do pretendente.
          </p>
        </div>

        {/* Tipo de contrato (Digital / Físico) */}
        <div className="bg-card rounded-2xl border p-6 space-y-4">
          <div>
            <Label className="text-sm font-semibold block">
              Como você prefere assinar o contrato? <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha a modalidade de assinatura mais conveniente para você.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: 'digital' as const,
                icon: '💻',
                title: 'Digital',
                desc: 'Assinatura eletrônica via link enviado por e-mail. Mais rápido e prático.',
              },
              {
                value: 'fisico' as const,
                icon: '✍️',
                title: 'Físico / Presencial',
                desc: 'Assinatura presencial em nossa imobiliária, com documentos impressos.',
              },
            ].map(opt => {
              const selected = data.garantia.tipo_contrato_assinatura === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update(p => ({
                    ...p,
                    garantia: { ...p.garantia, tipo_contrato_assinatura: opt.value },
                  }))}
                  className={cn(
                    'text-left rounded-xl border-2 p-4 transition-all',
                    selected
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                      : 'border-border bg-background hover:border-accent/40'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl leading-none">{opt.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{opt.title}</span>
                        {selected && <Check className="h-4 w-4 text-accent" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Observations */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <Label className="text-sm font-semibold block">Observações sobre a garantia <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea value={data.garantia.observacao} onChange={e => update(p => ({ ...p, garantia: { ...p.garantia, observacao: e.target.value } }))} placeholder="Detalhes adicionais sobre a garantia..." rows={3} />
        </div>
      </div>
    );
  }

  function renderStep6() {
    return (
      <div className="space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Handshake className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Negociação 🤝</h2>
          <p className="text-muted-foreground mt-2 text-base">Escolha como deseja prosseguir com o valor do aluguel.</p>
        </div>

        {/* Two option cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Accept announced value */}
          <button type="button"
            onClick={() => update(p => ({ ...p, negociacao: { ...p.negociacao, aceitou_valor: 'sim', valor_proposto: '' } }))}
            className={cn(
              'relative p-6 rounded-2xl border-2 text-left transition-all',
              data.negociacao.aceitou_valor === 'sim'
                ? 'border-accent bg-accent/5 shadow-md'
                : 'border-border hover:border-muted-foreground/40 hover:shadow-sm'
            )}
          >
            {data.negociacao.aceitou_valor === 'sim' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                ✓ Mais indicado
              </span>
            )}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Alugar pelo valor anunciado</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Garanta logo o seu!</p>
              </div>
            </div>
            {property && (
              <div className="bg-background rounded-xl p-4 border">
                <span className="text-2xl font-bold text-foreground">
                  {property.valor_aluguel ? `R$ ${Number(property.valor_aluguel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor a consultar'}
                </span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Sua proposta tem <strong className="text-foreground">prioridade na análise</strong>. Imóveis bons vão rápido — não perca a oportunidade!
            </p>
          </button>

          {/* Option 2: Negotiate */}
          <button type="button"
            onClick={() => update(p => ({ ...p, negociacao: { ...p.negociacao, aceitou_valor: 'nao' } }))}
            className={cn(
              'relative p-6 rounded-2xl border-2 text-left transition-all',
              data.negociacao.aceitou_valor === 'nao'
                ? 'border-accent bg-accent/5 shadow-md'
                : 'border-border hover:border-muted-foreground/40 hover:shadow-sm'
            )}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Quero negociar o valor</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Sujeito à aprovação do proprietário</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Você pode propor um valor diferente. A proposta será enviada ao proprietário, que poderá <strong className="text-foreground">aceitar, recusar ou contrapropor</strong>.
            </p>
          </button>
        </div>

        {/* Negotiate value input - appears when "negotiate" is selected */}
        {data.negociacao.aceitou_valor === 'nao' && (
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <Label className="text-sm font-semibold block">Qual valor você propõe? (R$)</Label>
            <CurrencyInput
              value={data.negociacao.valor_proposto}
              onValueChange={v => update(p => ({ ...p, negociacao: { ...p.negociacao, valor_proposto: v } }))}
              placeholder="0,00"
              className="text-lg h-12"
            />
          </div>
        )}

        {/* Observations */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <Label className="text-sm font-semibold block">Condições ou observações <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea value={data.negociacao.observacao} onChange={e => update(p => ({ ...p, negociacao: { ...p.negociacao, observacao: e.target.value } }))} placeholder="Descreva suas condições ou observações..." rows={4} />
        </div>

        {/* Important info cards */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Informações importantes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Contrato de 30 meses</h4>
                <div className="text-muted-foreground text-sm mt-1 space-y-2">
                  <p>Nossos contratos residenciais possuem prazo de <strong className="text-foreground">30 meses</strong>.</p>
                  <p>O inquilino pode encerrar o contrato <strong className="text-foreground">sem multa</strong> ao final de cada ciclo de 12 meses, desde que seja realizado <strong className="text-foreground">aviso prévio no 11º mês</strong> para saída no 12º mês.</p>
                  <p>Essa regra se repete a cada novo período de 12 meses durante a vigência do contrato.</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl border p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-info" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Enviar não gera vínculo</h4>
                <p className="text-muted-foreground text-sm mt-1">Mesmo no valor anunciado, sua proposta passa por <strong className="text-foreground">análise de crédito</strong> e respeita a <strong className="text-foreground">fila de interessados</strong> no imóvel.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep7() {
    return <ReviewStepPublic data={data} showConjuge={showConjuge} percentual={percentualComprometimento} onGoToStep={s => { setStep(s); setVisited(prev => new Set(prev).add(s)); }} termsAccepted={termsAccepted} onTermsChange={setTermsAccepted} property={property} />;
  }

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

  return (
    <div className="min-h-screen bg-gray-50">
      <StepperHeader currentStep={step} totalSteps={totalSteps} onGoToStep={goToStep} visited={visited} data={data} progressPercent={progressPercent} isSaving={isSaving} lastSavedAt={lastSavedAt} draftStatus={draftStatus} />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-32">
        {stepRenderers[step]?.()}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" onClick={goPrev} disabled={step === 0} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={goNext} className="flex-1 h-12 rounded-xl text-base font-bold">
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => {
              const pending = getPendingSteps(data);
              const critical = pending.filter(p => p.critical);
              if (!termsAccepted) {
                toast.error('Aceite os termos', { description: 'Você precisa aceitar os termos para enviar o registro.' });
                return;
              }
              if (critical.length > 0) {
                toast.error('Pendências críticas impedem o envio', { description: `Corrija: ${critical[0].label} — ${critical[0].errors[0]}` });
                setStep(critical[0].step);
                setVisited(prev => new Set(prev).add(critical[0].step));
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              handleSubmit();
            }} disabled={isSubmitting || !termsAccepted || getPendingSteps(data).some(p => p.critical)} className="flex-1 h-12 rounded-xl text-base font-bold bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:text-muted-foreground">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
              ) : (
                <><ArrowRight className="h-4 w-4 mr-1" /> Enviar Registro</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Person Fields (clean version) ──
function PersonFieldsClean({ data, onChange }: { data: DadosPessoais; onChange: (d: DadosPessoais) => void }) {
  const set = (key: keyof DadosPessoais, val: string) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Nome completo <span className="text-red-500">*</span></Label>
        <Input value={data.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" className="mt-1.5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">CPF <span className="text-red-500">*</span></Label>
          <Input value={data.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-sm font-medium">Profissão</Label>
          <Input value={data.profissao} onChange={e => set('profissao', e.target.value)} placeholder="Profissão" className="mt-1.5" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">WhatsApp <span className="text-red-500">*</span></Label>
          <Input value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-sm font-medium">E-mail <span className="text-red-500">*</span></Label>
          <Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" className="mt-1.5" />
        </div>
      </div>
    </div>
  );
}

// ── Review Step ──
function ReviewStepPublic({ data, showConjuge, percentual, onGoToStep, termsAccepted, onTermsChange, property }: {
  data: ProposalFormData; showConjuge: boolean; percentual: number | null; onGoToStep: (step: number) => void;
  termsAccepted: boolean; onTermsChange: (v: boolean) => void; property: PropertyData;
}) {
  const pendingSteps = getPendingSteps(data);
  const hasCritical = pendingSteps.some(p => p.critical);
  const hasPending = pendingSteps.length > 0;
  const totalDocs = countAllUploadedFiles(data);
  const docsByPartyId = buildDocsByPartyFromFormData(data);
  const pending = countPendingRequired(data);
  const pj = isPJ(data);

  const firstPendingStep = pendingSteps.length > 0 ? pendingSteps[0] : null;
  const partiesPreview = buildPartiesFromFormData(data);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <ClipboardCheck className="h-7 w-7 text-accent" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Quase lá! 🎉</h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Revise todas as informações antes de enviar seu registro de interesse.</p>
      </div>

      {/* Pending steps alert */}
      {hasPending && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
          <p className="text-red-600 font-bold text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Algumas etapas precisam de atenção
          </p>
          <div className="space-y-3">
            {pendingSteps.map(ps => (
              <div key={ps.step} className="flex items-center justify-between bg-white rounded-xl px-5 py-4 border border-red-100">
                <span className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Etapa {ps.step + 1}: {ps.label}
                </span>
                <button onClick={() => onGoToStep(ps.step)} className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors">
                  Completar →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data blocks */}
      <div className="space-y-5">
        {/* Pessoas/Partes da proposta (locatários, cônjuges, fiadores, empresa, representantes) */}
        {partiesPreview.length > 0 && (
          <div className="bg-white rounded-2xl border p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <span>👥</span> Pessoas envolvidas
              </h4>
              <button onClick={() => onGoToStep(1)} className="text-sm text-accent font-semibold hover:underline">
                ✏️ Editar
              </button>
            </div>
            <ProposalPartiesView parties={partiesPreview} docsByPartyId={docsByPartyId} />
          </div>
        )}

        {pj ? (
          <>
            {/* Empresa */}
            <ReviewBlockNew title="Dados da Empresa" icon="🏢" onFix={() => onGoToStep(1)} hasPending={!data.empresa.razao_social.trim() || !data.empresa.cnpj.trim()}>
              <ReviewRow label="Razão Social" value={vv(data.empresa.razao_social)} />
              <ReviewRow label="Nome Fantasia" value={vv(data.empresa.nome_fantasia)} />
              <ReviewRow label="CNPJ" value={vv(data.empresa.cnpj)} />
              <ReviewRow label="Data de abertura" value={vv(data.empresa.data_abertura)} />
              <ReviewRow label="Ramo de atividade" value={vv(data.empresa.ramo_atividade)} />
              <ReviewRow label="Telefone" value={vv(data.empresa.telefone)} />
              <ReviewRow label="E-mail" value={vv(data.empresa.email)} />
              <ReviewRow
                label="Endereço"
                value={vv([data.empresa.logradouro, data.empresa.numero, data.empresa.bairro, data.empresa.cidade, data.empresa.uf].filter(Boolean).join(', '))}
              />
              <ReviewRow label="Faturamento mensal" value={vvCurrency(data.empresa.faturamento_mensal)} />
              <ReviewRow label="Regime tributário" value={vv(data.empresa.regime_tributario)} />
              <ReviewRow label="Tempo de atividade" value={vv(data.empresa.tempo_atividade)} />
            </ReviewBlockNew>

            {/* Representantes */}
            <ReviewBlockNew
              title="Representantes Legais"
              icon="👥"
              onFix={() => onGoToStep(2)}
              hasPending={data.representantes.length === 0 || !data.representantes.some(r => r.is_signatario)}
            >
              <ReviewRow label="Total de representantes" value={String(data.representantes.length)} />
              <ReviewRow
                label="Signatário do contrato"
                value={data.representantes.some(r => r.is_signatario) ? '✅ Indicado' : '⚠️ Pendente'}
              />
              {data.representantes.map((r, i) => (
                <div key={i} className="mt-2 pt-2 border-t border-border/60 first:border-t-0 first:pt-0 first:mt-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Representante {i + 1}</p>
                  <ReviewRow label="Nome" value={vv(r.nome)} />
                  <ReviewRow label="CPF" value={vv(r.cpf)} />
                  <ReviewRow label="WhatsApp" value={vv(r.whatsapp)} />
                  <ReviewRow label="E-mail" value={vv(r.email)} />
                  <ReviewRow
                    label="Papéis"
                    value={[r.is_socio ? 'Sócio' : null, r.is_administrador ? 'Administrador' : null, r.is_signatario ? 'Signatário' : null].filter(Boolean).join(' • ') || 'Não informado'}
                  />
                </div>
              ))}
            </ReviewBlockNew>
          </>
        ) : (
        <ReviewBlockNew title="Dados Pessoais" icon="👤" onFix={() => onGoToStep(1)} hasPending={!data.dados_pessoais.nome.trim()}>
          <ReviewRow label="Nome" value={vv(data.dados_pessoais.nome)} />
          <ReviewRow label="CPF" value={vv(data.dados_pessoais.cpf)} />
          <ReviewRow label="Profissão" value={vv(data.dados_pessoais.profissao)} />
          <ReviewRow label="WhatsApp" value={vv(data.dados_pessoais.whatsapp)} />
          <ReviewRow label="E-mail" value={vv(data.dados_pessoais.email)} />
          <ReviewRow label="Estado Civil" value={vv(data.perfil_financeiro.estado_civil)} />
          {isCasadoOuUniao(data) && <ReviewRow label="Regime de Bens" value={vv(data.perfil_financeiro.regime_bens)} />}
          {isCasadoOuUniao(data) && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && (
            <ReviewRow label="Cônjuge participa" value={data.perfil_financeiro.conjuge_participa === 'sim' ? 'Sim' : data.perfil_financeiro.conjuge_participa === 'nao' ? 'Não' : 'Não informado'} />
          )}
          <ReviewRow label="Renda" value={vvCurrency(data.perfil_financeiro.renda_mensal)} />
          {percentual !== null && <ReviewRow label="Comprometimento" value={`${percentual.toFixed(1)}%`} warn={percentual > 30} />}
        </ReviewBlockNew>
        )}

        {/* Documentos */}
        <ReviewBlockNew
          title="Documentos"
          icon="📄"
          onFix={() => onGoToStep(3)}
          hasPending={totalDocs === 0 || (pending.required > 0 && pending.ok < pending.required)}
        >
          <p className="text-sm text-foreground font-medium">
            {pending.required > 0
              ? `${pending.ok} de ${pending.required} documentos obrigatórios enviados`
              : `${totalDocs} documento(s) enviado(s)`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total de arquivos anexados: {totalDocs}
          </p>
          {pending.required > 0 && pending.ok < pending.required && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Há documentos obrigatórios pendentes — confira os blocos de cada pessoa acima.
            </p>
          )}
        </ReviewBlockNew>

        {/* Moradores e Contrato */}
        <ReviewBlockNew title="Moradores e Contrato" icon="🏠" onFix={() => onGoToStep(4)} hasPending={data.composicao.moradores.length === 0 || !data.composicao.moradores[0]?.tipo}>
          <ReviewRow
            label="Tipo de locação"
            value={
              data.composicao.moradores[0]?.tipo === 'eu_mesmo'
                ? 'Para o próprio locatário'
                : data.composicao.moradores[0]?.tipo === 'filho'
                ? 'Para um filho(a)'
                : data.composicao.moradores[0]?.tipo === 'terceiro'
                ? 'Para um conhecido'
                : 'Não informado'
            }
          />
          {data.composicao.moradores[0]?.tipo && data.composicao.moradores[0].tipo !== 'eu_mesmo' && (
            <>
              <ReviewRow label="Total de moradores" value={String(data.composicao.moradores.length)} />
              {data.composicao.moradores.map((m, i) => (
                <div key={i} className="mt-2 pt-2 border-t border-border/60 first:border-t-0 first:pt-0 first:mt-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Morador {i + 1}</p>
                  <ReviewRow label="Nome" value={vv(m.nome)} />
                  <ReviewRow label="Relação" value={vv(m.relacao)} />
                  <ReviewRow label="WhatsApp" value={vv(m.whatsapp)} />
                  <ReviewRow label="E-mail" value={vv(m.email)} />
                </div>
              ))}
            </>
          )}
          <div className="mt-2 pt-2 border-t border-border/60">
            <ReviewRow
              label="Quem retira as chaves"
              value={data.composicao.responsavel_retirada ? 'Outra pessoa' : 'O próprio proponente'}
            />
            {data.composicao.responsavel_retirada && (
              <>
                <ReviewRow label="Nome" value={vv(data.composicao.retirada_nome)} />
                <ReviewRow label="WhatsApp" value={vv(data.composicao.retirada_whatsapp)} />
                <ReviewRow label="CPF" value={vv(data.composicao.retirada_cpf)} />
                {data.composicao.retirada_email && <ReviewRow label="E-mail" value={data.composicao.retirada_email} />}
              </>
            )}
          </div>
        </ReviewBlockNew>

        {/* Garantia */}
        <ReviewBlockNew title="Garantia" icon="🔒" onFix={() => onGoToStep(5)} hasPending={!data.garantia.tipo_garantia}>
          <ReviewRow label="Modalidade" value={vv(data.garantia.tipo_garantia)} />
          {data.garantia.observacao && <ReviewRow label="Observação" value={data.garantia.observacao} />}
          {data.garantia.tipo_garantia === 'Fiador' && (
            <>
              <ReviewRow label="Fiadores cadastrados" value={String(data.garantia.fiadores.length)} />
              <ReviewRow label="Fiador com renda" value={data.garantia.fiadores.some(f => f.tipo_fiador === 'renda') ? '✅ Sim' : '⚠️ Pendente'} />
              <ReviewRow label="Fiador com imóvel" value={data.garantia.fiadores.some(f => f.tipo_fiador === 'imovel') ? '✅ Sim' : '⚠️ Pendente'} />
              {data.garantia.fiadores.map((f, i) => {
                const tipoLabel = f.tipo_fiador === 'renda' ? 'Renda' : f.tipo_fiador === 'imovel' ? 'Imóvel' : 'Tipo não definido';
                const docsTotal = f.documentos.filter(d => d.key !== 'renda_conjuge').length;
                const docsOk = f.documentos.filter(d => d.key !== 'renda_conjuge' && d.files.length > 0).length;
                return (
                  <div key={i}>
                    <ReviewRow label={`Fiador ${i + 1} — ${tipoLabel}`} value={vv(f.nome)} />
                    <ReviewRow label={`Fiador ${i + 1} — Documentos`} value={docsTotal === 0 ? 'Selecione o tipo' : `${docsOk}/${docsTotal} ${docsOk === docsTotal ? '✅' : '⚠️'}`} />
                  </div>
                );
              })}
            </>
          )}
        </ReviewBlockNew>

        {/* Negociação */}
        <ReviewBlockNew title="Negociação" icon="🤝" onFix={() => onGoToStep(6)}>
          <ReviewRow label="Aceitou valor anunciado" value={data.negociacao.aceitou_valor === 'sim' ? 'Sim' : data.negociacao.aceitou_valor === 'nao' ? 'Não' : 'Não informado'} />
          {data.negociacao.valor_proposto && <ReviewRow label="Valor proposto" value={vvCurrency(data.negociacao.valor_proposto)} />}
          {data.negociacao.observacao && <ReviewRow label="Observação" value={data.negociacao.observacao} />}
        </ReviewBlockNew>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2xl border p-6 sm:p-8 space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Declaro que as informações acima refletem os valores e condições <strong>anunciados na data do registro</strong>. 
          Os valores de aluguel, condomínio, IPTU, seguro incêndio e demais encargos são informados pela administradora, 
          condomínio e seguradoras responsáveis e <strong>podem variar</strong> entre o período do cadastro do anúncio e a contratação. 
          Declara o proponente estar ciente disso e que as confirmações serão feitas no ato da locação diretamente com cada responsável.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seus dados pessoais serão tratados conforme a <strong>LGPD (Lei Geral de Proteção de Dados)</strong> e serão utilizados 
          exclusivamente para os fins deste registro de interesse.
        </p>
        <label className="flex items-start gap-3 bg-muted/50 rounded-xl p-4 cursor-pointer hover:bg-muted/70 transition-colors">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => onTermsChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm text-foreground leading-relaxed">
            Li e aceito os termos acima. Declaro que todas as informações fornecidas são verdadeiras e autorizo a 
            <strong> Rizzo Imobiliária</strong> a realizar as consultas e verificações necessárias para análise deste registro de interesse.
          </span>
        </label>
      </div>

      {/* Email notice */}
      <div className="bg-white rounded-2xl border p-5 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <Mail className="h-5 w-5 shrink-0" />
        Você receberá uma cópia deste registro no seu e-mail.
      </div>

      {/* Submit block */}
      {hasPending && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center space-y-4">
          <p className="text-red-600 font-bold text-sm">Complete as etapas acima para liberar o envio</p>
          {firstPendingStep && (
            <button
              onClick={() => onGoToStep(firstPendingStep.step)}
              className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 rounded-xl py-3 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
            >
              <AlertCircle className="h-4 w-4" /> Ir para a primeira etapa pendente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewBlockNew({ title, icon, children, onFix, hasPending = false }: {
  title: string; icon: string; children: React.ReactNode; onFix?: () => void; hasPending?: boolean;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border p-6 sm:p-8', hasPending && 'border-red-200')}>
      <div className="flex items-center justify-between mb-5">
        <h4 className="font-bold text-foreground flex items-center gap-2">
          {hasPending && <AlertCircle className="h-4 w-4 text-red-500" />}
          <span>{icon}</span> {title}
        </h4>
        {onFix && (
          <button onClick={onFix} className="text-sm text-accent font-semibold hover:underline flex items-center gap-1">
            ✏️ Completar
          </button>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const isNotInformed = value === 'Não informado';
  return (
    <div className="flex justify-between items-baseline py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium text-right', isNotInformed && 'text-red-500', warn && 'text-red-500')}>
        {value}
      </span>
    </div>
  );
}