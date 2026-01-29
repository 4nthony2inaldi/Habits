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

export function getPresetDateRanges(): DateRange[] {
  const today = new Date()
  const yesterday = subDays(today, 1)

  return [
    {
      label: 'Last 7 days',
      start: subDays(today, 7),
      end: yesterday,
    },
    {
      label: 'Last 30 days',
      start: subDays(today, 30),
      end: yesterday,
    },
    {
      label: 'This week',
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: yesterday,
    },
    {
      label: 'Last week',
      start: startOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
      end: endOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
    },
    {
      label: 'This month',
      start: startOfMonth(today),
      end: yesterday,
    },
    {
      label: 'Last month',
      start: startOfMonth(subDays(startOfMonth(today), 1)),
      end: endOfMonth(subDays(startOfMonth(today), 1)),
    },
    {
      label: 'This year',
      start: startOfYear(today),
      end: yesterday,
    },
    {
      label: 'Last year',
      start: startOfYear(subDays(startOfYear(today), 1)),
      end: endOfYear(subDays(startOfYear(today), 1)),
    },
    {
      label: 'All Time',
      start: new Date(2020, 0, 1), // Jan 1, 2020 as a reasonable "all time" start
      end: yesterday,
    },
  ]
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
