export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_cards: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          category: Database["public"]["Enums"]["admin_task_category"]
          checklist_items: Json | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
          task_type_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          category: Database["public"]["Enums"]["admin_task_category"]
          checklist_items?: Json | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          task_type_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          category?: Database["public"]["Enums"]["admin_task_category"]
          checklist_items?: Json | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          task_type_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_cards_task_type_id_fkey"
            columns: ["task_type_id"]
            isOneToOne: false
            referencedRelation: "admin_task_types"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_task_types: {
        Row: {
          category: Database["public"]["Enums"]["admin_task_category"]
          checklist_items: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          has_checklist: boolean | null
          id: string
          is_active: boolean | null
          name: string
          position: number | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["admin_task_category"]
          checklist_items?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          has_checklist?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["admin_task_category"]
          checklist_items?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          has_checklist?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          force_refresh_at: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          force_refresh_at?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          force_refresh_at?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      board_config: {
        Row: {
          auto_apply_checklist_templates: string[] | null
          auto_create_parties: string[] | null
          board_id: string
          created_at: string
          creation_required_fields: string[] | null
          id: string
          owner_only_visibility: boolean | null
          show_address: boolean | null
          show_building_name: boolean | null
          show_contract_type: boolean | null
          show_document_deadline: boolean | null
          show_due_date: boolean | null
          show_financing_toggle: boolean | null
          show_guarantee_type: boolean | null
          show_negotiation_details: boolean | null
          show_proposal_responsible: boolean | null
          show_robust_code: boolean | null
          show_superlogica_id: boolean | null
          title_pattern: string | null
          updated_at: string
        }
        Insert: {
          auto_apply_checklist_templates?: string[] | null
          auto_create_parties?: string[] | null
          board_id: string
          created_at?: string
          creation_required_fields?: string[] | null
          id?: string
          owner_only_visibility?: boolean | null
          show_address?: boolean | null
          show_building_name?: boolean | null
          show_contract_type?: boolean | null
          show_document_deadline?: boolean | null
          show_due_date?: boolean | null
          show_financing_toggle?: boolean | null
          show_guarantee_type?: boolean | null
          show_negotiation_details?: boolean | null
          show_proposal_responsible?: boolean | null
          show_robust_code?: boolean | null
          show_superlogica_id?: boolean | null
          title_pattern?: string | null
          updated_at?: string
        }
        Update: {
          auto_apply_checklist_templates?: string[] | null
          auto_create_parties?: string[] | null
          board_id?: string
          created_at?: string
          creation_required_fields?: string[] | null
          id?: string
          owner_only_visibility?: boolean | null
          show_address?: boolean | null
          show_building_name?: boolean | null
          show_contract_type?: boolean | null
          show_document_deadline?: boolean | null
          show_due_date?: boolean | null
          show_financing_toggle?: boolean | null
          show_guarantee_type?: boolean | null
          show_negotiation_details?: boolean | null
          show_proposal_responsible?: boolean | null
          show_robust_code?: boolean | null
          show_superlogica_id?: boolean | null
          title_pattern?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_config_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: true
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_fields: {
        Row: {
          board_id: string
          created_at: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean | null
          position: number | null
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean | null
          position?: number | null
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          position?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_fields_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      card_activity_log: {
        Row: {
          card_id: string
          created_at: string
          from_column_id: string | null
          id: string
          to_column_id: string | null
          user_id: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          from_column_id?: string | null
          id?: string
          to_column_id?: string | null
          user_id?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          from_column_id?: string | null
          id?: string
          to_column_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_activity_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_field_values: {
        Row: {
          card_id: string
          created_at: string
          field_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          field_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          field_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_field_values_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "board_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      card_labels: {
        Row: {
          card_id: string
          label_id: string
        }
        Insert: {
          card_id: string
          label_id: string
        }
        Update: {
          card_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      card_members: {
        Row: {
          assigned_at: string
          card_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          card_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          card_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_parties: {
        Row: {
          card_id: string
          checklist_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          party_number: number
          party_type: string
        }
        Insert: {
          card_id: string
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          party_number?: number
          party_type: string
        }
        Update: {
          card_id?: string
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          party_number?: number
          party_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_parties_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_parties_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      card_template_checklist_items: {
        Row: {
          checklist_id: string
          content: string
          created_at: string
          id: string
          position: number | null
          requires_date: boolean | null
          requires_observation: boolean | null
          requires_status: boolean | null
          status_options: Json | null
        }
        Insert: {
          checklist_id: string
          content: string
          created_at?: string
          id?: string
          position?: number | null
          requires_date?: boolean | null
          requires_observation?: boolean | null
          requires_status?: boolean | null
          status_options?: Json | null
        }
        Update: {
          checklist_id?: string
          content?: string
          created_at?: string
          id?: string
          position?: number | null
          requires_date?: boolean | null
          requires_observation?: boolean | null
          requires_status?: boolean | null
          status_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "card_template_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "card_template_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      card_template_checklists: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number | null
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number | null
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_template_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      card_template_labels: {
        Row: {
          created_at: string
          id: string
          label_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_template_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_template_labels_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      card_templates: {
        Row: {
          board_id: string
          created_at: string
          created_by: string | null
          default_description: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number | null
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by?: string | null
          default_description?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number | null
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string | null
          default_description?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_templates_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_views: {
        Row: {
          card_id: string
          created_at: string
          id: string
          last_viewed_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          last_viewed_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          last_viewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_views_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          address: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          board_id: string | null
          building_name: string | null
          card_number: number
          card_type: string | null
          column_entered_at: string | null
          column_id: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string
          created_by: string | null
          deadline_dispensed: boolean | null
          deadline_dispensed_at: string | null
          deadline_dispensed_by: string | null
          deadline_edited_at: string | null
          deadline_edited_by: string | null
          deadline_met: boolean | null
          deadline_met_at: string | null
          deadline_met_by: string | null
          description: string | null
          document_deadline: string | null
          due_date: string | null
          guarantee_type: Database["public"]["Enums"]["guarantee_type"] | null
          id: string
          is_archived: boolean
          last_moved_at: string | null
          last_moved_by: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          negotiation_details: string | null
          position: number
          proposal_responsible: string | null
          robust_code: string | null
          superlogica_id: string | null
          title: string
          updated_at: string
          vacancy_deadline_met: boolean | null
          vacancy_deadline_met_at: string | null
          vacancy_deadline_met_by: string | null
        }
        Insert: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          board_id?: string | null
          building_name?: string | null
          card_number?: number
          card_type?: string | null
          column_entered_at?: string | null
          column_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          created_by?: string | null
          deadline_dispensed?: boolean | null
          deadline_dispensed_at?: string | null
          deadline_dispensed_by?: string | null
          deadline_edited_at?: string | null
          deadline_edited_by?: string | null
          deadline_met?: boolean | null
          deadline_met_at?: string | null
          deadline_met_by?: string | null
          description?: string | null
          document_deadline?: string | null
          due_date?: string | null
          guarantee_type?: Database["public"]["Enums"]["guarantee_type"] | null
          id?: string
          is_archived?: boolean
          last_moved_at?: string | null
          last_moved_by?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          negotiation_details?: string | null
          position?: number
          proposal_responsible?: string | null
          robust_code?: string | null
          superlogica_id?: string | null
          title: string
          updated_at?: string
          vacancy_deadline_met?: boolean | null
          vacancy_deadline_met_at?: string | null
          vacancy_deadline_met_by?: string | null
        }
        Update: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          board_id?: string | null
          building_name?: string | null
          card_number?: number
          card_type?: string | null
          column_entered_at?: string | null
          column_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          created_by?: string | null
          deadline_dispensed?: boolean | null
          deadline_dispensed_at?: string | null
          deadline_dispensed_by?: string | null
          deadline_edited_at?: string | null
          deadline_edited_by?: string | null
          deadline_met?: boolean | null
          deadline_met_at?: string | null
          deadline_met_by?: string | null
          description?: string | null
          document_deadline?: string | null
          due_date?: string | null
          guarantee_type?: Database["public"]["Enums"]["guarantee_type"] | null
          id?: string
          is_archived?: boolean
          last_moved_at?: string | null
          last_moved_by?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          negotiation_details?: string | null
          position?: number
          proposal_responsible?: string | null
          robust_code?: string | null
          superlogica_id?: string | null
          title?: string
          updated_at?: string
          vacancy_deadline_met?: boolean | null
          vacancy_deadline_met_at?: string | null
          vacancy_deadline_met_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          position: number | null
          requires_date: boolean | null
          requires_observation: boolean | null
          requires_status: boolean | null
          status_options: Json | null
          template_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          position?: number | null
          requires_date?: boolean | null
          requires_observation?: boolean | null
          requires_status?: boolean | null
          status_options?: Json | null
          template_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position?: number | null
          requires_date?: boolean | null
          requires_observation?: boolean | null
          requires_status?: boolean | null
          status_options?: Json | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          administrator_name: string | null
          certificate_status: string | null
          checklist_id: string
          civil_status_other: string | null
          civil_status_type: string | null
          completed_at: string | null
          completed_by: string | null
          content: string
          created_at: string
          creditor_name: string | null
          creditor_value: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          dismissed_reason: string | null
          id: string
          is_completed: boolean
          is_dismissed: boolean | null
          issue_date: string | null
          observation_text: string | null
          position: number
          requires_date: boolean | null
          requires_observation: boolean | null
          requires_status: boolean | null
          status_options: Json | null
        }
        Insert: {
          administrator_name?: string | null
          certificate_status?: string | null
          checklist_id: string
          civil_status_other?: string | null
          civil_status_type?: string | null
          completed_at?: string | null
          completed_by?: string | null
          content: string
          created_at?: string
          creditor_name?: string | null
          creditor_value?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismissed_reason?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean | null
          issue_date?: string | null
          observation_text?: string | null
          position?: number
          requires_date?: boolean | null
          requires_observation?: boolean | null
          requires_status?: boolean | null
          status_options?: Json | null
        }
        Update: {
          administrator_name?: string | null
          certificate_status?: string | null
          checklist_id?: string
          civil_status_other?: string | null
          civil_status_type?: string | null
          completed_at?: string | null
          completed_by?: string | null
          content?: string
          created_at?: string
          creditor_name?: string | null
          creditor_value?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismissed_reason?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean | null
          issue_date?: string | null
          observation_text?: string | null
          position?: number
          requires_date?: boolean | null
          requires_observation?: boolean | null
          requires_status?: boolean | null
          status_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          board_id: string
          created_at: string
          id: string
          name: string
          position: number | null
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          name: string
          position?: number | null
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          card_id: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklists_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          board_id: string | null
          color: string | null
          created_at: string
          default_responsible_id: string | null
          department: Database["public"]["Enums"]["department"] | null
          id: string
          name: string
          position: number
          review_deadline_days: number | null
          sla_hours: number | null
          updated_at: string
        }
        Insert: {
          board_id?: string | null
          color?: string | null
          created_at?: string
          default_responsible_id?: string | null
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          name: string
          position?: number
          review_deadline_days?: number | null
          sla_hours?: number | null
          updated_at?: string
        }
        Update: {
          board_id?: string | null
          color?: string | null
          created_at?: string
          default_responsible_id?: string | null
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          name?: string
          position?: number
          review_deadline_days?: number | null
          sla_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          card_id: string
          comment_id: string
          created_at: string
          id: string
          is_read: boolean
          mentioned_by: string
          mentioned_user_id: string
          read_at: string | null
        }
        Insert: {
          card_id: string
          comment_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by: string
          mentioned_user_id: string
          read_at?: string | null
        }
        Update: {
          card_id?: string
          comment_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by?: string
          mentioned_user_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          card_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          board_id: string | null
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          board_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          board_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_providers: {
        Row: {
          agreed_value: number | null
          approved_at: string | null
          approved_by: string | null
          budget_deadline: string | null
          budget_received_at: string | null
          budget_sent_at: string | null
          budget_status: string
          budget_value: number | null
          card_id: string
          completion_deadline: string | null
          created_at: string
          created_by: string | null
          id: string
          is_selected: boolean
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_responsible: string
          payment_status: string
          payment_status_changed_at: string | null
          payment_status_changed_by: string | null
          payment_value: number | null
          provider_name: string
          provider_phone: string | null
          reimbursement_status: string | null
          reimbursement_status_changed_at: string | null
          reimbursement_status_changed_by: string | null
          service_category: string | null
          service_completed_at: string | null
          service_completed_by: string | null
          updated_at: string
        }
        Insert: {
          agreed_value?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget_deadline?: string | null
          budget_received_at?: string | null
          budget_sent_at?: string | null
          budget_status?: string
          budget_value?: number | null
          card_id: string
          completion_deadline?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_selected?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_responsible?: string
          payment_status?: string
          payment_status_changed_at?: string | null
          payment_status_changed_by?: string | null
          payment_value?: number | null
          provider_name: string
          provider_phone?: string | null
          reimbursement_status?: string | null
          reimbursement_status_changed_at?: string | null
          reimbursement_status_changed_by?: string | null
          service_category?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          updated_at?: string
        }
        Update: {
          agreed_value?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget_deadline?: string | null
          budget_received_at?: string | null
          budget_sent_at?: string | null
          budget_status?: string
          budget_value?: number | null
          card_id?: string
          completion_deadline?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_selected?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_responsible?: string
          payment_status?: string
          payment_status_changed_at?: string | null
          payment_status_changed_by?: string | null
          payment_value?: number | null
          provider_name?: string
          provider_phone?: string | null
          reimbursement_status?: string | null
          reimbursement_status_changed_at?: string | null
          reimbursement_status_changed_by?: string | null
          service_category?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_providers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          card_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo_robust: number
          complemento: string | null
          condominio: number | null
          created_at: string
          estado: string | null
          finalidade: string | null
          foto_principal: string | null
          id: string
          iptu: number | null
          last_synced_at: string
          logradouro: string | null
          numero: string | null
          raw_data: Json | null
          seguro_incendio: number | null
          status_imovel: number | null
          tipo_imovel: string | null
          titulo: string | null
          updated_at: string
          valor_aluguel: number | null
          valor_venda: number | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_robust: number
          complemento?: string | null
          condominio?: number | null
          created_at?: string
          estado?: string | null
          finalidade?: string | null
          foto_principal?: string | null
          id?: string
          iptu?: number | null
          last_synced_at?: string
          logradouro?: string | null
          numero?: string | null
          raw_data?: Json | null
          seguro_incendio?: number | null
          status_imovel?: number | null
          tipo_imovel?: string | null
          titulo?: string | null
          updated_at?: string
          valor_aluguel?: number | null
          valor_venda?: number | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_robust?: number
          complemento?: string | null
          condominio?: number | null
          created_at?: string
          estado?: string | null
          finalidade?: string | null
          foto_principal?: string | null
          id?: string
          iptu?: number | null
          last_synced_at?: string
          logradouro?: string | null
          numero?: string | null
          raw_data?: Json | null
          seguro_incendio?: number | null
          status_imovel?: number | null
          tipo_imovel?: string | null
          titulo?: string | null
          updated_at?: string
          valor_aluguel?: number | null
          valor_venda?: number | null
        }
        Relationships: []
      }
      proposal_links: {
        Row: {
          accessed_at: string | null
          address_summary: string | null
          broker_name: string | null
          broker_user_id: string | null
          codigo_robust: number
          created_at: string
          created_by: string | null
          id: string
          property_name: string | null
          rent_value: number | null
          status: string
        }
        Insert: {
          accessed_at?: string | null
          address_summary?: string | null
          broker_name?: string | null
          broker_user_id?: string | null
          codigo_robust: number
          created_at?: string
          created_by?: string | null
          id?: string
          property_name?: string | null
          rent_value?: number | null
          status?: string
        }
        Update: {
          accessed_at?: string | null
          address_summary?: string | null
          broker_name?: string | null
          broker_user_id?: string | null
          codigo_robust?: number
          created_at?: string
          created_by?: string | null
          id?: string
          property_name?: string | null
          rent_value?: number | null
          status?: string
        }
        Relationships: []
      }
      proposal_responsibles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          position: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number | null
        }
        Relationships: []
      }
      provider_registry: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          public_token: string
          slug: string
          specialty: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          public_token?: string
          slug: string
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          public_token?: string
          slug?: string
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_boards: {
        Row: {
          board_id: string
          created_at: string
          created_by: string | null
          id: string
          is_board_admin: boolean
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_board_admin?: boolean
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_board_admin?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_boards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_boards: { Args: { _user_id: string }; Returns: boolean }
      can_manage_card: {
        Args: { _card_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_card: {
        Args: { _card_id: string; _user_id: string }
        Returns: boolean
      }
      get_admin_productivity_report: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          avg_completion_minutes: number
          cancelled_count: number
          category: Database["public"]["Enums"]["admin_task_category"]
          completed_count: number
          completion_rate: number
          in_progress_count: number
          month: string
          total_count: number
          user_id: string
          user_name: string
        }[]
      }
      get_board_productivity_report: {
        Args: { _board_id?: string; _end_date?: string; _start_date?: string }
        Returns: {
          avg_completion_hours: number
          board_id: string
          board_name: string
          cards_completed: number
          cards_created: number
          cards_in_progress: number
          month: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_interaction_ranking: {
        Args: { _board_id?: string; _end_date?: string; _start_date?: string }
        Returns: {
          card_moves: number
          checklist_completions: number
          comments_count: number
          total_interactions: number
          user_id: string
          user_name: string
        }[]
      }
      has_board_access: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_board_admin: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_task_category: "financeiro" | "cadastral" | "operacional"
      app_role: "admin" | "editor" | "viewer"
      contract_type: "digital" | "fisico"
      department: "comercial" | "juridico" | "vistoriadores" | "administrativo"
      guarantee_type:
        | "fiador"
        | "seguro_fianca"
        | "caucao"
        | "titulo_capitalizacao"
        | "outro"
        | "sg_cred"
        | "ucred"
        | "sem_garantia"
        | "carta_fianca"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_task_category: ["financeiro", "cadastral", "operacional"],
      app_role: ["admin", "editor", "viewer"],
      contract_type: ["digital", "fisico"],
      department: ["comercial", "juridico", "vistoriadores", "administrativo"],
      guarantee_type: [
        "fiador",
        "seguro_fianca",
        "caucao",
        "titulo_capitalizacao",
        "outro",
        "sg_cred",
        "ucred",
        "sem_garantia",
        "carta_fianca",
      ],
    },
  },
} as const
