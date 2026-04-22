// Demo data — dados fictícios realistas para demonstração do template

export interface DemoMember {
  id: string;
  name: string;
  initials: string;
  department?: string;
}

export interface DemoLabel {
  id: string;
  name: string;
  color: string;
}

export interface DemoChecklistItem {
  content: string;
  completed: boolean;
}

export interface DemoCard {
  id: string;
  title: string;
  cardNumber: number;
  description?: string;
  labels: DemoLabel[];
  members: DemoMember[];
  dueDate?: string;
  createdAt: string;
  checklistTotal?: number;
  checklistDone?: number;
  commentsCount?: number;
  address?: string;
  buildingName?: string;
  guaranteeType?: string;
  contractType?: string;
  proposalResponsible?: string;
}

export interface DemoColumn {
  id: string;
  name: string;
  color: string;
  cards: DemoCard[];
}

export interface DemoBoard {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  columns: DemoColumn[];
}

// ── Membros fictícios ──
export const DEMO_MEMBERS: DemoMember[] = [
  { id: 'm1', name: 'Marina Costa', initials: 'MC', department: 'comercial' },
  { id: 'm2', name: 'Ricardo Almeida', initials: 'RA', department: 'juridico' },
  { id: 'm3', name: 'Ana Beatriz Ferreira', initials: 'AF', department: 'administrativo' },
  { id: 'm4', name: 'Carlos Eduardo Santos', initials: 'CS', department: 'comercial' },
  { id: 'm5', name: 'Juliana Mendes', initials: 'JM', department: 'juridico' },
  { id: 'm6', name: 'Thiago Oliveira', initials: 'TO', department: 'vistoriadores' },
  { id: 'm7', name: 'Fernanda Lima', initials: 'FL', department: 'administrativo' },
  { id: 'm8', name: 'Lucas Rodrigues', initials: 'LR', department: 'comercial' },
];

// ── Labels reutilizáveis ──
const LABELS = {
  urgente: { id: 'l1', name: 'Urgente', color: '#ef4444' },
  vip: { id: 'l2', name: 'VIP', color: '#8b5cf6' },
  fiador: { id: 'l3', name: 'Fiador', color: '#3b82f6' },
  seguroFianca: { id: 'l4', name: 'Seguro Fiança', color: '#06b6d4' },
  comercial: { id: 'l5', name: 'Comercial', color: '#f59e0b' },
  residencial: { id: 'l6', name: 'Residencial', color: '#10b981' },
  contrato: { id: 'l7', name: 'Contrato Digital', color: '#6366f1' },
  pendencia: { id: 'l8', name: 'Pendência', color: '#f97316' },
  eletrica: { id: 'l9', name: 'Elétrica', color: '#eab308' },
  hidraulica: { id: 'l10', name: 'Hidráulica', color: '#0ea5e9' },
  pintura: { id: 'l11', name: 'Pintura', color: '#a855f7' },
  reforma: { id: 'l12', name: 'Reforma Geral', color: '#ec4899' },
  lancamento: { id: 'l13', name: 'Lançamento', color: '#14b8a6' },
  permuta: { id: 'l14', name: 'Permuta', color: '#84cc16' },
  financiamento: { id: 'l15', name: 'Financiamento', color: '#f43f5e' },
};

// ── Board 1: Locação ──
const locacaoColumns: DemoColumn[] = [
  {
    id: 'loc-c1', name: 'Captação', color: '#f59e0b',
    cards: [
      {
        id: 'loc-1', title: 'Apartamento 3Q - Setor Bueno', cardNumber: 1042,
        description: 'Captação de apartamento de 3 quartos, suíte master, varanda gourmet. Proprietário: Sr. Henrique Bastos.',
        labels: [LABELS.residencial, LABELS.fiador],
        members: [DEMO_MEMBERS[0], DEMO_MEMBERS[3]],
        dueDate: '2026-04-02',
        createdAt: '2026-03-10',
        checklistTotal: 8, checklistDone: 3, commentsCount: 4,
        address: 'Rua das Palmeiras, 450 - Setor Bueno, Goiânia',
        buildingName: 'Edifício Jardim das Flores',
        guaranteeType: 'fiador',
        proposalResponsible: 'Marina Costa',
      },
      {
        id: 'loc-2', title: 'Sala Comercial 45m² - Centro', cardNumber: 1043,
        labels: [LABELS.comercial],
        members: [DEMO_MEMBERS[3]],
        createdAt: '2026-03-15',
        checklistTotal: 6, checklistDone: 1,
        address: 'Av. Goiás, 1200 - Sala 804 - Centro, Goiânia',
        buildingName: 'Centro Empresarial Goiás',
        proposalResponsible: 'Carlos Eduardo Santos',
      },
      {
        id: 'loc-3', title: 'Casa 4Q com piscina - Alphaville', cardNumber: 1044,
        labels: [LABELS.residencial, LABELS.vip],
        members: [DEMO_MEMBERS[0]],
        dueDate: '2026-04-10',
        createdAt: '2026-03-18',
        checklistTotal: 10, checklistDone: 2, commentsCount: 2,
        address: 'Rua Ipê Amarelo, 88 - Alphaville Flamboyant, Goiânia',
        guaranteeType: 'seguro_fianca',
        proposalResponsible: 'Marina Costa',
      },
    ],
  },
  {
    id: 'loc-c2', name: 'Análise Documental', color: '#3b82f6',
    cards: [
      {
        id: 'loc-4', title: 'Cobertura Duplex - Setor Marista', cardNumber: 1038,
        labels: [LABELS.vip, LABELS.seguroFianca, LABELS.contrato],
        members: [DEMO_MEMBERS[1], DEMO_MEMBERS[4]],
        dueDate: '2026-03-28',
        createdAt: '2026-03-05',
        checklistTotal: 12, checklistDone: 9, commentsCount: 7,
        address: 'Rua 1130, 200 - Setor Marista, Goiânia',
        buildingName: 'Residencial Marista Premium',
        guaranteeType: 'seguro_fianca',
        contractType: 'digital',
        proposalResponsible: 'Ricardo Almeida',
      },
      {
        id: 'loc-5', title: 'Apartamento 2Q - Jardim América', cardNumber: 1039,
        labels: [LABELS.residencial, LABELS.fiador],
        members: [DEMO_MEMBERS[1]],
        createdAt: '2026-03-08',
        checklistTotal: 8, checklistDone: 6, commentsCount: 3,
        address: 'Av. T-4, 780 - Jardim América, Goiânia',
        guaranteeType: 'fiador',
        proposalResponsible: 'Juliana Mendes',
      },
    ],
  },
  {
    id: 'loc-c3', name: 'Vistoria', color: '#10b981',
    cards: [
      {
        id: 'loc-6', title: 'Kitnet Mobiliada - Setor Universitário', cardNumber: 1035,
        labels: [LABELS.residencial],
        members: [DEMO_MEMBERS[5]],
        dueDate: '2026-03-26',
        createdAt: '2026-02-28',
        checklistTotal: 6, checklistDone: 4, commentsCount: 2,
        address: 'Rua 240, 55 - Setor Universitário, Goiânia',
        guaranteeType: 'caucao',
        proposalResponsible: 'Thiago Oliveira',
      },
    ],
  },
  {
    id: 'loc-c4', name: 'Contrato', color: '#8b5cf6',
    cards: [
      {
        id: 'loc-7', title: 'Loja Térrea 120m² - Setor Oeste', cardNumber: 1030,
        labels: [LABELS.comercial, LABELS.contrato, LABELS.urgente],
        members: [DEMO_MEMBERS[1], DEMO_MEMBERS[2]],
        dueDate: '2026-03-25',
        createdAt: '2026-02-20',
        checklistTotal: 10, checklistDone: 10, commentsCount: 12,
        address: 'Av. T-63, 340 - Setor Oeste, Goiânia',
        contractType: 'digital',
        proposalResponsible: 'Ana Beatriz Ferreira',
      },
      {
        id: 'loc-8', title: 'Apartamento Garden 2Q - Park Lozandes', cardNumber: 1031,
        labels: [LABELS.residencial, LABELS.seguroFianca],
        members: [DEMO_MEMBERS[2]],
        createdAt: '2026-02-22',
        checklistTotal: 10, checklistDone: 8,
        address: 'Rua Dep. Jamel Cecílio, 2900 - Park Lozandes, Goiânia',
        buildingName: 'Lozandes Park Residence',
        guaranteeType: 'seguro_fianca',
        contractType: 'fisico',
        proposalResponsible: 'Ana Beatriz Ferreira',
      },
    ],
  },
  {
    id: 'loc-c5', name: 'Concluído', color: '#6b7280',
    cards: [
      {
        id: 'loc-9', title: 'Flat Executivo - Setor Nova Suíça', cardNumber: 1025,
        labels: [LABELS.comercial, LABELS.contrato],
        members: [DEMO_MEMBERS[0], DEMO_MEMBERS[2]],
        createdAt: '2026-01-15',
        checklistTotal: 10, checklistDone: 10, commentsCount: 15,
        address: 'Av. T-2, 1500 - Setor Nova Suíça, Goiânia',
        contractType: 'digital',
        proposalResponsible: 'Marina Costa',
      },
    ],
  },
];

// ── Board 2: Manutenção ──
const manutencaoColumns: DemoColumn[] = [
  {
    id: 'man-c1', name: 'Solicitação', color: '#ef4444',
    cards: [
      {
        id: 'man-1', title: 'Vazamento banheiro social - Apt 302', cardNumber: 2015,
        description: 'Inquilino reportou infiltração no teto do banheiro social. Possível origem no apartamento superior.',
        labels: [LABELS.hidraulica, LABELS.urgente],
        members: [DEMO_MEMBERS[6]],
        dueDate: '2026-03-27',
        createdAt: '2026-03-22',
        commentsCount: 3,
        address: 'Rua 36, 120 - Apt 302 - Setor Marista, Goiânia',
        buildingName: 'Edifício Solar das Acácias',
      },
      {
        id: 'man-2', title: 'Troca de fechadura - Casa 15', cardNumber: 2016,
        labels: [LABELS.reforma],
        members: [DEMO_MEMBERS[6]],
        createdAt: '2026-03-23',
        address: 'Rua das Orquídeas, 15 - Jardim Europa, Goiânia',
      },
      {
        id: 'man-3', title: 'Curto-circuito tomada cozinha - Apt 1201', cardNumber: 2017,
        labels: [LABELS.eletrica, LABELS.urgente],
        members: [DEMO_MEMBERS[6], DEMO_MEMBERS[2]],
        dueDate: '2026-03-26',
        createdAt: '2026-03-24',
        commentsCount: 5,
        address: 'Av. T-9, 2300 - Apt 1201 - Setor Bueno, Goiânia',
        buildingName: 'Torres do Parque',
      },
    ],
  },
  {
    id: 'man-c2', name: 'Orçamento', color: '#f59e0b',
    cards: [
      {
        id: 'man-4', title: 'Pintura completa - Apt 505', cardNumber: 2012,
        labels: [LABELS.pintura],
        members: [DEMO_MEMBERS[6]],
        createdAt: '2026-03-15',
        checklistTotal: 4, checklistDone: 2, commentsCount: 6,
        address: 'Rua C-152, 680 - Apt 505 - Jardim América, Goiânia',
      },
      {
        id: 'man-5', title: 'Reparo piso laminado - Sala Comercial 12', cardNumber: 2013,
        labels: [LABELS.reforma],
        members: [DEMO_MEMBERS[2]],
        createdAt: '2026-03-18',
        commentsCount: 2,
        address: 'Av. 85, 900 - Sala 12 - Setor Sul, Goiânia',
        buildingName: 'Centro Comercial Sul',
      },
    ],
  },
  {
    id: 'man-c3', name: 'Aprovação', color: '#3b82f6',
    cards: [
      {
        id: 'man-6', title: 'Instalação ar-condicionado - Apt 801', cardNumber: 2010,
        labels: [LABELS.eletrica],
        members: [DEMO_MEMBERS[6], DEMO_MEMBERS[2]],
        dueDate: '2026-03-30',
        createdAt: '2026-03-10',
        checklistTotal: 3, checklistDone: 2, commentsCount: 8,
        address: 'Rua T-37, 450 - Apt 801 - Setor Bueno, Goiânia',
      },
    ],
  },
  {
    id: 'man-c4', name: 'Em Execução', color: '#10b981',
    cards: [
      {
        id: 'man-7', title: 'Reforma banheiro suíte - Casa 8', cardNumber: 2008,
        labels: [LABELS.hidraulica, LABELS.reforma],
        members: [DEMO_MEMBERS[5], DEMO_MEMBERS[6]],
        dueDate: '2026-04-05',
        createdAt: '2026-03-01',
        checklistTotal: 8, checklistDone: 5, commentsCount: 11,
        address: 'Rua das Hortênsias, 8 - Setor Pedro Ludovico, Goiânia',
      },
      {
        id: 'man-8', title: 'Troca de fiação elétrica - Apt 402', cardNumber: 2009,
        labels: [LABELS.eletrica],
        members: [DEMO_MEMBERS[5]],
        createdAt: '2026-03-03',
        checklistTotal: 6, checklistDone: 4,
        address: 'Av. Fued José Sebba, 1100 - Apt 402 - Jardim Goiás, Goiânia',
        buildingName: 'Residencial Parque Flamboyant',
      },
    ],
  },
  {
    id: 'man-c5', name: 'Concluído', color: '#6b7280',
    cards: [
      {
        id: 'man-9', title: 'Desentupimento esgoto - Apt 103', cardNumber: 2005,
        labels: [LABELS.hidraulica],
        members: [DEMO_MEMBERS[6]],
        createdAt: '2026-02-10',
        checklistTotal: 4, checklistDone: 4, commentsCount: 6,
        address: 'Rua 1, 320 - Apt 103 - Setor Oeste, Goiânia',
      },
    ],
  },
];

// ── Board 3: Vendas ──
const vendasColumns: DemoColumn[] = [
  {
    id: 'ven-c1', name: 'Prospecção', color: '#f59e0b',
    cards: [
      {
        id: 'ven-1', title: 'Terreno 800m² - Alphaville', cardNumber: 3020,
        description: 'Cliente interessado em terreno para construção de residência de alto padrão.',
        labels: [LABELS.vip, LABELS.lancamento],
        members: [DEMO_MEMBERS[3], DEMO_MEMBERS[7]],
        dueDate: '2026-04-15',
        createdAt: '2026-03-20',
        commentsCount: 2,
        address: 'Quadra 15, Lote 8 - Alphaville Flamboyant, Goiânia',
        proposalResponsible: 'Carlos Eduardo Santos',
      },
      {
        id: 'ven-2', title: 'Apartamento 2Q na planta - Setor Marista', cardNumber: 3021,
        labels: [LABELS.lancamento, LABELS.financiamento],
        members: [DEMO_MEMBERS[7]],
        createdAt: '2026-03-21',
        address: 'Rua 1120, Qd. 50 - Setor Marista, Goiânia',
        buildingName: 'Grand Marista Residence',
        proposalResponsible: 'Lucas Rodrigues',
      },
      {
        id: 'ven-3', title: 'Sobrado geminado - Jardim Novo Mundo', cardNumber: 3022,
        labels: [LABELS.residencial],
        members: [DEMO_MEMBERS[0]],
        createdAt: '2026-03-22',
        address: 'Rua JNM-12, 340 - Jardim Novo Mundo, Goiânia',
        proposalResponsible: 'Marina Costa',
      },
    ],
  },
  {
    id: 'ven-c2', name: 'Proposta', color: '#3b82f6',
    cards: [
      {
        id: 'ven-4', title: 'Cobertura 4Q - Setor Oeste', cardNumber: 3015,
        labels: [LABELS.vip, LABELS.residencial],
        members: [DEMO_MEMBERS[3], DEMO_MEMBERS[1]],
        dueDate: '2026-03-30',
        createdAt: '2026-03-10',
        checklistTotal: 6, checklistDone: 4, commentsCount: 9,
        address: 'Av. T-63, 890 - Setor Oeste, Goiânia',
        buildingName: 'Edifício Horizonte Oeste',
        proposalResponsible: 'Carlos Eduardo Santos',
      },
      {
        id: 'ven-5', title: 'Galpão industrial 500m² - Distrito Agroindustrial', cardNumber: 3016,
        labels: [LABELS.comercial],
        members: [DEMO_MEMBERS[7]],
        createdAt: '2026-03-12',
        commentsCount: 4,
        address: 'Rod. GO-060, km 12 - DAIA, Anápolis',
        proposalResponsible: 'Lucas Rodrigues',
      },
    ],
  },
  {
    id: 'ven-c3', name: 'Negociação', color: '#8b5cf6',
    cards: [
      {
        id: 'ven-6', title: 'Casa 3Q com suíte - Setor Gentil Meireles', cardNumber: 3012,
        labels: [LABELS.residencial, LABELS.financiamento],
        members: [DEMO_MEMBERS[0], DEMO_MEMBERS[1]],
        dueDate: '2026-04-01',
        createdAt: '2026-03-01',
        checklistTotal: 8, checklistDone: 6, commentsCount: 14,
        address: 'Rua GM-3, 150 - Setor Gentil Meireles, Goiânia',
        proposalResponsible: 'Marina Costa',
      },
    ],
  },
  {
    id: 'ven-c4', name: 'Documentação', color: '#06b6d4',
    cards: [
      {
        id: 'ven-7', title: 'Apartamento 3Q - Park Lozandes', cardNumber: 3008,
        labels: [LABELS.residencial, LABELS.contrato],
        members: [DEMO_MEMBERS[1], DEMO_MEMBERS[4]],
        dueDate: '2026-03-28',
        createdAt: '2026-02-15',
        checklistTotal: 12, checklistDone: 10, commentsCount: 18,
        address: 'Rua Dep. Jamel Cecílio, 3200 - Park Lozandes, Goiânia',
        buildingName: 'Lozandes Park II',
        contractType: 'digital',
        proposalResponsible: 'Juliana Mendes',
      },
    ],
  },
  {
    id: 'ven-c5', name: 'Concluído', color: '#6b7280',
    cards: [
      {
        id: 'ven-8', title: 'Chácara 5000m² - Zona Rural', cardNumber: 3001,
        labels: [LABELS.residencial, LABELS.permuta],
        members: [DEMO_MEMBERS[3]],
        createdAt: '2026-01-20',
        checklistTotal: 10, checklistDone: 10, commentsCount: 22,
        address: 'Estrada Municipal, km 8 - Zona Rural, Nerópolis',
        proposalResponsible: 'Carlos Eduardo Santos',
      },
      {
        id: 'ven-9', title: 'Sala comercial 60m² - Setor Bueno', cardNumber: 3003,
        labels: [LABELS.comercial],
        members: [DEMO_MEMBERS[7]],
        createdAt: '2026-02-01',
        checklistTotal: 8, checklistDone: 8, commentsCount: 10,
        address: 'Av. T-4, 1800 - Sala 1205 - Setor Bueno, Goiânia',
        buildingName: 'Bueno Business Center',
        proposalResponsible: 'Lucas Rodrigues',
      },
    ],
  },
];

// ── Boards ──
export const DEMO_BOARDS: DemoBoard[] = [
  {
    id: 'board-locacao',
    name: 'Locação',
    icon: 'home',
    color: '#f59e0b',
    description: 'Fluxo completo de locação de imóveis',
    columns: locacaoColumns,
  },
  {
    id: 'board-manutencao',
    name: 'Manutenção',
    icon: 'wrench',
    color: '#ef4444',
    description: 'Gestão de manutenções e reparos',
    columns: manutencaoColumns,
  },
  {
    id: 'board-vendas',
    name: 'Vendas',
    icon: 'trending-up',
    color: '#10b981',
    description: 'Pipeline de vendas de imóveis',
    columns: vendasColumns,
  },
];

// ── Dados para dashboard de produtividade ──
export const DEMO_PRODUCTIVITY = [
  { month: '2025-10', member: 'Marina Costa', created: 12, completed: 10 },
  { month: '2025-11', member: 'Marina Costa', created: 15, completed: 13 },
  { month: '2025-12', member: 'Marina Costa', created: 9, completed: 8 },
  { month: '2026-01', member: 'Marina Costa', created: 14, completed: 11 },
  { month: '2026-02', member: 'Marina Costa', created: 18, completed: 16 },
  { month: '2026-03', member: 'Marina Costa', created: 11, completed: 7 },
  { month: '2025-10', member: 'Carlos Eduardo Santos', created: 8, completed: 7 },
  { month: '2025-11', member: 'Carlos Eduardo Santos', created: 10, completed: 9 },
  { month: '2025-12', member: 'Carlos Eduardo Santos', created: 7, completed: 6 },
  { month: '2026-01', member: 'Carlos Eduardo Santos', created: 11, completed: 10 },
  { month: '2026-02', member: 'Carlos Eduardo Santos', created: 13, completed: 11 },
  { month: '2026-03', member: 'Carlos Eduardo Santos', created: 9, completed: 5 },
  { month: '2025-10', member: 'Lucas Rodrigues', created: 6, completed: 5 },
  { month: '2025-11', member: 'Lucas Rodrigues', created: 9, completed: 8 },
  { month: '2025-12', member: 'Lucas Rodrigues', created: 5, completed: 5 },
  { month: '2026-01', member: 'Lucas Rodrigues', created: 8, completed: 7 },
  { month: '2026-02', member: 'Lucas Rodrigues', created: 10, completed: 9 },
  { month: '2026-03', member: 'Lucas Rodrigues', created: 7, completed: 4 },
];

// Total cards per board for overview
export const DEMO_CARD_COUNTS: Record<string, number> = {
  'board-locacao': 9,
  'board-manutencao': 9,
  'board-vendas': 9,
};
