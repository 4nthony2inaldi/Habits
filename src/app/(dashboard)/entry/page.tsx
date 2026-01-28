import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DailyEntryForm } from '@/components/forms/DailyEntryForm'

export const metadata = {
  title: 'New Entry | Healthy Habits',
}

export default async function EntryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Entry</h1>
        <p className="text-gray-600">
          Log your activities and habits from yesterday or any past day.
        </p>
      </div>
      <DailyEntryForm profile={profile} />
    </div>
  )
}
