'use client'

import { useMemo } from 'react'
import type { DailyEntryWithRelations } from '@/types/database'
import {
  calculateHealthScore,
  calculateBusyScore,
  calculateMoodStats,
  calculateAlcoholStats,
  calculateStepsStats,
  calculateHabitCompletionRates,
  getWorkLocationBreakdown,
} from '@/lib/utils/calculations'
import { habitTypes } from '@/types/forms'

export function useStats(entries: DailyEntryWithRelations[] | undefined) {
  return useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        healthScore: 0,
        busyScore: 0,
        moodStats: { average: 0, min: 0, max: 0, trend: 0 },
        alcoholStats: {
          totalDrinks: 0,
          avgPerWeek: 0,
          daysWithAlcohol: 0,
          daysWithAlcoholPercent: 0,
          daysWith2Plus: 0,
          daysWith2PlusPercent: 0,
          daysWith6Plus: 0,
          daysWith6PlusPercent: 0,
          byType: { beers: 0, seltzers: 0, wine: 0, liquor: 0, shots: 0 },
        },
        stepsStats: { total: 0, average: 0, max: 0, minSteps: 0, daysTracked: 0 },
        habitRates: {} as Record<string, number>,
        workLocationBreakdown: {
          home: { count: 0, percent: 0 },
          office: { count: 0, percent: 0 },
          field: { count: 0, percent: 0 },
          off: { count: 0, percent: 0 },
        },
        totalDays: 0,
      }
    }

    return {
      healthScore: calculateHealthScore(entries),
      busyScore: calculateBusyScore(entries),
      moodStats: calculateMoodStats(entries),
      alcoholStats: calculateAlcoholStats(entries),
      stepsStats: calculateStepsStats(entries),
      habitRates: calculateHabitCompletionRates(entries, habitTypes),
      workLocationBreakdown: getWorkLocationBreakdown(entries),
      totalDays: entries.length,
    }
  }, [entries])
}
