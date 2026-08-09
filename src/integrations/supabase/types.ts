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
          approved_at: string | null
          approved_by: string | null
          bukti_path: string | null
          catatan_approver: string | null
          created_at: string
          created_by: string
          deskripsi: string | null
          id: string
          jenis: Database["public"]["Enums"]["kas_jenis"]
          jumlah: number
          kategori: string
          ledger: Database["public"]["Enums"]["kas_ledger"]
          status: Database["public"]["Enums"]["kas_status"]
          tanggal: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bukti_path?: string | null
          catatan_approver?: string | null
          created_at?: string
          created_by: string
          deskripsi?: string | null
          id?: string
          jenis: Database["public"]["Enums"]["kas_jenis"]
          jumlah: number
          kategori?: string
          ledger: Database["public"]["Enums"]["kas_ledger"]
          status?: Database["public"]["Enums"]["kas_status"]
          tanggal?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bukti_path?: string | null
          catatan_approver?: string | null
          created_at?: string
          created_by?: string
          deskripsi?: string | null
          id?: string
          jenis?: Database["public"]["Enums"]["kas_jenis"]
          jumlah?: number
          kategori?: string
          ledger?: Database["public"]["Enums"]["kas_ledger"]
          status?: Database["public"]["Enums"]["kas_status"]
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
      live_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          heading: number | null
          last_seen: string
          lat: number
          lng: number
          on_bit: boolean
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          last_seen?: string
          lat: number
          lng: number
          on_bit?: boolean
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          last_seen?: string
          lat?: number
          lng?: number
          on_bit?: boolean
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      piket_shifts: {
        Row: {
          catatan: string | null
          created_at: string
          created_by: string
          id: string
          slot: Database["public"]["Enums"]["piket_shift_slot"]
          tanggal: string
          updated_at: string
          user_id: string
          wilayah: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          created_by: string
          id?: string
          slot: Database["public"]["Enums"]["piket_shift_slot"]
          tanggal: string
          updated_at?: string
          user_id: string
          wilayah: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          created_by?: string
          id?: string
          slot?: Database["public"]["Enums"]["piket_shift_slot"]
          tanggal?: string
          updated_at?: string
          user_id?: string
          wilayah?: string
        }
        Relationships: []
      }
      piket_swap_requests: {
        Row: {
          alasan: string | null
          created_at: string
          id: string
          requested_by: string
          responded_at: string | null
          shift_id: string
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          alasan?: string | null
          created_at?: string
          id?: string
          requested_by: string
          responded_at?: string | null
          shift_id: string
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          alasan?: string | null
          created_at?: string
          id?: string
          requested_by?: string
          responded_at?: string | null
          shift_id?: string
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piket_swap_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "piket_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alamat: string | null
          bio: string | null
          created_at: string
          email: string | null
          foto_url: string | null
          id: string
          jenjang: Database["public"]["Enums"]["jenjang_anggota"]
          nama: string
          no_hp: string | null
          notif_email: boolean
          notif_kas: boolean
          notif_pengumuman: boolean
          notif_sos: boolean
          status: Database["public"]["Enums"]["status_anggota"]
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id: string
          jenjang?: Database["public"]["Enums"]["jenjang_anggota"]
          nama?: string
          no_hp?: string | null
          notif_email?: boolean
          notif_kas?: boolean
          notif_pengumuman?: boolean
          notif_sos?: boolean
          status?: Database["public"]["Enums"]["status_anggota"]
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          jenjang?: Database["public"]["Enums"]["jenjang_anggota"]
          nama?: string
          no_hp?: string | null
          notif_email?: boolean
          notif_kas?: boolean
          notif_pengumuman?: boolean
          notif_sos?: boolean
          status?: Database["public"]["Enums"]["status_anggota"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      screening_answers: {
        Row: {
          application_id: string
          bobot_didapat: number
          created_at: string
          id: string
          jawaban: string | null
          question_id: string
        }
        Insert: {
          application_id: string
          bobot_didapat?: number
          created_at?: string
          id?: string
          jawaban?: string | null
          question_id: string
        }
        Update: {
          application_id?: string
          bobot_didapat?: number
          created_at?: string
          id?: string
          jawaban?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "screening_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "screening_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "screening_questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_applications: {
        Row: {
          alamat: string | null
          catatan_pic: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          id: string
          kota: string | null
          motivasi: string | null
          nama: string
          no_hp: string
          reviewed_at: string | null
          reviewed_by: string | null
          skor_total: number | null
          status: Database["public"]["Enums"]["screening_status"]
          updated_at: string
          verified_at: string | null
          verify_token: string
        }
        Insert: {
          alamat?: string | null
          catatan_pic?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          id?: string
          kota?: string | null
          motivasi?: string | null
          nama: string
          no_hp: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skor_total?: number | null
          status?: Database["public"]["Enums"]["screening_status"]
          updated_at?: string
          verified_at?: string | null
          verify_token?: string
        }
        Update: {
          alamat?: string | null
          catatan_pic?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          id?: string
          kota?: string | null
          motivasi?: string | null
          nama?: string
          no_hp?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skor_total?: number | null
          status?: Database["public"]["Enums"]["screening_status"]
          updated_at?: string
          verified_at?: string | null
          verify_token?: string
        }
        Relationships: []
      }
      screening_audit_log: {
        Row: {
          actor_id: string | null
          actor_nama: string | null
          application_id: string
          catatan: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["screening_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["screening_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_nama?: string | null
          application_id: string
          catatan?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["screening_status"] | null
          id?: string
          to_status: Database["public"]["Enums"]["screening_status"]
        }
        Update: {
          actor_id?: string | null
          actor_nama?: string | null
          application_id?: string
          catatan?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["screening_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["screening_status"]
        }
        Relationships: [
          {
            foreignKeyName: "screening_audit_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "screening_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_questions: {
        Row: {
          aktif: boolean
          bobot_max: number
          created_at: string
          id: string
          opsi: Json | null
          pertanyaan: string
          tipe: string
          updated_at: string
          urutan: number
        }
        Insert: {
          aktif?: boolean
          bobot_max?: number
          created_at?: string
          id?: string
          opsi?: Json | null
          pertanyaan: string
          tipe?: string
          updated_at?: string
          urutan?: number
        }
        Update: {
          aktif?: boolean
          bobot_max?: number
          created_at?: string
          id?: string
          opsi?: Json | null
          pertanyaan?: string
          tipe?: string
          updated_at?: string
          urutan?: number
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
      screening_questions_public: {
        Row: {
          id: string | null
          opsi: Json | null
          pertanyaan: string | null
          tipe: string | null
          urutan: number | null
        }
        Insert: {
          id?: string | null
          opsi?: never
          pertanyaan?: string | null
          tipe?: string | null
          urutan?: number | null
        }
        Update: {
          id?: string | null
          opsi?: never
          pertanyaan?: string | null
          tipe?: string | null
          urutan?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_application_status: {
        Args: { _token: string }
        Returns: {
          catatan_pic: string
          created_at: string
          email_verified: boolean
          id: string
          nama: string
          reviewed_at: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      member_contacts: {
        Args: never
        Returns: {
          alamat: string
          email: string
          id: string
          no_hp: string
        }[]
      }
      verify_application_email: { Args: { _token: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "bendahara" | "satgas" | "anggota"
      jenjang_anggota: "calon" | "muda" | "madya" | "purna"
      kas_jenis: "masuk" | "keluar"
      kas_ledger: "umum" | "sosial"
      kas_status: "menunggu" | "disetujui" | "ditolak"
      kejadian_status: "open" | "on_progress" | "closed"
      kejadian_tipe: "sos" | "laka" | "mogok" | "lain"
      piket_shift_slot: "pagi" | "siang" | "malam"
      screening_status:
        | "menunggu"
        | "wawancara"
        | "direkomendasikan"
        | "ditolak"
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
      kas_status: ["menunggu", "disetujui", "ditolak"],
      kejadian_status: ["open", "on_progress", "closed"],
      kejadian_tipe: ["sos", "laka", "mogok", "lain"],
      piket_shift_slot: ["pagi", "siang", "malam"],
      screening_status: [
        "menunggu",
        "wawancara",
        "direkomendasikan",
        "ditolak",
      ],
      status_anggota: ["aktif", "nonaktif", "cuti"],
    },
  },
} as const
