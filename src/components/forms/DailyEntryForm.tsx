'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HabitCheckboxGroup } from './HabitCheckboxGroup'
import { EventCheckboxGroup } from './EventCheckboxGroup'
import { useCreateEntry, useEntryByDate } from '@/lib/hooks/useEntries'
import { type DailyEntryFormData, workLocationLabels } from '@/types/forms'
import { getYesterdayString, formatDateForInput, isBeforeToday } from '@/lib/utils/dates'
import type { Profile, HabitType, EventType } from '@/types/database'
import { Smile, Briefcase, Beer, Coffee, Footprints, MapPin, Sparkles } from 'lucide-react'

interface DailyEntryFormProps {
  profile: Profile
}

export function DailyEntryForm({ profile }: DailyEntryFormProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(getYesterdayString())
  const { data: existingEntry, isLoading: loadingEntry } = useEntryByDate(
    profile.id,
    selectedDate
  )
  const createEntry = useCreateEntry()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DailyEntryFormData>({
    defaultValues: {
      entry_date: selectedDate,
      mood_score: 5,
      work_location: null,
      beers: 0,
      seltzers: 0,
      wine: 0,
      liquor: 0,
      shots: 0,
      coffee: 0,
      steps: null,
      screen_time: null,
      sex: 0,
      city_wake: null,
      miles_wake: null,
      city_noon: null,
      miles_noon: null,
      city_sleep: null,
      miles_sleep: null,
      best_part: null,
      notes: null,
      healthy_habits: [],
      life_events: [],
    },
  })

  // Load existing entry data when date changes
  useEffect(() => {
    if (existingEntry) {
      reset({
        entry_date: existingEntry.entry_date,
        mood_score: existingEntry.mood_score,
        work_location: existingEntry.work_location,
        beers: existingEntry.beers,
        seltzers: existingEntry.seltzers,
        wine: existingEntry.wine,
        liquor: existingEntry.liquor,
        shots: existingEntry.shots,
        coffee: existingEntry.coffee,
        steps: existingEntry.steps,
        screen_time: existingEntry.screen_time,
        sex: existingEntry.sex,
        city_wake: existingEntry.city_wake,
        miles_wake: existingEntry.miles_wake,
        city_noon: existingEntry.city_noon,
        miles_noon: existingEntry.miles_noon,
        city_sleep: existingEntry.city_sleep,
        miles_sleep: existingEntry.miles_sleep,
        best_part: existingEntry.best_part,
        notes: existingEntry.notes,
        healthy_habits: existingEntry.healthy_habits.map((h) => h.habit_type) as HabitType[],
        life_events: existingEntry.life_events.map((e) => e.event_type) as EventType[],
      })
    } else if (!loadingEntry) {
      reset({
        entry_date: selectedDate,
        mood_score: 5,
        work_location: null,
        beers: 0,
        seltzers: 0,
        wine: 0,
        liquor: 0,
        shots: 0,
        coffee: 0,
        steps: null,
        screen_time: null,
        sex: 0,
        city_wake: null,
        miles_wake: null,
        city_noon: null,
        miles_noon: null,
        city_sleep: null,
        miles_sleep: null,
        best_part: null,
        notes: null,
        healthy_habits: [],
        life_events: [],
      })
    }
  }, [existingEntry, loadingEntry, selectedDate, reset])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (isBeforeToday(newDate)) {
      setSelectedDate(newDate)
      setValue('entry_date', newDate)
    }
  }

  const onSubmit = async (data: DailyEntryFormData) => {
    try {
      await createEntry.mutateAsync({
        userId: profile.id,
        data,
      })
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save entry:', error)
    }
  }

  const hiddenFields = profile.hidden_fields || []
  const showLocationTracking = !hiddenFields.includes('location_tracking')

  // Calculate max date (yesterday)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const maxDate = formatDateForInput(yesterday)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entry Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="entry_date">Date (entries are always for past days)</Label>
            <Input
              id="entry_date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={maxDate}
              className="max-w-xs"
            />
            {existingEntry && (
              <p className="text-sm text-amber-600">
                An entry exists for this date. Your changes will update it.
              </p>
            )}
            {errors.entry_date && (
              <p className="text-sm text-red-500">{errors.entry_date.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mood & Work */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smile className="h-5 w-5 text-yellow-500" />
            Mood & Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mood Score (0-10)</Label>
            <Controller
              name="mood_score"
              control={control}
              render={({ field }) => (
                <Slider
                  min={0}
                  max={10}
                  value={field.value ?? 5}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Work Location</Label>
            <Controller
              name="work_location"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                >
                  <option value="">Select...</option>
                  {Object.entries(workLocationLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alcohol Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Beer className="h-5 w-5 text-amber-500" />
            Alcohol Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {!hiddenFields.includes('beers') && (
              <div className="space-y-2">
                <Label htmlFor="beers">Beers (0-10)</Label>
                <Input
                  id="beers"
                  type="number"
                  min={0}
                  max={10}
                  {...register('beers', { valueAsNumber: true })}
                />
              </div>
            )}
            {!hiddenFields.includes('seltzers') && (
              <div className="space-y-2">
                <Label htmlFor="seltzers">Seltzers (0-10)</Label>
                <Input
                  id="seltzers"
                  type="number"
                  min={0}
                  max={10}
                  {...register('seltzers', { valueAsNumber: true })}
                />
              </div>
            )}
            {!hiddenFields.includes('wine') && (
              <div className="space-y-2">
                <Label htmlFor="wine">Wine (0-10)</Label>
                <Input
                  id="wine"
                  type="number"
                  min={0}
                  max={10}
                  {...register('wine', { valueAsNumber: true })}
                />
              </div>
            )}
            {!hiddenFields.includes('liquor') && (
              <div className="space-y-2">
                <Label htmlFor="liquor">Liquor drinks (0-10)</Label>
                <Input
                  id="liquor"
                  type="number"
                  min={0}
                  max={10}
                  {...register('liquor', { valueAsNumber: true })}
                />
              </div>
            )}
            {!hiddenFields.includes('shots') && (
              <div className="space-y-2">
                <Label htmlFor="shots">Shots (0-5)</Label>
                <Input
                  id="shots"
                  type="number"
                  min={0}
                  max={5}
                  {...register('shots', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Other Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coffee className="h-5 w-5 text-brown-500" />
            Other Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coffee">Coffee (0-5)</Label>
              <Input
                id="coffee"
                type="number"
                min={0}
                max={5}
                {...register('coffee', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="steps">Steps</Label>
              <Input
                id="steps"
                type="number"
                min={0}
                placeholder="From phone"
                {...register('steps', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="screen_time">Screen time (min)</Label>
              <Input
                id="screen_time"
                type="number"
                min={0}
                placeholder="Minutes"
                {...register('screen_time', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sex (0-10)</Label>
              <Input
                id="sex"
                type="number"
                min={0}
                max={10}
                {...register('sex', { valueAsNumber: true })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Tracking */}
      {showLocationTracking && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Location (optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-600">At Wake</h4>
                <Input
                  placeholder="City (blank = home)"
                  {...register('city_wake')}
                />
                <Input
                  type="number"
                  placeholder="Miles from home"
                  {...register('miles_wake', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-600">At Noon</h4>
                <Input
                  placeholder="City (blank = home)"
                  {...register('city_noon')}
                />
                <Input
                  type="number"
                  placeholder="Miles from home"
                  {...register('miles_noon', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-600">At Sleep</h4>
                <Input
                  placeholder="City (blank = home)"
                  {...register('city_sleep')}
                />
                <Input
                  type="number"
                  placeholder="Miles from home"
                  {...register('miles_sleep', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Healthy Habits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Daily Habits & Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Controller
            name="healthy_habits"
            control={control}
            render={({ field }) => (
              <HabitCheckboxGroup
                selected={field.value as HabitType[]}
                onChange={field.onChange}
                hiddenFields={hiddenFields}
              />
            )}
          />

          <Controller
            name="life_events"
            control={control}
            render={({ field }) => (
              <EventCheckboxGroup
                selected={field.value as EventType[]}
                onChange={field.onChange}
                hiddenFields={hiddenFields}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Qualitative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reflections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="best_part">Best part of your day</Label>
            <Textarea
              id="best_part"
              placeholder="What was the highlight?"
              {...register('best_part')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes to remember the day</Label>
            <Textarea
              id="notes"
              placeholder="Anything else you want to remember..."
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1"
          isLoading={isSubmitting || createEntry.isPending}
        >
          {existingEntry ? 'Update Entry' : 'Save Entry'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
