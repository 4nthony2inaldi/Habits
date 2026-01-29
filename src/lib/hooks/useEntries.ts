'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { DailyEntryWithRelations, DailyEntryInsert, HabitType, EventType } from '@/types/database'
import type { DailyEntryFormData } from '@/types/forms'

interface UseEntriesOptions {
  userId: string
  startDate?: string
  endDate?: string
}

export function useEntries({ userId, startDate, endDate }: UseEntriesOptions) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['entries', userId, startDate, endDate],
    queryFn: async (): Promise<DailyEntryWithRelations[]> => {
      let query = supabase
        .from('daily_entries')
        .select(`
          *,
          healthy_habits (id, entry_id, habit_type),
          life_events (id, entry_id, event_type)
        `)
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })

      if (startDate) {
        query = query.gte('entry_date', startDate)
      }
      if (endDate) {
        query = query.lte('entry_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as DailyEntryWithRelations[]
    },
    enabled: !!userId,
  })
}

export function useEntry(entryId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: async (): Promise<DailyEntryWithRelations | null> => {
      if (!entryId) return null

      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          *,
          healthy_habits (id, entry_id, habit_type),
          life_events (id, entry_id, event_type)
        `)
        .eq('id', entryId)
        .single()

      if (error) throw error
      return data as DailyEntryWithRelations
    },
    enabled: !!entryId,
  })
}

export function useEntryByDate(userId: string, date: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['entry-by-date', userId, date],
    queryFn: async (): Promise<DailyEntryWithRelations | null> => {
      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          *,
          healthy_habits (id, entry_id, habit_type),
          life_events (id, entry_id, event_type)
        `)
        .eq('user_id', userId)
        .eq('entry_date', date)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data as DailyEntryWithRelations | null
    },
    enabled: !!userId && !!date,
  })
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string
      data: DailyEntryFormData
    }) => {
      // Calculate aggregate wine and liquor from detailed fields (for backwards compatibility)
      const wineTotal = (data.wine_red || 0) + (data.wine_white || 0) + (data.wine_sparkling || 0)
      const liquorTotal = (data.liquor_vodka || 0) + (data.liquor_gin || 0) + (data.liquor_tequila || 0) +
        (data.liquor_whiskey || 0) + (data.liquor_rum || 0) + (data.liquor_other || 0)

      // First, create or update the daily entry
      const entryData: DailyEntryInsert = {
        user_id: userId,
        entry_date: data.entry_date,
        mood_score: data.mood_score,
        work_location: data.work_location,
        beers: data.beers,
        seltzers: data.seltzers,
        // Use aggregate if detailed fields are empty, otherwise calculate from detailed
        wine: wineTotal > 0 ? wineTotal : (data.wine || 0),
        liquor: liquorTotal > 0 ? liquorTotal : (data.liquor || 0),
        shots: data.shots,
        // Detailed wine breakdown
        wine_red: data.wine_red,
        wine_white: data.wine_white,
        wine_sparkling: data.wine_sparkling,
        // Detailed liquor breakdown
        liquor_vodka: data.liquor_vodka,
        liquor_gin: data.liquor_gin,
        liquor_tequila: data.liquor_tequila,
        liquor_whiskey: data.liquor_whiskey,
        liquor_rum: data.liquor_rum,
        liquor_other: data.liquor_other,
        // Other metrics
        coffee: data.coffee,
        steps: data.steps,
        screen_time: data.screen_time,
        sex: data.sex,
        // Meal tracking
        lunch_location: data.lunch_location,
        dinner_location: data.dinner_location,
        city_wake: data.city_wake,
        miles_wake: data.miles_wake,
        city_noon: data.city_noon,
        miles_noon: data.miles_noon,
        city_sleep: data.city_sleep,
        miles_sleep: data.miles_sleep,
        best_part: data.best_part,
        notes: data.notes,
      }

      // Upsert the entry
      const { data: entry, error: entryError } = await supabase
        .from('daily_entries')
        .upsert(entryData, { onConflict: 'user_id,entry_date' })
        .select()
        .single()

      if (entryError) throw entryError

      // Delete existing habits and events for this entry
      await supabase.from('healthy_habits').delete().eq('entry_id', entry.id)
      await supabase.from('life_events').delete().eq('entry_id', entry.id)

      // Insert new habits
      if (data.healthy_habits.length > 0) {
        const { error: habitsError } = await supabase
          .from('healthy_habits')
          .insert(
            data.healthy_habits.map((habit) => ({
              entry_id: entry.id,
              habit_type: habit as HabitType,
            }))
          )
        if (habitsError) throw habitsError
      }

      // Insert new events
      if (data.life_events.length > 0) {
        const { error: eventsError } = await supabase
          .from('life_events')
          .insert(
            data.life_events.map((event) => ({
              entry_id: entry.id,
              event_type: event as EventType,
            }))
          )
        if (eventsError) throw eventsError
      }

      return entry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['entry-by-date'] })
    },
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('daily_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['entry-by-date'] })
    },
  })
}
