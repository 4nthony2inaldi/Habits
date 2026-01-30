import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DailyEntryForm } from '@/components/forms/DailyEntryForm'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Entry</h1>
          <p className="text-gray-600">
            Log your activities and habits from yesterday or any past day.
          </p>
        </div>
        <Link href="/history">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </Link>
      </div>
      <DailyEntryForm profile={profile} />
    </div>
  )
}
