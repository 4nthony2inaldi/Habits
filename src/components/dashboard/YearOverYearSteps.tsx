'use client'

import { useMemo, useState } from 'react'
import { parseISO, getYear, getDayOfYear, getWeek, format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailyEntryWithRelations } from '@/types/database'
import { Footprints, RotateCcw, Calendar } from 'lucide-react'

interface YearOverYearStepsProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

// Colors for different years (consistent across all year-over-year charts)
// Index 0 = current year, 1 = last year, etc.
const YEAR_COLORS = [
  '#22c55e', // green - current year
  '#3b82f6', // blue - last year
  '#f97316', // orange - 2 years ago
  '#9333ea', // purple - 3 years ago
  '#ef4444', // red - 4 years ago
]

type AggregationMode = 'daily' | 'weekly'

export function YearOverYearSteps({
  entries,
  title = 'Steps Year over Year',
  subtitle,
}: YearOverYearStepsProps) {
  const [cumulative, setCumulative] = useState(true)
  const [aggregation, setAggregation] = useState<AggregationMode>('weekly')

  const { chartData, years, maxDay, maxWeek, yearlyAverages } = useMemo(() => {
    if (entries.length === 0) {
      return { chartData: [], years: [], maxDay: 0, maxWeek: 0, yearlyAverages: new Map<number, number>() }
    }

    // Find the most recent year and most recent logged date in that year
    let maxYear = 0
    let maxLoggedDate: Date | null = null
    entries.forEach((entry) => {
      if (entry.steps === null || entry.steps === undefined) return
      const date = parseISO(entry.entry_date)
      const year = getYear(date)
      if (year > maxYear) {
        maxYear = year
        maxLoggedDate = date
      } else if (year === maxYear && maxLoggedDate && date > maxLoggedDate) {
        maxLoggedDate = date
      }
    })

    // Use the most recent logged date (or today as fallback)
    const referenceDate = maxLoggedDate || new Date()
    const currentYear = maxYear || getYear(new Date())
    const currentDayOfYear = getDayOfYear(referenceDate)
    const currentWeekOfYear = getWeek(referenceDate, { weekStartsOn: 0 })

    // Group entries by year and day of year
    const byYearAndDay = new Map<number, Map<number, number>>()
    // Also group by year and week for weekly aggregation
    const byYearAndWeek = new Map<number, Map<number, number>>()
    const yearsSet = new Set<number>()
    // Track total steps and days with data for each year (for averages)
    const yearTotals = new Map<number, { total: number; days: number }>()

    entries.forEach((entry) => {
      // Skip entries without steps data
      if (entry.steps === null || entry.steps === undefined) return

      const date = parseISO(entry.entry_date)
      const year = getYear(date)
      const dayOfYear = getDayOfYear(date)
      const weekOfYear = getWeek(date, { weekStartsOn: 0 })

      // Only include data up to the current day of year
      if (dayOfYear > currentDayOfYear) return

      yearsSet.add(year)

      // Daily aggregation
      if (!byYearAndDay.has(year)) {
        byYearAndDay.set(year, new Map())
      }
      const yearDayMap = byYearAndDay.get(year)!
      yearDayMap.set(dayOfYear, (yearDayMap.get(dayOfYear) || 0) + entry.steps)

      // Weekly aggregation
      if (!byYearAndWeek.has(year)) {
        byYearAndWeek.set(year, new Map())
      }
      const yearWeekMap = byYearAndWeek.get(year)!
      yearWeekMap.set(weekOfYear, (yearWeekMap.get(weekOfYear) || 0) + entry.steps)

      // Track totals for averaging
      const existing = yearTotals.get(year) || { total: 0, days: 0 }
      existing.total += entry.steps
      existing.days += 1
      yearTotals.set(year, existing)
    })

    // Sort years descending (current year first)
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a)

    // Calculate daily averages for each year
    const averages = new Map<number, number>()
    yearTotals.forEach((data, year) => {
      averages.set(year, Math.round(data.total / data.days))
    })

    // Build chart data based on aggregation mode
    const data: Record<string, number | string>[] = []
    const cumulativeSums = new Map<number, number>()
    sortedYears.forEach((year) => cumulativeSums.set(year, 0))

    if (aggregation === 'weekly') {
      // Weekly aggregation
      for (let week = 1; week <= currentWeekOfYear; week++) {
        const point: Record<string, number | string> = { week }

        // Get approximate date for this week for label
        const approxDay = (week - 1) * 7 + 1
        const sampleDate = new Date(currentYear, 0, approxDay)
        point.label = `Week ${week} (${format(sampleDate, 'MMM')})`

        sortedYears.forEach((year) => {
          const yearMap = byYearAndWeek.get(year)
          const weeklyValue = yearMap?.get(week) || 0

          if (cumulative) {
            const prevSum = cumulativeSums.get(year) || 0
            const newSum = prevSum + weeklyValue
            cumulativeSums.set(year, newSum)
            point[String(year)] = newSum
          } else {
            point[String(year)] = weeklyValue
          }
        })

        data.push(point)
      }
    } else {
      // Daily aggregation (original behavior)
      for (let day = 1; day <= currentDayOfYear; day++) {
        const point: Record<string, number | string> = { day }

        // Add month label for tooltip
        const sampleDate = new Date(currentYear, 0, day)
        point.label = format(sampleDate, 'MMM d')

        sortedYears.forEach((year) => {
          const yearMap = byYearAndDay.get(year)
          const dailyValue = yearMap?.get(day) || 0

          if (cumulative) {
            const prevSum = cumulativeSums.get(year) || 0
            const newSum = prevSum + dailyValue
            cumulativeSums.set(year, newSum)
            point[String(year)] = newSum
          } else {
            point[String(year)] = dailyValue
          }
        })

        data.push(point)
      }
    }

    return {
      chartData: data,
      years: sortedYears,
      maxDay: currentDayOfYear,
      maxWeek: currentWeekOfYear,
      yearlyAverages: averages,
    }
  }, [entries, cumulative, aggregation])

  if (entries.length === 0 || years.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Footprints className="h-5 w-5 text-green-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  // Generate tick values for X axis based on aggregation mode
  const xTicks = aggregation === 'weekly'
    ? [1, 5, 9, 13, 18, 22, 26, 31, 35, 39, 44, 48].filter((w) => w <= maxWeek)
    : [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335].filter((d) => d <= maxDay)

  // Format large numbers for Y axis
  const formatYAxis = (value: number) => {
    if (cumulative) {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    }
    return value.toLocaleString()
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Footprints className="h-5 w-5 text-green-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAggregation(aggregation === 'weekly' ? 'daily' : 'weekly')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={aggregation === 'weekly' ? 'Show daily' : 'Show weekly'}
          >
            <Calendar className="h-3 w-3" />
            {aggregation === 'weekly' ? 'Daily' : 'Weekly'}
          </button>
          <button
            onClick={() => setCumulative(!cumulative)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={cumulative ? 'Show per-period' : 'Show cumulative'}
          >
            <RotateCcw className="h-3 w-3" />
            {cumulative ? 'Per-period' : 'Cumulative'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {/* Daily Average KPI Overlay - shown only in cumulative mode */}
        {cumulative && years.length > 0 && yearlyAverages.size > 0 && (
          <div className="absolute top-1 left-14 z-10">
            <div className="text-xs text-gray-400">Daily Avg.</div>
            <div className="text-base font-bold text-green-600">
              {(yearlyAverages.get(years[0]) || 0).toLocaleString()}
            </div>
            {years.slice(1).map((year) => {
              const currentAvg = yearlyAverages.get(years[0]) || 0
              const compareAvg = yearlyAverages.get(year) || 0
              const diff = currentAvg - compareAvg
              const isPositive = diff >= 0
              const shortYear = String(year).slice(-2)
              return (
                <div key={year} className="text-xs text-gray-400">
                  <span className={isPositive ? 'text-green-600' : 'text-red-500'}>
                    {isPositive ? '+' : ''}{diff.toLocaleString()}
                  </span>
                  {` vs '${shortYear}`}
                </div>
              )
            })}
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={aggregation === 'weekly' ? 'week' : 'day'}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                if (aggregation === 'weekly') {
                  // Convert week number to approximate month
                  const approxDay = (value - 1) * 7 + 1
                  const date = new Date(2024, 0, approxDay)
                  return format(date, 'MMM')
                }
                const date = new Date(2024, 0, value)
                return format(date, 'MMM')
              }}
              ticks={xTicks}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              width={45}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(day, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.label
                }
                return `Day ${day}`
              }}
              formatter={(value) => [
                typeof value === 'number' ? value.toLocaleString() : value ?? 0,
                '',
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconSize={10}
            />
            {years.map((year, index) => (
              <Line
                key={year}
                type="monotone"
                dataKey={String(year)}
                name={String(year)}
                stroke={YEAR_COLORS[index % YEAR_COLORS.length]}
                strokeWidth={year === years[0] ? 2 : 1.5}
                dot={false}
                strokeOpacity={year === years[0] ? 1 : 0.7}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
