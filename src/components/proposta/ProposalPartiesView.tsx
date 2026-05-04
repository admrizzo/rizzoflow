import { ProposalParty, ROLE_LABELS } from '@/hooks/useProposalParties';
import { User, Shield, Building2, UserCheck, Users, Heart, FileCheck2, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PartyDocSummary {
  key: string;
  label: string;
  optional?: boolean;
  fileCount: number;
  fileNames?: string[];
}

interface Props {
  parties: ProposalParty[];
  /** Layout compacto para uso no CardDetailDialog */
  compact?: boolean;
  className?: string;
  /** Documentos agrupados por id da parte (mostra subseção em cada bloco). */
  docsByPartyId?: Record<string, PartyDocSummary[]>;
}

function formatCurrency(value: number | null | undefined): string | null {
  if (value == null || !isFinite(value as number)) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  } catch {
    return `R$ ${value}`;
  }
}

function classifyLabel(percent: number): string {
  if (!isFinite(percent)) return '';
  if (percent > 100) return 'Renda inferior ao custo mensal';
  if (percent > 50) return 'Alto comprometimento';
  if (percent > 30) return 'Atenção';
  return 'Compatível';
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || !String(value).trim()) return null;
  return (
    <div className="flex flex-wrap justify-between items-baseline gap-2 py-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );
}

function PartyCard({
  party,
  parentName,
  spouses,
  icon,
  compact,
  docs,
  docsByPartyId,
}: {
  party: ProposalParty;
  parentName?: string | null;
  spouses?: ProposalParty[];
  icon: React.ReactNode;
  compact?: boolean;
  docs?: PartyDocSummary[];
  docsByPartyId?: Record<string, PartyDocSummary[]>;
}) {
  const isSpouse = party.role === 'tenant_spouse' || party.role === 'guarantor_spouse';
  const docIdent = party.cpf || party.cnpj;
  return (
    <div
      className={cn(
        'rounded-lg border bg-background',
        compact ? 'p-3' : 'p-4',
        isSpouse && 'border-l-4 border-l-accent/50',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="text-accent">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {party.name || ROLE_LABELS[party.role] || 'Sem nome'}
          </p>
          {isSpouse && parentName && (
            <p className="text-xs text-muted-foreground">Cônjuge de {parentName}</p>
          )}
        </div>
      </div>
      <div className="space-y-0.5">
        <Row label={party.cnpj ? 'CNPJ' : 'CPF'} value={docIdent} />
        <Row label="RG/CNH" value={party.rg} />
        <Row label="E-mail" value={party.email} />
        <Row label="Telefone" value={party.phone} />
        <Row label="Estado civil" value={party.marital_status} />
        {party.metadata?.regime_bens && (
          <Row label="Regime de bens" value={String(party.metadata.regime_bens)} />
        )}
        {party.metadata?.spouse_participates !== undefined && (
          <Row label="Cônjuge participa?" value={party.metadata.spouse_participates ? 'Sim' : 'Não'} />
        )}
        {party.role === 'primary_tenant' && party.metadata?.regime_bens && (
          <Row label="Regime de bens" value={String(party.metadata.regime_bens)} />
        )}
        <Row label="Profissão / Ocupação" value={party.profession} />
        {party.metadata?.fonte_renda && (
          <Row label="Fonte de renda" value={String(party.metadata.fonte_renda)} />
        )}
        {party.metadata?.observacao && (
          <div className="mt-1 text-xs text-muted-foreground italic">
            Obs: {String(party.metadata.observacao)}
          </div>
        )}
        {party.metadata?.fonte_renda &&
          String(party.metadata.fonte_renda).trim().toLowerCase() !== String(party.profession || '').trim().toLowerCase() && (
            <Row label="Fonte de renda" value={String(party.metadata.fonte_renda)} />
          )}
        <Row label={party.role === 'company' ? 'Faturamento mensal' : 'Renda'} value={formatCurrency(party.income)} />
        {party.role === 'primary_tenant' && party.metadata?.comprometimento_percent != null && (
          <Row
            label="Comprometimento (aluguel)"
            value={`${Number(party.metadata.comprometimento_percent).toFixed(1)}% — ${classifyLabel(Number(party.metadata.comprometimento_percent))}`}
          />
        )}
        {party.role === 'primary_tenant' &&
          party.metadata?.comprometimento_percent_total != null &&
          Math.abs(Number(party.metadata.comprometimento_percent_total) - Number(party.metadata.comprometimento_percent ?? 0)) > 0.05 && (
          <Row
            label="Comprometimento (custo total)"
            value={`${Number(party.metadata.comprometimento_percent_total).toFixed(1)}% — ${classifyLabel(Number(party.metadata.comprometimento_percent_total))}`}
          />
        )}
        <Row label="Endereço" value={party.address} />
        {party.role === 'guarantor' && (
          <Row
            label="Tipo de fiador"
            value={
              party.metadata?.tipo_fiador === 'renda'
                ? 'Renda'
                : party.metadata?.tipo_fiador === 'imovel'
                ? 'Imóvel'
                : party.metadata?.tipo_fiador === 'ambos'
                ? 'Renda + Imóvel'
                : null
            }
          />
        )}
        {party.role === 'legal_representative' && (
          <Row
            label="Papéis"
            value={
              [
                party.metadata?.is_socio ? 'Sócio' : null,
                party.metadata?.is_administrador ? 'Administrador' : null,
                party.metadata?.is_signatario ? 'Signatário' : null,
              ]
                .filter(Boolean)
                .join(' • ') || null
            }
          />
        )}
      </div>

      {spouses && spouses.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-accent/30 space-y-3">
          {spouses.map((s) => (
            <PartyCard
              key={s.id}
              party={s}
              parentName={party.name}
              icon={<Heart className="h-4 w-4" />}
              compact={compact}
              docs={docsByPartyId?.[s.id]}
              docsByPartyId={docsByPartyId}
            />
          ))}
        </div>
      )}
      {docs && docs.length > 0 && <PartyDocsList docs={docs} />}
    </div>
  );
}

function PartyDocsList({ docs }: { docs: PartyDocSummary[] }) {
  const required = docs.filter((d) => !d.optional);
  const requiredOk = required.filter((d) => d.fileCount > 0).length;
  const totalFiles = docs.reduce((acc, d) => acc + d.fileCount, 0);
  const allOk = required.length === 0 || requiredOk === required.length;

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          {allOk ? (
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <FileWarning className="h-3.5 w-3.5 text-amber-600" />
          )}
          Documentos enviados
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {required.length > 0 ? `${requiredOk}/${required.length}` : `${totalFiles} arquivo(s)`}
        </span>
      </div>
      <ul className="space-y-0.5">
        {docs.map((d) => {
          const ok = d.fileCount > 0;
          return (
            <li key={d.key} className="flex items-center justify-between gap-2 text-xs">
              <span className={cn('truncate', ok ? 'text-foreground' : 'text-muted-foreground')}>
                {ok ? '✅' : d.optional ? '◻️' : '⚠️'} {d.label}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {ok
                  ? d.fileCount > 1
                    ? `${d.fileCount} arquivos`
                    : 'enviado'
                  : d.optional
                  ? 'opcional'
                  : 'pendente'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function ProposalPartiesView({ parties, compact = false, className, docsByPartyId }: Props) {
  if (!parties || parties.length === 0) return null;

  // Filtra fiadores placeholder (sem qualquer dado real). Isso evita exibir
  // blocos "Fiador" criados em propostas legadas onde a modalidade não usava
  // fiador (ex.: Seguro Fiança, Caução). Cônjuges desses placeholders também
  // são descartados.
  const isRealParty = (p: ProposalParty): boolean => {
    const fields = [p.name, p.cpf, p.cnpj, p.rg, p.email, p.phone, p.address, p.profession];
    const anyText = fields.some((v) => !!(v && String(v).trim()));
    const anyIncome = p.income !== null && p.income !== undefined;
    return anyText || anyIncome;
  };
  const validGuarantorIds = new Set(
    parties.filter((p) => p.role === 'guarantor' && isRealParty(p)).map((p) => p.id),
  );
  parties = parties.filter((p) => {
    if (p.role === 'guarantor') return validGuarantorIds.has(p.id);
    if (p.role === 'guarantor_spouse') {
      // mantém apenas se o fiador-pai for válido
      if (p.related_party_id && validGuarantorIds.has(p.related_party_id)) return true;
      // fallback metadata.spouse_of: aceita se houver pelo menos um fiador real
      return validGuarantorIds.size > 0 && isRealParty(p);
    }
    return true;
  });
  if (parties.length === 0) return null;

  // Agrupa cônjuges por related_party_id (com fallback de metadata.spouse_of)
  const byId = new Map<string, ProposalParty>();
  parties.forEach((p) => byId.set(p.id, p));

  const tenantSpouses: ProposalParty[] = [];
  const guarantorSpouses: ProposalParty[] = [];
  const tenants: ProposalParty[] = [];
  const guarantors: ProposalParty[] = [];
  const company: ProposalParty[] = [];
  const reps: ProposalParty[] = [];

  parties.forEach((p) => {
    switch (p.role) {
      case 'primary_tenant':
      case 'additional_tenant':
        tenants.push(p);
        break;
      case 'tenant_spouse':
        tenantSpouses.push(p);
        break;
      case 'guarantor':
        guarantors.push(p);
        break;
      case 'guarantor_spouse':
        guarantorSpouses.push(p);
        break;
      case 'company':
        company.push(p);
        break;
      case 'legal_representative':
        reps.push(p);
        break;
    }
  });

  const spousesOf = (parentId: string, pool: ProposalParty[]): ProposalParty[] => {
    const direct = pool.filter((s) => s.related_party_id === parentId);
    if (direct.length > 0) return direct;
    // Fallback antigo via metadata.spouse_of
    const parent = byId.get(parentId);
    if (!parent) return [];
    const candidates: string[] = [];
    if (parent.role === 'primary_tenant') candidates.push('primary_tenant');
    if (parent.role === 'additional_tenant') {
      const idx = parent.metadata?.tenant_index;
      if (idx) candidates.push(`additional_tenant_${idx}`);
    }
    if (parent.role === 'guarantor') {
      const idx = parent.metadata?.guarantor_index;
      if (idx) candidates.push(`guarantor_${idx}`);
    }
    return pool.filter((s) => candidates.includes(String(s.metadata?.spouse_of || '')));
  };

  const tenantIcon = (role: string) =>
    role === 'primary_tenant' ? <User className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;

  return (
    <div className={cn('space-y-5', className)}>
      {tenants.length > 0 && (
        <Section title="Locatários" icon={<Users className="h-4 w-4" />}>
          {tenants.map((t) => (
            <PartyCard
              key={t.id}
              party={t}
              icon={tenantIcon(t.role)}
              spouses={spousesOf(t.id, tenantSpouses)}
              compact={compact}
              docs={docsByPartyId?.[t.id]}
              docsByPartyId={docsByPartyId}
            />
          ))}
        </Section>
      )}

      {guarantors.length > 0 && (
        <Section title="Fiadores" icon={<Shield className="h-4 w-4" />}>
          {guarantors.map((g) => (
            <PartyCard
              key={g.id}
              party={g}
              icon={<Shield className="h-4 w-4" />}
              spouses={spousesOf(g.id, guarantorSpouses)}
              compact={compact}
              docs={docsByPartyId?.[g.id]}
              docsByPartyId={docsByPartyId}
            />
          ))}
        </Section>
      )}

      {company.length > 0 && (
        <Section title="Empresa" icon={<Building2 className="h-4 w-4" />}>
          {company.map((c) => (
            <PartyCard
              key={c.id}
              party={c}
              icon={<Building2 className="h-4 w-4" />}
              compact={compact}
              docs={docsByPartyId?.[c.id]}
              docsByPartyId={docsByPartyId}
            />
          ))}
        </Section>
      )}

      {reps.length > 0 && (
        <Section title="Representantes Legais" icon={<UserCheck className="h-4 w-4" />}>
          {reps.map((r) => (
            <PartyCard
              key={r.id}
              party={r}
              icon={<UserCheck className="h-4 w-4" />}
              compact={compact}
              docs={docsByPartyId?.[r.id]}
              docsByPartyId={docsByPartyId}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

/**
 * Constrói parties "virtuais" (sem id no banco) a partir do form data,
 * para uso na tela de Revisão da proposta pública. A mesma estrutura é
 * exibida pelo `ProposalPartiesView`.
 */
export function buildPartiesFromFormData(
  data: any,
  opts?: { comprometimentoPercent?: number | null; comprometimentoPercentTotal?: number | null },
): ProposalParty[] {
  // Aceita BR ("1.800,00") e JS-numérico ("1800.00").
  const parseNum = (s: any): number | null => {
    if (s == null) return null;
    const str = String(s).trim();
    if (!str) return null;
    const cleaned = str.replace(/[^\d,.-]/g, '');
    if (!cleaned) return null;
    const normalized = cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    const n = parseFloat(normalized);
    return isFinite(n) ? n : null;
  };

  const parties: ProposalParty[] = [];
  let pos = 0;
  const newId = (role: string, idx = 0) => `tmp-${role}#${idx}`;

  const isPj = data?.imovel?.tipo_pessoa === 'juridica';

  if (isPj) {
    const e = data.empresa || {};
    const companyId = newId('company', 0);
    parties.push({
      id: companyId,
      proposal_link_id: null,
      card_id: null,
      related_party_id: null,
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
      address:
        [e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep]
          .filter(Boolean)
          .join(', ') || null,
      position: pos++,
      metadata: {},
    });
    (data.representantes || []).forEach((r: any, rIdx: number) => {
      parties.push({
        id: newId('legal_representative', rIdx),
        proposal_link_id: null,
        card_id: null,
        related_party_id: null,
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
        address:
          [r.logradouro, r.numero, r.complemento, r.bairro, r.cidade, r.uf, r.cep]
            .filter(Boolean)
            .join(', ') || null,
        position: pos++,
        metadata: {
          is_socio: !!r.is_socio,
          is_administrador: !!r.is_administrador,
          is_signatario: !!r.is_signatario,
        },
      });
    });
  } else {
    const dp = data?.dados_pessoais || {};
    const pf = data?.perfil_financeiro || {};
    const primaryId = newId('primary_tenant', 0);
    parties.push({
      id: primaryId,
      proposal_link_id: null,
      card_id: null,
      related_party_id: null,
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
        fonte_renda: pf.fonte_renda || null,
        regime_bens: pf.regime_bens || null,
        comprometimento_percent:
          opts?.comprometimentoPercent != null && isFinite(opts.comprometimentoPercent)
            ? opts.comprometimentoPercent
            : null,
        comprometimento_percent_total:
          opts?.comprometimentoPercentTotal != null && isFinite(opts.comprometimentoPercentTotal)
            ? opts.comprometimentoPercentTotal
            : null,
      },
    });
    const cj = data?.conjuge;
    if (cj && (cj.nome || cj.cpf || cj.email)) {
      parties.push({
        id: newId('tenant_spouse', 0),
        proposal_link_id: null,
        card_id: null,
        related_party_id: primaryId,
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
        metadata: {},
      });
    }
    (data?.locatarios_adicionais || []).forEach((loc: any, lIdx: number) => {
      const addId = newId('additional_tenant', lIdx);
      parties.push({
        id: addId,
        proposal_link_id: null,
        card_id: null,
        related_party_id: null,
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
        metadata: { fonte_renda: loc.fonte_renda || null },
      });
      const lc = loc.conjuge;
      if (lc && (lc.nome || lc.cpf || lc.email)) {
        parties.push({
          id: newId('tenant_spouse_of_additional', lIdx),
          proposal_link_id: null,
          card_id: null,
          related_party_id: addId,
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
          metadata: {},
        });
      }
    });
  }

  (data?.garantia?.fiadores || []).forEach((f: any, gIdx: number) => {
    const gId = newId('guarantor', gIdx);
    parties.push({
      id: gId,
      proposal_link_id: null,
      card_id: null,
      related_party_id: null,
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
      address:
        [f.logradouro, f.numero, f.complemento, f.bairro, f.cidade, f.uf, f.cep]
          .filter(Boolean)
          .join(', ') || null,
      position: pos++,
      metadata: { tipo_fiador: f.tipo_fiador || null },
    });
    const fc = f.conjuge;
    if (fc && (fc.nome || fc.cpf || fc.email)) {
      parties.push({
        id: newId('guarantor_spouse', gIdx),
        proposal_link_id: null,
        card_id: null,
        related_party_id: gId,
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
        metadata: {},
      });
    }
  });

  return parties;
}

/**
 * Mesmo formato de id usado por buildPartiesFromFormData:
 * `tmp-{role}#{idx}` — permite associar documentos do form às parties virtuais.
 */
function partyTmpId(role: string, idx = 0) {
  return `tmp-${role}#${idx}`;
}

const SPOUSE_DOC_KEYS = new Set(['documento_conjuge', 'renda_conjuge']);

/** Helpers de visibilidade: replicam a mesma lógica do PropostaPublica para
 * decidir quais blocos de documentos estão *visíveis* para o usuário.
 * Mantém a contagem de "obrigatórios" alinhada com o que ele realmente vê. */
function isCasadoOuUniaoLocal(estadoCivil?: string | null): boolean {
  return estadoCivil === 'Casado(a)' || estadoCivil === 'União Estável';
}
function primaryNeedsConjuge(data: any): boolean {
  if (data?.imovel?.tipo_pessoa === 'juridica') return false;
  const ec = data?.perfil_financeiro?.estado_civil;
  if (!isCasadoOuUniaoLocal(ec)) return false;
  const regime = data?.perfil_financeiro?.regime_bens;
  if (!regime) return false;
  if (regime === 'Separação total / absoluta de bens') {
    return data?.perfil_financeiro?.conjuge_participa === 'sim';
  }
  return true;
}
function locatarioNeedsConjugeLocal(loc: any): boolean {
  return isCasadoOuUniaoLocal(loc?.estado_civil);
}
function isFiadorRendaTipo(f: any): boolean {
  return (f?.tipo_fiador || '').toString().toLowerCase() === 'renda' || f?.tipo_fiador === 'imovel';
}
function fiadorNeedsConjugeLocal(f: any): boolean {
  if (!isCasadoOuUniaoLocal(f?.estado_civil)) return false;
  if (!f?.regime_bens) return false;
  if (f.regime_bens === 'Separação total / absoluta de bens') return f?.conjuge_participa === 'sim';
  return true;
}

/**
 * Constrói o mapa { partyId → documentos[] } a partir do estado do formulário,
 * para uso em ProposalPartiesView na tela de Revisão.
 * Filtra blocos *não visíveis no fluxo atual* (cônjuge sem necessidade,
 * fiador sem garantia=Fiador, etc.) para que a contagem de obrigatórios
 * fique alinhada com o que o usuário realmente vê.
 */
export function buildDocsByPartyFromFormData(data: any): Record<string, PartyDocSummary[]> {
  const map: Record<string, PartyDocSummary[]> = {};

  const isOptional = (cat: any): boolean => {
    if (cat?.optional === true) return true;
    const label = String(cat?.label || '').toLowerCase();
    if (label.includes('(opcional)') || label.includes('opcional')) return true;
    if (cat?.key === 'renda_conjuge') return true;
    return false;
  };

  const toSummary = (cat: any): PartyDocSummary => ({
    key: String(cat?.key || cat?.label || Math.random()),
    label: String(cat?.label || cat?.key || 'Documento'),
    optional: isOptional(cat),
    fileCount: Array.isArray(cat?.files) ? cat.files.length : 0,
    fileNames: Array.isArray(cat?.files) ? cat.files.map((f: any) => f?.name).filter(Boolean) : [],
  });

  const isPj = data?.imovel?.tipo_pessoa === 'juridica';

  if (isPj) {
    const docs = (data?.documentos || []).map(toSummary);
    if (docs.length > 0) map[partyTmpId('company', 0)] = docs;
  } else {
    // Locatário principal
    const docs = (data?.documentos || []).map(toSummary);
    if (docs.length > 0) map[partyTmpId('primary_tenant', 0)] = docs;
    // Cônjuge do principal — só inclui se o cônjuge é visível no fluxo
    if (primaryNeedsConjuge(data)) {
      const cjDocs = (data?.conjuge?.documentos || []).map(toSummary);
      if (cjDocs.length > 0) map[partyTmpId('tenant_spouse', 0)] = cjDocs;
    }
    // Locatários adicionais + cônjuges
    (data?.locatarios_adicionais || []).forEach((loc: any, idx: number) => {
      const ld = (loc?.documentos || []).map(toSummary);
      if (ld.length > 0) map[partyTmpId('additional_tenant', idx)] = ld;
      if (locatarioNeedsConjugeLocal(loc)) {
        const lcd = (loc?.conjuge?.documentos || []).map(toSummary);
        if (lcd.length > 0) map[partyTmpId('tenant_spouse_of_additional', idx)] = lcd;
      }
    });
  }

  // Fiadores: somente quando garantia for "Fiador" (caso contrário, blocos
  // de fiador estão ocultos no fluxo). Cônjuge do fiador só conta quando
  // realmente exigido pelo regime de bens.
  const garantiaIsFiador = (data?.garantia?.tipo_garantia || '') === 'Fiador';
  (garantiaIsFiador ? (data?.garantia?.fiadores || []) : []).forEach((f: any, idx: number) => {
    const includeSpouse = fiadorNeedsConjugeLocal(f);
    const own: PartyDocSummary[] = [];
    const spouse: PartyDocSummary[] = [];
    (f?.documentos || []).forEach((cat: any) => {
      if (cat?.key && SPOUSE_DOC_KEYS.has(cat.key)) {
        if (includeSpouse) spouse.push(toSummary(cat));
      } else {
        own.push(toSummary(cat));
      }
    });
    if (own.length > 0) map[partyTmpId('guarantor', idx)] = own;
    if (spouse.length > 0) map[partyTmpId('guarantor_spouse', idx)] = spouse;
  });

  return map;
}

/** Soma o total de arquivos enviados em todo o formulário. */
export function countAllUploadedFiles(data: any): number {
  let total = 0;
  const sumCats = (cats: any[] | undefined) =>
    (cats || []).reduce((acc, c) => acc + (Array.isArray(c?.files) ? c.files.length : 0), 0);
  total += sumCats(data?.documentos);
  total += sumCats(data?.conjuge?.documentos);
  (data?.locatarios_adicionais || []).forEach((loc: any) => {
    total += sumCats(loc?.documentos);
    total += sumCats(loc?.conjuge?.documentos);
  });
  (data?.garantia?.fiadores || []).forEach((f: any) => {
    total += sumCats(f?.documentos);
  });
  return total;
}

/** Resolve o nome legível de uma "parte" a partir do tmp-id e do form data. */
function resolvePartyName(partyId: string, data: any): string {
  // Formato: tmp-{role}#{idx}
  const match = /^tmp-([a-z_]+)#(\d+)$/.exec(partyId);
  if (!match) return 'Envolvido';
  const role = match[1];
  const idx = parseInt(match[2], 10) || 0;
  switch (role) {
    case 'primary_tenant':
      return data?.dados_pessoais?.nome?.trim() || 'Locatário principal';
    case 'tenant_spouse':
      return data?.conjuge?.nome?.trim() || 'Cônjuge do locatário principal';
    case 'additional_tenant':
      return data?.locatarios_adicionais?.[idx]?.nome?.trim() || `Locatário adicional ${idx + 1}`;
    case 'tenant_spouse_of_additional':
      return (
        data?.locatarios_adicionais?.[idx]?.conjuge?.nome?.trim() ||
        `Cônjuge do locatário adicional ${idx + 1}`
      );
    case 'guarantor':
      return data?.garantia?.fiadores?.[idx]?.nome?.trim() || `Fiador ${idx + 1}`;
    case 'guarantor_spouse':
      return (
        data?.garantia?.fiadores?.[idx]?.conjuge?.nome?.trim() || `Cônjuge do fiador ${idx + 1}`
      );
    case 'company':
      return (
        data?.empresa?.razao_social?.trim() ||
        data?.empresa?.nome_fantasia?.trim() ||
        'Empresa'
      );
    default:
      return 'Envolvido';
  }
}

export interface PendingDocItem {
  partyId: string;
  partyName: string;
  docKey: string;
  docLabel: string;
}

/** Conta documentos obrigatórios pendentes (sem arquivo) em todas as partes
 *  visíveis. Retorna também a lista de itens faltantes (com pessoa). */
export function countPendingRequired(data: any): {
  required: number;
  ok: number;
  missing: PendingDocItem[];
  found: PendingDocItem[];
} {
  const map = buildDocsByPartyFromFormData(data);
  let required = 0;
  let ok = 0;
  const missing: PendingDocItem[] = [];
  const found: PendingDocItem[] = [];
  Object.entries(map).forEach(([partyId, docs]) => {
    const partyName = resolvePartyName(partyId, data);
    docs.forEach((d) => {
      if (d.optional) return;
      required += 1;
      const item: PendingDocItem = { partyId, partyName, docKey: d.key, docLabel: d.label };
      if (d.fileCount > 0) {
        ok += 1;
        found.push(item);
      } else {
        missing.push(item);
      }
    });
  });
  if (typeof window !== 'undefined' && (window as any).__DEBUG_PROPOSAL_DOCS__) {
    // eslint-disable-next-line no-console
    console.log('[Proposta] documentos obrigatórios', { required, ok, missing, found });
  }
  return { required, ok, missing, found };
}