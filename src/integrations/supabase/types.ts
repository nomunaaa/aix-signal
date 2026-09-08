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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_analysis_cache: {
        Row: {
          analysis_type: string
          cache_key: string
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          input_params: Json
          result: Json
        }
        Insert: {
          analysis_type: string
          cache_key: string
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          input_params: Json
          result: Json
        }
        Update: {
          analysis_type?: string
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          input_params?: Json
          result?: Json
        }
        Relationships: []
      }
      ai_asset_insights: {
        Row: {
          ai_resonance: Json
          analysis: Json | null
          asset_symbol: string
          batch_id: string
          catalyst: Json
          created_at: string | null
          id: string
          market: Json
          meta: Json | null
          news: Json | null
          sentiment_flux: Json | null
          social: Json
          ts: string
        }
        Insert: {
          ai_resonance: Json
          analysis?: Json | null
          asset_symbol: string
          batch_id: string
          catalyst: Json
          created_at?: string | null
          id?: string
          market: Json
          meta?: Json | null
          news?: Json | null
          sentiment_flux?: Json | null
          social: Json
          ts: string
        }
        Update: {
          ai_resonance?: Json
          analysis?: Json | null
          asset_symbol?: string
          batch_id?: string
          catalyst?: Json
          created_at?: string | null
          id?: string
          market?: Json
          meta?: Json | null
          news?: Json | null
          sentiment_flux?: Json | null
          social?: Json
          ts?: string
        }
        Relationships: []
      }
      ai_usage_stats: {
        Row: {
          cache_hit: boolean
          cost_usd: number | null
          created_at: string | null
          function_name: string
          id: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cache_hit: boolean
          cost_usd?: number | null
          created_at?: string | null
          function_name: string
          id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean
          cost_usd?: number | null
          created_at?: string | null
          function_name?: string
          id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          channel: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          rule: Json | null
          symbol: string
          user_id: string
        }
        Insert: {
          channel?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule?: Json | null
          symbol: string
          user_id: string
        }
        Update: {
          channel?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule?: Json | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts_history: {
        Row: {
          action: string
          amount: number | null
          created_at: string | null
          cycle_id: string | null
          id: string
          pnl_pct: number | null
          price: number
          side: string
          symbol: string
          ts: string
          user_id: string
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          pnl_pct?: number | null
          price: number
          side: string
          symbol: string
          ts: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          pnl_pct?: number | null
          price?: number
          side?: string
          symbol?: string
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_theme_mapping: {
        Row: {
          created_at: string
          id: string
          symbol: string
          theme_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          symbol: string
          theme_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string
          theme_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_theme_mapping_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes_master"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_bars_10m: {
        Row: {
          close: number
          created_at: string | null
          high: number
          low: number
          open: number
          symbol: string
          ts: number
          ts_ms: number
          ts_utc: string | null
          updated_at: string | null
          volume: number
          webhook_sent: boolean | null
        }
        Insert: {
          close: number
          created_at?: string | null
          high: number
          low: number
          open: number
          symbol: string
          ts: number
          ts_ms: number
          ts_utc?: string | null
          updated_at?: string | null
          volume: number
          webhook_sent?: boolean | null
        }
        Update: {
          close?: number
          created_at?: string | null
          high?: number
          low?: number
          open?: number
          symbol?: string
          ts?: number
          ts_ms?: number
          ts_utc?: string | null
          updated_at?: string | null
          volume?: number
          webhook_sent?: boolean | null
        }
        Relationships: []
      }
      chart_states: {
        Row: {
          bar_interval: string | null
          created_at: string | null
          source: string | null
          symbol: string
          trend_long: string | null
          trend_short: string | null
          updated_at: string | null
          volatility: string | null
        }
        Insert: {
          bar_interval?: string | null
          created_at?: string | null
          source?: string | null
          symbol: string
          trend_long?: string | null
          trend_short?: string | null
          updated_at?: string | null
          volatility?: string | null
        }
        Update: {
          bar_interval?: string | null
          created_at?: string | null
          source?: string | null
          symbol?: string
          trend_long?: string | null
          trend_short?: string | null
          updated_at?: string | null
          volatility?: string | null
        }
        Relationships: []
      }
      chart_snapshots: {
        Row: {
          created_at: string | null
          id: string
          image_path: string
          interval: string
          slug: string
          symbol: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_path: string
          interval: string
          slug: string
          symbol: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_path?: string
          interval?: string
          slug?: string
          symbol?: string
        }
        Relationships: []
      }
      crypto_icons: {
        Row: {
          cached_at: string | null
          coingecko_id: string | null
          icon_url: string
          id: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          cached_at?: string | null
          coingecko_id?: string | null
          icon_url: string
          id?: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          cached_at?: string | null
          coingecko_id?: string | null
          icon_url?: string
          id?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enterprise_leads: {
        Row: {
          aum_range: string
          company_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          industry: string
          lead_score: number | null
          notes: string | null
          phone: string
          status: string | null
          timeline: string
          title: string
          updated_at: string | null
          use_case: string
        }
        Insert: {
          aum_range: string
          company_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id?: string
          industry: string
          lead_score?: number | null
          notes?: string | null
          phone: string
          status?: string | null
          timeline: string
          title: string
          updated_at?: string | null
          use_case: string
        }
        Update: {
          aum_range?: string
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          industry?: string
          lead_score?: number | null
          notes?: string | null
          phone?: string
          status?: string | null
          timeline?: string
          title?: string
          updated_at?: string | null
          use_case?: string
        }
        Relationships: []
      }
      exchange_api_credentials: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          exchange: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          base_priority: number | null
          content: Json
          created_at: string | null
          expires_at: string | null
          id: string
          item_type: string
          signal_id: string | null
          symbol: string | null
          theme_id: string | null
        }
        Insert: {
          base_priority?: number | null
          content: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          item_type: string
          signal_id?: string | null
          symbol?: string | null
          theme_id?: string | null
        }
        Update: {
          base_priority?: number | null
          content?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          item_type?: string
          signal_id?: string | null
          symbol?: string | null
          theme_id?: string | null
        }
        Relationships: []
      }
      impact_events: {
        Row: {
          advice: string | null
          ai_published: boolean | null
          assets: string[] | null
          created_at: string | null
          id: string
          impact: string | null
          published: boolean | null
          sentiment: string | null
          sources: Json | null
          title: string
          tldr: string | null
          updated_at: string | null
        }
        Insert: {
          advice?: string | null
          ai_published?: boolean | null
          assets?: string[] | null
          created_at?: string | null
          id?: string
          impact?: string | null
          published?: boolean | null
          sentiment?: string | null
          sources?: Json | null
          title: string
          tldr?: string | null
          updated_at?: string | null
        }
        Update: {
          advice?: string | null
          ai_published?: boolean | null
          assets?: string[] | null
          created_at?: string | null
          id?: string
          impact?: string | null
          published?: boolean | null
          sentiment?: string | null
          sources?: Json | null
          title?: string
          tldr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      live_feed_assets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          symbol: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          symbol: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      live_feed_global_trends: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          dominant_narrative: string | null
          global_entropy: number | null
          id: string
          market_psychology: string | null
          top_keywords: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          dominant_narrative?: string | null
          global_entropy?: number | null
          id?: string
          market_psychology?: string | null
          top_keywords?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          dominant_narrative?: string | null
          global_entropy?: number | null
          id?: string
          market_psychology?: string | null
          top_keywords?: string[] | null
        }
        Relationships: []
      }
      live_feed_signals: {
        Row: {
          ai_insight: string | null
          alt_rank: number | null
          created_at: string | null
          galaxy_score: number | null
          id: string
          price: number
          price_change_24h: number | null
          probability_up: number | null
          sentiment: number | null
          social_dominance: number | null
          social_volume: number | null
          symbol: string
        }
        Insert: {
          ai_insight?: string | null
          alt_rank?: number | null
          created_at?: string | null
          galaxy_score?: number | null
          id?: string
          price: number
          price_change_24h?: number | null
          probability_up?: number | null
          sentiment?: number | null
          social_dominance?: number | null
          social_volume?: number | null
          symbol: string
        }
        Update: {
          ai_insight?: string | null
          alt_rank?: number | null
          created_at?: string | null
          galaxy_score?: number | null
          id?: string
          price?: number
          price_change_24h?: number | null
          probability_up?: number | null
          sentiment?: number | null
          social_dominance?: number | null
          social_volume?: number | null
          symbol?: string
        }
        Relationships: []
      }
      mock_trades: {
        Row: {
          created_at: string | null
          direction: string
          entry_at: string
          entry_price: number
          exit_at: string | null
          exit_price: number | null
          id: string
          is_closed: boolean | null
          profit_pct: number | null
          symbol: string
          updated_at: string | null
          user_id: string
          capital: number | null
          leverage: number | null
          position_size: number | null
          pnl: number | null
          status: string | null
          trend_kind: string | null
          notes: string | null
          signal_cycle_id: string | null
          avg_entry_price: number | null
          remaining_pct: number | null
          realized_pnl_usd: number | null
          close_capture_path: string | null
          close_capture_at: string | null
          stream: string | null
          base_capital: number | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          entry_at: string
          entry_price: number
          exit_at?: string | null
          exit_price?: number | null
          id?: string
          is_closed?: boolean | null
          profit_pct?: number | null
          symbol: string
          updated_at?: string | null
          user_id: string
          capital?: number | null
          leverage?: number | null
          position_size?: number | null
          pnl?: number | null
          status?: string | null
          trend_kind?: string | null
          notes?: string | null
          signal_cycle_id?: string | null
          avg_entry_price?: number | null
          remaining_pct?: number | null
          realized_pnl_usd?: number | null
          close_capture_path?: string | null
          close_capture_at?: string | null
          stream?: string | null
          base_capital?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          entry_at?: string
          entry_price?: number
          exit_at?: string | null
          exit_price?: number | null
          id?: string
          is_closed?: boolean | null
          profit_pct?: number | null
          symbol?: string
          updated_at?: string | null
          user_id?: string
          capital?: number | null
          leverage?: number | null
          position_size?: number | null
          pnl?: number | null
          status?: string | null
          trend_kind?: string | null
          notes?: string | null
          signal_cycle_id?: string | null
          avg_entry_price?: number | null
          remaining_pct?: number | null
          realized_pnl_usd?: number | null
          close_capture_path?: string | null
          close_capture_at?: string | null
          stream?: string | null
          base_capital?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_trade_fills: {
        Row: {
          id: string
          trade_id: string
          user_id: string
          fill_type: string
          price: number
          quantity_pct: number
          filled_at: string
          pnl_usd: number | null
          pnl_pct: number | null
          avg_entry_price_at_fill: number | null
        }
        Insert: {
          id?: string
          trade_id: string
          user_id: string
          fill_type: string
          price: number
          quantity_pct: number
          filled_at?: string
          pnl_usd?: number | null
          pnl_pct?: number | null
          avg_entry_price_at_fill?: number | null
        }
        Update: {
          id?: string
          trade_id?: string
          user_id?: string
          fill_type?: string
          price?: number
          quantity_pct?: number
          filled_at?: string
          pnl_usd?: number | null
          pnl_pct?: number | null
          avg_entry_price_at_fill?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_trade_fills_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "mock_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          id: string
          user_id: string
          signal_cycle_id: string
          symbol: string
          side: string
          entry_price: number
          exit_price: number | null
          amount: number
          leverage: number
          pnl: number | null
          pnl_percent: number | null
          status: string
          entries: Json | null
          exits: Json | null
          created_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          signal_cycle_id: string
          symbol: string
          side: string
          entry_price: number
          exit_price?: number | null
          amount: number
          leverage?: number
          pnl?: number | null
          pnl_percent?: number | null
          status?: string
          entries?: Json | null
          exits?: Json | null
          created_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          signal_cycle_id?: string
          symbol?: string
          side?: string
          entry_price?: number
          exit_price?: number | null
          amount?: number
          leverage?: number
          pnl?: number | null
          pnl_percent?: number | null
          status?: string
          entries?: Json | null
          exits?: Json | null
          created_at?: string | null
          closed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          bar_interval: string | null
          created_at: string
          flow: string | null
          id: string
          is_read: boolean
          kind: string
          message: string
          symbol: string
          trading_category: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bar_interval?: string | null
          created_at?: string
          flow?: string | null
          id?: string
          is_read?: boolean
          kind: string
          message: string
          symbol: string
          trading_category?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bar_interval?: string | null
          created_at?: string
          flow?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          message?: string
          symbol?: string
          trading_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          agency_name: string
          business_license: string | null
          contact_name: string
          created_at: string | null
          current_clients: string | null
          email: string
          id: string
          message: string | null
          phone: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_name: string
          business_license?: string | null
          contact_name: string
          created_at?: string | null
          current_clients?: string | null
          email: string
          id?: string
          message?: string | null
          phone: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_name?: string
          business_license?: string | null
          contact_name?: string
          created_at?: string | null
          current_clients?: string | null
          email?: string
          id?: string
          message?: string | null
          phone?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_info: {
        Row: {
          approved_earnings: number
          commission_rate: number
          created_at: string | null
          id: string
          paid_earnings: number
          partner_type: Database["public"]["Enums"]["partner_type"]
          pending_earnings: number
          total_earnings: number
          total_referrals: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_earnings?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          paid_earnings?: number
          partner_type?: Database["public"]["Enums"]["partner_type"]
          pending_earnings?: number
          total_earnings?: number
          total_referrals?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_earnings?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          paid_earnings?: number
          partner_type?: Database["public"]["Enums"]["partner_type"]
          pending_earnings?: number
          total_earnings?: number
          total_referrals?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commission_ledger: {
        Row: {
          allocation_id: string | null
          amount_cents: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          partner_account_id: string | null
          payment_event_id: string | null
          settlement_batch_id: string | null
          source_ref: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          allocation_id?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          partner_account_id?: string | null
          payment_event_id?: string | null
          settlement_batch_id?: string | null
          source_ref?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          allocation_id?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          partner_account_id?: string | null
          payment_event_id?: string | null
          settlement_batch_id?: string | null
          source_ref?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commission_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commission_policy: {
        Row: {
          agency_percent_bps: number
          agent_pool_percent_bps: number
          created_at: string
          effective_from: string
          id: string
          is_active: boolean
          level_splits: Json
          name: string
        }
        Insert: {
          agency_percent_bps?: number
          agent_pool_percent_bps: number
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          level_splits?: Json
          name: string
        }
        Update: {
          agency_percent_bps?: number
          agent_pool_percent_bps?: number
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          level_splits?: Json
          name?: string
        }
        Relationships: []
      }
      partner_coupons: {
        Row: {
          code: string
          created_at: string
          discount_amount_cents: number | null
          discount_percent_bps: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
          metadata: Json | null
          owner_user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_amount_cents?: number | null
          discount_percent_bps?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          metadata?: Json | null
          owner_user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_amount_cents?: number | null
          discount_percent_bps?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          metadata?: Json | null
          owner_user_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_coupons_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_accounts: {
        Row: {
          auth_user_id: string | null
          commission_rate_bps: number
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          is_default_store: boolean
          is_system_account: boolean
          legacy_profile_id: string | null
          parent_id: string | null
          referral_code: string | null
          status: string
          tier: Database["public"]["Enums"]["partner_tier"]
          updated_at: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          commission_rate_bps?: number
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_default_store?: boolean
          is_system_account?: boolean
          legacy_profile_id?: string | null
          parent_id?: string | null
          referral_code?: string | null
          status?: string
          tier: Database["public"]["Enums"]["partner_tier"]
          updated_at?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          commission_rate_bps?: number
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_default_store?: boolean
          is_system_account?: boolean
          legacy_profile_id?: string | null
          parent_id?: string | null
          referral_code?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["partner_tier"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      partner_activity_log: {
        Row: {
          activity_type: Database["public"]["Enums"]["partner_activity_type"]
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          partner_account_id: string
          summary: string | null
          user_agent: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["partner_activity_type"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          partner_account_id: string
          summary?: string | null
          user_agent?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["partner_activity_type"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          partner_account_id?: string
          summary?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      partner_payout_profiles: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          crypto_network: string | null
          crypto_wallet_address: string | null
          currency: string
          id: string
          is_primary: boolean
          metadata: Json
          method: Database["public"]["Enums"]["partner_payout_method"]
          partner_account_id: string
          updated_at: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          crypto_network?: string | null
          crypto_wallet_address?: string | null
          currency?: string
          id?: string
          is_primary?: boolean
          metadata?: Json
          method: Database["public"]["Enums"]["partner_payout_method"]
          partner_account_id: string
          updated_at?: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          crypto_network?: string | null
          crypto_wallet_address?: string | null
          currency?: string
          id?: string
          is_primary?: boolean
          metadata?: Json
          method?: Database["public"]["Enums"]["partner_payout_method"]
          partner_account_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_settlement_batches: {
        Row: {
          admin_note: string | null
          clawback_cents: number
          created_at: string
          currency: string
          gross_earning_cents: number
          id: string
          net_amount_cents: number
          paid_at: string | null
          paid_reference: string | null
          partner_account_id: string
          payout_profile_id: string | null
          period_month: string
          status: Database["public"]["Enums"]["partner_settlement_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          clawback_cents?: number
          created_at?: string
          currency?: string
          gross_earning_cents?: number
          id?: string
          net_amount_cents?: number
          paid_at?: string | null
          paid_reference?: string | null
          partner_account_id: string
          payout_profile_id?: string | null
          period_month: string
          status?: Database["public"]["Enums"]["partner_settlement_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          clawback_cents?: number
          created_at?: string
          currency?: string
          gross_earning_cents?: number
          id?: string
          net_amount_cents?: number
          paid_at?: string | null
          paid_reference?: string | null
          partner_account_id?: string
          payout_profile_id?: string | null
          period_month?: string
          status?: Database["public"]["Enums"]["partner_settlement_status"]
          updated_at?: string
        }
        Relationships: []
      }
      partner_withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          bank_note: string | null
          created_at: string
          currency: string
          id: string
          partner_account_id: string | null
          payout_profile_id: string | null
          settlement_batch_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          bank_note?: string | null
          created_at?: string
          currency?: string
          id?: string
          partner_account_id?: string | null
          payout_profile_id?: string | null
          settlement_batch_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          bank_note?: string | null
          created_at?: string
          currency?: string
          id?: string
          partner_account_id?: string | null
          payout_profile_id?: string | null
          settlement_batch_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_health: {
        Row: {
          corr: Json | null
          risk_level: string
          sector_mix: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          corr?: Json | null
          risk_level: string
          sector_mix?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          corr?: Json | null
          risk_level?: string
          sector_mix?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_health_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_scores: {
        Row: {
          created_at: string | null
          ctx: string | null
          id: number
          kind: string | null
          position_id: string
          reason: Json | null
          score: number
          symbol: string
        }
        Insert: {
          created_at?: string | null
          ctx?: string | null
          id?: number
          kind?: string | null
          position_id: string
          reason?: Json | null
          score: number
          symbol: string
        }
        Update: {
          created_at?: string | null
          ctx?: string | null
          id?: number
          kind?: string | null
          position_id?: string
          reason?: Json | null
          score?: number
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_scores_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          entry_context: string[] | null
          entry_price: number | null
          id: string
          is_open: boolean | null
          note: string | null
          origin: string
          qty: number | null
          side: string | null
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_context?: string[] | null
          entry_price?: number | null
          id?: string
          is_open?: boolean | null
          note?: string | null
          origin?: string
          qty?: number | null
          side?: string | null
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_context?: string[] | null
          entry_price?: number | null
          id?: string
          is_open?: boolean | null
          note?: string | null
          origin?: string
          qty?: number | null
          side?: string | null
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhooks: {
        Row: {
          created_at: string | null
          key: string
          ts: number
        }
        Insert: {
          created_at?: string | null
          key: string
          ts: number
        }
        Update: {
          created_at?: string | null
          key?: string
          ts?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          last_sign_in_at: string | null
          multi_chart_presets: Json | null
          partner_portal_access: string
          partner_portal_requested_at: string | null
          partner_role: string | null
          partner_upline_user_id: string | null
          phone_number: string | null
          phone_verified: boolean
          plan: string | null
          points: number
          push_subscription: Json | null
          stripe_customer_id: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          telegram_chat_id: string | null
          telegram_group_access: boolean | null
          telegram_last_synced_at: string | null
          updated_at: string | null
          wallet_address: string | null
          wallet_network: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          last_sign_in_at?: string | null
          multi_chart_presets?: Json | null
          partner_portal_access?: string
          partner_portal_requested_at?: string | null
          partner_role?: string | null
          partner_upline_user_id?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          plan?: string | null
          points?: number
          push_subscription?: Json | null
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          telegram_chat_id?: string | null
          telegram_group_access?: boolean | null
          telegram_last_synced_at?: string | null
          updated_at?: string | null
          wallet_address?: string | null
          wallet_network?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          last_sign_in_at?: string | null
          multi_chart_presets?: Json | null
          partner_portal_access?: string
          partner_portal_requested_at?: string | null
          partner_role?: string | null
          partner_upline_user_id?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          plan?: string | null
          points?: number
          push_subscription?: Json | null
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          telegram_chat_id?: string | null
          telegram_group_access?: boolean | null
          telegram_last_synced_at?: string | null
          updated_at?: string | null
          wallet_address?: string | null
          wallet_network?: string | null
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          approved_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          paid_at: string | null
          referee_id: string
          referrer_id: string
          status: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          referee_id: string
          referrer_id: string
          status?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          referee_id?: string
          referrer_id?: string
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_relationships: {
        Row: {
          attribution_metadata: Json
          attribution_source: string
          created_at: string | null
          id: string
          member_referrer_id: string | null
          referee_id: string
          referral_code: string
          referrer_id: string | null
          store_partner_id: string | null
        }
        Insert: {
          attribution_metadata?: Json
          attribution_source: string
          created_at?: string | null
          id?: string
          member_referrer_id?: string | null
          referee_id: string
          referral_code: string
          referrer_id?: string | null
          store_partner_id?: string | null
        }
        Update: {
          attribution_metadata?: Json
          attribution_source?: string
          created_at?: string | null
          id?: string
          member_referrer_id?: string | null
          referee_id?: string
          referral_code?: string
          referrer_id?: string | null
          store_partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_relationships_member_referrer_fkey"
            columns: ["member_referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_relationships_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_relationships_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_relationships_store_partner_id_fkey"
            columns: ["store_partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_actions: {
        Row: {
          id: string
          signal_id: string
          action_type: string
          price: number
          status: string
          triggered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          signal_id: string
          action_type: string
          price: number
          status: string
          triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          signal_id?: string
          action_type?: string
          price?: number
          status?: string
          triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_actions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signal_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_cycles: {
        Row: {
          added_entry_cycle_id: string | null
          added_entry_event_id: string | null
          added_entry_price: number | null
          added_entry_timestamp: string | null
          barinterval: string | null
          created_at: string
          cycle_id: string | null
          entry_trend_long: string | null
          entry_trend_short: string | null
          exit_cycle_id: string | null
          entry_event_id: string | null
          entry_price: number
          entry_time: string
          exit_event_id: string | null
          exit_price: number | null
          exit_time: string | null
          flow: string | null
          hold_sec: number | null
          id: string
          ingest_mode: string
          is_open: boolean
          partial_exit_cycle_id: string | null
          partial_exit_event_id: string | null
          partial_exit_price: number | null
          partial_exit_timestamp: string | null
          realized_pnl_pct: number | null
          side: string
          strategy_type: string | null
          trading_category: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          added_entry_cycle_id?: string | null
          added_entry_event_id?: string | null
          added_entry_price?: number | null
          added_entry_timestamp?: string | null
          barinterval?: string | null
          created_at?: string
          cycle_id?: string | null
          entry_trend_long?: string | null
          entry_trend_short?: string | null
          exit_cycle_id?: string | null
          entry_event_id?: string | null
          entry_price: number
          entry_time: string
          exit_event_id?: string | null
          exit_price?: number | null
          exit_time?: string | null
          flow?: string | null
          hold_sec?: number | null
          id?: string
          ingest_mode?: string
          is_open?: boolean
          partial_exit_cycle_id?: string | null
          partial_exit_event_id?: string | null
          partial_exit_price?: number | null
          partial_exit_timestamp?: string | null
          realized_pnl_pct?: number | null
          side: string
          strategy_type?: string | null
          trading_category?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          added_entry_cycle_id?: string | null
          added_entry_event_id?: string | null
          added_entry_price?: number | null
          added_entry_timestamp?: string | null
          barinterval?: string | null
          created_at?: string
          cycle_id?: string | null
          entry_trend_long?: string | null
          entry_trend_short?: string | null
          exit_cycle_id?: string | null
          entry_event_id?: string | null
          entry_price?: number
          entry_time?: string
          exit_event_id?: string | null
          exit_price?: number | null
          exit_time?: string | null
          flow?: string | null
          hold_sec?: number | null
          id?: string
          ingest_mode?: string
          is_open?: boolean
          partial_exit_cycle_id?: string | null
          partial_exit_event_id?: string | null
          partial_exit_price?: number | null
          partial_exit_timestamp?: string | null
          realized_pnl_pct?: number | null
          side?: string
          strategy_type?: string | null
          trading_category?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_cycles_added_entry_event_id_fkey"
            columns: ["added_entry_event_id"]
            isOneToOne: false
            referencedRelation: "signal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_cycles_entry_event_id_fkey"
            columns: ["entry_event_id"]
            isOneToOne: false
            referencedRelation: "signal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_cycles_exit_event_id_fkey"
            columns: ["exit_event_id"]
            isOneToOne: false
            referencedRelation: "signal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_cycles_partial_exit_event_id_fkey"
            columns: ["partial_exit_event_id"]
            isOneToOne: false
            referencedRelation: "signal_events"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_events: {
        Row: {
          bar_interval: string | null
          created_at: string | null
          cycle_id: string | null
          direction: string
          id: string
          ingest_mode: string
          level: number | null
          percentage: number | null
          price: number
          signal_name: string | null
          signal_type: string
          source: string | null
          symbol: string
          timestamp: number
          timestamp_ms: number | null
          trading_category: string | null
          trend_confidence: number | null
          trend_type: string | null
        }
        Insert: {
          bar_interval?: string | null
          created_at?: string | null
          cycle_id?: string | null
          direction: string
          id?: string
          ingest_mode?: string
          level?: number | null
          percentage?: number | null
          price: number
          signal_name?: string | null
          signal_type: string
          source?: string | null
          symbol: string
          timestamp: number
          timestamp_ms?: number | null
          trading_category?: string | null
          trend_confidence?: number | null
          trend_type?: string | null
        }
        Update: {
          bar_interval?: string | null
          created_at?: string | null
          cycle_id?: string | null
          direction?: string
          id?: string
          ingest_mode?: string
          level?: number | null
          percentage?: number | null
          price?: number
          signal_name?: string | null
          signal_type?: string
          source?: string | null
          symbol?: string
          timestamp?: number
          timestamp_ms?: number | null
          trading_category?: string | null
          trend_confidence?: number | null
          trend_type?: string | null
        }
        Relationships: []
      }
      signal_history: {
        Row: {
          changed: boolean | null
          created_at: string | null
          current_value: string
          event_type: string
          id: string
          metadata: Json | null
          previous_value: string | null
          symbol: string
          timestamp: string
        }
        Insert: {
          changed?: boolean | null
          created_at?: string | null
          current_value: string
          event_type: string
          id?: string
          metadata?: Json | null
          previous_value?: string | null
          symbol: string
          timestamp: string
        }
        Update: {
          changed?: boolean | null
          created_at?: string | null
          current_value?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          previous_value?: string | null
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      signal_new_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      snapshot_ownership: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          pinata_cid: string | null
          pinata_url: string | null
          signal_id: string | null
          snapshot_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          pinata_cid?: string | null
          pinata_url?: string | null
          signal_id?: string | null
          snapshot_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          pinata_cid?: string | null
          pinata_url?: string | null
          signal_id?: string | null
          snapshot_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      theme_news: {
        Row: {
          created_at: string
          id: string
          impact_score: number | null
          published_at: string
          sentiment: string | null
          source: string | null
          theme_id: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          impact_score?: number | null
          published_at: string
          sentiment?: string | null
          source?: string | null
          theme_id: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          impact_score?: number | null
          published_at?: string
          sentiment?: string | null
          source?: string | null
          theme_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_news_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes_master"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_vitals: {
        Row: {
          ai_summary: string | null
          calculated_at: string
          capital_flow_score: number
          created_at: string
          id: string
          metrics: Json
          narrative_score: number
          theme_id: string
        }
        Insert: {
          ai_summary?: string | null
          calculated_at?: string
          capital_flow_score?: number
          created_at?: string
          id?: string
          metrics?: Json
          narrative_score?: number
          theme_id: string
        }
        Update: {
          ai_summary?: string | null
          calculated_at?: string
          capital_flow_score?: number
          created_at?: string
          id?: string
          metrics?: Json
          narrative_score?: number
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_vitals_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes_master"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          ai_summary: string | null
          created_at: string
          id: string
          name: string
          news_count: number | null
          representative_tokens: Json | null
          score: number
          sentiment: number
          slug: string
          social_count: number | null
          updated_at: string
          volume_change: number | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          name: string
          news_count?: number | null
          representative_tokens?: Json | null
          score: number
          sentiment: number
          slug: string
          social_count?: number | null
          updated_at?: string
          volume_change?: number | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          name?: string
          news_count?: number | null
          representative_tokens?: Json | null
          score?: number
          sentiment?: number
          slug?: string
          social_count?: number | null
          updated_at?: string
          volume_change?: number | null
        }
        Relationships: []
      }
      themes_master: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          priority: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          priority?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          priority?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      trend_events: {
        Row: {
          barinterval: string
          created_at: string | null
          id: string
          indicator_name: string
          raw_direction: number
          source: string
          symbol: string
          timeframe: string
          ts: string
          type: string
          unique_key: string
          value: number
        }
        Insert: {
          barinterval: string
          created_at?: string | null
          id?: string
          indicator_name: string
          raw_direction: number
          source: string
          symbol: string
          timeframe: string
          ts: string
          type: string
          unique_key: string
          value: number
        }
        Update: {
          barinterval?: string
          created_at?: string | null
          id?: string
          indicator_name?: string
          raw_direction?: number
          source?: string
          symbol?: string
          timeframe?: string
          ts?: string
          type?: string
          unique_key?: string
          value?: number
        }
        Relationships: []
      }
      trend_long_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      trend_recommendations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          internal_strip: string
          external_strip: string
          matrix: Json
          resonance_symbols: string[]
          position_rationale: string | null
          position_entry_pct: number | null
          position_leverage: number | null
          position_bias: string | null
          ref_market_temp: Json | null
          ref_events: Json | null
          ref_flows: Json | null
          source: string
          model_version: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          internal_strip: string
          external_strip: string
          matrix?: Json
          resonance_symbols?: string[]
          position_rationale?: string | null
          position_entry_pct?: number | null
          position_leverage?: number | null
          position_bias?: string | null
          ref_market_temp?: Json | null
          ref_events?: Json | null
          ref_flows?: Json | null
          source?: string
          model_version?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          internal_strip?: string
          external_strip?: string
          matrix?: Json
          resonance_symbols?: string[]
          position_rationale?: string | null
          position_entry_pct?: number | null
          position_leverage?: number | null
          position_bias?: string | null
          ref_market_temp?: Json | null
          ref_events?: Json | null
          ref_flows?: Json | null
          source?: string
          model_version?: string | null
        }
        Relationships: []
      }
      trend_short_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      user_alert_settings: {
        Row: {
          channel_priority: Json | null
          channels: Json | null
          created_at: string | null
          dnd_enabled: boolean | null
          dnd_end: string | null
          dnd_exceptions: string[] | null
          dnd_start: string | null
          enabled: boolean | null
          event_alc_exit: boolean | null
          event_entry: boolean | null
          event_exit: boolean | null
          favorites: string[] | null
          id: string
          mobile_enabled: boolean | null
          mute_until: string | null
          preset: string | null
          scope: string | null
          signal_alerts: boolean | null
          symbols: string[] | null
          telegram_chat_id: string | null
          telegram_enabled: boolean | null
          timezone: string | null
          trend_short_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_priority?: Json | null
          channels?: Json | null
          created_at?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_exceptions?: string[] | null
          dnd_start?: string | null
          enabled?: boolean | null
          event_alc_exit?: boolean | null
          event_entry?: boolean | null
          event_exit?: boolean | null
          favorites?: string[] | null
          id?: string
          mobile_enabled?: boolean | null
          mute_until?: string | null
          preset?: string | null
          scope?: string | null
          signal_alerts?: boolean | null
          symbols?: string[] | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          timezone?: string | null
          trend_short_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_priority?: Json | null
          channels?: Json | null
          created_at?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_exceptions?: string[] | null
          dnd_start?: string | null
          enabled?: boolean | null
          event_alc_exit?: boolean | null
          event_entry?: boolean | null
          event_exit?: boolean | null
          favorites?: string[] | null
          id?: string
          mobile_enabled?: boolean | null
          mute_until?: string | null
          preset?: string | null
          scope?: string | null
          signal_alerts?: boolean | null
          symbols?: string[] | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          timezone?: string | null
          trend_short_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_symbol: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_symbol?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_symbol?: string | null
          user_id?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      volatility_events: {
        Row: {
          barinterval: string
          created_at: string | null
          id: string
          indicator_name: string
          raw_strength: number
          source: string
          symbol: string
          ts: string
          unique_key: string
          value: number
        }
        Insert: {
          barinterval: string
          created_at?: string | null
          id?: string
          indicator_name: string
          raw_strength: number
          source: string
          symbol: string
          ts: string
          unique_key: string
          value: number
        }
        Update: {
          barinterval?: string
          created_at?: string | null
          id?: string
          indicator_name?: string
          raw_strength?: number
          source?: string
          symbol?: string
          ts?: string
          unique_key?: string
          value?: number
        }
        Relationships: []
      }
      volatility_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      volume_alerts: {
        Row: {
          coins: Json
          created_at: string | null
          id: string
          info_card: Json | null
          message_en: string
          message_ko: string
          read_at: string | null
          severity: string | null
          total_alerts: number | null
          type: string
        }
        Insert: {
          coins: Json
          created_at?: string | null
          id?: string
          info_card?: Json | null
          message_en: string
          message_ko: string
          read_at?: string | null
          severity?: string | null
          total_alerts?: number | null
          type: string
        }
        Update: {
          coins?: Json
          created_at?: string | null
          id?: string
          info_card?: Json | null
          message_en?: string
          message_ko?: string
          read_at?: string | null
          severity?: string | null
          total_alerts?: number | null
          type?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          dedupe_key: string | null
          error_message: string | null
          event_type: string
          id: string
          raw: Json | null
          source: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dedupe_key?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          raw?: Json | null
          source: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dedupe_key?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          raw?: Json | null
          source?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      xchart_color_facts: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          long_color: string | null
          short_color: string | null
          symbol: string
          ts: number
          vol_color: string | null
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          long_color?: string | null
          short_color?: string | null
          symbol: string
          ts: number
          vol_color?: string | null
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          long_color?: string | null
          short_color?: string | null
          symbol?: string
          ts?: number
          vol_color?: string | null
        }
        Relationships: []
      }
      xchart_signals: {
        Row: {
          created_at: string | null
          kind: string
          raw: Json | null
          state: number
          symbol: string
          ts: number
          ts_ms: number
        }
        Insert: {
          created_at?: string | null
          kind: string
          raw?: Json | null
          state: number
          symbol: string
          ts: number
          ts_ms: number
        }
        Update: {
          created_at?: string | null
          kind?: string
          raw?: Json | null
          state?: number
          symbol?: string
          ts?: number
          ts_ms?: number
        }
        Relationships: []
      }
    }
    Views: {
      daily_ai_costs: {
        Row: {
          cache_hit_rate: number | null
          cache_hits: number | null
          date: string | null
          function_name: string | null
          total_calls: number | null
          total_cost: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      live_feed_global_latest: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          dominant_narrative: string | null
          global_entropy: number | null
          id: string | null
          market_psychology: string | null
          top_keywords: string[] | null
        }
        Relationships: []
      }
      live_feed_latest: {
        Row: {
          ai_insight: string | null
          alt_rank: number | null
          created_at: string | null
          galaxy_score: number | null
          id: string | null
          price: number | null
          price_change_24h: number | null
          probability_up: number | null
          sentiment: number | null
          social_dominance: number | null
          social_volume: number | null
          symbol: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      alerts_ensure_prefs: { Args: { p_user: string }; Returns: undefined }
      cleanup_expired_feeds: { Args: never; Returns: undefined }
      cleanup_processed_webhooks: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      clawback_partner_commissions: {
        Args: {
          p_payment_event_id: string
          p_payment_status?: Database["public"]["Enums"]["partner_payment_status"]
          p_refund_ratio?: number
        }
        Returns: undefined
      }
      complete_trend_long_job: { Args: { job_id: string }; Returns: undefined }
      complete_trend_short_job: { Args: { job_id: string }; Returns: undefined }
      complete_volatility_job: { Args: { job_id: string }; Returns: undefined }
      fail_trend_long_job: {
        Args: { error_msg: string; job_id: string }
        Returns: undefined
      }
      fail_trend_short_job: {
        Args: { error_msg: string; job_id: string }
        Returns: undefined
      }
      fail_volatility_job: {
        Args: { error_msg: string; job_id: string }
        Returns: undefined
      }
      process_referral_code: {
        Args: { p_referee_id: string; p_ref_code: string }
        Returns: undefined
      }
      get_alert_assets: {
        Args: never
        Returns: {
          name: string
          symbol: string
        }[]
      }
      get_latest_prices_bulk: {
        Args: never
        Returns: {
          close: number
          symbol: string
        }[]
      }
      get_latest_theme_vitals: {
        Args: never
        Returns: {
          ai_summary: string
          asset_count: number
          calculated_at: string
          capital_flow_score: number
          narrative_score: number
          theme_id: string
          theme_name: string
          theme_slug: string
          total_score: number
        }[]
      }
      get_next_trend_long_job: {
        Args: never
        Returns: {
          attempts: number
          id: string
          idempotency_key: string
          payload: Json
        }[]
      }
      get_next_trend_short_job: {
        Args: never
        Returns: {
          attempts: number
          id: string
          idempotency_key: string
          payload: Json
        }[]
      }
      get_next_volatility_job: {
        Args: never
        Returns: {
          attempts: number
          id: string
          idempotency_key: string
          payload: Json
        }[]
      }
      get_user_alert_assets: { Args: { p_user_id: string }; Returns: string[] }
      get_user_alert_prefs: {
        Args: { p_user_id: string }
        Returns: {
          batch_enabled: boolean
          batch_time: string
          dnd_end: string
          dnd_start: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_volatility_worker: {
        Args: { payload_json: Json }
        Returns: undefined
      }
      save_initial_prefs: {
        Args: {
          p_assets: string[]
          p_batch_enabled?: boolean
          p_batch_time?: string
          p_dnd_end?: string
          p_dnd_start?: string
        }
        Returns: undefined
      }
      update_user_credits_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      partner_portal_get_balance_cents: { Args: never; Returns: number }
      partner_portal_get_dashboard_summary: {
        Args: { p_period?: string | null }
        Returns: Json
      }
      partner_portal_get_downline_partners: {
        Args: {
          p_scope?: string | null
          p_search?: string | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: Json
      }
      partner_portal_count_downline_partners: {
        Args: { p_scope?: string | null; p_search?: string | null }
        Returns: number
      }
      partner_portal_get_login_email: { Args: { p_username: string }; Returns: string }
      partner_portal_get_my_account: { Args: never; Returns: Json }
      partner_portal_get_payments: {
        Args: {
          p_from?: string | null
          p_limit?: number | null
          p_offset?: number | null
          p_scope?: string | null
          p_to?: string | null
          p_provider?: string | null
          p_status?: Database['public']['Enums']['partner_payment_status'] | null
        }
        Returns: Json
      }
      partner_portal_count_payments: {
        Args: {
          p_from?: string | null
          p_scope?: string | null
          p_to?: string | null
          p_provider?: string | null
          p_status?: Database['public']['Enums']['partner_payment_status'] | null
        }
        Returns: number
      }
      partner_portal_get_activity_log: {
        Args: {
          p_activity_type?: Database["public"]["Enums"]["partner_activity_type"] | null
          p_from?: string | null
          p_limit?: number | null
          p_offset?: number | null
          p_to?: string | null
        }
        Returns: Json
      }
      partner_portal_count_activity_log: {
        Args: {
          p_activity_type?: Database["public"]["Enums"]["partner_activity_type"] | null
          p_from?: string | null
          p_to?: string | null
        }
        Returns: number
      }
      partner_portal_get_downline_signups: {
        Args: {
          p_day?: string | null
          p_from_date?: string | null
          p_to_date?: string | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: Json
      }
      partner_portal_count_downline_signups: {
        Args: {
          p_day?: string | null
          p_from_date?: string | null
          p_to_date?: string | null
        }
        Returns: number
      }
      partner_portal_get_payout_profile: { Args: never; Returns: Json }
      partner_portal_get_pending_withdrawal_cents: { Args: never; Returns: number }
      partner_portal_get_settlement_batches: {
        Args: {
          p_from_month?: string | null
          p_to_month?: string | null
          p_status?: Database['public']['Enums']['partner_settlement_status'] | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: Json
      }
      partner_portal_count_settlement_batches: {
        Args: {
          p_from_month?: string | null
          p_to_month?: string | null
          p_status?: Database['public']['Enums']['partner_settlement_status'] | null
        }
        Returns: number
      }
      partner_portal_get_settlement_tier_totals: {
        Args: { p_period_month: string; p_scope?: string | null }
        Returns: Json
      }
      partner_portal_get_settlement_partner_breakdown: {
        Args: {
          p_period_month: string
          p_scope?: string | null
          p_tier?: Database['public']['Enums']['partner_tier'] | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: Json
      }
      partner_portal_count_settlement_partner_breakdown: {
        Args: {
          p_period_month: string
          p_scope?: string | null
          p_tier?: Database['public']['Enums']['partner_tier'] | null
        }
        Returns: number
      }
      partner_portal_get_settlement_summary: {
        Args: {
          p_from_month?: string | null
          p_to_month?: string | null
        }
        Returns: Json
      }
      partner_portal_log_login: {
        Args: { p_ip_address?: string | null; p_user_agent?: string | null }
        Returns: string
      }
      admin_build_settlement_batch: {
        Args: { p_partner_account_id: string; p_period_month: string }
        Returns: string
      }
      admin_build_settlement_batches_all: {
        Args: { p_period_month: string }
        Returns: {
          partner_account_id: string
          partner_username: string
          batch_id: string
        }[]
      }
      admin_list_settlement_batches: {
        Args: {
          p_from_month?: string | null
          p_to_month?: string | null
          p_status?: Database['public']['Enums']['partner_settlement_status'] | null
        }
        Returns: {
          id: string
          partner_account_id: string
          partner_username: string
          partner_tier: Database['public']['Enums']['partner_tier']
          period_month: string
          gross_earning_cents: number
          clawback_cents: number
          net_amount_cents: number
          currency: string
          status: Database['public']['Enums']['partner_settlement_status']
          paid_at: string | null
          paid_reference: string | null
          payout_method: Database['public']['Enums']['partner_payout_method'] | null
          created_at: string
          updated_at: string
        }[]
      }
      admin_update_settlement_status: {
        Args: {
          p_batch_id: string
          p_status: Database['public']['Enums']['partner_settlement_status']
          p_paid_reference?: string | null
        }
        Returns: undefined
      }
      partner_cron_build_settlement_batches_all: {
        Args: { p_period_month: string }
        Returns: {
          partner_account_id: string
          partner_username: string
          batch_id: string
        }[]
      }
      partner_cron_run_monthly_settlement: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "settlement_admin" | "member_management" | "read_only" | "user"
      flow_label: "TREND" | "CT_SHORT" | "CT_FULL"
      flow_type: "ENTRY_DISCOUNT" | "POSITIONING"
      partner_activity_type:
        | "login"
        | "commission_rate_change"
        | "status_change"
        | "payout_profile_created"
        | "payout_profile_change"
        | "settlement_paid"
      partner_payout_method: "bank" | "crypto"
      partner_payment_status: "paid" | "refunded" | "chargeback"
      partner_settlement_status: "unpaid" | "processing" | "paid"
      partner_tier: "master" | "hq" | "distributor" | "store"
      partner_type: "referral" | "agency" | "agent"
      position_status: "active" | "closed"
      sig_event:
        | "SIGNAL_OPEN"
        | "SIGNAL_UPDATE"
        | "SIGNAL_CLOSE"
        | "POSITION_UPDATE"
        | "POSITION_CLOSE"
        | "SIGNAL_MISSED"
      signal_direction: "long" | "short" | "LONG" | "SHORT"
      signal_status: "OPEN" | "CLOSED"
      trend_axis: "IN_TREND" | "COUNTER_TREND"
      trend_axis_type: "IN_TREND" | "COUNTER_TREND"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  trend_scanner: {
    Tables: {
      bars_1m: {
        Row: {
          close: number
          high: number
          inserted_at: string
          low: number
          open: number
          source: string
          symbol: string
          ts_ms: number
          ts_utc: string
          volume: number
        }
        Insert: {
          close: number
          high: number
          inserted_at?: string
          low: number
          open: number
          source?: string
          symbol: string
          ts_ms: number
          ts_utc: string
          volume: number
        }
        Update: {
          close?: number
          high?: number
          inserted_at?: string
          low?: number
          open?: number
          source?: string
          symbol?: string
          ts_ms?: number
          ts_utc?: string
          volume?: number
        }
        Relationships: []
      }
      strategy_indicators_3m: {
        Row: {
          anchor_price: number | null
          calc_at: string
          calc_version: string
          indicator_source: string
          long_high: number | null
          long_low: number | null
          long_trend: string
          price_now: number | null
          short_high: number | null
          short_low: number | null
          short_trend: string
          signal_active: boolean
          signal_at: string | null
          spike_down_line: number | null
          spike_up_line: number | null
          symbol: string
          ts_ms: number
          ts_utc: string | null
        }
        Insert: {
          anchor_price?: number | null
          calc_at?: string
          calc_version?: string
          indicator_source?: string
          long_high?: number | null
          long_low?: number | null
          long_trend?: string
          price_now?: number | null
          short_high?: number | null
          short_low?: number | null
          short_trend?: string
          signal_active?: boolean
          signal_at?: string | null
          spike_down_line?: number | null
          spike_up_line?: number | null
          symbol: string
          ts_ms: number
          ts_utc?: string | null
        }
        Update: {
          anchor_price?: number | null
          calc_at?: string
          calc_version?: string
          indicator_source?: string
          long_high?: number | null
          long_low?: number | null
          long_trend?: string
          price_now?: number | null
          short_high?: number | null
          short_low?: number | null
          short_trend?: string
          signal_active?: boolean
          signal_at?: string | null
          spike_down_line?: number | null
          spike_up_line?: number | null
          symbol?: string
          ts_ms?: number
          ts_utc?: string | null
        }
        Relationships: []
      }
      universe_top30: {
        Row: {
          quote_volume_usdt: number | null
          rank: number
          symbol: string
          updated_at: string
        }
        Insert: {
          quote_volume_usdt?: number | null
          rank: number
          symbol: string
          updated_at?: string
        }
        Update: {
          quote_volume_usdt?: number | null
          rank?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      board_rows_latest: {
        Row: {
          anchor_price: number | null
          basis_match_pct: number
          basis_match_side: string
          basis_pressure_score: number
          basis_trend_strength_gauge: number
          calc_at: string
          calc_version: string
          direction_match_score: number
          indicator_source: string
          long_high: number | null
          long_low: number | null
          long_trend: string
          price_now: number | null
          rank_score: number
          short_high: number | null
          short_low: number | null
          short_trend: string
          signal_active: boolean
          signal_at: string | null
          spike_down_line: number | null
          spike_up_line: number | null
          symbol: string
          ts_ms: number
          ts_utc: string | null
        }
        Relationships: []
      }
      v_bars_3m_complete: {
        Row: {
          close: number
          high: number
          low: number
          open: number
          symbol: string
          ts_ms: number
          ts_utc: string
          volume: number
        }
        Relationships: []
      }
      v_bars_3m_with_count: {
        Row: {
          bar_count: number
          close: number
          high: number
          low: number
          open: number
          symbol: string
          ts_ms_3m: number
          ts_utc_3m: string
          volume: number
        }
        Relationships: []
      }
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
      app_role: ["admin", "settlement_admin", "member_management", "read_only", "user"],
      flow_label: ["TREND", "CT_SHORT", "CT_FULL"],
      flow_type: ["ENTRY_DISCOUNT", "POSITIONING"],
      partner_activity_type: [
        "login",
        "commission_rate_change",
        "status_change",
        "payout_profile_created",
        "payout_profile_change",
        "settlement_paid",
      ],
      partner_payout_method: ["bank", "crypto"],
      partner_payment_status: ["paid", "refunded", "chargeback"],
      partner_settlement_status: ["unpaid", "processing", "paid"],
      partner_tier: ["master", "hq", "distributor", "store"],
      partner_type: ["referral", "agency", "agent"],
      position_status: ["active", "closed"],
      sig_event: [
        "SIGNAL_OPEN",
        "SIGNAL_UPDATE",
        "SIGNAL_CLOSE",
        "POSITION_UPDATE",
        "POSITION_CLOSE",
        "SIGNAL_MISSED",
      ],
      signal_direction: ["long", "short", "LONG", "SHORT"],
      signal_status: ["OPEN", "CLOSED"],
      trend_axis: ["IN_TREND", "COUNTER_TREND"],
      trend_axis_type: ["IN_TREND", "COUNTER_TREND"],
    },
  },
} as const
