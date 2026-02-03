'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subDays, isAfter } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import {
  getQuickPresets,
  formatDateForInput,
  type YearOption,
  type MonthOption,
} from '@/lib/utils/dates'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onRangeChange: (start: Date, end: Date) => void
  className?: string
  // Optional: pass entry dates to compute available years/months
  entryDates?: string[]
  availableYears?: YearOption[]
  availableMonths?: MonthOption[]
  earliestDate?: Date | null
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className,
  availableYears = [],
  availableMonths = [],
  earliestDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'quick' | 'months' | 'custom'>('quick')
  const quickPresets = getQuickPresets()
  const yesterday = subDays(new Date(), 1)

  // Group months by year for display
  const monthsByYear = useMemo(() => {
    const grouped: Record<number, MonthOption[]> = {}
    availableMonths.forEach(month => {
      if (!grouped[month.year]) {
        grouped[month.year] = []
      }
      grouped[month.year].push(month)
    })
    // Sort months within each year (Jan first)
    Object.keys(grouped).forEach(year => {
      grouped[Number(year)].sort((a, b) => a.month - b.month)
    })
    return grouped
  }, [availableMonths])

  // Years sorted most recent first
  const sortedYears = useMemo(() => {
    return Object.keys(monthsByYear)
      .map(Number)
      .sort((a, b) => b - a)
  }, [monthsByYear])

  const handlePresetClick = (start: Date, end: Date) => {
    onRangeChange(start, end)
    setSelectedMonths(new Set())
    setIsOpen(false)
  }

  const handleYearClick = (year: YearOption) => {
    onRangeChange(year.start, year.end)
    setSelectedMonths(new Set())
    setIsOpen(false)
  }

  const toggleMonth = (month: MonthOption) => {
    const key = `${month.year}-${month.month}`
    const newSelected = new Set(selectedMonths)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedMonths(newSelected)
  }

  const applySelectedMonths = () => {
    if (selectedMonths.size === 0) {
      setIsOpen(false)
      return
    }

    // Find the earliest and latest months from selection
    const selectedMonthOptions = availableMonths.filter(m =>
      selectedMonths.has(`${m.year}-${m.month}`)
    )

    if (selectedMonthOptions.length === 0) {
      setIsOpen(false)
      return
    }

    // Sort by date
    selectedMonthOptions.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    const earliest = selectedMonthOptions[0]
    const latest = selectedMonthOptions[selectedMonthOptions.length - 1]

    // Get the full date range spanning all selected months
    const rangeStart = startOfMonth(new Date(earliest.year, earliest.month, 1))
    let rangeEnd = endOfMonth(new Date(latest.year, latest.month, 1))

    // Don't go past yesterday
    if (isAfter(rangeEnd, yesterday)) {
      rangeEnd = yesterday
    }

    onRangeChange(rangeStart, rangeEnd)
    setIsOpen(false)
  }

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    const date = new Date(value)
    if (type === 'start') {
      onRangeChange(date, endDate)
    } else {
      onRangeChange(startDate, date)
    }
  }

  // Format min date for input
  const minDateStr = earliestDate ? formatDateForInput(earliestDate) : undefined
  const maxDateStr = formatDateForInput(yesterday)

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        className="h-9 justify-center text-left font-normal px-2 sm:px-3 sm:min-w-[200px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline text-sm">
          {format(startDate, 'M/d/yy')} - {format(endDate, 'M/d/yy')}
        </span>
        <ChevronDown className="hidden sm:block ml-auto h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-1/2 -translate-x-1/2 top-24 sm:absolute sm:left-0 sm:translate-x-0 sm:top-full sm:mt-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[340px] max-w-[360px] mx-auto">
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex gap-1 border-b border-gray-200 pb-2">
                <button
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
                    activeTab === 'quick'
                      ? 'text-purple-700 border-b-2 border-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  onClick={() => setActiveTab('quick')}
                >
                  Quick
                </button>
                {availableMonths.length > 0 && (
                  <button
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
                      activeTab === 'months'
                        ? 'text-purple-700 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                    onClick={() => setActiveTab('months')}
                  >
                    Months
                  </button>
                )}
                <button
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
                    activeTab === 'custom'
                      ? 'text-purple-700 border-b-2 border-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  onClick={() => setActiveTab('custom')}
                >
                  Custom
                </button>
              </div>

              {/* Quick presets + Years */}
              {activeTab === 'quick' && (
                <div className="space-y-3">
                  {/* Quick presets */}
                  <div className="grid grid-cols-2 gap-2">
                    {quickPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        className="justify-start text-sm"
                        onClick={() => handlePresetClick(preset.start, preset.end)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {/* Years with data */}
                  {availableYears.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-gray-500 pt-2 border-t border-gray-100">
                        Full Years
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {availableYears.map((year) => (
                          <Button
                            key={year.year}
                            variant="outline"
                            size="sm"
                            className="text-sm"
                            onClick={() => handleYearClick(year)}
                          >
                            {year.year}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Month selector */}
              {activeTab === 'months' && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500">
                    Select one or more months
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-4">
                    {sortedYears.map(year => (
                      <div key={year}>
                        <div className="text-sm font-semibold text-gray-700 mb-2 sticky top-0 bg-white">
                          {year}
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {monthsByYear[year].map(month => {
                            const key = `${month.year}-${month.month}`
                            const isSelected = selectedMonths.has(key)
                            return (
                              <button
                                key={key}
                                onClick={() => toggleMonth(month)}
                                className={cn(
                                  'relative px-2 py-1.5 text-xs rounded transition-colors',
                                  isSelected
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )}
                              >
                                {format(new Date(month.year, month.month, 1), 'MMM')}
                                {isSelected && (
                                  <Check className="absolute top-0.5 right-0.5 h-3 w-3" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedMonths.size > 0 && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                      {selectedMonths.size} month{selectedMonths.size !== 1 ? 's' : ''} selected
                    </div>
                  )}
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={applySelectedMonths}
                    disabled={selectedMonths.size === 0}
                  >
                    Apply Selection
                  </Button>
                </div>
              )}

              {/* Custom range */}
              {activeTab === 'custom' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Start</label>
                      <Input
                        type="date"
                        value={formatDateForInput(startDate)}
                        min={minDateStr}
                        max={maxDateStr}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End</label>
                      <Input
                        type="date"
                        value={formatDateForInput(endDate)}
                        min={minDateStr}
                        max={maxDateStr}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  {earliestDate && (
                    <div className="text-xs text-gray-400">
                      Data available from {format(earliestDate, 'MMM d, yyyy')}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
