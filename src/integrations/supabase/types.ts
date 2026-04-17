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
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          allow_companions: boolean
          cancellation_deadline: string | null
          cover_url: string | null
          created_at: string
          date: string
          description: string
          header_bg_color: string | null
          header_text_color: string | null
          id: string
          is_paid: boolean
          location: string
          logo_url: string | null
          max_companions: number
          max_guests: number
          name: string
          pix_key: string | null
          primary_color: string | null
          slug: string | null
          ticket_label: string
          ticket_price: number
          time: string
          updated_at: string
          use_tickets: boolean
        }
        Insert: {
          allow_companions?: boolean
          cancellation_deadline?: string | null
          cover_url?: string | null
          created_at?: string
          date?: string
          description?: string
          header_bg_color?: string | null
          header_text_color?: string | null
          id?: string
          is_paid?: boolean
          location?: string
          logo_url?: string | null
          max_companions?: number
          max_guests?: number
          name?: string
          pix_key?: string | null
          primary_color?: string | null
          slug?: string | null
          ticket_label?: string
          ticket_price?: number
          time?: string
          updated_at?: string
          use_tickets?: boolean
        }
        Update: {
          allow_companions?: boolean
          cancellation_deadline?: string | null
          cover_url?: string | null
          created_at?: string
          date?: string
          description?: string
          header_bg_color?: string | null
          header_text_color?: string | null
          id?: string
          is_paid?: boolean
          location?: string
          logo_url?: string | null
          max_companions?: number
          max_guests?: number
          name?: string
          pix_key?: string | null
          primary_color?: string | null
          slug?: string | null
          ticket_label?: string
          ticket_price?: number
          time?: string
          updated_at?: string
          use_tickets?: boolean
        }
        Relationships: []
      }
      guests: {
        Row: {
          amount_due: number
          amount_paid: number
          checked_in: boolean
          checked_in_at: string | null
          companions: number
          confirmed_at: string | null
          created_at: string
          email: string | null
          event_id: string
          first_name: string
          id: string
          invited_by: string | null
          last_name: string
          notes: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          phone: string | null
          presence_status: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          checked_in?: boolean
          checked_in_at?: string | null
          companions?: number
          confirmed_at?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          first_name: string
          id?: string
          invited_by?: string | null
          last_name: string
          notes?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          presence_status?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          checked_in?: boolean
          checked_in_at?: string | null
          companions?: number
          confirmed_at?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          first_name?: string
          id?: string
          invited_by?: string | null
          last_name?: string
          notes?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          presence_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          guest_id: string
          id: string
          is_manual: boolean
          method: string
          notes: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          guest_id: string
          id?: string
          is_manual?: boolean
          method: string
          notes?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          guest_id?: string
          id?: string
          is_manual?: boolean
          method?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
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
