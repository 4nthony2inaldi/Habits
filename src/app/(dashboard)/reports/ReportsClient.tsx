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
  subMonths,
  subYears,
  startOfYear,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  getWeek,
  getQuarter,
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
  ArrowRight,
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

const dimensionOptions: { value: ReportDimension; label: string }[] = [
  { value: 'day', label: 'By Day' },
  { value: 'week', label: 'By Week' },
  { value: 'month', label: 'By Month' },
  { value: 'quarter', label: 'By Quarter' },
  { value: 'year', label: 'By Year' },
  { value: 'habit', label: 'By Habit' },
  { value: 'event', label: 'By Event' },
  { value: 'work_location', label: 'By Work Location' },
]

const chartTypeOptions: { value: ReportChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: 'kpi', label: 'KPI', icon: Hash },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'grouped_bar', label: 'Grouped Bar', icon: BarChart3 },
  { value: 'stacked_bar', label: 'Stacked Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChartIcon },
  { value: 'area', label: 'Area', icon: LineChartIcon },
  { value: 'pie', label: 'Pie', icon: PieChartIcon },
  { value: 'table', label: 'Table', icon: Table },
]

const datePresetOptions: { value: DatePresetType; label: string }[] = [
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
]

const comparisonOptions: { value: ComparisonType; label: string }[] = [
  { value: 'none', label: 'No Comparison' },
  { value: 'previous_period', label: 'vs Previous Period' },
  { value: 'previous_year', label: 'vs Previous Year' },
]

const CHART_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316',
]

// Default report config
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

  // Report configuration state
  const [config, setConfig] = useState<ReportConfig>(defaultConfig)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedHabits, setSelectedHabits] = useState<string[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  // Saved reports state
  const [showSavedReports, setShowSavedReports] = useState(false)
  const [reportName, setReportName] = useState('')
  const [showOnDashboard, setShowOnDashboard] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)

  // Calculate date range based on preset
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

    // Calculate comparison period
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

    return {
      startDate: start,
      endDate: end,
      comparisonStartDate: compStart,
      comparisonEndDate: compEnd,
    }
  }, [config.datePreset, config.comparison, customStartDate, customEndDate])

  // Fetch entries
  const { data: entries, isLoading: entriesLoading } = useEntries({
    userId: profile.id,
    startDate,
    endDate,
  })

  // Fetch comparison entries if needed
  const { data: comparisonEntries } = useEntries({
    userId: profile.id,
    startDate: comparisonStartDate || '',
    endDate: comparisonEndDate || '',
  })

  // Fetch saved reports
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

  // Save report mutation
  const saveReportMutation = useMutation({
    mutationFn: async ({ name, showOnDashboard, id }: { name: string; showOnDashboard: boolean; id?: string }) => {
      const reportData = {
        user_id: profile.id,
        name,
        config: config as unknown as Record<string, unknown>,
        show_on_dashboard: showOnDashboard,
      }

      if (id) {
        const { error } = await supabase
          .from('saved_reports')
          .update(reportData)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_reports')
          .insert(reportData)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] })
      setReportName('')
      setEditingReportId(null)
    },
  })

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] })
    },
  })

  // Load a saved report
  const loadReport = useCallback((report: SavedReport) => {
    setConfig(report.config as ReportConfig)
    setEditingReportId(report.id)
    setReportName(report.name)
    setShowOnDashboard(report.show_on_dashboard)
    setShowSavedReports(false)
  }, [])

  // Get metric value from entry
  const getMetricValue = useCallback((entry: DailyEntryWithRelations, metric: ReportMetric): number => {
    switch (metric) {
      case 'total_drinks':
        return calculateTotalDrinks(entry)
      case 'beers':
        return entry.beers || 0
      case 'seltzers':
        return entry.seltzers || 0
      case 'wine':
        return entry.wine || 0
      case 'liquor':
        return entry.liquor || 0
      case 'shots':
        return entry.shots || 0
      case 'sober_days':
        return calculateTotalDrinks(entry) === 0 ? 1 : 0
      case 'drinking_days':
        return calculateTotalDrinks(entry) > 0 ? 1 : 0
      case 'mood_score':
        return entry.mood_score || 0
      case 'steps':
        return entry.steps || 0
      case 'coffee':
        return entry.coffee || 0
      case 'screen_time':
        return entry.screen_time || 0
      case 'healthy_habits_count':
        return entry.healthy_habits.length
      case 'life_events_count':
        return entry.life_events.length
      case 'meals_out':
        return (
          (entry.breakfast_location === 'out' ? 1 : 0) +
          (entry.lunch_location === 'out' ? 1 : 0) +
          (entry.dinner_location === 'out' ? 1 : 0)
        )
      case 'miles_traveled':
        return Math.max(entry.miles_wake || 0, entry.miles_noon || 0, entry.miles_sleep || 0)
      default:
        return 0
    }
  }, [])

  // Get dimension key from entry
  const getDimensionKey = useCallback((entry: DailyEntryWithRelations, dimension: ReportDimension): string => {
    const date = parseISO(entry.entry_date)
    switch (dimension) {
      case 'day':
        return format(date, 'MMM d, yyyy')
      case 'week':
        return `W${getWeek(date)} ${format(date, 'yyyy')}`
      case 'month':
        return format(date, 'MMM yyyy')
      case 'quarter':
        return `Q${getQuarter(date)} ${format(date, 'yyyy')}`
      case 'year':
        return format(date, 'yyyy')
      case 'work_location':
        return entry.work_location || 'Unknown'
      default:
        return entry.entry_date
    }
  }, [])

  // Process data for chart
  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return []

    // Apply filters
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

    // Handle habit/event breakdown dimensions
    if (config.dimension === 'habit') {
      const habitData: Record<string, number> = {}
      filteredEntries.forEach((entry) => {
        entry.healthy_habits.forEach((habit) => {
          const label = habitLabels[habit.habit_type] || habit.habit_type
          habitData[label] = (habitData[label] || 0) + 1
        })
      })
      return Object.entries(habitData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    }

    if (config.dimension === 'event') {
      const eventData: Record<string, number> = {}
      filteredEntries.forEach((entry) => {
        entry.life_events.forEach((event) => {
          const label = eventLabels[event.event_type] || event.event_type
          eventData[label] = (eventData[label] || 0) + 1
        })
      })
      return Object.entries(eventData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    }

    // Group by dimension
    const grouped: Record<string, { values: number[]; count: number }> = {}
    filteredEntries.forEach((entry) => {
      const key = getDimensionKey(entry, config.dimension)
      if (!grouped[key]) {
        grouped[key] = { values: [], count: 0 }
      }
      const value = getMetricValue(entry, config.metric)
      grouped[key].values.push(value)
      grouped[key].count++
    })

    // Calculate aggregation
    let result = Object.entries(grouped).map(([name, { values, count }]) => {
      let value: number
      switch (config.aggregation) {
        case 'sum':
          value = values.reduce((a, b) => a + b, 0)
          break
        case 'avg':
          value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
          break
        case 'count':
          value = count
          break
        case 'min':
          value = Math.min(...values)
          break
        case 'max':
          value = Math.max(...values)
          break
        default:
          value = values.reduce((a, b) => a + b, 0)
      }
      return { name, value: Math.round(value * 100) / 100, sortKey: name }
    })

    // Sort by date/time
    result.sort((a, b) => {
      if (config.dimension === 'work_location') return b.value - a.value
      return a.sortKey.localeCompare(b.sortKey)
    })

    // Handle cumulative
    if (config.aggregation === 'cumulative') {
      let cumulative = 0
      result = result.map((item) => {
        cumulative += item.value
        return { ...item, value: cumulative }
      })
    }

    // Handle percent
    if (config.aggregation === 'percent') {
      const total = result.reduce((sum, item) => sum + item.value, 0)
      result = result.map((item) => ({
        ...item,
        value: total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0,
      }))
    }

    return result
  }, [entries, config, selectedHabits, selectedEvents, getDimensionKey, getMetricValue])

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (!comparisonEntries || comparisonEntries.length === 0 || config.comparison === 'none') {
      return null
    }

    const total = comparisonEntries.reduce((sum, entry) => sum + getMetricValue(entry, config.metric), 0)
    const avg = comparisonEntries.length > 0 ? total / comparisonEntries.length : 0

    return {
      total,
      avg: Math.round(avg * 100) / 100,
      count: comparisonEntries.length,
    }
  }, [comparisonEntries, config, getMetricValue])

  // Calculate current period totals for KPI
  const currentTotals = useMemo(() => {
    if (!entries || entries.length === 0) return { total: 0, avg: 0, count: 0 }
    const total = entries.reduce((sum, entry) => sum + getMetricValue(entry, config.metric), 0)
    return {
      total,
      avg: Math.round((total / entries.length) * 100) / 100,
      count: entries.length,
    }
  }, [entries, config.metric, getMetricValue])

  // Calculate change percentage
  const changePercentage = useMemo(() => {
    if (!comparisonData) return null
    const currentValue = config.aggregation === 'avg' ? currentTotals.avg : currentTotals.total
    const compValue = config.aggregation === 'avg' ? comparisonData.avg : comparisonData.total
    if (compValue === 0) return null
    return Math.round(((currentValue - compValue) / compValue) * 1000) / 10
  }, [currentTotals, comparisonData, config.aggregation])

  const handleSaveReport = () => {
    if (!reportName.trim()) return
    saveReportMutation.mutate({
      name: reportName,
      showOnDashboard,
      id: editingReportId || undefined,
    })
  }

  const handleNewReport = () => {
    setConfig(defaultConfig)
    setReportName('')
    setEditingReportId(null)
    setShowOnDashboard(false)
  }

  // Render KPI chart
  const renderKPI = () => {
    const value = config.aggregation === 'avg' ? currentTotals.avg : currentTotals.total
    const metricLabel = metricOptions.find((m) => m.value === config.metric)?.label || config.metric

    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <p className="text-sm text-gray-500 mb-2">{metricLabel}</p>
        <p className="text-5xl font-bold text-purple-600">{value.toLocaleString()}</p>
        {changePercentage !== null && (
          <div className={cn(
            'flex items-center gap-1 mt-3 text-sm font-medium',
            changePercentage > 0 ? 'text-green-600' : changePercentage < 0 ? 'text-red-600' : 'text-gray-500'
          )}>
            {changePercentage > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : changePercentage < 0 ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            <span>{changePercentage > 0 ? '+' : ''}{changePercentage}%</span>
            <span className="text-gray-400 font-normal">
              vs {config.comparison === 'previous_year' ? 'last year' : 'previous period'}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">{currentTotals.count} days</p>
      </div>
    )
  }

  // Render table
  const renderTable = () => (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left p-3 font-medium text-gray-700">
              {dimensionOptions.find((d) => d.value === config.dimension)?.label.replace('By ', '')}
            </th>
            <th className="text-right p-3 font-medium text-gray-700">
              {aggregationOptions.find((a) => a.value === config.aggregation)?.label}
            </th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-3 text-gray-900">{item.name}</td>
              <td className="p-3 text-right font-medium text-gray-900">
                {item.value.toLocaleString()}{config.aggregation === 'percent' ? '%' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // Render chart based on type
  const renderChart = () => {
    if (entriesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for the selected criteria
        </div>
      )
    }

    if (config.chartType === 'kpi') {
      return renderKPI()
    }

    if (config.chartType === 'table') {
      return renderTable()
    }

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 20, left: 0, bottom: 5 },
    }

    const tooltipStyle = {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '12px',
    }

    switch (config.chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#c4b5fd" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} angle={-45} textAnchor="end" height={60} />
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Build custom charts and visualizations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSavedReports(!showSavedReports)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Saved Reports
            {savedReports && savedReports.length > 0 && (
              <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {savedReports.length}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={handleNewReport}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      {/* Saved Reports Panel */}
      {showSavedReports && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Saved Reports</h3>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              </div>
            ) : !savedReports || savedReports.length === 0 ? (
              <p className="text-gray-500 text-sm">No saved reports yet</p>
            ) : (
              <div className="space-y-2">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => loadReport(report)}
                    >
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500">
                        {(report.config as ReportConfig).metric} - {(report.config as ReportConfig).chartType}
                        {report.show_on_dashboard && ' • On Dashboard'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteReportMutation.mutate(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Panel */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Metric and Aggregation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Metric</Label>
              <select
                value={config.metric}
                onChange={(e) => setConfig({ ...config, metric: e.target.value as ReportMetric })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
              >
                {Object.entries(
                  metricOptions.reduce((acc, opt) => {
                    if (!acc[opt.category]) acc[opt.category] = []
                    acc[opt.category].push(opt)
                    return acc
                  }, {} as Record<string, typeof metricOptions>)
                ).map(([category, options]) => (
                  <optgroup key={category} label={category}>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Aggregation */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Aggregation</Label>
              <select
                value={config.aggregation}
                onChange={(e) => setConfig({ ...config, aggregation: e.target.value as ReportAggregation })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
              >
                {aggregationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Dimension */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Group By</Label>
              <select
                value={config.dimension}
                onChange={(e) => setConfig({ ...config, dimension: e.target.value as ReportDimension })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
              >
                {dimensionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Chart Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Chart Type</Label>
              <div className="flex flex-wrap gap-1">
                {chartTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setConfig({ ...config, chartType: opt.value })}
                    className={cn(
                      'p-2 rounded border transition-colors',
                      config.chartType === opt.value
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    )}
                    title={opt.label}
                  >
                    <opt.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Date Range and Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Preset */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Time Period</Label>
              <select
                value={config.datePreset}
                onChange={(e) => setConfig({ ...config, datePreset: e.target.value as DatePresetType })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
              >
                {datePresetOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Date Range */}
            {config.datePreset === 'custom' && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">From</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">To</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Comparison */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Compare To</Label>
              <select
                value={config.comparison}
                onChange={(e) => setConfig({ ...config, comparison: e.target.value as ComparisonType })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
              >
                {comparisonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filters Toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600"
            >
              {showFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showFilters ? 'Hide' : 'Show'} Filters
              {(selectedHabits.length > 0 || selectedEvents.length > 0) && (
                <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                  {selectedHabits.length + selectedEvents.length}
                </span>
              )}
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {/* Habits Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Filter by Habits</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(habitLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedHabits((prev) =>
                          prev.includes(key) ? prev.filter((h) => h !== key) : [...prev, key]
                        )
                      }}
                      className={cn(
                        'px-2 py-1 rounded text-xs border transition-colors',
                        selectedHabits.includes(key)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Events Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Filter by Events</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(eventLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedEvents((prev) =>
                          prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
                        )
                      }}
                      className={cn(
                        'px-2 py-1 rounded text-xs border transition-colors',
                        selectedEvents.includes(key)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedHabits.length > 0 || selectedEvents.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedHabits([])
                    setSelectedEvents([])
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Display */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                {metricOptions.find((m) => m.value === config.metric)?.label}
              </h3>
              <p className="text-xs text-gray-500">
                {aggregationOptions.find((a) => a.value === config.aggregation)?.label}
                {' '}{dimensionOptions.find((d) => d.value === config.dimension)?.label.toLowerCase()}
                {' • '}{startDate} to {endDate}
              </p>
            </div>
            {config.comparison !== 'none' && comparisonData && (
              <div className="text-right text-sm">
                <p className="text-gray-500">
                  Previous: {config.aggregation === 'avg' ? comparisonData.avg : comparisonData.total.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Save Report */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-48">
              <Label className="text-sm font-medium mb-2 block">Report Name</Label>
              <Input
                placeholder="My Report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnDashboard}
                  onChange={(e) => setShowOnDashboard(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show on Dashboard
              </label>
            </div>
            <Button
              onClick={handleSaveReport}
              disabled={!reportName.trim() || saveReportMutation.isPending}
            >
              {saveReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingReportId ? 'Update Report' : 'Save Report'}
            </Button>
          </div>
          {editingReportId && (
            <p className="text-xs text-gray-500 mt-2">
              Editing: {savedReports?.find((r) => r.id === editingReportId)?.name}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
