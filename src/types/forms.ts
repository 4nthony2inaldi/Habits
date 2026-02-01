import { z } from 'zod'
import type { HabitType, EventType, WorkLocation, MealLocation, GoalTargetType, GoalTimeframe } from './database'

// Habit and Event type arrays for validation
export const habitTypes: HabitType[] = [
  'sleep_8hrs',
  'breakfast',
  'vitamin',
  'water_8cups',
  'cooked_dinner',
  'exercise',
  'read_5pages',
  'family_interaction',
  'family_phone',
  'family_in_person',
  'ate_fruit',
  'ate_vegetables',
  'journaled',
]

export const eventTypes: EventType[] = [
  'pto',
  'flight',
  'train',
  'haircut',
  'doctor',
  'dentist',
  'played_sport',
  'attended_sport',
  'concert',
  'stage_production',
  'movies',
  'museum',
  'guys_night',
  'massage',
  'facial',
  'pedicure',
  'manicure',
  'other_selfcare',
  'diner',
  'ice_cream',
  'park',
  'subway',
  'bus',
]

export const workLocations: WorkLocation[] = ['home', 'office', 'field', 'off']

// Labels for UI
export const habitLabels: Record<HabitType, string> = {
  sleep_8hrs: '8+ hours of sleep',
  breakfast: 'Had something for breakfast',
  vitamin: 'Took a vitamin',
  water_8cups: '8+ cups of water',
  cooked_dinner: 'Cooked dinner',
  exercise: 'Went out of your way to exercise',
  read_5pages: 'Read 5+ pages of literature',
  family_interaction: 'Interact with family member (voice/in-person)',
  family_phone: 'Family (phone)',
  family_in_person: 'Family (in-person)',
  ate_fruit: 'Ate fruit (fresh/raw/steamed)',
  ate_vegetables: 'Ate vegetables (fresh/raw/steamed)',
  journaled: 'Journaled offline',
}

export const eventLabels: Record<EventType, string> = {
  pto: 'Took PTO',
  flight: 'Took a flight',
  train: 'Took a train',
  haircut: 'Haircut',
  doctor: 'Doctor visit',
  dentist: 'Dentist visit',
  played_sport: 'Played a sport',
  attended_sport: 'Attended a sporting event',
  concert: 'Went to a concert',
  stage_production: 'Went to a stage production',
  movies: 'Went to the movies',
  museum: 'Went to a museum',
  guys_night: 'Saw Friends',
  massage: 'Massage',
  facial: 'Facial',
  pedicure: 'Pedicure',
  manicure: 'Manicure',
  other_selfcare: 'Other self-care',
  diner: 'Went to a diner',
  ice_cream: 'Ate ice cream',
  park: 'Spent time in a park',
  subway: 'Took the subway',
  bus: 'Took a bus',
}

// All trackable field IDs (habits + events combined for grouping purposes)
export const allTrackableFields = [...habitTypes, ...eventTypes] as const
export type TrackableField = typeof allTrackableFields[number]

// All field labels combined
export const allFieldLabels: Record<TrackableField, string> = {
  ...habitLabels,
  ...eventLabels,
}

// Custom grouping types
export type FieldGrouping = {
  id: string
  name: string
  fields: TrackableField[]
  color: 'green' | 'purple' | 'blue' | 'orange' | 'pink'
}

export type FieldGroupings = FieldGrouping[]

// Default groupings
export const defaultFieldGroupings: FieldGroupings = [
  {
    id: 'healthy-habits',
    name: 'Healthy Habits',
    color: 'green',
    fields: [
      'sleep_8hrs',
      'breakfast',
      'vitamin',
      'water_8cups',
      'cooked_dinner',
      'exercise',
      'read_5pages',
      'family_interaction',
      'family_phone',
      'family_in_person',
      'ate_fruit',
      'ate_vegetables',
      'journaled',
    ],
  },
  {
    id: 'events',
    name: 'Events',
    color: 'purple',
    fields: [
      'pto',
      'flight',
      'train',
      'subway',
      'bus',
      'played_sport',
      'attended_sport',
      'concert',
      'stage_production',
      'movies',
      'museum',
      'guys_night',
      'diner',
      'ice_cream',
      'park',
    ],
  },
  {
    id: 'self-care',
    name: 'Self-care',
    color: 'pink',
    fields: [
      'haircut',
      'doctor',
      'dentist',
      'massage',
      'facial',
      'pedicure',
      'manicure',
      'other_selfcare',
    ],
  },
]

// Helper to get a label for any trackable field
export function getFieldLabel(field: TrackableField): string {
  return allFieldLabels[field] || field
}

export const workLocationLabels: Record<WorkLocation, string> = {
  home: 'From home',
  office: 'In office',
  field: 'In the field',
  off: "Didn't work",
}

export const mealLocationLabels: Record<MealLocation, string> = {
  home: 'At home',
  out: 'Ate out',
}

// Daily Entry Form Schema
export const dailyEntrySchema = z.object({
  entry_date: z.string().refine((date) => {
    const entryDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return entryDate < today
  }, 'Entry date must be before today'),

  mood_score: z.number().min(0).max(10).nullable(),
  work_location: z.enum(['home', 'office', 'field', 'off']).nullable(),

  // Alcohol tracking (aggregate fields)
  beers: z.number().min(0).default(0),
  seltzers: z.number().min(0).default(0),
  wine: z.number().min(0).default(0),
  liquor: z.number().min(0).default(0),
  shots: z.number().min(0).default(0),

  // Detailed wine breakdown
  wine_red: z.number().min(0).default(0),
  wine_white: z.number().min(0).default(0),
  wine_sparkling: z.number().min(0).default(0),

  // Detailed cocktail/liquor breakdown
  liquor_vodka: z.number().min(0).default(0),
  liquor_gin: z.number().min(0).default(0),
  liquor_tequila: z.number().min(0).default(0),
  liquor_whiskey: z.number().min(0).default(0),
  liquor_rum: z.number().min(0).default(0),
  liquor_other: z.number().min(0).default(0),

  // Other metrics
  coffee: z.number().min(0).max(5).default(0),
  steps: z.number().min(0).nullable(),
  sleep_hours: z.number().min(0).max(24).nullable(),
  miles_walked: z.number().min(0).nullable(),
  // Individual sleep stages (in minutes, from Apple Health)
  sleep_in_bed_minutes: z.number().min(0).max(1440).nullable(),
  sleep_awake_minutes: z.number().min(0).max(1440).nullable(),
  sleep_rem_minutes: z.number().min(0).max(1440).nullable(),
  sleep_core_minutes: z.number().min(0).max(1440).nullable(),
  sleep_deep_minutes: z.number().min(0).max(1440).nullable(),
  screen_time: z.number().min(0).nullable(),
  sex: z.number().min(0).max(10).default(0),

  // Meal tracking
  breakfast_location: z.enum(['home', 'out']).nullable(),
  lunch_location: z.enum(['home', 'out']).nullable(),
  dinner_location: z.enum(['home', 'out']).nullable(),

  // Location tracking
  city_wake: z.string().nullable(),
  city_wake_lat: z.number().nullable().optional(),
  city_wake_lng: z.number().nullable().optional(),
  miles_wake: z.number().nullable(),
  city_noon: z.string().nullable(),
  city_noon_lat: z.number().nullable().optional(),
  city_noon_lng: z.number().nullable().optional(),
  miles_noon: z.number().nullable(),
  city_sleep: z.string().nullable(),
  city_sleep_lat: z.number().nullable().optional(),
  city_sleep_lng: z.number().nullable().optional(),
  miles_sleep: z.number().nullable(),

  // Weather data (auto-populated)
  weather_temperature_high: z.number().nullable().optional(),
  weather_temperature_low: z.number().nullable().optional(),
  weather_conditions: z.string().nullable().optional(),
  weather_humidity: z.number().nullable().optional(),
  weather_precipitation: z.number().nullable().optional(),
  weather_location: z.string().nullable().optional(),

  // Qualitative
  best_part: z.string().nullable(),
  notes: z.string().nullable(),

  // Checklists
  healthy_habits: z.array(z.enum([
    'sleep_8hrs', 'breakfast', 'vitamin', 'water_8cups', 'cooked_dinner',
    'exercise', 'read_5pages', 'family_interaction', 'family_phone',
    'family_in_person', 'ate_fruit', 'ate_vegetables', 'journaled'
  ])).default([]),

  life_events: z.array(z.enum([
    'pto', 'flight', 'train', 'haircut', 'doctor', 'dentist',
    'played_sport', 'attended_sport', 'concert', 'stage_production',
    'movies', 'museum', 'guys_night', 'massage', 'facial',
    'pedicure', 'manicure', 'other_selfcare', 'diner', 'ice_cream',
    'park', 'subway', 'bus'
  ])).default([]),
})

export type DailyEntryFormData = z.infer<typeof dailyEntrySchema>

// Goal Form Schema
export const goalSchema = z.object({
  metric: z.string().min(1, 'Metric is required'),
  target_type: z.enum(['min', 'max', 'exact', 'streak'] as const),
  target_value: z.number().min(0, 'Target value must be positive'),
  timeframe: z.enum(['daily', 'weekly', 'monthly'] as const),
})

export type GoalFormData = z.infer<typeof goalSchema>

// Profile Settings Schema
export const profileSettingsSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  home_city: z.string().nullable(),
  share_drinks: z.boolean(),
  share_steps: z.boolean(),
  leaderboard_anonymous: z.boolean(),
  hidden_fields: z.array(z.string()),
})

export type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>

// Notification Settings Schema
export const notificationSettingsSchema = z.object({
  reminder_enabled: z.boolean(),
  reminder_time: z.string(),
  streak_warnings_enabled: z.boolean(),
  weekly_digest_enabled: z.boolean(),
  weekly_digest_day: z.number().min(0).max(6),
  allow_admin_nudges: z.boolean(),
  notification_channel: z.enum(['email', 'push', 'both']),
})

export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>

// Goal metric options
export const goalMetricOptions: { value: string; label: string; category: string }[] = [
  { value: 'exercise', label: 'Exercise sessions', category: 'Habits' },
  { value: 'sleep_8hrs', label: '8+ hours of sleep', category: 'Habits' },
  { value: 'vitamin', label: 'Take vitamin', category: 'Habits' },
  { value: 'read_5pages', label: 'Read 5+ pages', category: 'Habits' },
  { value: 'water_8cups', label: '8+ cups of water', category: 'Habits' },
  { value: 'breakfast', label: 'Eat breakfast', category: 'Habits' },
  { value: 'total_drinks', label: 'Total drinks', category: 'Alcohol' },
  { value: 'sober_days', label: 'Sober days', category: 'Alcohol' },
  { value: 'mood_avg', label: 'Average mood', category: 'Wellness' },
  { value: 'steps_avg', label: 'Average steps', category: 'Activity' },
  { value: 'events_attended', label: 'Events attended', category: 'Activity' },
]
