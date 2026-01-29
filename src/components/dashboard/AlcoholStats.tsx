'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { parseISO, subDays, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'

interface AlcoholStatsProps {
  entries: DailyEntryWithRelations[]
}

interface PeriodStats {
  avgWeekly: number
  totalDrinks: number
  beers: number
  seltzers: number
  wine: number
  liquor: number
  shots: number
  daysWithDrink: number
  daysWithDrinkPercent: number
  daysWith2Plus: number
  daysWith2PlusPercent: number
  daysWith6Plus: number
  daysWith6PlusPercent: number
  totalDays: number
}

function calculatePeriodStats(entries: DailyEntryWithRelations[]): PeriodStats {
  if (entries.length === 0) {
    return {
      avgWeekly: 0,
      totalDrinks: 0,
      beers: 0,
      seltzers: 0,
      wine: 0,
      liquor: 0,
      shots: 0,
      daysWithDrink: 0,
      daysWithDrinkPercent: 0,
      daysWith2Plus: 0,
      daysWith2PlusPercent: 0,
      daysWith6Plus: 0,
      daysWith6PlusPercent: 0,
      totalDays: 0,
    }
  }

  let totalDrinks = 0
  let daysWithDrink = 0
  let daysWith2Plus = 0
  let daysWith6Plus = 0
  let beers = 0
  let seltzers = 0
  let wine = 0
  let liquor = 0
  let shots = 0

  entries.forEach((entry) => {
    const dayDrinks = calculateTotalDrinks(entry)
    totalDrinks += dayDrinks

    if (dayDrinks > 0) daysWithDrink++
    if (dayDrinks >= 2) daysWith2Plus++
    if (dayDrinks >= 6) daysWith6Plus++

    beers += entry.beers || 0
    seltzers += entry.seltzers || 0
    wine += entry.wine || 0
    liquor += entry.liquor || 0
    shots += entry.shots || 0
  })

  const weeks = Math.max(entries.length / 7, 1)

  return {
    avgWeekly: Math.round((totalDrinks / weeks) * 10) / 10,
    totalDrinks: Math.round(totalDrinks),
    beers: Math.round(beers),
    seltzers: Math.round(seltzers),
    wine: Math.round(wine),
    liquor: Math.round(liquor),
    shots: Math.round(shots),
    daysWithDrink,
    daysWithDrinkPercent: Math.round((daysWithDrink / entries.length) * 100),
    daysWith2Plus,
    daysWith2PlusPercent: Math.round((daysWith2Plus / entries.length) * 100),
    daysWith6Plus,
    daysWith6PlusPercent: Math.round((daysWith6Plus / entries.length) * 100),
    totalDays: entries.length,
  }
}

export function AlcoholStats({ entries }: AlcoholStatsProps) {
  const stats = useMemo(() => {
    const today = new Date()
    const currentYear = getYear(today)
    const lastYear = currentYear - 1

    // Filter entries by time period
    const last7 = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return date >= subDays(today, 7)
    })

    const last30 = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return date >= subDays(today, 30)
    })

    const thisYear = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === currentYear
    })

    const prevYear = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === lastYear
    })

    return {
      last7: calculatePeriodStats(last7),
      last30: calculatePeriodStats(last30),
      currentYear: calculatePeriodStats(thisYear),
      lastYear: calculatePeriodStats(prevYear),
      currentYearLabel: currentYear.toString(),
      lastYearLabel: lastYear.toString(),
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Drinking Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    )
  }

  const rows = [
    {
      label: 'Avg. Weekly',
      last7: stats.last7.avgWeekly,
      last30: stats.last30.avgWeekly,
      currentYear: stats.currentYear.avgWeekly,
      lastYear: stats.lastYear.avgWeekly,
    },
    {
      label: 'Total Drinks',
      last7: stats.last7.totalDrinks,
      last30: stats.last30.totalDrinks,
      currentYear: stats.currentYear.totalDrinks,
      lastYear: stats.lastYear.totalDrinks,
    },
    {
      label: 'Beers',
      last7: stats.last7.beers,
      last30: stats.last30.beers,
      currentYear: stats.currentYear.beers,
      lastYear: stats.lastYear.beers,
    },
    {
      label: 'Seltzers',
      last7: stats.last7.seltzers,
      last30: stats.last30.seltzers,
      currentYear: stats.currentYear.seltzers,
      lastYear: stats.lastYear.seltzers,
    },
    {
      label: 'Wine',
      last7: stats.last7.wine,
      last30: stats.last30.wine,
      currentYear: stats.currentYear.wine,
      lastYear: stats.lastYear.wine,
    },
    {
      label: 'Liquor',
      last7: stats.last7.liquor,
      last30: stats.last30.liquor,
      currentYear: stats.currentYear.liquor,
      lastYear: stats.lastYear.liquor,
    },
    {
      label: 'Shots',
      last7: stats.last7.shots,
      last30: stats.last30.shots,
      currentYear: stats.currentYear.shots,
      lastYear: stats.lastYear.shots,
    },
    {
      label: 'Days w/ Drink',
      last7: stats.last7.daysWithDrink,
      last30: `${stats.last30.daysWithDrinkPercent}%`,
      currentYear: `${stats.currentYear.daysWithDrinkPercent}%`,
      lastYear: `${stats.lastYear.daysWithDrinkPercent}%`,
    },
    {
      label: 'Days 2+',
      last7: stats.last7.daysWith2Plus,
      last30: `${stats.last30.daysWith2PlusPercent}%`,
      currentYear: `${stats.currentYear.daysWith2PlusPercent}%`,
      lastYear: `${stats.lastYear.daysWith2PlusPercent}%`,
    },
    {
      label: 'Days w/ 6+',
      last7: stats.last7.daysWith6Plus,
      last30: `${stats.last30.daysWith6PlusPercent}%`,
      currentYear: `${stats.currentYear.daysWith6PlusPercent}%`,
      lastYear: `${stats.lastYear.daysWith6PlusPercent}%`,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">How Much Drinking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-500"></th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">
                  Last<br />7
                </th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">
                  Last<br />30
                </th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">
                  {stats.lastYearLabel}
                </th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">
                  {stats.currentYearLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.label}
                  className={cn(
                    idx % 2 === 0 ? 'bg-gray-50' : '',
                    'hover:bg-gray-100'
                  )}
                >
                  <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-900">
                    {row.last7 || '-'}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-900">
                    {row.last30 || '-'}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-900">
                    {row.lastYear || '-'}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-900">
                    {row.currentYear || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
