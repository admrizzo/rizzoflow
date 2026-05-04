export type GuaranteeType = 'fiador' | 'seguro_fianca' | 'caucao' | 'titulo_capitalizacao' | 'sem_garantia' | 'carta_fianca' | 'outro';
export type ContractType = 'digital' | 'fisico';
export type AppRole = 'admin' | 'gestor' | 'corretor' | 'administrativo' | 'editor' | 'viewer';
export type Department = 'comercial' | 'juridico' | 'vistoriadores' | 'administrativo';
export type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'checkbox' | 'number' | 'multi_checkbox';
export type CardType = 'com_financiamento' | 'sem_financiamento';
export type PartyType = 'vendedor' | 'comprador' | 'procurador' | 'vendedor_anterior' | 'locatario' | 'locador' | 'fiador' | 'proprietario' | 'imovel';
export type AdminTaskCategory = 'financeiro' | 'cadastral' | 'operacional';
export type AdminCardStatus = 'em_andamento' | 'concluido' | 'cancelado';

export interface Profile {
  email: string | null;
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  department: Department | null;
  created_at: string;
  updated_at: string;
  must_change_password?: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  position: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardConfig {
  id: string;
  board_id: string;
  // Standard fields visibility
  show_guarantee_type: boolean;
  show_contract_type: boolean;
  show_robust_code: boolean;
  show_building_name: boolean;
  show_address: boolean;
  show_superlogica_id: boolean;
  show_proposal_responsible: boolean;
  show_document_deadline: boolean;
  show_negotiation_details: boolean;
  show_due_date: boolean;
  // Card identification pattern
  title_pattern: string;
  // Creation configuration
  creation_required_fields: string[];
  show_financing_toggle: boolean;
  auto_create_parties: string[];
  auto_apply_checklist_templates: string[];
  // Visibility configuration
  owner_only_visibility: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardField {
  id: string;
  board_id: string;
  field_name: string;
  field_type: FieldType;
  field_options: string[];
  is_required: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CardFieldValue {
  id: string;
  card_id: string;
  field_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  name: string;
  color: string;
  department: Department | null;
  position: number;
  board_id: string | null;
  created_at: string;
  updated_at: string;
  review_deadline_days: number | null;
  default_responsible_id: string | null;
  sla_hours: number | null;
  // Configurable default checklist items per stage. Stored as JSON; expected shape: { title: string }[]
  default_checklist_items: any;
}

export type LabelCategory = 'prioridade' | 'risco' | 'dependencia_externa' | 'tipo_processo' | 'documento_cadastro' | 'informacao_interna';

export interface Label {
  id: string;
  name: string;
  color: string;
  board_id: string | null;
  created_at: string;
  category?: LabelCategory | null;
  show_on_card?: boolean;
  show_on_modal_header?: boolean;
  counts_as_alert?: boolean;
  criticality?: number;
  source_type?: string;
}

export interface Card {
  id: string;
  card_number: number;
  title: string;
  robust_code: string | null;
  building_name: string | null;
  superlogica_id: string | null;
  address: string | null;
  description: string | null;
  proposal_responsible: string | null;
  negotiation_details: string | null;
   guarantee_type: GuaranteeType | null;
   contract_type: ContractType | null;
   proposal_display_code: string | null;
  column_id: string | null;
  board_id: string | null;
  position: number;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  // Deadline fields
  document_deadline: string | null;
  deadline_met: boolean;
  deadline_met_at: string | null;
  deadline_met_by: string | null;
  deadline_dispensed: boolean;
  deadline_dispensed_at: string | null;
  deadline_dispensed_by: string | null;
  deadline_edited_at: string | null;
  deadline_edited_by: string | null;
  // Vacancy deadline fields (for Rescisão flow)
  vacancy_deadline_met: boolean;
  vacancy_deadline_met_at: string | null;
  vacancy_deadline_met_by: string | null;
  // Column review fields (for Venda flow)
  column_entered_at: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  card_type: CardType | null;
  // Movement tracking
  last_moved_by: string | null;
  last_moved_at: string | null;
  // Andamento (próxima ação operacional)
  next_action: string | null;
  responsible_user_id: string | null;
  next_action_due_date: string | null;
  next_action_completed_at: string | null;
  next_action_completed_by: string | null;
  last_completed_action: string | null;
  last_completed_action_at: string | null;
  last_completed_action_by: string | null;
  // Proposta pública vinculada
  proposal_link_id: string | null;
  proposal_submitted_at: string | null;
  // Responsáveis internos (corretor captador / atendimento)
  capturing_broker_id: string | null;
  service_broker_id: string | null;
}

export interface CardParty {
  id: string;
  card_id: string;
  party_type: PartyType;
  party_number: number;
  name: string | null;
  checklist_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CardLabel {
  card_id: string;
  label_id: string;
}

export interface CardMember {
  card_id: string;
  user_id: string;
  assigned_at: string;
}

export interface Checklist {
  id: string;
  card_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_completed: boolean;
  position: number;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_profile?: Profile | null;
  created_at: string;
  is_dismissed?: boolean;
  dismissed_reason?: string | null;
  dismissed_at?: string | null;
  dismissed_by?: string | null;
  dismissed_by_profile?: Profile | null;
  // New fields for document dates and certificate status
  issue_date?: string | null;
  certificate_status?: 'positive' | 'negative' | null;
  // Fields for Saldo Devedor
  creditor_name?: string | null;
  creditor_value?: string | null;
  // Fields for Estado Civil
  civil_status_type?: 'nascimento' | 'casamento' | 'outros' | null;
  civil_status_other?: string | null;
  // Field for Condomínio Administradora
  administrator_name?: string | null;
  // Template-configured dynamic subfields
  requires_date?: boolean;
  requires_status?: boolean;
  requires_observation?: boolean;
  status_options?: string[];
  observation_text?: string | null;
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  card_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  board_id: string;
  name: string;
  position: number | null;
  created_at: string;
}

export interface ChecklistItemTemplate {
  id: string;
  template_id: string;
  content: string;
  position: number | null;
  created_at: string;
}

// Extended types with relations
export interface CardWithRelations extends Card {
  labels?: Label[];
  members?: Profile[];
  checklists?: ChecklistWithItems[];
  column?: Column;
  comments_count?: number;
  field_values?: CardFieldValue[];
  created_by_profile?: Profile | null;
  archived_by_profile?: Profile | null;
  deadline_met_by_profile?: Profile | null;
  deadline_dispensed_by_profile?: Profile | null;
  deadline_edited_by_profile?: Profile | null;
  vacancy_deadline_met_by_profile?: Profile | null;
  last_reviewed_by_profile?: Profile | null;
  last_moved_by_profile?: Profile | null;
  responsible_user_profile?: Profile | null;
  parties?: CardPartyWithChecklist[];
  proposal_link?: { id: string; status: string } | null;
}

export interface CardPartyWithChecklist extends CardParty {
  checklist?: ChecklistWithItems;
  created_by_profile?: Profile | null;
}

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

export interface ColumnWithCards extends Column {
  cards: CardWithRelations[];
}

export interface BoardWithColumns extends Board {
  columns: ColumnWithCards[];
}

export interface BoardWithFields extends Board {
  fields: BoardField[];
}

export interface ChecklistTemplateWithItems extends ChecklistTemplate {
  items: ChecklistItemTemplate[];
}

// Administrative Flow Types
export interface AdminTaskType {
  id: string;
  name: string;
  description: string | null;
  category: AdminTaskCategory;
  has_checklist: boolean;
  checklist_items: string[];
  estimated_minutes: number | null;
  position: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface AdminCard {
  id: string;
  task_type_id: string | null;
  title: string;
  description: string | null;
  category: AdminTaskCategory;
  user_id: string;
  status: AdminCardStatus;
  started_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  checklist_items: AdminChecklistItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminChecklistItem {
  content: string;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface AdminCardWithRelations extends AdminCard {
  task_type?: AdminTaskType | null;
  user_profile?: Profile | null;
}

export interface AdminProductivityReport {
  user_id: string;
  user_name: string;
  month: string;
  category: AdminTaskCategory;
  completed_count: number;
  in_progress_count: number;
  cancelled_count: number;
  total_count: number;
  completion_rate: number;
  avg_completion_minutes: number | null;
}