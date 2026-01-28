import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch user's current streak (count of consecutive days logged)
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('entry_date')
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })
    .limit(365)

  let streak = 0
  if (entries && entries.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let currentDate = yesterday
    for (const entry of entries) {
      const entryDate = new Date(entry.entry_date)
      entryDate.setHours(0, 0, 0, 0)

      if (entryDate.getTime() === currentDate.getTime()) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else if (entryDate.getTime() < currentDate.getTime()) {
        break
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} streak={streak} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
