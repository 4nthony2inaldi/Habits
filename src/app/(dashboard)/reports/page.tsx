import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from './ReportsClient'

export const metadata = {
  title: 'Reports | Healthy Habits',
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return <ReportsClient profile={profile} />
}
