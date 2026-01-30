'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  format,
  parseISO,
  subDays,
  subYears,
  startOfYear,
  getWeek,
  getQuarter,
  getDay,
  getDate,
  getMonth,
  differenceInDays,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useEntries } from '@/lib/hooks/useEntries'
import { formatDateForInput, getYesterdayString } from '@/lib/utils/dates'
import { calculateTotalDrinks } from '@/lib/utils/calculations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { habitLabels, eventLabels } from '@/types/forms'
import type {
  Profile,
  DailyEntryWithRelations,
  ReportConfig,
  ReportMetric,
  ReportAggregation,
  ReportDimension,
  ReportChartType,
  DatePresetType,
  ComparisonType,
  SavedReport,
  HabitType,
  EventType,
} from '@/types/database'
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table,
  Hash,
  Save,
  Trash2,
  FolderOpen,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AreaChart as AreaChartIcon,
  Layers,
  LayoutGrid,
} from 'lucide-react'

interface ReportsClientProps {
  profile: Profile
}

const metricOptions: { value: ReportMetric; label: string; category: string }[] = [
  // Alcohol
  { value: 'total_drinks', label: 'Total Drinks', category: 'Alcohol' },
  { value: 'beers', label: 'Beers', category: 'Alcohol' },
  { value: 'seltzers', label: 'Seltzers', category: 'Alcohol' },
  { value: 'wine', label: 'Wine', category: 'Alcohol' },
  { value: 'liquor', label: 'Liquor/Cocktails', category: 'Alcohol' },
  { value: 'shots', label: 'Shots', category: 'Alcohol' },
  { value: 'sober_days', label: 'Sober Days', category: 'Alcohol' },
  { value: 'drinking_days', label: 'Drinking Days', category: 'Alcohol' },
  // Wellness & Activity
  { value: 'mood_score', label: 'Mood Score', category: 'Wellness' },
  { value: 'steps', label: 'Steps', category: 'Activity' },
  { value: 'screen_time', label: 'Screen Time (mins)', category: 'Activity' },
  { value: 'sex', label: 'Sex', category: 'Wellness' },
  // Consumption & Location
  { value: 'coffee', label: 'Coffee', category: 'Consumption' },
  { value: 'meals_out', label: 'Meals Out', category: 'Consumption' },
  { value: 'miles_traveled', label: 'Miles from Home', category: 'Location' },
  // Aggregate counts
  { value: 'healthy_habits_count', label: 'Total Habits Count', category: 'Habits' },
  { value: 'life_events_count', label: 'Total Events Count', category: 'Events' },
  // Individual Habits
  { value: 'habit_sleep_8hrs', label: '8+ Hours of Sleep', category: 'Habits' },
  { value: 'habit_breakfast', label: 'Had Breakfast', category: 'Habits' },
  { value: 'habit_vitamin', label: 'Took Vitamin', category: 'Habits' },
  { value: 'habit_water_8cups', label: '8+ Cups of Water', category: 'Habits' },
  { value: 'habit_cooked_dinner', label: 'Cooked Dinner', category: 'Habits' },
  { value: 'habit_exercise', label: 'Exercised', category: 'Habits' },
  { value: 'habit_read_5pages', label: 'Read 5+ Pages', category: 'Habits' },
  { value: 'habit_family_interaction', label: 'Family Interaction', category: 'Habits' },
  { value: 'habit_family_phone', label: 'Family (Phone)', category: 'Habits' },
  { value: 'habit_family_in_person', label: 'Family (In Person)', category: 'Habits' },
  { value: 'habit_ate_fruit', label: 'Ate Fruit', category: 'Habits' },
  { value: 'habit_ate_vegetables', label: 'Ate Vegetables', category: 'Habits' },
  { value: 'habit_journaled', label: 'Journaled', category: 'Habits' },
  // Individual Events
  { value: 'event_pto', label: 'Took PTO', category: 'Events' },
  { value: 'event_flight', label: 'Took a Flight', category: 'Events' },
  { value: 'event_train', label: 'Took a Train', category: 'Events' },
  { value: 'event_haircut', label: 'Haircut', category: 'Events' },
  { value: 'event_doctor', label: 'Doctor Visit', category: 'Events' },
  { value: 'event_dentist', label: 'Dentist Visit', category: 'Events' },
  { value: 'event_played_sport', label: 'Played a Sport', category: 'Events' },
  { value: 'event_attended_sport', label: 'Attended Sporting Event', category: 'Events' },
  { value: 'event_concert', label: 'Went to Concert', category: 'Events' },
  { value: 'event_stage_production', label: 'Stage Production', category: 'Events' },
  { value: 'event_movies', label: 'Went to Movies', category: 'Events' },
  { value: 'event_museum', label: 'Went to Museum', category: 'Events' },
  { value: 'event_guys_night', label: 'Saw Friends', category: 'Events' },
  { value: 'event_massage', label: 'Massage', category: 'Events' },
  { value: 'event_facial', label: 'Facial', category: 'Events' },
  { value: 'event_pedicure', label: 'Pedicure', category: 'Events' },
  { value: 'event_manicure', label: 'Manicure', category: 'Events' },
  { value: 'event_other_selfcare', label: 'Other Self-Care', category: 'Events' },
  { value: 'event_diner', label: 'Went to Diner', category: 'Events' },
  { value: 'event_ice_cream', label: 'Ate Ice Cream', category: 'Events' },
  { value: 'event_park', label: 'Time in Park', category: 'Events' },
  { value: 'event_subway', label: 'Took Subway', category: 'Events' },
  { value: 'event_bus', label: 'Took Bus', category: 'Events' },
]

const aggregationOptions: { value: ReportAggregation; label: string }[] = [
  { value: 'sum', label: 'Total' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'cumulative', label: 'Cumulative' },
  { value: 'percent', label: '% of Total' },
]

const dimensionOptions: { value: ReportDimension; label: string; group: string }[] = [
  { value: 'day', label: 'Days', group: 'Time (Absolute)' },
  { value: 'week', label: 'Weeks', group: 'Time (Absolute)' },
  { value: 'month', label: 'Months', group: 'Time (Absolute)' },
  { value: 'quarter', label: 'Quarters', group: 'Time (Absolute)' },
  { value: 'year', label: 'Years', group: 'Time (Absolute)' },
  { value: 'day_of_week', label: 'Day of Week', group: 'Time (Relative)' },
  { value: 'day_of_month', label: 'Day of Month', group: 'Time (Relative)' },
  { value: 'week_of_year', label: 'Week of Year', group: 'Time (Relative)' },
  { value: 'month_of_year', label: 'Month of Year', group: 'Time (Relative)' },
  { value: 'habit', label: 'Habit', group: 'Category' },
  { value: 'event', label: 'Event', group: 'Category' },
  { value: 'work_location', label: 'Work Location', group: 'Category' },
]

const chartTypeOptions: { value: ReportChartType; label: string; icon: typeof BarChart3; supportsMultiMetric: boolean }[] = [
  { value: 'line', label: 'Line', icon: LineChartIcon, supportsMultiMetric: true },
  { value: 'area', label: 'Area', icon: AreaChartIcon, supportsMultiMetric: true },
  { value: 'bar', label: 'Bar', icon: BarChart3, supportsMultiMetric: true },
  { value: 'stacked_bar', label: 'Stacked', icon: Layers, supportsMultiMetric: false },
  { value: 'pie', label: 'Pie', icon: PieChartIcon, supportsMultiMetric: false },
  { value: 'kpi', label: 'KPI', icon: Hash, supportsMultiMetric: false },
  { value: 'table', label: 'Table', icon: Table, supportsMultiMetric: true },
  { value: 'grouped_bar', label: 'Grouped', icon: LayoutGrid, supportsMultiMetric: true },
]

const datePresetOptions: { value: DatePresetType; label: string }[] = [
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
]

const CHART_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316',
]

const defaultConfig: ReportConfig = {
  metric: 'total_drinks',
  metrics: ['total_drinks'],
  aggregation: 'sum',
  dimension: 'month',
  chartType: 'area',
  datePreset: 'allTime',
  comparison: 'none',
}

export function ReportsClient({ profile }: ReportsClientProps) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [config, setConfig] = useState<ReportConfig>(defaultConfig)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedHabits, setSelectedHabits] = useState<string[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [showSavedReports, setShowSavedReports] = useState(false)
  const [reportName, setReportName] = useState('')
  const [showOnDashboard, setShowOnDashboard] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  // Get active metrics (use metrics array or fall back to single metric)
  const activeMetrics = useMemo(() => {
    if (config.metrics && config.metrics.length > 0) return config.metrics
    return [config.metric]
  }, [config.metrics, config.metric])

  // Check if current chart type supports multiple metrics
  const supportsMultiMetric = useMemo(() => {
    return chartTypeOptions.find(c => c.value === config.chartType)?.supportsMultiMetric ?? false
  }, [config.chartType])

  const { startDate, endDate, comparisonStartDate, comparisonEndDate } = useMemo(() => {
    const today = new Date()
    const yesterday = getYesterdayString()
    let start: string
    let end: string

    switch (config.datePreset) {
      case 'last30': start = formatDateForInput(subDays(today, 30)); end = yesterday; break
      case 'last90': start = formatDateForInput(subDays(today, 90)); end = yesterday; break
      case 'thisYear': start = formatDateForInput(startOfYear(today)); end = yesterday; break
      case 'lastYear':
        start = formatDateForInput(startOfYear(subYears(today, 1)))
        end = formatDateForInput(subDays(startOfYear(today), 1))
        break
      case 'custom':
        start = customStartDate || formatDateForInput(subYears(today, 10))
        end = customEndDate || yesterday
        break
      default: start = formatDateForInput(subYears(today, 10)); end = yesterday
    }

    let compStart: string | undefined
    let compEnd: string | undefined
    if (config.comparison !== 'none') {
      const daysDiff = differenceInDays(parseISO(end), parseISO(start))
      if (config.comparison === 'previous_period') {
        compEnd = formatDateForInput(subDays(parseISO(start), 1))
        compStart = formatDateForInput(subDays(parseISO(start), daysDiff + 1))
      } else if (config.comparison === 'previous_year') {
        compStart = formatDateForInput(subYears(parseISO(start), 1))
        compEnd = formatDateForInput(subYears(parseISO(end), 1))
      }
    }

    return { startDate: start, endDate: end, comparisonStartDate: compStart, comparisonEndDate: compEnd }
  }, [config.datePreset, config.comparison, customStartDate, customEndDate])

  const { data: entries, isLoading: entriesLoading } = useEntries({ userId: profile.id, startDate, endDate })
  const { data: comparisonEntries } = useEntries({
    userId: profile.id,
    startDate: comparisonStartDate || '',
    endDate: comparisonEndDate || '',
  })

  const { data: savedReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['saved-reports', profile.id],
    queryFn: async (): Promise<SavedReport[]> => {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SavedReport[]
    },
  })

  const saveReportMutation = useMutation({
    mutationFn: async ({ name, showOnDashboard, id }: { name: string; showOnDashboard: boolean; id?: string }) => {
      const reportData = {
        user_id: profile.id,
        name,
        config: config as unknown as Record<string, unknown>,
        show_on_dashboard: showOnDashboard,
      }
      if (id) {
        const { error } = await supabase.from('saved_reports').update(reportData).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('saved_reports').insert(reportData)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] })
      setReportName('')
      setEditingReportId(null)
    },
  })

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_reports').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-reports'] }),
  })

  const loadReport = useCallback((report: SavedReport) => {
    const loadedConfig = report.config as ReportConfig
    // Ensure metrics array exists
    if (!loadedConfig.metrics) {
      loadedConfig.metrics = [loadedConfig.metric]
    }
    setConfig(loadedConfig)
    setEditingReportId(report.id)
    setReportName(report.name)
    setShowOnDashboard(report.show_on_dashboard)
    setShowSavedReports(false)
  }, [])

  const getMetricValue = useCallback((entry: DailyEntryWithRelations, metric: ReportMetric): number => {
    // Handle individual habit metrics
    if (metric.startsWith('habit_')) {
      const habitType = metric.replace('habit_', '') as HabitType
      return entry.healthy_habits.some(h => h.habit_type === habitType) ? 1 : 0
    }
    // Handle individual event metrics
    if (metric.startsWith('event_')) {
      const eventType = metric.replace('event_', '') as EventType
      return entry.life_events.some(e => e.event_type === eventType) ? 1 : 0
    }
    switch (metric) {
      case 'total_drinks': return calculateTotalDrinks(entry)
      case 'beers': return entry.beers || 0
      case 'seltzers': return entry.seltzers || 0
      case 'wine': return entry.wine || 0
      case 'liquor': return entry.liquor || 0
      case 'shots': return entry.shots || 0
      case 'sober_days': return calculateTotalDrinks(entry) === 0 ? 1 : 0
      case 'drinking_days': return calculateTotalDrinks(entry) > 0 ? 1 : 0
      case 'mood_score': return entry.mood_score || 0
      case 'steps': return entry.steps || 0
      case 'coffee': return entry.coffee || 0
      case 'screen_time': return entry.screen_time || 0
      case 'sex': return entry.sex || 0
      case 'healthy_habits_count': return entry.healthy_habits.length
      case 'life_events_count': return entry.life_events.length
      case 'meals_out':
        return (entry.breakfast_location === 'out' ? 1 : 0) +
          (entry.lunch_location === 'out' ? 1 : 0) +
          (entry.dinner_location === 'out' ? 1 : 0)
      case 'miles_traveled':
        return Math.max(entry.miles_wake || 0, entry.miles_noon || 0, entry.miles_sleep || 0)
      default: return 0
    }
  }, [])

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const getDimensionKey = useCallback((entry: DailyEntryWithRelations, dimension: ReportDimension): string => {
    const date = parseISO(entry.entry_date)
    switch (dimension) {
      case 'day': return format(date, 'MMM d, yyyy')
      case 'week': return `W${getWeek(date)} ${format(date, 'yyyy')}`
      case 'month': return format(date, 'MMM yyyy')
      case 'quarter': return `Q${getQuarter(date)} ${format(date, 'yyyy')}`
      case 'year': return format(date, 'yyyy')
      case 'day_of_week': return dayOfWeekNames[getDay(date)]
      case 'day_of_month': return String(getDate(date))
      case 'week_of_year': return `Week ${getWeek(date)}`
      case 'month_of_year': return monthNames[getMonth(date)]
      case 'work_location': return entry.work_location || 'Unknown'
      default: return entry.entry_date
    }
  }, [])

  // Check if using secondary dimension (only when single metric)
  const useSecondaryDimension = activeMetrics.length === 1 && config.secondaryDimension && config.secondaryDimension !== config.dimension

  // Multi-metric or multi-dimension chart data
  const { chartData, seriesKeys } = useMemo(() => {
    if (!entries || entries.length === 0) return { chartData: [], seriesKeys: [] as string[] }

    let filteredEntries = [...entries]
    if (selectedHabits.length > 0) {
      filteredEntries = filteredEntries.filter((entry) => {
        const entryHabits = entry.healthy_habits.map((h) => h.habit_type)
        return selectedHabits.some((h) => entryHabits.includes(h as HabitType))
      })
    }
    if (selectedEvents.length > 0) {
      filteredEntries = filteredEntries.filter((entry) => {
        const entryEvents = entry.life_events.map((e) => e.event_type)
        return selectedEvents.some((e) => entryEvents.includes(e as EventType))
      })
    }

    // Special handling for habit/event dimensions (single metric only)
    if (config.dimension === 'habit') {
      const habitData: Record<string, number> = {}
      filteredEntries.forEach((entry) => {
        entry.healthy_habits.forEach((habit) => {
          const label = habitLabels[habit.habit_type] || habit.habit_type
          habitData[label] = (habitData[label] || 0) + 1
        })
      })
      return {
        chartData: Object.entries(habitData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        seriesKeys: ['value']
      }
    }

    if (config.dimension === 'event') {
      const eventData: Record<string, number> = {}
      filteredEntries.forEach((entry) => {
        entry.life_events.forEach((event) => {
          const label = eventLabels[event.event_type] || event.event_type
          eventData[label] = (eventData[label] || 0) + 1
        })
      })
      return {
        chartData: Object.entries(eventData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        seriesKeys: ['value']
      }
    }

    // Aggregate values helper
    const aggregateValues = (values: number[], count: number): number => {
      switch (config.aggregation) {
        case 'sum': return values.reduce((a, b) => a + b, 0)
        case 'avg': return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        case 'count': return count
        case 'min': return values.length > 0 ? Math.min(...values) : 0
        case 'max': return values.length > 0 ? Math.max(...values) : 0
        default: return values.reduce((a, b) => a + b, 0)
      }
    }

    // Secondary dimension mode: group by primary, then split by secondary
    if (useSecondaryDimension && config.secondaryDimension) {
      const grouped: Record<string, Record<string, { values: number[]; count: number }>> = {}
      const allSecondaryKeys = new Set<string>()

      filteredEntries.forEach((entry) => {
        const primaryKey = getDimensionKey(entry, config.dimension)
        const secondaryKey = getDimensionKey(entry, config.secondaryDimension!)
        allSecondaryKeys.add(secondaryKey)

        if (!grouped[primaryKey]) grouped[primaryKey] = {}
        if (!grouped[primaryKey][secondaryKey]) grouped[primaryKey][secondaryKey] = { values: [], count: 0 }
        grouped[primaryKey][secondaryKey].values.push(getMetricValue(entry, activeMetrics[0]))
        grouped[primaryKey][secondaryKey].count++
      })

      // Sort secondary keys
      let sortedSecondaryKeys = Array.from(allSecondaryKeys)
      if (config.secondaryDimension === 'year') {
        sortedSecondaryKeys.sort()
      } else if (config.secondaryDimension === 'day_of_week') {
        sortedSecondaryKeys.sort((a, b) => dayOfWeekNames.indexOf(a) - dayOfWeekNames.indexOf(b))
      } else if (config.secondaryDimension === 'month_of_year') {
        sortedSecondaryKeys.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
      } else {
        sortedSecondaryKeys.sort()
      }

      let result = Object.entries(grouped).map(([name, secondaryData]) => {
        const row: Record<string, string | number> = { name, sortKey: name }
        sortedSecondaryKeys.forEach((secKey) => {
          const data = secondaryData[secKey] || { values: [], count: 0 }
          row[secKey] = Math.round(aggregateValues(data.values, data.count) * 100) / 100
        })
        return row
      })

      // Sort by primary dimension
      result.sort((a, b) => {
        if (config.dimension === 'day_of_week') return dayOfWeekNames.indexOf(a.name as string) - dayOfWeekNames.indexOf(b.name as string)
        if (config.dimension === 'month_of_year') return monthNames.indexOf(a.name as string) - monthNames.indexOf(b.name as string)
        if (config.dimension === 'day_of_month') return parseInt(a.name as string) - parseInt(b.name as string)
        if (config.dimension === 'week_of_year') return parseInt((a.name as string).replace('Week ', '')) - parseInt((b.name as string).replace('Week ', ''))
        return (a.sortKey as string).localeCompare(b.sortKey as string)
      })

      return { chartData: result, seriesKeys: sortedSecondaryKeys }
    }

    // Standard multi-metric mode
    const grouped: Record<string, Record<string, { values: number[]; count: number }>> = {}

    filteredEntries.forEach((entry) => {
      const key = getDimensionKey(entry, config.dimension)
      if (!grouped[key]) grouped[key] = {}

      activeMetrics.forEach((metric) => {
        if (!grouped[key][metric]) grouped[key][metric] = { values: [], count: 0 }
        grouped[key][metric].values.push(getMetricValue(entry, metric))
        grouped[key][metric].count++
      })
    })

    let result = Object.entries(grouped).map(([name, metricData]) => {
      const row: Record<string, string | number> = { name, sortKey: name }
      activeMetrics.forEach((metric) => {
        const data = metricData[metric] || { values: [], count: 0 }
        row[metric] = Math.round(aggregateValues(data.values, data.count) * 100) / 100
      })
      if (activeMetrics.length === 1) {
        row.value = row[activeMetrics[0]]
      }
      return row
    })

    // Sort
    result.sort((a, b) => {
      if (config.dimension === 'work_location') return (b.value as number || 0) - (a.value as number || 0)
      if (config.dimension === 'day_of_week') return dayOfWeekNames.indexOf(a.name as string) - dayOfWeekNames.indexOf(b.name as string)
      if (config.dimension === 'month_of_year') return monthNames.indexOf(a.name as string) - monthNames.indexOf(b.name as string)
      if (config.dimension === 'day_of_month') return parseInt(a.name as string) - parseInt(b.name as string)
      if (config.dimension === 'week_of_year') return parseInt((a.name as string).replace('Week ', '')) - parseInt((b.name as string).replace('Week ', ''))
      return (a.sortKey as string).localeCompare(b.sortKey as string)
    })

    // Cumulative
    if (config.aggregation === 'cumulative') {
      const cumulatives: Record<string, number> = {}
      activeMetrics.forEach(m => cumulatives[m] = 0)
      result = result.map((item) => {
        const newItem = { ...item }
        activeMetrics.forEach((metric) => {
          cumulatives[metric] += (item[metric] as number) || 0
          newItem[metric] = cumulatives[metric]
        })
        if (activeMetrics.length === 1) newItem.value = newItem[activeMetrics[0]]
        return newItem
      })
    }

    // Percent
    if (config.aggregation === 'percent') {
      const totals: Record<string, number> = {}
      activeMetrics.forEach(m => totals[m] = result.reduce((sum, item) => sum + ((item[m] as number) || 0), 0))
      result = result.map((item) => {
        const newItem = { ...item }
        activeMetrics.forEach((metric) => {
          newItem[metric] = totals[metric] > 0 ? Math.round(((item[metric] as number) / totals[metric]) * 1000) / 10 : 0
        })
        if (activeMetrics.length === 1) newItem.value = newItem[activeMetrics[0]]
        return newItem
      })
    }

    return { chartData: result, seriesKeys: activeMetrics as string[] }
  }, [entries, config, selectedHabits, selectedEvents, getDimensionKey, getMetricValue, activeMetrics, useSecondaryDimension])

  const comparisonData = useMemo(() => {
    if (!comparisonEntries || comparisonEntries.length === 0 || config.comparison === 'none') return null
    const total = comparisonEntries.reduce((sum, entry) => sum + getMetricValue(entry, activeMetrics[0]), 0)
    const avg = comparisonEntries.length > 0 ? total / comparisonEntries.length : 0
    return { total, avg: Math.round(avg * 100) / 100, count: comparisonEntries.length }
  }, [comparisonEntries, config.comparison, getMetricValue, activeMetrics])

  // Process comparison entries into chart data format (for overlay on charts)
  const comparisonChartData = useMemo(() => {
    if (!comparisonEntries || comparisonEntries.length === 0 || config.comparison === 'none') return null
    if (useSecondaryDimension) return null // Don't support comparison with secondary dimension
    if (config.dimension === 'habit' || config.dimension === 'event') return null // Not meaningful for these

    // Aggregate values helper
    const aggregateValues = (values: number[], count: number): number => {
      switch (config.aggregation) {
        case 'sum': return values.reduce((a, b) => a + b, 0)
        case 'avg': return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        case 'count': return count
        case 'min': return values.length > 0 ? Math.min(...values) : 0
        case 'max': return values.length > 0 ? Math.max(...values) : 0
        default: return values.reduce((a, b) => a + b, 0)
      }
    }

    const grouped: Record<string, Record<string, { values: number[]; count: number }>> = {}

    comparisonEntries.forEach((entry) => {
      const key = getDimensionKey(entry, config.dimension)
      if (!grouped[key]) grouped[key] = {}

      activeMetrics.forEach((metric) => {
        if (!grouped[key][metric]) grouped[key][metric] = { values: [], count: 0 }
        grouped[key][metric].values.push(getMetricValue(entry, metric))
        grouped[key][metric].count++
      })
    })

    const result: Record<string, Record<string, number>> = {}
    Object.entries(grouped).forEach(([name, metricData]) => {
      result[name] = {}
      activeMetrics.forEach((metric) => {
        const data = metricData[metric] || { values: [], count: 0 }
        result[name][metric] = Math.round(aggregateValues(data.values, data.count) * 100) / 100
      })
    })

    return result
  }, [comparisonEntries, config.comparison, config.dimension, config.aggregation, getDimensionKey, getMetricValue, activeMetrics, useSecondaryDimension])

  // Merge comparison data into chart data
  const { mergedChartData, comparisonSeriesKeys } = useMemo(() => {
    if (!comparisonChartData || config.comparison === 'none') {
      return { mergedChartData: chartData, comparisonSeriesKeys: [] as string[] }
    }

    const compKeys = activeMetrics.map(m => `${m}_comparison`)
    const merged = chartData.map((item) => {
      const newItem: Record<string, string | number> = { ...item }
      const compData = comparisonChartData[item.name as string]
      activeMetrics.forEach((metric) => {
        newItem[`${metric}_comparison`] = compData ? compData[metric] : 0
      })
      return newItem
    })

    return { mergedChartData: merged, comparisonSeriesKeys: compKeys }
  }, [chartData, comparisonChartData, config.comparison, activeMetrics])

  const currentTotals = useMemo(() => {
    if (!entries || entries.length === 0) return { total: 0, avg: 0, count: 0 }
    const total = entries.reduce((sum, entry) => sum + getMetricValue(entry, activeMetrics[0]), 0)
    return { total, avg: Math.round((total / entries.length) * 100) / 100, count: entries.length }
  }, [entries, activeMetrics, getMetricValue])

  const changePercentage = useMemo(() => {
    if (!comparisonData) return null
    const currentValue = config.aggregation === 'avg' ? currentTotals.avg : currentTotals.total
    const compValue = config.aggregation === 'avg' ? comparisonData.avg : comparisonData.total
    if (compValue === 0) return null
    return Math.round(((currentValue - compValue) / compValue) * 1000) / 10
  }, [currentTotals, comparisonData, config.aggregation])

  const handleSaveReport = () => {
    if (!reportName.trim()) return
    saveReportMutation.mutate({ name: reportName, showOnDashboard, id: editingReportId || undefined })
  }

  const handleNewReport = () => {
    setConfig(defaultConfig)
    setReportName('')
    setEditingReportId(null)
    setShowOnDashboard(false)
  }

  const addMetric = (metric: ReportMetric) => {
    if (!activeMetrics.includes(metric)) {
      const newMetrics = [...activeMetrics, metric]
      // Clear secondary dimension when adding multiple metrics
      setConfig({ ...config, metrics: newMetrics, metric: newMetrics[0], secondaryDimension: newMetrics.length > 1 ? null : config.secondaryDimension })
    }
  }

  const removeMetric = (metric: ReportMetric) => {
    if (activeMetrics.length > 1) {
      const newMetrics = activeMetrics.filter(m => m !== metric)
      setConfig({ ...config, metrics: newMetrics, metric: newMetrics[0] })
    }
  }

  const getMetricLabel = (metric: ReportMetric) => metricOptions.find(m => m.value === metric)?.label || metric
  const dimensionLabel = dimensionOptions.find((d) => d.value === config.dimension)?.label || config.dimension
  const tooltipStyle = { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }

  // Build title from metrics
  const chartTitle = useMemo(() => {
    if (activeMetrics.length === 1) return getMetricLabel(activeMetrics[0])
    if (activeMetrics.length === 2) return `${getMetricLabel(activeMetrics[0])} and ${getMetricLabel(activeMetrics[1])}`
    return `${getMetricLabel(activeMetrics[0])} and ${activeMetrics.length - 1} more`
  }, [activeMetrics])

  const renderChart = () => {
    if (entriesLoading) {
      return <div className="flex items-center justify-center h-80"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
    }
    if (chartData.length === 0) {
      return <div className="flex items-center justify-center h-80 text-gray-500">No data available</div>
    }

    // KPI - single metric only
    if (config.chartType === 'kpi') {
      const value = config.aggregation === 'avg' ? currentTotals.avg : currentTotals.total
      return (
        <div className="flex flex-col items-center justify-center h-80">
          <p className="text-6xl font-bold text-purple-600">{value.toLocaleString()}</p>
          <p className="text-gray-500 mt-2">{getMetricLabel(activeMetrics[0])}</p>
          {changePercentage !== null && (
            <div className={cn('flex items-center gap-1 mt-3 text-sm font-medium',
              changePercentage > 0 ? 'text-green-600' : changePercentage < 0 ? 'text-red-600' : 'text-gray-500')}>
              {changePercentage > 0 ? <TrendingUp className="h-4 w-4" /> : changePercentage < 0 ? <TrendingDown className="h-4 w-4" /> : null}
              <span>{changePercentage > 0 ? '+' : ''}{changePercentage}%</span>
            </div>
          )}
        </div>
      )
    }

    // Table - supports multiple metrics or secondary dimension
    if (config.chartType === 'table') {
      const tableKeys = useSecondaryDimension ? seriesKeys : activeMetrics
      const getTableLabel = (key: string) => useSecondaryDimension ? key : getMetricLabel(key as ReportMetric)
      return (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">{dimensionLabel}</th>
                {tableKeys.map((key) => (
                  <th key={key} className="text-right p-3 font-medium text-gray-700">{getTableLabel(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{item.name}</td>
                  {tableKeys.map((key) => (
                    <td key={key} className="p-3 text-right font-medium">
                      {((item as Record<string, unknown>)[key] as number)?.toLocaleString()}{config.aggregation === 'percent' ? '%' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // Charts with multiple metrics or secondary dimension
    const useDualAxis = config.dualAxis && activeMetrics.length >= 2 && !useSecondaryDimension
    const hasComparison = comparisonSeriesKeys.length > 0 && !useSecondaryDimension
    const chartDataToUse = hasComparison ? mergedChartData : chartData
    const commonProps = { data: chartDataToUse, margin: { top: 5, right: 5, left: 0, bottom: 60 } }

    // Calculate smart interval to prevent label overlap
    // Target ~10-12 labels max on the X-axis
    const dataLength = chartDataToUse.length
    const targetLabels = 10
    const xAxisInterval = dataLength <= targetLabels ? 0 : Math.ceil(dataLength / targetLabels) - 1

    // Custom tick formatter for X-axis labels
    const formatXAxisLabel = (value: string): string => {
      if (!value) return ''
      // Truncate long labels
      if (value.length > 12) return value.substring(0, 10) + '…'
      return value
    }

    // Smart Y-axis formatter for large numbers (k, M suffixes)
    const formatYAxisValue = (value: number): string => {
      if (value === 0) return '0'
      const absValue = Math.abs(value)
      if (absValue >= 1000000) {
        const formatted = (value / 1000000)
        return formatted % 1 === 0 ? `${formatted}M` : `${formatted.toFixed(1)}M`
      }
      if (absValue >= 1000) {
        const formatted = (value / 1000)
        return formatted % 1 === 0 ? `${formatted}k` : `${formatted.toFixed(1)}k`
      }
      return value.toLocaleString()
    }

    // Custom X-axis tick component for better label positioning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomXAxisTick = (props: any) => {
      const { x, y, payload } = props
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={8}
            textAnchor="end"
            fill="#666"
            fontSize={11}
            transform="rotate(-35)"
          >
            {formatXAxisLabel(payload?.value || '')}
          </text>
        </g>
      )
    }

    // Helper to get series label (metric label or secondary dimension value)
    const getSeriesLabel = (key: string): string => {
      if (useSecondaryDimension) return key // Secondary dimension values are used as-is
      // Handle comparison keys
      if (key.endsWith('_comparison')) {
        const baseMetric = key.replace('_comparison', '') as ReportMetric
        const periodLabel = config.comparison === 'previous_year' ? 'Prior Year' : 'Prior Period'
        return activeMetrics.length === 1 ? periodLabel : `${getMetricLabel(baseMetric)} (${periodLabel})`
      }
      // For current period with comparison active, add label
      if (hasComparison && activeMetrics.length === 1) {
        return 'Current Period'
      }
      return getMetricLabel(key as ReportMetric)
    }

    // Determine which keys to render as series
    const renderKeys = useSecondaryDimension ? seriesKeys : activeMetrics
    const showLegend = renderKeys.length > 1 || hasComparison

    // Comparison color (muted gray)
    const COMPARISON_COLOR = '#9ca3af'

    switch (config.chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={CustomXAxisTick} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval={xAxisInterval} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} width={45}
                tickFormatter={formatYAxisValue} stroke={useDualAxis ? CHART_COLORS[0] : '#666'} />
              {useDualAxis && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} width={45}
                  tickFormatter={formatYAxisValue} stroke={CHART_COLORS[1]} />
              )}
              <Tooltip contentStyle={tooltipStyle} />
              {showLegend && <Legend />}
              {/* Comparison series first (so they appear behind) */}
              {hasComparison && comparisonSeriesKeys.map((key, idx) => (
                <Area key={key} type="monotone" dataKey={key} name={getSeriesLabel(key)}
                  yAxisId="left"
                  stroke={COMPARISON_COLOR}
                  fill={COMPARISON_COLOR}
                  fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 5" />
              ))}
              {renderKeys.map((key, idx) => (
                <Area key={key} type="monotone" dataKey={key} name={getSeriesLabel(key)}
                  yAxisId={useDualAxis && idx > 0 ? 'right' : 'left'}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  fillOpacity={0.3} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={CustomXAxisTick} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval={xAxisInterval} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} width={45}
                tickFormatter={formatYAxisValue} stroke={useDualAxis ? CHART_COLORS[0] : '#666'} />
              {useDualAxis && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} width={45}
                  tickFormatter={formatYAxisValue} stroke={CHART_COLORS[1]} />
              )}
              <Tooltip contentStyle={tooltipStyle} />
              {showLegend && <Legend />}
              {/* Comparison series first (so they appear behind) */}
              {hasComparison && comparisonSeriesKeys.map((key, idx) => (
                <Line key={key} type="monotone" dataKey={key} name={getSeriesLabel(key)}
                  yAxisId="left"
                  stroke={COMPARISON_COLOR} strokeWidth={2} strokeDasharray="5 5"
                  dot={{ fill: COMPARISON_COLOR, r: 2 }} />
              ))}
              {renderKeys.map((key, idx) => (
                <Line key={key} type="monotone" dataKey={key} name={getSeriesLabel(key)}
                  yAxisId={useDualAxis && idx > 0 ? 'right' : 'left'}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2}
                  dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
      case 'grouped_bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={CustomXAxisTick} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval={xAxisInterval} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={45} tickFormatter={formatYAxisValue} />
              <Tooltip contentStyle={tooltipStyle} />
              {showLegend && <Legend />}
              {renderKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} name={getSeriesLabel(key)}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
              {/* Comparison bars */}
              {hasComparison && comparisonSeriesKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} name={getSeriesLabel(key)}
                  fill={COMPARISON_COLOR} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'stacked_bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={CustomXAxisTick} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval={xAxisInterval} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={45} tickFormatter={formatYAxisValue} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey={activeMetrics[0]} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey={activeMetrics[0]} nameKey="name" cx="50%" cy="50%" outerRadius={100}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  const availableMetrics = metricOptions.filter(m => !activeMetrics.includes(m.value))

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {chartTitle} by {dimensionLabel}
              {useSecondaryDimension && config.secondaryDimension && (
                <span className="text-gray-500 font-normal">, split by {dimensionOptions.find(d => d.value === config.secondaryDimension)?.label}</span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              {format(parseISO(startDate), 'MMM d, yyyy')} - {format(parseISO(endDate), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSavedReports(!showSavedReports)}>
              <FolderOpen className="h-4 w-4 mr-1" />Saved
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewReport}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {showSavedReports && (
          <Card>
            <CardContent className="p-3">
              {reportsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-purple-600 mx-auto" />
              ) : !savedReports?.length ? (
                <p className="text-sm text-gray-500">No saved reports</p>
              ) : (
                <div className="space-y-1">
                  {savedReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => loadReport(report)}>
                      <span className="text-sm">{report.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500"
                        onClick={(e) => { e.stopPropagation(); deleteReportMutation.mutate(report.id) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{currentTotals.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{currentTotals.avg.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Average per Day</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{currentTotals.count}</p>
            <p className="text-xs text-gray-500">Day Count</p>
          </CardContent></Card>
        </div>

        <Card><CardContent className="p-2 sm:p-4">
          <div className="aspect-[4/3] sm:aspect-[16/9] w-full relative">{renderChart()}</div>
        </CardContent></Card>

        {config.chartType !== 'table' && chartData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700">{dimensionLabel}</th>
                      {(useSecondaryDimension ? seriesKeys : activeMetrics).map((key) => (
                        <th key={key} className="text-right p-2 font-medium text-gray-700">
                          {useSecondaryDimension ? key : getMetricLabel(key as ReportMetric)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2">{item.name}</td>
                        {(useSecondaryDimension ? seriesKeys : activeMetrics).map((key) => (
                          <td key={key} className="p-2 text-right">
                            {((item as Record<string, unknown>)[key] as number)?.toLocaleString()}{config.aggregation === 'percent' ? '%' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {chartData.length > 10 && (
                      <tr><td colSpan={(useSecondaryDimension ? seriesKeys : activeMetrics).length + 1} className="p-2 text-center text-gray-400 text-xs">+ {chartData.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-72 space-y-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Chart Type</p>
            <div className="grid grid-cols-4 gap-1">
              {chartTypeOptions.map((opt) => (
                <button key={opt.value} onClick={() => setConfig({ ...config, chartType: opt.value })}
                  className={cn('p-2 rounded border text-center transition-colors',
                    config.chartType === opt.value
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}
                  title={opt.label}>
                  <opt.icon className="h-4 w-4 mx-auto" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Time Range</p>
              <select value={config.datePreset} onChange={(e) => setConfig({ ...config, datePreset: e.target.value as DatePresetType })}
                className="w-full h-9 px-2 rounded border border-gray-200 text-sm">
                {datePresetOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            {config.datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="h-8 text-xs" />
                <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="h-8 text-xs" />
              </div>
            )}
            <button onClick={() => setShowComparison(!showComparison)} className="text-xs text-purple-600 hover:text-purple-700">
              + Comparison to Previous
            </button>
            {showComparison && (
              <select value={config.comparison} onChange={(e) => setConfig({ ...config, comparison: e.target.value as ComparisonType })}
                className="w-full h-8 px-2 rounded border border-gray-200 text-xs">
                <option value="none">No Comparison</option>
                <option value="previous_period">Previous Period</option>
                <option value="previous_year">Previous Year</option>
              </select>
            )}
          </CardContent>
        </Card>

        {/* Metrics - chips with add */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">Metrics</p>
              <span className="text-xs text-gray-400">{activeMetrics.length}/{supportsMultiMetric ? '10' : '1'}</span>
            </div>
            <div className="space-y-1">
              {activeMetrics.map((metric) => (
                <div key={metric} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="truncate">{getMetricLabel(metric)}</span>
                  {activeMetrics.length > 1 && (
                    <button onClick={() => removeMetric(metric)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {supportsMultiMetric && availableMetrics.length > 0 && (
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) addMetric(e.target.value as ReportMetric) }}
                  className="w-full h-8 px-2 rounded border border-dashed border-gray-300 text-xs text-gray-500"
                >
                  <option value="">+ Add Metric</option>
                  {Object.entries(availableMetrics.reduce((acc, opt) => {
                    if (!acc[opt.category]) acc[opt.category] = []
                    acc[opt.category].push(opt)
                    return acc
                  }, {} as Record<string, typeof metricOptions>)).map(([category, options]) => (
                    <optgroup key={category} label={category}>
                      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}
              {/* Dual axis toggle - only for line/area with 2+ metrics */}
              {activeMetrics.length >= 2 && (config.chartType === 'line' || config.chartType === 'area') && (
                <label className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dualAxis || false}
                    onChange={(e) => setConfig({ ...config, dualAxis: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Dual Y-Axis (different scales)
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Group By</p>
            <select value={config.dimension} onChange={(e) => setConfig({ ...config, dimension: e.target.value as ReportDimension, secondaryDimension: null })}
              className="w-full h-9 px-2 rounded border border-gray-200 text-sm">
              {Object.entries(dimensionOptions.reduce((acc, opt) => {
                if (!acc[opt.group]) acc[opt.group] = []
                acc[opt.group].push(opt)
                return acc
              }, {} as Record<string, typeof dimensionOptions>)).map(([group, options]) => (
                <optgroup key={group} label={group}>
                  {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </optgroup>
              ))}
            </select>
            {/* Secondary dimension - only for single metric and supported chart types */}
            {activeMetrics.length === 1 && ['line', 'area', 'bar', 'grouped_bar', 'table'].includes(config.chartType) && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Split By (optional)</p>
                <select
                  value={config.secondaryDimension || ''}
                  onChange={(e) => setConfig({ ...config, secondaryDimension: e.target.value ? e.target.value as ReportDimension : null })}
                  className="w-full h-8 px-2 rounded border border-gray-200 text-xs"
                >
                  <option value="">None</option>
                  {dimensionOptions
                    .filter((opt) => opt.value !== config.dimension)
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {config.secondaryDimension && (
                  <p className="text-xs text-gray-400 mt-1">
                    Creates separate lines/bars for each {dimensionOptions.find(d => d.value === config.secondaryDimension)?.label.toLowerCase()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Aggregation</p>
            <select value={config.aggregation} onChange={(e) => setConfig({ ...config, aggregation: e.target.value as ReportAggregation })}
              className="w-full h-9 px-2 rounded border border-gray-200 text-sm">
              {aggregationOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full text-xs font-medium text-gray-500">
              <span>Filters {(selectedHabits.length + selectedEvents.length) > 0 && `(${selectedHabits.length + selectedEvents.length})`}</span>
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showFilters && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Habits</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(habitLabels).slice(0, 6).map(([key, label]) => (
                      <button key={key} onClick={() => setSelectedHabits((prev) =>
                        prev.includes(key) ? prev.filter((h) => h !== key) : [...prev, key])}
                        className={cn('px-1.5 py-0.5 rounded text-xs border',
                          selectedHabits.includes(key) ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600')}>
                        {label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Events</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(eventLabels).slice(0, 6).map(([key, label]) => (
                      <button key={key} onClick={() => setSelectedEvents((prev) =>
                        prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key])}
                        className={cn('px-1.5 py-0.5 rounded text-xs border',
                          selectedEvents.includes(key) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600')}>
                        {label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                {(selectedHabits.length > 0 || selectedEvents.length > 0) && (
                  <button onClick={() => { setSelectedHabits([]); setSelectedEvents([]) }}
                    className="text-xs text-red-500 hover:text-red-600">
                    <X className="h-3 w-3 inline mr-1" />Clear
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 space-y-2">
            <Input placeholder="Report name" value={reportName} onChange={(e) => setReportName(e.target.value)} className="h-8 text-sm" />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)}
                className="rounded border-gray-300" />
              Show on Dashboard
            </label>
            <Button onClick={handleSaveReport} disabled={!reportName.trim() || saveReportMutation.isPending} className="w-full h-8 text-sm">
              {saveReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {editingReportId ? 'Update' : 'Save'}
            </Button>
            {editingReportId && (
              <p className="text-xs text-gray-400 text-center">Editing: {savedReports?.find((r) => r.id === editingReportId)?.name}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
