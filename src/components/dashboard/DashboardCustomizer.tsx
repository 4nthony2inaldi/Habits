'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { Settings2, X, Check, Loader2, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import type { Profile, HabitType, EventType } from '@/types/database'
import { habitLabels, eventLabels } from '@/types/forms'

// Computed habits that are calculated from entry data
export type ComputedHabitType = 'no_alcohol' | 'was_active' | 'breakfast_at_home' | 'lunch_at_home' | 'dinner_at_home'

// All selectable habits (regular + computed)
export type SelectableHabitType = HabitType | ComputedHabitType

export const computedHabitLabels: Record<ComputedHabitType, string> = {
  no_alcohol: "Didn't drink",
  was_active: 'Was active (7.5k+ steps)',
  breakfast_at_home: 'Breakfast at home',
  lunch_at_home: 'Lunch at home',
  dinner_at_home: 'Dinner at home',
}

// Short labels for mobile display
export const shortHabitLabels: Record<SelectableHabitType, string> = {
  sleep_8hrs: 'Sleep',
  breakfast: 'Breakfast',
  vitamin: 'Vitamin',
  water_8cups: 'Water',
  cooked_dinner: 'Cooked',
  exercise: 'Exercise',
  read_5pages: 'Read',
  family_interaction: 'Family',
  family_phone: 'Family (ph)',
  family_in_person: 'Family (ip)',
  ate_fruit: 'Fruit',
  ate_vegetables: 'Veggies',
  journaled: 'Journal',
  no_alcohol: 'Sober',
  was_active: 'Active',
  breakfast_at_home: 'Brkfst Home',
  lunch_at_home: 'Lunch Home',
  dinner_at_home: 'Dinner Home',
}

// Combined labels for all selectable habits
export const allHabitLabels: Record<SelectableHabitType, string> = {
  ...habitLabels,
  ...computedHabitLabels,
}

export interface WidgetSettings {
  visible: boolean
}

export interface GridLayoutItem {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface GridLayouts {
  lg: Record<WidgetKey, GridLayoutItem>
  md: Record<WidgetKey, GridLayoutItem>
  sm: Record<WidgetKey, GridLayoutItem>
}

export interface KpiVisibility {
  happyKpi: boolean
  healthyKpi: boolean
  busyKpi: boolean
}

// Alcohol stats metrics
export type AlcoholMetricType =
  | 'avgWeekly'
  | 'totalDrinks'
  | 'beers'
  | 'seltzers'
  | 'wine'
  | 'liquor'
  | 'shots'
  | 'daysWithDrink'
  | 'daysWith2Plus'
  | 'daysWith6Plus'

export const alcoholMetricLabels: Record<AlcoholMetricType, string> = {
  avgWeekly: 'Avg. Weekly',
  totalDrinks: 'Total Drinks',
  beers: 'Beers',
  seltzers: 'Seltzers',
  wine: 'Wine',
  liquor: 'Liquor',
  shots: 'Shots',
  daysWithDrink: 'Days w/ Drink',
  daysWith2Plus: 'Days 2+',
  daysWith6Plus: 'Days w/ 6+',
}

const allAlcoholMetrics = Object.keys(alcoholMetricLabels) as AlcoholMetricType[]

// Widget title configuration
export interface WidgetTitleConfig {
  title: string
  subtitle?: string
}

export type WidgetTitles = Record<WidgetKey, WidgetTitleConfig>

export interface DashboardWidgetConfig {
  moodChart: WidgetSettings
  workLocationChart: WidgetSettings
  habitsGrid: WidgetSettings
  habitsScore: WidgetSettings
  busyTrend: WidgetSettings
  alcoholTracker: WidgetSettings
  alcoholCalendar: WidgetSettings
  alcoholStats: WidgetSettings
  alcoholByType: WidgetSettings
  drinksYearOverYear: WidgetSettings
  stepsYearOverYear: WidgetSettings
  movementChart: WidgetSettings
  eventsTracker: WidgetSettings
  travelWidget: WidgetSettings
  selectedHabits: SelectableHabitType[]
  selectedEvents: EventType[]
  selectedAlcoholMetrics: AlcoholMetricType[]
  kpiVisibility: KpiVisibility
  gridLayouts: GridLayouts
  widgetTitles: WidgetTitles
}

export type WidgetKey = keyof Omit<DashboardWidgetConfig, 'selectedHabits' | 'selectedEvents' | 'selectedAlcoholMetrics' | 'kpiVisibility' | 'gridLayouts' | 'widgetTitles'>
export type KpiKey = keyof KpiVisibility

const allHabits = Object.keys(allHabitLabels) as SelectableHabitType[]
const allEvents = Object.keys(eventLabels) as EventType[]

const defaultKpiVisibility: KpiVisibility = {
  happyKpi: true,
  healthyKpi: true,
  busyKpi: true,
}

// Default widget titles
export const defaultWidgetTitles: WidgetTitles = {
  moodChart: { title: 'Mood Over Time' },
  workLocationChart: { title: 'Work Location' },
  habitsGrid: { title: 'Healthy Habits' },
  habitsScore: { title: 'Habits Score' },
  busyTrend: { title: 'Busy' },
  alcoholTracker: { title: 'Drinking Trends' },
  alcoholCalendar: { title: 'When Drinking' },
  alcoholStats: { title: 'How Much Drinking' },
  alcoholByType: { title: 'What Drinking' },
  drinksYearOverYear: { title: 'Drinks Year over Year' },
  stepsYearOverYear: { title: 'Steps Year over Year' },
  movementChart: { title: 'Movement' },
  eventsTracker: { title: 'Life Events' },
  travelWidget: { title: 'Travel' },
}

// Default grid layouts for different breakpoints (12 column grid)
// No minimum constraints - widgets can be any size the grid allows
export const defaultGridLayouts: GridLayouts = {
  lg: {
    moodChart: { x: 0, y: 0, w: 6, h: 4 },
    workLocationChart: { x: 6, y: 0, w: 6, h: 4 },
    habitsGrid: { x: 0, y: 4, w: 9, h: 5 },
    habitsScore: { x: 9, y: 4, w: 3, h: 5 },
    busyTrend: { x: 9, y: 9, w: 3, h: 5 },
    alcoholTracker: { x: 0, y: 9, w: 6, h: 5 },
    alcoholCalendar: { x: 6, y: 9, w: 3, h: 5 },
    alcoholStats: { x: 0, y: 14, w: 6, h: 6 },
    alcoholByType: { x: 6, y: 14, w: 6, h: 6 },
    drinksYearOverYear: { x: 0, y: 20, w: 12, h: 5 },
    stepsYearOverYear: { x: 0, y: 25, w: 12, h: 5 },
    movementChart: { x: 0, y: 30, w: 6, h: 4 },
    eventsTracker: { x: 6, y: 30, w: 6, h: 6 },
    travelWidget: { x: 0, y: 36, w: 6, h: 6 },
  },
  md: {
    moodChart: { x: 0, y: 0, w: 6, h: 4 },
    workLocationChart: { x: 6, y: 0, w: 6, h: 4 },
    habitsGrid: { x: 0, y: 4, w: 9, h: 5 },
    habitsScore: { x: 9, y: 4, w: 3, h: 5 },
    busyTrend: { x: 9, y: 9, w: 3, h: 5 },
    alcoholTracker: { x: 0, y: 9, w: 6, h: 5 },
    alcoholCalendar: { x: 6, y: 9, w: 3, h: 5 },
    alcoholStats: { x: 0, y: 14, w: 6, h: 6 },
    alcoholByType: { x: 6, y: 14, w: 6, h: 6 },
    drinksYearOverYear: { x: 0, y: 20, w: 12, h: 5 },
    stepsYearOverYear: { x: 0, y: 25, w: 12, h: 5 },
    movementChart: { x: 0, y: 30, w: 6, h: 4 },
    eventsTracker: { x: 6, y: 30, w: 6, h: 6 },
    travelWidget: { x: 0, y: 36, w: 6, h: 6 },
  },
  sm: {
    moodChart: { x: 0, y: 0, w: 12, h: 4 },
    workLocationChart: { x: 0, y: 4, w: 12, h: 4 },
    habitsGrid: { x: 0, y: 8, w: 12, h: 5 },
    habitsScore: { x: 0, y: 13, w: 12, h: 4 },
    busyTrend: { x: 0, y: 17, w: 12, h: 4 },
    alcoholTracker: { x: 0, y: 21, w: 12, h: 5 },
    alcoholCalendar: { x: 0, y: 26, w: 12, h: 5 },
    alcoholStats: { x: 0, y: 31, w: 12, h: 6 },
    alcoholByType: { x: 0, y: 37, w: 12, h: 6 },
    drinksYearOverYear: { x: 0, y: 43, w: 12, h: 5 },
    stepsYearOverYear: { x: 0, y: 48, w: 12, h: 5 },
    movementChart: { x: 0, y: 53, w: 12, h: 4 },
    eventsTracker: { x: 0, y: 57, w: 12, h: 6 },
    travelWidget: { x: 0, y: 63, w: 12, h: 6 },
  },
}

const defaultConfig: DashboardWidgetConfig = {
  moodChart: { visible: true },
  workLocationChart: { visible: true },
  habitsGrid: { visible: true },
  habitsScore: { visible: true },
  busyTrend: { visible: true },
  alcoholTracker: { visible: true },
  alcoholCalendar: { visible: true },
  alcoholStats: { visible: true },
  alcoholByType: { visible: true },
  drinksYearOverYear: { visible: true },
  stepsYearOverYear: { visible: true },
  movementChart: { visible: true },
  eventsTracker: { visible: true },
  travelWidget: { visible: true },
  selectedHabits: allHabits,
  selectedEvents: allEvents,
  selectedAlcoholMetrics: allAlcoholMetrics,
  kpiVisibility: defaultKpiVisibility,
  gridLayouts: defaultGridLayouts,
  widgetTitles: defaultWidgetTitles,
}

const kpiLabels: Record<KpiKey, string> = {
  happyKpi: 'How Happy',
  healthyKpi: 'How Healthy',
  busyKpi: 'How Busy',
}

export const widgetLabels: Record<WidgetKey, string> = {
  moodChart: 'Mood Chart',
  workLocationChart: 'Work Location',
  habitsGrid: 'Habits Grid',
  habitsScore: 'Habits Score',
  busyTrend: 'Busy Trend',
  alcoholTracker: 'Alcohol Tracker',
  alcoholCalendar: 'When Drinking',
  alcoholStats: 'How Much Drinking',
  alcoholByType: 'What Drinking',
  drinksYearOverYear: 'Drinks Year over Year',
  stepsYearOverYear: 'Steps Year over Year',
  movementChart: 'Movement Chart',
  eventsTracker: 'Events Tracker',
  travelWidget: 'Travel Map',
}

interface DashboardCustomizerProps {
  profile: Profile
  config: DashboardWidgetConfig
  onConfigChange: (config: DashboardWidgetConfig) => void
}

export function DashboardCustomizer({
  profile,
  config,
  onConfigChange,
}: DashboardCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)
  const [habitsExpanded, setHabitsExpanded] = useState(false)
  const [eventsExpanded, setEventsExpanded] = useState(false)
  const [alcoholStatsExpanded, setAlcoholStatsExpanded] = useState(false)
  const [titleEditingWidget, setTitleEditingWidget] = useState<WidgetKey | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleWidget = (key: WidgetKey) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }))
  }

  const toggleKpi = (key: KpiKey) => {
    setLocalConfig((prev) => ({
      ...prev,
      kpiVisibility: {
        ...prev.kpiVisibility,
        [key]: !prev.kpiVisibility[key],
      },
    }))
  }

  const toggleHabit = (habit: SelectableHabitType) => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedHabits: prev.selectedHabits.includes(habit)
        ? prev.selectedHabits.filter((h) => h !== habit)
        : [...prev.selectedHabits, habit],
    }))
  }

  const toggleEvent = (event: EventType) => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedEvents: prev.selectedEvents.includes(event)
        ? prev.selectedEvents.filter((e) => e !== event)
        : [...prev.selectedEvents, event],
    }))
  }

  const toggleAlcoholMetric = (metric: AlcoholMetricType) => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedAlcoholMetrics: prev.selectedAlcoholMetrics.includes(metric)
        ? prev.selectedAlcoholMetrics.filter((m) => m !== metric)
        : [...prev.selectedAlcoholMetrics, metric],
    }))
  }

  const updateWidgetTitle = (key: WidgetKey, title: string, subtitle?: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      widgetTitles: {
        ...prev.widgetTitles,
        [key]: { title, subtitle },
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_metrics: localConfig as unknown as Record<string, unknown>,
        })
        .eq('id', profile.id)

      if (error) throw error
      onConfigChange(localConfig)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to save dashboard config:', error)
    }
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config)
  const widgetKeys = Object.keys(widgetLabels) as WidgetKey[]

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Customize</span>
      </Button>

      {isOpen && (
        <div className="fixed left-1/2 -translate-x-1/2 top-24 sm:absolute sm:right-0 sm:left-auto sm:translate-x-0 sm:top-full sm:mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Customize Dashboard</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
            {/* KPI Cards Section */}
            <p className="text-xs text-gray-500 mb-2">Summary Cards</p>
            {(Object.keys(kpiLabels) as KpiKey[]).map((key) => (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50',
                  !localConfig.kpiVisibility[key] && 'opacity-50'
                )}
              >
                <span className="text-sm text-gray-700">{kpiLabels[key]}</span>
                <button
                  type="button"
                  onClick={() => toggleKpi(key)}
                  className={cn(
                    'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
                    localConfig.kpiVisibility[key] ? 'bg-purple-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                      localConfig.kpiVisibility[key] ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            ))}

            {/* Widgets Section */}
            <p className="text-xs text-gray-500 mt-4 mb-2">
              Widgets (drag on dashboard to reposition/resize)
            </p>
            {widgetKeys.map((key) => {
              const isHabits = key === 'habitsGrid'
              const isEvents = key === 'eventsTracker'
              const isAlcoholStats = key === 'alcoholStats'
              const isExpandable = isHabits || isEvents || isAlcoholStats
              const isExpanded = isHabits ? habitsExpanded : isEvents ? eventsExpanded : alcoholStatsExpanded
              const setExpanded = isHabits ? setHabitsExpanded : isEvents ? setEventsExpanded : setAlcoholStatsExpanded

              return (
                <div key={key}>
                  <div
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50',
                      !localConfig[key].visible && 'opacity-50'
                    )}
                  >
                    {isExpandable && localConfig[key].visible ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(!isExpanded)}
                        className="flex items-center gap-1 text-sm text-gray-700 flex-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        {widgetLabels[key]}
                        <span className="text-xs text-gray-400">
                          ({isHabits ? localConfig.selectedHabits.length : isEvents ? localConfig.selectedEvents.length : localConfig.selectedAlcoholMetrics.length}/
                          {isHabits ? allHabits.length : isEvents ? allEvents.length : allAlcoholMetrics.length})
                        </span>
                      </button>
                    ) : (
                      <span className="text-sm text-gray-700 flex-1">
                        {widgetLabels[key]}
                      </span>
                    )}

                    {/* Edit title button */}
                    <button
                      type="button"
                      onClick={() => setTitleEditingWidget(titleEditingWidget === key ? null : key)}
                      className={cn(
                        'p-1 rounded hover:bg-gray-200 flex-shrink-0',
                        titleEditingWidget === key && 'bg-gray-200'
                      )}
                      title="Edit title"
                    >
                      <Pencil className="h-3 w-3 text-gray-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWidget(key)}
                      className={cn(
                        'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
                        localConfig[key].visible ? 'bg-purple-600' : 'bg-gray-200'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                          localConfig[key].visible ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>

                  {/* Title editing */}
                  {titleEditingWidget === key && (
                    <div className="ml-4 mt-1 p-2 bg-blue-50 rounded-lg space-y-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Title</label>
                        <input
                          type="text"
                          value={localConfig.widgetTitles[key]?.title || ''}
                          onChange={(e) => updateWidgetTitle(key, e.target.value, localConfig.widgetTitles[key]?.subtitle)}
                          className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder={defaultWidgetTitles[key].title}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Subtitle (optional)</label>
                        <input
                          type="text"
                          value={localConfig.widgetTitles[key]?.subtitle || ''}
                          onChange={(e) => updateWidgetTitle(key, localConfig.widgetTitles[key]?.title || defaultWidgetTitles[key].title, e.target.value || undefined)}
                          className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Optional subtitle"
                        />
                      </div>
                    </div>
                  )}

                  {/* Habits selection dropdown */}
                  {isHabits && habitsExpanded && localConfig[key].visible && (
                    <div className="ml-4 mt-1 p-2 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Select habits:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({ ...prev, selectedHabits: [...allHabits] }))}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({ ...prev, selectedHabits: [] }))}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                        {allHabits.map((habit) => (
                          <label key={habit} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localConfig.selectedHabits.includes(habit)}
                              onChange={() => toggleHabit(habit)}
                              className="w-4 h-4 accent-purple-600 rounded"
                            />
                            <span className="text-xs text-gray-700">{allHabitLabels[habit]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Events selection dropdown */}
                  {isEvents && eventsExpanded && localConfig[key].visible && (
                    <div className="ml-4 mt-1 p-2 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Select events:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({ ...prev, selectedEvents: [...allEvents] }))}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({ ...prev, selectedEvents: [] }))}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                        {allEvents.map((event) => (
                          <label key={event} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localConfig.selectedEvents.includes(event)}
                              onChange={() => toggleEvent(event)}
                              className="w-4 h-4 accent-purple-600 rounded"
                            />
                            <span className="text-xs text-gray-700">{eventLabels[event]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alcohol metrics selection dropdown */}
                  {isAlcoholStats && alcoholStatsExpanded && localConfig[key].visible && (
                    <div className="ml-4 mt-1 p-2 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Select metrics:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({ ...prev, selectedAlcoholMetrics: [...allAlcoholMetrics] }))}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({ ...prev, selectedAlcoholMetrics: [] }))}
                            className="text-xs text-purple-600 hover:underline"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                        {allAlcoholMetrics.map((metric) => (
                          <label key={metric} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localConfig.selectedAlcoholMetrics.includes(metric)}
                              onChange={() => toggleAlcoholMetric(metric)}
                              className="w-4 h-4 accent-purple-600 rounded"
                            />
                            <span className="text-xs text-gray-700">{alcoholMetricLabels[metric]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="w-full"
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to migrate old config format to new format
function migrateConfig(oldConfig: unknown): DashboardWidgetConfig {
  if (!oldConfig || typeof oldConfig !== 'object') {
    return defaultConfig
  }

  const config = oldConfig as Record<string, unknown>

  // Start with defaults
  const result = { ...defaultConfig }

  // Migrate widget visibility
  for (const key of Object.keys(widgetLabels) as WidgetKey[]) {
    if (key in config && typeof config[key] === 'object') {
      const oldWidget = config[key] as Record<string, unknown>
      result[key] = { visible: oldWidget.visible !== false }
    } else if (key in config && typeof config[key] === 'boolean') {
      result[key] = { visible: config[key] as boolean }
    }
  }

  // Migrate selectedHabits
  if ('selectedHabits' in config && Array.isArray(config.selectedHabits)) {
    result.selectedHabits = config.selectedHabits as SelectableHabitType[]
  }

  // Migrate selectedEvents
  if ('selectedEvents' in config && Array.isArray(config.selectedEvents)) {
    result.selectedEvents = config.selectedEvents as EventType[]
  }

  // Migrate selectedAlcoholMetrics
  if ('selectedAlcoholMetrics' in config && Array.isArray(config.selectedAlcoholMetrics)) {
    result.selectedAlcoholMetrics = config.selectedAlcoholMetrics as AlcoholMetricType[]
  }

  // Migrate kpiVisibility
  if ('kpiVisibility' in config && typeof config.kpiVisibility === 'object') {
    result.kpiVisibility = { ...defaultKpiVisibility, ...(config.kpiVisibility as KpiVisibility) }
  }

  // Migrate gridLayouts - deep merge to preserve new widget defaults
  if ('gridLayouts' in config && typeof config.gridLayouts === 'object') {
    const oldLayouts = config.gridLayouts as Partial<GridLayouts>
    result.gridLayouts = {
      lg: { ...defaultGridLayouts.lg, ...(oldLayouts.lg || {}) },
      md: { ...defaultGridLayouts.md, ...(oldLayouts.md || {}) },
      sm: { ...defaultGridLayouts.sm, ...(oldLayouts.sm || {}) },
    }
  }

  // Migrate widgetTitles - merge to preserve new widget defaults
  if ('widgetTitles' in config && typeof config.widgetTitles === 'object') {
    result.widgetTitles = { ...defaultWidgetTitles, ...(config.widgetTitles as WidgetTitles) }
  }

  return result
}

export function getWidgetConfig(profile: Profile): DashboardWidgetConfig {
  const customMetrics = profile.custom_metrics
  return migrateConfig(customMetrics)
}

export function getVisibleWidgets(config: DashboardWidgetConfig): WidgetKey[] {
  return (Object.keys(widgetLabels) as WidgetKey[]).filter((key) => config[key].visible)
}
