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
      friend_call_members: {
        Row: {
          call_id: string
          state: string
          user_id: string
        }
        Insert: {
          call_id: string
          state?: string
          user_id: string
        }
        Update: {
          call_id?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_call_members_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "friend_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_call_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_calls: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          owner_id: string
          provider_url: string | null
          screening_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          owner_id: string
          provider_url?: string | null
          screening_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          owner_id?: string
          provider_url?: string | null
          screening_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_calls_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_suggestions: {
        Row: {
          created_at: string
          description: string
          genre: string
          id: string
          personal_note: string
          status: string
          title: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string
          genre: string
          id?: string
          personal_note?: string
          status?: string
          title: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string
          genre?: string
          id?: string
          personal_note?: string
          status?: string
          title?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          created_at: string
          duration: number
          duration_seconds: number | null
          genre: string
          id: string
          poster_url: string
          synopsis: string
          title: string
          trailer_url: string | null
          video_storage_path: string | null
          video_url: string | null
          year: number
        }
        Insert: {
          created_at?: string
          duration?: number
          duration_seconds?: number | null
          genre?: string
          id?: string
          poster_url?: string
          synopsis?: string
          title: string
          trailer_url?: string | null
          video_storage_path?: string | null
          video_url?: string | null
          year?: number
        }
        Update: {
          created_at?: string
          duration?: number
          duration_seconds?: number | null
          genre?: string
          id?: string
          poster_url?: string
          synopsis?: string
          title?: string
          trailer_url?: string | null
          video_storage_path?: string | null
          video_url?: string | null
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          id: string
          registered_at: string
          screening_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          screening_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          registered_at?: string
          screening_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          friend_code: string
          id: string
          preferences: Json
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          friend_code?: string
          id: string
          preferences?: Json
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          friend_code?: string
          id?: string
          preferences?: Json
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          body: string
          created_at: string
          display_name: string
          id: string
          screening_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name: string
          id?: string
          screening_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          id?: string
          screening_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_presence: {
        Row: {
          display_name: string
          last_seen: string
          screening_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          last_seen?: string
          screening_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          last_seen?: string
          screening_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_presence_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screenings: {
        Row: {
          capacity: number
          chat_enabled: boolean
          created_at: string
          id: string
          is_playing: boolean
          movie_id: string
          playback_position: number
          playback_updated_at: string
          registration_closes_at: string
          registration_opens_at: string
          starts_at: string
          status: string
        }
        Insert: {
          capacity?: number
          chat_enabled?: boolean
          created_at?: string
          id?: string
          is_playing?: boolean
          movie_id: string
          playback_position?: number
          playback_updated_at?: string
          registration_closes_at: string
          registration_opens_at?: string
          starts_at: string
          status?: string
        }
        Update: {
          capacity?: number
          chat_enabled?: boolean
          created_at?: string
          id?: string
          is_playing?: boolean
          movie_id?: string
          playback_position?: number
          playback_updated_at?: string
          registration_closes_at?: string
          registration_opens_at?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      can_enter_screening: { Args: { _screening_id: string }; Returns: boolean }
      create_friend_call: { Args: { _friends: string[] }; Returns: string }
      friend_peer_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          friend_code: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_call_member: { Args: { _call: string }; Returns: boolean }
      register_screening: { Args: { _screening_id: string }; Returns: string }
      request_friend: { Args: { _code: string }; Returns: string }
      respond_friend: {
        Args: { _accept: boolean; _id: string }
        Returns: undefined
      }
      respond_friend_call: {
        Args: { _call: string; _state: string }
        Returns: undefined
      }
      screening_counts: {
        Args: never
        Returns: {
          participant_count: number
          screening_id: string
        }[]
      }
      send_room_message: {
        Args: { _body: string; _screening_id: string }
        Returns: string
      }
      set_user_admin: {
        Args: { _admin: boolean; _user_id: string }
        Returns: undefined
      }
      share_call_screening: {
        Args: { _call: string; _screening: string }
        Returns: undefined
      }
      touch_room_presence: {
        Args: { _screening_id: string }
        Returns: undefined
      }
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
