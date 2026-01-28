'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateAlcoholStats, calculateTotalDrinks } from '@/lib/utils/calculations'
import { Beer, Wine, Martini, Droplet } from 'lucide-react'

interface AlcoholTrackerProps {
  entries: DailyEntryWithRelations[]
}

const TYPE_COLORS = {
  beers: '#f59e0b',
  seltzers: '#06b6d4',
  wine: '#dc2626',
  liquor: '#8b5cf6',
  shots: '#ec4899',
}

const TYPE_LABELS = {
  beers: 'Beer',
  seltzers: 'Seltzer',
  wine: 'Wine',
  liquor: 'Liquor',
  shots: 'Shots',
}

export function AlcoholTracker({ entries }: AlcoholTrackerProps) {
  const stats = useMemo(() => calculateAlcoholStats(entries), [entries])

  const weeklyData = useMemo(() => {
    const weeks = new Map<string, number>()

    entries.forEach((entry) => {
      const date = parseISO(entry.entry_date)
      const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')
      const drinks = calculateTotalDrinks(entry)
      weeks.set(weekStart, (weeks.get(weekStart) || 0) + drinks)
    })

    return Array.from(weeks.entries())
      .map(([week, total]) => ({
        week,
        drinks: Math.round(total * 10) / 10,
      }))
      .slice(-8) // Last 8 weeks
  }, [entries])

  const typeBreakdown = useMemo(() => {
    const total =
      stats.byType.beers +
      stats.byType.seltzers +
      stats.byType.wine +
      stats.byType.liquor +
      stats.byType.shots

    if (total === 0) return []

    return Object.entries(stats.byType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: TYPE_LABELS[type as keyof typeof TYPE_LABELS],
        value: count,
        color: TYPE_COLORS[type as keyof typeof TYPE_COLORS],
        percent: Math.round((count / total) * 100),
      }))
  }, [stats.byType])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Alcohol Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.totalDrinks}</p>
            <p className="text-xs text-gray-500">Total Drinks</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.avgPerWeek}</p>
            <p className="text-xs text-gray-500">Avg/Week</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {stats.daysWithAlcoholPercent}%
            </p>
            <p className="text-xs text-gray-500">Days w/ Alcohol</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {stats.daysWith6PlusPercent}%
            </p>
            <p className="text-xs text-gray-500">Days w/ 6+</p>
          </div>
        </div>

        {/* Weekly Chart */}
        {weeklyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Totals</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value} drinks`, 'Total']}
                  />
                  <Bar dataKey="drinks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Type Breakdown */}
        {typeBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">By Type</h4>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {typeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {typeBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">
                      {item.name}: {item.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  )
}
