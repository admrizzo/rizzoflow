/**
 * /design-preview — Prévia visual comparativa do Rizzo Flow.
 * NÃO afeta o sistema real. Apenas demonstração de 3 direções visuais.
 *
 * Variações:
 *  A) Operacional Claro Suave  — recomendada (default)
 *  B) Administrativo Denso     — alta densidade informacional
 *  C) Focus / Semi-dark        — topo/lateral escuros, conteúdo claro
 *
 * Cenários por variação:
 *  1. Dashboard / Kanban (header + abas + Kanban)
 *  2. Modal "Gerar nova proposta"
 *  3. Card operacional aberto
 *  4. Minha Fila
 *  5. Central de Propostas
 *  6. Métricas
 *  7. Administração / Usuários
 *  8. Prévia mobile
 *  + Bloco "O que melhora / Possíveis riscos"
 */

import { useMemo, useState } from "react";
import {
  Search,
  Bell,
  RefreshCw,
  ListChecks,
  FileText,
  Plus,
  Filter,
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Users,
  BarChart3,
  Inbox,
  Home,
  Building2,
  User,
  Copy,
  Link2,
  Send,
  Paperclip,
  MessageSquare,
  ChevronRight,
  Smartphone,
  Settings,
  Mail,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";

/* =========================================================================
 * Paleta base (apenas para esta rota — não toca tokens do sistema)
 * ========================================================================= */
const PALETTE = {
  primary: "#344650",
  primarySoft: "#48606C",
  accent: "#e50046",
  success: "#61ac81",
  warning: "#f0ae00",
  info: "#658bc8",
  bg: "#f7f9fb",
  card: "#ffffff",
  border: "#e6ebf0",
  text: "#1f2a30",
  textMuted: "#6b7a83",
  // status (discretos)
  statusReceived: "#e7f4ec",
  statusReceivedFg: "#2f7d52",
  statusFilling: "#fff5d9",
  statusFillingFg: "#8a6a00",
  statusCorrection: "#ffe7d6",
  statusCorrectionFg: "#a04a14",
  statusPending: "#fde4e7",
  statusPendingFg: "#a01633",
  statusLate: "#f8c9cf",
  statusLateFg: "#7d0c25",
  statusDone: "#dff1e6",
  statusDoneFg: "#2a6a48",
  statusNeutral: "#eef2f5",
  statusNeutralFg: "#5b6a73",
};

type VariationId = "A" | "B" | "C";

interface VariationTheme {
  id: VariationId;
  label: string;
  tagline: string;
  // shell
  pageBg: string;
  headerBg: string;
  headerFg: string;
  headerSubFg: string;
  sideBg?: string;
  sideFg?: string;
  // cards
  cardBg: string;
  cardBorder: string;
  cardRadius: number;
  cardShadow: string;
  // density
  density: "comfortable" | "dense" | "balanced";
  // kanban col
  colBg: string;
  colHeaderFg: string;
  // accents
  accent: string;
  primary: string;
  // texto
  text: string;
  textMuted: string;
  // melhorias / riscos
  improvements: string[];
  risks: string[];
}

const VARIATIONS: Record<VariationId, VariationTheme> = {
  A: {
    id: "A",
    label: "A — Operacional Claro Suave",
    tagline: "Recomendada · profissional, calma, confortável para o dia inteiro",
    pageBg: PALETTE.bg,
    headerBg: "#ffffff",
    headerFg: PALETTE.text,
    headerSubFg: PALETTE.textMuted,
    cardBg: PALETTE.card,
    cardBorder: PALETTE.border,
    cardRadius: 10,
    cardShadow: "0 1px 2px rgba(20,30,40,0.04), 0 1px 1px rgba(20,30,40,0.03)",
    density: "comfortable",
    colBg: "#eef2f5",
    colHeaderFg: PALETTE.text,
    accent: PALETTE.accent,
    primary: PALETTE.primary,
    text: PALETTE.text,
    textMuted: PALETTE.textMuted,
    improvements: [
      "Fundo off-white reduz fadiga visual em jornadas longas",
      "Hierarquia clara: header neutro, card como protagonista",
      "Status comunicam por cor sem poluir a tela",
      "Pouco azul saturado — sensação calma e profissional",
    ],
    risks: [
      "Pode parecer 'pouco impactante' para quem espera UI mais marcada",
      "Exige disciplina nos contrastes — alguns textos secundários podem ficar fracos",
    ],
  },
  B: {
    id: "B",
    label: "B — Administrativo Denso",
    tagline: "Mais informação por tela · ideal para acompanhar muitos processos",
    pageBg: "#f4f6f8",
    headerBg: "#ffffff",
    headerFg: PALETTE.text,
    headerSubFg: PALETTE.textMuted,
    cardBg: PALETTE.card,
    cardBorder: "#dfe5ea",
    cardRadius: 6,
    cardShadow: "0 1px 0 rgba(20,30,40,0.04)",
    density: "dense",
    colBg: "#e9eef2",
    colHeaderFg: PALETTE.text,
    accent: PALETTE.accent,
    primary: PALETTE.primary,
    text: PALETTE.text,
    textMuted: "#5e6c75",
    improvements: [
      "Mais cards visíveis sem rolar — bom para gestores e administrativo",
      "Tipografia compacta, indicadores em pontos coloridos",
      "Tabelas e listas ganham eficiência",
    ],
    risks: [
      "Densidade alta pode cansar usuários menos experientes",
      "Touch targets menores prejudicam mobile",
      "Precisa de boa hierarquia para não virar 'planilha'",
    ],
  },
  C: {
    id: "C",
    label: "C — Focus / Semi-dark",
    tagline: "Topo e lateral escuros · conteúdo claro · foco no card",
    pageBg: PALETTE.bg,
    headerBg: "#1f2a30",
    headerFg: "#ffffff",
    headerSubFg: "#bcc7cd",
    sideBg: "#263238",
    sideFg: "#dfe6ea",
    cardBg: PALETTE.card,
    cardBorder: PALETTE.border,
    cardRadius: 12,
    cardShadow: "0 2px 6px rgba(20,30,40,0.06)",
    density: "balanced",
    colBg: "#eef2f5",
    colHeaderFg: PALETTE.text,
    accent: PALETTE.accent,
    primary: PALETTE.primary,
    text: PALETTE.text,
    textMuted: PALETTE.textMuted,
    improvements: [
      "Topo escuro reforça identidade e ajuda a 'sumir' a navegação",
      "Conteúdo claro mantém leitura confortável",
      "Boa percepção de foco no card aberto",
    ],
    risks: [
      "Contraste forte pode parecer 'pesado' em telas pequenas",
      "Usuários acostumados a UI clara podem estranhar",
      "Exige cuidado com sombras e estados hover na barra escura",
    ],
  },
};

/* =========================================================================
 * Dados fictícios realistas (Rizzo Flow — locação/vendas)
 * ========================================================================= */

const FLOW_TABS = [
  { id: "loc", label: "Locação", count: 38 },
  { id: "ven", label: "Vendas", count: 14 },
];

interface KCard {
  id: string;
  code: string;
  title: string;
  address: string;
  broker: string;
  brokerInitials: string;
  status:
    | "received"
    | "filling"
    | "correction"
    | "pending"
    | "late"
    | "done"
    | "neutral";
  statusLabel: string;
  deadline: string;
  alerts?: string[];
  value?: string;
}

const COLUMNS: { id: string; title: string; cards: KCard[] }[] = [
  {
    id: "captacao",
    title: "Captação",
    cards: [
      {
        id: "c1",
        code: "LOC-2841",
        title: "Apto 802 · Ed. Solar Boulevard",
        address: "R. Voluntários da Pátria, 1820 — Higienópolis",
        broker: "Marina Castro",
        brokerInitials: "MC",
        status: "filling",
        statusLabel: "Em preenchimento",
        deadline: "2 dias",
        value: "R$ 4.200/mês",
      },
      {
        id: "c2",
        code: "LOC-2840",
        title: "Casa térrea · Jd. Botânico",
        address: "R. das Acácias, 412",
        broker: "Felipe Andrade",
        brokerInitials: "FA",
        status: "neutral",
        statusLabel: "Sem responsável",
        deadline: "—",
        value: "R$ 6.500/mês",
      },
    ],
  },
  {
    id: "documentos",
    title: "Documentos",
    cards: [
      {
        id: "c3",
        code: "LOC-2837",
        title: "Cobertura · Ed. Mirante",
        address: "Av. Beira Mar, 2210 — apto 1601",
        broker: "Patrícia Lima",
        brokerInitials: "PL",
        status: "received",
        statusLabel: "Doc. recebidos",
        deadline: "Hoje",
        value: "R$ 9.800/mês",
      },
      {
        id: "c4",
        code: "LOC-2835",
        title: "Sala comercial · Ed. Cidade",
        address: "R. XV de Novembro, 890 — sala 712",
        broker: "Rafael Souza",
        brokerInitials: "RS",
        status: "correction",
        statusLabel: "Correção solicitada",
        deadline: "Amanhã",
        alerts: ["3 itens em correção"],
        value: "R$ 3.100/mês",
      },
      {
        id: "c5",
        code: "LOC-2832",
        title: "Apto 304 · Vila Mariana",
        address: "R. Domingos de Morais, 1050",
        broker: "Camila Ribeiro",
        brokerInitials: "CR",
        status: "pending",
        statusLabel: "Pendência",
        deadline: "Em 3 dias",
        value: "R$ 3.450/mês",
      },
    ],
  },
  {
    id: "analise",
    title: "Análise",
    cards: [
      {
        id: "c6",
        code: "LOC-2828",
        title: "Studio · Pinheiros",
        address: "R. dos Pinheiros, 778 — apto 51",
        broker: "Marina Castro",
        brokerInitials: "MC",
        status: "late",
        statusLabel: "Atrasado",
        deadline: "−2 dias",
        alerts: ["SLA estourado"],
        value: "R$ 2.700/mês",
      },
      {
        id: "c7",
        code: "LOC-2825",
        title: "Apto 1102 · Jd. Europa",
        address: "Al. Gabriel Monteiro, 233",
        broker: "Felipe Andrade",
        brokerInitials: "FA",
        status: "filling",
        statusLabel: "Em análise",
        deadline: "5 dias",
        value: "R$ 7.200/mês",
      },
    ],
  },
  {
    id: "contrato",
    title: "Contrato",
    cards: [
      {
        id: "c8",
        code: "LOC-2820",
        title: "Casa em condomínio · Granja",
        address: "Cond. Quintas do Lago, casa 14",
        broker: "Patrícia Lima",
        brokerInitials: "PL",
        status: "done",
        statusLabel: "Concluído",
        deadline: "Pronto",
        value: "R$ 8.900/mês",
      },
    ],
  },
];

/* =========================================================================
 * Helpers de status
 * ========================================================================= */

function statusColors(status: KCard["status"]) {
  switch (status) {
    case "received":
      return { bg: PALETTE.statusReceived, fg: PALETTE.statusReceivedFg, dot: PALETTE.success };
    case "filling":
      return { bg: PALETTE.statusFilling, fg: PALETTE.statusFillingFg, dot: PALETTE.warning };
    case "correction":
      return { bg: PALETTE.statusCorrection, fg: PALETTE.statusCorrectionFg, dot: "#d97a2a" };
    case "pending":
      return { bg: PALETTE.statusPending, fg: PALETTE.statusPendingFg, dot: "#c9344f" };
    case "late":
      return { bg: PALETTE.statusLate, fg: PALETTE.statusLateFg, dot: "#a4112a" };
    case "done":
      return { bg: PALETTE.statusDone, fg: PALETTE.statusDoneFg, dot: PALETTE.success };
    default:
      return { bg: PALETTE.statusNeutral, fg: PALETTE.statusNeutralFg, dot: "#9aa6ad" };
  }
}

/* =========================================================================
 * Pequenos componentes reutilizáveis
 * ========================================================================= */

function Pill({
  children,
  bg,
  fg,
  size = "sm",
}: {
  children: React.ReactNode;
  bg: string;
  fg: string;
  size?: "xs" | "sm";
}) {
  const px = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${px}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function Avatar({ initials, size = 24, color = PALETTE.primary }: { initials: string; size?: number; color?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  );
}

function SectionTitle({ children, theme }: { children: React.ReactNode; theme: VariationTheme }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
      {children}
    </h3>
  );
}

/* =========================================================================
 * Header / Topbar
 * ========================================================================= */

function Topbar({ theme, onOpenProposta }: { theme: VariationTheme; onOpenProposta: () => void }) {
  const isDark = theme.id === "C";
  return (
    <header
      className="flex items-center gap-4 border-b px-5"
      style={{
        backgroundColor: theme.headerBg,
        color: theme.headerFg,
        borderColor: isDark ? "#1a242a" : theme.cardBorder,
        height: theme.density === "dense" ? 52 : 60,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md font-bold"
          style={{
            backgroundColor: theme.accent,
            color: "#fff",
          }}
        >
          R
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Rizzo Flow</div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.headerSubFg }}>
            Operação imobiliária
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="ml-4 flex-1 max-w-xl">
        <div
          className="flex items-center gap-2 rounded-md border px-3"
          style={{
            backgroundColor: isDark ? "#2a363c" : "#f4f6f8",
            borderColor: isDark ? "#34434a" : theme.cardBorder,
            height: theme.density === "dense" ? 32 : 36,
          }}
        >
          <Search className="h-4 w-4" style={{ color: theme.headerSubFg }} />
          <input
            placeholder="Buscar proposta, imóvel, locatário…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: theme.headerFg }}
          />
          <kbd
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{
              backgroundColor: isDark ? "#34434a" : "#e9edf1",
              color: theme.headerSubFg,
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Ações */}
      <button
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:opacity-90"
        style={{
          color: theme.headerFg,
          backgroundColor: isDark ? "#2a363c" : "transparent",
          border: isDark ? "1px solid #34434a" : `1px solid ${theme.cardBorder}`,
        }}
      >
        <Inbox className="h-3.5 w-3.5" /> Minha Fila
        <span
          className="ml-1 rounded-full px-1.5 py-0 text-[10px] font-bold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          7
        </span>
      </button>
      <button
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:opacity-90"
        style={{
          color: theme.headerFg,
          backgroundColor: isDark ? "#2a363c" : "transparent",
          border: isDark ? "1px solid #34434a" : `1px solid ${theme.cardBorder}`,
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Sincronizar
      </button>
      <button
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:opacity-90"
        style={{
          color: theme.headerFg,
          backgroundColor: isDark ? "#2a363c" : "transparent",
          border: isDark ? "1px solid #34434a" : `1px solid ${theme.cardBorder}`,
        }}
      >
        <FileText className="h-3.5 w-3.5" /> Propostas
      </button>

      <button
        onClick={onOpenProposta}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        style={{ backgroundColor: theme.accent }}
      >
        <Plus className="h-3.5 w-3.5" /> Gerar nova proposta
      </button>

      <div className="ml-2 flex items-center gap-3">
        <button className="relative">
          <Bell className="h-4 w-4" style={{ color: theme.headerFg }} />
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
        </button>
        <div className="flex items-center gap-2">
          <Avatar initials="GL" size={28} color={theme.primary} />
          {!isDark ? (
            <div className="leading-tight">
              <div className="text-xs font-semibold" style={{ color: theme.text }}>Guilherme L.</div>
              <div className="text-[10px]" style={{ color: theme.textMuted }}>Admin</div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
 * Sub-nav (abas de fluxo + filtros)
 * ========================================================================= */

function FlowNav({
  theme,
  view,
  setView,
}: {
  theme: VariationTheme;
  view: string;
  setView: (v: string) => void;
}) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "fila", label: "Minha Fila", icon: Inbox },
    { id: "central", label: "Central de Propostas", icon: FileText },
    { id: "metricas", label: "Métricas", icon: BarChart3 },
    { id: "admin", label: "Administração", icon: Settings },
  ];
  const isDark = theme.id === "C";
  return (
    <div
      className="flex items-center gap-1 border-b px-5"
      style={{
        backgroundColor: isDark ? theme.sideBg : theme.headerBg,
        borderColor: isDark ? "#1a242a" : theme.cardBorder,
        height: theme.density === "dense" ? 40 : 44,
      }}
    >
      {items.map((it) => {
        const active = view === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className="relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              color: active
                ? isDark
                  ? "#fff"
                  : theme.text
                : isDark
                ? theme.sideFg
                : theme.textMuted,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
            {active && (
              <span
                className="absolute -bottom-px left-2 right-2 h-0.5 rounded-t"
                style={{ backgroundColor: theme.accent }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function FlowTabs({ theme }: { theme: VariationTheme }) {
  const [active, setActive] = useState("loc");
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2">
        {FLOW_TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: isActive ? theme.primary : theme.cardBg,
                borderColor: isActive ? theme.primary : theme.cardBorder,
                color: isActive ? "#fff" : theme.text,
              }}
            >
              {t.label}
              <span
                className="rounded-full px-1.5 py-0 text-[10px] font-bold"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "#eef2f5",
                  color: isActive ? "#fff" : theme.textMuted,
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
          style={{ borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.cardBg }}
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
          style={{ borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.cardBg }}
        >
          Quadro: Locação SP <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
 * Kanban
 * ========================================================================= */

function KanbanCardItem({
  card,
  theme,
  onOpen,
}: {
  card: KCard;
  theme: VariationTheme;
  onOpen: () => void;
}) {
  const sc = statusColors(card.status);
  const dense = theme.density === "dense";
  return (
    <button
      onClick={onOpen}
      className="w-full text-left transition-shadow hover:shadow-md"
      style={{
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: theme.cardRadius,
        boxShadow: theme.cardShadow,
        padding: dense ? "8px 10px" : "12px 12px",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wide" style={{ color: theme.textMuted }}>
          {card.code}
        </span>
        <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textMuted }}>
          <Clock className="h-3 w-3" /> {card.deadline}
        </span>
      </div>
      <div
        className={`mt-1 font-semibold leading-tight ${dense ? "text-[12.5px]" : "text-[13.5px]"}`}
        style={{ color: theme.text }}
      >
        {card.title}
      </div>
      {!dense && (
        <div className="mt-0.5 truncate text-[11px]" style={{ color: theme.textMuted }}>
          {card.address}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {dense ? (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: sc.dot }}
              title={card.statusLabel}
            />
          ) : (
            <Pill bg={sc.bg} fg={sc.fg} size="xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
              {card.statusLabel}
            </Pill>
          )}
          {card.alerts?.map((a) => (
            <Pill key={a} bg="#fde4e7" fg="#a01633" size="xs">
              <AlertTriangle className="h-2.5 w-2.5" /> {a}
            </Pill>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {card.value && (
            <span className="text-[10.5px] font-semibold" style={{ color: theme.text }}>
              {card.value}
            </span>
          )}
          <Avatar initials={card.brokerInitials} size={dense ? 18 : 22} color={theme.primary} />
        </div>
      </div>
    </button>
  );
}

function KanbanBoardPreview({
  theme,
  onOpenCard,
}: {
  theme: VariationTheme;
  onOpenCard: () => void;
}) {
  const dense = theme.density === "dense";
  return (
    <div className="px-5 pb-5">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))` }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex flex-col rounded-lg p-2"
            style={{ backgroundColor: theme.colBg }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: theme.colHeaderFg }}
                >
                  {col.title}
                </span>
                <span
                  className="rounded-full bg-white px-1.5 py-0 text-[10px] font-semibold"
                  style={{ color: theme.textMuted, border: `1px solid ${theme.cardBorder}` }}
                >
                  {col.cards.length}
                </span>
              </div>
              <button className="text-[11px]" style={{ color: theme.textMuted }}>
                +
              </button>
            </div>
            <div className={dense ? "space-y-1.5" : "space-y-2"}>
              {col.cards.map((c) => (
                <KanbanCardItem key={c.id} card={c} theme={theme} onOpen={onOpenCard} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * Modal "Gerar nova proposta"
 * ========================================================================= */

function NovaPropostaModal({
  theme,
  onClose,
}: {
  theme: VariationTheme;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden"
        style={{
          backgroundColor: theme.cardBg,
          borderRadius: theme.cardRadius + 4,
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: "0 20px 60px rgba(20,30,40,0.25)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: theme.cardBorder }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: theme.text }}>
              Gerar nova proposta · Locação
            </div>
            <div className="text-[11px]" style={{ color: theme.textMuted }}>
              Etapa {step} de 3
            </div>
          </div>
          <button onClick={onClose}>
            <X className="h-4 w-4" style={{ color: theme.textMuted }} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Stepper */}
          <div className="mb-4 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-1 items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor: n <= step ? theme.accent : "#eef2f5",
                    color: n <= step ? "#fff" : theme.textMuted,
                  }}
                >
                  {n}
                </div>
                {n < 3 && (
                  <div
                    className="h-0.5 flex-1 rounded"
                    style={{ backgroundColor: n < step ? theme.accent : "#eef2f5" }}
                  />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <SectionTitle theme={theme}>Imóvel</SectionTitle>
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-2"
                style={{ borderColor: theme.cardBorder }}
              >
                <Search className="h-4 w-4" style={{ color: theme.textMuted }} />
                <input
                  defaultValue="Higienópolis 802"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: theme.text }}
                />
              </div>
              <div className="space-y-2">
                {[
                  { code: "IM-08231", title: "Apto 802 · Ed. Solar Boulevard", addr: "R. Voluntários da Pátria, 1820 — Higienópolis", val: "R$ 4.200/mês" },
                  { code: "IM-08229", title: "Apto 1102 · Higienópolis Plaza", addr: "R. Maranhão, 540", val: "R$ 5.800/mês" },
                ].map((p, i) => (
                  <div
                    key={p.code}
                    className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-black/[0.02]"
                    style={{ borderColor: theme.cardBorder, backgroundColor: i === 0 ? "#f5fbf7" : theme.cardBg }}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4" style={{ color: theme.textMuted }} />
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: theme.text }}>
                          {p.title}
                        </div>
                        <div className="text-[11px]" style={{ color: theme.textMuted }}>
                          {p.code} · {p.addr}
                        </div>
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold" style={{ color: theme.text }}>
                      {p.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <SectionTitle theme={theme}>Corretor responsável</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { n: "Marina Castro", i: "MC", q: "Higienópolis · 12 ativas" },
                  { n: "Felipe Andrade", i: "FA", q: "Pinheiros · 7 ativas" },
                  { n: "Patrícia Lima", i: "PL", q: "Beira Mar · 9 ativas" },
                  { n: "Rafael Souza", i: "RS", q: "Centro · 5 ativas" },
                ].map((b, i) => (
                  <div
                    key={b.n}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                    style={{
                      borderColor: i === 0 ? theme.accent : theme.cardBorder,
                      backgroundColor: i === 0 ? "#fff5f7" : theme.cardBg,
                    }}
                  >
                    <Avatar initials={b.i} size={32} color={theme.primary} />
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: theme.text }}>
                        {b.n}
                      </div>
                      <div className="text-[11px]" style={{ color: theme.textMuted }}>
                        {b.q}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <SectionTitle theme={theme}>Link da proposta gerado</SectionTitle>
              <div
                className="rounded-md border p-4 text-center"
                style={{ borderColor: theme.cardBorder, backgroundColor: "#f5fbf7" }}
              >
                <CheckCircle2 className="mx-auto h-8 w-8" style={{ color: PALETTE.success }} />
                <div className="mt-2 text-[13px] font-semibold" style={{ color: theme.text }}>
                  Proposta LOC-2842 criada com sucesso
                </div>
                <div className="text-[11px]" style={{ color: theme.textMuted }}>
                  Envie o link ao locatário para preenchimento dos documentos.
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-2"
                style={{ borderColor: theme.cardBorder, backgroundColor: "#f7f9fb" }}
              >
                <Link2 className="h-4 w-4" style={{ color: theme.textMuted }} />
                <code className="flex-1 truncate text-[11.5px]" style={{ color: theme.text }}>
                  https://seurizzo.com.br/proposta/9f3a-21bd-4c88-2842
                </code>
                <button
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Copy className="h-3 w-3" /> Copiar
                </button>
                <button
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Send className="h-3 w-3" /> Enviar
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t px-5 py-3"
          style={{ borderColor: theme.cardBorder, backgroundColor: "#fafbfc" }}
        >
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ color: theme.textMuted }}
          >
            Voltar
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Avançar
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: theme.primary }}
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * Card operacional aberto
 * ========================================================================= */

function CardDetailPreview({
  theme,
  onClose,
}: {
  theme: VariationTheme;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-5xl flex-col"
        style={{ backgroundColor: theme.pageBg }}
      >
        {/* Header do card */}
        <div
          className="flex items-start justify-between border-b px-5 py-3"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: theme.textMuted }}>
                LOC-2837
              </span>
              <Pill bg={PALETTE.statusReceived} fg={PALETTE.statusReceivedFg}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PALETTE.success }} />
                Doc. recebidos
              </Pill>
              <Pill bg="#eef2f5" fg={PALETTE.textMuted}>
                Etapa: Documentos
              </Pill>
              <Pill bg={PALETTE.statusFilling} fg={PALETTE.statusFillingFg}>
                <Clock className="h-2.5 w-2.5" /> SLA: hoje
              </Pill>
            </div>
            <h2 className="mt-1 text-[17px] font-semibold tracking-tight" style={{ color: theme.text }}>
              Cobertura · Ed. Mirante — apto 1601
            </h2>
            <div className="text-[12px]" style={{ color: theme.textMuted }}>
              Av. Beira Mar, 2210 · Locatário: Mariana e Bruno Teixeira · R$ 9.800/mês
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md px-2.5 py-1.5 text-xs font-medium"
              style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text }}
            >
              Solicitar correção
            </button>
            <button
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: theme.primary }}
            >
              Avançar etapa
            </button>
            <button onClick={onClose}>
              <X className="h-4 w-4" style={{ color: theme.textMuted }} />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="grid flex-1 grid-cols-12 gap-4 overflow-y-auto p-4">
          {/* coluna principal */}
          <div className="col-span-8 space-y-4">
            {/* Próxima ação */}
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderLeft: `3px solid ${theme.accent}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" style={{ color: theme.accent }} />
                <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>
                  Próxima ação
                </span>
              </div>
              <div className="mt-1 text-[13.5px] font-semibold" style={{ color: theme.text }}>
                Validar comprovante de renda do locatário titular
              </div>
              <div className="text-[11.5px]" style={{ color: theme.textMuted }}>
                Responsável: Patrícia Lima · Prazo: hoje, 18h
              </div>
            </div>

            {/* Andamento */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle theme={theme}>Andamento da proposta</SectionTitle>
                <span className="text-[11px]" style={{ color: theme.textMuted }}>
                  4 de 7 etapas
                </span>
              </div>
              <div className="flex items-center gap-1">
                {["Captação", "Documentos", "Análise", "Vistoria", "Contrato", "Assinatura", "Concluído"].map((e, i) => {
                  const done = i < 3;
                  const current = i === 3;
                  return (
                    <div key={e} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="h-1.5 w-full rounded-full"
                        style={{
                          backgroundColor: done
                            ? PALETTE.success
                            : current
                            ? theme.accent
                            : "#eef2f5",
                        }}
                      />
                      <span
                        className="text-[10px]"
                        style={{ color: current ? theme.accent : theme.textMuted, fontWeight: current ? 600 : 400 }}
                      >
                        {e}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documentos */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle theme={theme}>Documentos da proposta</SectionTitle>
                <button className="text-[11px] font-semibold" style={{ color: theme.accent }}>
                  + Adicionar
                </button>
              </div>
              <div className="space-y-1.5">
                {[
                  { n: "RG e CPF — Mariana Teixeira", st: "received" as const, lbl: "Recebido" },
                  { n: "Comprovante de renda — Mariana", st: "received" as const, lbl: "Recebido" },
                  { n: "RG e CPF — Bruno Teixeira", st: "correction" as const, lbl: "Correção solicitada" },
                  { n: "Comprovante de residência", st: "filling" as const, lbl: "Em preenchimento" },
                  { n: "Carta de fiança bancária", st: "pending" as const, lbl: "Pendente" },
                ].map((d) => {
                  const sc = statusColors(d.st);
                  return (
                    <div
                      key={d.n}
                      className="flex items-center justify-between rounded-md px-2.5 py-1.5"
                      style={{ backgroundColor: "#fafbfc", border: `1px solid ${theme.cardBorder}` }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
                        <span className="text-[12.5px]" style={{ color: theme.text }}>
                          {d.n}
                        </span>
                      </div>
                      <Pill bg={sc.bg} fg={sc.fg} size="xs">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: sc.dot }}
                        />
                        {d.lbl}
                      </Pill>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Correção */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "#fff7f1",
                border: `1px solid #f5d8c1`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: "#a04a14" }} />
                <SectionTitle theme={theme}>Correção solicitada · RG e CPF — Bruno Teixeira</SectionTitle>
              </div>
              <p className="mt-2 text-[12.5px]" style={{ color: theme.text }}>
                "Documento ilegível na parte de baixo. Reenvie um novo escaneamento mostrando o número de
                CPF e a foto completos."
              </p>
              <div className="mt-2 text-[11px]" style={{ color: theme.textMuted }}>
                Solicitado por Patrícia Lima · há 2h · aguardando reenvio do locatário
              </div>
            </div>

            {/* Checklist */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle theme={theme}>Checklist da etapa</SectionTitle>
                <span className="text-[11px]" style={{ color: theme.textMuted }}>
                  3 de 5 concluídos
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  { l: "Conferir documentos pessoais dos locatários", d: true },
                  { l: "Validar comprovantes de renda", d: true },
                  { l: "Conferir comprovante de residência", d: false },
                  { l: "Validar carta de fiança / seguro fiança", d: false },
                  { l: "Confirmar assinaturas digitalizadas", d: true },
                ].map((c) => (
                  <div key={c.l} className="flex items-center gap-2">
                    {c.d ? (
                      <CheckCircle2 className="h-4 w-4" style={{ color: PALETTE.success }} />
                    ) : (
                      <CircleDashed className="h-4 w-4" style={{ color: theme.textMuted }} />
                    )}
                    <span
                      className="text-[12.5px]"
                      style={{
                        color: c.d ? theme.textMuted : theme.text,
                        textDecoration: c.d ? "line-through" : "none",
                      }}
                    >
                      {c.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dados da proposta */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="mb-3"><SectionTitle theme={theme}>Dados da proposta</SectionTitle></div>
              <div className="grid grid-cols-3 gap-3 text-[12px]">
                {[
                  ["Valor do aluguel", "R$ 9.800,00"],
                  ["Condomínio", "R$ 1.250,00"],
                  ["IPTU", "R$ 380,00"],
                  ["Garantia", "Seguro fiança · Porto"],
                  ["Início pretendido", "15/06/2026"],
                  ["Vigência", "30 meses"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10.5px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
                      {k}
                    </div>
                    <div className="mt-0.5 font-semibold" style={{ color: theme.text }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — comentários e atividade */}
          <div className="col-span-4 space-y-4">
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="mb-2"><SectionTitle theme={theme}>Responsáveis</SectionTitle></div>
              <div className="space-y-2">
                {[
                  { n: "Patrícia Lima", i: "PL", r: "Corretora" },
                  { n: "Camila Ribeiro", i: "CR", r: "Administrativo" },
                  { n: "Guilherme L.", i: "GL", r: "Gestor" },
                ].map((p) => (
                  <div key={p.n} className="flex items-center gap-2">
                    <Avatar initials={p.i} size={26} color={theme.primary} />
                    <div className="leading-tight">
                      <div className="text-[12.5px] font-semibold" style={{ color: theme.text }}>
                        {p.n}
                      </div>
                      <div className="text-[10.5px]" style={{ color: theme.textMuted }}>
                        {p.r}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex flex-col rounded-lg"
              style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: theme.cardRadius,
              }}
            >
              <div className="border-b px-4 py-3" style={{ borderColor: theme.cardBorder }}>
                <SectionTitle theme={theme}>Comentários e atividade</SectionTitle>
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
                {[
                  {
                    i: "PL",
                    n: "Patrícia Lima",
                    t: "há 12 min",
                    msg: "Solicitei correção do RG do Bruno. Documento ilegível.",
                    type: "comment",
                  },
                  {
                    i: "CR",
                    n: "Camila Ribeiro",
                    t: "há 1h",
                    msg: "Comprovante de renda da Mariana validado ✅",
                    type: "comment",
                  },
                  {
                    i: "·",
                    n: "Sistema",
                    t: "há 2h",
                    msg: "Documento 'RG Bruno Teixeira' marcado como Correção.",
                    type: "system",
                  },
                  {
                    i: "GL",
                    n: "Guilherme L.",
                    t: "ontem",
                    msg: "Pode finalizar essa hoje, ok? @Patrícia",
                    type: "comment",
                  },
                ].map((c, i) => (
                  <div key={i} className="flex gap-2">
                    {c.type === "system" ? (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px]"
                        style={{ backgroundColor: "#eef2f5", color: theme.textMuted }}
                      >
                        ·
                      </div>
                    ) : (
                      <Avatar initials={c.i} size={26} color={theme.primary} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold" style={{ color: theme.text }}>
                          {c.n}
                        </span>
                        <span className="text-[10.5px]" style={{ color: theme.textMuted }}>
                          {c.t}
                        </span>
                      </div>
                      <p className="text-[12px]" style={{ color: c.type === "system" ? theme.textMuted : theme.text }}>
                        {c.msg}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-3" style={{ borderColor: theme.cardBorder }}>
                <div
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
                  style={{ borderColor: theme.cardBorder, backgroundColor: "#fafbfc" }}
                >
                  <MessageSquare className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
                  <input
                    placeholder="Escreva um comentário ou @mencione alguém"
                    className="flex-1 bg-transparent text-[12px] outline-none"
                    style={{ color: theme.text }}
                  />
                  <Paperclip className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
                  <button
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * Minha Fila
 * ========================================================================= */

function MinhaFilaPreview({ theme }: { theme: VariationTheme }) {
  const items = [
    { code: "LOC-2837", t: "Validar renda — Mariana Teixeira", who: "Patrícia Lima", whoI: "PL", due: "Hoje 18h", urg: "high" },
    { code: "LOC-2835", t: "Reanalisar correção — RG Bruno", who: "Patrícia Lima", whoI: "PL", due: "Amanhã", urg: "med" },
    { code: "LOC-2828", t: "SLA estourado — Análise", who: "Marina Castro", whoI: "MC", due: "−2 dias", urg: "late" },
    { code: "LOC-2825", t: "Conferir comprovante de residência", who: "Felipe Andrade", whoI: "FA", due: "5 dias", urg: "low" },
    { code: "LOC-2820", t: "Assinatura final do contrato", who: "Patrícia Lima", whoI: "PL", due: "Hoje", urg: "high" },
  ];
  const urgColor = (u: string) =>
    u === "late"
      ? statusColors("late")
      : u === "high"
      ? statusColors("pending")
      : u === "med"
      ? statusColors("filling")
      : statusColors("neutral");

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex items-center gap-2">
        <SectionTitle theme={theme}>Minha Fila</SectionTitle>
        <span className="text-[11px]" style={{ color: theme.textMuted }}>
          5 itens · ordenado por urgência
        </span>
        <div className="ml-auto flex gap-2">
          {["Tudo", "Hoje", "Atrasados", "Esta semana"].map((f, i) => (
            <button
              key={f}
              className="rounded-full border px-2.5 py-0.5 text-[11px]"
              style={{
                borderColor: theme.cardBorder,
                backgroundColor: i === 0 ? theme.primary : theme.cardBg,
                color: i === 0 ? "#fff" : theme.text,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-lg"
        style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.cardBg }}
      >
        {items.map((it, i) => {
          const sc = urgColor(it.urg);
          return (
            <div
              key={it.code}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${theme.cardBorder}`,
              }}
            >
              <span className="w-20 text-[11px] font-semibold" style={{ color: theme.textMuted }}>
                {it.code}
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: theme.text }}>
                  {it.t}
                </div>
              </div>
              <Pill bg={sc.bg} fg={sc.fg}>
                <Clock className="h-2.5 w-2.5" /> {it.due}
              </Pill>
              <div className="flex items-center gap-2">
                <Avatar initials={it.whoI} size={22} color={theme.primary} />
                <span className="text-[12px]" style={{ color: theme.text }}>
                  {it.who}
                </span>
              </div>
              <button
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                style={{ backgroundColor: theme.primary }}
              >
                Abrir
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
 * Central de Propostas
 * ========================================================================= */

function CentralPropostasPreview({ theme }: { theme: VariationTheme }) {
  const rows = [
    { code: "LOC-2841", im: "Apto 802 · Higienópolis", brk: "Marina Castro", brkI: "MC", st: "filling" as const, lbl: "Em preenchimento", val: "R$ 4.200" },
    { code: "LOC-2840", im: "Casa Jd. Botânico", brk: "—", brkI: "?", st: "neutral" as const, lbl: "Sem responsável", val: "R$ 6.500" },
    { code: "LOC-2837", im: "Cobertura Mirante 1601", brk: "Patrícia Lima", brkI: "PL", st: "received" as const, lbl: "Doc. recebidos", val: "R$ 9.800" },
    { code: "LOC-2835", im: "Sala 712 · Cidade", brk: "Rafael Souza", brkI: "RS", st: "correction" as const, lbl: "Correção", val: "R$ 3.100" },
    { code: "LOC-2832", im: "Apto 304 · Vila Mariana", brk: "Camila Ribeiro", brkI: "CR", st: "pending" as const, lbl: "Pendência", val: "R$ 3.450" },
    { code: "LOC-2828", im: "Studio · Pinheiros", brk: "Marina Castro", brkI: "MC", st: "late" as const, lbl: "Atrasado", val: "R$ 2.700" },
    { code: "LOC-2820", im: "Casa Granja", brk: "Patrícia Lima", brkI: "PL", st: "done" as const, lbl: "Concluído", val: "R$ 8.900" },
  ];

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex items-center gap-2">
        <SectionTitle theme={theme}>Central de Propostas</SectionTitle>
        <span className="text-[11px]" style={{ color: theme.textMuted }}>
          {rows.length} propostas
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-md border px-2.5 py-1"
            style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBg }}
          >
            <Search className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
            <input
              placeholder="Buscar"
              className="bg-transparent text-[12px] outline-none"
              style={{ color: theme.text, width: 160 }}
            />
          </div>
          <button
            className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-white"
            style={{ backgroundColor: theme.accent }}
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Nova
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-lg"
        style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.cardBg }}
      >
        <div
          className="grid grid-cols-[100px_1fr_180px_160px_120px_100px] gap-2 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: theme.textMuted, borderColor: theme.cardBorder, backgroundColor: "#fafbfc" }}
        >
          <span>Código</span>
          <span>Imóvel</span>
          <span>Corretor</span>
          <span>Status</span>
          <span>Valor</span>
          <span className="text-right">Ações</span>
        </div>
        {rows.map((r) => {
          const sc = statusColors(r.st);
          return (
            <div
              key={r.code}
              className="grid grid-cols-[100px_1fr_180px_160px_120px_100px] items-center gap-2 border-b px-4 py-2.5 text-[12.5px]"
              style={{ borderColor: theme.cardBorder, color: theme.text }}
            >
              <span className="font-semibold" style={{ color: theme.textMuted }}>
                {r.code}
              </span>
              <span>{r.im}</span>
              <span className="flex items-center gap-2">
                <Avatar initials={r.brkI} size={20} color={r.brk === "—" ? "#9aa6ad" : theme.primary} />
                {r.brk}
              </span>
              <Pill bg={sc.bg} fg={sc.fg}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                {r.lbl}
              </Pill>
              <span className="font-semibold">{r.val}</span>
              <div className="flex justify-end gap-1">
                <button className="rounded p-1 hover:bg-black/[0.04]" title="Abrir">
                  <FileText className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
                </button>
                <button className="rounded p-1 hover:bg-black/[0.04]" title="Copiar link">
                  <Copy className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
                </button>
                <button className="rounded p-1 hover:bg-black/[0.04]" title="Enviar">
                  <Send className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
 * Métricas
 * ========================================================================= */

function MetricasPreview({ theme }: { theme: VariationTheme }) {
  const kpis = [
    { l: "Propostas no mês", v: "127", d: "+12%", trend: "up" as const, c: theme.primary },
    { l: "Tempo médio", v: "4,8 dias", d: "−0,6 dia", trend: "up" as const, c: PALETTE.success },
    { l: "Pendências abertas", v: "23", d: "+3", trend: "down" as const, c: PALETTE.warning },
    { l: "Documentos recebidos", v: "318", d: "+41", trend: "up" as const, c: PALETTE.info },
  ];
  return (
    <div className="space-y-4 px-5 py-4">
      <SectionTitle theme={theme}>Métricas operacionais</SectionTitle>
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.l}
            className="rounded-lg p-4"
            style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius }}
          >
            <div className="text-[11px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
              {k.l}
            </div>
            <div className="mt-1 flex items-end justify-between">
              <div className="text-2xl font-bold" style={{ color: theme.text }}>
                {k.v}
              </div>
              <div
                className="flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: k.trend === "up" ? PALETTE.success : PALETTE.statusPendingFg }}
              >
                {k.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {k.d}
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#eef2f5" }}>
              <div className="h-full rounded-full" style={{ width: "62%", backgroundColor: k.c }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius }}
        >
          <div className="mb-2"><SectionTitle theme={theme}>Volume por etapa</SectionTitle></div>
          <div className="space-y-2">
            {[
              ["Captação", 18, theme.primary],
              ["Documentos", 31, PALETTE.warning],
              ["Análise", 22, PALETTE.info],
              ["Vistoria", 11, "#9aa6ad"],
              ["Contrato", 9, PALETTE.success],
            ].map(([l, v, c]: any) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-20 text-[11.5px]" style={{ color: theme.text }}>{l}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "#eef2f5" }}>
                  <div className="h-full" style={{ width: `${v * 2.5}%`, backgroundColor: c }} />
                </div>
                <span className="w-8 text-right text-[11.5px] font-semibold" style={{ color: theme.text }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius }}
        >
          <div className="mb-2"><SectionTitle theme={theme}>Pendências por corretor</SectionTitle></div>
          <div className="space-y-2">
            {[
              ["Patrícia Lima", "PL", 7],
              ["Marina Castro", "MC", 5],
              ["Felipe Andrade", "FA", 4],
              ["Rafael Souza", "RS", 3],
              ["Camila Ribeiro", "CR", 2],
            ].map(([n, i, v]: any) => (
              <div key={n} className="flex items-center gap-2">
                <Avatar initials={i} size={22} color={theme.primary} />
                <span className="flex-1 text-[12px]" style={{ color: theme.text }}>{n}</span>
                <Pill bg="#eef2f5" fg={theme.textMuted}>{v} abertos</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * Administração / Usuários
 * ========================================================================= */

function AdminPreview({ theme }: { theme: VariationTheme }) {
  const users = [
    { n: "Guilherme Lacerda", i: "GL", e: "guilherme.lacerda@rizzoimobiliaria.com", role: "Admin", st: "ativo" },
    { n: "Patrícia Lima", i: "PL", e: "patricia.lima@rizzoimobiliaria.com", role: "Corretor", st: "ativo" },
    { n: "Camila Ribeiro", i: "CR", e: "camila.ribeiro@rizzoimobiliaria.com", role: "Administrativo", st: "ativo" },
    { n: "Marina Castro", i: "MC", e: "marina.castro@rizzoimobiliaria.com", role: "Corretor", st: "ativo" },
    { n: "Rafael Souza", i: "RS", e: "rafael.souza@rizzoimobiliaria.com", role: "Corretor", st: "convite" },
    { n: "Bruno Silveira", i: "BS", e: "bruno.silveira@rizzoimobiliaria.com", role: "Gestor", st: "inativo" },
  ];
  const stColor = (s: string) =>
    s === "ativo"
      ? statusColors("done")
      : s === "convite"
      ? statusColors("filling")
      : statusColors("neutral");

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <SectionTitle theme={theme}>Usuários e Permissões</SectionTitle>
        {[
          ["Admin", 1],
          ["Gestor", 2],
          ["Corretor", 8],
          ["Administrativo", 5],
        ].map(([l, n]: any) => (
          <button
            key={l}
            className="rounded-full border px-2.5 py-0.5 text-[11.5px]"
            style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBg, color: theme.text }}
          >
            {l} <span className="ml-1 font-semibold">{n}</span>
          </button>
        ))}
        <button
          className="ml-auto rounded-md px-2.5 py-1 text-[12px] font-semibold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          <Plus className="mr-1 inline h-3 w-3" /> Convidar usuário
        </button>
      </div>

      <div
        className="overflow-hidden rounded-lg"
        style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.cardBg }}
      >
        {users.map((u, i) => {
          const sc = stColor(u.st);
          return (
            <div
              key={u.e}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? "none" : `1px solid ${theme.cardBorder}` }}
            >
              <Avatar initials={u.i} size={28} color={theme.primary} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold" style={{ color: theme.text }}>{u.n}</div>
                <div className="truncate text-[11px]" style={{ color: theme.textMuted }}>
                  <Mail className="mr-1 inline h-3 w-3" />
                  {u.e}
                </div>
              </div>
              <Pill bg="#eef2f5" fg={theme.text}>
                <ShieldCheck className="h-2.5 w-2.5" /> {u.role}
              </Pill>
              <Pill bg={sc.bg} fg={sc.fg}>{u.st}</Pill>
              <button
                className="rounded-md border px-2 py-1 text-[11px]"
                style={{ borderColor: theme.cardBorder, color: theme.text }}
              >
                <KeyRound className="mr-1 inline h-3 w-3" /> Senha
              </button>
              <button
                className="rounded-md border px-2 py-1 text-[11px]"
                style={{ borderColor: theme.cardBorder, color: theme.text }}
              >
                Ações
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
 * Mobile preview
 * ========================================================================= */

function MobilePreview({ theme }: { theme: VariationTheme }) {
  const isDark = theme.id === "C";
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4" style={{ color: theme.textMuted }} />
        <SectionTitle theme={theme}>Como fica em tela menor</SectionTitle>
      </div>
      <div className="mt-3 flex justify-center">
        <div
          className="overflow-hidden"
          style={{
            width: 320,
            height: 600,
            borderRadius: 28,
            border: "8px solid #1a242a",
            backgroundColor: theme.pageBg,
            boxShadow: "0 10px 30px rgba(20,30,40,0.2)",
          }}
        >
          <div
            className="flex items-center justify-between px-3"
            style={{
              backgroundColor: theme.headerBg,
              color: theme.headerFg,
              height: 44,
              borderBottom: `1px solid ${isDark ? "#1a242a" : theme.cardBorder}`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                R
              </div>
              <span className="text-[12px] font-semibold">Rizzo Flow</span>
            </div>
            <Bell className="h-3.5 w-3.5" />
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {FLOW_TABS.map((t, i) => (
              <span
                key={t.id}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: i === 0 ? theme.primary : theme.cardBg,
                  color: i === 0 ? "#fff" : theme.text,
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                {t.label} · {t.count}
              </span>
            ))}
          </div>
          <div className="space-y-2 px-3 pb-3">
            {COLUMNS[1].cards.slice(0, 3).map((c) => {
              const sc = statusColors(c.status);
              return (
                <div
                  key={c.id}
                  className="rounded-md p-2.5"
                  style={{
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: theme.cardRadius,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-semibold" style={{ color: theme.textMuted }}>
                      {c.code}
                    </span>
                    <span className="text-[9.5px]" style={{ color: theme.textMuted }}>{c.deadline}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] font-semibold" style={{ color: theme.text }}>
                    {c.title}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <Pill bg={sc.bg} fg={sc.fg} size="xs">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                      {c.statusLabel}
                    </Pill>
                    <Avatar initials={c.brokerInitials} size={18} color={theme.primary} />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="absolute"
            style={{
              position: "relative",
              marginTop: 8,
              marginLeft: "auto",
              marginRight: 12,
              width: "fit-content",
            }}
          >
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
              style={{ backgroundColor: theme.accent }}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * Bloco "O que melhora / riscos"
 * ========================================================================= */

function VariationNotes({ theme }: { theme: VariationTheme }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-5 py-4">
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "#f1f8f4", border: "1px solid #cfe7d8", borderRadius: theme.cardRadius }}
      >
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: PALETTE.success }} />
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: PALETTE.statusDoneFg }}>
            O que esta variação melhora
          </span>
        </div>
        <ul className="space-y-1.5 text-[12.5px]" style={{ color: theme.text }}>
          {theme.improvements.map((i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: PALETTE.success }}>•</span>
              {i}
            </li>
          ))}
        </ul>
      </div>
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "#fff5e6", border: "1px solid #f5d8a8", borderRadius: theme.cardRadius }}
      >
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: PALETTE.warning }} />
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8a6a00" }}>
            Possíveis riscos
          </span>
        </div>
        <ul className="space-y-1.5 text-[12.5px]" style={{ color: theme.text }}>
          {theme.risks.map((i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: PALETTE.warning }}>•</span>
              {i}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================================
 * Shell de uma variação
 * ========================================================================= */

function VariationShell({ theme }: { theme: VariationTheme }) {
  const [view, setView] = useState("dashboard");
  const [openProposal, setOpenProposal] = useState(false);
  const [openCard, setOpenCard] = useState(false);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: theme.pageBg,
        border: `1px solid ${theme.cardBorder}`,
        boxShadow: "0 4px 20px rgba(20,30,40,0.05)",
      }}
    >
      <Topbar theme={theme} onOpenProposta={() => setOpenProposal(true)} />
      <FlowNav theme={theme} view={view} setView={setView} />

      {view === "dashboard" && (
        <>
          <FlowTabs theme={theme} />
          <KanbanBoardPreview theme={theme} onOpenCard={() => setOpenCard(true)} />
        </>
      )}
      {view === "fila" && <MinhaFilaPreview theme={theme} />}
      {view === "central" && <CentralPropostasPreview theme={theme} />}
      {view === "metricas" && <MetricasPreview theme={theme} />}
      {view === "admin" && <AdminPreview theme={theme} />}

      <MobilePreview theme={theme} />
      <VariationNotes theme={theme} />

      {openProposal && <NovaPropostaModal theme={theme} onClose={() => setOpenProposal(false)} />}
      {openCard && <CardDetailPreview theme={theme} onClose={() => setOpenCard(false)} />}
    </div>
  );
}

/* =========================================================================
 * Página
 * ========================================================================= */

export default function DesignPreview() {
  const [active, setActive] = useState<VariationId>("A");
  const theme = useMemo(() => VARIATIONS[active], [active]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#eef2f5" }}>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Cabeçalho da rota */}
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PALETTE.textMuted }}>
              Prévia visual · não afeta o sistema real
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: PALETTE.text }}>
              Rizzo Flow · Direções de design
            </h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: PALETTE.textMuted }}>
              Compare lado a lado três caminhos visuais para Dashboard, Kanban, Card operacional, Minha
              Fila, Central de Propostas, Métricas e Administração. Use as abas abaixo para alternar.
            </p>
          </div>
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{ backgroundColor: "#fff", border: `1px solid ${PALETTE.border}` }}
          >
            {(Object.keys(VARIATIONS) as VariationId[]).map((id) => {
              const v = VARIATIONS[id];
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className="rounded-md px-3 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: isActive ? PALETTE.primary : "transparent",
                    color: isActive ? "#fff" : PALETTE.text,
                    minWidth: 200,
                  }}
                >
                  <div className="text-[12.5px] font-semibold leading-tight">{v.label}</div>
                  <div
                    className="mt-0.5 text-[10.5px]"
                    style={{ color: isActive ? "rgba(255,255,255,0.8)" : PALETTE.textMuted }}
                  >
                    {v.tagline}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <VariationShell theme={theme} />

        <div
          className="mt-5 rounded-lg p-4 text-[12.5px]"
          style={{ backgroundColor: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}
        >
          <strong>Como usar:</strong> alterne entre as variações <em>A</em>, <em>B</em> e <em>C</em> no
          seletor acima. Em cada variação, clique nos itens do menu superior (Dashboard, Minha Fila,
          Central de Propostas, Métricas, Administração), no botão <em>Gerar nova proposta</em> e em
          qualquer card do Kanban para abrir a visualização do card operacional. Nada disso altera o
          sistema real — é apenas uma simulação para escolha da direção visual.
        </div>
      </div>
    </div>
  );
}
