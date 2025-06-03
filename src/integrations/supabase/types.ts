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
        Relationships: []
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
            foreignKeyName: "integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
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
