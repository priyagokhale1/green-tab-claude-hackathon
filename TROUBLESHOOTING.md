# GreenTab Troubleshooting Guide

## Common Issues & Solutions

### Issue: "Failed to sign in: Cannot read properties of undefined (reading 'getRedirectURL')"

**What's happening:**
The Chrome identity API (`chrome.identity`) is not available when you try to sign in. This usually means:
- The extension context was lost
- The extension needs to be reloaded
- Manifest permissions are missing

**Solutions (try in order):**

#### 1. **Reload the Extension (Quickest Fix)**
   - Go to `chrome://extensions`
   - Find "GreenTab"
   - Click the **Reload** button (circular arrow icon)
   - Close and reopen the popup

#### 2. **Close and Reopen the Popup**
   - Close the GreenTab popup completely
   - Click the GreenTab icon again to reopen it
   - Try signing in again

#### 3. **Restart Chrome**
   - Close Chrome completely
   - Reopen Chrome
   - Try signing in again

#### 4. **Verify Extension Installation**
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Look for "GreenTab" in the list
   - Verify it shows a green checkmark next to "ID: [extension-id]"
   - If there are errors, click "Errors" to see details

#### 5. **Check Manifest Permissions**
   - Open `manifest.json` in your project
   - Verify it contains these permissions:
     ```json
     "permissions": [
       "tabs",
       "activeTab", 
       "storage",
       "identity"
     ]
     ```
   - If you changed it, reload the extension

#### 6. **Clear Extension Storage (Nuclear Option)**
   - Go to `chrome://extensions`
   - Click the three dots menu on the GreenTab extension
   - Select "Remove"
   - Delete the entire GreenTab folder from your project
   - Re-download/re-setup the extension
   - Load it again with `chrome://extensions` > "Load unpacked"

---

### Issue: "OAuth Configuration Error" - Redirect URI Mismatch

**What's happening:**
The extension's redirect URL isn't configured in Google Cloud Console or Supabase.

**Solution:**
See `FIX_REDIRECT_URI_MISMATCH.md` for detailed setup instructions.

**Quick steps:**
1. Go to `chrome://extensions`
2. Find GreenTab, click "ID" to copy the extension ID
3. Your redirect URL will be: `https://[EXTENSION-ID].chromiumuser-scripts.xyz/`
4. Add this to:
   - Google Cloud Console (OAuth Client > Authorized redirect URIs)
   - Supabase Dashboard (Authentication > URL Configuration)

---

### Issue: Data Not Syncing to Backend

**What's happening:**
Your tracking data isn't being saved to Supabase.

**Solutions:**

#### Check if you're signed in
- Open the GreenTab popup
- You should see either:
  - "Sign in with Google" button (not signed in)
  - Your name + "Sign out" button (signed in)
- If you see the sign-in button, click it first

#### Verify Supabase is configured
- Open `popup.js` 
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set (not empty)
- Open `background.js`
- Check that the same values are set there too
- If they're empty, see `AUTHENTICATION_SETUP.md`

#### Check browser console for errors
- Open Chrome DevTools: `Ctrl+Shift+J` (or `Cmd+Option+J` on Mac)
- Look for red error messages
- Screenshot and share the error

#### Wait a few minutes
- Data syncs every 5 minutes (not instantly)
- If you just signed in, wait up to 5 minutes for the first sync

---

### Issue: Time Not Updating / Shows "0 sec today"

**What's happening:**
The extension isn't tracking your time on the current website.

**Solutions:**

#### 1. Wait a few seconds
- The popup needs to query the background script
- If just opened, it might show 0 until the background script responds

#### 2. Make sure you've been on the site for a bit
- The extension only tracks time you spend on the *active* tab
- Minimize the window/switch tabs for a few seconds
- Come back and the time should update

#### 3. Check if it's a Chrome internal page
- The extension can't track Chrome pages like:
  - `chrome://extensions`
  - `chrome://settings`
  - `about:blank`
- Try a regular website like google.com or github.com

#### 4. Check extension permissions
- Go to `chrome://extensions`
- Find GreenTab
- Verify "Host permissions" shows "All sites"

---

### Issue: Energy/Water/CO₂ Shows "Calculating..."

**What's happening:**
The extension is fetching data from the Website Carbon API.

**Solutions:**

#### 1. Wait a few seconds
- The API call can take 1-2 seconds

#### 2. Check internet connection
- Make sure you're connected to the internet
- Try visiting a website to confirm connection works

#### 3. Check if the API is down
- Open your browser console: `Ctrl+Shift+J`
- Look for errors from `api.websitecarbon.com`
- If you see CORS or 500 errors, the API might be temporarily down
- Try again in a few minutes

#### 4. Check for ad blockers
- Adblockers can block API calls
- Temporarily disable your adblocker and try again
- Add an exception for `api.websitecarbon.com`

---

### Issue: Green Hosting Status Shows "Unknown"

**What's happening:**
The Green Web Foundation API isn't responding.

**Solutions:**

#### Same as "Energy/Water/CO₂ Shows Calculating..." above
- Wait a few seconds
- Check internet connection
- Check browser console for API errors
- Check if your adblocker is blocking the API

---

### Issue: Error After Transferring from Friend's Laptop

**What's happening:**
You copied the project from your friend's laptop, but your environment is different.

**Common differences:**
- Different Chrome version
- Missing Supabase credentials in manifest
- Different Node.js version (if you're using build tools)
- Different file paths

**Solutions:**

#### 1. Verify the extension loads without errors
- Go to `chrome://extensions`
- Enable "Developer mode"
- Look for any errors listed under GreenTab
- Click "Errors" to see details

#### 2. Re-download the latest version
- Clone the repo fresh: `git clone https://github.com/priyagokhale1/green-tab-claude-hackathon.git`
- This ensures you have the latest fixes
- Don't copy manually - use git

#### 3. Check your Supabase credentials
- Open `popup.js` and `background.js`
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- If they're missing, see `AUTHENTICATION_SETUP.md`

#### 4. Try reloading the extension
- Go to `chrome://extensions`
- Click the Reload button on GreenTab

---

## Debug Steps

### How to Enable Detailed Logging

1. Open Chrome DevTools: `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Option+J` (Mac)
2. Reload the extension: Go to `chrome://extensions` and click Reload on GreenTab
3. Reopen the GreenTab popup
4. In DevTools, you should see detailed logs showing:
   - Chrome APIs initialization
   - Supabase connection status
   - Tracking data
   - Authentication flow
   - API responses

### How to Report Issues

When reporting a bug, include:
1. **Full error message** (from the alert or console)
2. **Steps to reproduce** (what you did when it happened)
3. **Browser version** (Chrome menu > About Chrome)
4. **Extension version** (from `manifest.json`)
5. **Screenshot** of the error
6. **Console logs** (DevTools > Console tab)

---

## Performance Tips

### If the Extension is Slow

#### 1. Reduce API calls
- The extension calls Website Carbon API on every popup open
- If you open the popup frequently, this causes delay
- This is normal - API calls take 1-2 seconds

#### 2. Check your internet connection
- Fast internet = faster API calls
- Slow WiFi might cause delays

#### 3. Close unused extensions
- Other extensions can slow down Chrome
- Try disabling them temporarily

---

## Still Having Issues?

1. Check the console for error messages: `Ctrl+Shift+J`
2. Read through the **AUTHENTICATION_SETUP.md** guide
3. Review the error message carefully - it usually tells you what's wrong
4. Try the solutions in order (reload, restart, etc.)
5. If still stuck, create an issue with:
   - Full error message
   - Steps to reproduce
   - Browser version
   - Console logs

Good luck! 🌱
