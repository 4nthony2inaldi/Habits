'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { HomeCityHistory as HomeCityHistoryType } from '@/types/database'
import { MapPin, Plus, Trash2, Loader2, Check, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface HomeCityHistoryProps {
  currentHomeCity: string | null
  currentHomeLat: number | null
  currentHomeLng: number | null
}

export function HomeCityHistory({
  currentHomeCity,
  currentHomeLat,
  currentHomeLng,
}: HomeCityHistoryProps) {
  const supabase = createClient()
  const [history, setHistory] = useState<HomeCityHistoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // New entry form
  const [newCity, setNewCity] = useState('')
  const [newLat, setNewLat] = useState<number | null>(null)
  const [newLng, setNewLng] = useState<number | null>(null)
  const [newDate, setNewDate] = useState('')

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('home_city_history')
        .select('*')
        .eq('user_id', user.id)
        .order('effective_date', { ascending: false })

      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      console.error('Failed to load home city history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const addHistoryEntry = async () => {
    if (!newCity || !newLat || !newLng || !newDate) {
      setError('Please fill in all fields and select a city from the dropdown')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('home_city_history')
        .insert({
          user_id: user.id,
          city: newCity,
          lat: newLat,
          lng: newLng,
          effective_date: newDate,
        })
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('Failed to add entry')

      setHistory(prev => [data, ...prev].sort((a, b) =>
        new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
      ))
      setNewCity('')
      setNewLat(null)
      setNewLng(null)
      setNewDate('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to add home city history:', err)
      setError(err instanceof Error ? err.message : 'Failed to add entry')
    } finally {
      setSaving(false)
    }
  }

  const deleteHistoryEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const { error } = await supabase
        .from('home_city_history')
        .delete()
        .eq('id', id)

      if (error) throw error
      setHistory(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      console.error('Failed to delete home city history:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <p>
          Track when you moved to different cities. This helps calculate accurate
          "miles from home" for historical entries.
        </p>
        {currentHomeCity && (
          <p className="mt-2">
            <strong>Current home:</strong> {currentHomeCity}
            {currentHomeLat && currentHomeLng && (
              <span className="text-green-600 ml-2">(coordinates set)</span>
            )}
          </p>
        )}
      </div>

      {/* Add new entry */}
      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Previous Home City
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="historyCity" className="text-xs">City</Label>
            <CityAutocomplete
              id="historyCity"
              value={newCity}
              onChange={(value, lat, lng) => {
                setNewCity(value)
                setNewLat(lat ?? null)
                setNewLng(lng ?? null)
              }}
              placeholder="Search for city..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="historyDate" className="text-xs">Effective From Date</Label>
            <Input
              id="historyDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
        </div>
        {newCity && (
          <p className="text-xs text-gray-500">
            {newLat && newLng ? (
              <span className="text-green-600">Coordinates captured</span>
            ) : (
              <span className="text-amber-600">Select from dropdown to capture coordinates</span>
            )}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <Check className="h-4 w-4" />
            Entry added successfully
          </p>
        )}
        <Button
          onClick={addHistoryEntry}
          disabled={saving || !newCity || !newLat || !newLng || !newDate}
          size="sm"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Entry
        </Button>
      </div>

      {/* History list */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Home City History</h4>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No home city history entries yet. Add entries to track when you lived in different cities.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-white"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{entry.city}</p>
                    <p className="text-xs text-gray-500">
                      From {format(new Date(entry.effective_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteHistoryEntry(entry.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
