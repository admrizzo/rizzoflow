import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MessageSquare,
  Paperclip,
  User as UserIcon,
  CalendarDays,
  ChevronRight,
  X,
  History,
  Send,
  Upload,
  AlertCircle,
  Search,
  Bell,
  RefreshCw,
  Inbox,
  BarChart3,
  Settings2,
  Plus,
  Copy,
  Link as LinkIcon,
  Filter,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

/**
 * /design-preview — Página isolada apenas para comparação visual.
 * NÃO usa hooks reais nem altera componentes do sistema. Tudo é mock local.
 */

const PALETTE = {
  primary: "#344650",
  primarySoft: "#3e525e",
  accent: "#e50046",
  success: "#61ac81",
  warning: "#f0ae00",
  info: "#658bc8",
  bg: "#f7f9fb",
  card: "#ffffff",
  border: "#e5e9ee",
  text: "#1f2a30",
  muted: "#6b7780",
};

// ---------- Mock data ----------
type CardState = "doc_recebido" | "correcao" | "complementacao" | "vencido" | "sem_responsavel";

type MockCard = {
  id: string;
  title: string;
  address: string;
  proponent: string;
  responsible?: string;
  state: CardState;
  due: string;
  value: string;
  comments: number;
  docs: number;
};

const COLUMNS: { id: string; title: string; cards: MockCard[] }[] = [
  {
    id: "captacao",
    title: "Captação",
    cards: [
      { id: "1", title: "Apto 802 — Ed. Vista Mar", address: "Av. Beira Mar, 1200 — Praia do Canto", proponent: "Mariana Albuquerque", responsible: "Carla R.", state: "doc_recebido", due: "Hoje", value: "R$ 3.200/mês", comments: 4, docs: 7 },
      { id: "2", title: "Casa 2 quartos — Jardim Camburi", address: "Rua das Acácias, 88", proponent: "Rodrigo Tavares", state: "sem_responsavel", due: "Em 2 dias", value: "R$ 2.450/mês", comments: 1, docs: 2 },
    ],
  },
  {
    id: "analise",
    title: "Análise",
    cards: [
      { id: "3", title: "Cobertura — Ed. Solar de Itaparica", address: "R. Henrique Moscoso, 450", proponent: "Família Bittencourt", responsible: "Diego M.", state: "correcao", due: "Amanhã", value: "R$ 6.800/mês", comments: 9, docs: 12 },
      { id: "4", title: "Sala comercial 304", address: "Av. NS Navegantes, 955", proponent: "Mendes & Cia ME", responsible: "Patrícia L.", state: "complementacao", due: "3 dias", value: "R$ 4.100/mês", comments: 6, docs: 9 },
    ],
  },
  {
    id: "aprovacao",
    title: "Aprovação",
    cards: [
      { id: "5", title: "Apto 1101 — Ed. Praia Bela", address: "R. Joaquim Lírio, 220", proponent: "Lucas Ferreira", responsible: "Carla R.", state: "vencido", due: "Atrasado 2d", value: "R$ 5.300/mês", comments: 12, docs: 11 },
    ],
  },
  {
    id: "contrato",
    title: "Contrato",
    cards: [
      { id: "6", title: "Studio 506 — Ed. Enseada", address: "Av. Saturnino, 90", proponent: "Beatriz Nunes", responsible: "Patrícia L.", state: "doc_recebido", due: "5 dias", value: "R$ 1.850/mês", comments: 3, docs: 14 },
    ],
  },
];

const STATE_META: Record<CardState, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  doc_recebido: { label: "Doc. recebidos", color: PALETTE.success, bg: "#eaf5ee", icon: CheckCircle2 },
  correcao: { label: "Correção solicitada", color: PALETTE.warning, bg: "#fdf3d8", icon: AlertTriangle },
  complementacao: { label: "Complementação recebida", color: PALETTE.info, bg: "#e6edf7", icon: Upload },
  vencido: { label: "Prazo vencido", color: PALETTE.accent, bg: "#fde6ec", icon: AlertCircle },
  sem_responsavel: { label: "Sem responsável", color: PALETTE.muted, bg: "#eef1f4", icon: UserIcon },
};

// ---------- Variations ----------
type Variation = "v1" | "v2" | "v3";

type VStyle = {
  name: string;
  tagline: string;
  // Header
  headerBg: string;
  headerText: string;
  headerMuted: string;
  headerInputBg: string;
  headerInputText: string;
  headerHover: string;
  // Board
  boardBg: string;
  columnBg: string;
  columnHeader: string;
  columnBorder: string;
  cardShadow: string;
  cardRadius: string;
  cardPad: string;
  cardGap: string;
  titleSize: string;
  metaSize: string;
  accentBar: string;
  badgeStyle: "soft" | "outline" | "dot";
  density: "comfortable" | "balanced" | "compact";
  // Flow chips
  chipActiveBg: string;
  chipActiveText: string;
  chipBg: string;
  chipText: string;
};

const VARIATIONS: Record<Variation, VStyle> = {
  v1: {
    name: "Operacional neutra",
    tagline: "Off-white, header claro, foco em conforto visual.",
    headerBg: "#ffffff",
    headerText: PALETTE.text,
    headerMuted: PALETTE.muted,
    headerInputBg: "#f1f3f6",
    headerInputText: PALETTE.text,
    headerHover: "#eef1f4",
    boardBg: "#f7f9fb",
    columnBg: "#eef1f4",
    columnHeader: PALETTE.text,
    columnBorder: "transparent",
    cardShadow: "0 1px 2px rgba(20,30,40,0.05)",
    cardRadius: "10px",
    cardPad: "14px",
    cardGap: "10px",
    titleSize: "14px",
    metaSize: "12px",
    accentBar: "transparent",
    badgeStyle: "soft",
    density: "comfortable",
    chipActiveBg: PALETTE.primary,
    chipActiveText: "#fff",
    chipBg: "#fff",
    chipText: PALETTE.text,
  },
  v2: {
    name: "Rizzo discreta",
    tagline: "Header navy fino, marca presente sem dominar a tela.",
    headerBg: PALETTE.primary,
    headerText: "#ffffff",
    headerMuted: "rgba(255,255,255,0.72)",
    headerInputBg: "rgba(255,255,255,0.14)",
    headerInputText: "#ffffff",
    headerHover: "rgba(255,255,255,0.12)",
    boardBg: "#f3f6f9",
    columnBg: "#ffffff",
    columnHeader: PALETTE.primary,
    columnBorder: PALETTE.border,
    cardShadow: "0 1px 3px rgba(52,70,80,0.08)",
    cardRadius: "12px",
    cardPad: "14px",
    cardGap: "12px",
    titleSize: "14px",
    metaSize: "12px",
    accentBar: PALETTE.primary,
    badgeStyle: "outline",
    density: "balanced",
    chipActiveBg: "#ffffff",
    chipActiveText: PALETTE.primary,
    chipBg: "rgba(255,255,255,0.10)",
    chipText: "#ffffff",
  },
  v3: {
    name: "Compacta e densa",
    tagline: "Mais cards por tela, ideal para alto volume operacional.",
    headerBg: "#ffffff",
    headerText: PALETTE.text,
    headerMuted: PALETTE.muted,
    headerInputBg: "#eceff3",
    headerInputText: PALETTE.text,
    headerHover: "#e7eaee",
    boardBg: "#f7f9fb",
    columnBg: "#eceff3",
    columnHeader: PALETTE.text,
    columnBorder: "transparent",
    cardShadow: "0 1px 1px rgba(20,30,40,0.04)",
    cardRadius: "6px",
    cardPad: "8px 10px",
    cardGap: "6px",
    titleSize: "12.5px",
    metaSize: "11px",
    accentBar: "transparent",
    badgeStyle: "dot",
    density: "compact",
    chipActiveBg: PALETTE.primary,
    chipActiveText: "#fff",
    chipBg: "#eef1f4",
    chipText: PALETTE.text,
  },
};

// ---------- Shared bits ----------
function StateBadge({ state, style }: { state: CardState; style: "soft" | "outline" | "dot" }) {
  const meta = STATE_META[state];
  const Icon = meta.icon;
  if (style === "dot") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium" style={{ color: meta.color }}>
        <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: meta.color }} />
        {meta.label}
      </span>
    );
  }
  if (style === "outline") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: meta.color, border: `1px solid ${meta.color}40`, background: "#fff" }}>
        <Icon size={11} />
        {meta.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ color: meta.color, background: meta.bg }}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

// ---------- HEADER ----------
function MockHeader({ v }: { v: VStyle }) {
  const isDark = v.headerBg === PALETTE.primary;
  return (
    <div className="flex items-center justify-between px-4 h-12" style={{ background: v.headerBg, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : PALETTE.border}` }}>
      {/* Logo + flow */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[13px]" style={{ background: isDark ? "rgba(255,255,255,0.12)" : PALETTE.primary }}>R</div>
          <span className="font-bold text-[14px]" style={{ color: v.headerText }}>Rizzo Flow</span>
        </div>
        <div className="w-px h-5" style={{ background: isDark ? "rgba(255,255,255,0.18)" : PALETTE.border }} />
        <span className="font-semibold text-[13px] truncate" style={{ color: v.headerText }}>Locação</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: v.headerMuted }} />
          <input
            placeholder="Buscar processo, imóvel, proponente…"
            className="w-full h-8 pl-8 pr-3 rounded-md text-[12.5px] outline-none border-0"
            style={{ background: v.headerInputBg, color: v.headerInputText }}
          />
        </div>
        <button title="Filtros" className="h-8 w-8 rounded-md inline-flex items-center justify-center" style={{ color: v.headerText }}>
          <Filter size={15} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <HeaderBtn v={v} icon={<Inbox size={14} />} label="Minha Fila" />
        <HeaderBtn v={v} icon={<RefreshCw size={14} />} label="Sincronizar" />
        <HeaderBtn v={v} icon={<BarChart3 size={14} />} label="Propostas" />
        <HeaderBtn v={v} icon={<Settings2 size={15} />} iconOnly />
        <HeaderBtn v={v} icon={<Bell size={15} />} iconOnly badge={3} />
        <div className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: PALETTE.accent }}>JR</div>
      </div>
    </div>
  );
}

function HeaderBtn({ v, icon, label, iconOnly, badge }: { v: VStyle; icon: React.ReactNode; label?: string; iconOnly?: boolean; badge?: number }) {
  return (
    <button
      className="relative h-8 inline-flex items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors"
      style={{ color: v.headerText }}
      onMouseEnter={(e) => (e.currentTarget.style.background = v.headerHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {!iconOnly && label && <span className="hidden md:inline">{label}</span>}
      {badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9.5px] font-bold text-white inline-flex items-center justify-center" style={{ background: PALETTE.accent }}>{badge}</span>
      )}
    </button>
  );
}

// ---------- FLOW NAV ----------
function FlowNav({ v, activeFlow, onChangeFlow, screen, onScreen }: {
  v: VStyle;
  activeFlow: "locacao" | "vendas";
  onChangeFlow: (f: "locacao" | "vendas") => void;
  screen: ScreenKey;
  onScreen: (s: ScreenKey) => void;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap" style={{ background: v.boardBg, borderBottom: `1px solid ${PALETTE.border}` }}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <NavChip v={v} active={screen === "dashboard"} onClick={() => onScreen("dashboard")} icon={<ChevronDown size={12} />}>Meus Fluxos</NavChip>
        <NavChip v={v} active={screen === "metricas"} onClick={() => onScreen("metricas")} icon={<BarChart3 size={12} />}>Métricas</NavChip>
        <NavChip v={v} active={screen === "fila"} onClick={() => onScreen("fila")} icon={<Inbox size={12} />}>Minha Fila</NavChip>
        <NavChip v={v} active={screen === "propostas"} onClick={() => onScreen("propostas")} icon={<BarChart3 size={12} />}>Propostas</NavChip>

        {screen === "dashboard" && (
          <>
            <div className="w-px h-5 mx-1" style={{ background: PALETTE.border }} />
            <FlowChip v={v} active={activeFlow === "locacao"} onClick={() => onChangeFlow("locacao")} count={14}>Locação</FlowChip>
            <FlowChip v={v} active={activeFlow === "vendas"} onClick={() => onChangeFlow("vendas")} count={6}>Vendas</FlowChip>
          </>
        )}
      </div>

      {screen === "dashboard" && (
        <div className="flex items-center gap-2">
          <button className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[12px] font-semibold" style={{ background: "#fff", color: PALETTE.primary, border: `1px solid ${PALETTE.border}` }}>
            <Filter size={13} /> Filtros
          </button>
          <button className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[12px] font-bold text-white shadow-sm transition-transform" style={{ background: PALETTE.accent }}>
            <Plus size={14} /> Gerar nova proposta
          </button>
        </div>
      )}
    </div>
  );
}

function NavChip({ v, active, onClick, icon, children }: { v: VStyle; active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[12px] font-semibold transition-colors"
      style={{
        background: active ? PALETTE.primary : "#fff",
        color: active ? "#fff" : PALETTE.text,
        border: `1px solid ${active ? PALETTE.primary : PALETTE.border}`,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function FlowChip({ v, active, onClick, count, children }: { v: VStyle; active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-8 inline-flex items-center gap-2 px-3 rounded-full text-[12px] font-semibold transition-all"
      style={{
        background: active ? PALETTE.accent : "#fff",
        color: active ? "#fff" : PALETTE.text,
        border: `1px solid ${active ? PALETTE.accent : PALETTE.border}`,
      }}
    >
      {children}
      <span className="text-[10.5px] rounded-full px-1.5 py-0.5 font-bold" style={{ background: active ? "rgba(255,255,255,0.22)" : "#eef1f4", color: active ? "#fff" : PALETTE.muted }}>{count}</span>
    </button>
  );
}

// ---------- BOARD / CARDS ----------
function MockCardItem({ card, v, onClick }: { card: MockCard; v: VStyle; onClick: () => void }) {
  const compact = v.density === "compact";
  return (
    <button
      onClick={onClick}
      className="text-left w-full block transition-transform"
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.border}`,
        borderLeft: v.accentBar !== "transparent" ? `3px solid ${v.accentBar}` : `1px solid ${PALETTE.border}`,
        borderRadius: v.cardRadius,
        padding: v.cardPad,
        boxShadow: v.cardShadow,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate" style={{ color: PALETTE.text, fontSize: v.titleSize, lineHeight: 1.25 }}>{card.title}</div>
          {!compact && <div className="truncate mt-0.5" style={{ color: PALETTE.muted, fontSize: v.metaSize }}>{card.address}</div>}
        </div>
        <span className="shrink-0 font-semibold" style={{ color: PALETTE.primary, fontSize: v.metaSize }}>{card.value}</span>
      </div>
      <div className={compact ? "mt-1.5" : "mt-2.5"}>
        <StateBadge state={card.state} style={v.badgeStyle} />
      </div>
      <div className={`flex items-center justify-between ${compact ? "mt-1.5" : "mt-3"}`} style={{ fontSize: v.metaSize, color: PALETTE.muted }}>
        <span className="inline-flex items-center gap-1 truncate">
          <UserIcon size={12} />
          <span className="truncate">{card.responsible ?? "—"}</span>
        </span>
        <span className="inline-flex items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{card.due}</span>
          {!compact && (<>
            <span className="inline-flex items-center gap-1"><MessageSquare size={12} />{card.comments}</span>
            <span className="inline-flex items-center gap-1"><Paperclip size={12} />{card.docs}</span>
          </>)}
        </span>
      </div>
    </button>
  );
}

function MockBoard({ v, onOpenCard }: { v: VStyle; onOpenCard: (c: MockCard) => void }) {
  return (
    <div className="px-4 py-4" style={{ background: v.boardBg }}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0,1fr))` }}>
        {COLUMNS.map((col) => (
          <div key={col.id} className="rounded-lg p-2.5" style={{ background: v.columnBg, border: v.columnBorder !== "transparent" ? `1px solid ${v.columnBorder}` : "none" }}>
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="font-semibold uppercase tracking-wide" style={{ fontSize: 11, color: v.columnHeader }}>{col.title}</div>
              <span className="text-[10.5px] rounded-full px-1.5 py-0.5" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted }}>{col.cards.length}</span>
            </div>
            <div className="flex flex-col" style={{ gap: v.cardGap }}>
              {col.cards.map((c) => (<MockCardItem key={c.id} card={c} v={v} onClick={() => onOpenCard(c)} />))}
              {col.cards.length === 0 && (
                <div className="text-center text-[11px] py-6 rounded-md" style={{ color: PALETTE.muted, border: `1px dashed ${PALETTE.border}` }}>Vazio</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- CARD DETAIL ----------
function MockCardDetail({ card, v, onClose }: { card: MockCard; v: VStyle; onClose: () => void }) {
  const meta = STATE_META[card.state];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,30,40,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${PALETTE.border}`, background: "#fff" }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StateBadge state={card.state} style={v.badgeStyle} />
              <span className="text-[11px]" style={{ color: PALETTE.muted }}>Locação · Análise</span>
            </div>
            <h3 className="text-lg font-bold truncate" style={{ color: PALETTE.text }}>{card.title}</h3>
            <div className="text-sm mt-0.5" style={{ color: PALETTE.muted }}>
              {card.address} · Proponente: <span style={{ color: PALETTE.text }}>{card.proponent}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold" style={{ color: PALETTE.primary }}>{card.value}</span>
            <button onClick={onClose} className="p-1.5 rounded-md" style={{ background: "#f1f3f6", color: PALETTE.muted }}><X size={16} /></button>
          </div>
        </div>

        <Section title="Andamento" v={v}>
          <div className="flex items-center gap-2 flex-wrap">
            {["Captação", "Análise", "Aprovação", "Contrato"].map((s, i) => {
              const active = i === 1; const done = i < 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: active ? PALETTE.primary : done ? PALETTE.success : "#eef1f4", color: active || done ? "#fff" : PALETTE.muted }}>{s}</div>
                  {i < 3 && <ChevronRight size={12} style={{ color: PALETTE.muted }} />}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[12px] flex items-center gap-2" style={{ color: meta.color }}>
            <Clock size={13} /> Prazo desta etapa: <strong>{card.due}</strong>
          </div>
        </Section>

        <Section title="Dados do imóvel" v={v}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[12.5px]">
            {[
              ["Endereço", card.address],
              ["Tipo", "Apartamento"],
              ["Quartos", "3"],
              ["Vagas", "2"],
              ["Valor aluguel", card.value],
              ["Garantia", "Fiança bancária"],
            ].map(([k, val]) => (
              <div key={k}>
                <div className="text-[10.5px] uppercase tracking-wide" style={{ color: PALETTE.muted }}>{k}</div>
                <div className="font-medium" style={{ color: PALETTE.text }}>{val}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Documentos" v={v}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { n: "RG_proponente.pdf", st: "Recebido", color: PALETTE.success },
              { n: "Comprovante_renda.pdf", st: "Recebido", color: PALETTE.success },
              { n: "Comprovante_residência.pdf", st: "Complementação", color: PALETTE.info },
              { n: "Cartão_CNPJ.pdf", st: "Correção solicitada", color: PALETTE.warning },
            ].map((d) => (
              <div key={d.n} className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ border: `1px solid ${PALETTE.border}`, background: "#fff" }}>
                <FileText size={14} style={{ color: PALETTE.muted }} />
                <span className="text-[12.5px] truncate flex-1" style={{ color: PALETTE.text }}>{d.n}</span>
                <span className="text-[10.5px] font-medium" style={{ color: d.color }}>{d.st}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Correção da proposta" v={v}>
          <div className="p-3 rounded-md text-[12.5px]" style={{ background: "#fdf3d8", border: `1px solid ${PALETTE.warning}55`, color: "#7a5a00" }}>
            <div className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={13} /> Correção solicitada — 2 itens</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Comprovante de renda do fiador desatualizado.</li>
              <li>Cartão CNPJ vencido — enviar atualização.</li>
            </ul>
          </div>
        </Section>

        <Section title="Próxima ação" v={v}>
          <div className="flex items-center justify-between p-3 rounded-md" style={{ background: "#eef5fb", border: `1px solid ${PALETTE.info}55` }}>
            <div className="text-[13px]" style={{ color: PALETTE.text }}>
              <strong>Aguardando reenvio</strong> do CNPJ corrigido pelo proponente.
            </div>
            <button className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-white" style={{ background: PALETTE.primary }}>Cobrar agora</button>
          </div>
        </Section>

        <Section title="Comentários e atividade" v={v} last>
          <div className="space-y-2.5">
            {[
              { who: "Carla R.", when: "10:42", txt: "Cliente confirmou envio até amanhã.", attach: "boleto_fianca.pdf" },
              { who: "Diego M.", when: "ontem", txt: "Solicitada correção do comprovante de renda." },
              { who: "Sistema", when: "ontem", txt: "Documento 'Comprovante_residência.pdf' recebido.", system: true },
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: c.system ? "#eef1f4" : PALETTE.primary, color: c.system ? PALETTE.muted : "#fff" }}>
                  {c.system ? <History size={13} /> : c.who.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px]" style={{ color: PALETTE.muted }}>
                    <strong style={{ color: PALETTE.text }}>{c.who}</strong> · {c.when}
                  </div>
                  <div className="text-[13px]" style={{ color: PALETTE.text }}>{c.txt}</div>
                  {c.attach && (
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11.5px]" style={{ background: "#f1f3f6", color: PALETTE.text }}>
                      <Paperclip size={11} /> {c.attach}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 p-2 rounded-md" style={{ border: `1px solid ${PALETTE.border}`, background: "#fff" }}>
            <button className="p-1.5 rounded" style={{ color: PALETTE.muted }}><Paperclip size={14} /></button>
            <input placeholder="Escreva um comentário…" className="flex-1 outline-none text-[13px] bg-transparent" style={{ color: PALETTE.text }} />
            <button className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-white inline-flex items-center gap-1" style={{ background: PALETTE.accent }}>
              <Send size={12} /> Enviar
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, v, children, last }: { title: string; v: VStyle; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: last ? "none" : `1px solid ${PALETTE.border}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: v.columnHeader }}>{title}</div>
      {children}
    </div>
  );
}

// ---------- NOVA PROPOSTA MODAL ----------
function NewProposalModal({ v, onClose }: { v: VStyle; onClose: () => void }) {
  const [step, setStep] = useState<"select" | "broker" | "link">("select");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,30,40,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${PALETTE.border}` }}>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PALETTE.accent }}>Nova proposta</div>
            <h3 className="text-lg font-bold" style={{ color: PALETTE.text }}>Gerar link de proposta</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md" style={{ background: "#f1f3f6", color: PALETTE.muted }}><X size={16} /></button>
        </div>

        {/* Steps indicator */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${PALETTE.border}`, background: "#fafbfc" }}>
          {[
            { k: "select", l: "1. Imóvel" },
            { k: "broker", l: "2. Responsável" },
            { k: "link", l: "3. Link gerado" },
          ].map((s, i) => {
            const active = s.k === step;
            return (
              <div key={s.k} className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: active ? PALETTE.primary : "#eef1f4", color: active ? "#fff" : PALETTE.muted }}>{s.l}</div>
                {i < 2 && <ChevronRight size={12} style={{ color: PALETTE.muted }} />}
              </div>
            );
          })}
        </div>

        {step === "select" && (
          <div className="p-5 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: PALETTE.muted }} />
              <input placeholder="Buscar por código, endereço ou bairro…" className="w-full h-10 pl-9 pr-3 rounded-md text-[13px] outline-none" style={{ background: "#f1f3f6", color: PALETTE.text }} />
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {[
                { code: "LC-2401", t: "Apto 802 — Ed. Vista Mar", a: "Av. Beira Mar, 1200 — Praia do Canto", v: "R$ 3.200/mês" },
                { code: "LC-2389", t: "Casa 3 quartos — Mata da Praia", a: "R. das Palmeiras, 145", v: "R$ 4.500/mês" },
                { code: "LC-2376", t: "Sala comercial 304 — Ed. Trade", a: "Av. NS Navegantes, 955", v: "R$ 4.100/mês" },
                { code: "LC-2364", t: "Studio 506 — Ed. Enseada", a: "Av. Saturnino, 90", v: "R$ 1.850/mês" },
              ].map((p) => {
                const active = selected === p.code;
                return (
                  <button key={p.code} onClick={() => setSelected(p.code)} className="w-full text-left p-3 rounded-md flex items-center justify-between gap-3 transition-colors" style={{ background: active ? "#fde6ec" : "#fff", border: `1px solid ${active ? PALETTE.accent : PALETTE.border}` }}>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold" style={{ color: PALETTE.muted }}>{p.code}</div>
                      <div className="font-semibold text-[13.5px] truncate" style={{ color: PALETTE.text }}>{p.t}</div>
                      <div className="text-[12px] truncate" style={{ color: PALETTE.muted }}>{p.a}</div>
                    </div>
                    <span className="text-[12.5px] font-bold shrink-0" style={{ color: PALETTE.primary }}>{p.v}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-3 py-2 rounded-md text-[12.5px] font-semibold" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}>Cancelar</button>
              <button disabled={!selected} onClick={() => setStep("broker")} className="px-3 py-2 rounded-md text-[12.5px] font-semibold text-white" style={{ background: selected ? PALETTE.accent : "#ddd" }}>Continuar</button>
            </div>
          </div>
        )}

        {step === "broker" && (
          <div className="p-5 space-y-3">
            <div className="text-[12px]" style={{ color: PALETTE.muted }}>Escolha o corretor responsável pela proposta:</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { n: "Carla Ribeiro", r: "Locação", a: 8 },
                { n: "Diego Mendes", r: "Locação", a: 5 },
                { n: "Patrícia Lopes", r: "Locação", a: 11 },
                { n: "João Vitor", r: "Locação", a: 3 },
              ].map((b, i) => (
                <button key={b.n} className="p-3 rounded-md text-left flex items-center gap-3" style={{ border: `1px solid ${i === 0 ? PALETTE.accent : PALETTE.border}`, background: i === 0 ? "#fde6ec" : "#fff" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: PALETTE.primary }}>{b.n.split(" ").map(s => s[0]).join("").slice(0, 2)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13px] truncate" style={{ color: PALETTE.text }}>{b.n}</div>
                    <div className="text-[11px]" style={{ color: PALETTE.muted }}>{b.r} · {b.a} ativos</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => setStep("select")} className="px-3 py-2 rounded-md text-[12.5px] font-semibold" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}>Voltar</button>
              <button onClick={() => setStep("link")} className="px-4 py-2 rounded-md text-[12.5px] font-bold text-white inline-flex items-center gap-2" style={{ background: PALETTE.accent }}>
                <LinkIcon size={13} /> Gerar link
              </button>
            </div>
          </div>
        )}

        {step === "link" && (
          <div className="p-5 space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 mx-auto rounded-full inline-flex items-center justify-center mb-2" style={{ background: "#eaf5ee", color: PALETTE.success }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="font-bold text-[15px]" style={{ color: PALETTE.text }}>Link gerado com sucesso</div>
              <div className="text-[12px]" style={{ color: PALETTE.muted }}>Compartilhe com o proponente para iniciar a proposta.</div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-md" style={{ background: "#f1f3f6", border: `1px solid ${PALETTE.border}` }}>
              <LinkIcon size={14} style={{ color: PALETTE.muted }} />
              <code className="text-[12px] flex-1 truncate" style={{ color: PALETTE.text }}>https://rizzoflow.app/p/lc-2401-mariana-3f9k2</code>
              <button className="px-2.5 py-1.5 rounded text-[11.5px] font-semibold inline-flex items-center gap-1" style={{ background: PALETTE.primary, color: "#fff" }}>
                <Copy size={12} /> Copiar
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-2 rounded-md text-[12.5px] font-semibold" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}>Fechar</button>
              <button onClick={onClose} className="px-3 py-2 rounded-md text-[12.5px] font-bold text-white" style={{ background: PALETTE.accent }}>Abrir card criado</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- MÉTRICAS ----------
function MetricsScreen({ v }: { v: VStyle }) {
  const kpis = [
    { l: "Propostas no mês", val: "47", trend: "+12%", up: true, color: PALETTE.primary },
    { l: "Pendências", val: "9", trend: "-3", up: false, color: PALETTE.warning },
    { l: "Atrasados", val: "4", trend: "+1", up: false, color: PALETTE.accent },
    { l: "Docs recebidos", val: "186", trend: "+24", up: true, color: PALETTE.success },
  ];
  const stages = [
    { l: "Captação", n: 14, c: PALETTE.info },
    { l: "Análise", n: 11, c: PALETTE.warning },
    { l: "Aprovação", n: 7, c: PALETTE.primary },
    { l: "Contrato", n: 9, c: PALETTE.success },
    { l: "Concluídos", n: 23, c: PALETTE.muted },
  ];
  const max = Math.max(...stages.map(s => s.n));
  return (
    <div className="p-4 space-y-4" style={{ background: v.boardBg }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.l} className="p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
            <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: PALETTE.muted }}>{k.l}</div>
            <div className="flex items-end justify-between mt-1.5">
              <div className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</div>
              <div className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: k.up ? PALETTE.success : PALETTE.accent }}>
                {k.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {k.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
          <div className="font-bold text-[13.5px] mb-3" style={{ color: PALETTE.text }}>Processos por etapa</div>
          <div className="space-y-2.5">
            {stages.map((s) => (
              <div key={s.l}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span style={{ color: PALETTE.text }}>{s.l}</span>
                  <span className="font-semibold" style={{ color: PALETTE.muted }}>{s.n}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#eef1f4" }}>
                  <div className="h-2 rounded-full" style={{ width: `${(s.n / max) * 100}%`, background: s.c }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
          <div className="font-bold text-[13.5px] mb-3" style={{ color: PALETTE.text }}>SLA da semana</div>
          <div className="text-3xl font-bold" style={{ color: PALETTE.success }}>92%</div>
          <div className="text-[11.5px] mb-3" style={{ color: PALETTE.muted }}>processos no prazo</div>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span style={{ color: PALETTE.muted }}>No prazo</span><span className="font-semibold" style={{ color: PALETTE.success }}>43</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.muted }}>Em risco</span><span className="font-semibold" style={{ color: PALETTE.warning }}>5</span></div>
            <div className="flex justify-between"><span style={{ color: PALETTE.muted }}>Atrasados</span><span className="font-semibold" style={{ color: PALETTE.accent }}>4</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- MINHA FILA ----------
function FilaScreen({ v }: { v: VStyle }) {
  const items = [
    { p: "alta", t: "Apto 1101 — Ed. Praia Bela", who: "Lucas Ferreira", st: "vencido" as CardState, due: "Atrasado 2d", r: "Carla R." },
    { p: "alta", t: "Cobertura — Solar de Itaparica", who: "Família Bittencourt", st: "correcao" as CardState, due: "Amanhã", r: "Diego M." },
    { p: "media", t: "Sala comercial 304", who: "Mendes & Cia ME", st: "complementacao" as CardState, due: "3 dias", r: "Patrícia L." },
    { p: "media", t: "Apto 802 — Vista Mar", who: "Mariana Albuquerque", st: "doc_recebido" as CardState, due: "Hoje", r: "Carla R." },
    { p: "baixa", t: "Studio 506 — Enseada", who: "Beatriz Nunes", st: "doc_recebido" as CardState, due: "5 dias", r: "Patrícia L." },
  ];
  const prioColor = (p: string) => p === "alta" ? PALETTE.accent : p === "media" ? PALETTE.warning : PALETTE.info;
  return (
    <div className="p-4 space-y-3" style={{ background: v.boardBg }}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: PALETTE.muted }} />
          <input placeholder="Buscar na fila…" className="w-full h-9 pl-8 pr-3 rounded-md text-[12.5px] outline-none" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }} />
        </div>
        {["Todos", "Atrasados", "Hoje", "Esta semana"].map((f, i) => (
          <button key={f} className="h-9 px-3 rounded-md text-[12px] font-semibold" style={{ background: i === 0 ? PALETTE.primary : "#fff", color: i === 0 ? "#fff" : PALETTE.text, border: `1px solid ${i === 0 ? PALETTE.primary : PALETTE.border}` }}>{f}</button>
        ))}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}` }}>
            <span className="w-1 h-8 rounded-full shrink-0" style={{ background: prioColor(it.p) }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] truncate" style={{ color: PALETTE.text }}>{it.t}</div>
              <div className="text-[11.5px] truncate" style={{ color: PALETTE.muted }}>Proponente: {it.who}</div>
            </div>
            <div className="hidden sm:block"><StateBadge state={it.st} style={v.badgeStyle} /></div>
            <div className="text-[11.5px] font-semibold inline-flex items-center gap-1 w-24 justify-end" style={{ color: it.due.startsWith("Atrasado") ? PALETTE.accent : PALETTE.text }}>
              <Clock size={12} /> {it.due}
            </div>
            <div className="text-[11.5px] inline-flex items-center gap-1.5 w-28">
              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white" style={{ background: PALETTE.primary }}>{it.r.split(" ").map(x => x[0]).join("")}</span>
              <span className="truncate" style={{ color: PALETTE.muted }}>{it.r}</span>
            </div>
            <button className="p-1.5 rounded" style={{ color: PALETTE.muted }}><MoreHorizontal size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- PROPOSTAS ----------
function PropostasScreen({ v }: { v: VStyle }) {
  const rows = [
    { code: "PR-2401", who: "Mariana Albuquerque", im: "Apto 802 — Vista Mar", st: "Em análise", c: PALETTE.warning },
    { code: "PR-2398", who: "Família Bittencourt", im: "Cobertura — Solar Itaparica", st: "Correção", c: PALETTE.warning },
    { code: "PR-2392", who: "Lucas Ferreira", im: "Apto 1101 — Praia Bela", st: "Vencida", c: PALETTE.accent },
    { code: "PR-2389", who: "Mendes & Cia ME", im: "Sala 304 — Trade", st: "Complementação", c: PALETTE.info },
    { code: "PR-2376", who: "Beatriz Nunes", im: "Studio 506 — Enseada", st: "Aprovada", c: PALETTE.success },
    { code: "PR-2364", who: "Rodrigo Tavares", im: "Casa — Jardim Camburi", st: "Aguardando", c: PALETTE.muted },
  ];
  return (
    <div className="p-4 space-y-3" style={{ background: v.boardBg }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {["Todas", "Em análise", "Correção", "Aprovadas", "Vencidas"].map((f, i) => (
            <button key={f} className="h-8 px-3 rounded-full text-[12px] font-semibold" style={{ background: i === 0 ? PALETTE.primary : "#fff", color: i === 0 ? "#fff" : PALETTE.text, border: `1px solid ${i === 0 ? PALETTE.primary : PALETTE.border}` }}>{f}</button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: PALETTE.muted }} />
          <input placeholder="Buscar proposta…" className="h-8 pl-8 pr-3 rounded-md text-[12.5px] outline-none" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }} />
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
        <div className="grid grid-cols-[100px_1fr_1.2fr_120px_140px_60px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide font-bold" style={{ background: "#fafbfc", color: PALETTE.muted, borderBottom: `1px solid ${PALETTE.border}` }}>
          <div>Código</div><div>Proponente</div><div>Imóvel</div><div>Status</div><div>Link</div><div>Ações</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.code} className="grid grid-cols-[100px_1fr_1.2fr_120px_140px_60px] gap-3 px-4 py-3 items-center text-[12.5px]" style={{ borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, color: PALETTE.text }}>
            <div className="font-mono font-bold text-[11.5px]" style={{ color: PALETTE.muted }}>{r.code}</div>
            <div className="truncate font-medium">{r.who}</div>
            <div className="truncate" style={{ color: PALETTE.muted }}>{r.im}</div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: r.c + "22", color: r.c }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.c }} /> {r.st}
              </span>
            </div>
            <div>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold" style={{ background: "#f1f3f6", color: PALETTE.text }}>
                <LinkIcon size={11} /> Copiar
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded" style={{ color: PALETTE.muted }}><ExternalLink size={13} /></button>
              <button className="p-1 rounded" style={{ color: PALETTE.muted }}><MoreHorizontal size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- VARIATION SHELL ----------
type ScreenKey = "dashboard" | "metricas" | "fila" | "propostas";

function VariationShell({ variation }: { variation: Variation }) {
  const v = VARIATIONS[variation];
  const [openCard, setOpenCard] = useState<MockCard | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [flow, setFlow] = useState<"locacao" | "vendas">("locacao");
  const [screen, setScreen] = useState<ScreenKey>("dashboard");

  return (
    <section className="rounded-xl overflow-hidden shadow-sm" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
      {/* Variation label */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#fafbfc", borderBottom: `1px solid ${PALETTE.border}` }}>
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: PALETTE.accent }}>Variação {variation.toUpperCase().replace("V", "")}</div>
          <div className="font-bold text-[15px]" style={{ color: PALETTE.text }}>{v.name}</div>
          <div className="text-[12px]" style={{ color: PALETTE.muted }}>{v.tagline}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpenNew(true)} className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[12px] font-bold text-white" style={{ background: PALETTE.accent }}>
            <Plus size={13} /> Nova proposta
          </button>
          <button onClick={() => setOpenCard(COLUMNS[1].cards[0])} className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-[12px] font-semibold" style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.primary }}>
            Abrir card
          </button>
        </div>
      </div>

      <MockHeader v={v} />
      <FlowNav v={v} activeFlow={flow} onChangeFlow={setFlow} screen={screen} onScreen={setScreen} />

      {screen === "dashboard" && <MockBoard v={v} onOpenCard={(c) => setOpenCard(c)} />}
      {screen === "metricas" && <MetricsScreen v={v} />}
      {screen === "fila" && <FilaScreen v={v} />}
      {screen === "propostas" && <PropostasScreen v={v} />}

      {openCard && <MockCardDetail card={openCard} v={v} onClose={() => setOpenCard(null)} />}
      {openNew && <NewProposalModal v={v} onClose={() => setOpenNew(false)} />}
    </section>
  );
}

// ---------- ROOT ----------
export default function DesignPreview() {
  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh" }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#fff", borderBottom: `1px solid ${PALETTE.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold" style={{ background: PALETTE.primary }}>R</div>
          <div>
            <div className="font-bold text-[15px]" style={{ color: PALETTE.text }}>Rizzo Flow · Prévia de Design Completa</div>
            <div className="text-[12px]" style={{ color: PALETTE.muted }}>Header, navegação, modais e telas — comparação visual sem afetar o sistema real</div>
          </div>
        </div>
        <Link to="/dashboard" className="px-3 py-1.5 rounded-md text-sm font-semibold" style={{ background: PALETTE.primary, color: "#fff" }}>Voltar ao sistema</Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3" style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}>
          <span className="text-[12px] font-semibold mr-2" style={{ color: PALETTE.muted }}>Estados visuais:</span>
          {(Object.keys(STATE_META) as CardState[]).map((s) => (<StateBadge key={s} state={s} style="soft" />))}
          <span className="text-[11px] ml-auto" style={{ color: PALETTE.muted }}>
            Em cada variação você pode alternar entre <strong>Dashboard</strong>, <strong>Métricas</strong>, <strong>Minha Fila</strong> e <strong>Propostas</strong>, abrir o card e o modal de nova proposta.
          </span>
        </div>

        <div className="space-y-8">
          <VariationShell variation="v1" />
          <VariationShell variation="v2" />
          <VariationShell variation="v3" />
        </div>

        <footer className="text-center text-[12px] py-8" style={{ color: PALETTE.muted }}>
          Após escolher a variação preferida, será aplicada no sistema real em uma segunda etapa.
        </footer>
      </div>
    </div>
  );
}
