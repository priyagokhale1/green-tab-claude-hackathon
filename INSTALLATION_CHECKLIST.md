# ✅ Installation & Troubleshooting Checklist

## Installation Checklist (First Time)

- [ ] Clone the repository
- [ ] Go to `chrome://extensions`
- [ ] Enable "Developer mode" (toggle top-right)
- [ ] Click "Load unpacked"
- [ ] Select the `green-tab-claude-hackathon` folder
- [ ] You should see GreenTab in your extensions list
- [ ] Click the GreenTab icon in your toolbar
- [ ] Popup should open showing "Loading..." or a website
- [ ] Wait 2-3 seconds for the popup to fully load
- [ ] You should see:
  - [ ] Website name/domain
  - [ ] "Green" or "Not Green" status badge
  - [ ] Session time
  - [ ] Environmental impact stats
  - [ ] "Sign in with Google" button

**If any step fails:** Go to Troubleshooting section below

---

## Sign-In Troubleshooting

### Getting "Failed to sign in" Error?

#### Quick Fixes (Try in Order)

1. **Reload the Extension**
   - [ ] Go to `chrome://extensions`
   - [ ] Find GreenTab
   - [ ] Click the blue refresh icon
   - [ ] Wait for it to finish
   - [ ] Close the GreenTab popup
   - [ ] Click GreenTab icon again
   - [ ] Try signing in again

2. **Close and Reopen Popup**
   - [ ] Click outside the popup to close it
   - [ ] Click the GreenTab icon to reopen
   - [ ] Try signing in again

3. **Restart Chrome**
   - [ ] Close Chrome completely
   - [ ] Reopen Chrome
   - [ ] Try signing in again

4. **Check Extension Loading**
   - [ ] Go to `chrome://extensions`
   - [ ] Find GreenTab
   - [ ] Check if it shows enabled (toggle is ON)
   - [ ] Check if there are any errors listed
   - [ ] If errors, click "Errors" to see details

5. **Update Your Code**
   - [ ] Open terminal
   - [ ] Run: `git pull origin main`
   - [ ] Wait for it to complete
   - [ ] Reload extension (step 1 above)
   - [ ] Try signing in again

6. **Clear Extension Storage**
   - [ ] Go to `chrome://extensions`
   - [ ] Find GreenTab
   - [ ] Click the three-dot menu
   - [ ] Select "Remove"
   - [ ] Close Chrome
   - [ ] Delete the GreenTab folder
   - [ ] Redownload/re-setup

### Still Not Working?

- [ ] Open DevTools: `Ctrl+Shift+J` (Windows) or `Cmd+Option+J` (Mac)
- [ ] Look for red error messages
- [ ] Screenshot the error
- [ ] Screenshot the DevTools console
- [ ] Read `TROUBLESHOOTING.md` for your specific error
- [ ] Try the solutions in `TROUBLESHOOTING.md`

---

## OAuth Setup Checklist (First Time)

If you get "OAuth Configuration Error":

1. **Get Your Extension ID**
   - [ ] Go to `chrome://extensions`
   - [ ] Find GreenTab
   - [ ] Click on the ID to copy it
   - [ ] Your redirect URL: `https://[ID].chromiumuser-scripts.xyz/`

2. **Configure Google OAuth**
   - [ ] Go to Google Cloud Console
   - [ ] Find your OAuth 2.0 Client credentials
   - [ ] Go to "Authorized redirect URIs"
   - [ ] Add your redirect URL
   - [ ] Save changes

3. **Configure Supabase**
   - [ ] Go to your Supabase project
   - [ ] Go to Authentication > URL Configuration
   - [ ] Add your redirect URL
   - [ ] Save changes

4. **Test It**
   - [ ] Reload the extension
   - [ ] Try signing in again

See `FIX_REDIRECT_URI_MISMATCH.md` for detailed instructions.

---

## Data Tracking Checklist

### Not Seeing Time Track?

- [ ] Make sure you're on a regular website (not chrome://)
- [ ] Wait at least 2 seconds
- [ ] The popup needs to query the background script
- [ ] Time should update every second once loaded

### Not Seeing Impact Stats?

- [ ] Check internet connection
- [ ] Wait 1-2 seconds for API call
- [ ] Open DevTools (`Ctrl+Shift+J`) to see if API errors
- [ ] Try another website
- [ ] Check if adblocker is blocking API calls

### Data Not Syncing?

- [ ] Make sure you're signed in
- [ ] Check that you see your name + "Sign out" button
- [ ] Wait 5 minutes for sync (runs every 5 min)
- [ ] Check that Supabase is configured (in popup.js)
- [ ] Check DevTools console for API errors

---

## Chrome Extensions Management Checklist

### To Find Your Extensions
- [ ] Click the extension puzzle icon (top-right of toolbar)
- [ ] Look for GreenTab
- [ ] Pin it (click the pin icon) for easy access

### To Reload Extension
- [ ] Go to `chrome://extensions`
- [ ] Find GreenTab
- [ ] Click the refresh icon (circular arrow)
- [ ] Wait for it to finish loading

### To See Errors
- [ ] Go to `chrome://extensions`
- [ ] Enable "Developer mode" (top-right)
- [ ] Find GreenTab
- [ ] Click "Errors" if shown
- [ ] Read the error message carefully

### To Check Permissions
- [ ] Go to `chrome://extensions`
- [ ] Find GreenTab
- [ ] Click the info icon or "Details"
- [ ] Scroll to "Permissions"
- [ ] Should show: tabs, activeTab, storage, identity
- [ ] Should show host permissions for all sites

---

## DevTools Console Checklist

### How to Use DevTools
1. [ ] Right-click in the GreenTab popup
2. [ ] Select "Inspect"
3. [ ] Or press `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
4. [ ] Click the "Console" tab
5. [ ] You should see logs starting with "==="

### What to Look For

**Good Logs** ✅
```
✓ Chrome APIs validated
✓ Supabase client created
✓ Auth check complete
✓ OAuth flow completed successfully
```

**Bad Logs** ❌
```
✗ chrome.identity not available
✗ Failed to fetch from API
✗ Supabase session error
```

### How to Debug
- [ ] Take a screenshot of all red errors
- [ ] Search DevTools console for "error" or "Error"
- [ ] Copy the full error message
- [ ] Search that message in `TROUBLESHOOTING.md`

---

## Performance Checklist

### Extension Loading Slow?
- [ ] Check if you have many extensions installed
- [ ] Try disabling other extensions
- [ ] Check if APIs are slow (see Network tab in DevTools)
- [ ] Try a different website

### API Calls Slow?
- [ ] Check internet connection speed
- [ ] Try reloading the popup
- [ ] Try closing and reopening
- [ ] Try a different website

### Memory Usage High?
- [ ] This shouldn't happen - extensions are small
- [ ] If it is, try reloading the extension
- [ ] Check DevTools memory usage

---

## Before Reporting an Issue

Make sure you've checked:

- [ ] Read `QUICK_START_FIX.md`
- [ ] Read `TROUBLESHOOTING.md`
- [ ] Tried reloading extension
- [ ] Tried closing and reopening popup
- [ ] Tried restarting Chrome
- [ ] Checked DevTools console for errors
- [ ] Updated code (`git pull`)
- [ ] Checked manifest.json has all permissions
- [ ] Verified Supabase keys are configured

---

## Success Criteria

### Installation Complete When:
- [ ] GreenTab appears in extension list
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicked
- [ ] No errors in console

### Sign-In Works When:
- [ ] Click "Sign in with Google"
- [ ] Google login page appears
- [ ] You complete login
- [ ] Popup shows your name
- [ ] Console shows "✓ Auth data saved"

### Tracking Works When:
- [ ] Open a website (e.g., google.com)
- [ ] Click GreenTab icon
- [ ] See non-zero time (e.g., "5 sec")
- [ ] See impact stats (energy, water, CO₂)
- [ ] Stats update in real-time

### Sync Works When:
- [ ] You're signed in
- [ ] Console shows "✓ Data sync completed"
- [ ] (Give it 5 minutes after first sign-in)

---

## Quick Reference

| Problem | Solution | Doc |
|---------|----------|-----|
| Chrome identity error | Reload extension | QUICK_START_FIX.md |
| OAuth not working | Configure redirect URI | FIX_REDIRECT_URI_MISMATCH.md |
| Time not showing | Wait 2 sec / reload | TROUBLESHOOTING.md |
| Impact not showing | Wait 2 sec / check internet | TROUBLESHOOTING.md |
| Data not syncing | Sign in / check config | TROUBLESHOOTING.md |
| Green hosting unknown | Wait 2 sec / check internet | TROUBLESHOOTING.md |
| Extension won't load | Check manifest / reload | TROUBLESHOOTING.md |

---

## 🎉 You're All Set!

Once everything is working:
- ✅ Browse normally
- ✅ Click GreenTab to see impact
- ✅ Sign in to save your data
- ✅ Watch your environmental impact in real-time

**Happy sustainable browsing! 🌿**
