# Quick Fix for OAuth "Authorization page could not be loaded" Error

## The Problem
If you're seeing "Authorization page could not be loaded" error, it means your Chrome extension redirect URL isn't configured in Google Cloud Console.

## Quick Fix (2 minutes)

### Step 1: Get Your Extension Redirect URL
1. Open your extension popup
2. Open console (F12 or right-click → Inspect)
3. You should see: `Extension redirect URL: https://pfbbekciodlemnacpbkkmnfekekccbmp.chromiumapp.org/`
4. Copy this URL

**OR** you can get it from:
- `chrome://extensions/` → Find your extension → Copy the ID (pfbbekciodlemnacpbkkmnfekekccbmp)
- Your redirect URL is: `https://[extension-id].chromiumapp.org/`

### Step 2: Add to Google Cloud Console
1. Go to https://console.cloud.google.com
2. Select your project (the one you created for GreenTab)
3. Go to **APIs & Services** → **Credentials** (left sidebar)
4. Click on your OAuth 2.0 Client ID (the one you created earlier)
5. Under **Authorized redirect URIs**, click **"+ ADD URI"**
6. Paste: `https://pfbbekciodlemnacpbkkmnfekekccbmp.chromiumapp.org/`
7. Click **"ADD URI"**
8. Click **"SAVE"** at the bottom

### Step 3: Test Again
1. Reload the extension in `chrome://extensions/`
2. Try signing in again
3. The error should be gone!

## Alternative: Use Supabase Callback Only

If the above doesn't work, we can configure Supabase to handle the redirect. But the Google Cloud Console approach above is the standard solution and should work.

## Your Extension Redirect URL
Based on your extension ID, your redirect URL is:
```
https://pfbbekciodlemnacpbkkmnfekekccbmp.chromiumapp.org/
```

Make sure this EXACT URL (including the trailing slash) is added to Google Cloud Console.

