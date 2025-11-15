# Dashboard Local Setup Instructions

## Step 1: Create Environment File

Create a file named `.env.local` in the `dashboard` folder with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://taaadgsnajjsmpidtusz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYWFkZ3NuYWpqc21waWR0dXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDk5ODEsImV4cCI6MjA3ODc4NTk4MX0.QKFSl_WlrGVT8Wp3RsJWrqOC3WyEPmCi54xIinydBns
```

## Step 2: Update Supabase Redirect URLs

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Add to **Redirect URLs**:
   - `http://localhost:3000/api/auth/callback`
4. Click **Save**

## Step 3: Run the Dashboard

```bash
cd dashboard
npm run dev
```

The dashboard will be available at: **http://localhost:3000**

## Step 4: Test the Connection

1. Make sure your Chrome extension is loaded and you're signed in
2. Click the "Dashboard" button in the extension popup
3. It should open `http://localhost:3000` in a new tab
4. Sign in with the same Google account you use in the extension
5. You should see your tracking data!

## Troubleshooting

### "Invalid redirect URL"
- Make sure you added `http://localhost:3000/api/auth/callback` to Supabase redirect URLs

### "No data showing"
- Make sure you've been browsing with the extension active
- Check that data is syncing in the extension (check background.js console)
- Wait a few minutes for data to sync

### Port 3000 already in use
- Change the port: `npm run dev -- -p 3001`
- Update `DASHBOARD_URL` in `popup.js` to match

