import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInDays,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  eachDayOfInterval,
} from 'date-fns'

export function getYesterday(): Date {
  return subDays(new Date(), 1)
}

export function getYesterdayString(): string {
  return format(getYesterday(), 'yyyy-MM-dd')
}

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return 'Invalid date'
  return format(d, formatStr)
}

export function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function isBeforeToday(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return isBefore(date, today)
}

export function getDaysInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end })
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const date = parseISO(dateStr)
  if (!isValid(date)) return null
  return differenceInDays(new Date(), date)
}

export type DateRange = {
  start: Date
  end: Date
  label: string
}

export function getQuickPresets(): DateRange[] {
  const today = new Date()
  const yesterday = subDays(today, 1)

  return [
    {
      label: 'Last 30 days',
      start: subDays(today, 30),
      end: yesterday,
    },
    {
      label: 'Last 90 days',
      start: subDays(today, 90),
      end: yesterday,
    },
  ]
}

// Legacy function for backwards compatibility
export function getPresetDateRanges(): DateRange[] {
  return getQuickPresets()
}

export type YearOption = {
  year: number
  start: Date
  end: Date
}

export type MonthOption = {
  year: number
  month: number // 0-indexed
  label: string
  start: Date
  end: Date
}

export function getAvailableYears(entryDates: string[]): YearOption[] {
  const years = new Set<number>()
  const today = new Date()
  const yesterday = subDays(today, 1)

  entryDates.forEach(dateStr => {
    const date = parseISO(dateStr)
    if (isValid(date)) {
      years.add(date.getFullYear())
    }
  })

  return Array.from(years)
    .sort((a, b) => b - a) // Most recent first
    .map(year => {
      const yearStart = startOfYear(new Date(year, 0, 1))
      const yearEnd = endOfYear(new Date(year, 0, 1))
      // If it's the current year, end at yesterday
      const effectiveEnd = isAfter(yearEnd, yesterday) ? yesterday : yearEnd
      return {
        year,
        start: yearStart,
        end: effectiveEnd,
      }
    })
}

export function getAvailableMonths(entryDates: string[]): MonthOption[] {
  const monthSet = new Set<string>()
  const today = new Date()
  const yesterday = subDays(today, 1)

  entryDates.forEach(dateStr => {
    const date = parseISO(dateStr)
    if (isValid(date)) {
      const key = `${date.getFullYear()}-${date.getMonth()}`
      monthSet.add(key)
    }
  })

  return Array.from(monthSet)
    .map(key => {
      const [year, month] = key.split('-').map(Number)
      const monthStart = startOfMonth(new Date(year, month, 1))
      const monthEnd = endOfMonth(new Date(year, month, 1))
      // If it's the current month, end at yesterday
      const effectiveEnd = isAfter(monthEnd, yesterday) ? yesterday : monthEnd
      return {
        year,
        month,
        label: format(new Date(year, month, 1), 'MMM yyyy'),
        start: monthStart,
        end: effectiveEnd,
      }
    })
    .sort((a, b) => {
      // Sort by year descending, then month descending
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
}

export function getEarliestDate(entryDates: string[]): Date | null {
  if (entryDates.length === 0) return null

  let earliest: Date | null = null
  entryDates.forEach(dateStr => {
    const date = parseISO(dateStr)
    if (isValid(date)) {
      if (!earliest || isBefore(date, earliest)) {
        earliest = date
      }
    }
  })
  return earliest
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

export function getYearRange(year: number): { start: Date; end: Date } {
  const date = new Date(year, 0, 1)
  return {
    start: startOfYear(date),
    end: endOfYear(date),
  }
}
