'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { parseISO, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'

interface AlcoholByTypeProps {
  entries: DailyEntryWithRelations[]
}

const TYPE_COLORS = {
  wine: { bg: 'bg-red-500', hex: '#ef4444' },
  beers: { bg: 'bg-blue-500', hex: '#3b82f6' },
  seltzers: { bg: 'bg-cyan-400', hex: '#22d3ee' },
  liquor: { bg: 'bg-orange-500', hex: '#f97316' },
  shots: { bg: 'bg-green-500', hex: '#22c55e' },
}

const TYPE_LABELS = {
  wine: 'Wine',
  beers: 'Beer',
  seltzers: 'Seltzer',
  liquor: 'Liquor',
  shots: 'Shots',
}

const TYPE_ORDER = ['wine', 'beers', 'seltzers', 'liquor', 'shots'] as const

interface YearBreakdown {
  year: number
  total: number
  byType: Record<string, { count: number; percent: number }>
}

export function AlcoholByType({ entries }: AlcoholByTypeProps) {
  const data = useMemo(() => {
    // Group entries by year
    const byYear = new Map<number, DailyEntryWithRelations[]>()

    entries.forEach((entry) => {
      const year = getYear(parseISO(entry.entry_date))
      const yearEntries = byYear.get(year) || []
      yearEntries.push(entry)
      byYear.set(year, yearEntries)
    })

    // Calculate breakdown for each year
    const yearBreakdowns: YearBreakdown[] = []

    byYear.forEach((yearEntries, year) => {
      const totals = {
        beers: 0,
        seltzers: 0,
        wine: 0,
        liquor: 0,
        shots: 0,
      }

      yearEntries.forEach((entry) => {
        totals.beers += entry.beers || 0
        totals.seltzers += entry.seltzers || 0
        totals.wine += entry.wine || 0
        totals.liquor += entry.liquor || 0
        totals.shots += entry.shots || 0
      })

      const total = totals.beers + totals.seltzers + totals.wine + totals.liquor + totals.shots

      if (total > 0) {
        const byType: Record<string, { count: number; percent: number }> = {}

        Object.entries(totals).forEach(([type, count]) => {
          byType[type] = {
            count,
            percent: Math.round((count / total) * 100),
          }
        })

        yearBreakdowns.push({ year, total, byType })
      }
    })

    // Sort by year descending
    return yearBreakdowns.sort((a, b) => b.year - a.year)
  }, [entries])

  if (entries.length === 0 || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Drinks by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find max total for scaling
  const maxTotal = Math.max(...data.map((d) => d.total))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">What Drinking</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stacked bars */}
        <div className="space-y-4">
          {data.map((yearData) => (
            <div key={yearData.year} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{yearData.year}</span>
                <span className="text-gray-500">{yearData.total} drinks</span>
              </div>

              {/* Stacked bar */}
              <div
                className="h-10 rounded-lg overflow-hidden flex"
                style={{ width: `${(yearData.total / maxTotal) * 100}%`, minWidth: '60%' }}
              >
                {TYPE_ORDER.map((type) => {
                  const typeData = yearData.byType[type]
                  if (!typeData || typeData.percent === 0) return null

                  return (
                    <div
                      key={type}
                      className={cn(
                        'h-full flex items-center justify-center text-white text-xs font-medium',
                        TYPE_COLORS[type].bg
                      )}
                      style={{ width: `${typeData.percent}%` }}
                      title={`${TYPE_LABELS[type]}: ${typeData.count} (${typeData.percent}%)`}
                    >
                      {typeData.percent >= 10 && (
                        <span className="truncate px-1">
                          {TYPE_LABELS[type]}<br />{typeData.percent}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
          {TYPE_ORDER.map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className={cn('w-3 h-3 rounded', TYPE_COLORS[type].bg)}
              />
              <span className="text-xs text-gray-600">{TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>

        {/* Detailed breakdown for most recent year */}
        {data[0] && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {data[0].year} Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TYPE_ORDER.map((type) => {
                const typeData = data[0].byType[type]
                return (
                  <div
                    key={type}
                    className="text-center p-2 bg-gray-50 rounded-lg"
                  >
                    <p className="text-lg font-bold text-gray-900">
                      {typeData?.count || 0}
                    </p>
                    <p className="text-xs text-gray-500">{TYPE_LABELS[type]}</p>
                    <p className="text-xs text-gray-400">
                      {typeData?.percent || 0}%
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
