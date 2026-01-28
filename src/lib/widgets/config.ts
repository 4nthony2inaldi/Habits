import { Smile, Heart, Zap, TrendingUp, MapPin, Grid, Beer, Footprints, Calendar } from 'lucide-react'

export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  static?: boolean
  isDraggable?: boolean
  isResizable?: boolean
}

export type WidgetType =
  | 'mood-score'
  | 'health-score'
  | 'busy-score'
  | 'mood-chart'
  | 'work-location'
  | 'habits-grid'
  | 'alcohol-tracker'
  | 'movement-chart'
  | 'events-tracker'

export interface WidgetConfig {
  id: WidgetType
  name: string
  description: string
  icon: typeof Smile
  minW: number
  minH: number
  defaultW: number
  defaultH: number
  maxW?: number
  maxH?: number
}

export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  'mood-score': {
    id: 'mood-score',
    name: 'Mood Score',
    description: 'Average mood score with trend indicator',
    icon: Smile,
    minW: 1,
    minH: 1,
    defaultW: 1,
    defaultH: 1,
  },
  'health-score': {
    id: 'health-score',
    name: 'Health Score',
    description: 'Habit completion percentage',
    icon: Heart,
    minW: 1,
    minH: 1,
    defaultW: 1,
    defaultH: 1,
  },
  'busy-score': {
    id: 'busy-score',
    name: 'Busy Score',
    description: 'Activity level indicator',
    icon: Zap,
    minW: 1,
    minH: 1,
    defaultW: 1,
    defaultH: 1,
  },
  'mood-chart': {
    id: 'mood-chart',
    name: 'Mood Trend',
    description: 'Line chart showing mood over time',
    icon: TrendingUp,
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 2,
  },
  'work-location': {
    id: 'work-location',
    name: 'Work Location',
    description: 'Pie chart of work locations',
    icon: MapPin,
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
  },
  'habits-grid': {
    id: 'habits-grid',
    name: 'Healthy Habits',
    description: 'Grid showing habit completion',
    icon: Grid,
    minW: 3,
    minH: 2,
    defaultW: 6,
    defaultH: 2,
  },
  'alcohol-tracker': {
    id: 'alcohol-tracker',
    name: 'Alcohol Tracking',
    description: 'Charts tracking alcohol consumption',
    icon: Beer,
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
  },
  'movement-chart': {
    id: 'movement-chart',
    name: 'Movement',
    description: 'Step count and activity chart',
    icon: Footprints,
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
  },
  'events-tracker': {
    id: 'events-tracker',
    name: 'Life Events',
    description: 'Days since life events tracker',
    icon: Calendar,
    minW: 2,
    minH: 2,
    defaultW: 6,
    defaultH: 2,
  },
}

export interface WidgetLayoutItem extends LayoutItem {
  i: WidgetType
}

export interface DashboardLayout {
  widgets: WidgetLayoutItem[]
  version: number
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: 1,
  widgets: [
    { i: 'mood-score', x: 0, y: 0, w: 2, h: 1, minW: 1, minH: 1 },
    { i: 'health-score', x: 2, y: 0, w: 2, h: 1, minW: 1, minH: 1 },
    { i: 'busy-score', x: 4, y: 0, w: 2, h: 1, minW: 1, minH: 1 },
    { i: 'mood-chart', x: 0, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'work-location', x: 3, y: 1, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'habits-grid', x: 0, y: 3, w: 6, h: 2, minW: 3, minH: 2 },
    { i: 'alcohol-tracker', x: 0, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'movement-chart', x: 3, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'events-tracker', x: 0, y: 8, w: 6, h: 2, minW: 2, minH: 2 },
  ],
}

export const GRID_COLS = 6
export const GRID_ROW_HEIGHT = 120
export const GRID_MARGIN: [number, number] = [16, 16]

export const STORAGE_KEY = 'dashboard-layout'
