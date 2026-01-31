export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type HabitType =
  | 'sleep_8hrs'
  | 'breakfast'
  | 'vitamin'
  | 'water_8cups'
  | 'cooked_dinner'
  | 'exercise'
  | 'read_5pages'
  | 'family_interaction'
  | 'family_phone'
  | 'family_in_person'
  | 'ate_fruit'
  | 'ate_vegetables'
  | 'journaled'

export type EventType =
  | 'pto'
  | 'flight'
  | 'train'
  | 'haircut'
  | 'doctor'
  | 'dentist'
  | 'played_sport'
  | 'attended_sport'
  | 'concert'
  | 'stage_production'
  | 'movies'
  | 'museum'
  | 'guys_night'
  | 'massage'
  | 'facial'
  | 'pedicure'
  | 'manicure'
  | 'other_selfcare'
  | 'diner'
  | 'ice_cream'
  | 'park'
  | 'subway'
  | 'bus'

export type WorkLocation = 'home' | 'office' | 'field' | 'off'

export type MealLocation = 'home' | 'out'

export type GoalTargetType = 'min' | 'max' | 'exact' | 'streak'

export type GoalTimeframe = 'daily' | 'weekly' | 'monthly'

export type NotificationChannel = 'email' | 'push' | 'both'

export type NotificationType =
  | 'daily_reminder'
  | 'streak_warning'
  | 'admin_nudge'
  | 'weekly_digest'
  | 'behind_nudge'

// Report configuration types
export type ReportMetric =
  | 'total_drinks'
  | 'beers'
  | 'seltzers'
  | 'wine'
  | 'liquor'
  | 'shots'
  | 'mood_score'
  | 'steps'
  | 'coffee'
  | 'screen_time'
  | 'sex'
  | 'healthy_habits_count'
  | 'life_events_count'
  | 'sober_days'
  | 'drinking_days'
  | 'meals_out'
  | 'miles_traveled'
  // Individual habits
  | 'habit_sleep_8hrs'
  | 'habit_breakfast'
  | 'habit_vitamin'
  | 'habit_water_8cups'
  | 'habit_cooked_dinner'
  | 'habit_exercise'
  | 'habit_read_5pages'
  | 'habit_family_interaction'
  | 'habit_family_phone'
  | 'habit_family_in_person'
  | 'habit_ate_fruit'
  | 'habit_ate_vegetables'
  | 'habit_journaled'
  // Individual events
  | 'event_pto'
  | 'event_flight'
  | 'event_train'
  | 'event_haircut'
  | 'event_doctor'
  | 'event_dentist'
  | 'event_played_sport'
  | 'event_attended_sport'
  | 'event_concert'
  | 'event_stage_production'
  | 'event_movies'
  | 'event_museum'
  | 'event_guys_night'
  | 'event_massage'
  | 'event_facial'
  | 'event_pedicure'
  | 'event_manicure'
  | 'event_other_selfcare'
  | 'event_diner'
  | 'event_ice_cream'
  | 'event_park'
  | 'event_subway'
  | 'event_bus'
  // Weather metrics
  | 'weather_temperature_high'
  | 'weather_temperature_low'
  | 'weather_humidity'
  | 'weather_precipitation'

export type ReportAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'cumulative' | 'percent'

export type ReportDimension = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'day_of_week' | 'day_of_month' | 'week_of_year' | 'month_of_year' | 'habit' | 'event' | 'work_location'

export type ReportChartType = 'kpi' | 'bar' | 'stacked_bar' | 'grouped_bar' | 'line' | 'area' | 'pie' | 'table'

export type DatePresetType = 'last30' | 'last90' | 'thisYear' | 'lastYear' | 'allTime' | 'custom'

export type ComparisonType = 'none' | 'previous_period' | 'previous_year'

export interface ReportConfig {
  metric: ReportMetric // Primary metric (for backwards compatibility)
  metrics?: ReportMetric[] // Multiple metrics for line/area/table charts
  aggregation: ReportAggregation
  dimension: ReportDimension
  secondaryDimension?: ReportDimension | null // Split into series by this dimension (e.g., drinks by month, split by year)
  chartType: ReportChartType
  datePreset: DatePresetType
  customStartDate?: string
  customEndDate?: string
  comparison: ComparisonType
  dualAxis?: boolean // Use left/right Y axes for metrics with different scales
  // Optional breakdown by habit/event
  breakdownBy?: 'habit' | 'event' | null
  // Filter settings (similar to history page)
  filters?: {
    habits?: string[]
    events?: string[]
    workLocation?: string
    drinkFilter?: string
    moodMin?: number
    moodMax?: number
  }
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          email: string | null
          home_city: string | null
          home_lat: number | null
          home_lng: number | null
          created_at: string
          is_admin: boolean
          share_drinks: boolean
          share_steps: boolean
          leaderboard_anonymous: boolean
          hidden_fields: string[]
          custom_habits: Json[]
          custom_metrics: Json[]
          reminder_enabled: boolean
          reminder_time: string
          streak_warnings_enabled: boolean
          weekly_digest_enabled: boolean
          weekly_digest_day: number
          allow_admin_nudges: boolean
          notification_channel: NotificationChannel
          temperature_unit: 'fahrenheit' | 'celsius'
        }
        Insert: {
          id: string
          display_name: string
          email?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          created_at?: string
          is_admin?: boolean
          share_drinks?: boolean
          share_steps?: boolean
          leaderboard_anonymous?: boolean
          hidden_fields?: string[]
          custom_habits?: Json[]
          custom_metrics?: Json[]
          reminder_enabled?: boolean
          reminder_time?: string
          streak_warnings_enabled?: boolean
          weekly_digest_enabled?: boolean
          weekly_digest_day?: number
          allow_admin_nudges?: boolean
          notification_channel?: NotificationChannel
          temperature_unit?: 'fahrenheit' | 'celsius'
        }
        Update: {
          id?: string
          display_name?: string
          email?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          created_at?: string
          is_admin?: boolean
          share_drinks?: boolean
          share_steps?: boolean
          leaderboard_anonymous?: boolean
          hidden_fields?: string[]
          custom_habits?: Json[]
          custom_metrics?: Json[]
          reminder_enabled?: boolean
          reminder_time?: string
          streak_warnings_enabled?: boolean
          weekly_digest_enabled?: boolean
          weekly_digest_day?: number
          allow_admin_nudges?: boolean
          notification_channel?: NotificationChannel
          temperature_unit?: 'fahrenheit' | 'celsius'
        }
      }
      daily_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          mood_score: number | null
          work_location: WorkLocation | null
          beers: number
          seltzers: number
          wine: number
          liquor: number
          shots: number
          // Detailed wine breakdown
          wine_red: number
          wine_white: number
          wine_sparkling: number
          // Detailed cocktail/liquor breakdown
          liquor_vodka: number
          liquor_gin: number
          liquor_tequila: number
          liquor_whiskey: number
          liquor_rum: number
          liquor_other: number
          // Other metrics
          coffee: number
          steps: number | null
          screen_time: number | null
          sex: number
          // Meal tracking
          breakfast_location: MealLocation | null
          lunch_location: MealLocation | null
          dinner_location: MealLocation | null
          city_wake: string | null
          city_wake_lat: number | null
          city_wake_lng: number | null
          miles_wake: number | null
          city_noon: string | null
          city_noon_lat: number | null
          city_noon_lng: number | null
          miles_noon: number | null
          city_sleep: string | null
          city_sleep_lat: number | null
          city_sleep_lng: number | null
          miles_sleep: number | null
          // Weather tracking
          weather_temperature_high: number | null
          weather_temperature_low: number | null
          weather_conditions: string | null
          weather_humidity: number | null
          weather_precipitation: number | null
          weather_location: string | null
          best_part: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date: string
          mood_score?: number | null
          work_location?: WorkLocation | null
          beers?: number
          seltzers?: number
          wine?: number
          liquor?: number
          shots?: number
          // Detailed wine breakdown
          wine_red?: number
          wine_white?: number
          wine_sparkling?: number
          // Detailed cocktail/liquor breakdown
          liquor_vodka?: number
          liquor_gin?: number
          liquor_tequila?: number
          liquor_whiskey?: number
          liquor_rum?: number
          liquor_other?: number
          // Other metrics
          coffee?: number
          steps?: number | null
          screen_time?: number | null
          sex?: number
          // Meal tracking
          breakfast_location?: MealLocation | null
          lunch_location?: MealLocation | null
          dinner_location?: MealLocation | null
          city_wake?: string | null
          city_wake_lat?: number | null
          city_wake_lng?: number | null
          miles_wake?: number | null
          city_noon?: string | null
          city_noon_lat?: number | null
          city_noon_lng?: number | null
          miles_noon?: number | null
          city_sleep?: string | null
          city_sleep_lat?: number | null
          city_sleep_lng?: number | null
          miles_sleep?: number | null
          // Weather tracking
          weather_temperature_high?: number | null
          weather_temperature_low?: number | null
          weather_conditions?: string | null
          weather_humidity?: number | null
          weather_precipitation?: number | null
          weather_location?: string | null
          best_part?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          mood_score?: number | null
          work_location?: WorkLocation | null
          beers?: number
          seltzers?: number
          wine?: number
          liquor?: number
          shots?: number
          // Detailed wine breakdown
          wine_red?: number
          wine_white?: number
          wine_sparkling?: number
          // Detailed cocktail/liquor breakdown
          liquor_vodka?: number
          liquor_gin?: number
          liquor_tequila?: number
          liquor_whiskey?: number
          liquor_rum?: number
          liquor_other?: number
          // Other metrics
          coffee?: number
          steps?: number | null
          screen_time?: number | null
          sex?: number
          // Meal tracking
          breakfast_location?: MealLocation | null
          lunch_location?: MealLocation | null
          dinner_location?: MealLocation | null
          city_wake?: string | null
          city_wake_lat?: number | null
          city_wake_lng?: number | null
          miles_wake?: number | null
          city_noon?: string | null
          city_noon_lat?: number | null
          city_noon_lng?: number | null
          miles_noon?: number | null
          city_sleep?: string | null
          city_sleep_lat?: number | null
          city_sleep_lng?: number | null
          miles_sleep?: number | null
          // Weather tracking
          weather_temperature_high?: number | null
          weather_temperature_low?: number | null
          weather_conditions?: string | null
          weather_humidity?: number | null
          weather_precipitation?: number | null
          weather_location?: string | null
          best_part?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      healthy_habits: {
        Row: {
          id: string
          entry_id: string
          habit_type: HabitType
        }
        Insert: {
          id?: string
          entry_id: string
          habit_type: HabitType
        }
        Update: {
          id?: string
          entry_id?: string
          habit_type?: HabitType
        }
      }
      life_events: {
        Row: {
          id: string
          entry_id: string
          event_type: EventType
        }
        Insert: {
          id?: string
          entry_id: string
          event_type: EventType
        }
        Update: {
          id?: string
          entry_id?: string
          event_type?: EventType
        }
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          metric: string
          target_type: GoalTargetType
          target_value: number
          timeframe: GoalTimeframe
          active: boolean
          created_at: string
          started_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          metric: string
          target_type: GoalTargetType
          target_value: number
          timeframe: GoalTimeframe
          active?: boolean
          created_at?: string
          started_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          metric?: string
          target_type?: GoalTargetType
          target_value?: number
          timeframe?: GoalTimeframe
          active?: boolean
          created_at?: string
          started_at?: string
          archived_at?: string | null
        }
      }
      goal_snapshots: {
        Row: {
          id: string
          goal_id: string
          period_start: string
          period_end: string
          actual_value: number
          target_value: number
          met: boolean
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          period_start: string
          period_end: string
          actual_value: number
          target_value: number
          met: boolean
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          period_start?: string
          period_end?: string
          actual_value?: number
          target_value?: number
          met?: boolean
          created_at?: string
        }
      }
      notification_log: {
        Row: {
          id: string
          user_id: string
          notification_type: NotificationType
          sent_at: string
          channel: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: NotificationType
          sent_at?: string
          channel: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: NotificationType
          sent_at?: string
          channel?: string
          metadata?: Json | null
        }
      }
      saved_reports: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          config: ReportConfig
          show_on_dashboard: boolean
          dashboard_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          config: ReportConfig
          show_on_dashboard?: boolean
          dashboard_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          config?: ReportConfig
          show_on_dashboard?: boolean
          dashboard_order?: number | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type DailyEntry = Database['public']['Tables']['daily_entries']['Row']
export type DailyEntryInsert = Database['public']['Tables']['daily_entries']['Insert']
export type DailyEntryUpdate = Database['public']['Tables']['daily_entries']['Update']

export type HealthyHabit = Database['public']['Tables']['healthy_habits']['Row']
export type LifeEvent = Database['public']['Tables']['life_events']['Row']

export type UserGoal = Database['public']['Tables']['user_goals']['Row']
export type GoalSnapshot = Database['public']['Tables']['goal_snapshots']['Row']

export type SavedReport = Database['public']['Tables']['saved_reports']['Row']
export type SavedReportInsert = Database['public']['Tables']['saved_reports']['Insert']
export type SavedReportUpdate = Database['public']['Tables']['saved_reports']['Update']

// Extended types for API responses
export type DailyEntryWithRelations = DailyEntry & {
  healthy_habits: HealthyHabit[]
  life_events: LifeEvent[]
}
