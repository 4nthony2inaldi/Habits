'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { Calendar, ChevronDown } from 'lucide-react'
import { getPresetDateRanges, formatDateForInput } from '@/lib/utils/dates'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onRangeChange: (start: Date, end: Date) => void
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const presets = getPresetDateRanges()

  const handlePresetClick = (start: Date, end: Date) => {
    onRangeChange(start, end)
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

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        className="justify-start text-left font-normal min-w-[240px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="mr-2 h-4 w-4" />
        <span>
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
        </span>
        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[320px]">
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Quick select</div>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
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

              <div className="border-t border-gray-200 pt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Custom range</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Start</label>
                    <Input
                      type="date"
                      value={formatDateForInput(startDate)}
                      onChange={(e) => handleCustomDateChange('start', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">End</label>
                    <Input
                      type="date"
                      value={formatDateForInput(endDate)}
                      onChange={(e) => handleCustomDateChange('end', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
