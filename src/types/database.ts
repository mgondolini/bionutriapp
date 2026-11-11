export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      client_files: {
        Row: {
          category: string;
          client_id: string;
          first_read_at: string | null;
          id: string;
          note: string | null;
          size_bytes: number;
          storage_path: string;
          studio_id: string;
          title: string;
          uploaded_at: string;
          uploaded_by: string | null;
          valid_from: string | null;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          client_id: string;
          first_read_at?: string | null;
          id?: string;
          note?: string | null;
          size_bytes: number;
          storage_path: string;
          studio_id: string;
          title: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
          valid_from?: string | null;
        };
        Update: {
          category?: string;
          client_id?: string;
          first_read_at?: string | null;
          id?: string;
          note?: string | null;
          size_bytes?: number;
          storage_path?: string;
          studio_id?: string;
          title?: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
          valid_from?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_files_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      client_invites: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          sent_at: string | null;
          studio_id: string;
          token_hash: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          sent_at?: string | null;
          studio_id: string;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          sent_at?: string | null;
          studio_id?: string;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_invites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_invites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_invites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_invites_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      client_metric_goals: {
        Row: {
          client_id: string;
          created_at: string;
          goal_value: number;
          id: string;
          metric_id: string;
          studio_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          goal_value: number;
          id?: string;
          metric_id: string;
          studio_id: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          goal_value?: number;
          id?: string;
          metric_id?: string;
          studio_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_metric_goals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_metric_goals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_metric_goals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_metric_goals_metric_id_fkey";
            columns: ["metric_id"];
            isOneToOne: false;
            referencedRelation: "metrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_metric_goals_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      client_stage_events: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          client_id: string;
          from_stage: string | null;
          id: string;
          source: string;
          studio_id: string;
          to_stage: string;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          client_id: string;
          from_stage?: string | null;
          id?: string;
          source: string;
          studio_id: string;
          to_stage: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string;
          from_stage?: string | null;
          id?: string;
          source?: string;
          studio_id?: string;
          to_stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_stage_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_stage_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_stage_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_stage_events_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          account_status: string;
          activated_at: string | null;
          birth_date: string | null;
          created_at: string;
          email: string | null;
          first_name: string;
          height_cm: number | null;
          id: string;
          journey_stage: string;
          last_name: string | null;
          origin: string;
          phone: string;
          privacy_consent_at: string | null;
          push_enabled: boolean;
          studio_id: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_status?: string;
          activated_at?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          first_name: string;
          height_cm?: number | null;
          id?: string;
          journey_stage?: string;
          last_name?: string | null;
          origin: string;
          phone: string;
          privacy_consent_at?: string | null;
          push_enabled?: boolean;
          studio_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          account_status?: string;
          activated_at?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          height_cm?: number | null;
          id?: string;
          journey_stage?: string;
          last_name?: string | null;
          origin?: string;
          phone?: string;
          privacy_consent_at?: string | null;
          push_enabled?: boolean;
          studio_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      metrics: {
        Row: {
          created_at: string;
          default_goal: number | null;
          frequency: string;
          goal_unit: string | null;
          icon: string;
          id: string;
          instructions: string | null;
          is_active: boolean;
          key: string;
          max_value: number;
          min_value: number;
          name: string;
          sort_order: number;
          studio_id: string;
          unit: string | null;
          updated_at: string;
          value_type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_goal?: number | null;
          frequency: string;
          goal_unit?: string | null;
          icon?: string;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          key: string;
          max_value: number;
          min_value: number;
          name: string;
          sort_order?: number;
          studio_id: string;
          unit?: string | null;
          updated_at?: string;
          value_type: string;
        };
        Update: {
          created_at?: string;
          default_goal?: number | null;
          frequency?: string;
          goal_unit?: string | null;
          icon?: string;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          key?: string;
          max_value?: number;
          min_value?: number;
          name?: string;
          sort_order?: number;
          studio_id?: string;
          unit?: string | null;
          updated_at?: string;
          value_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metrics_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
<<<<<<< Updated upstream
=======
      notification_log: {
        Row: {
          client_id: string;
          created_at: string;
          dedupe_key: string;
          error: string | null;
          id: string;
          payload: NonNullable<Json>;
          sent_at: string | null;
          skipped_reason: string | null;
          status: string;
          studio_id: string;
          type: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          dedupe_key: string;
          error?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          skipped_reason?: string | null;
          status?: string;
          studio_id: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          dedupe_key?: string;
          error?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          skipped_reason?: string | null;
          status?: string;
          studio_id?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          daily_reminder_enabled: boolean;
          files_enabled: boolean;
          updated_at: string;
          user_id: string;
          videos_enabled: boolean;
        };
        ComputedFields: never;
        Insert: {
          daily_reminder_enabled?: boolean;
          files_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
          videos_enabled?: boolean;
        };
        Update: {
          daily_reminder_enabled?: boolean;
          files_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
          videos_enabled?: boolean;
        };
        Relationships: [];
      };
>>>>>>> Stashed changes
      privacy_consents: {
        Row: {
          accepted_at: string;
          client_id: string;
          id: string;
          kind: string;
          policy_version: string;
          studio_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          client_id: string;
          id?: string;
          kind: string;
          policy_version: string;
          studio_id: string;
        };
        Update: {
          accepted_at?: string;
          client_id?: string;
          id?: string;
          kind?: string;
          policy_version?: string;
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "privacy_consents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "privacy_consents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "privacy_consents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "privacy_consents_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      studio_members: {
        Row: {
          created_at: string;
          display_name: string | null;
          first_name: string;
          last_name: string | null;
          role: string;
          studio_id: string;
          title: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: never;
          first_name: string;
          last_name?: string | null;
          role?: string;
          studio_id: string;
          title?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: never;
          first_name?: string;
          last_name?: string | null;
          role?: string;
          studio_id?: string;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      studios: {
        Row: {
          contact_email: string | null;
          created_at: string;
          id: string;
          logo_path: string | null;
          name: string;
          primary_color: string;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          primary_color?: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          primary_color?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tracking_entries: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string | null;
          created_by_role: string;
          id: string;
          is_daily: boolean;
          metric_id: string;
          note: string | null;
          recorded_on: string;
          studio_id: string;
          updated_at: string;
          updated_by: string | null;
          updated_by_role: string;
          value: number;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          created_by_role?: string;
          id?: string;
          is_daily?: boolean;
          metric_id: string;
          note?: string | null;
          recorded_on: string;
          studio_id: string;
          updated_at?: string;
          updated_by?: string | null;
          updated_by_role?: string;
          value: number;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          created_by_role?: string;
          id?: string;
          is_daily?: boolean;
          metric_id?: string;
          note?: string | null;
          recorded_on?: string;
          studio_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          updated_by_role?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_entries_metric_id_fkey";
            columns: ["metric_id"];
            isOneToOne: false;
            referencedRelation: "metrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_entries_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      video_folders: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
          studio_id: string;
          updated_at: string;
          visible_in_onboarding: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          studio_id: string;
          updated_at?: string;
          visible_in_onboarding?: boolean;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
          studio_id?: string;
          updated_at?: string;
          visible_in_onboarding?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "video_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "video_folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_folders_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      video_views: {
        Row: {
          client_id: string;
          first_viewed_at: string;
          studio_id: string;
          video_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          first_viewed_at?: string;
          studio_id: string;
          video_id: string;
        };
        Update: {
          client_id?: string;
          first_viewed_at?: string;
          studio_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_views_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_views_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_views_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_views_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_views_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          availability_checked_at: string | null;
          created_at: string;
          created_by: string | null;
          folder_id: string;
          id: string;
          note: string | null;
          sort_order: number;
          studio_id: string;
          title: string;
          unavailable_at: string | null;
          updated_at: string;
          youtube_id: string;
        };
        ComputedFields: never;
        Insert: {
          availability_checked_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          folder_id: string;
          id?: string;
          note?: string | null;
          sort_order?: number;
          studio_id: string;
          title: string;
          unavailable_at?: string | null;
          updated_at?: string;
          youtube_id: string;
        };
        Update: {
          availability_checked_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          folder_id?: string;
          id?: string;
          note?: string | null;
          sort_order?: number;
          studio_id?: string;
          title?: string;
          unavailable_at?: string | null;
          updated_at?: string;
          youtube_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "videos_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "video_folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "videos_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      client_list: {
        Row: {
          account_status: string | null;
          created_at: string | null;
          effective_account_status: string | null;
          email: string | null;
          first_name: string | null;
          id: string | null;
          journey_stage: string | null;
          last_entry_on: string | null;
          last_file_category: string | null;
          last_file_title: string | null;
          last_file_uploaded_at: string | null;
          last_name: string | null;
          origin: string | null;
          phone: string | null;
          studio_id: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "clients_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      client_stage_history: {
        Row: {
          changed_at: string | null;
          changed_by_name: string | null;
          client_id: string | null;
          from_stage: string | null;
          id: string | null;
          source: string | null;
          studio_id: string | null;
          to_stage: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "client_stage_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_stage_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_stage_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients_with_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_stage_events_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      clients_with_status: {
        Row: {
          account_status: string | null;
          activated_at: string | null;
          birth_date: string | null;
          created_at: string | null;
          effective_account_status: string | null;
          email: string | null;
          first_name: string | null;
          height_cm: number | null;
          id: string | null;
          journey_stage: string | null;
          last_invite_created_at: string | null;
          last_invite_expires_at: string | null;
          last_invite_sent_at: string | null;
          last_invite_used_at: string | null;
          last_name: string | null;
          origin: string | null;
          phone: string | null;
          privacy_consent_at: string | null;
          push_enabled: boolean | null;
          studio_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "clients_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      activate_client: {
        Args: { p_profile?: Json; p_token_hash: string; p_user_id: string };
        Returns: string;
      };
      client_account_status: { Args: { p_client_id: string }; Returns: string };
      get_studio_branding: {
        Args: { p_slug: string };
        Returns: {
          id: string;
          logo_path: string;
          name: string;
          primary_color: string;
          slug: string;
        }[];
      };
      list_orphan_client_files: {
        Args: { p_limit?: number; p_older_than_hours?: number };
        Returns: string[];
      };
      mark_file_read: { Args: { p_file_id: string }; Returns: string };
      my_context: {
        Args: Record<PropertyKey, never>;
        Returns: {
          client_id: string;
          role: string;
          studio_id: string;
          studio_slug: string;
        }[];
      };
      my_email_available: { Args: { p_email: string }; Returns: boolean };
      purge_expired_invites: {
        Args: { p_older_than_days?: number };
        Returns: number;
      };
<<<<<<< Updated upstream
=======
      purge_notification_log: {
        Args: { p_older_than_days?: number };
        Returns: number;
      };
      record_push_results: {
        Args: {
          p_failed: string[];
          p_max_failures?: number;
          p_succeeded: string[];
        };
        Returns: number;
      };
      record_video_view: { Args: { p_video: string }; Returns: undefined };
>>>>>>> Stashed changes
      register_push_subscription: {
        Args: {
          p_auth: string;
          p_endpoint: string;
          p_p256dh: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
      reorder_video_folders: {
        Args: { p_ids: string[]; p_parent: string };
        Returns: undefined;
      };
      reorder_videos: {
        Args: { p_folder: string; p_ids: string[] };
        Returns: undefined;
      };
      save_daily_checkin: {
        Args: { p_client_id: string; p_recorded_on: string; p_values: Json };
        Returns: undefined;
      };
      set_journey_stage: {
        Args: {
          p_automatic?: boolean;
          p_client_id: string;
          p_from: string;
          p_to: string;
        };
        Returns: boolean;
      };
      update_my_client_profile: {
        Args: {
          p_birth_date: string;
          p_first_name: string;
          p_height_cm?: number;
          p_last_name: string;
        };
        Returns: undefined;
      };
      update_my_member_profile: {
        Args: { p_first_name: string; p_last_name: string; p_title: string };
        Returns: undefined;
      };
      video_notification_recipients: {
        Args: { p_video: string };
        Returns: {
          client_id: string;
          user_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
