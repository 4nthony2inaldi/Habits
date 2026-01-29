'use client'

import { useMemo } from 'react'
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
      <div className="h-full flex flex-col p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">What Drinking</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    )
  }

  // Find max total for scaling
  const maxTotal = Math.max(...data.map((d) => d.total))

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">What Drinking</h3>

      <div className="flex-1 min-h-0 flex flex-col scrollbar-hidden">
        {/* Stacked bars */}
        <div className="space-y-3">
          {data.map((yearData) => (
            <div key={yearData.year} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{yearData.year}</span>
                <span className="text-gray-500 text-xs">{yearData.total} drinks</span>
              </div>

              {/* Stacked bar */}
              <div
                className="h-8 rounded-lg overflow-hidden flex"
                style={{ width: `${(yearData.total / maxTotal) * 100}%`, minWidth: '60%' }}
              >
                {TYPE_ORDER.map((type) => {
                  const typeData = yearData.byType[type]
                  if (!typeData || typeData.percent === 0) return null

                  return (
                    <div
                      key={type}
                      className={cn(
                        'h-full flex items-center justify-center text-white text-[10px] font-medium',
                        TYPE_COLORS[type].bg
                      )}
                      style={{ width: `${typeData.percent}%` }}
                      title={`${TYPE_LABELS[type]}: ${typeData.count} (${typeData.percent}%)`}
                    >
                      {typeData.percent >= 12 && (
                        <span className="truncate px-0.5">{typeData.percent}%</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend - compact */}
        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t">
          {TYPE_ORDER.map((type) => (
            <div key={type} className="flex items-center gap-1">
              <div className={cn('w-2.5 h-2.5 rounded', TYPE_COLORS[type].bg)} />
              <span className="text-[10px] text-gray-600">{TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
