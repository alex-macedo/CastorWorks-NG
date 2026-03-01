export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          company_id: string | null
          status: string
          schedule_status: Database["public"]["Enums"]["project_schedule_status"]
          schedule_status_updated_at: string | null
          schedule_status_metrics: Json
          type: string | null
          location: string | null
          start_date: string | null
          end_date: string | null
          manager: string | null
          total_area: number | null
          image_url: string | null
          budget_model: string | null
          task_column_width: number | null
          client_name: string | null
          auto_cascade: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          company_id?: string | null
          status?: string
          schedule_status?: Database["public"]["Enums"]["project_schedule_status"]
          schedule_status_updated_at?: string | null
          schedule_status_metrics?: Json
          type?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          manager?: string | null
          total_area?: number | null
          image_url?: string | null
          budget_model?: string | null
          task_column_width?: number | null
          client_name?: string | null
          auto_cascade?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          company_id?: string | null
          status?: string
          schedule_status?: Database["public"]["Enums"]["project_schedule_status"]
          schedule_status_updated_at?: string | null
          schedule_status_metrics?: Json
          type?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          manager?: string | null
          total_area?: number | null
          image_url?: string | null
          budget_model?: string | null
          task_column_width?: number | null
          client_name?: string | null
          auto_cascade?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_photos: {
        Row: {
          id: string
          project_id: string
          file_path: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_path: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_path?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      dropdown_options: {
        Row: {
          id: string
          category: string
          value: string
          label: string
          description: string | null
          sort_order: number
          is_active: boolean
          is_default: boolean
          parent_category: string | null
          parent_value: string | null
          color: string | null
          icon: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          value: string
          label: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          is_default?: boolean
          parent_category?: string | null
          parent_value?: string | null
          color?: string | null
          icon?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          value?: string
          label?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          is_default?: boolean
          parent_category?: string | null
          parent_value?: string | null
          color?: string | null
          icon?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          labor_rate_mason: number | null
          labor_rate_plumber: number | null
          labor_rate_electrician: number | null
          labor_rate_painter: number | null
          labor_rate_manager: number | null
          default_state: string | null
          default_profit_margin: number | null
          default_freight_percentage: number | null
          default_payment_terms: string | null
          sinapi_last_update: string | null
          sinapi_auto_update: boolean | null
          sinapi_freight_markup: number | null
          sinapi_material_markup: number | null
          bdi_central_admin: number | null
          bdi_site_overhead: number | null
          bdi_financial_costs: number | null
          bdi_risks_insurance: number | null
          bdi_taxes: number | null
          bdi_profit_margin: number | null
          theme: string | null
          default_report_template: string | null
          notifications_project_updates: boolean | null
          notifications_financial_alerts: boolean | null
          notifications_schedule_changes: boolean | null
          notifications_material_delivery: boolean | null
          notification_check_frequency_seconds: number | null
          last_backup_date: string | null
          auto_archive_months: number | null
          created_at: string
          updated_at: string
          benchmark_profit_margin: number | null
          benchmark_overhead_percentage: number | null
          benchmark_labor_cost_percentage: number | null
          system_language: string | null
          system_currency: string | null
          system_date_format: string | null
          system_time_zone: string | null
          system_weather_location: string | null
          system_temperature_unit: string | null
          system_number_format: string | null
          default_budget_model: string | null
          sales_pipeline_columns: Json | null
          bdi_pis: number | null
          bdi_cofins: number | null
          bdi_iss: number | null
          bdi_social_taxes: number | null
          auto_create_simple_budget: boolean | null
          auto_create_bdi_brazil_budget: boolean | null
          auto_create_cost_control_budget: boolean | null
          contact_types: Json | null
          installments_due_days: number | null
          tax_strategy_links: Json | null
        }
        Insert: {
          id?: string
          labor_rate_mason?: number | null
          labor_rate_plumber?: number | null
          labor_rate_electrician?: number | null
          labor_rate_painter?: number | null
          labor_rate_manager?: number | null
          default_state?: string | null
          default_profit_margin?: number | null
          default_freight_percentage?: number | null
          default_payment_terms?: string | null
          sinapi_last_update?: string | null
          sinapi_auto_update?: boolean | null
          sinapi_freight_markup?: number | null
          sinapi_material_markup?: number | null
          bdi_central_admin?: number | null
          bdi_site_overhead?: number | null
          bdi_financial_costs?: number | null
          bdi_risks_insurance?: number | null
          bdi_taxes?: number | null
          bdi_profit_margin?: number | null
          theme?: string | null
          default_report_template?: string | null
          notifications_project_updates?: boolean | null
          notifications_financial_alerts?: boolean | null
          notifications_schedule_changes?: boolean | null
          notifications_material_delivery?: boolean | null
          notification_check_frequency_seconds?: number | null
          last_backup_date?: string | null
          auto_archive_months?: number | null
          created_at?: string
          updated_at?: string
          benchmark_profit_margin?: number | null
          benchmark_overhead_percentage?: number | null
          benchmark_labor_cost_percentage?: number | null
          system_language?: string | null
          system_currency?: string | null
          system_date_format?: string | null
          system_time_zone?: string | null
          system_weather_location?: string | null
          system_temperature_unit?: string | null
          system_number_format?: string | null
          default_budget_model?: string | null
          sales_pipeline_columns?: Json | null
          bdi_pis?: number | null
          bdi_cofins?: number | null
          bdi_iss?: number | null
          bdi_social_taxes?: number | null
          auto_create_simple_budget?: boolean | null
          auto_create_bdi_brazil_budget?: boolean | null
          auto_create_cost_control_budget?: boolean | null
          contact_types?: Json | null
          installments_due_days?: number | null
          tax_strategy_links?: Json | null
        }
        Update: {
          id?: string
          labor_rate_mason?: number | null
          labor_rate_plumber?: number | null
          labor_rate_electrician?: number | null
          labor_rate_painter?: number | null
          labor_rate_manager?: number | null
          default_state?: string | null
          default_profit_margin?: number | null
          default_freight_percentage?: number | null
          default_payment_terms?: string | null
          sinapi_last_update?: string | null
          sinapi_auto_update?: boolean | null
          sinapi_freight_markup?: number | null
          sinapi_material_markup?: number | null
          bdi_central_admin?: number | null
          bdi_site_overhead?: number | null
          bdi_financial_costs?: number | null
          bdi_risks_insurance?: number | null
          bdi_taxes?: number | null
          bdi_profit_margin?: number | null
          theme?: string | null
          default_report_template?: string | null
          notifications_project_updates?: boolean | null
          notifications_financial_alerts?: boolean | null
          notifications_schedule_changes?: boolean | null
          notifications_material_delivery?: boolean | null
          notification_check_frequency_seconds?: number | null
          last_backup_date?: string | null
          auto_archive_months?: number | null
          created_at?: string
          updated_at?: string
          benchmark_profit_margin?: number | null
          benchmark_overhead_percentage?: number | null
          benchmark_labor_cost_percentage?: number | null
          system_language?: string | null
          system_currency?: string | null
          system_date_format?: string | null
          system_time_zone?: string | null
          system_weather_location?: string | null
          system_temperature_unit?: string | null
          system_number_format?: string | null
          default_budget_model?: string | null
          sales_pipeline_columns?: Json | null
          bdi_pis?: number | null
          bdi_cofins?: number | null
          bdi_iss?: number | null
          bdi_social_taxes?: number | null
          auto_create_simple_budget?: boolean | null
          auto_create_bdi_brazil_budget?: boolean | null
          auto_create_cost_control_budget?: boolean | null
          contact_types?: Json | null
          installments_due_days?: number | null
          tax_strategy_links?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'project_manager' | 'supervisor' | 'accountant' | 'client' | 'site_supervisor' | 'admin_office' | 'viewer' | 'editor' | 'architect' | 'global_admin'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'project_manager' | 'supervisor' | 'accountant' | 'client' | 'site_supervisor' | 'admin_office' | 'viewer' | 'editor' | 'architect' | 'global_admin'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'project_manager' | 'supervisor' | 'accountant' | 'client' | 'site_supervisor' | 'admin_office' | 'viewer' | 'editor' | 'architect' | 'global_admin'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_projects: {
        Row: {
          id: string
          project_id: string
          cno_number: string | null
          cno_registered_at: string | null
          owner_type: 'PF' | 'PJ'
          owner_document: string | null
          pj_has_accounting: boolean | null
          area_main: number
          area_complementary: number
          area_total: number
          category: 'OBRA_NOVA' | 'ACRESCIMO' | 'REFORMA' | 'DEMOLICAO'
          construction_type: 'ALVENARIA' | 'MISTA' | 'MADEIRA' | 'PRE_MOLDADO' | 'METALICA'
          destination: string
          state_code: string
          municipality: string | null
          start_date: string | null
          expected_end_date: string | null
          actual_end_date: string | null
          status: 'DRAFT' | 'PLANNING' | 'IN_PROGRESS' | 'READY_FOR_SERO' | 'SERO_DONE' | 'LIABILITY_OPEN' | 'PARCELADO' | 'PAID' | 'CLOSED'
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          has_strategy_service: boolean
        }
        Insert: {
          id?: string
          project_id: string
          cno_number?: string | null
          cno_registered_at?: string | null
          owner_type: 'PF' | 'PJ'
          owner_document?: string | null
          pj_has_accounting?: boolean | null
          area_main?: number
          area_complementary?: number
          category?: 'OBRA_NOVA' | 'ACRESCIMO' | 'REFORMA' | 'DEMOLICAO'
          construction_type?: 'ALVENARIA' | 'MISTA' | 'MADEIRA' | 'PRE_MOLDADO' | 'METALICA'
          destination?: string
          state_code: string
          municipality?: string | null
          start_date?: string | null
          expected_end_date?: string | null
          actual_end_date?: string | null
          status?: 'DRAFT' | 'PLANNING' | 'IN_PROGRESS' | 'READY_FOR_SERO' | 'SERO_DONE' | 'LIABILITY_OPEN' | 'PARCELADO' | 'PAID' | 'CLOSED'
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          has_strategy_service?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          cno_number?: string | null
          cno_registered_at?: string | null
          owner_type?: 'PF' | 'PJ'
          owner_document?: string | null
          pj_has_accounting?: boolean | null
          area_main?: number
          area_complementary?: number
          category?: 'OBRA_NOVA' | 'ACRESCIMO' | 'REFORMA' | 'DEMOLICAO'
          construction_type?: 'ALVENARIA' | 'MISTA' | 'MADEIRA' | 'PRE_MOLDADO' | 'METALICA'
          destination?: string
          state_code?: string
          municipality?: string | null
          start_date?: string | null
          expected_end_date?: string | null
          actual_end_date?: string | null
          status?: 'DRAFT' | 'PLANNING' | 'IN_PROGRESS' | 'READY_FOR_SERO' | 'SERO_DONE' | 'LIABILITY_OPEN' | 'PARCELADO' | 'PAID' | 'CLOSED'
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          has_strategy_service?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tax_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_estimates: {
        Row: {
          id: string
          tax_project_id: string
          vau_used: number
          vau_reference_date: string
          cod: number
          rmt_base: number
          fator_social: number | null
          category_reduction: number | null
          pre_moldados_applied: boolean
          rmt_final: number
          labor_deductions: number
          inss_estimate: number
          inss_without_strategy: number
          potential_savings: number
          construction_months: number | null
          planned_total_inss: number | null
          planned_monthly_payment: number | null
          planned_total_savings: number | null
          planned_savings_percentage: number | null
          iss_estimate: number | null
          calculation_method: string
          confidence_score: number
          assumptions: Json
          notes: string | null
          calculated_at: string
          calculated_by: string | null
        }
        Insert: {
          id?: string
          tax_project_id: string
          vau_used: number
          vau_reference_date: string
          cod: number
          rmt_base: number
          fator_social?: number | null
          category_reduction?: number | null
          pre_moldados_applied?: boolean
          rmt_final: number
          labor_deductions?: number
          inss_estimate: number
          inss_without_strategy: number
          construction_months?: number | null
          planned_total_inss?: number | null
          planned_monthly_payment?: number | null
          planned_total_savings?: number | null
          planned_savings_percentage?: number | null
          iss_estimate?: number | null
          calculation_method?: string
          confidence_score?: number
          assumptions?: Json
          notes?: string | null
          calculated_at?: string
          calculated_by?: string | null
        }
        Update: {
          id?: string
          tax_project_id?: string
          vau_used?: number
          vau_reference_date?: string
          cod?: number
          rmt_base?: number
          fator_social?: number | null
          category_reduction?: number | null
          pre_moldados_applied?: boolean
          rmt_final?: number
          labor_deductions?: number
          inss_estimate?: number
          inss_without_strategy?: number
          construction_months?: number | null
          planned_total_inss?: number | null
          planned_monthly_payment?: number | null
          planned_total_savings?: number | null
          planned_savings_percentage?: number | null
          iss_estimate?: number | null
          calculation_method?: string
          confidence_score?: number
          assumptions?: Json
          notes?: string | null
          calculated_at?: string
          calculated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_estimates_tax_project_id_fkey"
            columns: ["tax_project_id"]
            isOneToOne: false
            referencedRelation: "tax_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_submissions: {
        Row: {
          id: string
          tax_project_id: string
          reference_month: string
          sero_submitted: boolean
          sero_submission_date: string | null
          sero_receipt: string | null
          dctfweb_submitted: boolean
          dctfweb_transmission_date: string | null
          dctfweb_receipt_number: string | null
          labor_amount_declared: number | null
          materials_documented: number | null
          inss_calculated: number | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tax_project_id: string
          reference_month: string
          sero_submitted?: boolean
          sero_submission_date?: string | null
          sero_receipt?: string | null
          dctfweb_submitted?: boolean
          dctfweb_transmission_date?: string | null
          dctfweb_receipt_number?: string | null
          labor_amount_declared?: number | null
          materials_documented?: number | null
          inss_calculated?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tax_project_id?: string
          reference_month?: string
          sero_submitted?: boolean
          sero_submission_date?: string | null
          sero_receipt?: string | null
          dctfweb_submitted?: boolean
          dctfweb_transmission_date?: string | null
          dctfweb_receipt_number?: string | null
          labor_amount_declared?: number | null
          materials_documented?: number | null
          inss_calculated?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_submissions_tax_project_id_fkey"
            columns: ["tax_project_id"]
            isOneToOne: false
            referencedRelation: "tax_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_payments: {
        Row: {
          id: string
          tax_project_id: string
          tax_type: string
          reference_period: string | null
          amount: number
          due_date: string
          payment_date: string | null
          darf_number: string | null
          darf_receipt_url: string | null
          status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARCELADO' | 'CANCELLED'
          is_parcelado: boolean
          parcelamento_number: string | null
          installment_number: number | null
          total_installments: number | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tax_project_id: string
          tax_type?: string
          reference_period?: string | null
          amount: number
          due_date: string
          payment_date?: string | null
          darf_number?: string | null
          darf_receipt_url?: string | null
          status?: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARCELADO' | 'CANCELLED'
          is_parcelado?: boolean
          parcelamento_number?: string | null
          installment_number?: number | null
          total_installments?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tax_project_id?: string
          tax_type?: string
          reference_period?: string | null
          amount?: number
          due_date?: string
          payment_date?: string | null
          darf_number?: string | null
          darf_receipt_url?: string | null
          status?: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARCELADO' | 'CANCELLED'
          is_parcelado?: boolean
          parcelamento_number?: string | null
          installment_number?: number | null
          total_installments?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_payments_tax_project_id_fkey"
            columns: ["tax_project_id"]
            isOneToOne: false
            referencedRelation: "tax_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_documents: {
        Row: {
          id: string
          tax_project_id: string
          document_type: string
          title: string
          description: string | null
          file_path: string
          file_url: string | null
          document_date: string | null
          document_value: number | null
          issuer: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          tags: string[]
          metadata: Json
          created_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          tax_project_id: string
          document_type: string
          title: string
          description?: string | null
          file_path: string
          file_url?: string | null
          document_date?: string | null
          document_value?: number | null
          issuer?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          tax_project_id?: string
          document_type?: string
          title?: string
          description?: string | null
          file_path?: string | null
          file_url?: string | null
          document_date?: string | null
          document_value?: number | null
          issuer?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_documents_tax_project_id_fkey"
            columns: ["tax_project_id"]
            isOneToOne: false
            referencedRelation: "tax_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_vau_reference: {
        Row: {
          id: string
          ref_month: string
          state_code: string
          destination_code: string
          vau_value: number
          source_note: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          ref_month: string
          state_code: string
          destination_code: string
          vau_value: number
          source_note?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          ref_month?: string
          state_code?: string
          destination_code?: string
          vau_value?: number
          source_note?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      tax_guide_process: {
        Row: {
          id: string
          tax_project_id: string
          step_order: number
          summary: string
          description: string | null
          external_url: string | null
          due_date: string | null
          attachment_url: string | null
          status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
          completed_at: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          tax_project_id: string
          step_order: number
          summary: string
          description?: string | null
          external_url?: string | null
          due_date?: string | null
          attachment_url?: string | null
          status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          tax_project_id?: string
          step_order?: number
          summary?: string
          description?: string | null
          external_url?: string | null
          due_date?: string | null
          attachment_url?: string | null
          status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_guide_process_tax_project_id_fkey"
            columns: ["tax_project_id"]
            isOneToOne: false
            referencedRelation: "tax_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_alerts: {
        Row: {
          id: string
          tax_project_id: string
          alert_type: string
          severity: string
          message: string
          due_date: string | null
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          resolved: boolean
          resolved_at: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          tax_project_id: string
          alert_type: string
          severity?: string
          message: string
          due_date?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          resolved?: boolean
          resolved_at?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tax_project_id?: string
          alert_type?: string
          severity?: string
          message?: string
          due_date?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          resolved?: boolean
          resolved_at?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_alerts_tax_project_id_fkey"
            columns: ["tax_project_id"]
            isOneToOne: false
            referencedRelation: "tax_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_financial_entries: {
        Row: {
          id: string
          project_id: string
          entry_type: 'income' | 'expense'
          category: string
          amount: number
          date: string
          payment_method: string | null
          recipient_payer: string | null
          reference: string | null
          description: string | null
          created_at: string
          updated_at: string
          iss_amount: number | null
          inss_amount: number | null
          pis_amount: number | null
          cofins_amount: number | null
          csll_amount: number | null
          tax_withholding_total: number | null
          is_service_entry: boolean
          phase_id: string | null
          cost_code_id: string | null
          wbs_node_id: string | null
        }
        Insert: {
          id?: string
          project_id: string
          entry_type: 'income' | 'expense'
          category: string
          amount: number
          date?: string
          payment_method?: string | null
          recipient_payer?: string | null
          reference?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
          iss_amount?: number | null
          inss_amount?: number | null
          pis_amount?: number | null
          cofins_amount?: number | null
          csll_amount?: number | null
          tax_withholding_total?: number | null
          is_service_entry?: boolean
          phase_id?: string | null
          cost_code_id?: string | null
          wbs_node_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          entry_type?: 'income' | 'expense'
          category?: string
          amount?: number
          date?: string
          payment_method?: string | null
          recipient_payer?: string | null
          reference?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
          iss_amount?: number | null
          inss_amount?: number | null
          pis_amount?: number | null
          cofins_amount?: number | null
          csll_amount?: number | null
          tax_withholding_total?: number | null
          is_service_entry?: boolean
          phase_id?: string | null
          cost_code_id?: string | null
          wbs_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string
          email: string | null
          avatar_url: string | null
          phone: string | null
          city: string | null
          created_at: string
          updated_at: string
          is_support_user: boolean
        }
        Insert: {
          id?: string
          user_id: string
          display_name: string
          email?: string | null
          avatar_url?: string | null
          phone?: string | null
          city?: string | null
          created_at?: string
          updated_at?: string
          is_support_user?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          email?: string | null
          avatar_url?: string | null
          phone?: string | null
          city?: string | null
          created_at?: string
          updated_at?: string
          is_support_user?: boolean
        }
        Relationships: []
      }
      project_team_members: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          user_name: string
          role: string
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          user_name: string
          role: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          user_name?: string
          role?: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      client_project_access: {
        Row: {
          id: string
          client_id: string
          project_id: string
          user_id: string | null
          access_level: string
          can_view_documents: boolean
          can_view_financials: boolean
          can_download_reports: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          project_id: string
          user_id?: string | null
          access_level?: string
          can_view_documents?: boolean
          can_view_financials?: boolean
          can_download_reports?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          project_id?: string
          user_id?: string | null
          access_level?: string
          can_view_documents?: boolean
          can_view_financials?: boolean
          can_download_reports?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_access_grants: {
        Row: {
          id: string
          project_id: string
          granted_by_user_id: string
          granted_to_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          granted_by_user_id: string
          granted_to_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          granted_by_user_id?: string
          granted_to_user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_access_grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_conversations: {
        Row: {
          id: string
          invoice_id: string
          conversation_id: string
          project_id: string
          created_by: string | null
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          invoice_id: string
          conversation_id: string
          project_id: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          invoice_id?: string
          conversation_id?: string
          project_id?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invoice_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      company_settings: {
        Row: {
          id: string
          company_name: string | null
          company_logo_url: string | null
          header_text: string | null
          footer_text: string | null
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          tax_id: string | null
          created_at: string
          updated_at: string
          pdf_header_template: string | null
          pdf_footer_template: string | null
          enable_qr_codes: boolean | null
          enable_digital_signatures: boolean | null
        }
        Insert: {
          id?: string
          company_name?: string | null
          company_logo_url?: string | null
          header_text?: string | null
          footer_text?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
          pdf_header_template?: string | null
          pdf_footer_template?: string | null
          enable_qr_codes?: boolean | null
          enable_digital_signatures?: boolean | null
        }
        Update: {
          id?: string
          company_name?: string | null
          company_logo_url?: string | null
          header_text?: string | null
          footer_text?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
          pdf_header_template?: string | null
          pdf_footer_template?: string | null
          enable_qr_codes?: boolean | null
          enable_digital_signatures?: boolean | null
        }
        Relationships: []
      }
      project_phases: {
        Row: {
          id: string
          project_id: string
          phase_name: string
          start_date: string | null
          end_date: string | null
          progress_percentage: number | null
          status: 'pending' | 'in-progress' | 'completed' | 'on-hold' | null
          budget_allocated: number | null
          budget_spent: number | null
          created_at: string
          updated_at: string
          type: 'schedule' | 'budget' | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          project_id: string
          phase_name: string
          start_date?: string | null
          end_date?: string | null
          progress_percentage?: number | null
          status?: 'pending' | 'in-progress' | 'completed' | 'on-hold' | null
          budget_allocated?: number | null
          budget_spent?: number | null
          created_at?: string
          updated_at?: string
          type?: 'schedule' | 'budget' | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          project_id?: string
          phase_name?: string
          start_date?: string | null
          end_date?: string | null
          progress_percentage?: number | null
          status?: 'pending' | 'in-progress' | 'completed' | 'on-hold' | null
          budget_allocated?: number | null
          budget_spent?: number | null
          created_at?: string
          updated_at?: string
          type?: 'schedule' | 'budget' | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_logs: {
        Row: {
          id: string
          project_id: string
          log_date: string
          weather: string | null
          tasks_completed: string | null
          workers_count: number | null
          equipment_used: string | null
          materials_delivered: string | null
          issues: string | null
          safety_incidents: string | null
          photos: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          log_date?: string
          weather?: string | null
          tasks_completed?: string | null
          workers_count?: number | null
          equipment_used?: string | null
          materials_delivered?: string | null
          issues?: string | null
          safety_incidents?: string | null
          photos?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          log_date?: string
          weather?: string | null
          tasks_completed?: string | null
          workers_count?: number | null
          equipment_used?: string | null
          materials_delivered?: string | null
          issues?: string | null
          safety_incidents?: string | null
          photos?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      content_hub: {
        Row: {
          id: string
          type: 'news' | 'article' | 'document' | 'faq'
          title: string
          slug: string
          content: string
          status: 'draft' | 'pending_approval' | 'published' | 'archived'
          visibility: string[]
          author_id: string
          approved_by: string | null
          published_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'news' | 'article' | 'document' | 'faq'
          title: string
          slug: string
          content: string
          status?: 'draft' | 'pending_approval' | 'published' | 'archived'
          visibility?: string[]
          author_id: string
          approved_by?: string | null
          published_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'news' | 'article' | 'document' | 'faq'
          title?: string
          slug?: string
          content?: string
          status?: 'draft' | 'pending_approval' | 'published' | 'archived'
          visibility?: string[]
          author_id?: string
          approved_by?: string | null
          published_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_hub_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_hub_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      architect_client_portal_tokens: {
        Row: {
          id: string
          token: string
          project_id: string
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          token: string
          project_id: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          token?: string
          project_id?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_client_portal_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      architect_pipeline_statuses: {
        Row: {
          id: string
          name: string
          color: string
          position: number
          is_default: boolean
          is_terminal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          position: number
          is_default?: boolean
          is_terminal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          position?: number
          is_default?: boolean
          is_terminal?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      architect_opportunities: {
        Row: {
          id: string
          client_id: string
          project_id: string | null
          title: string
          description: string | null
          estimated_value: number
          stage_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          project_id?: string | null
          title: string
          description?: string | null
          estimated_value: number
          stage_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          estimated_value?: number
          stage_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architect_opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      architect_tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string
          priority: string
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status: string
          priority: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_task_statuses: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color: string
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_task_statuses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_documents: {
        Row: {
          id: string
          project_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          folder_id: string | null
          is_deleted: boolean
          is_latest_version: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          folder_id?: string | null
          is_deleted?: boolean
          is_latest_version?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          file_path?: string
          file_type?: string
          file_size?: number
          folder_id?: string | null
          is_deleted?: boolean
          is_latest_version?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      architect_site_diary: {
        Row: {
          id: string
          project_id: string
          diary_date: string
          content: string
          weather_condition: string
          temperature: number | null
          photos: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          diary_date: string
          content: string
          weather_condition: string
          temperature?: number | null
          photos?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          diary_date?: string
          content?: string
          weather_condition?: string
          temperature?: number | null
          photos?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_site_diary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      budget_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          company_id: string
          created_by: string
          is_public: boolean | null
          is_default: boolean | null
          is_system: boolean | null
          budget_type: string
          total_budget_amount: number | null
          has_phases: boolean | null
          has_cost_codes: boolean | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          company_id: string
          created_by: string
          is_public?: boolean | null
          is_default?: boolean | null
          is_system?: boolean | null
          budget_type?: string
          total_budget_amount?: number | null
          has_phases?: boolean | null
          has_cost_codes?: boolean | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          company_id?: string
          created_by?: string
          is_public?: boolean | null
          is_default?: boolean | null
          is_system?: boolean | null
          budget_type?: string
          total_budget_amount?: number | null
          has_phases?: boolean | null
          has_cost_codes?: boolean | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_template_items: {
        Row: {
          id: string
          template_id: string
          category: string
          description: string | null
          budgeted_amount: number
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          category: string
          description?: string | null
          budgeted_amount?: number
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          category?: string
          description?: string | null
          budgeted_amount?: number
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_template_phases: {
        Row: {
          id: string
          template_id: string
          phase_name: string
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          phase_name: string
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          phase_name?: string
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_template_cost_codes: {
        Row: {
          id: string
          template_id: string
          cost_code_id: string
          code: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          cost_code_id: string
          code: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          cost_code_id?: string
          code?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      phase_templates: {
        Row: {
          id: string
          template_name: string
          description: string | null
          is_default: boolean | null
          is_system: boolean | null
          phases: Json
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name: string
          description?: string | null
          is_default?: boolean | null
          is_system?: boolean | null
          phases?: Json
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          description?: string | null
          is_default?: boolean | null
          is_system?: boolean | null
          phases?: Json
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_templates: {
        Row: {
          id: string
          template_name: string
          description: string | null
          is_default: boolean | null
          is_system: boolean | null
          activities: Json
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name: string
          description?: string | null
          is_default?: boolean | null
          is_system?: boolean | null
          activities?: Json
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          description?: string | null
          is_default?: boolean | null
          is_system?: boolean | null
          activities?: Json
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_wbs_templates: {
        Row: {
          id: string
          template_name: string
          description: string | null
          project_type: string | null
          is_default: boolean
          is_system: boolean
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name: string
          description?: string | null
          project_type?: string | null
          is_default?: boolean
          is_system?: boolean
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          description?: string | null
          project_type?: string | null
          is_default?: boolean
          is_system?: boolean
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      simplebudget_materials_template_meta: {
        Row: {
          id: string
          template_name: string
          description: string | null
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name?: string
          description?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          description?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      simplebudget_labor_template_meta: {
        Row: {
          id: string
          template_name: string
          description: string | null
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name?: string
          description?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          description?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: 'draft' | 'published' | 'closed' | 'archived'
          created_by: string
          created_at: string
          updated_at: string
          published_at: string | null
          version: number
          share_token: string
          settings: Json | null
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: 'draft' | 'published' | 'closed' | 'archived'
          created_by: string
          created_at?: string
          updated_at?: string
          published_at?: string | null
          version?: number
          share_token?: string
          settings?: Json | null
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'published' | 'closed' | 'archived'
          created_by?: string
          created_at?: string
          updated_at?: string
          published_at?: string | null
          version?: number
          share_token?: string
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      form_questions: {
        Row: {
          id: string
          form_id: string
          type: string
          title: string
          description: string | null
          required: boolean
          position: number
          options: Json | null
          validation: Json | null
          scale_min: number | null
          scale_max: number | null
          scale_min_label: string | null
          scale_max_label: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          type: string
          title: string
          description?: string | null
          required?: boolean
          position: number
          options?: Json | null
          validation?: Json | null
          scale_min?: number | null
          scale_max?: number | null
          scale_min_label?: string | null
          scale_max_label?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          type?: string
          title?: string
          description?: string | null
          required?: boolean
          position?: number
          options?: Json | null
          validation?: Json | null
          scale_min?: number | null
          scale_max?: number | null
          scale_min_label?: string | null
          scale_max_label?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
      form_responses: {
        Row: {
          id: string
          form_id: string
          respondent_id: string | null
          respondent_email: string | null
          status: 'in_progress' | 'completed' | 'abandoned'
          user_agent: string | null
          referrer: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          respondent_id?: string | null
          respondent_email?: string | null
          status?: 'in_progress' | 'completed' | 'abandoned'
          user_agent?: string | null
          referrer?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          respondent_id?: string | null
          respondent_email?: string | null
          status?: 'in_progress' | 'completed' | 'abandoned'
          user_agent?: string | null
          referrer?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      form_response_answers: {
        Row: {
          id: string
          response_id: string
          question_id: string
          answer_text: string | null
          answer_options: string[] | null
          answer_number: number | null
          answer_date: string | null
          answer_time: string | null
          answer_file_urls: string[] | null
          answer_matrix: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          response_id: string
          question_id: string
          answer_text?: string | null
          answer_options?: string[] | null
          answer_number?: number | null
          answer_date?: string | null
          answer_time?: string | null
          answer_file_urls?: string[] | null
          answer_matrix?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          question_id?: string
          answer_text?: string | null
          answer_options?: string[] | null
          answer_number?: number | null
          answer_date?: string | null
          answer_time?: string | null
          answer_file_urls?: string[] | null
          answer_matrix?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_response_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_response_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          }
        ]
      }
      milestone_delays: {
        Row: {
          id: string
          milestone_id: string
          project_id: string
          delay_days: number
          root_cause: 'client_definition' | 'financial' | 'labor' | 'material' | 'weather' | 'design_change' | 'regulatory' | 'quality_rework'
          responsible_party: 'client' | 'general_contractor' | 'subcontractor' | 'supplier' | 'regulatory_authority' | 'force_majeure'
          impact_type: 'isolated' | 'cascading' | 'critical_path'
          description: string
          corrective_actions: string | null
          subcontractor_trade: string | null
          reported_by: string | null
          reported_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          milestone_id: string
          project_id: string
          delay_days: number
          root_cause: 'client_definition' | 'financial' | 'labor' | 'material' | 'weather' | 'design_change' | 'regulatory' | 'quality_rework'
          responsible_party: 'client' | 'general_contractor' | 'subcontractor' | 'supplier' | 'regulatory_authority' | 'force_majeure'
          impact_type?: 'isolated' | 'cascading' | 'critical_path'
          description: string
          corrective_actions?: string | null
          subcontractor_trade?: string | null
          reported_by?: string | null
          reported_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          milestone_id?: string
          project_id?: string
          delay_days?: number
          root_cause?: 'client_definition' | 'financial' | 'labor' | 'material' | 'weather' | 'design_change' | 'regulatory' | 'quality_rework'
          responsible_party?: 'client' | 'general_contractor' | 'subcontractor' | 'supplier' | 'regulatory_authority' | 'force_majeure'
          impact_type?: 'isolated' | 'cascading' | 'critical_path'
          description?: string
          corrective_actions?: string | null
          subcontractor_trade?: string | null
          reported_by?: string | null
          reported_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_delays_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestone_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_delays_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      client_definitions: {
        Row: {
          id: string
          project_id: string
          milestone_id: string | null
          definition_item: string
          description: string | null
          required_by_date: string
          status: Database["public"]["Enums"]["client_definition_status"]
          assigned_client_contact: string | null
          impact_score: number
          completion_date: string | null
          notes: string | null
          follow_up_history: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          milestone_id?: string | null
          definition_item: string
          description?: string | null
          required_by_date: string
          status?: Database["public"]["Enums"]["client_definition_status"]
          assigned_client_contact?: string | null
          impact_score?: number
          completion_date?: string | null
          notes?: string | null
          follow_up_history?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          milestone_id?: string | null
          definition_item?: string
          description?: string | null
          required_by_date?: string
          status?: Database["public"]["Enums"]["client_definition_status"]
          assigned_client_contact?: string | null
          impact_score?: number
          completion_date?: string | null
          notes?: string | null
          follow_up_history?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_definitions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestone_definitions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      client_project_summary: {
        Row: {
          id: string
          project_name: string | null
          status: string | null
          start_date: string | null
          end_date: string | null
          client_name: string | null
          user_id: string | null
          can_view_documents: boolean | null
          can_view_financials: boolean | null
          can_download_reports: boolean | null
          document_count: number | null
          phase_count: number | null
          completed_phases: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_project_access: {
        Args: {
          user_id: string
          project_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          user_id: string
          role_name: string
        }
        Returns: boolean
      }
    }
    Enums: {
      tax_owner_type: 'PF' | 'PJ'
      tax_work_category: 'OBRA_NOVA' | 'ACRESCIMO' | 'REFORMA' | 'DEMOLICAO'
      tax_construction_type: 'ALVENARIA' | 'MISTA' | 'MADEIRA' | 'PRE_MOLDADO' | 'METALICA'
      tax_project_status: 'DRAFT' | 'PLANNING' | 'IN_PROGRESS' | 'READY_FOR_SERO' | 'SERO_DONE' | 'LIABILITY_OPEN' | 'PARCELADO' | 'PAID' | 'CLOSED'
      tax_payment_status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARCELADO' | 'CANCELLED'
      tax_document_type: 'PROJETO_ARQUITETONICO' | 'MEMORIAL_DESCRITIVO' | 'ALVARA_CONSTRUCAO' | 'HABITE_SE' | 'ART_RRT' | 'NF_MATERIAL' | 'NF_SERVICO' | 'NF_PRE_MOLDADO' | 'COMPROVANTE_PAGAMENTO' | 'CONTRATO_TRABALHO' | 'DARF' | 'DCTFWEB_RECIBO' | 'CND' | 'CPEND' | 'OUTROS'
      entry_type: 'income' | 'expense'
      project_status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
      project_schedule_status: 'not_started' | 'on_schedule' | 'at_risk' | 'delayed'
      phase_status: 'pending' | 'in-progress' | 'completed' | 'on-hold'
      request_priority: 'low' | 'medium' | 'high' | 'urgent'
      request_status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'cancelled'
      weather_condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy'
      content_status: 'draft' | 'pending_approval' | 'published' | 'archived'
      content_type: 'news' | 'article' | 'document' | 'faq'
      app_role: 'admin' | 'project_manager' | 'supervisor' | 'accountant' | 'client' | 'site_supervisor' | 'admin_office' | 'viewer' | 'editor' | 'architect' | 'global_admin'
      delay_root_cause: 'client_definition' | 'financial' | 'labor' | 'material' | 'weather' | 'design_change' | 'regulatory' | 'quality_rework'
      delay_responsible_party: 'client' | 'general_contractor' | 'subcontractor' | 'supplier' | 'regulatory_authority' | 'force_majeure'
      delay_impact_type: 'isolated' | 'cascading' | 'critical_path'
      client_definition_status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocking'
    }
  }
}
