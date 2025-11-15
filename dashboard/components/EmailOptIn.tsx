'use client'

import { useEffect, useState } from 'react'

interface EmailSubscription {
  id: string
  email: string
  opted_in: boolean
  last_sent_at: string | null
}

export function EmailOptIn() {
  const [subscription, setSubscription] = useState<EmailSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [email, setEmail] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const response = await fetch('/api/email/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        if (data.subscription) {
          setEmail(data.subscription.email)
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleOptIn() {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/email/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          optedIn: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to opt in')
      }

      setSubscription(data.subscription)
      setShowForm(false)
      setMessage({ type: 'success', text: data.message || 'Successfully opted in to weekly emails!' })
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to opt in. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOptOut() {
    if (!confirm('Are you sure you want to opt out of weekly email recaps?')) {
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/email/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: subscription?.email || '',
          optedIn: false
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to opt out')
      }

      setSubscription(null)
      setEmail('')
      setMessage({ type: 'success', text: data.message || 'Successfully opted out!' })
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to opt out. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTestEmail() {
    setTesting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setMessage({ 
        type: 'success', 
        text: `Test email sent! Check your inbox (${subscription?.email}).` 
      })
      
      // Refresh subscription to update last_sent_at
      fetchSubscription()
      
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send test email. Please try again.' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl p-5 border" style={{ 
        background: 'var(--card-bg)', 
        borderColor: 'var(--border-subtle)' 
      }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl p-5 border" style={{ 
      background: 'var(--card-bg)', 
      borderColor: 'var(--border-subtle)' 
    }}>
      <div className="mb-4">
        <h2 className="text-base font-medium mb-1" style={{ color: 'var(--text-main)' }}>
          📧 Weekly Email Recap
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
          Get your "GreenTab Wrapped" delivered to your inbox every week
        </p>
      </div>

      {message && (
        <div 
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {subscription && subscription.opted_in ? (
        <div>
          <div className="mb-4 p-3 rounded-lg" style={{ 
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <p className="text-sm" style={{ color: '#bbf7d0' }}>
              ✓ You're subscribed to weekly email recaps
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
              Email: {subscription.email}
            </p>
            {subscription.last_sent_at && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                Last sent: {new Date(subscription.last_sent_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTestEmail}
              disabled={testing || submitting}
              className="px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
              style={{
                background: 'rgba(250, 204, 21, 0.12)',
                color: '#fef08a',
                border: '1px solid rgba(250, 204, 21, 0.5)'
              }}
            >
              {testing ? 'Sending...' : '📧 Send Test Email'}
            </button>
            <button
              onClick={handleOptOut}
              disabled={submitting || testing}
              className="px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
              style={{
                background: 'rgba(248, 113, 113, 0.12)',
                color: '#fecaca',
                border: '1px solid rgba(248, 113, 113, 0.5)'
              }}
            >
              {submitting ? 'Opting out...' : 'Opt Out'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-full text-sm font-medium transition"
              style={{
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#bbf7d0',
                border: '1px solid rgba(34, 197, 94, 0.5)'
              }}
            >
              Opt In to Weekly Emails
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOptIn}
                  disabled={submitting || !email.trim()}
                  className="px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
                  style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#bbf7d0',
                    border: '1px solid rgba(34, 197, 94, 0.5)'
                  }}
                >
                  {submitting ? 'Subscribing...' : 'Subscribe'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEmail('')
                    setMessage(null)
                  }}
                  disabled={submitting}
                  className="px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-subtle)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

