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
      exercises: {
        Row: {
          category: string
          code: string
          created_at: string
          dose: string
          equipment: string
          focus: string
          gym_id: string | null
          id: string
          image_urls: Json
          instructions: string
          muscles: string
          name: string
          sort_order: number
          translations: Json
          user_id: string
          variant: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          dose?: string
          equipment?: string
          focus?: string
          gym_id?: string | null
          id?: string
          image_urls?: Json
          instructions?: string
          muscles?: string
          name: string
          sort_order?: number
          translations?: Json
          user_id?: string
          variant?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          dose?: string
          equipment?: string
          focus?: string
          gym_id?: string | null
          id?: string
          image_urls?: Json
          instructions?: string
          muscles?: string
          name?: string
          sort_order?: number
          translations?: Json
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_gym_id_fkey"
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
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      log_entries: {
        Row: {
          ai_history_id: string | null
          ai_workout_key: string | null
          code: string
          created_at: string
          date: string
          gym_id: string | null
          id: string
          load: string
          note: string | null
          proposal_id: string | null
          proposal_order: number | null
          proposal_title: string | null
          reps: number | null
          sets: number
          status: string
          user_id: string
        }
        Insert: {
          ai_history_id?: string | null
          ai_workout_key?: string | null
          code: string
          created_at?: string
          date?: string
          gym_id?: string | null
          id?: string
          load?: string
          note?: string | null
          proposal_id?: string | null
          proposal_order?: number | null
          proposal_title?: string | null
          reps?: number | null
          sets?: number
          status?: string
          user_id?: string
        }
        Update: {
          ai_history_id?: string | null
          ai_workout_key?: string | null
          code?: string
          created_at?: string
          date?: string
          gym_id?: string | null
          id?: string
          load?: string
          note?: string | null
          proposal_id?: string | null
          proposal_order?: number | null
          proposal_title?: string | null
          reps?: number | null
          sets?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_ai_history_id_fkey"
            columns: ["ai_history_id"]
            isOneToOne: false
            referencedRelation: "training_ai_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      training_ai_history: {
        Row: {
          generated_at: string
          gym_id: string | null
          id: string
          insights: Json
          language: string
          request: Json
          today: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          gym_id?: string | null
          id?: string
          insights: Json
          language: string
          request: Json
          today: string
          user_id?: string
        }
        Update: {
          generated_at?: string
          gym_id?: string | null
          id?: string
          insights?: Json
          language?: string
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
          age: number | null
          experience: string
          height_cm: number | null
          limitations: string
          preferences: string
          updated_at: string
          use_for_ai: boolean
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          experience?: string
          height_cm?: number | null
          limitations?: string
          preferences?: string
          updated_at?: string
          use_for_ai?: boolean
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          experience?: string
          height_cm?: number | null
          limitations?: string
          preferences?: string
          updated_at?: string
          use_for_ai?: boolean
          user_id?: string
          weight_kg?: number | null
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
    Enums: {},
  },
} as const
