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
} from "lucide-react";

/**
 * /design-preview — Página isolada apenas para comparação visual.
 * NÃO usa hooks reais nem altera componentes do sistema. Tudo é mock local.
 *
 * Paleta fixa solicitada:
 *  Primária  #344650
 *  Destaque  #e50046
 *  Sucesso   #61ac81
 *  Alerta    #f0ae00
 *  Info      #658bc8
 *  Fundo     #f7f9fb
 *  Card      #ffffff
 */

const PALETTE = {
  primary: "#344650",
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

// ---------- Mock data (locação Rizzo) ----------
type CardState =
  | "doc_recebido"
  | "correcao"
  | "complementacao"
  | "vencido"
  | "sem_responsavel";

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
      {
        id: "1",
        title: "Apto 802 — Ed. Vista Mar",
        address: "Av. Beira Mar, 1200 — Praia do Canto",
        proponent: "Mariana Albuquerque",
        responsible: "Carla R.",
        state: "doc_recebido",
        due: "Hoje",
        value: "R$ 3.200/mês",
        comments: 4,
        docs: 7,
      },
      {
        id: "2",
        title: "Casa 2 quartos — Jardim Camburi",
        address: "Rua das Acácias, 88",
        proponent: "Rodrigo Tavares",
        state: "sem_responsavel",
        due: "Em 2 dias",
        value: "R$ 2.450/mês",
        comments: 1,
        docs: 2,
      },
    ],
  },
  {
    id: "analise",
    title: "Análise",
    cards: [
      {
        id: "3",
        title: "Cobertura — Ed. Solar de Itaparica",
        address: "R. Henrique Moscoso, 450",
        proponent: "Família Bittencourt",
        responsible: "Diego M.",
        state: "correcao",
        due: "Amanhã",
        value: "R$ 6.800/mês",
        comments: 9,
        docs: 12,
      },
      {
        id: "4",
        title: "Sala comercial 304",
        address: "Av. NS Navegantes, 955",
        proponent: "Mendes & Cia ME",
        responsible: "Patrícia L.",
        state: "complementacao",
        due: "3 dias",
        value: "R$ 4.100/mês",
        comments: 6,
        docs: 9,
      },
    ],
  },
  {
    id: "aprovacao",
    title: "Aprovação",
    cards: [
      {
        id: "5",
        title: "Apto 1101 — Ed. Praia Bela",
        address: "R. Joaquim Lírio, 220",
        proponent: "Lucas Ferreira",
        responsible: "Carla R.",
        state: "vencido",
        due: "Atrasado 2d",
        value: "R$ 5.300/mês",
        comments: 12,
        docs: 11,
      },
    ],
  },
  {
    id: "contrato",
    title: "Contrato",
    cards: [
      {
        id: "6",
        title: "Studio 506 — Ed. Enseada",
        address: "Av. Saturnino, 90",
        proponent: "Beatriz Nunes",
        responsible: "Patrícia L.",
        state: "doc_recebido",
        due: "5 dias",
        value: "R$ 1.850/mês",
        comments: 3,
        docs: 14,
      },
    ],
  },
];

const STATE_META: Record<
  CardState,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  doc_recebido: { label: "Doc. recebidos", color: PALETTE.success, bg: "#eaf5ee", icon: CheckCircle2 },
  correcao: { label: "Correção solicitada", color: PALETTE.warning, bg: "#fdf3d8", icon: AlertTriangle },
  complementacao: { label: "Complementação recebida", color: PALETTE.info, bg: "#e6edf7", icon: Upload },
  vencido: { label: "Prazo vencido", color: PALETTE.accent, bg: "#fde6ec", icon: AlertCircle },
  sem_responsavel: { label: "Sem responsável", color: PALETTE.muted, bg: "#eef1f4", icon: UserIcon },
};

// ---------- Variation styling tokens ----------
type Variation = "v1" | "v2" | "v3";

const VARIATIONS: Record<
  Variation,
  {
    name: string;
    tagline: string;
    boardBg: string;
    columnBg: string;
    columnHeader: string;
    cardShadow: string;
    cardRadius: string;
    cardPad: string;
    cardGap: string;
    titleSize: string;
    metaSize: string;
    accentBar: string;
    badgeStyle: "soft" | "outline" | "dot";
    density: "comfortable" | "balanced" | "compact";
  }
> = {
  v1: {
    name: "Operacional neutra",
    tagline: "Off-white, colunas cinza claro, cards brancos. Foco em conforto.",
    boardBg: "#f7f9fb",
    columnBg: "#eef1f4",
    columnHeader: PALETTE.text,
    cardShadow: "0 1px 2px rgba(20,30,40,0.05)",
    cardRadius: "10px",
    cardPad: "14px",
    cardGap: "10px",
    titleSize: "14px",
    metaSize: "12px",
    accentBar: "transparent",
    badgeStyle: "soft",
    density: "comfortable",
  },
  v2: {
    name: "Rizzo discreta",
    tagline: "Marca presente sem dominar. Rosa só em ações importantes.",
    boardBg: "#f3f6f9",
    columnBg: "#ffffff",
    columnHeader: PALETTE.primary,
    cardShadow: "0 1px 3px rgba(52,70,80,0.08)",
    cardRadius: "12px",
    cardPad: "14px",
    cardGap: "12px",
    titleSize: "14px",
    metaSize: "12px",
    accentBar: PALETTE.primary,
    badgeStyle: "outline",
    density: "balanced",
  },
  v3: {
    name: "Compacta e densa",
    tagline: "Mais cards por tela, ideal para alto volume.",
    boardBg: "#f7f9fb",
    columnBg: "#eceff3",
    columnHeader: PALETTE.text,
    cardShadow: "0 1px 1px rgba(20,30,40,0.04)",
    cardRadius: "6px",
    cardPad: "8px 10px",
    cardGap: "6px",
    titleSize: "12.5px",
    metaSize: "11px",
    accentBar: "transparent",
    badgeStyle: "dot",
    density: "compact",
  },
};

// ---------- Components ----------
function StateBadge({
  state,
  style,
}: {
  state: CardState;
  style: "soft" | "outline" | "dot";
}) {
  const meta = STATE_META[state];
  const Icon = meta.icon;

  if (style === "dot") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10.5px] font-medium"
        style={{ color: meta.color }}
      >
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: meta.color }}
        />
        {meta.label}
      </span>
    );
  }

  if (style === "outline") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{
          color: meta.color,
          border: `1px solid ${meta.color}40`,
          background: "#fff",
        }}
      >
        <Icon size={11} />
        {meta.label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, background: meta.bg }}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function MockCardItem({
  card,
  v,
  onClick,
}: {
  card: MockCard;
  v: (typeof VARIATIONS)[Variation];
  onClick: () => void;
}) {
  const compact = v.density === "compact";
  return (
    <button
      onClick={onClick}
      className="text-left w-full block"
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
          <div
            className="font-semibold truncate"
            style={{ color: PALETTE.text, fontSize: v.titleSize, lineHeight: 1.25 }}
          >
            {card.title}
          </div>
          {!compact && (
            <div
              className="truncate mt-0.5"
              style={{ color: PALETTE.muted, fontSize: v.metaSize }}
            >
              {card.address}
            </div>
          )}
        </div>
        <span
          className="shrink-0 font-semibold"
          style={{ color: PALETTE.primary, fontSize: v.metaSize }}
        >
          {card.value}
        </span>
      </div>

      <div className={compact ? "mt-1.5" : "mt-2.5"}>
        <StateBadge state={card.state} style={v.badgeStyle} />
      </div>

      <div
        className={`flex items-center justify-between ${compact ? "mt-1.5" : "mt-3"}`}
        style={{ fontSize: v.metaSize, color: PALETTE.muted }}
      >
        <span className="inline-flex items-center gap-1 truncate">
          <UserIcon size={12} />
          <span className="truncate">{card.responsible ?? "—"}</span>
        </span>
        <span className="inline-flex items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} />
            {card.due}
          </span>
          {!compact && (
            <>
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={12} />
                {card.comments}
              </span>
              <span className="inline-flex items-center gap-1">
                <Paperclip size={12} />
                {card.docs}
              </span>
            </>
          )}
        </span>
      </div>
    </button>
  );
}

function MockBoard({
  variation,
  onOpenCard,
}: {
  variation: Variation;
  onOpenCard: (c: MockCard) => void;
}) {
  const v = VARIATIONS[variation];
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: v.boardBg, border: `1px solid ${PALETTE.border}` }}
    >
      {/* Top toolbar mock */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-md text-sm font-semibold"
            style={{ background: PALETTE.primary, color: "#fff" }}
          >
            Locação · Captação
          </div>
          <div
            className="px-3 py-1.5 rounded-md text-sm"
            style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted }}
          >
            Filtros
          </div>
        </div>
        <button
          className="px-3 py-1.5 rounded-md text-sm font-semibold text-white"
          style={{ background: PALETTE.accent }}
        >
          + Nova proposta
        </button>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0,1fr))`,
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="rounded-lg p-2.5"
            style={{
              background: v.columnBg,
              border: variation === "v2" ? `1px solid ${PALETTE.border}` : "none",
            }}
          >
            <div className="flex items-center justify-between px-1 mb-2">
              <div
                className="font-semibold uppercase tracking-wide"
                style={{ fontSize: 11, color: v.columnHeader }}
              >
                {col.title}
              </div>
              <span
                className="text-[10.5px] rounded-full px-1.5 py-0.5"
                style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted }}
              >
                {col.cards.length}
              </span>
            </div>
            <div className="flex flex-col" style={{ gap: v.cardGap }}>
              {col.cards.map((c) => (
                <MockCardItem key={c.id} card={c} v={v} onClick={() => onOpenCard(c)} />
              ))}
              {col.cards.length === 0 && (
                <div
                  className="text-center text-[11px] py-6 rounded-md"
                  style={{ color: PALETTE.muted, border: `1px dashed ${PALETTE.border}` }}
                >
                  Vazio
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockCardDetail({
  card,
  variation,
  onClose,
}: {
  card: MockCard;
  variation: Variation;
  onClose: () => void;
}) {
  const v = VARIATIONS[variation];
  const meta = STATE_META[card.state];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,30,40,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-4"
          style={{
            borderBottom: `1px solid ${PALETTE.border}`,
            background: variation === "v2" ? "#fafbfc" : "#fff",
          }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StateBadge state={card.state} style={v.badgeStyle} />
              <span className="text-[11px]" style={{ color: PALETTE.muted }}>
                Locação · Análise
              </span>
            </div>
            <h3 className="text-lg font-bold truncate" style={{ color: PALETTE.text }}>
              {card.title}
            </h3>
            <div className="text-sm mt-0.5" style={{ color: PALETTE.muted }}>
              {card.address} · Proponente: <span style={{ color: PALETTE.text }}>{card.proponent}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold" style={{ color: PALETTE.primary }}>
              {card.value}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md"
              style={{ background: "#f1f3f6", color: PALETTE.muted }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Andamento */}
        <Section title="Andamento" v={v}>
          <div className="flex items-center gap-2 flex-wrap">
            {["Captação", "Análise", "Aprovação", "Contrato"].map((s, i) => {
              const active = i === 1;
              const done = i < 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{
                      background: active
                        ? PALETTE.primary
                        : done
                          ? PALETTE.success
                          : "#eef1f4",
                      color: active || done ? "#fff" : PALETTE.muted,
                    }}
                  >
                    {s}
                  </div>
                  {i < 3 && <ChevronRight size={12} style={{ color: PALETTE.muted }} />}
                </div>
              );
            })}
          </div>
          <div
            className="mt-3 text-[12px] flex items-center gap-2"
            style={{ color: meta.color }}
          >
            <Clock size={13} /> Prazo desta etapa: <strong>{card.due}</strong>
          </div>
        </Section>

        {/* Documentos */}
        <Section title="Documentos" v={v}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { n: "RG_proponente.pdf", st: "Recebido", color: PALETTE.success },
              { n: "Comprovante_renda.pdf", st: "Recebido", color: PALETTE.success },
              { n: "Comprovante_residência.pdf", st: "Complementação", color: PALETTE.info },
              { n: "Cartão_CNPJ.pdf", st: "Correção solicitada", color: PALETTE.warning },
            ].map((d) => (
              <div
                key={d.n}
                className="flex items-center gap-2 px-3 py-2 rounded-md"
                style={{ border: `1px solid ${PALETTE.border}`, background: "#fff" }}
              >
                <FileText size={14} style={{ color: PALETTE.muted }} />
                <span className="text-[12.5px] truncate flex-1" style={{ color: PALETTE.text }}>
                  {d.n}
                </span>
                <span className="text-[10.5px] font-medium" style={{ color: d.color }}>
                  {d.st}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Correção da proposta */}
        <Section title="Correção da proposta" v={v}>
          <div
            className="p-3 rounded-md text-[12.5px]"
            style={{
              background: "#fdf3d8",
              border: `1px solid ${PALETTE.warning}55`,
              color: "#7a5a00",
            }}
          >
            <div className="font-semibold mb-1 flex items-center gap-1">
              <AlertTriangle size={13} /> Correção solicitada — 2 itens
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Comprovante de renda do fiador desatualizado.</li>
              <li>Cartão CNPJ vencido — enviar atualização.</li>
            </ul>
          </div>
        </Section>

        {/* Comentários e atividade */}
        <Section title="Comentários e atividade" v={v} last>
          <div className="space-y-2.5">
            {[
              { who: "Carla R.", when: "10:42", txt: "Cliente confirmou envio até amanhã." },
              { who: "Diego M.", when: "ontem", txt: "Solicitada correção do comprovante de renda." },
              { who: "Sistema", when: "ontem", txt: "Documento ‘Comprovante_residência.pdf’ recebido.", system: true },
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{
                    background: c.system ? "#eef1f4" : PALETTE.primary,
                    color: c.system ? PALETTE.muted : "#fff",
                  }}
                >
                  {c.system ? <History size={13} /> : c.who.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px]" style={{ color: PALETTE.muted }}>
                    <strong style={{ color: PALETTE.text }}>{c.who}</strong> · {c.when}
                  </div>
                  <div className="text-[13px]" style={{ color: PALETTE.text }}>
                    {c.txt}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-3 flex items-center gap-2 p-2 rounded-md"
            style={{ border: `1px solid ${PALETTE.border}`, background: "#fff" }}
          >
            <input
              placeholder="Escreva um comentário…"
              className="flex-1 outline-none text-[13px] bg-transparent"
              style={{ color: PALETTE.text }}
            />
            <button
              className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-white inline-flex items-center gap-1"
              style={{ background: PALETTE.accent }}
            >
              <Send size={12} /> Enviar
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  v,
  children,
  last,
}: {
  title: string;
  v: (typeof VARIATIONS)[Variation];
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="px-5 py-4"
      style={{ borderBottom: last ? "none" : `1px solid ${PALETTE.border}` }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-2"
        style={{ color: v.columnHeader }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function VariationBlock({ variation }: { variation: Variation }) {
  const v = VARIATIONS[variation];
  const [openCard, setOpenCard] = useState<MockCard | null>(null);

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: PALETTE.accent }}
          >
            Variação {variation.toUpperCase().replace("V", "")}
          </div>
          <h2 className="text-xl font-bold" style={{ color: PALETTE.text }}>
            {v.name}
          </h2>
          <p className="text-sm" style={{ color: PALETTE.muted }}>
            {v.tagline}
          </p>
        </div>
        <button
          onClick={() => setOpenCard(COLUMNS[1].cards[0])}
          className="px-3 py-1.5 rounded-md text-sm font-semibold"
          style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.primary }}
        >
          Abrir card de exemplo
        </button>
      </header>

      <MockBoard variation={variation} onOpenCard={(c) => setOpenCard(c)} />

      {openCard && (
        <MockCardDetail
          card={openCard}
          variation={variation}
          onClose={() => setOpenCard(null)}
        />
      )}
    </section>
  );
}

export default function DesignPreview() {
  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh" }}>
      {/* Top bar */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: "#fff", borderBottom: `1px solid ${PALETTE.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold"
            style={{ background: PALETTE.primary }}
          >
            R
          </div>
          <div>
            <div className="font-bold text-[15px]" style={{ color: PALETTE.text }}>
              Rizzo Flow · Prévia de Design
            </div>
            <div className="text-[12px]" style={{ color: PALETTE.muted }}>
              Comparação visual — não aplicada ao sistema real
            </div>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="px-3 py-1.5 rounded-md text-sm font-semibold"
          style={{ background: PALETTE.primary, color: "#fff" }}
        >
          Voltar ao sistema
        </Link>
      </div>

      {/* Estados visuais legenda */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div
          className="rounded-xl p-4 flex flex-wrap items-center gap-3"
          style={{ background: "#fff", border: `1px solid ${PALETTE.border}` }}
        >
          <span className="text-[12px] font-semibold mr-2" style={{ color: PALETTE.muted }}>
            Estados:
          </span>
          {(Object.keys(STATE_META) as CardState[]).map((s) => (
            <StateBadge key={s} state={s} style="soft" />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-10">
        <VariationBlock variation="v1" />
        <VariationBlock variation="v2" />
        <VariationBlock variation="v3" />

        <footer
          className="text-center text-[12px] py-6"
          style={{ color: PALETTE.muted }}
        >
          Após escolher a variação preferida, será aplicada no sistema real em uma segunda etapa.
        </footer>
      </div>
    </div>
  );
}