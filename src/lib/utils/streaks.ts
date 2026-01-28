import { differenceInDays, parseISO, subDays, format } from 'date-fns'

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  isStreakAtRisk: boolean
  lastEntryDate: string | null
  daysSinceLastEntry: number | null
}

export function calculateStreakInfo(entryDates: string[]): StreakInfo {
  if (entryDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isStreakAtRisk: true,
      lastEntryDate: null,
      daysSinceLastEntry: null,
    }
  }

  // Sort dates descending
  const sortedDates = [...entryDates].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const lastEntryDate = sortedDates[0]
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const daysSinceLastEntry = differenceInDays(
    new Date(),
    parseISO(lastEntryDate)
  )

  // Check if streak is at risk (no entry for yesterday)
  const isStreakAtRisk = lastEntryDate !== yesterday

  // Calculate current streak
  let currentStreak = 0
  let expectedDate = subDays(new Date(), 1) // Start from yesterday

  for (const dateStr of sortedDates) {
    const entryDate = parseISO(dateStr)
    const expected = format(expectedDate, 'yyyy-MM-dd')

    if (dateStr === expected) {
      currentStreak++
      expectedDate = subDays(expectedDate, 1)
    } else if (dateStr < expected) {
      // Gap in streak
      break
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 1

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = parseISO(sortedDates[i])
    const next = parseISO(sortedDates[i + 1])
    const diff = differenceInDays(current, next)

    if (diff === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    currentStreak,
    longestStreak,
    isStreakAtRisk,
    lastEntryDate,
    daysSinceLastEntry,
  }
}

export function getStreakMilestone(streak: number): string | null {
  const milestones = [7, 14, 30, 50, 100, 200, 365]

  for (const milestone of milestones) {
    if (streak === milestone) {
      return `${milestone} day streak!`
    }
  }

  return null
}

export function getStreakMessage(streakInfo: StreakInfo): string {
  if (streakInfo.currentStreak === 0) {
    if (streakInfo.lastEntryDate) {
      return `Start a new streak! Last logged ${streakInfo.daysSinceLastEntry} days ago.`
    }
    return 'Start your streak by logging your first day!'
  }

  const milestone = getStreakMilestone(streakInfo.currentStreak)
  if (milestone) {
    return milestone
  }

  if (streakInfo.isStreakAtRisk) {
    return `${streakInfo.currentStreak} day streak at risk! Log yesterday to keep it going.`
  }

  return `${streakInfo.currentStreak} day streak!`
}
