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
      attivita: {
        Row: {
          calorie: number | null
          created_at: string | null
          data: string
          distanza_km: number | null
          durata_min: number | null
          fc_media: number | null
          fonte: string | null
          id: string
          note_utente: string | null
          pace_media: string | null
          rpe: number | null
          sport_type: string | null
          strava_activity_id: string | null
          user_id: string
        }
        Insert: {
          calorie?: number | null
          created_at?: string | null
          data: string
          distanza_km?: number | null
          durata_min?: number | null
          fc_media?: number | null
          fonte?: string | null
          id?: string
          note_utente?: string | null
          pace_media?: string | null
          rpe?: number | null
          sport_type?: string | null
          strava_activity_id?: string | null
          user_id: string
        }
        Update: {
          calorie?: number | null
          created_at?: string | null
          data?: string
          distanza_km?: number | null
          durata_min?: number | null
          fc_media?: number | null
          fonte?: string | null
          id?: string
          note_utente?: string | null
          pace_media?: string | null
          rpe?: number | null
          sport_type?: string | null
          strava_activity_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attivita_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_announcements: {
        Row: {
          author_id: string
          club_id: string
          contenuto: string
          created_at: string
          id: string
          titolo: string | null
        }
        Insert: {
          author_id: string
          club_id: string
          contenuto: string
          created_at?: string
          id?: string
          titolo?: string | null
        }
        Update: {
          author_id?: string
          club_id?: string
          contenuto?: string
          created_at?: string
          id?: string
          titolo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          ruolo: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          ruolo?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          ruolo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          codice_invito: string
          created_at: string
          created_by: string
          descrizione: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          codice_invito: string
          created_at?: string
          created_by: string
          descrizione?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          codice_invito?: string
          created_at?: string
          created_by?: string
          descrizione?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anni_esperienza: number | null
          club_id: string | null
          created_at: string | null
          email: string | null
          eta: number | null
          giorni_disponibili: string[] | null
          id: string
          limitazioni_fisiche: string | null
          nome: string | null
          obiettivo_dettaglio: string | null
          obiettivo_tipo: string | null
          onboarding_completato: boolean | null
          ruolo: string | null
          sport_primario: string | null
          sport_secondari: string[] | null
          updated_at: string | null
        }
        Insert: {
          anni_esperienza?: number | null
          club_id?: string | null
          created_at?: string | null
          email?: string | null
          eta?: number | null
          giorni_disponibili?: string[] | null
          id: string
          limitazioni_fisiche?: string | null
          nome?: string | null
          obiettivo_dettaglio?: string | null
          obiettivo_tipo?: string | null
          onboarding_completato?: boolean | null
          ruolo?: string | null
          sport_primario?: string | null
          sport_secondari?: string[] | null
          updated_at?: string | null
        }
        Update: {
          anni_esperienza?: number | null
          club_id?: string | null
          created_at?: string | null
          email?: string | null
          eta?: number | null
          giorni_disponibili?: string[] | null
          id?: string
          limitazioni_fisiche?: string | null
          nome?: string | null
          obiettivo_dettaglio?: string | null
          obiettivo_tipo?: string | null
          onboarding_completato?: boolean | null
          ruolo?: string | null
          sport_primario?: string | null
          sport_secondari?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_club_captain: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
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
