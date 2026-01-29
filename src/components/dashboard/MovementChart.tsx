'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils/cn'
import { format, parseISO } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateStepsStats } from '@/lib/utils/calculations'
import { Footprints, RefreshCw } from 'lucide-react'

type ViewMode = 'daily' | 'monthly'

interface MovementChartProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

export function MovementChart({ entries, title = 'Movement', subtitle }: MovementChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const stats = useMemo(() => calculateStepsStats(entries), [entries])

  const dailyChartData = useMemo(() => {
    return [...entries]
      .filter((e) => e.steps !== null && e.steps > 0)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
      .map((entry) => ({
        date: entry.entry_date,
        steps: entry.steps,
        formattedDate: format(parseISO(entry.entry_date), 'MMM d'),
      }))
  }, [entries])

  const monthlyChartData = useMemo(() => {
    const validEntries = entries.filter((e) => e.steps !== null && e.steps > 0)

    // Group by month
    const monthMap = new Map<string, { total: number; count: number }>()
    validEntries.forEach((entry) => {
      const monthKey = format(parseISO(entry.entry_date), 'yyyy-MM')
      const existing = monthMap.get(monthKey) || { total: 0, count: 0 }
      monthMap.set(monthKey, {
        total: existing.total + (entry.steps || 0),
        count: existing.count + 1,
      })
    })

    // Convert to chart data
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, data]) => ({
        date: monthKey,
        steps: Math.round(data.total / data.count),
        formattedDate: format(parseISO(`${monthKey}-01`), 'MMM yy'),
      }))
  }, [entries])

  const chartData = viewMode === 'daily' ? dailyChartData : monthlyChartData

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'daily' ? 'monthly' : 'daily'))
  }

  const topDays = useMemo(() => {
    return [...entries]
      .filter((e) => e.steps !== null && e.steps > 0)
      .sort((a, b) => (b.steps || 0) - (a.steps || 0))
      .slice(0, 5)
      .map((entry) => ({
        date: format(parseISO(entry.entry_date), 'MMM d, yyyy'),
        steps: entry.steps!.toLocaleString(),
      }))
  }, [entries])

  if (stats.daysTracked === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Footprints className="h-5 w-5 text-blue-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No step data available
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Footprints className="h-5 w-5 text-blue-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <button
          onClick={toggleViewMode}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          title={viewMode === 'daily' ? 'Switch to monthly average' : 'Switch to daily view'}
        >
          <RefreshCw className="h-3 w-3" />
          {viewMode === 'daily' ? 'Daily' : 'Monthly'}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 scrollbar-hidden">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-700">
              {stats.average.toLocaleString()}
            </p>
            <p className="text-[10px] text-blue-600">Avg/Day</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-700">
              {stats.max.toLocaleString()}
            </p>
            <p className="text-[10px] text-green-600">Best</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-lg font-bold text-purple-700">
              {stats.total.toLocaleString()}
            </p>
            <p className="text-[10px] text-purple-600">Total</p>
          </div>
        </div>

        {/* Steps Chart */}
        {chartData.length > 1 && (
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString()}`,
                    viewMode === 'daily' ? 'Steps' : 'Avg Steps/Day',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="steps"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
