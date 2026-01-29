'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'

interface MoodChartProps {
  entries: DailyEntryWithRelations[]
}

export function MoodChart({ entries }: MoodChartProps) {
  const chartData = useMemo(() => {
    return [...entries]
      .filter((e) => e.mood_score !== null)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
      .map((entry) => ({
        date: entry.entry_date,
        mood: entry.mood_score,
        formattedDate: format(parseISO(entry.entry_date), 'MMM d'),
      }))
  }, [entries])

  if (chartData.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Mood Trend</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No mood data available for this period
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Mood Trend</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={25}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              labelFormatter={(value) => `${value}`}
              formatter={(value) => [`${value}/10`, 'Mood']}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#8b5cf6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
