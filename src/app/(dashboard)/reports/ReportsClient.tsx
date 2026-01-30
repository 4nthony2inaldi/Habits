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
import { Label } from '@/components/ui/label'
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

// Metric options with labels and categories
const metricOptions: { value: ReportMetric; label: string; category: string }[] = [
  { value: 'total_drinks', label: 'Total Drinks', category: 'Alcohol' },
  { value: 'beers', label: 'Beers', category: 'Alcohol' },
  { value: 'seltzers', label: 'Seltzers', category: 'Alcohol' },
  { value: 'wine', label: 'Wine', category: 'Alcohol' },
  { value: 'liquor', label: 'Liquor/Cocktails', category: 'Alcohol' },
  { value: 'shots', label: 'Shots', category: 'Alcohol' },
  { value: 'sober_days', label: 'Sober Days', category: 'Alcohol' },
  { value: 'drinking_days', label: 'Drinking Days', category: 'Alcohol' },
  { value: 'mood_score', label: 'Mood Score', category: 'Wellness' },
  { value: 'steps', label: 'Steps', category: 'Activity' },
  { value: 'coffee', label: 'Coffee', category: 'Consumption' },
  { value: 'screen_time', label: 'Screen Time (mins)', category: 'Activity' },
  { value: 'healthy_habits_count', label: 'Healthy Habits Count', category: 'Habits' },
  { value: 'life_events_count', label: 'Life Events Count', category: 'Events' },
  { value: 'meals_out', label: 'Meals Out', category: 'Consumption' },
  { value: 'miles_traveled', label: 'Miles from Home', category: 'Location' },
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

const chartTypeOptions: { value: ReportChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: 'line', label: 'Line', icon: LineChartIcon },
  { value: 'area', label: 'Area', icon: AreaChartIcon },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'stacked_bar', label: 'Stacked', icon: Layers },
  { value: 'pie', label: 'Pie', icon: PieChartIcon },
  { value: 'kpi', label: 'KPI', icon: Hash },
  { value: 'table', label: 'Table', icon: Table },
  { value: 'grouped_bar', label: 'Grouped', icon: LayoutGrid },
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

  // Calculate date range
  const { startDate, endDate, comparisonStartDate, comparisonEndDate } = useMemo(() => {
    const today = new Date()
    const yesterday = getYesterdayString()
    let start: string
    let end: string

    switch (config.datePreset) {
      case 'last30':
        start = formatDateForInput(subDays(today, 30))
        end = yesterday
        break
      case 'last90':
        start = formatDateForInput(subDays(today, 90))
        end = yesterday
        break
      case 'thisYear':
        start = formatDateForInput(startOfYear(today))
        end = yesterday
        break
      case 'lastYear':
        start = formatDateForInput(startOfYear(subYears(today, 1)))
        end = formatDateForInput(subDays(startOfYear(today), 1))
        break
      case 'custom':
        start = customStartDate || formatDateForInput(subYears(today, 10))
        end = customEndDate || yesterday
        break
      case 'allTime':
      default:
        start = formatDateForInput(subYears(today, 10))
        end = yesterday
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

  const { data: entries, isLoading: entriesLoading } = useEntries({
    userId: profile.id,
    startDate,
    endDate,
  })

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] })
    },
  })

  const loadReport = useCallback((report: SavedReport) => {
    setConfig(report.config as ReportConfig)
    setEditingReportId(report.id)
    setReportName(report.name)
    setShowOnDashboard(report.show_on_dashboard)
    setShowSavedReports(false)
  }, [])

  const getMetricValue = useCallback((entry: DailyEntryWithRelations, metric: ReportMetric): number => {
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

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return []

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

    if (config.dimension === 'habit') {
      const habitData: Record<string, number> = {}
      filteredEntries.forEach((entry) => {
        entry.healthy_habits.forEach((habit) => {
          const label = habitLabels[habit.habit_type] || habit.habit_type
          habitData[label] = (habitData[label] || 0) + 1
        })
      })
      return Object.entries(habitData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }

    if (config.dimension === 'event') {
      const eventData: Record<string, number> = {}
      filteredEntries.forEach((entry) => {
        entry.life_events.forEach((event) => {
          const label = eventLabels[event.event_type] || event.event_type
          eventData[label] = (eventData[label] || 0) + 1
        })
      })
      return Object.entries(eventData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }

    const grouped: Record<string, { values: number[]; count: number }> = {}
    filteredEntries.forEach((entry) => {
      const key = getDimensionKey(entry, config.dimension)
      if (!grouped[key]) grouped[key] = { values: [], count: 0 }
      grouped[key].values.push(getMetricValue(entry, config.metric))
      grouped[key].count++
    })

    let result = Object.entries(grouped).map(([name, { values, count }]) => {
      let value: number
      switch (config.aggregation) {
        case 'sum': value = values.reduce((a, b) => a + b, 0); break
        case 'avg': value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0; break
        case 'count': value = count; break
        case 'min': value = Math.min(...values); break
        case 'max': value = Math.max(...values); break
        default: value = values.reduce((a, b) => a + b, 0)
      }
      return { name, value: Math.round(value * 100) / 100, sortKey: name }
    })

    result.sort((a, b) => {
      if (config.dimension === 'work_location') return b.value - a.value
      if (config.dimension === 'day_of_week') return dayOfWeekNames.indexOf(a.name) - dayOfWeekNames.indexOf(b.name)
      if (config.dimension === 'month_of_year') return monthNames.indexOf(a.name) - monthNames.indexOf(b.name)
      if (config.dimension === 'day_of_month') return parseInt(a.name) - parseInt(b.name)
      if (config.dimension === 'week_of_year') return parseInt(a.name.replace('Week ', '')) - parseInt(b.name.replace('Week ', ''))
      return a.sortKey.localeCompare(b.sortKey)
    })

    if (config.aggregation === 'cumulative') {
      let cumulative = 0
      result = result.map((item) => { cumulative += item.value; return { ...item, value: cumulative } })
    }

    if (config.aggregation === 'percent') {
      const total = result.reduce((sum, item) => sum + item.value, 0)
      result = result.map((item) => ({ ...item, value: total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0 }))
    }

    return result
  }, [entries, config, selectedHabits, selectedEvents, getDimensionKey, getMetricValue])

  const comparisonData = useMemo(() => {
    if (!comparisonEntries || comparisonEntries.length === 0 || config.comparison === 'none') return null
    const total = comparisonEntries.reduce((sum, entry) => sum + getMetricValue(entry, config.metric), 0)
    const avg = comparisonEntries.length > 0 ? total / comparisonEntries.length : 0
    return { total, avg: Math.round(avg * 100) / 100, count: comparisonEntries.length }
  }, [comparisonEntries, config, getMetricValue])

  const currentTotals = useMemo(() => {
    if (!entries || entries.length === 0) return { total: 0, avg: 0, count: 0 }
    const total = entries.reduce((sum, entry) => sum + getMetricValue(entry, config.metric), 0)
    return { total, avg: Math.round((total / entries.length) * 100) / 100, count: entries.length }
  }, [entries, config.metric, getMetricValue])

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

  const metricLabel = metricOptions.find((m) => m.value === config.metric)?.label || config.metric
  const dimensionLabel = dimensionOptions.find((d) => d.value === config.dimension)?.label || config.dimension

  const tooltipStyle = { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }

  const renderChart = () => {
    if (entriesLoading) {
      return <div className="flex items-center justify-center h-80"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
    }
    if (chartData.length === 0) {
      return <div className="flex items-center justify-center h-80 text-gray-500">No data available</div>
    }
    if (config.chartType === 'kpi') {
      const value = config.aggregation === 'avg' ? currentTotals.avg : currentTotals.total
      return (
        <div className="flex flex-col items-center justify-center h-80">
          <p className="text-6xl font-bold text-purple-600">{value.toLocaleString()}</p>
          <p className="text-gray-500 mt-2">{metricLabel}</p>
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
    if (config.chartType === 'table') {
      return (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">{dimensionLabel}</th>
                <th className="text-right p-3 font-medium text-gray-700">{metricLabel}</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3 text-right font-medium">{item.value.toLocaleString()}{config.aggregation === 'percent' ? '%' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    const commonProps = { data: chartData, margin: { top: 10, right: 20, left: 0, bottom: 5 } }

    switch (config.chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#c4b5fd" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'bar':
      case 'grouped_bar':
      case 'stacked_bar':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
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

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Title Row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {metricLabel} by {dimensionLabel}
            </h1>
            <p className="text-sm text-gray-500">
              {format(parseISO(startDate), 'MMM d, yyyy')} - {format(parseISO(endDate), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSavedReports(!showSavedReports)}>
              <FolderOpen className="h-4 w-4 mr-1" />
              Saved
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewReport}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Saved Reports Dropdown */}
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

        {/* KPI Summary Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{currentTotals.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{currentTotals.avg.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Average per Day</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{currentTotals.count}</p>
              <p className="text-xs text-gray-500">Day Count</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardContent className="p-4">
            {renderChart()}
          </CardContent>
        </Card>

        {/* Data Table (when not already showing table view) */}
        {config.chartType !== 'table' && chartData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700">{dimensionLabel}</th>
                      <th className="text-right p-2 font-medium text-gray-700">{metricLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2">{item.name}</td>
                        <td className="p-2 text-right">{item.value.toLocaleString()}{config.aggregation === 'percent' ? '%' : ''}</td>
                      </tr>
                    ))}
                    {chartData.length > 10 && (
                      <tr><td colSpan={2} className="p-2 text-center text-gray-400 text-xs">+ {chartData.length - 10} more</td></tr>
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
        {/* Chart Type */}
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

        {/* Time Range */}
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
            <button onClick={() => setShowComparison(!showComparison)}
              className="text-xs text-purple-600 hover:text-purple-700">
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

        {/* Metric */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Metric</p>
            <select value={config.metric} onChange={(e) => setConfig({ ...config, metric: e.target.value as ReportMetric })}
              className="w-full h-9 px-2 rounded border border-gray-200 text-sm">
              {Object.entries(metricOptions.reduce((acc, opt) => {
                if (!acc[opt.category]) acc[opt.category] = []
                acc[opt.category].push(opt)
                return acc
              }, {} as Record<string, typeof metricOptions>)).map(([category, options]) => (
                <optgroup key={category} label={category}>
                  {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </optgroup>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Dimension */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Group By</p>
            <select value={config.dimension} onChange={(e) => setConfig({ ...config, dimension: e.target.value as ReportDimension })}
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
          </CardContent>
        </Card>

        {/* Aggregation */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Aggregation</p>
            <select value={config.aggregation} onChange={(e) => setConfig({ ...config, aggregation: e.target.value as ReportAggregation })}
              className="w-full h-9 px-2 rounded border border-gray-200 text-sm">
              {aggregationOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </CardContent>
        </Card>

        {/* Filters */}
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

        {/* Save */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input placeholder="Report name" value={reportName} onChange={(e) => setReportName(e.target.value)}
              className="h-8 text-sm" />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)}
                className="rounded border-gray-300" />
              Show on Dashboard
            </label>
            <Button onClick={handleSaveReport} disabled={!reportName.trim() || saveReportMutation.isPending}
              className="w-full h-8 text-sm">
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
