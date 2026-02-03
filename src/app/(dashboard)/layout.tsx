import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ClientProviders } from '@/components/providers/ClientProviders'

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

  return (
    <ClientProviders>
      <div className="min-h-screen bg-gray-50">
        <Header profile={profile} />
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </ClientProviders>
  )
}
