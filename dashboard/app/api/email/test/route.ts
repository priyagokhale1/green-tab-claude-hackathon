import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWeeklyEmail } from '@/lib/email'

// Test endpoint to send a single email to the logged-in user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's email subscription
    const { data: subscription, error: subError } = await supabase
      .from('email_subscriptions')
      .select('email')
      .eq('user_id', user.id)
      .eq('opted_in', true)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active email subscription found. Please opt in first from the dashboard.' },
        { status: 400 }
      )
    }

    // Get user's name from metadata
    const userName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.user_metadata?.display_name ||
                     user.email?.split('@')[0] || 
                     'there'

    // Send test email
    await sendWeeklyEmail(user.id, subscription.email, userName)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!'
    })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send test email',
        details: error.message
      },
      { status: 500 }
    )
  }
}

