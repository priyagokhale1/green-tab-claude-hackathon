# GreenTab Dashboard - Implementation Guide

## Recommended Tech Stack

### ✅ **Next.js 14 (App Router) + TypeScript**
- **Why**: Most popular React framework, excellent docs, built-in API routes, easy deployment
- **Benefits**: SSR/SSG for fast loads, built-in routing, API routes for server-side logic

### ✅ **Supabase Client (JavaScript)**
- **Why**: You're already using Supabase - reuse the same auth & database
- **Benefits**: Same authentication system, direct database queries, Row Level Security works automatically

### ✅ **Recharts** (for charts)
- **Why**: React-native, easy to use, good documentation, handles time-series well
- **Alternative**: Chart.js (more universal, but requires React wrapper)

### ✅ **Tailwind CSS**
- **Why**: Fast styling, consistent with modern design, easy responsive design
- **Benefits**: Quick to build beautiful UI, matches your extension's dark theme

### ✅ **Vercel** (for hosting)
- **Why**: Free tier, zero-config Next.js deployment, automatic HTTPS
- **Benefits**: Deploy in minutes, automatic previews for PRs

---

## Project Structure

```
greentab-dashboard/
├── app/
│   ├── layout.tsx          # Root layout with auth provider
│   ├── page.tsx             # Landing/login page
│   ├── dashboard/
│   │   ├── page.tsx         # Main dashboard
│   │   └── layout.tsx       # Dashboard layout (protected)
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts # OAuth callback handler
│   └── globals.css          # Tailwind imports
├── components/
│   ├── charts/
│   │   ├── EnergyChart.tsx
│   │   ├── WaterChart.tsx
│   │   └── CO2Chart.tsx
│   ├── DomainList.tsx
│   └── StatsCards.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client
│   └── queries.ts           # Data fetching functions
├── types/
│   └── database.ts          # TypeScript types from Supabase
├── package.json
└── next.config.js
```

---

## Step-by-Step Setup

### Step 1: Create Next.js Project

```bash
npx create-next-app@latest greentab-dashboard --typescript --tailwind --app
cd greentab-dashboard
```

### Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr recharts date-fns
npm install -D @types/node
```

### Step 3: Set Up Supabase Client

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### Step 4: Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://taaadgsnajjsmpidtusz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Use the same values from your extension's `popup.js`!**

### Step 5: Create Data Queries

Create `lib/queries.ts`:
```typescript
import { createClient } from './supabase/server'

export async function getUserTrackingData(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getDailyAggregates(userId: string, days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('date, energy_wh, water_liters, co2_grams, total_seconds')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  if (error) throw error
  
  // Aggregate by date
  const aggregated = data.reduce((acc, row) => {
    const date = row.date
    if (!acc[date]) {
      acc[date] = {
        date,
        energy_wh: 0,
        water_liters: 0,
        co2_grams: 0,
        total_seconds: 0
      }
    }
    acc[date].energy_wh += row.energy_wh || 0
    acc[date].water_liters += row.water_liters || 0
    acc[date].co2_grams += row.co2_grams || 0
    acc[date].total_seconds += row.total_seconds || 0
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(aggregated)
}

export async function getTopDomains(userId: string, limit: number = 10) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('domain, energy_wh, water_liters, co2_grams, total_seconds')
    .eq('user_id', userId)
  
  if (error) throw error
  
  // Aggregate by domain
  const aggregated = data.reduce((acc, row) => {
    const domain = row.domain
    if (!acc[domain]) {
      acc[domain] = {
        domain,
        energy_wh: 0,
        water_liters: 0,
        co2_grams: 0,
        total_seconds: 0
      }
    }
    acc[domain].energy_wh += row.energy_wh || 0
    acc[domain].water_liters += row.water_liters || 0
    acc[domain].co2_grams += row.co2_grams || 0
    acc[domain].total_seconds += row.total_seconds || 0
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(aggregated)
    .sort((a, b) => b.energy_wh - a.energy_wh)
    .slice(0, limit)
}
```

### Step 6: Create Chart Components

Create `components/charts/EnergyChart.tsx`:
```typescript
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface DataPoint {
  date: string
  energy_wh: number
}

export function EnergyChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    energy: parseFloat(d.energy_wh.toFixed(2))
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '8px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="energy" 
          stroke="#facc15" 
          strokeWidth={2}
          dot={{ fill: '#facc15', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Step 7: Create Dashboard Page

Create `app/dashboard/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDailyAggregates, getTopDomains } from '@/lib/queries'
import { EnergyChart } from '@/components/charts/EnergyChart'
import { StatsCards } from '@/components/StatsCards'
import { DomainList } from '@/components/DomainList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }
  
  const [dailyData, topDomains] = await Promise.all([
    getDailyAggregates(user.id, 30),
    getTopDomains(user.id, 10)
  ])
  
  // Calculate totals
  const totals = dailyData.reduce((acc, day) => ({
    energy: acc.energy + day.energy_wh,
    water: acc.water + day.water_liters,
    co2: acc.co2 + day.co2_grams
  }), { energy: 0, water: 0, co2: 0 })
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Environmental Impact</h1>
        
        <StatsCards totals={totals} />
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Energy Usage (Last 30 Days)</h2>
          <EnergyChart data={dailyData} />
        </div>
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Top Domains by Energy</h2>
          <DomainList domains={topDomains} />
        </div>
      </div>
    </div>
  )
}
```

### Step 8: Set Up Authentication

Create `app/page.tsx` (landing/login page):
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignInButton } from '@/components/SignInButton'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">GreenTab Dashboard</h1>
        <p className="text-gray-400 mb-8">View your browsing environmental impact</p>
        <SignInButton />
      </div>
    </div>
  )
}
```

Create `components/SignInButton.tsx`:
```typescript
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
```

Create `app/api/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

---

## Key Features to Implement

### 1. **Time-Series Charts**
- Energy usage over time (line chart)
- Water usage over time (line chart)
- CO₂ emissions over time (line chart)
- Daily/weekly/monthly views

### 2. **Summary Cards**
- Total energy used (Wh)
- Total water used (L)
- Total CO₂ emitted (g)
- Time spent browsing (hours)

### 3. **Domain Analytics**
- Top domains by energy usage
- Top domains by time spent
- Domain breakdown pie chart

### 4. **Date Range Filters**
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range

### 5. **Export Data**
- CSV export
- JSON export
- PDF report (optional)

---

## Deployment to Vercel

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial dashboard setup"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your GitHub repo
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy"

3. **Update Supabase Redirect URLs**:
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL: `https://your-app.vercel.app/api/auth/callback`

---

## Alternative: Simpler Stack (If You Want Faster MVP)

If you want something even simpler:

### **Vite + React + Chart.js**

```bash
npm create vite@latest greentab-dashboard -- --template react-ts
cd greentab-dashboard
npm install @supabase/supabase-js chart.js react-chartjs-2
```

**Pros**: Faster initial setup, simpler structure  
**Cons**: No SSR, need to handle routing manually, more setup for deployment

---

## Recommended: Next.js Approach

**Why Next.js is better for this project:**
1. ✅ **Server-side rendering** - Faster initial load, better SEO
2. ✅ **Built-in API routes** - Handle OAuth callbacks easily
3. ✅ **Easy deployment** - Vercel integration is seamless
4. ✅ **TypeScript support** - Better type safety
5. ✅ **File-based routing** - No routing config needed
6. ✅ **Middleware** - Easy auth protection

---

## Next Steps

1. **Start with Next.js setup** (Step 1-2)
2. **Get basic auth working** (Step 8)
3. **Add one chart** (Energy over time)
4. **Add summary cards**
5. **Add domain list**
6. **Polish UI**
7. **Deploy**

This approach reuses your existing Supabase setup, so users can sign in with the same Google account they use in the extension!

