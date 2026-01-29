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
import { cn } from '@/lib/utils/cn'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateAlcoholStats, calculateTotalDrinks } from '@/lib/utils/calculations'
import { Beer, Wine, Martini, Droplet } from 'lucide-react'

interface AlcoholTrackerProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
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

export function AlcoholTracker({ entries, title = 'Drinking Trends', subtitle }: AlcoholTrackerProps) {
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
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4 scrollbar-hidden">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{stats.totalDrinks}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{stats.avgPerWeek}</p>
            <p className="text-[10px] text-gray-500">Avg/Wk</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{stats.daysWithAlcoholPercent}%</p>
            <p className="text-[10px] text-gray-500">Days w/</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{stats.daysWith6PlusPercent}%</p>
            <p className="text-[10px] text-gray-500">6+ Days</p>
          </div>
        </div>

        {/* Weekly Chart - fills available space */}
        {weeklyData.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <h4 className="text-xs font-medium text-gray-700 mb-2 flex-shrink-0">Weekly Totals</h4>
            <div className="flex-1 min-h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 9 }}
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
                    formatter={(value) => [`${value}`, 'Drinks']}
                  />
                  <Bar dataKey="drinks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Type Breakdown - inline */}
        {typeBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t flex-shrink-0">
            {typeBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-gray-600">
                  {item.name}: {item.percent}%
                </span>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  )
}
