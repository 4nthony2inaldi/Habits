'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { format, parseISO } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateStepsStats } from '@/lib/utils/calculations'
import { Footprints, TrendingUp, Trophy } from 'lucide-react'

interface MovementChartProps {
  entries: DailyEntryWithRelations[]
}

export function MovementChart({ entries }: MovementChartProps) {
  const stats = useMemo(() => calculateStepsStats(entries), [entries])

  const chartData = useMemo(() => {
    return [...entries]
      .filter((e) => e.steps !== null && e.steps > 0)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
      .map((entry) => ({
        date: entry.entry_date,
        steps: entry.steps,
        formattedDate: format(parseISO(entry.entry_date), 'MMM d'),
      }))
  }, [entries])

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-gray-500">
            No step data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Footprints className="h-5 w-5 text-blue-500" />
          Movement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">
              {stats.average.toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">Avg Steps/Day</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              {stats.max.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">Best Day</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-700">
              {stats.total.toLocaleString()}
            </p>
            <p className="text-xs text-purple-600">Total Steps</p>
          </div>
        </div>

        {/* Steps Chart */}
        {chartData.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString()} steps`,
                    'Steps',
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

        {/* Top Days */}
        {topDays.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top Movement Days
            </h4>
            <div className="space-y-2">
              {topDays.map((day, index) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : index === 1
                          ? 'bg-gray-200 text-gray-700'
                          : index === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-600">{day.date}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {day.steps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
