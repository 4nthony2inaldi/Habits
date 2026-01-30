import type { DailyEntryWithRelations, HabitType } from '@/types/database'

// Habit weights for health score calculation
const habitWeights: Record<HabitType, number> = {
  sleep_8hrs: 15,
  breakfast: 10,
  vitamin: 10,
  water_8cups: 15,
  cooked_dinner: 5,
  exercise: 20,
  read_5pages: 5,
  family_interaction: 5,
  family_phone: 5,
  family_in_person: 5,
  ate_fruit: 10,
  ate_vegetables: 10,
  journaled: 5,
}

export function calculateHealthScore(entries: DailyEntryWithRelations[]): number {
  if (entries.length === 0) return 0

  let totalScore = 0
  const maxPossiblePerDay = Object.values(habitWeights).reduce((a, b) => a + b, 0)

  entries.forEach((entry) => {
    const dayScore = entry.healthy_habits.reduce((score, habit) => {
      return score + (habitWeights[habit.habit_type] || 0)
    }, 0)
    totalScore += dayScore
  })

  const maxPossible = maxPossiblePerDay * entries.length
  return Math.round((totalScore / maxPossible) * 100)
}

export function calculateBusyScore(entries: DailyEntryWithRelations[]): number {
  if (entries.length === 0) return 0

  let totalScore = 0

  entries.forEach((entry) => {
    // Work days count
    if (entry.work_location && entry.work_location !== 'off') {
      totalScore += 1
    }

    // Events count (0.5 each)
    totalScore += entry.life_events.length * 0.5

    // Travel days count (2 points)
    const travelEvents = entry.life_events.filter(
      (e) => e.event_type === 'flight' || e.event_type === 'train'
    )
    if (travelEvents.length > 0) {
      totalScore += 2
    }
  })

  // Normalize to 0-100 scale (assuming max busy score of ~5 per day)
  const normalizedScore = (totalScore / (entries.length * 5)) * 100
  return Math.min(100, Math.round(normalizedScore))
}

export function calculateTotalDrinks(entry: DailyEntryWithRelations): number {
  return (
    (entry.beers || 0) +
    (entry.seltzers || 0) +
    (entry.wine || 0) +
    (entry.liquor || 0) +
    (entry.shots || 0)
  )
}

export function calculateAlcoholStats(entries: DailyEntryWithRelations[]) {
  if (entries.length === 0) {
    return {
      totalDrinks: 0,
      avgPerWeek: 0,
      daysWithAlcohol: 0,
      daysWithAlcoholPercent: 0,
      daysWith2Plus: 0,
      daysWith2PlusPercent: 0,
      daysWith6Plus: 0,
      daysWith6PlusPercent: 0,
      byType: { beers: 0, seltzers: 0, wine: 0, liquor: 0, shots: 0 },
    }
  }

  let totalDrinks = 0
  let daysWithAlcohol = 0
  let daysWith2Plus = 0
  let daysWith6Plus = 0
  const byType = { beers: 0, seltzers: 0, wine: 0, liquor: 0, shots: 0 }

  entries.forEach((entry) => {
    const dayDrinks = calculateTotalDrinks(entry)
    totalDrinks += dayDrinks

    if (dayDrinks > 0) daysWithAlcohol++
    if (dayDrinks >= 2) daysWith2Plus++
    if (dayDrinks >= 6) daysWith6Plus++

    byType.beers += entry.beers || 0
    byType.seltzers += entry.seltzers || 0
    byType.wine += entry.wine || 0
    byType.liquor += entry.liquor || 0
    byType.shots += entry.shots || 0
  })

  const weeks = entries.length / 7

  return {
    totalDrinks: Math.round(totalDrinks * 10) / 10,
    avgPerWeek: weeks > 0 ? Math.round((totalDrinks / weeks) * 10) / 10 : 0,
    daysWithAlcohol,
    daysWithAlcoholPercent: Math.round((daysWithAlcohol / entries.length) * 100),
    daysWith2Plus,
    daysWith2PlusPercent: Math.round((daysWith2Plus / entries.length) * 100),
    daysWith6Plus,
    daysWith6PlusPercent: Math.round((daysWith6Plus / entries.length) * 100),
    byType,
  }
}

export function calculateMoodStats(entries: DailyEntryWithRelations[]) {
  const entriesWithMood = entries.filter((e) => e.mood_score !== null)

  if (entriesWithMood.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      trend: 0,
    }
  }

  const scores = entriesWithMood.map((e) => e.mood_score!)
  const average = scores.reduce((a, b) => a + b, 0) / scores.length

  // Calculate trend (compare last half to first half)
  const midpoint = Math.floor(scores.length / 2)
  if (midpoint > 0) {
    const firstHalf = scores.slice(0, midpoint)
    const secondHalf = scores.slice(midpoint)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const trend = secondAvg - firstAvg

    return {
      average: Math.round(average * 10) / 10,
      min: Math.min(...scores),
      max: Math.max(...scores),
      trend: Math.round(trend * 10) / 10,
    }
  }

  return {
    average: Math.round(average * 10) / 10,
    min: Math.min(...scores),
    max: Math.max(...scores),
    trend: 0,
  }
}

export function calculateStepsStats(entries: DailyEntryWithRelations[]) {
  const entriesWithSteps = entries.filter((e) => e.steps !== null && e.steps > 0)

  if (entriesWithSteps.length === 0) {
    return {
      total: 0,
      average: 0,
      max: 0,
      minSteps: 0,
      daysTracked: 0,
    }
  }

  const steps = entriesWithSteps.map((e) => e.steps!)
  const total = steps.reduce((a, b) => a + b, 0)

  return {
    total,
    average: Math.round(total / entriesWithSteps.length),
    max: Math.max(...steps),
    minSteps: Math.min(...steps),
    daysTracked: entriesWithSteps.length,
  }
}

export function calculateHabitCompletionRates(
  entries: DailyEntryWithRelations[],
  habits: HabitType[]
): Record<HabitType, number> {
  if (entries.length === 0) {
    return habits.reduce((acc, h) => ({ ...acc, [h]: 0 }), {} as Record<HabitType, number>)
  }

  const rates: Record<string, number> = {}

  habits.forEach((habit) => {
    const completed = entries.filter((e) =>
      e.healthy_habits.some((h) => h.habit_type === habit)
    ).length
    rates[habit] = Math.round((completed / entries.length) * 100)
  })

  return rates as Record<HabitType, number>
}

export function calculateStreak(entries: DailyEntryWithRelations[]): number {
  if (entries.length === 0) return 0

  // Sort entries by date descending
  const sorted = [...entries].sort(
    (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  )

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // Start from yesterday
  currentDate.setDate(currentDate.getDate() - 1)

  for (const entry of sorted) {
    const entryDate = new Date(entry.entry_date)
    entryDate.setHours(0, 0, 0, 0)

    if (entryDate.getTime() === currentDate.getTime()) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (entryDate.getTime() < currentDate.getTime()) {
      break
    }
  }

  return streak
}

export function getWorkLocationBreakdown(entries: DailyEntryWithRelations[]) {
  const breakdown = { home: 0, office: 0, field: 0, off: 0, null: 0 }

  entries.forEach((entry) => {
    const loc = entry.work_location || 'null'
    if (loc in breakdown) {
      breakdown[loc as keyof typeof breakdown]++
    }
  })

  const total = entries.length
  return {
    home: { count: breakdown.home, percent: Math.round((breakdown.home / total) * 100) },
    office: { count: breakdown.office, percent: Math.round((breakdown.office / total) * 100) },
    field: { count: breakdown.field, percent: Math.round((breakdown.field / total) * 100) },
    off: { count: breakdown.off, percent: Math.round((breakdown.off / total) * 100) },
  }
}
