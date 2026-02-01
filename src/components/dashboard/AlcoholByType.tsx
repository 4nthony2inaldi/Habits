'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { parseISO, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { Wine, RotateCcw } from 'lucide-react'

interface AlcoholByTypeProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
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
  seltzers: 'Seltzers',
  liquor: 'Liquor',
  shots: 'Shots',
}

type DrinkType = keyof typeof TYPE_COLORS

export function AlcoholByType({ entries, title = 'Types', subtitle }: AlcoholByTypeProps) {
  const [viewMode, setViewMode] = useState<'total' | 'byYear'>('total')

  const data = useMemo(() => {
    // Calculate total breakdown for entire period
    const totalBreakdown = {
      beers: 0,
      seltzers: 0,
      wine: 0,
      liquor: 0,
      shots: 0,
    }

    // Group entries by year for by-year view
    const byYear = new Map<number, typeof totalBreakdown>()

    entries.forEach((entry) => {
      const year = getYear(parseISO(entry.entry_date))

      // Add to total
      totalBreakdown.beers += entry.beers || 0
      totalBreakdown.seltzers += entry.seltzers || 0
      totalBreakdown.wine += entry.wine || 0
      totalBreakdown.liquor += entry.liquor || 0
      totalBreakdown.shots += entry.shots || 0

      // Add to year breakdown
      const yearTotals = byYear.get(year) || { beers: 0, seltzers: 0, wine: 0, liquor: 0, shots: 0 }
      yearTotals.beers += entry.beers || 0
      yearTotals.seltzers += entry.seltzers || 0
      yearTotals.wine += entry.wine || 0
      yearTotals.liquor += entry.liquor || 0
      yearTotals.shots += entry.shots || 0
      byYear.set(year, yearTotals)
    })

    // Get years sorted descending
    const years = Array.from(byYear.keys()).sort((a, b) => b - a)

    // Calculate percentages for each year
    const yearData = years.map((year) => {
      const totals = byYear.get(year)!
      const total = totals.beers + totals.seltzers + totals.wine + totals.liquor + totals.shots
      if (total === 0) return null

      const percentages: Record<DrinkType, number> = {
        beers: Math.round((totals.beers / total) * 100),
        seltzers: Math.round((totals.seltzers / total) * 100),
        wine: Math.round((totals.wine / total) * 100),
        liquor: Math.round((totals.liquor / total) * 100),
        shots: Math.round((totals.shots / total) * 100),
      }

      return { year, total, percentages }
    }).filter(Boolean) as { year: number; total: number; percentages: Record<DrinkType, number> }[]

    // Calculate total percentages
    const totalSum = totalBreakdown.beers + totalBreakdown.seltzers + totalBreakdown.wine + totalBreakdown.liquor + totalBreakdown.shots
    const totalPercentages: Record<DrinkType, number> = totalSum > 0 ? {
      beers: Math.round((totalBreakdown.beers / totalSum) * 100),
      seltzers: Math.round((totalBreakdown.seltzers / totalSum) * 100),
      wine: Math.round((totalBreakdown.wine / totalSum) * 100),
      liquor: Math.round((totalBreakdown.liquor / totalSum) * 100),
      shots: Math.round((totalBreakdown.shots / totalSum) * 100),
    } : { beers: 0, seltzers: 0, wine: 0, liquor: 0, shots: 0 }

    // Determine type order based on current year (or total) - sorted by percentage descending
    const referencePercentages = yearData.length > 0 ? yearData[0].percentages : totalPercentages
    const typeOrder = (Object.keys(TYPE_COLORS) as DrinkType[])
      .filter((type) => {
        // Include type if it has any data in total
        return totalBreakdown[type] > 0
      })
      .sort((a, b) => referencePercentages[b] - referencePercentages[a])

    return {
      years,
      yearData,
      totalPercentages,
      totalSum,
      typeOrder,
      hasMultipleYears: years.length > 1,
    }
  }, [entries])

  if (entries.length === 0 || data.totalSum === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wine className="h-5 w-5 text-red-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    )
  }

  // For total view, we show a single column
  // For by year view, we show multiple columns
  const columns = viewMode === 'total'
    ? [{ label: 'Total', percentages: data.totalPercentages }]
    : data.yearData.map((yd, idx) => ({
        label: idx === 0 ? String(yd.year) : `'${String(yd.year).slice(-2)}`,
        percentages: yd.percentages,
      }))

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wine className="h-5 w-5 text-red-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {data.hasMultipleYears && (
          <button
            onClick={() => setViewMode(viewMode === 'total' ? 'byYear' : 'total')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={viewMode === 'total' ? 'Show by year' : 'Show total'}
          >
            <RotateCcw className="h-3 w-3" />
            {viewMode === 'total' ? 'By Year' : 'Total'}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header row with year labels */}
        <div className="flex mb-2">
          <div className="w-16 flex-shrink-0" /> {/* Spacer for row labels */}
          {columns.map((col, idx) => (
            <div key={idx} className="flex-1 text-center text-sm font-medium text-gray-700">
              {col.label}
            </div>
          ))}
        </div>

        {/* Grid of bars */}
        <div className="flex-1 flex flex-col justify-evenly gap-1">
          {data.typeOrder.map((type) => (
            <div key={type} className="flex items-center">
              {/* Row label */}
              <div className="w-16 flex-shrink-0 text-xs text-gray-600 pr-2 text-right">
                {TYPE_LABELS[type]}
              </div>

              {/* Bars for each column */}
              {columns.map((col, colIdx) => {
                const percent = col.percentages[type]
                const isFirstColumn = colIdx === 0
                const maxHeight = 48 // Max bar height in pixels

                return (
                  <div key={colIdx} className="flex-1 flex justify-center px-1">
                    <div
                      className={cn(
                        'w-full max-w-[60px] rounded-md flex items-end justify-center transition-all',
                        TYPE_COLORS[type].bg
                      )}
                      style={{
                        height: `${Math.max((percent / 100) * maxHeight, percent > 0 ? 4 : 0)}px`,
                      }}
                    >
                      {/* Show percentage inside bar for first column if tall enough */}
                      {isFirstColumn && percent >= 10 && (
                        <span className="text-white text-[10px] font-medium pb-0.5">
                          {percent}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
