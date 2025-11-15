import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWeeklyEmail } from '@/lib/email'

// This endpoint can be called manually for local testing or by a cron service
// For local testing: curl http://localhost:3000/api/email/send-weekly
export async function GET(request: NextRequest) {
  // Optional: Verify it's a cron request (only if CRON_SECRET is set)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Only require auth if CRON_SECRET is configured (for production)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createClient()
    
    // Get all users who have opted in
    const { data: subscriptions, error } = await supabase
      .from('email_subscriptions')
      .select('user_id, email')
      .eq('opted_in', true)
    
    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users opted in',
        sent: 0
      })
    }

    const results = []
    const errors = []

    // Send email to each user
    for (const subscription of subscriptions) {
      try {
        // Extract name from email as fallback
        const userName = subscription.email.split('@')[0] || 'there'

        await sendWeeklyEmail(subscription.user_id, subscription.email, userName)
        
        // Update last_sent_at
        await supabase
          .from('email_subscriptions')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('user_id', subscription.user_id)
        
        results.push({ userId: subscription.user_id, success: true })
      } catch (error: any) {
        console.error(`Error sending email to user ${subscription.user_id}:`, error)
        errors.push({ userId: subscription.user_id, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Error in send-weekly endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

