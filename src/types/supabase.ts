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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          category: Database["public"]["Enums"]["AssetCategory"]
          created_at: string
          id: string
          name: string
          purchase_cost: number
          purchase_date: string
          resort_id: string
          status: Database["public"]["Enums"]["AssetStatus"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          id: string
          name: string
          purchase_cost: number
          purchase_date: string
          resort_id: string
          status?: Database["public"]["Enums"]["AssetStatus"]
          updated_at: string
        }
        Update: {
          category?: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          id?: string
          name?: string
          purchase_cost?: number
          purchase_date?: string
          resort_id?: string
          status?: Database["public"]["Enums"]["AssetStatus"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_requests: {
        Row: {
          amount: number
          approval_comments: string | null
          approval_date: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["ExpenseCategory"]
          created_at: string
          id: string
          justification: string
          status: Database["public"]["Enums"]["ApprovalStatus"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_comments?: string | null
          approval_date?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["ExpenseCategory"]
          created_at?: string
          id: string
          justification: string
          status?: Database["public"]["Enums"]["ApprovalStatus"]
          submitted_by: string
          updated_at: string
        }
        Update: {
          amount?: number
          approval_comments?: string | null
          approval_date?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["ExpenseCategory"]
          created_at?: string
          id?: string
          justification?: string
          status?: Database["public"]["Enums"]["ApprovalStatus"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approval_comments: string | null
          approval_date: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["ExpenseCategory"]
          created_at: string
          date: string
          description: string
          id: string
          status: Database["public"]["Enums"]["ApprovalStatus"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_comments?: string | null
          approval_date?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["ExpenseCategory"]
          created_at?: string
          date: string
          description: string
          id: string
          status?: Database["public"]["Enums"]["ApprovalStatus"]
          submitted_by: string
          updated_at: string
        }
        Update: {
          amount?: number
          approval_comments?: string | null
          approval_date?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["ExpenseCategory"]
          created_at?: string
          date?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["ApprovalStatus"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          asset_category: Database["public"]["Enums"]["AssetCategory"]
          created_at: string
          dku_amount: number
          dku_percentage: number
          id: string
          invoice_id: string
          resort_amount: number
          resort_percentage: number
          revenue: number
        }
        Insert: {
          asset_category: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          dku_amount: number
          dku_percentage: number
          id: string
          invoice_id: string
          resort_amount: number
          resort_percentage: number
          revenue: number
        }
        Update: {
          asset_category?: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          dku_amount?: number
          dku_percentage?: number
          id?: string
          invoice_id?: string
          resort_amount?: number
          resort_percentage?: number
          revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          dku_share: number
          end_date: string
          generated_by: string
          id: string
          invoice_number: string
          resort_id: string
          resort_share: number
          start_date: string
          status: Database["public"]["Enums"]["InvoiceStatus"]
          total_revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dku_share: number
          end_date: string
          generated_by: string
          id: string
          invoice_number: string
          resort_id: string
          resort_share: number
          start_date: string
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          total_revenue: number
          updated_at: string
        }
        Update: {
          created_at?: string
          dku_share?: number
          end_date?: string
          generated_by?: string
          id?: string
          invoice_number?: string
          resort_id?: string
          resort_share?: number
          start_date?: string
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          asset_id: string
          created_at: string
          description: string
          end_date: string | null
          id: string
          labor_cost: number
          performed_by: string
          start_date: string
          type: Database["public"]["Enums"]["MaintenanceType"]
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          description: string
          end_date?: string | null
          id: string
          labor_cost?: number
          performed_by: string
          start_date: string
          type: Database["public"]["Enums"]["MaintenanceType"]
          updated_at: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          labor_cost?: number
          performed_by?: string
          start_date?: string
          type?: Database["public"]["Enums"]["MaintenanceType"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          id: string
          invoice_id: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          recorded_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_sharing_configs: {
        Row: {
          asset_category: Database["public"]["Enums"]["AssetCategory"]
          created_at: string
          dku_percentage: number
          effective_from: string
          id: string
          resort_id: string
          resort_percentage: number
        }
        Insert: {
          asset_category: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          dku_percentage: number
          effective_from: string
          id: string
          resort_id: string
          resort_percentage: number
        }
        Update: {
          asset_category?: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          dku_percentage?: number
          effective_from?: string
          id?: string
          resort_id?: string
          resort_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "profit_sharing_configs_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resorts: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id: string
          name: string
          updated_at: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_records: {
        Row: {
          amount: number
          asset_category: Database["public"]["Enums"]["AssetCategory"]
          created_at: string
          date: string
          id: string
          recorded_by: string
          resort_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          asset_category: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          date: string
          id: string
          recorded_by: string
          resort_id: string
          updated_at: string
        }
        Update: {
          amount?: number
          asset_category?: Database["public"]["Enums"]["AssetCategory"]
          created_at?: string
          date?: string
          id?: string
          recorded_by?: string
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          created_at: string
          id: string
          maintenance_record_id: string
          part_name: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id: string
          maintenance_record_id: string
          part_name: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          maintenance_record_id?: string
          part_name?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["UserRole"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["UserRole"]
          updated_at: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["UserRole"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ApprovalStatus: "PENDING" | "APPROVED" | "REJECTED"
      AssetCategory: "ATV" | "UTV" | "SEA_SPORT" | "POOL_TOYS" | "LINE_SPORT"
      AssetStatus: "ACTIVE" | "MAINTENANCE" | "RETIRED"
      ExpenseCategory: "OPERATIONAL" | "PERSONNEL" | "MARKETING"
      InvoiceStatus: "DRAFT" | "SENT" | "PAID"
      MaintenanceType: "PREVENTIVE" | "CORRECTIVE"
      UserRole: "ENGINEER" | "ADMIN" | "MANAGER"
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

export const Constants = {
  public: {
    Enums: {
      ApprovalStatus: ["PENDING", "APPROVED", "REJECTED"],
      AssetCategory: ["ATV", "UTV", "SEA_SPORT", "POOL_TOYS", "LINE_SPORT"],
      AssetStatus: ["ACTIVE", "MAINTENANCE", "RETIRED"],
      ExpenseCategory: ["OPERATIONAL", "PERSONNEL", "MARKETING"],
      InvoiceStatus: ["DRAFT", "SENT", "PAID"],
      MaintenanceType: ["PREVENTIVE", "CORRECTIVE"],
      UserRole: ["ENGINEER", "ADMIN", "MANAGER"],
    },
  },
} as const
