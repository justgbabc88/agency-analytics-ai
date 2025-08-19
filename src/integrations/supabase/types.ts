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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      alert_configurations: {
        Row: {
          alert_type: string
          cooldown_minutes: number | null
          created_at: string
          id: string
          is_enabled: boolean
          notification_channels: Json | null
          platform: string
          project_id: string
          threshold_operator: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          alert_type: string
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_channels?: Json | null
          platform: string
          project_id: string
          threshold_operator?: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          alert_type?: string
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_channels?: Json | null
          platform?: string
          project_id?: string
          threshold_operator?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      alert_incidents: {
        Row: {
          alert_config_id: string
          created_at: string
          description: string
          id: string
          incident_type: string
          metadata: Json | null
          platform: string
          project_id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          triggered_at: string
          updated_at: string
        }
        Insert: {
          alert_config_id: string
          created_at?: string
          description: string
          id?: string
          incident_type: string
          metadata?: Json | null
          platform: string
          project_id: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          alert_config_id?: string
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          metadata?: Json | null
          platform?: string
          project_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          triggered_at?: string
          updated_at?: string
        }
        Relationships: []
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
          cancelled_at: string | null
          created_at: string
          event_type_name: string
          id: string
          invitee_email: string | null
          invitee_name: string | null
          is_closed: boolean
          project_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          calendly_event_id: string
          calendly_event_type_id: string
          cancelled_at?: string | null
          created_at?: string
          event_type_name: string
          id?: string
          invitee_email?: string | null
          invitee_name?: string | null
          is_closed?: boolean
          project_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendly_event_id?: string
          calendly_event_type_id?: string
          cancelled_at?: string | null
          created_at?: string
          event_type_name?: string
          id?: string
          invitee_email?: string | null
          invitee_name?: string | null
          is_closed?: boolean
          project_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendly_sync_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          events_created: number | null
          events_processed: number | null
          events_updated: number | null
          id: string
          project_id: string | null
          sync_duration_ms: number | null
          sync_range_end: string | null
          sync_range_start: string | null
          sync_status: string
          sync_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          events_created?: number | null
          events_processed?: number | null
          events_updated?: number | null
          id?: string
          project_id?: string | null
          sync_duration_ms?: number | null
          sync_range_end?: string | null
          sync_range_start?: string | null
          sync_status: string
          sync_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          events_created?: number | null
          events_processed?: number | null
          events_updated?: number | null
          id?: string
          project_id?: string | null
          sync_duration_ms?: number | null
          sync_range_end?: string | null
          sync_range_start?: string | null
          sync_status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendly_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      ghl_form_submissions: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          form_data: Json | null
          form_id: string
          id: string
          project_id: string
          submission_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          form_data?: Json | null
          form_id: string
          id?: string
          project_id: string
          submission_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          form_data?: Json | null
          form_id?: string
          id?: string
          project_id?: string
          submission_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ghl_form_submissions_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_forms: {
        Row: {
          created_at: string
          form_id: string
          form_name: string
          form_url: string | null
          id: string
          is_active: boolean
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          form_name: string
          form_url?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          form_name?: string
          form_url?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ghl_forms_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          consecutive_sync_failures: number | null
          created_at: string
          data_quality_score: number | null
          id: string
          is_connected: boolean
          last_health_check: string | null
          last_sync: string | null
          last_sync_duration_ms: number | null
          platform: string
          project_id: string
          sync_health_score: number | null
          sync_preferences: Json | null
          total_events_synced: number | null
          updated_at: string
          user_timezone: string | null
        }
        Insert: {
          consecutive_sync_failures?: number | null
          created_at?: string
          data_quality_score?: number | null
          id?: string
          is_connected?: boolean
          last_health_check?: string | null
          last_sync?: string | null
          last_sync_duration_ms?: number | null
          platform: string
          project_id: string
          sync_health_score?: number | null
          sync_preferences?: Json | null
          total_events_synced?: number | null
          updated_at?: string
          user_timezone?: string | null
        }
        Update: {
          consecutive_sync_failures?: number | null
          created_at?: string
          data_quality_score?: number | null
          id?: string
          is_connected?: boolean
          last_health_check?: string | null
          last_sync?: string | null
          last_sync_duration_ms?: number | null
          platform?: string
          project_id?: string
          sync_health_score?: number | null
          sync_preferences?: Json | null
          total_events_synced?: number | null
          updated_at?: string
          user_timezone?: string | null
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
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          requests_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          requests_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          requests_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sync_health_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          platform: string
          project_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          platform: string
          project_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          platform?: string
          project_id?: string
          timestamp?: string
        }
        Relationships: []
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
      calendly_sync_health: {
        Row: {
          consecutive_sync_failures: number | null
          health_status: string | null
          last_activity: string | null
          last_sync: string | null
          last_sync_duration_ms: number | null
          project_id: string | null
          project_name: string | null
          recent_failures: number | null
          sync_health_score: number | null
          total_events_synced: number | null
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
      project_daily_metrics: {
        Row: {
          created_at: string | null
          date: string | null
          id: string | null
          landing_page_name: string | null
          landing_page_url: string | null
          project_id: string | null
          total_page_views: number | null
          unique_visitors: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_attribution_data: {
        Row: {
          attributed_revenue: number | null
          attribution_model: string | null
          contact_email: string | null
          contact_phone: string | null
          conversion_date: string | null
          created_at: string | null
          event_id: string | null
          id: string | null
          project_id: string | null
          session_id: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          attributed_revenue?: number | null
          attribution_model?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          conversion_date?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          project_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          attributed_revenue?: number | null
          attribution_model?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          conversion_date?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          project_id?: string | null
          session_id?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      aggregate_project_daily_metrics: {
        Args: { p_project_id: string; target_date?: string }
        Returns: undefined
      }
      check_alert_thresholds: {
        Args: {
          p_metric_type: string
          p_metric_value: number
          p_platform: string
          p_project_id: string
        }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      get_project_daily_metrics: {
        Args: { p_end_date: string; p_project_id: string; p_start_date: string }
        Returns: {
          date: string
          landing_page_name: string
          landing_page_url: string
          total_page_views: number
          unique_visitors: number
        }[]
      }
      get_user_agency_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      log_calendly_sync: {
        Args: {
          p_error_message?: string
          p_events_created?: number
          p_events_processed?: number
          p_events_updated?: number
          p_project_id: string
          p_sync_duration_ms?: number
          p_sync_range_end?: string
          p_sync_range_start?: string
          p_sync_status: string
          p_sync_type: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
          p_severity?: string
          p_user_id: string
        }
        Returns: string
      }
      record_sync_metric: {
        Args: {
          p_metadata?: Json
          p_metric_type: string
          p_metric_value: number
          p_platform: string
          p_project_id: string
        }
        Returns: string
      }
      secure_attribution_with_contact: {
        Args: {
          p_attributed_revenue?: number
          p_attribution_model?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_event_id: string
          p_project_id: string
          p_session_id: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: string
      }
      setup_calendly_sync_cron: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      setup_ghl_sync_cron: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      setup_unified_integration_sync_cron: {
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
