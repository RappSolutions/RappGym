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
      admin_user_views: {
        Row: {
          actor_id: string
          auth_session_id: string
          ended_at: string | null
          id: string
          started_at: string
          target_user_id: string
        }
        Insert: {
          actor_id: string
          auth_session_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_user_id: string
        }
        Update: {
          actor_id?: string
          auth_session_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_user_id?: string
        }
        Relationships: []
      }
      ai_tiers: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          monthly_ai_quota: number | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          is_default?: boolean
          monthly_ai_quota?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          monthly_ai_quota?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      exercise_categories: {
        Row: {
          code_prefix: string
          color_token: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code_prefix: string
          color_token?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code_prefix?: string
          color_token?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      exercise_equipment: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      exercise_locations: {
        Row: {
          created_at: string
          exercise_id: string
          gym_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          gym_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          gym_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_locations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_locations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_suggestions: {
        Row: {
          category_id: string | null
          created_at: string
          equipment_id: string | null
          id: string
          instructions: string
          name: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          instructions: string
          name: string
          source_url?: string | null
          user_id?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          instructions?: string
          name?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_suggestions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_suggestions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "exercise_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category_id: string
          code: string
          code_number: number
          created_at: string
          equipment_id: string | null
          id: string
          image_urls: Json
          instructions: string
          is_active: boolean
          name: string
          reps_unit: string
          sort_order: number
          translations: Json
          user_id: string
        }
        Insert: {
          category_id: string
          code: string
          code_number: number
          created_at?: string
          equipment_id?: string | null
          id?: string
          image_urls?: Json
          instructions?: string
          is_active?: boolean
          name: string
          reps_unit?: string
          sort_order?: number
          translations?: Json
          user_id?: string
        }
        Update: {
          category_id?: string
          code?: string
          code_number?: number
          created_at?: string
          equipment_id?: string | null
          id?: string
          image_urls?: Json
          instructions?: string
          is_active?: boolean
          name?: string
          reps_unit?: string
          sort_order?: number
          translations?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "exercise_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          gym_id: string
          max_load_kg: number | null
        }
        Insert: {
          created_at?: string
          equipment_id: string
          gym_id: string
          max_load_kg?: number | null
        }
        Update: {
          created_at?: string
          equipment_id?: string
          gym_id?: string
          max_load_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "exercise_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_equipment_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          created_at: string
          description: string
          id: string
          is_public: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      log_entries: {
        Row: {
          code: string
          created_at: string
          date: string
          exercise_id: string | null
          exercise_name: string
          exercise_rating: number | null
          gym_id: string | null
          id: string
          lap: number | null
          load: string
          note: string | null
          phase: string
          proposal_order: number | null
          reps: number | null
          reps_unit: string
          set_number: number | null
          sets: number
          status: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          date?: string
          exercise_id?: string | null
          exercise_name?: string
          exercise_rating?: number | null
          gym_id?: string | null
          id?: string
          lap?: number | null
          load?: string
          note?: string | null
          phase?: string
          proposal_order?: number | null
          reps?: number | null
          reps_unit?: string
          set_number?: number | null
          sets?: number
          status?: string
          user_id?: string
          workout_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          date?: string
          exercise_id?: string | null
          exercise_name?: string
          exercise_rating?: number | null
          gym_id?: string | null
          id?: string
          lap?: number | null
          load?: string
          note?: string | null
          phase?: string
          proposal_order?: number | null
          reps?: number | null
          reps_unit?: string
          set_number?: number | null
          sets?: number
          status?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          diagnostics: Json
          id: string
          kind: string
          message: string
          sender_email: string
          sender_name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnostics?: Json
          id?: string
          kind: string
          message: string
          sender_email?: string
          sender_name?: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          diagnostics?: Json
          id?: string
          kind?: string
          message?: string
          sender_email?: string
          sender_name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      training_ai_history: {
        Row: {
          cost_usd: number | null
          generated_at: string
          gym_id: string | null
          id: string
          input_tokens: number | null
          insights: Json
          language: string
          model: string | null
          output_tokens: number | null
          request: Json
          today: string
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          generated_at?: string
          gym_id?: string | null
          id?: string
          input_tokens?: number | null
          insights: Json
          language: string
          model?: string | null
          output_tokens?: number | null
          request: Json
          today: string
          user_id?: string
        }
        Update: {
          cost_usd?: number | null
          generated_at?: string
          gym_id?: string | null
          id?: string
          input_tokens?: number | null
          insights?: Json
          language?: string
          model?: string | null
          output_tokens?: number | null
          request?: Json
          today?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_ai_history_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      training_goals: {
        Row: {
          created_at: string
          id: string
          status: string
          target_date: string | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          target_date?: string | null
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          target_date?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      training_profiles: {
        Row: {
          birth_year: number | null
          experience: string
          height_cm: number | null
          limitations: string
          pace: string
          preferences: string
          updated_at: string
          use_for_ai: boolean
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birth_year?: number | null
          experience?: string
          height_cm?: number | null
          limitations?: string
          pace?: string
          preferences?: string
          updated_at?: string
          use_for_ai?: boolean
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          birth_year?: number | null
          experience?: string
          height_cm?: number | null
          limitations?: string
          pace?: string
          preferences?: string
          updated_at?: string
          use_for_ai?: boolean
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_ai_quotas: {
        Row: {
          custom_quota: number | null
          is_blocked: boolean
          notes: string | null
          tier_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          custom_quota?: number | null
          is_blocked?: boolean
          notes?: string | null
          tier_id: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          custom_quota?: number | null
          is_blocked?: boolean
          notes?: string | null
          tier_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_quotas_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ai_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consented_at: string
          terms_version: number
          user_id: string
        }
        Insert: {
          consented_at?: string
          terms_version: number
          user_id: string
        }
        Update: {
          consented_at?: string
          terms_version?: number
          user_id?: string
        }
        Relationships: []
      }
      user_exercise_preferences: {
        Row: {
          exercise_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_preferences_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          note: string | null
          phase: string
          sort_order: number
          target_load: string
          target_reps: number | null
          target_sets: number
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          note?: string | null
          phase?: string
          sort_order?: number
          target_load?: string
          target_reps?: number | null
          target_sets?: number
          user_id?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          note?: string | null
          phase?: string
          sort_order?: number
          target_load?: string
          target_reps?: number | null
          target_sets?: number
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          ai_history_id: string | null
          ai_workout_key: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          gym_id: string | null
          id: string
          is_circuit: boolean
          is_spontaneous: boolean
          note: string | null
          scheduled_date: string | null
          source_workout_id: string | null
          started_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_history_id?: string | null
          ai_workout_key?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          gym_id?: string | null
          id?: string
          is_circuit?: boolean
          is_spontaneous?: boolean
          note?: string | null
          scheduled_date?: string | null
          source_workout_id?: string | null
          started_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          ai_history_id?: string | null
          ai_workout_key?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          gym_id?: string | null
          id?: string
          is_circuit?: boolean
          is_spontaneous?: boolean
          note?: string | null
          scheduled_date?: string | null
          source_workout_id?: string | null
          started_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_ai_history_id_fkey"
            columns: ["ai_history_id"]
            isOneToOne: false
            referencedRelation: "training_ai_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_source_workout_id_fkey"
            columns: ["source_workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_quota_status: {
        Args: { _user_id: string }
        Returns: {
          is_admin: boolean
          is_blocked: boolean
          period_end: string
          period_start: string
          quota: number
          source: string
          tier_id: string
          tier_name: string
          used: number
        }[]
      }
      effective_user_id: { Args: never; Returns: string }
      end_user_view: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_exercise_image: { Args: { _path: string }; Returns: boolean }
      start_user_view: { Args: { _target_user_id: string }; Returns: string }
      user_view_active: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
