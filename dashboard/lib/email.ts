import { getWeeklyData } from './queries'
import { getClaudeWeeklyEmail } from './claude'

const RESEND_API_URL = 'https://api.resend.com/emails'

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'GreenTab <noreply@greentab.app>'

  if (!apiKey) {
    throw new Error('Resend API key not configured')
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

export async function sendWeeklyEmail(userId: string, userEmail: string, userName?: string) {
  // Get weekly data
  const weeklyData = await getWeeklyData(userId)

  // Generate email content with Claude
  const emailContent = await getClaudeWeeklyEmail(weeklyData, userName || 'there')

  // Send email
  await sendEmail(
    userEmail,
    '🌱 Your GreenTab Wrapped - Weekly Recap',
    emailContent
  )

  return { success: true }
}

