// Supabase Edge Function to send daily push notification reminders
// Deploy with: supabase functions deploy send-daily-reminders
// Schedule with: supabase functions schedule send-daily-reminders --cron "0 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  reminder_time: string
  timezone: string
}

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current hour in various timezones
    const now = new Date()

    // Fetch all enabled push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('enabled', true)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions to process' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const sub of subscriptions as PushSubscription[]) {
      try {
        // Check if it's the right time for this user
        const userTime = getTimeInTimezone(now, sub.timezone)
        const [reminderHour, reminderMinute] = sub.reminder_time.split(':').map(Number)

        // Only send if within the current hour window
        if (userTime.getHours() !== reminderHour) {
          results.skipped++
          continue
        }

        // Check if user already has an entry for today
        const todayStr = formatDateForTimezone(now, sub.timezone)
        const { data: entry } = await supabase
          .from('daily_entries')
          .select('id')
          .eq('user_id', sub.user_id)
          .eq('date', todayStr)
          .single()

        if (entry) {
          // User already logged today, skip
          results.skipped++
          continue
        }

        // Send push notification
        const success = await sendPushNotification(sub, {
          title: 'Healthy Habits Reminder',
          body: "Don't forget to log your habits for today!",
          icon: '/icons/icon-192.png',
          url: '/entry',
        })

        if (success) {
          results.sent++
        } else {
          results.failed++
        }
      } catch (err) {
        console.error(`Error processing subscription ${sub.id}:`, err)
        results.failed++
        results.errors.push(`${sub.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error in send-daily-reminders:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function getTimeInTimezone(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '0'

  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  )
}

function formatDateForTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<boolean> {
  try {
    // Use web-push library logic to create VAPID headers and encrypt payload
    // Note: In production, you'd use a proper web-push library
    // For Deno, we need to implement the web push protocol

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    // Import web-push for Deno
    const webPush = await import('https://esm.sh/web-push@3.6.7')

    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    await webPush.sendNotification(pushSubscription, JSON.stringify(payload))

    return true
  } catch (err) {
    console.error('Failed to send push notification:', err)

    // If subscription is invalid, we might want to remove it
    if (err instanceof Error && (err.message.includes('410') || err.message.includes('404'))) {
      console.log('Subscription expired or invalid, should be removed')
    }

    return false
  }
}
