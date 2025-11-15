'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignInButton() {
  const router = useRouter()
  const supabase = createClient()
  
  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`
      }
    })
    
    if (error) {
      console.error('Sign in error:', error)
    }
  }
  
  return (
    <button
      onClick={handleSignIn}
      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
    >
      Sign in with Google
    </button>
  )
}

