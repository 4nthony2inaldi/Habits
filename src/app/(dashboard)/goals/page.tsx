import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalsClient } from './GoalsClient'

export const metadata = {
  title: 'Goals | Healthy Habits',
}

export default async function GoalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch user's goals
  const { data: goals } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return <GoalsClient profile={profile} initialGoals={goals || []} />
}
