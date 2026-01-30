'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'
import { formatDateForInput, getWeekRange } from '@/lib/utils/dates'
import type { Profile, UserGoal, DailyEntryWithRelations } from '@/types/database'
import { goalMetricOptions } from '@/types/forms'
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Loader2,
} from 'lucide-react'

interface GoalsClientProps {
  profile: Profile
  initialGoals: UserGoal[]
}

function GoalCard({
  goal,
  progress,
  onDelete,
}: {
  goal: UserGoal
  progress: { current: number; percent: number }
  onDelete: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const metricLabel =
    goalMetricOptions.find((m) => m.value === goal.metric)?.label || goal.metric

  const isMin = goal.target_type === 'min'
  const isMax = goal.target_type === 'max'
  const met = isMin
    ? progress.current >= goal.target_value
    : isMax
    ? progress.current <= goal.target_value
    : progress.current === goal.target_value

  const handleDelete = async () => {
    if (!confirm('Delete this goal?')) return
    setDeleting(true)
    await onDelete()
  }

  return (
    <Card className={cn(met ? 'border-green-200 bg-green-50' : '')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {met ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Target className="h-5 w-5 text-purple-600" />
              )}
              <h3 className="font-medium text-gray-900">{metricLabel}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {goal.target_type === 'min' && 'At least '}
              {goal.target_type === 'max' && 'At most '}
              <span className="font-bold">{goal.target_value}</span>
              {' '}per {goal.timeframe}
            </p>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>
                  {progress.current} / {goal.target_value}
                </span>
                <span>{Math.min(100, progress.percent)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    met ? 'bg-green-500' : 'bg-purple-500'
                  )}
                  style={{ width: `${Math.min(100, progress.percent)}%` }}
                />
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-500"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function GoalsClient({ profile, initialGoals }: GoalsClientProps) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [newGoal, setNewGoal] = useState<{
    metric: string
    target_type: 'min' | 'max' | 'exact' | 'streak'
    target_value: number
    timeframe: 'daily' | 'weekly' | 'monthly'
  }>({
    metric: '',
    target_type: 'min',
    target_value: 5,
    timeframe: 'weekly',
  })

  // Fetch goals
  const { data: goals } = useQuery({
    queryKey: ['goals', profile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', profile.id)
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    initialData: initialGoals,
  })

  // Fetch entries for progress calculation
  const weekRange = getWeekRange(new Date())
  const { data: entries } = useQuery({
    queryKey: ['entries-for-goals', profile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          *,
          healthy_habits (id, entry_id, habit_type),
          life_events (id, entry_id, event_type)
        `)
        .eq('user_id', profile.id)
        .gte('entry_date', formatDateForInput(weekRange.start))
        .lte('entry_date', formatDateForInput(weekRange.end))

      if (error) throw error
      return data as DailyEntryWithRelations[]
    },
  })

  // Calculate progress for each goal
  const calculateProgress = (goal: UserGoal): { current: number; percent: number } => {
    if (!entries) return { current: 0, percent: 0 }

    let current = 0

    switch (goal.metric) {
      case 'exercise':
        current = entries.filter((e) =>
          e.healthy_habits.some((h) => h.habit_type === 'exercise')
        ).length
        break
      case 'sleep_8hrs':
        current = entries.filter((e) =>
          e.healthy_habits.some((h) => h.habit_type === 'sleep_8hrs')
        ).length
        break
      case 'vitamin':
        current = entries.filter((e) =>
          e.healthy_habits.some((h) => h.habit_type === 'vitamin')
        ).length
        break
      case 'read_5pages':
        current = entries.filter((e) =>
          e.healthy_habits.some((h) => h.habit_type === 'read_5pages')
        ).length
        break
      case 'water_8cups':
        current = entries.filter((e) =>
          e.healthy_habits.some((h) => h.habit_type === 'water_8cups')
        ).length
        break
      case 'breakfast':
        // Count days with breakfast in either old format (healthy_habits) or new format (breakfast_location)
        current = entries.filter((e) =>
          e.healthy_habits.some((h) => h.habit_type === 'breakfast') || e.breakfast_location !== null
        ).length
        break
      case 'total_drinks':
        current = entries.reduce(
          (sum, e) =>
            sum +
            (e.beers || 0) +
            (e.seltzers || 0) +
            (e.wine || 0) +
            (e.liquor || 0) +
            (e.shots || 0) * 1.5,
          0
        )
        break
      case 'sober_days':
        current = entries.filter((e) => {
          const drinks =
            (e.beers || 0) +
            (e.seltzers || 0) +
            (e.wine || 0) +
            (e.liquor || 0) +
            (e.shots || 0)
          return drinks === 0
        }).length
        break
      case 'mood_avg':
        const moods = entries.filter((e) => e.mood_score !== null).map((e) => e.mood_score!)
        current = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0
        break
      case 'steps_avg':
        const steps = entries.filter((e) => e.steps !== null).map((e) => e.steps!)
        current = steps.length > 0 ? steps.reduce((a, b) => a + b, 0) / steps.length : 0
        break
      case 'events_attended':
        current = entries.reduce((sum, e) => sum + e.life_events.length, 0)
        break
    }

    const percent =
      goal.target_type === 'max'
        ? Math.round(((goal.target_value - current) / goal.target_value) * 100)
        : Math.round((current / goal.target_value) * 100)

    return { current: Math.round(current * 10) / 10, percent: Math.max(0, percent) }
  }

  // Create goal mutation
  const createGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('user_goals').insert({
        user_id: profile.id,
        metric: newGoal.metric,
        target_type: newGoal.target_type,
        target_value: newGoal.target_value,
        timeframe: newGoal.timeframe,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setShowForm(false)
      setNewGoal({ metric: '', target_type: 'min', target_value: 5, timeframe: 'weekly' })
    },
  })

  // Delete goal mutation
  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('user_goals')
        .update({ active: false, archived_at: new Date().toISOString() })
        .eq('id', goalId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600">Set and track your personal targets</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* New Goal Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create New Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select
                value={newGoal.metric}
                onChange={(e) => setNewGoal({ ...newGoal, metric: e.target.value })}
              >
                <option value="">Select a metric...</option>
                {Object.entries(
                  goalMetricOptions.reduce((acc, opt) => {
                    acc[opt.category] = acc[opt.category] || []
                    acc[opt.category].push(opt)
                    return acc
                  }, {} as Record<string, typeof goalMetricOptions>)
                ).map(([category, options]) => (
                  <optgroup key={category} label={category}>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select
                  value={newGoal.target_type}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      target_type: e.target.value as 'min' | 'max',
                    })
                  }
                >
                  <option value="min">At least</option>
                  <option value="max">At most</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  min={0}
                  value={newGoal.target_value}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select
                value={newGoal.timeframe}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    timeframe: e.target.value as 'daily' | 'weekly' | 'monthly',
                  })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => createGoal.mutate()}
                disabled={!newGoal.metric || createGoal.isPending}
              >
                {createGoal.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Create Goal
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {goals && goals.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Active Goals (This Week)
          </h2>
          <div className="grid gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={calculateProgress(goal)}
                onDelete={() => deleteGoal.mutate(goal.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No active goals</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suggested Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suggested Goals</CardTitle>
          <CardDescription>Popular goals to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {[
              { metric: 'exercise', target: 5, type: 'min', label: 'Exercise 5x per week' },
              { metric: 'total_drinks', target: 10, type: 'max', label: 'Max 10 drinks per week' },
              { metric: 'sober_days', target: 3, type: 'min', label: '3+ sober days per week' },
              { metric: 'sleep_8hrs', target: 5, type: 'min', label: '8 hrs sleep 5x per week' },
            ].map((suggestion) => {
              const exists = goals?.some((g) => g.metric === suggestion.metric)
              return (
                <button
                  key={suggestion.metric}
                  onClick={() => {
                    if (!exists) {
                      setNewGoal({
                        metric: suggestion.metric,
                        target_type: suggestion.type as 'min' | 'max',
                        target_value: suggestion.target,
                        timeframe: 'weekly',
                      })
                      setShowForm(true)
                    }
                  }}
                  disabled={exists}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border text-left',
                    exists
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-purple-50 hover:border-purple-200'
                  )}
                >
                  <span>{suggestion.label}</span>
                  {exists ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Plus className="h-4 w-4 text-purple-500" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
