export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          campaign_id: string
          created_at: string
          description: string
          id: string
          insight_type: string
          is_read: boolean
          priority: string
          title: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description: string
          id?: string
          insight_type: string
          is_read?: boolean
          priority?: string
          title: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string
          id?: string
          insight_type?: string
          is_read?: boolean
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_data: {
        Row: {
          attributed_revenue: number
          attribution_model: string
          contact_email: string | null
          contact_phone: string | null
          conversion_date: string
          created_at: string
          event_id: string | null
          id: string
          project_id: string
          session_id: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          attributed_revenue?: number
          attribution_model?: string
          contact_email?: string | null
          contact_phone?: string | null
          conversion_date?: string
          created_at?: string
          event_id?: string | null
          id?: string
          project_id: string
          session_id: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          attributed_revenue?: number
          attribution_model?: string
          contact_email?: string | null
          contact_phone?: string | null
          conversion_date?: string
          created_at?: string
          event_id?: string | null
          id?: string
          project_id?: string
          session_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_data_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tracking_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      calendly_event_mappings: {
        Row: {
          calendly_event_type_id: string
          created_at: string
          event_type_name: string
          id: string
          is_active: boolean
          project_id: string
          updated_at: string
        }
        Insert: {
          calendly_event_type_id: string
          created_at?: string
          event_type_name: string
          id?: string
          is_active?: boolean
          project_id: string
          updated_at?: string
        }
        Update: {
          calendly_event_type_id?: string
          created_at?: string
          event_type_name?: string
          id?: string
          is_active?: boolean
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendly_events: {
        Row: {
          calendly_event_id: string
          calendly_event_type_id: string
          created_at: string
          event_type_name: string
          id: string
          invitee_email: string | null
          invitee_name: string | null
          project_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          calendly_event_id: string
          calendly_event_type_id: string
          created_at?: string
          event_type_name: string
          id?: string
          invitee_email?: string | null
          invitee_name?: string | null
          project_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendly_event_id?: string
          calendly_event_type_id?: string
          created_at?: string
          event_type_name?: string
          id?: string
          invitee_email?: string | null
          invitee_name?: string | null
          project_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          activecampaign_list_id: string | null
          budget: number | null
          clickfunnels_funnel_id: string | null
          client_id: string
          created_at: string
          end_date: string | null
          facebook_campaign_id: string | null
          funnel_type: Database["public"]["Enums"]["funnel_type"]
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          activecampaign_list_id?: string | null
          budget?: number | null
          clickfunnels_funnel_id?: string | null
          client_id: string
          created_at?: string
          end_date?: string | null
          facebook_campaign_id?: string | null
          funnel_type: Database["public"]["Enums"]["funnel_type"]
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          activecampaign_list_id?: string | null
          budget?: number | null
          clickfunnels_funnel_id?: string | null
          client_id?: string
          created_at?: string
          end_date?: string | null
          facebook_campaign_id?: string | null
          funnel_type?: Database["public"]["Enums"]["funnel_type"]
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agency_id: string
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clients_agency_id"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          campaign_id: string
          created_at: string
          date: string
          id: string
          metric_type: Database["public"]["Enums"]["metric_type"]
          value: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          date: string
          id?: string
          metric_type: Database["public"]["Enums"]["metric_type"]
          value: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          date?: string
          id?: string
          metric_type?: Database["public"]["Enums"]["metric_type"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_data: {
        Row: {
          agency_id: string
          created_at: string
          data: Json
          id: string
          platform: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          data: Json
          id?: string
          platform: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          data?: Json
          id?: string
          platform?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_integration_data_agency_id"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_connected: boolean
          last_sync: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync?: string | null
          platform: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_integrations_agency_id"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          agency_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          agency_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_integration_data: {
        Row: {
          created_at: string
          data: Json
          id: string
          platform: string
          project_id: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          platform: string
          project_id: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          platform?: string
          project_id?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_integration_data_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integration_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          created_at: string
          id: string
          is_connected: boolean
          last_sync: string | null
          platform: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync?: string | null
          platform: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync?: string | null
          platform?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_integrations_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          agency_id: string
          created_at: string
          funnel_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          funnel_type: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          funnel_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_agency_id"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string | null
          custom_data: Json | null
          event_name: string | null
          event_timestamp: string
          event_type: string
          form_data: Json | null
          id: string
          page_url: string
          project_id: string
          revenue_amount: number | null
          session_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          custom_data?: Json | null
          event_name?: string | null
          event_timestamp?: string
          event_type: string
          form_data?: Json | null
          id?: string
          page_url: string
          project_id: string
          revenue_amount?: number | null
          session_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          custom_data?: Json | null
          event_name?: string | null
          event_timestamp?: string
          event_type?: string
          form_data?: Json | null
          id?: string
          page_url?: string
          project_id?: string
          revenue_amount?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      tracking_pixels: {
        Row: {
          config: Json | null
          conversion_events: string[] | null
          created_at: string
          domains: string[] | null
          id: string
          is_active: boolean
          name: string
          pixel_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          conversion_events?: string[] | null
          created_at?: string
          domains?: string[] | null
          id?: string
          is_active?: boolean
          name: string
          pixel_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          conversion_events?: string[] | null
          created_at?: string
          domains?: string[] | null
          id?: string
          is_active?: boolean
          name?: string
          pixel_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_pixels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sessions: {
        Row: {
          browser: string | null
          click_id_facebook: string | null
          click_id_google: string | null
          click_id_tiktok: string | null
          created_at: string
          device_type: string | null
          first_visit_at: string
          id: string
          ip_hash: string | null
          landing_page_url: string
          last_activity_at: string
          operating_system: string | null
          project_id: string
          referrer_url: string | null
          session_id: string
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          click_id_facebook?: string | null
          click_id_google?: string | null
          click_id_tiktok?: string | null
          created_at?: string
          device_type?: string | null
          first_visit_at?: string
          id?: string
          ip_hash?: string | null
          landing_page_url: string
          last_activity_at?: string
          operating_system?: string | null
          project_id: string
          referrer_url?: string | null
          session_id: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          click_id_facebook?: string | null
          click_id_google?: string | null
          click_id_tiktok?: string | null
          created_at?: string
          device_type?: string | null
          first_visit_at?: string
          id?: string
          ip_hash?: string | null
          landing_page_url?: string
          last_activity_at?: string
          operating_system?: string | null
          project_id?: string
          referrer_url?: string | null
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_agency_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      user_owns_project: {
        Args: { project_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      campaign_status: "active" | "paused" | "completed" | "draft"
      funnel_type: "low-ticket" | "webinar" | "book-call"
      metric_type:
        | "impressions"
        | "clicks"
        | "conversions"
        | "spend"
        | "revenue"
        | "leads"
        | "cost_per_lead"
        | "conversion_rate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      campaign_status: ["active", "paused", "completed", "draft"],
      funnel_type: ["low-ticket", "webinar", "book-call"],
      metric_type: [
        "impressions",
        "clicks",
        "conversions",
        "spend",
        "revenue",
        "leads",
        "cost_per_lead",
        "conversion_rate",
      ],
    },
  },
} as const
