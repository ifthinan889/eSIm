export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      esim_packages: {
        Row: {
          country_code: string
          created_at: string
          data_amount_mb: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          package_id: string
          package_type: Database["public"]["Enums"]["package_type"] | null
          price_usd: number
          region: string | null
          updated_at: string
          validity_days: number
        }
        Insert: {
          country_code: string
          created_at?: string
          data_amount_mb?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          package_id: string
          package_type?: Database["public"]["Enums"]["package_type"] | null
          price_usd: number
          region?: string | null
          updated_at?: string
          validity_days: number
        }
        Update: {
          country_code?: string
          created_at?: string
          data_amount_mb?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          package_id?: string
          package_type?: Database["public"]["Enums"]["package_type"] | null
          price_usd?: number
          region?: string | null
          updated_at?: string
          validity_days?: number
        }
        Relationships: []
      }
      esims: {
        Row: {
          activated_at: string | null
          activation_code: string | null
          created_at: string
          data_used_mb: number | null
          esim_token: string
          expires_at: string | null
          iccid: string
          id: string
          order_id: string
          qr_code_url: string | null
          status: Database["public"]["Enums"]["esim_status"] | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activation_code?: string | null
          created_at?: string
          data_used_mb?: number | null
          esim_token: string
          expires_at?: string | null
          iccid: string
          id?: string
          order_id: string
          qr_code_url?: string | null
          status?: Database["public"]["Enums"]["esim_status"] | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activation_code?: string | null
          created_at?: string
          data_used_mb?: number | null
          esim_token?: string
          expires_at?: string | null
          iccid?: string
          id?: string
          order_id?: string
          qr_code_url?: string | null
          status?: Database["public"]["Enums"]["esim_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "esims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_phone: string | null
          id: string
          markup_amount: number | null
          order_reference: string
          package_id: string
          payment_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_phone?: string | null
          id?: string
          markup_amount?: number | null
          order_reference: string
          package_id: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_phone?: string | null
          id?: string
          markup_amount?: number | null
          order_reference?: string
          package_id?: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "esim_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      topups: {
        Row: {
          amount: number
          created_at: string
          esim_id: string
          id: string
          package_id: string
          payment_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          amount: number
          created_at?: string
          esim_id: string
          id?: string
          package_id: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          amount?: number
          created_at?: string
          esim_id?: string
          id?: string
          package_id?: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "topups_esim_id_fkey"
            columns: ["esim_id"]
            isOneToOne: false
            referencedRelation: "esims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topups_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "esim_packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      esim_status: "active" | "suspended" | "cancelled" | "revoked"
      order_status: "pending" | "completed" | "failed" | "cancelled"
      package_type: "data" | "voice" | "sms" | "combo"
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
      esim_status: ["active", "suspended", "cancelled", "revoked"],
      order_status: ["pending", "completed", "failed", "cancelled"],
      package_type: ["data", "voice", "sms", "combo"],
    },
  },
} as const
