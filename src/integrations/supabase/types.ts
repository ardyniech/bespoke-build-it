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
      kas_transactions: {
        Row: {
          bukti_path: string | null
          created_at: string
          created_by: string
          deskripsi: string | null
          id: string
          jenis: Database["public"]["Enums"]["kas_jenis"]
          jumlah: number
          kategori: string
          ledger: Database["public"]["Enums"]["kas_ledger"]
          tanggal: string
          updated_at: string
        }
        Insert: {
          bukti_path?: string | null
          created_at?: string
          created_by: string
          deskripsi?: string | null
          id?: string
          jenis: Database["public"]["Enums"]["kas_jenis"]
          jumlah: number
          kategori?: string
          ledger: Database["public"]["Enums"]["kas_ledger"]
          tanggal?: string
          updated_at?: string
        }
        Update: {
          bukti_path?: string | null
          created_at?: string
          created_by?: string
          deskripsi?: string | null
          id?: string
          jenis?: Database["public"]["Enums"]["kas_jenis"]
          jumlah?: number
          kategori?: string
          ledger?: Database["public"]["Enums"]["kas_ledger"]
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      kejadian: {
        Row: {
          alamat_text: string | null
          deskripsi: string | null
          dibuat_at: string
          ditutup_at: string | null
          id: string
          lokasi_lat: number | null
          lokasi_lng: number | null
          pelapor_id: string
          status: Database["public"]["Enums"]["kejadian_status"]
          tipe: Database["public"]["Enums"]["kejadian_tipe"]
          updated_at: string
        }
        Insert: {
          alamat_text?: string | null
          deskripsi?: string | null
          dibuat_at?: string
          ditutup_at?: string | null
          id?: string
          lokasi_lat?: number | null
          lokasi_lng?: number | null
          pelapor_id: string
          status?: Database["public"]["Enums"]["kejadian_status"]
          tipe?: Database["public"]["Enums"]["kejadian_tipe"]
          updated_at?: string
        }
        Update: {
          alamat_text?: string | null
          deskripsi?: string | null
          dibuat_at?: string
          ditutup_at?: string | null
          id?: string
          lokasi_lat?: number | null
          lokasi_lng?: number | null
          pelapor_id?: string
          status?: Database["public"]["Enums"]["kejadian_status"]
          tipe?: Database["public"]["Enums"]["kejadian_tipe"]
          updated_at?: string
        }
        Relationships: []
      }
      kejadian_responders: {
        Row: {
          id: string
          joined_at: string
          kejadian_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          kejadian_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          kejadian_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kejadian_responders_kejadian_id_fkey"
            columns: ["kejadian_id"]
            isOneToOne: false
            referencedRelation: "kejadian"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alamat: string | null
          created_at: string
          foto_url: string | null
          id: string
          jenjang: Database["public"]["Enums"]["jenjang_anggota"]
          nama: string
          no_hp: string | null
          status: Database["public"]["Enums"]["status_anggota"]
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          foto_url?: string | null
          id: string
          jenjang?: Database["public"]["Enums"]["jenjang_anggota"]
          nama?: string
          no_hp?: string | null
          status?: Database["public"]["Enums"]["status_anggota"]
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          jenjang?: Database["public"]["Enums"]["jenjang_anggota"]
          nama?: string
          no_hp?: string | null
          status?: Database["public"]["Enums"]["status_anggota"]
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "bendahara" | "satgas" | "anggota"
      jenjang_anggota: "calon" | "muda" | "madya" | "purna"
      kas_jenis: "masuk" | "keluar"
      kas_ledger: "umum" | "sosial"
      kejadian_status: "open" | "on_progress" | "closed"
      kejadian_tipe: "sos" | "laka" | "mogok" | "lain"
      status_anggota: "aktif" | "nonaktif" | "cuti"
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
      app_role: ["super_admin", "admin", "bendahara", "satgas", "anggota"],
      jenjang_anggota: ["calon", "muda", "madya", "purna"],
      kas_jenis: ["masuk", "keluar"],
      kas_ledger: ["umum", "sosial"],
      kejadian_status: ["open", "on_progress", "closed"],
      kejadian_tipe: ["sos", "laka", "mogok", "lain"],
      status_anggota: ["aktif", "nonaktif", "cuti"],
    },
  },
} as const
