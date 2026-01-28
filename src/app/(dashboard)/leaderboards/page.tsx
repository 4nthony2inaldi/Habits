import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeaderboardsClient } from './LeaderboardsClient'

export const metadata = {
  title: 'Leaderboards | Healthy Habits',
}

export default async function LeaderboardsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return <LeaderboardsClient currentUser={profile} />
}
