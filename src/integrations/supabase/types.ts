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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          addresses: string[] | null
          app_name: string
          created_at: string
          facebook_url: string | null
          hero_description: string | null
          hero_title: string | null
          id: string
          language: string | null
          logo_url: string | null
          map_location_url: string | null
          patient_mode: boolean | null
          payment_methods: Json | null
          phones: string[] | null
          reminder_settings: Json | null
          stats: Json | null
          terms_ar: string | null
          terms_en: string | null
          updated_at: string
          whatsapp_number: string | null
          working_hours: Json | null
        }
        Insert: {
          addresses?: string[] | null
          app_name?: string
          created_at?: string
          facebook_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          map_location_url?: string | null
          patient_mode?: boolean | null
          payment_methods?: Json | null
          phones?: string[] | null
          reminder_settings?: Json | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          working_hours?: Json | null
        }
        Update: {
          addresses?: string[] | null
          app_name?: string
          created_at?: string
          facebook_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          map_location_url?: string | null
          patient_mode?: boolean | null
          payment_methods?: Json | null
          phones?: string[] | null
          reminder_settings?: Json | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          address: string | null
          age: number | null
          booking_type: string | null
          center: string | null
          contracting_company_id: number | null
          contracting_docs: Json | null
          created_at: string
          date: string
          doctor_id: string | null
          doctor_name: string
          governorate: string | null
          id: string
          notes: string | null
          patient_email: string | null
          patient_name: string
          payment_method: string | null
          payment_status: string | null
          phone: string
          phone2: string | null
          reminder_sent: boolean | null
          reminder_type: string | null
          service: string
          status: string
          time: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          booking_type?: string | null
          center?: string | null
          contracting_company_id?: number | null
          contracting_docs?: Json | null
          created_at?: string
          date: string
          doctor_id?: string | null
          doctor_name: string
          governorate?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name: string
          payment_method?: string | null
          payment_status?: string | null
          phone: string
          phone2?: string | null
          reminder_sent?: boolean | null
          reminder_type?: string | null
          service: string
          status?: string
          time: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          booking_type?: string | null
          center?: string | null
          contracting_company_id?: number | null
          contracting_docs?: Json | null
          created_at?: string
          date?: string
          doctor_id?: string | null
          doctor_name?: string
          governorate?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          payment_method?: string | null
          payment_status?: string | null
          phone?: string
          phone2?: string | null
          reminder_sent?: boolean | null
          reminder_type?: string | null
          service?: string
          status?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string
          date: string
          id: string
          message: string
          name: string
          phone: string
          type: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message: string
          name: string
          phone: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          type?: string
        }
        Relationships: []
      }
      contact_logs: {
        Row: {
          contact_type: string
          created_at: string
          doctor_name: string | null
          id: string
          item_id: string | null
          item_type: string
          message_preview: string | null
          patient_name: string
          patient_phone: string
          staff_name: string
          staff_user_id: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          doctor_name?: string | null
          id?: string
          item_id?: string | null
          item_type: string
          message_preview?: string | null
          patient_name: string
          patient_phone: string
          staff_name: string
          staff_user_id: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          doctor_name?: string | null
          id?: string
          item_id?: string | null
          item_type?: string
          message_preview?: string | null
          patient_name?: string
          patient_phone?: string
          staff_name?: string
          staff_user_id?: string
        }
        Relationships: []
      }
      contracting_companies: {
        Row: {
          created_at: string
          documents: string[] | null
          id: number
          manager_name: string | null
          manager_phone: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documents?: string[] | null
          id?: number
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documents?: string[] | null
          id?: number
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          available_dates: string[] | null
          created_at: string
          current_bookings: number
          education: string | null
          experience: number | null
          fee: number
          follow_up_exam_count: number | null
          follow_up_surgery_count: number | null
          id: string
          image: string | null
          max_patients: number
          name: string
          patients_per_hour: number | null
          rating: number | null
          specialty: string
          top_specialties: string[] | null
          updated_at: string
        }
        Insert: {
          available_dates?: string[] | null
          created_at?: string
          current_bookings?: number
          education?: string | null
          experience?: number | null
          fee?: number
          follow_up_exam_count?: number | null
          follow_up_surgery_count?: number | null
          id?: string
          image?: string | null
          max_patients?: number
          name: string
          patients_per_hour?: number | null
          rating?: number | null
          specialty: string
          top_specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          available_dates?: string[] | null
          created_at?: string
          current_bookings?: number
          education?: string | null
          experience?: number | null
          fee?: number
          follow_up_exam_count?: number | null
          follow_up_surgery_count?: number | null
          id?: string
          image?: string | null
          max_patients?: number
          name?: string
          patients_per_hour?: number | null
          rating?: number | null
          specialty?: string
          top_specialties?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          created_at: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      instapay_audit_events: {
        Row: {
          actor_id: string | null
          actor_name: string
          booking_ref: string
          created_at: string
          event_type: string
          id: string
          new_status: string | null
          previous_status: string | null
          reason: string | null
          submission_id: string
          verification_method: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          booking_ref: string
          created_at?: string
          event_type: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          submission_id: string
          verification_method?: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          booking_ref?: string
          created_at?: string
          event_type?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          submission_id?: string
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "instapay_audit_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "instapay_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      instapay_submissions: {
        Row: {
          amount_due: number
          booking_id: string
          booking_ref: string
          created_at: string
          declared_amount: number | null
          evidence_path: string | null
          id: string
          payment_id: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          status: string
          transaction_ref: string
          updated_at: string
          verified_amount: number | null
        }
        Insert: {
          amount_due: number
          booking_id: string
          booking_ref: string
          created_at?: string
          declared_amount?: number | null
          evidence_path?: string | null
          id?: string
          payment_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
          transaction_ref: string
          updated_at?: string
          verified_amount?: number | null
        }
        Update: {
          amount_due?: number
          booking_id?: string
          booking_ref?: string
          created_at?: string
          declared_amount?: number | null
          evidence_path?: string | null
          id?: string
          payment_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
          transaction_ref?: string
          updated_at?: string
          verified_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instapay_submissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instapay_submissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          contracting_company_id: number | null
          cost: number
          created_at: string
          date: string
          doctor_name: string
          id: string
          notes: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string
          patient_phone2: string | null
          reminder_sent: boolean | null
          status: string
          surgery_type: string
          updated_at: string
        }
        Insert: {
          contracting_company_id?: number | null
          cost?: number
          created_at?: string
          date: string
          doctor_name: string
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone: string
          patient_phone2?: string | null
          reminder_sent?: boolean | null
          status?: string
          surgery_type: string
          updated_at?: string
        }
        Update: {
          contracting_company_id?: number | null
          cost?: number
          created_at?: string
          date?: string
          doctor_name?: string
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string
          patient_phone2?: string | null
          reminder_sent?: boolean | null
          status?: string
          surgery_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_secrets: {
        Row: {
          hmac_last4: string | null
          hmac_secret_enc: string | null
          mode: string
          secret_key_enc: string | null
          secret_key_last4: string | null
          updated_at: string
        }
        Insert: {
          hmac_last4?: string | null
          hmac_secret_enc?: string | null
          mode: string
          secret_key_enc?: string | null
          secret_key_last4?: string | null
          updated_at?: string
        }
        Update: {
          hmac_last4?: string | null
          hmac_secret_enc?: string | null
          mode?: string
          secret_key_enc?: string | null
          secret_key_last4?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_settings: {
        Row: {
          enabled: boolean
          id: number
          live_card_integration_id: number | null
          live_public_key: string | null
          live_wallet_integration_id: number | null
          mode: string
          test_card_integration_id: number | null
          test_public_key: string | null
          test_wallet_integration_id: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: number
          live_card_integration_id?: number | null
          live_public_key?: string | null
          live_wallet_integration_id?: number | null
          mode?: string
          test_card_integration_id?: number | null
          test_public_key?: string | null
          test_wallet_integration_id?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: number
          live_card_integration_id?: number | null
          live_public_key?: string | null
          live_wallet_integration_id?: number | null
          mode?: string
          test_card_integration_id?: number | null
          test_public_key?: string | null
          test_wallet_integration_id?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_notifications: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_read: boolean
          message: string
          patient_name: string
          payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          patient_name: string
          payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          patient_name?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_notifications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          id: string
          matched_at: string | null
          notes: string | null
          patient_name: string
          patient_phone: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          payment_type_detail: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          id?: string
          matched_at?: string | null
          notes?: string | null
          patient_name: string
          patient_phone?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          payment_type_detail?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          matched_at?: string | null
          notes?: string | null
          patient_name?: string
          patient_phone?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          payment_type_detail?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      paymob_payments: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          intention_id: string | null
          mode: string
          payment_id: string | null
          paymob_order_id: number | null
          raw_callback: Json | null
          reference: string
          source_type: string | null
          status: string
          transaction_id: number | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          intention_id?: string | null
          mode: string
          payment_id?: string | null
          paymob_order_id?: number | null
          raw_callback?: Json | null
          reference: string
          source_type?: string | null
          status?: string
          transaction_id?: number | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          intention_id?: string | null
          mode?: string
          payment_id?: string | null
          paymob_order_id?: number | null
          raw_callback?: Json | null
          reference?: string
          source_type?: string | null
          status?: string
          transaction_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paymob_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paymob_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          login_username: string | null
          name: string
          permissions: Json | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          login_username?: string | null
          name: string
          permissions?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          login_username?: string | null
          name?: string
          permissions?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_invites: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          login_username: string | null
          name: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          login_username?: string | null
          name: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          login_username?: string | null
          name?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_settings_public: {
        Row: {
          app_name: string | null
          created_at: string | null
          hero_description: string | null
          hero_title: string | null
          id: string | null
          language: string | null
          logo_url: string | null
          patient_mode: boolean | null
          stats: Json | null
          terms_ar: string | null
          terms_en: string | null
          working_hours: Json | null
        }
        Insert: {
          app_name?: string | null
          created_at?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string | null
          language?: string | null
          logo_url?: string | null
          patient_mode?: boolean | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          working_hours?: Json | null
        }
        Update: {
          app_name?: string | null
          created_at?: string | null
          hero_description?: string | null
          hero_title?: string | null
          id?: string | null
          language?: string | null
          logo_url?: string | null
          patient_mode?: boolean | null
          stats?: Json | null
          terms_ar?: string | null
          terms_en?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_review_instapay: { Args: { _uid: string }; Returns: boolean }
      get_bookings_by_phone: {
        Args: { phone_number: string }
        Returns: {
          booking_date: string
          booking_id: string
          booking_status: string
          booking_time: string
          created_at: string
          doctor_name: string
          service: string
        }[]
      }
      get_instapay_status: {
        Args: { _booking_ref: string; _phone: string }
        Returns: {
          amount_due: number
          booking_ref: string
          reason: string
          status: string
        }[]
      }
      get_paymob_status: {
        Args: { _reference: string }
        Returns: {
          amount: number
          booking_id: string
          reference: string
          status: string
        }[]
      }
      get_user_by_login_username: {
        Args: { p_login_username: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      instapay_amount_due: {
        Args: { _doctor_id: string; _doctor_name: string; _service: string }
        Returns: number
      }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
      paymob_apply_transaction: {
        Args: {
          _amount_cents: number
          _paymob_order_id: number
          _pending: boolean
          _raw: Json
          _reference: string
          _source_type: string
          _success: boolean
          _transaction_id: number
        }
        Returns: string
      }
      paymob_is_enabled: { Args: never; Returns: boolean }
      review_instapay_payment: {
        Args: {
          _action: string
          _reason: string
          _submission_id: string
          _verified_amount: number
        }
        Returns: string
      }
      submit_instapay_payment: {
        Args: {
          _booking_id: string
          _declared_amount: number
          _evidence_path: string
          _phone: string
          _transaction_ref: string
        }
        Returns: {
          amount_due: number
          booking_ref: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      payment_status: "pending" | "paid" | "failed"
      payment_type: "wallet" | "instapay" | "fawry" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      payment_status: ["pending", "paid", "failed"],
      payment_type: ["wallet", "instapay", "fawry", "other"],
    },
  },
} as const
