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
        <Row label="Profissão" value={party.profession} />
        <Row label={party.role === 'company' ? 'Faturamento mensal' : 'Renda'} value={formatCurrency(party.income)} />
        <Row label="Endereço" value={party.address} />
        {party.role === 'guarantor' && (
          <Row
            label="Tipo de fiador"
            value={
              party.metadata?.tipo_fiador === 'renda'
                ? 'Renda'
                : party.metadata?.tipo_fiador === 'imovel'
                ? 'Imóvel'
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
export function buildPartiesFromFormData(data: any): ProposalParty[] {
  const parseNum = (s: any): number | null => {
    if (s == null) return null;
    const cleaned = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  };

  const parties: ProposalParty[] = [];
  let pos = 0;
  const newId = () => `tmp-${pos}-${Math.random().toString(36).slice(2, 8)}`;

  const isPj = data?.imovel?.tipo_pessoa === 'juridica';

  if (isPj) {
    const e = data.empresa || {};
    const companyId = newId();
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
    (data.representantes || []).forEach((r: any) => {
      parties.push({
        id: newId(),
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
    const primaryId = newId();
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
      metadata: {},
    });
    const cj = data?.conjuge;
    if (cj && (cj.nome || cj.cpf || cj.email)) {
      parties.push({
        id: newId(),
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
    (data?.locatarios_adicionais || []).forEach((loc: any) => {
      const addId = newId();
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
        metadata: {},
      });
      const lc = loc.conjuge;
      if (lc && (lc.nome || lc.cpf || lc.email)) {
        parties.push({
          id: newId(),
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

  (data?.garantia?.fiadores || []).forEach((f: any) => {
    const gId = newId();
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
        id: newId(),
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