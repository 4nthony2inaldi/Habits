import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, reminderTime, timezone } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Upsert the subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        enabled: true,
        reminder_time: reminderTime || '20:00:00',
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, {
        onConflict: 'user_id,endpoint'
      })

    if (error) {
      console.error('Error saving subscription:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in push subscribe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (endpoint) {
      // Delete specific subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)

      if (error) {
        console.error('Error deleting subscription:', error)
        return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
      }
    } else {
      // Delete all subscriptions for user
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting subscriptions:', error)
        return NextResponse.json({ error: 'Failed to delete subscriptions' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in push unsubscribe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
