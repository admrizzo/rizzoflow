/**
 * /design-preview — Prévia visual do Rizzo Flow.
 * NÃO afeta o sistema real. Apenas demonstração visual.
 *
 * Foco: Variação C (Focus / Semi-dark) refinada para representar
 * fielmente o sistema operacional imobiliário, com:
 *  - todos os botões/menus reais do header
 *  - colunas reais do Fluxo de Locação (banco)
 *  - cards com estados visuais sutis (pendência, em dia, correção, atraso)
 *  - card aberto com todos os blocos reais
 *  - menus de coluna e card, ações de documento e correção
 *  - Minha Fila, Métricas, Central de Propostas, Administração
 *  - aviso explicando que esta prévia não altera regras/etapas
 */

import { useMemo, useState } from "react";
import {
  Search, Bell, RefreshCw, FileText, Plus, Filter, ChevronDown, Clock,
  AlertTriangle, CheckCircle2, CircleDashed, Users, BarChart3, Inbox,
  Building2, User, Copy, Link2, Send, Paperclip, MessageSquare, ChevronRight,
  Smartphone, Settings, Mail, KeyRound, ShieldCheck, TrendingUp, TrendingDown,
  X, MoreHorizontal, MoreVertical, Eye, Download, Upload, Pencil, Trash2,
  Archive, LayoutGrid, ListChecks, KanbanSquare, Key, Tag, FolderOpen,
  CheckSquare, AlertCircle, RotateCcw, ChevronUp, Info, LogOut, Home,
  Pin, PinOff, Smile, Image as ImageIcon, File as FileIcon, CornerUpLeft, ArrowLeft,
} from "lucide-react";

/* =========================================================================
 * Paleta (apenas para esta rota)
 * ========================================================================= */
const P = {
  primary: "#344650",
  primarySoft: "#3f5560",
  primaryDark: "#1f2a30",
  accent: "#e50046",
  success: "#61ac81",
  warning: "#f0ae00",
  info: "#658bc8",
  bg: "#f7f9fb",
  card: "#ffffff",
  border: "#e6ebf0",
  borderSoft: "#eef2f5",
  text: "#1f2a30",
  textMuted: "#6b7a83",
  textSubtle: "#94a3ad",
};

const STATUS = {
  received:   { bg: "#e7f4ec", fg: "#2f7d52", dot: "#61ac81", label: "Documentos recebidos" },
  inday:      { bg: "#eaf5ee", fg: "#2f7d52", dot: "#61ac81", label: "Em dia" },
  filling:    { bg: "#fff5d9", fg: "#8a6a00", dot: "#f0ae00", label: "Em preenchimento" },
  correction: { bg: "#ffe7d6", fg: "#a04a14", dot: "#e08a3a", label: "Correção solicitada" },
  pending:    { bg: "#fde4e7", fg: "#a01633", dot: "#e50046", label: "Pendência" },
  late:       { bg: "#f8c9cf", fg: "#7d0c25", dot: "#c4143a", label: "Atrasado" },
  done:       { bg: "#dff1e6", fg: "#2a6a48", dot: "#61ac81", label: "Concluído" },
  neutral:    { bg: "#eef2f5", fg: "#5b6a73", dot: "#94a3ad", label: "Neutro" },
} as const;
type StatusKey = keyof typeof STATUS;

type VariationId = "A" | "B" | "C";

/* =========================================================================
 * Colunas reais do Fluxo de Locação (espelha o banco)
 * ========================================================================= */
interface KCard {
  id: string; code: string; title: string; address: string;
  broker: string; brokerInitials: string;
  status: StatusKey; statusLabel: string;
  deadline: string; value?: string;
  tags?: { label: string; tone: "info" | "warn" | "ok" | "danger" }[];
  alerts?: number;
  docsOk?: number; docsTotal?: number;
}

const REAL_COLUMNS: { id: string; title: string; cards: KCard[] }[] = [
  { id: "ini", title: "Cadastro iniciado", cards: [
    { id: "k1", code: "LOC-2841", title: "Apto 802 · Ed. Solar Boulevard", address: "R. Voluntários da Pátria, 1820 — Higienópolis", broker: "Marina Castro", brokerInitials: "MC", status: "filling", statusLabel: "Em preenchimento", deadline: "2 dias", value: "R$ 4.200/mês", docsOk: 0, docsTotal: 7 },
    { id: "k2", code: "LOC-2840", title: "Casa térrea · Jd. Botânico", address: "R. das Acácias, 412", broker: "—", brokerInitials: "—", status: "neutral", statusLabel: "Sem responsável", deadline: "—", value: "R$ 6.500/mês", docsOk: 0, docsTotal: 7 },
  ]},
  { id: "doc", title: "Aguardando documentação", cards: [
    { id: "k3", code: "LOC-2837", title: "Cobertura · Ed. Mirante", address: "Av. Beira Mar, 2210 — apto 1601", broker: "Patrícia Lima", brokerInitials: "PL", status: "received", statusLabel: "Doc. recebidos", deadline: "Hoje", value: "R$ 9.800/mês", docsOk: 6, docsTotal: 7 },
    { id: "k4", code: "LOC-2835", title: "Sala comercial · Ed. Cidade", address: "R. XV de Novembro, 890 — sala 712", broker: "Rafael Souza", brokerInitials: "RS", status: "correction", statusLabel: "Correção solicitada", deadline: "Atrasado 1d", value: "R$ 2.900/mês", docsOk: 4, docsTotal: 7, alerts: 2 },
  ]},
  { id: "cred", title: "Em análise de crédito", cards: [
    { id: "k5", code: "LOC-2829", title: "Apto 1102 · Ed. Park View", address: "Av. Bento Gonçalves, 4110", broker: "Beatriz Rocha", brokerInitials: "BR", status: "inday", statusLabel: "Em dia", deadline: "3 dias", value: "R$ 3.400/mês", docsOk: 7, docsTotal: 7 },
  ]},
  { id: "gar", title: "Definição de garantia", cards: [
    { id: "k6", code: "LOC-2820", title: "Sobrado · Vila Mariana", address: "R. Joaquim Távora, 230", broker: "André Pinto", brokerInitials: "AP", status: "pending", statusLabel: "Definir garantia", deadline: "Hoje", value: "R$ 5.200/mês", alerts: 1 },
  ]},
  { id: "apr", title: "Aprovado", cards: [
    { id: "k7", code: "LOC-2810", title: "Apto 304 · Ed. Jardins", address: "R. Augusta, 1500", broker: "Camila Duarte", brokerInitials: "CD", status: "done", statusLabel: "Aprovado", deadline: "—", value: "R$ 4.800/mês" },
  ]},
  { id: "ela", title: "Contrato em elaboração", cards: [
    { id: "k8", code: "LOC-2802", title: "Casa · Cond. Quintas", address: "Estr. do Lago, 80 — casa 12", broker: "Diego Martins", brokerInitials: "DM", status: "inday", statusLabel: "Minutando", deadline: "1 dia", value: "R$ 7.300/mês" },
  ]},
  { id: "env", title: "Enviado para assinatura", cards: [
    { id: "k9", code: "LOC-2795", title: "Apto 51 · Ed. Aurora", address: "R. da Praia, 220", broker: "Eduarda Nunes", brokerInitials: "EN", status: "late", statusLabel: "Aguardando 2 assinaturas", deadline: "Atrasado 3d", value: "R$ 3.100/mês", alerts: 3 },
  ]},
  { id: "ass", title: "Assinado", cards: [
    { id: "k10", code: "LOC-2780", title: "Apto 906 · Ed. Vista", address: "Av. Independência, 980", broker: "Felipe Andrade", brokerInitials: "FA", status: "done", statusLabel: "Contrato assinado", deadline: "—", value: "R$ 4.500/mês" },
  ]},
  { id: "prep", title: "Preparação do imóvel", cards: [] },
  { id: "chav", title: "Entrega de chaves", cards: [] },
  { id: "ativ", title: "Ativo", cards: [] },
  { id: "rep",  title: "Reprovado / desistência", cards: [] },
];

/* =========================================================================
 * Helpers visuais
 * ========================================================================= */
const fontStack = "'Inter', 'Red Hat Display', system-ui, -apple-system, sans-serif";

function StatusBadge({ s, sm }: { s: StatusKey; sm?: boolean }) {
  const st = STATUS[s];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: st.bg, color: st.fg,
      padding: sm ? "2px 7px" : "3px 9px",
      borderRadius: 999, fontSize: sm ? 10.5 : 11,
      fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: st.dot }} />
      {st.label}
    </span>
  );
}

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: 999, background: color }} />;
}

function Avatar({ initials, size = 24, bg = P.primary }: { initials: string; size?: number; bg?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: 999, background: bg, color: "#fff",
      fontSize: size <= 24 ? 10 : 12, fontWeight: 700, letterSpacing: 0.2,
    }}>{initials}</span>
  );
}

function IconBtn({ children, title, onClick, active }: { children: React.ReactNode; title?: string; onClick?: () => void; active?: boolean }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: "none",
      background: active ? "rgba(255,255,255,0.14)" : "transparent",
      color: "rgba(255,255,255,0.92)", display: "inline-flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>{children}</button>
  );
}

/* =========================================================================
 * HEADER (Variação C — escuro)
 * ========================================================================= */
function HeaderC({
  view, onView, onOpenProposal, onOpenQueue, onOpenMetrics, onOpenProposals,
  onOpenAdmin, onOpenArchived, onSync,
}: {
  view: string;
  onView: (v: string) => void;
  onOpenProposal: () => void;
  onOpenQueue: () => void;
  onOpenMetrics: () => void;
  onOpenProposals: () => void;
  onOpenAdmin: () => void;
  onOpenArchived: () => void;
  onSync: () => void;
}) {
  return (
    <header style={{
      background: P.primaryDark, color: "#fff",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      position: "sticky", top: 0, zIndex: 30,
    }}>
      {/* Topbar */}
      <div style={{
        height: 52, display: "flex", alignItems: "center",
        padding: "0 16px", gap: 12,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `linear-gradient(135deg, ${P.accent}, #b80038)`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: 0.5,
          }}>R</div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>Rizzo Flow</span>
        </div>

        {/* Meus Fluxos */}
        <button onClick={() => onView("dashboard")} style={navBtn(view === "dashboard")}>
          <KanbanSquare size={14} /> Meus Fluxos
        </button>

        {/* Métricas (no header) */}
        <button onClick={onOpenMetrics} style={navBtn(view === "metrics")}>
          <BarChart3 size={14} /> Métricas
        </button>

        {/* Busca global */}
        <div style={{
          flex: 1, maxWidth: 420, marginLeft: 8, position: "relative",
        }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "rgba(255,255,255,0.6)" }} />
          <input placeholder="Buscar em todos os fluxos…" style={{
            width: "100%", height: 32, borderRadius: 8,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#fff", padding: "0 12px 0 30px", fontSize: 12.5, outline: "none",
            fontFamily: fontStack,
          }} />
        </div>

        {/* Ações à direita */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <IconBtn title="Filtros"><Filter size={15} /></IconBtn>
          <IconBtn title="Arquivados" onClick={onOpenArchived}><Archive size={15} /></IconBtn>

          <button onClick={onOpenQueue} style={navBtn(view === "queue")} title="Minha Fila">
            <Inbox size={14} /> Minha Fila
            <span style={pillCount}>5</span>
          </button>

          <button onClick={onSync} style={navBtn(false)} title="Sincronizar com CRM">
            <RefreshCw size={14} /> Sincronizar
          </button>

          <button onClick={onOpenProposals} style={navBtn(view === "proposals")} title="Central de Propostas">
            <FileText size={14} /> Propostas
          </button>

          <IconBtn title="Notificações"><Bell size={15} /></IconBtn>

          <IconBtn title="Administração" onClick={onOpenAdmin}><Settings size={15} /></IconBtn>

          {/* Avatar / menu do usuário */}
          <button title="Menu do usuário" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999, padding: "3px 10px 3px 4px", cursor: "pointer",
            color: "#fff",
          }}>
            <Avatar initials="GL" size={24} bg={P.accent} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Guilherme</span>
            <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </button>
        </div>
      </div>

      {/* Sub-bar: abas de fluxo + Gerar Proposta */}
      <div style={{
        height: 44, display: "flex", alignItems: "center", padding: "0 16px",
        background: "rgba(255,255,255,0.03)", gap: 8,
      }}>
        <FlowTab label="Locação" count={38} active />
        <FlowTab label="Vendas" count={14} />

        <div style={{ flex: 1 }} />

        <button onClick={onOpenProposal} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: P.accent, color: "#fff", border: "none", borderRadius: 8,
          padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 2px 8px rgba(229,0,70,0.35)",
        }}>
          <Plus size={14} /> Gerar nova proposta
        </button>
      </div>
    </header>
  );
}

function navBtn(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: active ? "rgba(255,255,255,0.12)" : "transparent",
    color: "#fff", border: "none", borderRadius: 8,
    padding: "6px 10px", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", height: 32, fontFamily: fontStack,
  };
}
const pillCount: React.CSSProperties = {
  background: P.accent, color: "#fff", fontSize: 10, fontWeight: 800,
  padding: "1px 6px", borderRadius: 999, marginLeft: 2,
};

function FlowTab({ label, count, active }: { label: string; count: number; active?: boolean }) {
  return (
    <button style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: active ? "rgba(255,255,255,0.12)" : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.78)",
      border: "1px solid " + (active ? "rgba(255,255,255,0.18)" : "transparent"),
      borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700,
      cursor: "pointer",
    }}>
      {label}
      <span style={{
        background: active ? P.accent : "rgba(255,255,255,0.14)",
        color: "#fff", fontSize: 10.5, fontWeight: 800,
        padding: "1px 7px", borderRadius: 999,
      }}>{count}</span>
    </button>
  );
}

/* =========================================================================
 * KANBAN
 * ========================================================================= */
function Kanban({ onOpenCard }: { onOpenCard: (c: KCard) => void }) {
  return (
    <>
      <CardStatesShowcase onOpenCard={onOpenCard} />
      <div style={{
        display: "flex", gap: 12, overflowX: "auto", padding: "8px 16px 24px",
        alignItems: "flex-start",
      }}>
        {REAL_COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} onOpenCard={onOpenCard} />
        ))}
      </div>
    </>
  );
}

/* ---------- Showcase de estados de card (em dia, recebidos, correção, pendência, vencido) ---------- */
function CardStatesShowcase({ onOpenCard }: { onOpenCard: (c: KCard) => void }) {
  const samples: { tag: string; c: KCard }[] = [
    { tag: "Em dia", c: { id: "s1", code: "LOC-2901", title: "Apto 502 · Ed. Vista Verde", address: "R. das Palmeiras, 120 — apto 502", broker: "Marina Castro", brokerInitials: "MC", status: "inday", statusLabel: "Em dia", deadline: "3 dias", value: "R$ 3.900/mês", docsOk: 5, docsTotal: 7 } },
    { tag: "Documentos recebidos", c: { id: "s2", code: "LOC-2902", title: "Cobertura · Ed. Mirante", address: "Av. Beira Mar, 2210 — apto 1601", broker: "Patrícia Lima", brokerInitials: "PL", status: "received", statusLabel: "Doc. recebidos", deadline: "Hoje", value: "R$ 9.800/mês", docsOk: 7, docsTotal: 7 } },
    { tag: "Correção solicitada", c: { id: "s3", code: "LOC-2903", title: "Sala comercial · Ed. Cidade", address: "R. XV de Novembro, 890 — sala 712", broker: "Rafael Souza", brokerInitials: "RS", status: "correction", statusLabel: "Correção solicitada", deadline: "1 dia", value: "R$ 2.900/mês", docsOk: 4, docsTotal: 7, alerts: 2 } },
    { tag: "Pendência", c: { id: "s4", code: "LOC-2904", title: "Sobrado · Vila Mariana", address: "R. Joaquim Távora, 230", broker: "André Pinto", brokerInitials: "AP", status: "pending", statusLabel: "Definir garantia", deadline: "Hoje", value: "R$ 5.200/mês", alerts: 1 } },
    { tag: "Vencido", c: { id: "s5", code: "LOC-2905", title: "Apto 51 · Ed. Aurora", address: "R. da Praia, 220", broker: "Eduarda Nunes", brokerInitials: "EN", status: "late", statusLabel: "Aguardando assinatura", deadline: "Atrasado 3d", value: "R$ 3.100/mês", alerts: 3 } },
  ];
  return (
    <div style={{ padding: "14px 16px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: P.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
          Estados visuais do card
        </span>
        <span style={{ fontSize: 11, color: P.textSubtle }}>
          · sinais sutis: verde ok · âmbar atenção · vermelho vencido · neutro sem alerta
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(220px, 1fr))", gap: 10 }}>
        {samples.map((s) => (
          <div key={s.c.id}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: P.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {s.tag}
            </div>
            <KanbanCard c={s.c} onClick={() => onOpenCard(s.c)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({ col, onOpenCard }: { col: typeof REAL_COLUMNS[number]; onOpenCard: (c: KCard) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{
      flex: "0 0 290px", background: "#eef2f5",
      borderRadius: 12, padding: 10, border: `1px solid ${P.border}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 6px 8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: P.text }}>{col.title}</span>
          <span style={{
            background: "#fff", color: P.textMuted, fontSize: 11, fontWeight: 700,
            border: `1px solid ${P.border}`, padding: "1px 7px", borderRadius: 999,
          }}>{col.cards.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
          <button title="Adicionar card" style={iconColBtn}><Plus size={14} /></button>
          <button title="Opções da coluna" onClick={() => setMenuOpen((v) => !v)} style={iconColBtn}>
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div style={floatMenu}>
              <MenuItem icon={<Pencil size={13} />} label="Renomear coluna" />
              <MenuItem icon={<ListChecks size={13} />} label="Configurar checklist" />
              <MenuItem icon={<Clock size={13} />} label="Definir prazo de revisão" />
              <MenuItem icon={<Archive size={13} />} label="Arquivar coluna" />
              <MenuItem icon={<Trash2 size={13} />} label="Excluir" tone="danger" />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {col.cards.map((c) => <KanbanCard key={c.id} c={c} onClick={() => onOpenCard(c)} />)}
        {col.cards.length === 0 && (
          <div style={{
            padding: 18, textAlign: "center", color: P.textSubtle,
            fontSize: 11.5, border: `1px dashed ${P.border}`, borderRadius: 10,
            background: "rgba(255,255,255,0.6)",
          }}>Nenhum card nesta etapa</div>
        )}
        <button style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 10px", background: "transparent", border: `1px dashed ${P.border}`,
          borderRadius: 10, color: P.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          <Plus size={13} /> Adicionar card
        </button>
      </div>
    </div>
  );
}

const iconColBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: "none",
  background: "transparent", color: P.textMuted, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

function MenuItem({ icon, label, tone }: { icon: React.ReactNode; label: string; tone?: "danger" }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%",
      padding: "7px 10px", background: "transparent", border: "none",
      color: tone === "danger" ? "#a01633" : P.text, fontSize: 12.5,
      cursor: "pointer", textAlign: "left",
    }}>
      {icon} {label}
    </button>
  );
}

const floatMenu: React.CSSProperties = {
  position: "absolute", top: 30, right: 0, minWidth: 200,
  background: "#fff", border: `1px solid ${P.border}`, borderRadius: 10,
  boxShadow: "0 8px 24px rgba(20,30,40,0.12)", padding: 4, zIndex: 5,
};

/* =========================================================================
 * KANBAN CARD — visual sutil por estado
 * ========================================================================= */
function KanbanCard({ c, onClick }: { c: KCard; onClick: () => void }) {
  // borda lateral discreta indicando estado
  const leftBar = STATUS[c.status].dot;
  const isLate = c.status === "late";
  const isPending = c.status === "pending";
  const isCorrection = c.status === "correction";
  const isOk = c.status === "received" || c.status === "done" || c.status === "inday";

  let cardShadow = "0 1px 2px rgba(20,30,40,0.05)";
  if (isLate) cardShadow = "0 0 0 1px rgba(196,20,58,0.25), 0 2px 6px rgba(196,20,58,0.10)";
  else if (isPending) cardShadow = "0 0 0 1px rgba(229,0,70,0.18), 0 2px 6px rgba(229,0,70,0.08)";
  else if (isCorrection) cardShadow = "0 0 0 1px rgba(224,138,58,0.22), 0 2px 6px rgba(224,138,58,0.09)";
  else if (isOk) cardShadow = "0 1px 2px rgba(20,30,40,0.05)";

  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 10, padding: 10,
      border: `1px solid ${P.border}`,
      boxShadow: cardShadow, cursor: "pointer", position: "relative",
      borderLeft: `3px solid ${leftBar}`,
      transition: "transform 80ms ease",
    }}>
      {/* Topo: código + menu */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 800, color: P.textMuted,
          letterSpacing: 0.4, textTransform: "uppercase",
        }}>{c.code}</span>
        <button title="Opções do card" onClick={(e) => e.stopPropagation()} style={iconColBtn}>
          <MoreVertical size={13} />
        </button>
      </div>

      {/* Título */}
      <div style={{ fontSize: 13, fontWeight: 700, color: P.text, lineHeight: 1.3, marginBottom: 2 }}>
        {c.title}
      </div>
      <div style={{ fontSize: 11.5, color: P.textMuted, marginBottom: 8, lineHeight: 1.35 }}>
        {c.address}
      </div>

      {/* Status + alerts */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusBadge s={c.status} sm />
        {c.alerts ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "#fff1f3", color: "#a01633", border: `1px solid #f6c5cd`,
            padding: "1px 6px", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
          }}>
            <AlertTriangle size={10} /> {c.alerts} alerta{c.alerts > 1 ? "s" : ""}
          </span>
        ) : null}
        {c.docsTotal ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: P.borderSoft, color: P.text, border: `1px solid ${P.border}`,
            padding: "1px 6px", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
          }}>
            <FileText size={10} /> {c.docsOk}/{c.docsTotal}
          </span>
        ) : null}
      </div>

      {/* Rodapé: broker + valor + prazo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {c.brokerInitials !== "—" ? (
            <Avatar initials={c.brokerInitials} size={20} />
          ) : (
            <span style={{
              width: 20, height: 20, borderRadius: 999, border: `1px dashed ${P.border}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center", color: P.textSubtle,
            }}><User size={11} /></span>
          )}
          <span style={{ fontSize: 11, color: P.textMuted, fontWeight: 600 }}>{c.broker}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {c.value && <span style={{ fontSize: 11, color: P.text, fontWeight: 700 }}>{c.value}</span>}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            color: isLate ? "#a01633" : P.textMuted, fontSize: 10.5, fontWeight: 700,
          }}>
            <Clock size={10} /> {c.deadline}
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * CARD ABERTO — todos os blocos reais
 * ========================================================================= */
function CardDialog({ c, onClose }: { c: KCard; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,30,0.55)",
      backdropFilter: "blur(2px)", zIndex: 80, display: "flex", padding: 20,
      alignItems: "flex-start", justifyContent: "center", overflow: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(1180px, 100%)", background: "#fff", borderRadius: 14,
        boxShadow: "0 24px 60px rgba(20,30,40,0.25)", overflow: "hidden",
        marginTop: 10, marginBottom: 30,
      }}>
        {/* HEADER do card */}
        <div style={{
          background: P.primaryDark, color: "#fff", padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, opacity: 0.8 }}>
                {c.code} · LOCAÇÃO
              </span>
              <span style={{
                background: "rgba(255,255,255,0.14)", color: "#fff", fontSize: 10.5,
                fontWeight: 700, padding: "1px 7px", borderRadius: 999,
              }}>Aguardando documentação</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{c.title}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{c.address}</div>
          </div>

          {/* Ações do header */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button style={headerCardBtn}><Copy size={13} /> Copiar link</button>
            <button style={headerCardBtn}><Archive size={13} /> Arquivar</button>
            <button style={{ ...headerCardBtn, background: "rgba(255,255,255,0.14)" }}>
              <MoreHorizontal size={14} />
            </button>
            <button onClick={onClose} style={{
              ...headerCardBtn, background: "transparent",
            }}><X size={16} /></button>
          </div>
        </div>

        {/* CORPO: 2 colunas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px" }}>
          {/* Esquerda — blocos */}
          <div style={{ padding: 18, borderRight: `1px solid ${P.border}`, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Status atual */}
            <SectionTitle>Status</SectionTitle>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <StatusBadge s={c.status} />
              <span style={{ fontSize: 12, color: P.textMuted }}>
                Prazo de revisão: <strong style={{ color: P.text }}>2 dias úteis</strong>
              </span>
            </div>

            {/* Andamento */}
            <SectionTitle>Andamento</SectionTitle>
            <Andamento />

            {/* Responsáveis internos */}
            <SectionTitle>Responsáveis internos</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <ResponsibleChip name="Marina Castro" role="Corretora" initials="MC" />
              <ResponsibleChip name="Rafael Souza" role="Análise" initials="RS" />
              <ResponsibleChip name="Camila Duarte" role="Contratos" initials="CD" />
              <button style={addChipBtn}><Plus size={12} /> Adicionar</button>
            </div>

            {/* Dados do imóvel */}
            <SectionTitle>Dados do imóvel</SectionTitle>
            <KVGrid items={[
              ["Código CRM", "IM-9281"],
              ["Tipo", "Apartamento"],
              ["Área útil", "78 m²"],
              ["Quartos", "2 (1 suíte)"],
              ["Vagas", "1"],
              ["IPTU", "R$ 142,00"],
              ["Condomínio", "R$ 680,00"],
              ["Endereço", c.address],
            ]} />

            {/* Resumo da proposta */}
            <SectionTitle>Resumo da proposta</SectionTitle>
            <div style={summaryBox}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <Kpi label="Aluguel" value="R$ 4.200" />
                <Kpi label="Valor total" value="R$ 5.022" />
                <Kpi label="Garantia" value="Seguro fiança" />
                <Kpi label="Prazo" value="30 meses" />
                <Kpi label="Início pretendido" value="15/05/2026" />
                <Kpi label="Pessoas" value="2 adultos" />
              </div>
            </div>

            {/* Dados de contrato */}
            <SectionTitle>Dados de contrato</SectionTitle>
            <KVGrid items={[
              ["Locador", "Patrícia M. Andrade"],
              ["Locatário", "João V. Pereira"],
              ["Reajuste", "IGP-M anual"],
              ["Multa rescisória", "3 aluguéis proporcionais"],
            ]} />

            {/* Retirada de chaves */}
            <SectionTitle>Retirada de chaves</SectionTitle>
            <div style={summaryBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Key size={16} style={{ color: P.primary }} />
                <div style={{ fontSize: 12.5, color: P.text }}>
                  Agendado para <strong>16/05/2026 às 10h</strong> · Filial Centro
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button style={smallBtn}>Reagendar</button>
                  <button style={{ ...smallBtn, background: P.success, color: "#fff", border: "none" }}>Confirmar</button>
                </div>
              </div>
            </div>

            {/* Correção da proposta */}
            <SectionTitle>Correção da proposta</SectionTitle>
            <div style={{
              border: `1px solid #f4d3bb`, background: "#fff7ef",
              borderRadius: 10, padding: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <AlertCircle size={15} style={{ color: "#a04a14" }} />
                <strong style={{ fontSize: 12.5, color: "#a04a14" }}>2 itens com correção solicitada</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: P.text, lineHeight: 1.55 }}>
                <li>Comprovante de renda — qualidade insuficiente</li>
                <li>RG do fiador — frente cortada</li>
              </ul>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button style={smallBtn}><Mail size={11} /> Notificar cliente</button>
                <button style={smallBtn}><Eye size={11} /> Ver histórico</button>
                <button style={{ ...smallBtn, background: "#fff", color: "#a04a14", border: `1px solid #f4d3bb` }}>
                  <RotateCcw size={11} /> Solicitar nova correção
                </button>
              </div>
            </div>

            {/* Documentos da proposta */}
            <SectionTitle right={
              <button style={smallBtn}><Upload size={11} /> Complementar documento</button>
            }>Documentos da proposta</SectionTitle>
            <DocsList />

            {/* Listas de verificação */}
            <SectionTitle>Listas de verificação</SectionTitle>
            <Checklists />
          </div>

          {/* Direita — atividade */}
          <div style={{
            padding: 18, background: "#fafcfd",
            display: "flex", flexDirection: "column", gap: 12, minHeight: 300,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 12.5, color: P.text }}>Comentários e atividade</strong>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={tinyTab(true)}>Tudo</button>
                <button style={tinyTab(false)}>Comentários</button>
                <button style={tinyTab(false)}>Atividade</button>
              </div>
            </div>
            <ActivityFeed />

            {/* Composer */}
            <div style={{
              border: `1px solid ${P.border}`, borderRadius: 10, background: "#fff",
              padding: 8, marginTop: "auto",
            }}>
              <textarea placeholder="Escreva um comentário… use @ para mencionar" style={{
                width: "100%", minHeight: 60, border: "none", outline: "none",
                resize: "none", fontSize: 12.5, color: P.text, fontFamily: fontStack,
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 6, borderTop: `1px solid ${P.borderSoft}` }}>
                <button style={iconColBtn} title="Anexar arquivo"><Paperclip size={14} /></button>
                <button style={iconColBtn} title="Mencionar"><User size={14} /></button>
                <button style={iconColBtn} title="Marcar como tarefa"><CheckSquare size={14} /></button>
                <div style={{ flex: 1 }} />
                <button style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: P.primary, color: "#fff", border: "none", borderRadius: 8,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>
                  <Send size={12} /> Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const headerCardBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "rgba(255,255,255,0.10)", color: "#fff", border: "none",
  borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const smallBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "#fff", color: P.text, border: `1px solid ${P.border}`,
  borderRadius: 7, padding: "5px 9px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
};
const addChipBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  background: "transparent", color: P.textMuted, border: `1px dashed ${P.border}`,
  borderRadius: 999, padding: "4px 9px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
};
const tinyTab = (active: boolean): React.CSSProperties => ({
  background: active ? P.primary : "transparent", color: active ? "#fff" : P.textMuted,
  border: "none", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
});
const summaryBox: React.CSSProperties = {
  border: `1px solid ${P.border}`, background: "#fff", borderRadius: 10, padding: 12,
};

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginTop: 4, marginBottom: -4,
    }}>
      <h3 style={{
        margin: 0, fontSize: 10.5, fontWeight: 800, color: P.textMuted,
        textTransform: "uppercase", letterSpacing: 0.6,
      }}>{children}</h3>
      {right}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: P.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function KVGrid({ items }: { items: [string, string][] }) {
  return (
    <div style={{ ...summaryBox, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      {items.map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: 10.5, color: P.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k}</div>
          <div style={{ fontSize: 12.5, color: P.text, fontWeight: 600 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function ResponsibleChip({ name, role, initials }: { name: string; role: string; initials: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "#fff", border: `1px solid ${P.border}`, borderRadius: 999,
      padding: "3px 10px 3px 3px",
    }}>
      <Avatar initials={initials} size={22} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: P.text, lineHeight: 1.1 }}>{name}</span>
        <span style={{ fontSize: 10, color: P.textMuted }}>{role}</span>
      </div>
    </div>
  );
}

function Andamento() {
  const steps = [
    { label: "Cadastro iniciado", state: "done" },
    { label: "Aguardando documentação", state: "current" },
    { label: "Em análise de crédito", state: "todo" },
    { label: "Definição de garantia", state: "todo" },
    { label: "Aprovado", state: "todo" },
  ];
  return (
    <div style={{ ...summaryBox, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ flex: 1, display: "flex", alignItems: "center", flexDirection: "column", gap: 6, position: "relative" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 999,
              background: s.state === "done" ? P.success : s.state === "current" ? P.warning : "#fff",
              border: `2px solid ${s.state === "todo" ? P.border : "transparent"}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#fff", zIndex: 2,
            }}>
              {s.state === "done" ? <CheckCircle2 size={13} /> : s.state === "current" ? <Clock size={12} /> : <CircleDashed size={12} color={P.textSubtle} />}
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 700, textAlign: "center", lineHeight: 1.2,
              color: s.state === "current" ? P.text : P.textMuted, maxWidth: 90,
            }}>{s.label}</span>
            {i < steps.length - 1 && (
              <div style={{
                position: "absolute", top: 11, left: "60%", right: "-40%",
                height: 2, background: i < 1 ? P.success : P.border, zIndex: 1,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocsList() {
  const docs = [
    { name: "RG do locatário", state: "received" as StatusKey, by: "João Pereira" },
    { name: "Comprovante de renda", state: "correction" as StatusKey, by: "João Pereira" },
    { name: "Comprovante de residência", state: "received" as StatusKey, by: "João Pereira" },
    { name: "RG do fiador", state: "correction" as StatusKey, by: "Carlos Pereira" },
    { name: "Imposto de renda", state: "filling" as StatusKey, by: "—" },
  ];
  return (
    <div style={{ ...summaryBox, padding: 0 }}>
      {docs.map((d, i) => (
        <div key={d.name} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderTop: i === 0 ? "none" : `1px solid ${P.borderSoft}`,
        }}>
          <FileText size={14} style={{ color: P.textMuted }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: P.text }}>{d.name}</div>
            <div style={{ fontSize: 11, color: P.textMuted }}>Enviado por {d.by}</div>
          </div>
          <StatusBadge s={d.state} sm />
          <button style={smallBtn} title="Visualizar"><Eye size={11} /></button>
          <button style={smallBtn} title="Baixar"><Download size={11} /></button>
          <button style={smallBtn} title="Solicitar complemento"><Upload size={11} /></button>
        </div>
      ))}
    </div>
  );
}

function Checklists() {
  const items = [
    { label: "Validar dados do imóvel", done: true },
    { label: "Conferir comprovante de renda (3x aluguel)", done: true },
    { label: "Validar fiador / garantia", done: false },
    { label: "Aprovar minuta com locador", done: false },
  ];
  return (
    <div style={{ ...summaryBox, padding: 12 }}>
      {items.map((it) => (
        <label key={it.label} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 0", fontSize: 12.5, color: P.text,
        }}>
          <input type="checkbox" defaultChecked={it.done} style={{ accentColor: P.primary }} />
          <span style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? P.textMuted : P.text }}>
            {it.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const items = [
    { who: "Sistema", initials: "SY", color: P.info, when: "agora", text: "Documento Comprovante de renda marcado como CORREÇÃO." },
    { who: "Rafael Souza", initials: "RS", color: P.primary, when: "12 min", text: "Solicitei nova versão do comprovante de renda. @marina.castro pode acompanhar com o cliente?" },
    { who: "Marina Castro", initials: "MC", color: P.accent, when: "1h", text: "Cliente vai enviar até amanhã às 18h.", attach: "comprovante-anterior.pdf" },
    { who: "Sistema", initials: "SY", color: P.info, when: "2h", text: "Card movido de 'Cadastro iniciado' para 'Aguardando documentação'." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 10 }}>
          <Avatar initials={it.initials} size={28} bg={it.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <strong style={{ fontSize: 12, color: P.text }}>{it.who}</strong>
              <span style={{ fontSize: 10.5, color: P.textSubtle }}>· {it.when}</span>
            </div>
            <div style={{ fontSize: 12.5, color: P.text, lineHeight: 1.45 }}>{it.text}</div>
            {it.attach && (
              <div style={{
                marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6,
                border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 9px",
                background: "#fff", fontSize: 11.5,
              }}>
                <Paperclip size={11} /> {it.attach}
                <button style={{ ...smallBtn, padding: "2px 6px" }}>Baixar</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
 * MODAL: Gerar nova proposta
 * ========================================================================= */
function NewProposalModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,30,0.55)", zIndex: 90,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, width: "min(640px, 100%)",
        boxShadow: "0 24px 60px rgba(20,30,40,0.25)", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center" }}>
          <strong style={{ fontSize: 14, color: P.text }}>Gerar nova proposta — Locação</strong>
          <button onClick={onClose} style={{ marginLeft: "auto", ...iconColBtn }}><X size={15} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Stepper step={step} />
          {step === 1 && (
            <>
              <label style={lbl}>Imóvel</label>
              <input placeholder="Buscar por código CRM, endereço, anúncio…" style={inp} />
              <div style={{ ...summaryBox, padding: 0 }}>
                {["IM-9281 · Apto 802 · Solar Boulevard", "IM-9277 · Cobertura · Ed. Mirante", "IM-9270 · Casa · Jd. Botânico"].map((s) => (
                  <div key={s} style={{ padding: "10px 12px", borderTop: s.startsWith("IM-9281") ? "none" : `1px solid ${P.borderSoft}`, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <Building2 size={14} style={{ color: P.textMuted }} /> {s}
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <label style={lbl}>Corretor responsável</label>
              <input placeholder="Buscar corretor…" style={inp} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["MC", "Marina Castro"], ["RS", "Rafael Souza"], ["FA", "Felipe Andrade"], ["BR", "Beatriz Rocha"]].map(([i, n]) => (
                  <ResponsibleChip key={i} name={n} role="Corretor" initials={i} />
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div style={{ fontSize: 12.5, color: P.textMuted }}>Link público da proposta gerado:</div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                background: P.borderSoft, border: `1px solid ${P.border}`, borderRadius: 10,
                fontSize: 12.5, color: P.text, fontFamily: "monospace",
              }}>
                <Link2 size={14} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  https://seurizzo.com.br/p/loc-2842-a3f9b7
                </span>
                <button style={smallBtn}><Copy size={11} /> Copiar</button>
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            {step > 1 && <button style={smallBtn} onClick={() => setStep(step - 1)}>Voltar</button>}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} style={{ ...smallBtn, background: P.primary, color: "#fff", border: "none" }}>
                Continuar
              </button>
            ) : (
              <button onClick={onClose} style={{ ...smallBtn, background: P.success, color: "#fff", border: "none" }}>
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { height: 36, borderRadius: 8, border: `1px solid ${P.border}`, padding: "0 10px", fontSize: 13, color: P.text, fontFamily: fontStack, outline: "none" };

function Stepper({ step }: { step: number }) {
  const labels = ["Imóvel", "Corretor", "Link"];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {labels.map((l, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 999,
              background: done ? P.success : active ? P.primary : "#fff",
              color: done || active ? "#fff" : P.textMuted,
              border: `1px solid ${done || active ? "transparent" : P.border}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>{done ? <CheckCircle2 size={12} /> : idx}</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: active ? P.text : P.textMuted }}>{l}</span>
            {i < labels.length - 1 && <ChevronRight size={12} color={P.textSubtle} />}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
 * Telas auxiliares: Minha Fila, Métricas, Propostas, Administração, Arquivados
 * ========================================================================= */
function MyQueue() {
  const items = [
    { code: "LOC-2835", title: "Sala comercial · Ed. Cidade", reason: "Correção solicitada — 2 documentos", urg: "high" },
    { code: "LOC-2820", title: "Sobrado · Vila Mariana", reason: "Definir tipo de garantia", urg: "high" },
    { code: "LOC-2795", title: "Apto 51 · Ed. Aurora", reason: "Aguardando 2 assinaturas há 3 dias", urg: "high" },
    { code: "LOC-2841", title: "Apto 802 · Solar Boulevard", reason: "Acompanhar envio de comprovante", urg: "med" },
    { code: "LOC-2829", title: "Apto 1102 · Park View", reason: "Revisar análise de crédito", urg: "med" },
  ];
  return (
    <ScreenWrap title="Minha Fila" subtitle="Processos que precisam da sua ação agora">
      <div style={{ ...summaryBox, padding: 0 }}>
        {items.map((it, i) => (
          <div key={it.code} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderTop: i === 0 ? "none" : `1px solid ${P.borderSoft}`,
          }}>
            <Dot color={it.urg === "high" ? P.accent : P.warning} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{it.code} · {it.title}</div>
              <div style={{ fontSize: 12, color: P.textMuted }}>{it.reason}</div>
            </div>
            <button style={smallBtn}>Abrir</button>
          </div>
        ))}
      </div>
    </ScreenWrap>
  );
}

function Metrics() {
  return (
    <ScreenWrap title="Métricas" subtitle="Visão consolidada do fluxo de Locação">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { l: "Em andamento", v: "38", t: <TrendingUp size={12} color={P.success} />, d: "+4 vs semana anterior" },
          { l: "Concluídos no mês", v: "21", t: <TrendingUp size={12} color={P.success} />, d: "+12%" },
          { l: "Atrasados", v: "3", t: <TrendingDown size={12} color={P.success} />, d: "-2 vs ontem" },
          { l: "Tempo médio", v: "11d", t: <TrendingDown size={12} color={P.success} />, d: "-1,5d" },
        ].map((k) => (
          <div key={k.l} style={{ ...summaryBox, padding: 14 }}>
            <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: P.text, marginTop: 4 }}>{k.v}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11.5, color: P.textMuted }}>
              {k.t} {k.d}
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...summaryBox, padding: 16, marginTop: 14 }}>
        <strong style={{ fontSize: 12.5 }}>Volume por etapa</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140, marginTop: 10 }}>
          {REAL_COLUMNS.map((c, i) => {
            const h = Math.max(8, (c.cards.length || 0) * 26 + (i % 3) * 12);
            return (
              <div key={c.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: h, background: i % 3 === 0 ? P.primary : i % 3 === 1 ? P.info : P.success, borderRadius: 6 }} />
                <span style={{ fontSize: 9.5, color: P.textMuted, textAlign: "center", lineHeight: 1.1 }}>{c.title.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenWrap>
  );
}

function Proposals() {
  return (
    <ScreenWrap title="Central de Propostas" subtitle="Acompanhe todas as propostas geradas">
      <div style={{ ...summaryBox, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: P.borderSoft, color: P.textMuted, textAlign: "left" }}>
              {["Código", "Imóvel", "Corretor", "Status", "Atualizado", ""].map((h) => (
                <th key={h} style={{ padding: "10px 12px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REAL_COLUMNS.flatMap((c) => c.cards).map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${P.borderSoft}` }}>
                <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.code}</td>
                <td style={{ padding: "10px 12px" }}>{c.title}</td>
                <td style={{ padding: "10px 12px" }}>{c.broker}</td>
                <td style={{ padding: "10px 12px" }}><StatusBadge s={c.status} sm /></td>
                <td style={{ padding: "10px 12px", color: P.textMuted }}>{c.deadline}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <button style={smallBtn}>Abrir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenWrap>
  );
}

function AdminScreen() {
  return (
    <ScreenWrap title="Administração" subtitle="Usuários, permissões, fluxos e configurações">
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14 }}>
        <div style={{ ...summaryBox, padding: 8 }}>
          {[
            { l: "Usuários e acessos", i: <Users size={13} />, on: true },
            { l: "Fluxos e colunas", i: <KanbanSquare size={13} /> },
            { l: "Etiquetas", i: <Tag size={13} /> },
            { l: "Checklists", i: <ListChecks size={13} /> },
            { l: "Campos personalizados", i: <FolderOpen size={13} /> },
            { l: "Responsáveis de proposta", i: <ShieldCheck size={13} /> },
            { l: "Diagnósticos", i: <Info size={13} /> },
          ].map((it) => (
            <button key={it.l} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 10px", border: "none", background: it.on ? P.borderSoft : "transparent",
              borderRadius: 8, fontSize: 12.5, color: P.text, fontWeight: 600, cursor: "pointer",
              textAlign: "left",
            }}>{it.i} {it.l}</button>
          ))}
        </div>
        <div style={{ ...summaryBox, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Usuários e acessos</strong>
            <button style={{ marginLeft: "auto", ...smallBtn, background: P.primary, color: "#fff", border: "none" }}>
              <Plus size={11} /> Convidar usuário
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: P.borderSoft, color: P.textMuted, textAlign: "left" }}>
                {["Usuário", "E-mail", "Papéis", "Acessos", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["GL", "Guilherme Lacerda", "guilherme.lacerda@rizzoimobiliaria.com", "Admin", "Todos"],
                ["MC", "Marina Castro", "marina@rizzoimobiliaria.com", "Corretora", "Locação"],
                ["RS", "Rafael Souza", "rafael@rizzoimobiliaria.com", "Análise", "Locação"],
                ["CD", "Camila Duarte", "camila@rizzoimobiliaria.com", "Contratos", "Locação, Vendas"],
              ].map((r) => (
                <tr key={r[1]} style={{ borderTop: `1px solid ${P.borderSoft}` }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Avatar initials={r[0]} size={24} /> <span style={{ fontWeight: 700 }}>{r[1]}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", color: P.textMuted }}>{r[2]}</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ ...pillCount, background: P.primary }}>{r[3]}</span></td>
                  <td style={{ padding: "10px 12px", color: P.textMuted }}>{r[4]}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button style={smallBtn} title="Editar"><Pencil size={11} /></button>
                      <button style={smallBtn} title="Resetar senha"><KeyRound size={11} /></button>
                      <button style={smallBtn} title="Remover"><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ScreenWrap>
  );
}

function ArchivedScreen() {
  return (
    <ScreenWrap title="Arquivados" subtitle="Cards arquivados (somente leitura)">
      <div style={{ ...summaryBox, padding: 0 }}>
        {[
          ["LOC-2700", "Apto 201 · Vila Nova", "Marina Castro", "08/04/2026"],
          ["LOC-2685", "Sala 502 · Centro", "Rafael Souza", "01/04/2026"],
          ["LOC-2671", "Casa · Jardim Europa", "Camila Duarte", "27/03/2026"],
        ].map((r, i) => (
          <div key={r[0]} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
            borderTop: i === 0 ? "none" : `1px solid ${P.borderSoft}`,
          }}>
            <Archive size={14} style={{ color: P.textMuted }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{r[0]} · {r[1]}</div>
              <div style={{ fontSize: 11.5, color: P.textMuted }}>Por {r[2]} · {r[3]}</div>
            </div>
            <button style={smallBtn}><RotateCcw size={11} /> Restaurar</button>
          </div>
        ))}
      </div>
    </ScreenWrap>
  );
}

function ScreenWrap({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.text }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 12.5, color: P.textMuted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/* =========================================================================
 * Variation switcher (mantém A e B como comparação rápida)
 * ========================================================================= */
const VARIATION_INFO: Record<VariationId, { label: string; tone: string }> = {
  A: { label: "A — Operacional Claro", tone: "Header claro, conforto visual" },
  B: { label: "B — Administrativo Denso", tone: "Densidade alta, gestão" },
  C: { label: "C — Focus / Semi-dark", tone: "Recomendada · header escuro, foco no conteúdo" },
};

/* =========================================================================
 * PÁGINA
 * ========================================================================= */
export default function DesignPreview() {
  const [variation, setVariation] = useState<VariationId>("C");
  const [view, setView] = useState<string>("dashboard");
  const [openCard, setOpenCard] = useState<KCard | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  return (
    <div style={{ background: P.bg, minHeight: "100vh", fontFamily: fontStack, color: P.text }}>
      {/* Barra de prévia */}
      <PreviewBar variation={variation} onChange={setVariation} />

      {/* Aviso */}
      <div style={{
        margin: "10px 16px 0", padding: "8px 12px", borderRadius: 10,
        background: "#eef4fa", border: `1px solid #cfdef0`, color: "#1e3a52",
        fontSize: 12, display: "flex", alignItems: "center", gap: 8,
      }}>
        <Info size={14} /> Esta é uma <strong>prévia visual</strong>. A aplicação futura deste design <strong>não altera</strong> etapas, regras de negócio, permissões ou dados do sistema.
      </div>

      {variation === "C" && (
        <VariationCShell
          view={view}
          setView={setView}
          openCard={openCard}
          setOpenCard={setOpenCard}
          showProposalModal={showProposalModal}
          setShowProposalModal={setShowProposalModal}
        />
      )}

      {variation !== "C" && (
        <SimpleVariation id={variation} />
      )}

      {/* Bloco "O que melhora / Possíveis riscos" */}
      <div style={{ padding: "20px 16px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ProsCons
            title="O que esta variação melhora"
            tone="ok"
            items={variation === "C" ? [
              "Header escuro reforça identidade Rizzo e dá foco ao card",
              "Conteúdo claro mantém leitura confortável por horas",
              "Estados dos cards comunicam por borda/sombra (sem poluir)",
              "Hierarquia consistente: badges, KVs e seções padronizados",
              "Mostra todos os menus reais no lugar correto",
            ] : variation === "A" ? [
              "Conforto visual em jornadas longas",
              "Aparência mais leve e moderna",
              "Bom para usuários menos técnicos",
            ] : [
              "Mais cards visíveis sem rolar",
              "Tipografia compacta para gestores",
              "Tabelas e listas ganham eficiência",
            ]}
          />
          <ProsCons
            title="Possíveis riscos"
            tone="warn"
            items={variation === "C" ? [
              "Contraste forte do topo pode parecer pesado em telas pequenas",
              "Exige cuidado com hover/foco na barra escura",
              "Usuários acostumados a UI 100% clara podem estranhar no início",
            ] : variation === "A" ? [
              "Pode parecer pouco impactante",
              "Exige disciplina nos contrastes secundários",
            ] : [
              "Densidade alta cansa usuários menos experientes",
              "Touch targets menores no mobile",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ----------------- Shell da Variação C ----------------- */
function VariationCShell({
  view, setView, openCard, setOpenCard, showProposalModal, setShowProposalModal,
}: {
  view: string; setView: (v: string) => void;
  openCard: KCard | null; setOpenCard: (c: KCard | null) => void;
  showProposalModal: boolean; setShowProposalModal: (v: boolean) => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPinned, setChatPinned] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string>("g-geral");
  const totalUnread = CHAT_CONVERSATIONS.reduce((acc, c) => acc + c.unread, 0);
  const RAIL_W = 64;
  const DRAWER_W = 820;
  return (
    <div style={{ marginTop: 10 }}>
      <HeaderC
        view={view}
        onView={setView}
        onOpenProposal={() => setShowProposalModal(true)}
        onOpenQueue={() => setView("queue")}
        onOpenMetrics={() => setView("metrics")}
        onOpenProposals={() => setView("proposals")}
        onOpenAdmin={() => setView("admin")}
        onOpenArchived={() => setView("archived")}
        onSync={() => {}}
      />

      <div style={{
        marginRight: chatOpen && chatPinned ? DRAWER_W : RAIL_W,
        transition: "margin-right .2s ease",
      }}>
        {view === "dashboard" && <Kanban onOpenCard={setOpenCard} />}
      {view === "queue" && <MyQueue />}
      {view === "metrics" && <Metrics />}
      {view === "proposals" && <Proposals />}
      {view === "admin" && <AdminScreen />}
      {view === "archived" && <ArchivedScreen />}
      </div>

      {openCard && <CardDialog c={openCard} onClose={() => setOpenCard(null)} />}
      {showProposalModal && <NewProposalModal onClose={() => setShowProposalModal(false)} />}

      {/* Chat — barra lateral direita fixa (desktop) */}
      <ChatRail
        width={RAIL_W}
        totalUnread={totalUnread}
        activeConvId={activeConvId}
        onSelect={(id) => { setActiveConvId(id); setChatOpen(true); }}
        onToggle={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      {/* Botão flutuante mobile (visível apenas em telas pequenas) */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        title="Abrir chat interno"
        className="lp-chat-fab"
        style={{
          position: "fixed", right: 16, bottom: 16, zIndex: 70,
          width: 52, height: 52, borderRadius: 999, border: "none",
          background: P.accent, color: "#fff", cursor: "pointer",
          boxShadow: "0 6px 18px rgba(229,0,70,0.35)",
          display: "none", alignItems: "center", justifyContent: "center",
        }}
      >
        <MessageSquare size={20} />
        {totalUnread > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2, minWidth: 18, height: 18,
            padding: "0 5px", borderRadius: 999, background: P.primaryDark, color: "#fff",
            fontSize: 10.5, fontWeight: 800, display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
          }}>{totalUnread > 99 ? "99+" : totalUnread}</span>
        )}
      </button>
      <style>{`
        @media (max-width: 768px) {
          .lp-chat-rail { display: none !important; }
          .lp-chat-fab { display: inline-flex !important; }
          .lp-chat-drawer { width: 100vw !important; max-width: 100vw !important; }
          .lp-chat-drawer-list { width: 100% !important; }
        }
      `}</style>

      {chatOpen && (
        <ChatDrawer
          pinned={chatPinned}
          onTogglePin={() => setChatPinned((v) => !v)}
          onClose={() => setChatOpen(false)}
          activeConvId={activeConvId}
          setActiveConvId={setActiveConvId}
          width={DRAWER_W}
          rightOffset={RAIL_W}
        />
      )}

      {/* Mobile gallery */}
      <MobileGallery />
    </div>
  );
}

/* =========================================================================
 * GALERIA MOBILE — 5 telas reais (Dashboard, Card, Gerar proposta, Minha Fila, Proposta pública)
 * ========================================================================= */
function MobileGallery() {
  return (
    <div style={{ padding: "16px 16px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Smartphone size={14} color={P.textMuted} />
        <strong style={{ fontSize: 13, color: P.text }}>Versão mobile — telas principais</strong>
        <span style={{ fontSize: 11.5, color: P.textMuted }}>
          Dashboard · Card aberto · Gerar proposta · Minha Fila · Chat interno · Proposta pública
        </span>
      </div>
      <div style={{
        display: "flex", gap: 18, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start",
      }}>
        <Phone label="Dashboard"><MobileDashboard /></Phone>
        <Phone label="Card aberto"><MobileCardDetail /></Phone>
        <Phone label="Gerar proposta"><MobileNewProposal /></Phone>
        <Phone label="Minha Fila"><MobileMyQueue /></Phone>
        <Phone label="Chat interno"><MobileChat /></Phone>
        <Phone label="Proposta pública"><MobilePublicProposal /></Phone>
      </div>
    </div>
  );
}

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 320, height: 620, borderRadius: 32,
        border: `9px solid ${P.primaryDark}`, overflow: "hidden", background: P.bg,
        boxShadow: "0 14px 32px rgba(20,30,40,0.20)", display: "flex", flexDirection: "column",
      }}>
        {children}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: P.textMuted }}>{label}</span>
    </div>
  );
}

function MobileTopbar({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{
      background: P.primaryDark, color: "#fff", padding: "10px 12px",
      display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, background: P.accent,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800,
      }}>R</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 10, opacity: 0.75 }}>{sub}</div>}
      </div>
      <Bell size={14} style={{ opacity: 0.85 }} />
      <Avatar initials="GL" size={22} bg={P.accent} />
    </div>
  );
}

function MobileDashboard() {
  const cards = REAL_COLUMNS[1].cards;
  return (
    <>
      <MobileTopbar title="Rizzo Flow" sub="Locação · 38 em andamento" />
      {/* Tabs de fluxo */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", background: "#243036", flexShrink: 0 }}>
        <span style={{ background: P.accent, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>Locação · 38</span>
        <span style={{ background: "rgba(255,255,255,0.10)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999 }}>Vendas · 14</span>
      </div>
      {/* Busca */}
      <div style={{ padding: "8px 10px", background: P.bg, borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 8, top: 8, color: P.textMuted }} />
          <input placeholder="Buscar imóvel, código…" style={{
            width: "100%", height: 28, borderRadius: 7, border: `1px solid ${P.border}`,
            background: "#fff", padding: "0 8px 0 26px", fontSize: 11.5, fontFamily: fontStack, outline: "none",
          }} />
        </div>
      </div>
      {/* Coluna selecionada */}
      <div style={{ padding: "8px 10px", flexShrink: 0, fontSize: 11, color: P.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        Aguardando documentação
        <ChevronDown size={12} />
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: P.text, background: "#fff", border: `1px solid ${P.border}`, padding: "1px 6px", borderRadius: 999 }}>{cards.length}</span>
      </div>
      <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
        {cards.map((c) => <KanbanCard key={c.id} c={c} onClick={() => {}} />)}
      </div>
      {/* FAB */}
      <div style={{ position: "relative" }}>
        <button style={{
          position: "absolute", right: 12, bottom: 12,
          width: 48, height: 48, borderRadius: 999, background: P.accent, color: "#fff",
          border: "none", boxShadow: "0 6px 16px rgba(229,0,70,0.40)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}><Plus size={20} /></button>
      </div>
    </>
  );
}

function MobileCardDetail() {
  return (
    <>
      <div style={{
        background: P.primaryDark, color: "#fff", padding: "10px 12px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <ChevronRight size={14} style={{ transform: "rotate(180deg)", opacity: 0.85 }} />
          <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8, letterSpacing: 0.4 }}>LOC-2837 · LOCAÇÃO</span>
          <MoreVertical size={14} style={{ marginLeft: "auto", opacity: 0.85 }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>Cobertura · Ed. Mirante</div>
        <div style={{ fontSize: 10.5, opacity: 0.78, marginTop: 2 }}>Av. Beira Mar, 2210 — apto 1601</div>
        <div style={{ marginTop: 8 }}><StatusBadge s="received" sm /></div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${P.border}`, background: "#fff", flexShrink: 0 }}>
        {["Resumo", "Docs", "Checklist", "Atividade"].map((t, i) => (
          <button key={t} style={{
            flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 700,
            background: "transparent", border: "none",
            color: i === 0 ? P.text : P.textMuted,
            borderBottom: i === 0 ? `2px solid ${P.accent}` : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: 10, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ ...summaryBox, padding: 10 }}>
          <div style={{ fontSize: 10.5, color: P.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Resumo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            <Kpi label="Aluguel" value="R$ 9.800" />
            <Kpi label="Total" value="R$ 11.420" />
            <Kpi label="Garantia" value="Seguro" />
            <Kpi label="Prazo" value="30 meses" />
          </div>
        </div>
        <div style={{ ...summaryBox, padding: 10 }}>
          <div style={{ fontSize: 10.5, color: P.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Próxima ação</div>
          <div style={{ fontSize: 12, color: P.text, fontWeight: 600, lineHeight: 1.4 }}>
            Validar comprovante de renda enviado por João Pereira.
          </div>
          <button style={{ ...smallBtn, marginTop: 8, background: P.primary, color: "#fff", border: "none" }}>
            <CheckSquare size={11} /> Validar agora
          </button>
        </div>
        <div style={{ ...summaryBox, padding: 0 }}>
          {[
            { n: "RG locatário", s: "received" as StatusKey },
            { n: "Comprovante renda", s: "correction" as StatusKey },
            { n: "Comp. residência", s: "received" as StatusKey },
          ].map((d, i) => (
            <div key={d.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderTop: i === 0 ? "none" : `1px solid ${P.borderSoft}` }}>
              <FileText size={13} style={{ color: P.textMuted }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: P.text, flex: 1 }}>{d.n}</span>
              <StatusBadge s={d.s} sm />
            </div>
          ))}
        </div>
      </div>
      {/* Bottom action bar */}
      <div style={{
        background: "#fff", borderTop: `1px solid ${P.border}`, padding: 8, display: "flex", gap: 6, flexShrink: 0,
      }}>
        <button style={{ ...smallBtn, flex: 1, justifyContent: "center" }}><MessageSquare size={11} /> Comentar</button>
        <button style={{ ...smallBtn, flex: 1, justifyContent: "center", background: P.primary, color: "#fff", border: "none" }}>
          <ChevronRight size={11} /> Avançar etapa
        </button>
      </div>
    </>
  );
}

function MobileNewProposal() {
  return (
    <>
      <MobileTopbar title="Gerar proposta" sub="Locação · etapa 1 de 3" />
      <div style={{ padding: 12, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <Stepper step={1} />
        <label style={lbl}>Imóvel</label>
        <input placeholder="Buscar por código, endereço…" style={{ ...inp, fontSize: 12 }} />
        <div style={{ ...summaryBox, padding: 0 }}>
          {["IM-9281 · Apto 802 · Solar Boulevard", "IM-9277 · Cobertura · Ed. Mirante", "IM-9270 · Casa · Jd. Botânico"].map((s, i) => (
            <div key={s} style={{
              padding: "10px 12px", borderTop: i === 0 ? "none" : `1px solid ${P.borderSoft}`,
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
            }}>
              <Building2 size={13} style={{ color: P.textMuted }} />
              <span style={{ flex: 1, lineHeight: 1.3 }}>{s}</span>
              <ChevronRight size={13} color={P.textSubtle} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: P.textMuted, lineHeight: 1.4, marginTop: 4 }}>
          Próximas etapas: <strong>Corretor</strong> e <strong>Link público</strong>.
        </div>
      </div>
      <div style={{ background: "#fff", borderTop: `1px solid ${P.border}`, padding: 8, display: "flex", gap: 6, flexShrink: 0 }}>
        <button style={{ ...smallBtn, flex: 1, justifyContent: "center" }}>Cancelar</button>
        <button style={{ ...smallBtn, flex: 2, justifyContent: "center", background: P.primary, color: "#fff", border: "none" }}>
          Continuar <ChevronRight size={11} />
        </button>
      </div>
    </>
  );
}

function MobileMyQueue() {
  const items = [
    { code: "LOC-2835", title: "Sala comercial · Ed. Cidade", reason: "2 documentos com correção", urg: "high" },
    { code: "LOC-2820", title: "Sobrado · Vila Mariana", reason: "Definir tipo de garantia", urg: "high" },
    { code: "LOC-2795", title: "Apto 51 · Ed. Aurora", reason: "Aguardando 2 assinaturas há 3d", urg: "high" },
    { code: "LOC-2841", title: "Apto 802 · Solar Boulevard", reason: "Acompanhar comprovante", urg: "med" },
    { code: "LOC-2829", title: "Apto 1102 · Park View", reason: "Revisar análise de crédito", urg: "med" },
  ];
  return (
    <>
      <MobileTopbar title="Minha Fila" sub="5 processos precisam de você" />
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", background: "#243036", flexShrink: 0 }}>
        <span style={{ background: P.accent, color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>Urgente · 3</span>
        <span style={{ background: "rgba(255,255,255,0.10)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>Atenção · 2</span>
      </div>
      <div style={{ padding: 10, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <div key={it.code} style={{
            background: "#fff", border: `1px solid ${P.border}`, borderRadius: 10, padding: 10,
            borderLeft: `3px solid ${it.urg === "high" ? P.accent : P.warning}`,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: P.textMuted, letterSpacing: 0.4 }}>{it.code}</span>
              <Dot color={it.urg === "high" ? P.accent : P.warning} size={6} />
              <span style={{ marginLeft: "auto", fontSize: 10, color: P.textMuted, fontWeight: 700 }}>
                {it.urg === "high" ? "URGENTE" : "ATENÇÃO"}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: P.text, lineHeight: 1.3 }}>{it.title}</div>
            <div style={{ fontSize: 11, color: P.textMuted, lineHeight: 1.35 }}>{it.reason}</div>
            <button style={{ ...smallBtn, alignSelf: "flex-start", marginTop: 4, background: P.primary, color: "#fff", border: "none" }}>
              Abrir <ChevronRight size={11} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function MobilePublicProposal() {
  return (
    <>
      <div style={{
        background: "#fff", borderBottom: `1px solid ${P.border}`,
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: 7, background: P.accent,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 13,
        }}>R</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: P.text, lineHeight: 1.1 }}>Rizzo Imobiliária</div>
          <div style={{ fontSize: 10, color: P.textMuted }}>Proposta de locação</div>
        </div>
        <span style={{
          background: "#eaf5ee", color: "#2a6a48", fontSize: 10, fontWeight: 700,
          padding: "2px 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <ShieldCheck size={10} /> Seguro
        </span>
      </div>
      <div style={{ padding: 12, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Imóvel</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: P.text, marginTop: 2 }}>Apto 802 · Solar Boulevard</div>
          <div style={{ fontSize: 11.5, color: P.textMuted }}>R. Voluntários da Pátria, 1820 — Higienópolis</div>
        </div>
        <div style={{ ...summaryBox, padding: 12, background: P.borderSoft }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Kpi label="Aluguel" value="R$ 4.200" />
            <Kpi label="Total mensal" value="R$ 5.022" />
            <Kpi label="Garantia" value="Seguro fiança" />
            <Kpi label="Prazo" value="30 meses" />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
            Documentos solicitados
          </div>
          <div style={{ ...summaryBox, padding: 0 }}>
            {[
              { n: "RG / CNH", s: "received" as StatusKey },
              { n: "Comprovante de renda", s: "filling" as StatusKey },
              { n: "Comprovante de residência", s: "neutral" as StatusKey },
            ].map((d, i) => (
              <div key={d.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderTop: i === 0 ? "none" : `1px solid ${P.borderSoft}` }}>
                <Upload size={13} style={{ color: P.textMuted }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: P.text, flex: 1 }}>{d.n}</span>
                <StatusBadge s={d.s} sm />
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: P.textSubtle, lineHeight: 1.45, textAlign: "center", marginTop: 4 }}>
          Seus dados são protegidos. Esta proposta é exclusiva e expira em 7 dias.
        </div>
      </div>
      <div style={{ background: "#fff", borderTop: `1px solid ${P.border}`, padding: 10, flexShrink: 0 }}>
        <button style={{
          width: "100%", padding: "11px 12px", borderRadius: 10, border: "none",
          background: P.accent, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 12px rgba(229,0,70,0.30)",
        }}>
          Continuar envio de documentos
        </button>
      </div>
    </>
  );
}

/* ----------------- Variações A e B (resumidas) ----------------- */
function SimpleVariation({ id }: { id: VariationId }) {
  const isA = id === "A";
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        background: "#fff", borderBottom: `1px solid ${P.border}`, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <strong style={{ fontSize: 14, color: P.text }}>Rizzo Flow — Variação {id}</strong>
        <span style={{ fontSize: 12, color: P.textMuted }}>{VARIATION_INFO[id].tone}</span>
        <div style={{ marginLeft: "auto", fontSize: 12, color: P.textMuted }}>Resumo visual — para detalhe completo veja a Variação C.</div>
      </div>
      <div style={{
        display: "flex", gap: 12, overflowX: "auto", padding: "16px",
        ...(isA ? {} : { fontSize: 11.5 }),
      }}>
        {REAL_COLUMNS.slice(0, 6).map((col) => (
          <div key={col.id} style={{
            flex: "0 0 260px", background: isA ? "#eef2f5" : "#e9eef2",
            borderRadius: isA ? 12 : 6, padding: 10, border: `1px solid ${P.border}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{col.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {col.cards.map((c) => (
                <div key={c.id} style={{
                  background: "#fff", border: `1px solid ${P.border}`, borderRadius: isA ? 10 : 6,
                  padding: isA ? 10 : 7, fontSize: isA ? 12 : 11,
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: P.textMuted }}>{c.code}</div>
                  <div style={{ fontWeight: 700, color: P.text }}>{c.title}</div>
                  <div style={{ marginTop: 4 }}><StatusBadge s={c.status} sm /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------- Barra de prévia / seletor de variação ----------------- */
function PreviewBar({ variation, onChange }: { variation: VariationId; onChange: (v: VariationId) => void }) {
  return (
    <div style={{
      background: P.primaryDark, color: "#fff", padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.8 }}>
        Design preview · Rizzo Flow
      </span>
      <span style={{ fontSize: 11.5, opacity: 0.8 }}>Não afeta o sistema real</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        {(Object.keys(VARIATION_INFO) as VariationId[]).map((id) => (
          <button key={id} onClick={() => onChange(id)} style={{
            background: variation === id ? P.accent : "rgba(255,255,255,0.10)",
            color: "#fff", border: "none", borderRadius: 999,
            padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
          }}>{VARIATION_INFO[id].label}</button>
        ))}
      </div>
    </div>
  );
}

function ProsCons({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" }) {
  const c = tone === "ok"
    ? { bg: "#eaf5ee", border: "#c7e3d2", fg: "#2a6a48", icon: <CheckCircle2 size={14} /> }
    : { bg: "#fff7ef", border: "#f4d3bb", fg: "#a04a14", icon: <AlertTriangle size={14} /> };
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: c.fg, fontWeight: 800, fontSize: 12.5, marginBottom: 8 }}>
        {c.icon} {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: P.text, fontSize: 12.5, lineHeight: 1.55 }}>
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

/* =========================================================================
 * CHAT INTERNO — prévia visual (Variação C / Focus Semi-Dark)
 * Comunicação geral da equipe, separado dos comentários do card.
 * Apenas visual — sem lógica real.
 * ========================================================================= */
type ChatConv = {
  id: string;
  kind: "all" | "group" | "dm";
  name: string;
  initials: string;
  color: string;
  lastMsg: string;
  lastTime: string;
  unread: number;
  online?: boolean;
};

const CHAT_CONVERSATIONS: ChatConv[] = [
  { id: "all",         kind: "all",   name: "Todos",          initials: "TT", color: P.primary, lastMsg: "Aviso geral · sistema atualizado às 14h", lastTime: "agora",  unread: 1 },
  { id: "g-geral",     kind: "group", name: "Geral",          initials: "GE", color: "#4a6572", lastMsg: "Marina: bom dia equipe! ☀️",                lastTime: "09:42",  unread: 4 },
  { id: "g-gestao",    kind: "group", name: "Gestão",         initials: "GS", color: "#5d4e7a", lastMsg: "Patrícia: fechamos 14 contratos esta sem…", lastTime: "09:10",  unread: 0 },
  { id: "g-adm",       kind: "group", name: "Administrativo", initials: "AD", color: "#6b5b3e", lastMsg: "Você: enviei a planilha de garantias",     lastTime: "ontem",  unread: 0 },
  { id: "g-cor",       kind: "group", name: "Corretores",     initials: "CO", color: "#3e6b5b", lastMsg: "Rafael: quem cobre visita 16h Higienópolis?", lastTime: "08:55", unread: 2 },
  { id: "g-loc",       kind: "group", name: "Locação",        initials: "LO", color: P.info,    lastMsg: "Beatriz: contrato LOC-2829 aprovado ✅",   lastTime: "08:30",  unread: 0 },
  { id: "g-vnd",       kind: "group", name: "Vendas",         initials: "VN", color: "#a04a14", lastMsg: "Diego: visita confirmada — Vila Mariana",  lastTime: "ontem",  unread: 0 },
  { id: "u-marina",    kind: "dm",    name: "Marina Castro",  initials: "MC", color: "#3a5a78", lastMsg: "Pode revisar o LOC-2841 quando puder?",    lastTime: "09:48",  unread: 1, online: true },
  { id: "u-rafael",    kind: "dm",    name: "Rafael Souza",   initials: "RS", color: "#7a3a3a", lastMsg: "Cliente pediu correção no comprovante",    lastTime: "09:20",  unread: 0, online: true },
  { id: "u-patricia",  kind: "dm",    name: "Patrícia Lima",  initials: "PL", color: "#5a3a78", lastMsg: "Reunião amanhã 10h ok?",                    lastTime: "08:12",  unread: 0 },
  { id: "u-andre",     kind: "dm",    name: "André Pinto",    initials: "AP", color: "#3a785a", lastMsg: "Garantia definida: fiador",                lastTime: "ontem",  unread: 0 },
  { id: "u-camila",    kind: "dm",    name: "Camila Duarte",  initials: "CD", color: "#785a3a", lastMsg: "Obrigada! 🙏",                              lastTime: "ontem",  unread: 0, online: true },
];

type ChatMsg = {
  id: string;
  author: string;
  initials: string;
  color: string;
  time: string;
  text?: string;
  mine?: boolean;
  attachment?: { kind: "pdf" | "image" | "doc"; name: string; size: string };
  dateSep?: string;
};

const CHAT_MESSAGES: Record<string, ChatMsg[]> = {
  "g-geral": [
    { id: "d1", author: "", initials: "", color: "", time: "", dateSep: "Hoje" },
    { id: "m1", author: "Marina Castro", initials: "MC", color: "#3a5a78", time: "09:42", text: "Bom dia equipe! ☀️ Lembrete: alinhamento de fechamento às 14h." },
    { id: "m2", author: "Rafael Souza",  initials: "RS", color: "#7a3a3a", time: "09:43", text: "Anotado 👍" },
    { id: "m3", author: "Patrícia Lima", initials: "PL", color: "#5a3a78", time: "09:45", text: "Segue a pauta da reunião:", attachment: { kind: "pdf", name: "Pauta_alinhamento_14h.pdf", size: "212 KB" } },
    { id: "m4", author: "Você",          initials: "GL", color: P.accent,  time: "09:47", mine: true, text: "Recebido. Vou levar os números do mês." },
    { id: "m5", author: "Beatriz Rocha", initials: "BR", color: "#3a785a", time: "09:50", text: "Prints do funil:", attachment: { kind: "image", name: "funil_outubro.png", size: "1.4 MB" } },
    { id: "m6", author: "Você",          initials: "GL", color: P.accent,  time: "09:52", mine: true, text: "Perfeito 🚀" },
  ],
};

function ChatDrawer({
  pinned, onTogglePin, onClose, activeConvId, setActiveConvId, width = 760, rightOffset = 0,
}: {
  pinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
  activeConvId: string;
  setActiveConvId: (id: string) => void;
  width?: number;
  rightOffset?: number;
}) {
  const [query, setQuery] = useState("");
  const active = CHAT_CONVERSATIONS.find((c) => c.id === activeConvId) ?? CHAT_CONVERSATIONS[1];
  const filtered = useMemo(
    () => CHAT_CONVERSATIONS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const groups = filtered.filter((c) => c.kind !== "dm");
  const dms = filtered.filter((c) => c.kind === "dm");

  return (
    <aside className="lp-chat-drawer" style={{
      position: "fixed", top: 0, right: rightOffset, bottom: 0,
      width: width, maxWidth: "96vw",
      display: "flex", zIndex: 60,
      boxShadow: pinned ? "none" : "-18px 0 40px rgba(20,30,40,0.18)",
      background: P.card, borderLeft: `1px solid ${P.border}`,
      fontFamily: fontStack,
    }}>
      {/* Lista de conversas */}
      <div className="lp-chat-drawer-list" style={{
        width: 290, borderRight: `1px solid ${P.border}`,
        display: "flex", flexDirection: "column", background: "#fafbfc",
      }}>
        <div style={{
          padding: "12px 12px 8px", background: P.primaryDark, color: "#fff",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <MessageSquare size={15} />
          <strong style={{ fontSize: 13 }}>Chat interno</strong>
          <span style={{ marginLeft: "auto", fontSize: 10.5, opacity: 0.7 }}>Equipe Rizzo</span>
        </div>
        <div style={{ padding: 10, borderBottom: `1px solid ${P.border}` }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: 9, color: P.textMuted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conversa"
              style={{
                width: "100%", height: 30, borderRadius: 8,
                border: `1px solid ${P.border}`, background: "#fff",
                padding: "0 10px 0 28px", fontSize: 12, outline: "none", fontFamily: fontStack,
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <ChatGroupLabel label="Geral" />
          {groups.filter((g) => g.kind === "all").map((c) => (
            <ChatConvRow key={c.id} c={c} active={c.id === active.id} onClick={() => setActiveConvId(c.id)} />
          ))}
          <ChatGroupLabel label="Grupos" />
          {groups.filter((g) => g.kind === "group").map((c) => (
            <ChatConvRow key={c.id} c={c} active={c.id === active.id} onClick={() => setActiveConvId(c.id)} />
          ))}
          <ChatGroupLabel label="Mensagens diretas" />
          {dms.map((c) => (
            <ChatConvRow key={c.id} c={c} active={c.id === active.id} onClick={() => setActiveConvId(c.id)} />
          ))}
        </div>
      </div>

      {/* Conversa */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#fff" }}>
        {/* Cabeçalho da conversa */}
        <div style={{
          height: 52, padding: "0 14px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: `1px solid ${P.border}`, background: "#fff",
        }}>
          <Avatar initials={active.initials} size={32} bg={active.color} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: P.text, lineHeight: 1.2 }}>{active.name}</div>
            <div style={{ fontSize: 11, color: P.textMuted }}>
              {active.kind === "dm" ? (active.online ? "Online" : "Offline") :
               active.kind === "group" ? "Grupo · 12 membros" : "Canal aberto a toda a equipe"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button title={pinned ? "Desafixar" : "Fixar conversa"} onClick={onTogglePin} style={chatHeaderBtn}>
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
            <button title="Mais ações" style={chatHeaderBtn}><MoreHorizontal size={15} /></button>
            <button title="Fechar" onClick={onClose} style={chatHeaderBtn}><X size={16} /></button>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 18px",
          background: "linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {(CHAT_MESSAGES[active.id] ?? CHAT_MESSAGES["g-geral"]).map((m) => (
            m.dateSep
              ? <ChatDateSep key={m.id} label={m.dateSep} />
              : <ChatBubble key={m.id} m={m} />
          ))}
        </div>

        {/* Composer */}
        <div style={{
          borderTop: `1px solid ${P.border}`, padding: 10, background: "#fff",
          display: "flex", alignItems: "flex-end", gap: 8,
        }}>
          <button title="Anexar" style={chatComposerBtn}><Paperclip size={16} /></button>
          <button title="Emoji" style={chatComposerBtn}><Smile size={16} /></button>
          <textarea
            placeholder={`Mensagem para ${active.name}…`}
            rows={1}
            style={{
              flex: 1, resize: "none", minHeight: 36, maxHeight: 120,
              border: `1px solid ${P.border}`, borderRadius: 10,
              padding: "8px 12px", fontSize: 13, fontFamily: fontStack,
              outline: "none", lineHeight: 1.4, color: P.text,
            }}
          />
          <button title="Enviar" style={{
            background: P.accent, color: "#fff", border: "none",
            borderRadius: 10, height: 36, padding: "0 14px",
            fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 6px rgba(229,0,70,0.3)",
          }}>
            <Send size={14} /> Enviar
          </button>
        </div>
      </div>
    </aside>
  );
}

const chatHeaderBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent",
  color: P.textMuted, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const chatComposerBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: `1px solid ${P.border}`,
  background: "#fafbfc", color: P.textMuted, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

function ChatGroupLabel({ label }: { label: string }) {
  return (
    <div style={{
      padding: "10px 12px 4px", fontSize: 10.5, fontWeight: 800,
      color: P.textSubtle, textTransform: "uppercase", letterSpacing: 0.6,
    }}>{label}</div>
  );
}

function ChatConvRow({ c, active, onClick }: { c: ChatConv; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", gap: 10, alignItems: "center",
        padding: "10px 12px", border: "none", cursor: "pointer", textAlign: "left",
        background: active ? "#eef4fa" : "transparent",
        borderLeft: `3px solid ${active ? P.accent : "transparent"}`,
        transition: "background .12s",
      }}
    >
      <div style={{ position: "relative" }}>
        <Avatar initials={c.initials} size={34} bg={c.color} />
        {c.online && (
          <span style={{
            position: "absolute", bottom: 0, right: 0, width: 9, height: 9,
            borderRadius: 999, background: P.success, border: "2px solid #fafbfc",
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: P.text, flex: 1, minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
          <span style={{ fontSize: 10.5, color: P.textMuted, flexShrink: 0 }}>{c.lastTime}</span>
        </div>
        <div style={{ fontSize: 11.5, color: P.textMuted,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
          {c.lastMsg}
        </div>
      </div>
      {c.unread > 0 && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 999, background: P.accent, color: "#fff",
          fontSize: 10.5, fontWeight: 800, padding: "0 6px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>{c.unread}</span>
      )}
    </button>
  );
}

function ChatDateSep({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 8px" }}>
      <div style={{ flex: 1, height: 1, background: P.border }} />
      <span style={{
        fontSize: 10.5, fontWeight: 800, color: P.textMuted,
        background: "#fff", padding: "2px 10px", borderRadius: 999,
        border: `1px solid ${P.border}`, textTransform: "uppercase", letterSpacing: 0.5,
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: P.border }} />
    </div>
  );
}

function ChatBubble({ m }: { m: ChatMsg }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mine = !!m.mine;
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-end",
      flexDirection: mine ? "row-reverse" : "row",
    }}>
      {!mine && <Avatar initials={m.initials} size={28} bg={m.color} />}
      <div style={{ maxWidth: "72%", position: "relative" }}>
        {!mine && (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: P.textMuted, marginBottom: 2, paddingLeft: 2 }}>
            {m.author} <span style={{ fontWeight: 500, marginLeft: 4 }}>{m.time}</span>
          </div>
        )}
        <div
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
          style={{
            position: "relative",
            background: mine ? P.primary : "#f1f5f8",
            color: mine ? "#fff" : P.text,
            padding: m.attachment ? "8px 10px" : "8px 12px",
            borderRadius: 12,
            borderTopRightRadius: mine ? 4 : 12,
            borderTopLeftRadius: mine ? 12 : 4,
            fontSize: 13, lineHeight: 1.45,
            boxShadow: "0 1px 2px rgba(20,30,40,0.06)",
          }}
        >
          {m.text && <div>{m.text}</div>}
          {m.attachment && (
            <div style={{
              marginTop: m.text ? 8 : 0,
              display: "flex", alignItems: "center", gap: 10,
              background: mine ? "rgba(255,255,255,0.10)" : "#fff",
              border: `1px solid ${mine ? "rgba(255,255,255,0.18)" : P.border}`,
              borderRadius: 10, padding: "8px 10px",
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: m.attachment.kind === "pdf" ? "#fde4e7"
                  : m.attachment.kind === "image" ? "#e7f4ec" : "#eef4fa",
                color: m.attachment.kind === "pdf" ? "#a01633"
                  : m.attachment.kind === "image" ? "#2f7d52" : "#1e3a52",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {m.attachment.kind === "pdf" ? <FileText size={15} />
                  : m.attachment.kind === "image" ? <ImageIcon size={15} />
                  : <FileIcon size={15} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700,
                  color: mine ? "#fff" : P.text,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.attachment.name}
                </div>
                <div style={{ fontSize: 10.5, opacity: mine ? 0.8 : 0.7 }}>
                  {m.attachment.size} · {m.attachment.kind.toUpperCase()}
                </div>
              </div>
              <Download size={14} style={{ opacity: 0.8 }} />
            </div>
          )}

          {/* Menu de mensagem (hover) */}
          {menuOpen && (
            <div style={{
              position: "absolute", top: -10, [mine ? "left" : "right"]: -8,
              background: "#fff", border: `1px solid ${P.border}`, borderRadius: 8,
              boxShadow: "0 6px 16px rgba(20,30,40,0.12)", display: "flex", padding: 2,
            } as React.CSSProperties}>
              <button title="Responder" style={msgMenuBtn}><CornerUpLeft size={13} /></button>
              <button title="Deletar" style={{ ...msgMenuBtn, color: P.accent }}><Trash2 size={13} /></button>
            </div>
          )}
        </div>
        {mine && (
          <div style={{ fontSize: 10.5, color: P.textMuted, marginTop: 2, textAlign: "right", paddingRight: 4 }}>
            {m.time} · enviada
          </div>
        )}
      </div>
    </div>
  );
}

const msgMenuBtn: React.CSSProperties = {
  width: 26, height: 24, border: "none", background: "transparent",
  color: P.textMuted, cursor: "pointer", borderRadius: 6,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

/* ----- Mobile chat (galeria) ----- */
export function MobileChat() {
  const [view, setView] = useState<"list" | "conv">("list");
  const active = CHAT_CONVERSATIONS[1];
  return (
    <>
      <div style={{ background: P.primaryDark, color: "#fff", padding: "10px 12px",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {view === "conv" && (
          <button onClick={() => setView("list")} style={{
            background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 0,
          }}><ArrowLeft size={16} /></button>
        )}
        <MessageSquare size={14} />
        <strong style={{ fontSize: 12.5 }}>{view === "list" ? "Chat interno" : active.name}</strong>
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.75 }}>
          {view === "list" ? `${CHAT_CONVERSATIONS.reduce((a,c)=>a+c.unread,0)} novas` : "Online"}
        </span>
      </div>

      {view === "list" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fafbfc" }}>
          <div style={{ padding: 8 }}>
            <div style={{ position: "relative" }}>
              <Search size={12} style={{ position: "absolute", left: 9, top: 9, color: P.textMuted }} />
              <input placeholder="Buscar conversa" style={{
                width: "100%", height: 30, borderRadius: 8, border: `1px solid ${P.border}`,
                background: "#fff", padding: "0 10px 0 26px", fontSize: 12, outline: "none", fontFamily: fontStack,
              }} />
            </div>
          </div>
          {CHAT_CONVERSATIONS.slice(0, 7).map((c) => (
            <button key={c.id} onClick={() => setView("conv")} style={{
              width: "100%", display: "flex", gap: 8, alignItems: "center",
              padding: "8px 10px", border: "none", background: "transparent",
              borderBottom: `1px solid ${P.borderSoft}`, cursor: "pointer", textAlign: "left",
            }}>
              <Avatar initials={c.initials} size={32} bg={c.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: P.text, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: P.textMuted }}>{c.lastTime}</span>
                </div>
                <div style={{ fontSize: 11, color: P.textMuted,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
              </div>
              {c.unread > 0 && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 999, background: P.accent, color: "#fff",
                  fontSize: 9.5, fontWeight: 800, padding: "0 5px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {view === "conv" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8,
            background: "linear-gradient(180deg, #fafbfc 0%, #fff 100%)" }}>
            <ChatDateSep label="Hoje" />
            {(CHAT_MESSAGES["g-geral"] ?? []).filter((m) => !m.dateSep).slice(0, 5).map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 6,
                flexDirection: m.mine ? "row-reverse" : "row", alignItems: "flex-end" }}>
                {!m.mine && <Avatar initials={m.initials} size={22} bg={m.color} />}
                <div style={{
                  maxWidth: "78%", padding: "6px 10px", fontSize: 11.5, lineHeight: 1.4,
                  background: m.mine ? P.primary : "#f1f5f8",
                  color: m.mine ? "#fff" : P.text,
                  borderRadius: 10,
                  borderTopRightRadius: m.mine ? 3 : 10,
                  borderTopLeftRadius: m.mine ? 10 : 3,
                }}>
                  {!m.mine && <div style={{ fontSize: 9.5, fontWeight: 800, color: P.textMuted, marginBottom: 2 }}>{m.author}</div>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, padding: 8, background: "#fff",
            display: "flex", alignItems: "center", gap: 6 }}>
            <Paperclip size={14} color={P.textMuted} />
            <input placeholder="Mensagem…" style={{
              flex: 1, height: 30, borderRadius: 8, border: `1px solid ${P.border}`,
              padding: "0 10px", fontSize: 12, outline: "none", fontFamily: fontStack,
            }} />
            <button style={{
              background: P.accent, color: "#fff", border: "none", borderRadius: 8,
              height: 30, width: 36, cursor: "pointer", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
            }}><Send size={13} /></button>
          </div>
        </>
      )}
    </>
  );
}
