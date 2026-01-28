import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export const metadata = {
  title: 'Dashboard | Healthy Habits',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch all users for the user selector
  const { data: users } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  return (
    <DashboardClient
      currentUser={profile}
      users={users || []}
    />
  )
}
