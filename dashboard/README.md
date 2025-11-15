# GreenTab Dashboard

Local development dashboard for viewing your browsing environmental impact.

## Quick Start

1. **Environment is already set up** - `.env.local` is configured

2. **Update Supabase Redirect URLs**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add: `http://localhost:3000/api/auth/callback`

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: http://localhost:3000

5. **Test the connection**:
   - Sign in with the same Google account you use in the Chrome extension
   - Click the "Dashboard" button in the extension popup
   - Your data should appear!

## Features

- ✅ View total energy, water, and CO₂ usage
- ✅ Energy usage chart (last 30 days)
- ✅ Top domains by energy consumption
- ✅ Google OAuth authentication (same as extension)

## Project Structure

```
dashboard/
├── app/
│   ├── page.tsx              # Landing/login page
│   ├── dashboard/
│   │   └── page.tsx          # Main dashboard
│   └── api/
│       └── auth/
│           ├── callback/     # OAuth callback
│           └── signout/      # Sign out handler
├── components/
│   ├── charts/
│   │   └── EnergyChart.tsx  # Energy usage chart
│   ├── StatsCards.tsx        # Summary cards
│   ├── DomainList.tsx        # Top domains list
│   └── SignInButton.tsx      # Google sign in
└── lib/
    ├── supabase/
    │   ├── client.ts         # Browser client
    │   └── server.ts         # Server client
    └── queries.ts            # Data fetching functions
```

## Troubleshooting

See `DASHBOARD_SETUP_INSTRUCTIONS.md` for detailed troubleshooting.
