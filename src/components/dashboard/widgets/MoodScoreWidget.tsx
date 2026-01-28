'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Smile, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MoodScoreWidgetProps {
  moodAverage: number
  moodTrend: number
}

export function MoodScoreWidget({ moodAverage, moodTrend }: MoodScoreWidgetProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-4 h-full flex items-center">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500">How Happy</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{moodAverage.toFixed(1)}</p>
              {moodTrend !== 0 && (
                <span
                  className={cn(
                    'flex items-center text-sm font-medium',
                    moodTrend > 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {moodTrend > 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(moodTrend).toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">avg mood score</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-50 shrink-0">
            <Smile className="h-6 w-6 text-yellow-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
