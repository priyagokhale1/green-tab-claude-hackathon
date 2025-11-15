# Fix OAuth Configuration Errors

## The Problem
Errors like "Authorization page could not be loaded" or "redirect_uri_mismatch" mean the OAuth redirect URLs aren't properly configured.

## The Solution

For Chrome extensions with Supabase, you need to configure the **extension redirect URL** in TWO places:

### Your Extension Redirect URL
```
https://pfbbekciodlemnacpbkkmnfekekccbmp.chromiumapp.org/
```

### Step 1: Configure in Google Cloud Console

1. Go to https://console.cloud.google.com
2. Select your project (the one for GreenTab)
3. Go to **APIs & Services** → **Credentials** (left sidebar)
4. Click on your **OAuth 2.0 Client ID** (the one you created earlier)
5. Under **"Authorized redirect URIs"**, make sure you have:
   - `https://pfbbekciodlemnacpbkkmnfekekccbmp.chromiumapp.org/`
   - (This should already be there based on your screenshot)
6. Click **"SAVE"** if you made changes

### Step 2: Configure in Supabase Dashboard

**This is the missing step!** Supabase needs to know it's safe to redirect to your extension URL.

1. Go to https://supabase.com/dashboard
2. Select your project: `taaadgsnajjsmpidtusz`
3. Go to **Authentication** → **URL Configuration** (left sidebar)
4. Under **"Redirect URLs"**, you should see:
   - `https://taaadgsnajjsmpidtusz.supabase.co/auth/v1/callback` (default)
5. Click **"+ Add URL"** or the **"+"** button
6. Add your extension redirect URL:
   ```
   https://pfbbekciodlemnacpbkkmnfekekccbmp.chromiumapp.org/
   ```
7. Click **"Save"** or **"Add"**

### Step 3: Test Again

1. Reload the extension in `chrome://extensions/`
2. Try signing in again
3. The OAuth flow should work now!

## Why This Happens

When using Chrome extensions with Supabase OAuth:

1. **Extension** calls Supabase authorize endpoint with extension redirect URL
2. **Supabase** redirects to Google OAuth
3. **Google** authenticates and redirects back to the extension URL (must be in Google Console)
4. **Extension** receives tokens and processes them

Both Google and Supabase need to trust the extension redirect URL for this flow to work.

## Important Notes

- Keep **both** the Supabase callback URL and extension URL in Google Cloud Console (as you have now)
- **Add** the extension URL to Supabase's Redirect URLs (this was likely missing)
- Make sure URLs match EXACTLY (including trailing slashes where needed)

