'use client'

import { useMemo, useState } from 'react'
import { parseISO, getYear, getDayOfYear, format } from 'date-fns'
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
import { Footprints, RotateCcw } from 'lucide-react'

interface YearOverYearStepsProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

// Colors for different years
const YEAR_COLORS = [
  '#22c55e', // green - current year
  '#3b82f6', // blue
  '#f97316', // orange
  '#9333ea', // purple
  '#ef4444', // red
]

export function YearOverYearSteps({
  entries,
  title = 'Steps Year over Year',
  subtitle,
}: YearOverYearStepsProps) {
  const [cumulative, setCumulative] = useState(true)

  const { chartData, years, maxDay } = useMemo(() => {
    if (entries.length === 0) {
      return { chartData: [], years: [], maxDay: 0 }
    }

    // Get current year and current day of year
    const now = new Date()
    const currentYear = getYear(now)
    const currentDayOfYear = getDayOfYear(now)

    // Group entries by year and day of year
    const byYearAndDay = new Map<number, Map<number, number>>()
    const yearsSet = new Set<number>()

    entries.forEach((entry) => {
      // Skip entries without steps data
      if (entry.steps === null || entry.steps === undefined) return

      const date = parseISO(entry.entry_date)
      const year = getYear(date)
      const dayOfYear = getDayOfYear(date)

      // Only include data up to the current day of year
      if (dayOfYear > currentDayOfYear) return

      yearsSet.add(year)

      if (!byYearAndDay.has(year)) {
        byYearAndDay.set(year, new Map())
      }
      const yearMap = byYearAndDay.get(year)!
      yearMap.set(dayOfYear, (yearMap.get(dayOfYear) || 0) + entry.steps)
    })

    // Sort years descending (current year first)
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a)

    // Build chart data - one entry per day of year
    const data: Record<string, number | string>[] = []

    // Calculate cumulative sums for each year
    const cumulativeSums = new Map<number, number>()
    sortedYears.forEach((year) => cumulativeSums.set(year, 0))

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

    return {
      chartData: data,
      years: sortedYears,
      maxDay: currentDayOfYear,
    }
  }, [entries, cumulative])

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

  // Generate tick values for X axis (show monthly)
  const xTicks = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335].filter(
    (d) => d <= maxDay
  )

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
        <button
          onClick={() => setCumulative(!cumulative)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title={cumulative ? 'Show daily' : 'Show cumulative'}
        >
          <RotateCcw className="h-3 w-3" />
          {cumulative ? 'Daily' : 'Cumulative'}
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10 }}
              tickFormatter={(day) => {
                const date = new Date(2024, 0, day)
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
