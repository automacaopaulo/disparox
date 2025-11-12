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
      app_config: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      campaign_items: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          fbtrace_id: string | null
          id: string
          message_id: string | null
          msisdn: string
          params: Json | null
          retry_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          fbtrace_id?: string | null
          id?: string
          message_id?: string | null
          msisdn: string
          params?: Json | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          fbtrace_id?: string | null
          id?: string
          message_id?: string | null
          msisdn?: string
          params?: Json | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          csv_file_url: string | null
          delivered: number | null
          error_summary: Json | null
          failed: number | null
          id: string
          language: string | null
          name: string
          processing_rate: number | null
          read: number | null
          sent: number | null
          status: string | null
          template_name: string | null
          total_items: number | null
          updated_at: string | null
          whatsapp_number_id: string | null
        }
        Insert: {
          created_at?: string | null
          csv_file_url?: string | null
          delivered?: number | null
          error_summary?: Json | null
          failed?: number | null
          id?: string
          language?: string | null
          name: string
          processing_rate?: number | null
          read?: number | null
          sent?: number | null
          status?: string | null
          template_name?: string | null
          total_items?: number | null
          updated_at?: string | null
          whatsapp_number_id?: string | null
        }
        Update: {
          created_at?: string | null
          csv_file_url?: string | null
          delivered?: number | null
          error_summary?: Json | null
          failed?: number | null
          id?: string
          language?: string | null
          name?: string
          processing_rate?: number | null
          read?: number | null
          sent?: number | null
          status?: string | null
          template_name?: string | null
          total_items?: number | null
          updated_at?: string | null
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          cpf: string | null
          created_at: string | null
          id: string
          msisdn: string
          name: string | null
          opt_out: boolean | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          id?: string
          msisdn: string
          name?: string | null
          opt_out?: boolean | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          id?: string
          msisdn?: string
          name?: string | null
          opt_out?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          level: string
          message: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          level: string
          message: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          level?: string
          message?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: Json | null
          created_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          fbtrace_id: string | null
          id: string
          message_id: string | null
          msisdn: string
          phone_id: string | null
          status: string | null
          template_name: string | null
          updated_at: string | null
          whatsapp_number_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          direction: string
          error_code?: string | null
          error_message?: string | null
          fbtrace_id?: string | null
          id?: string
          message_id?: string | null
          msisdn: string
          phone_id?: string | null
          status?: string | null
          template_name?: string | null
          updated_at?: string | null
          whatsapp_number_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          fbtrace_id?: string | null
          id?: string
          message_id?: string | null
          msisdn?: string
          phone_id?: string | null
          status?: string | null
          template_name?: string | null
          updated_at?: string | null
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string
          mappings: Json
          name: string
          status: string
          structure: Json
          updated_at: string | null
          whatsapp_number_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          mappings?: Json
          name: string
          status?: string
          structure?: Json
          updated_at?: string | null
          whatsapp_number_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          mappings?: Json
          name?: string
          status?: string
          structure?: Json
          updated_at?: string | null
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          message_id: string | null
          processed: boolean | null
          raw: Json
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          processed?: boolean | null
          raw: Json
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          processed?: boolean | null
          raw?: Json
        }
        Relationships: []
      }
      whatsapp_numbers: {
        Row: {
          access_token: string
          business_account_id: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean | null
          name: string
          phone_number: string | null
          phone_number_id: string
          quality_rating: string | null
          updated_at: string
          waba_id: string
        }
        Insert: {
          access_token: string
          business_account_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone_number?: string | null
          phone_number_id: string
          quality_rating?: string | null
          updated_at?: string
          waba_id: string
        }
        Update: {
          access_token?: string
          business_account_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone_number?: string | null
          phone_number_id?: string
          quality_rating?: string | null
          updated_at?: string
          waba_id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
