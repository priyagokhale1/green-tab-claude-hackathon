# Step-by-Step Supabase Authentication Setup Guide

This is a detailed walkthrough for setting up Google OAuth with Supabase for GreenTab.

## Part 1: Create Supabase Project

### Step 1.1: Sign Up / Sign In to Supabase

1. Go to https://supabase.com
2. Click **"Start your project"** (top right) or **"Sign In"** if you have an account
3. Sign up with GitHub (recommended) or email

### Step 1.2: Create New Project

1. Once logged in, click **"New Project"** (top right)
2. Fill in the project details:
   - **Name**: `green-tab` (or any name you want)
   - **Database Password**: Create a strong password (save this somewhere safe!)
     - This is your database password (different from your account password)
     - You'll need this if you connect via SQL clients later
   - **Region**: Choose closest to you (e.g., `US East (North Virginia)` or `Europe West`)
   - **Pricing Plan**: Select **Free** (perfect for MVP)

3. Click **"Create new project"**
4. Wait 2-3 minutes for project to be created (you'll see a loading screen)

### Step 1.3: Get Your Project Credentials

1. Once project is ready, you'll see the dashboard
2. Click **Settings** icon (⚙️) in the left sidebar
3. Click **API** in the settings menu
4. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
     - Copy this entire URL (including `https://`)
   - **anon/public key**: A long string starting with `eyJ...`
     - Click the copy icon next to it
     - This is your `SUPABASE_ANON_KEY`

5. **Save both values** - you'll need them in Step 3

---

## Part 2: Set Up Google OAuth

### Step 2.1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Sign in with your Google account
3. At the top, click the **project dropdown** (next to "Google Cloud")
4. Click **"New Project"**
5. Enter:
   - **Project name**: `GreenTab OAuth` (or any name)
   - **Organization**: Leave as default
   - **Location**: Leave as default

6. Click **"Create"**
7. Wait a few seconds, then select your new project from the dropdown

### Step 2.2: Enable Google+ API

1. In the Google Cloud Console, click the **☰ Menu** (top left)
2. Go to **APIs & Services** → **Library**
3. Search for **"Google+ API"**
4. Click on it
5. Click **"Enable"**
6. Wait for it to enable (you'll see a checkmark)

### Step 2.3: Create OAuth Credentials

1. Still in Google Cloud Console, go to **APIs & Services** → **Credentials** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** (top of page)
3. Select **"OAuth client ID"**
4. If you see a warning about "Configure Consent Screen", click **"Configure Consent Screen"**:
   - **User Type**: Select **"External"** → Click **"Create"**
   - **App name**: `GreenTab`
   - **User support email**: Select your email
   - **Developer contact information**: Enter your email
   - Click **"Save and Continue"**
   - **Scopes**: Click **"Save and Continue"** (defaults are fine)
   - **Test users**: Click **"Save and Continue"** (skip for now)
   - **Summary**: Click **"Back to Dashboard"**

5. Now create the OAuth client:
   - Click **"+ CREATE CREDENTIALS"** again
   - Select **"OAuth client ID"**
   - **Application type**: Select **"Web application"**
   - **Name**: `GreenTab Chrome Extension`
   - **Authorized redirect URIs**: Click **"+ ADD URI"** and add:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
     - **Important**: Replace `your-project-id` with your actual Supabase project URL
     - Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
     - Click **"ADD URI"**

6. Click **"Create"**
7. A popup will appear with your credentials:
   - **Client ID**: Copy this (looks like `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like `GOCSPX-xxxxxxxxxxxx`)
   - **Save both** - you'll need them in Step 2.4

8. Click **"OK"**

---

### Step 2.4: Configure Google OAuth in Supabase

1. Go back to your Supabase dashboard
2. Click **Authentication** in the left sidebar
3. Click **Providers** (submenu under Authentication)
4. Find **Google** in the list
5. Click the toggle to **Enable** Google provider
6. Fill in the credentials:
   - **Client ID (for OAuth)**: Paste the Client ID from Step 2.3
   - **Client Secret (for OAuth)**: Paste the Client Secret from Step 2.3
7. Scroll down and click **"Save"**

### Step 2.5: Add Chrome Extension Redirect URL

1. Still in Supabase → Authentication → Providers → Google
2. Scroll down to **"Redirect URLs"**
3. You'll see one already listed: `https://your-project.supabase.co/auth/v1/callback`
4. We need to add your Chrome extension redirect URL:
   - First, load your extension in Chrome (we'll do this in Step 3.3)
   - Get your extension ID from `chrome://extensions` (details below)
   - Add this URL: `https://[extension-id].chromiumapp.org/`
     - Replace `[extension-id]` with your actual extension ID
   - Example: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`

**For now**, you can skip this and add it after loading the extension. The OAuth flow will work with the default Supabase callback URL.

---

## Part 3: Configure Chrome Extension

### Step 3.1: Update popup.js

1. Open `popup.js` in your code editor
2. Find lines 18-19 (look for `SUPABASE_URL` and `SUPABASE_ANON_KEY`)
3. Replace with your actual values:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co'; // Your Project URL from Step 1.3
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your anon key from Step 1.3
```

**Important**:
- Keep the quotes around the values
- Don't add any spaces
- Make sure there's no trailing comma

### Step 3.2: Update background.js

1. Open `background.js` in your code editor
2. Find lines 16-17 (look for `SUPABASE_URL` and `SUPABASE_ANON_KEY`)
3. Replace with the **same values** you used in popup.js:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co'; // Same as popup.js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Same as popup.js
```

**Important**: Both files must have the same values!

### Step 3.3: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/` (paste in address bar and press Enter)
3. Enable **"Developer mode"** (toggle in top right)
4. Click **"Load unpacked"** (top left)
5. Navigate to your project folder:
   - `/Users/anijain/Documents/GitHub/green-tab-claude-hackathon`
6. Select the folder and click **"Open"** or **"Select"**
7. Your extension should appear in the list
8. **Note your Extension ID**:
   - Under the extension name, you'll see: `ID: abcdefghijklmnopqrstuvwxyz123456`
   - Copy this ID (you'll need it for Step 2.5)

### Step 3.4: Add Extension Redirect URL (Optional - for better OAuth flow)

1. Go back to Supabase → Authentication → Providers → Google
2. In **Redirect URLs** section, click **"+ Add URL"**
3. Add: `https://[your-extension-id].chromiumapp.org/`
   - Replace `[your-extension-id]` with the ID from Step 3.3
4. Click **"Save"**

---

## Part 4: Set Up Database Schema

### Step 4.1: Open SQL Editor in Supabase

1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **"+ New query"** (top right)

### Step 4.2: Create Tracking Data Table

1. Copy and paste this SQL:

```sql
-- Create tracking_data table
CREATE TABLE IF NOT EXISTS tracking_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  domain TEXT NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  energy_wh FLOAT,
  water_liters FLOAT,
  co2_grams FLOAT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, domain)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tracking_data_user_date 
  ON tracking_data(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_data_user_domain 
  ON tracking_data(user_id, domain);

-- Enable Row Level Security
ALTER TABLE tracking_data ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their own data
CREATE POLICY "Users can view own tracking data"
  ON tracking_data FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: users can insert their own data
CREATE POLICY "Users can insert own tracking data"
  ON tracking_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: users can update their own data
CREATE POLICY "Users can update own tracking data"
  ON tracking_data FOR UPDATE
  USING (auth.uid() = user_id);
```

2. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
3. You should see: **"Success. No rows returned"**

### Step 4.3: Verify Table Was Created

1. Click **Table Editor** in the left sidebar
2. You should see `tracking_data` in the list
3. Click on it to see the columns

---

## Part 5: Test Authentication

### Step 5.1: Test Sign-In Flow

1. Open your Chrome extension popup (click the extension icon)
2. Scroll to the bottom
3. You should see **"Sign in with Google"** button
4. Click it
5. A new window should open with Google sign-in
6. Select your Google account
7. You may see a warning: **"Google hasn't verified this app"**
   - Click **"Advanced"**
   - Click **"Go to GreenTab (unsafe)"**
8. You should be redirected back and see your user info in the popup

### Step 5.2: Verify Data Sync

1. After signing in, use your browser normally for a few minutes
2. Wait 5 minutes (sync happens every 5 minutes)
3. Go to Supabase dashboard → **Table Editor**
4. Click **tracking_data** table
5. You should see rows appearing with your data

---

## Troubleshooting

### "Authentication is not configured"
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in both `popup.js` and `background.js`
- Make sure there are no extra spaces or quotes missing

### "OAuth flow failed"
- Check that Google OAuth credentials are correct in Supabase
- Verify redirect URLs are configured correctly
- Make sure Google+ API is enabled in Google Cloud Console

### "Sign in button doesn't work"
- Check browser console for errors (F12 → Console)
- Verify `identity` permission is in `manifest.json`
- Make sure extension is loaded in Developer mode

### "No data syncing"
- Check browser console for errors
- Verify you're signed in (user info should show in popup)
- Check Supabase → Table Editor → tracking_data to see if rows appear
- Check Row Level Security policies are set up correctly

### Extension ID not working
- The extension ID is case-sensitive
- Make sure you're using the correct format: `https://[id].chromiumapp.org/`
- You can get the ID from `chrome://extensions/`

---

## Next Steps

After authentication is working:

1. ✅ Create the dashboard website
2. ✅ Connect dashboard to same Supabase project
3. ✅ Fetch data from `tracking_data` table
4. ✅ Create visualizations and charts

---

## Quick Checklist

- [ ] Created Supabase project
- [ ] Got Project URL and anon key
- [ ] Created Google Cloud project
- [ ] Enabled Google+ API
- [ ] Created OAuth credentials (Client ID and Secret)
- [ ] Configured Google OAuth in Supabase
- [ ] Updated `popup.js` with credentials
- [ ] Updated `background.js` with credentials
- [ ] Loaded extension in Chrome
- [ ] Created database table with SQL
- [ ] Set up Row Level Security policies
- [ ] Tested sign-in flow
- [ ] Verified data is syncing

---

## Support

If you get stuck:
1. Check the browser console for errors (F12)
2. Check Supabase → Logs for API errors
3. Verify all credentials are correct
4. Make sure database schema is set up correctly

