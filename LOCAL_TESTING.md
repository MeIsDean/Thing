# Local Testing Guide

Test your application locally before deploying to Vercel.

## Prerequisites

- Python 3 OR Node.js installed
- `.env.local` file with Supabase credentials
- Supabase project created and configured
- Google OAuth setup complete

## Starting the Local Server

### Option 1: Using Python (No Installation Needed)

```bash
# Python 3
python -m http.server 3000

# Or if you're on an older Python version
python3 -m http.server 3000
```

### Option 2: Using Node.js HTTP Server

```bash
# Install globally (one time)
npm install -g http-server

# Run the server
http-server -p 3000
```

### Option 3: Using Node.js with Live Reload

```bash
# Install
npm install -g live-server

# Run
live-server --port=3000
```

## Access Your App

Once the server is running, visit:
```
http://localhost:3000
```

You should see the login page.

## Testing Checklist

### 1. Authentication Flow
- [ ] Page loads without errors
- [ ] "Google Sign In" button visible
- [ ] Click button → Google login popup appears
- [ ] Authorize with your Google account
- [ ] Redirected to dashboard
- [ ] User email displayed in header

### 2. Score System
- [ ] Score displays as 0 initially
- [ ] Click "+10" button → Score increases to 10
- [ ] Click "+50" button → Score increases to 60
- [ ] Click "+100" button → Score increases to 160
- [ ] Page refresh → Score persists (saved in Supabase)
- [ ] Score shows in Supabase dashboard

### 3. Inventory System
- [ ] Empty inventory message displays
- [ ] Enter "Sword" and quantity "1"
- [ ] Click "Add Item" → Item appears
- [ ] Enter "Potion" and quantity "5"
- [ ] Click "Add Item" → Second item appears
- [ ] Try adding same item again → Quantity increases
- [ ] Click "Remove" → Item is deleted
- [ ] Items persist after page refresh
- [ ] Items show in Supabase database

### 4. Data Persistence
- [ ] Page refresh → All data persists
- [ ] Close and reopen browser → Still logged in
- [ ] Close tab and reopen → Still logged in (same browser)
- [ ] Sign out and sign back in → Data still there
- [ ] Check Supabase → See your data in tables

### 5. Sign Out
- [ ] Click "Sign Out" button
- [ ] Logged out and back at login page
- [ ] Session cleared
- [ ] Click sign in again → Can login

### 6. Delete Account
- [ ] Click "Delete Account"
- [ ] Confirmation modal appears
- [ ] Click "Cancel" → Modal closes
- [ ] Click "Delete Account" again
- [ ] Click "Confirm" → Account deleted
- [ ] Logged out to login page
- [ ] Check Supabase → Your data is gone
- [ ] Try logging back in with same account → Creates fresh profile

### 7. UI/Responsiveness
- [ ] Desktop (1920px) → Layout looks good
- [ ] Tablet (768px) → Responsive and readable
- [ ] Mobile (375px) → Buttons clickable, no overflow
- [ ] All text readable at all sizes
- [ ] Buttons aligned properly
- [ ] No horizontal scrolling needed

### 8. Error Handling
- [ ] Try adding empty item name → Error message shown
- [ ] Check browser console (F12) → No red errors
- [ ] Network tab → All requests successful (200 status)
- [ ] Supabase working without errors

## Browser Console Testing (F12)

Open Developer Tools (F12) and check:

1. **Console Tab**
   - No red error messages
   - No warning about mixed content
   - No CORS errors

2. **Network Tab**
   - All requests successful (green, 200-300 status)
   - Main requests:
     - index.html
     - style.css
     - script.js
     - Supabase library from CDN
     - API calls to Supabase

3. **Application Tab**
   - Check localStorage for auth token
   - Should contain session data from Supabase

## Testing Different Browsers

Test on multiple browsers to ensure compatibility:

```
✓ Chrome/Chromium
✓ Firefox
✓ Safari
✓ Edge
✓ Mobile browsers (Chrome Mobile, Safari iOS)
```

## Common Issues & Fixes

### Issue: "Please configure your Supabase credentials"

**Solution:**
1. Create `.env.local` file in project root
2. Add your credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-key-here
   ```
3. Restart the local server
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Google login gives error

**Solution:**
1. Check Google Client ID in Supabase matches
2. Verify `http://localhost:3000` is in Google OAuth redirect URIs
3. Clear browser cookies
4. Try incognito/private window

### Issue: Items not saving to database

**Solution:**
1. Check browser console for errors (F12)
2. Verify Supabase tables exist (check in Supabase dashboard)
3. Check RLS policies are correct
4. Verify you're logged in
5. Check internet connection

### Issue: Data disappears after refresh

**Solution:**
1. Check Supabase connection working
2. Verify browser isn't in private mode (session storage issue)
3. Check network tab for failed requests
4. Clear browser cache and try again

## Performance Testing

Check performance:

```javascript
// Paste in browser console (F12)
performance.measure('app-start', 'navigationStart', 'loadEventEnd');
const measure = performance.getEntriesByName('app-start')[0];
console.log(`App load time: ${measure.duration}ms`);
```

Should be under 2 seconds for local network.

## Testing Multiple Users

1. **User 1:**
   - Sign in with first Google account
   - Add score and items
   - Note the data

2. **User 2 (Different browser/incognito):**
   - Sign in with different Google account
   - Should see fresh dashboard
   - Should NOT see User 1's data
   - RLS policies working!

3. **Verify Isolation:**
   - Each user can only see their own data
   - Supabase RLS ensures this

## Database Testing

Verify data in Supabase:

1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Run:
   ```sql
   SELECT * FROM user_profiles;
   SELECT * FROM inventory;
   ```
4. Should see your data from the app

## Before Deployment

Make sure you've tested:
- [ ] All features work
- [ ] No console errors
- [ ] Data persists
- [ ] Multiple user scenario works
- [ ] Mobile responsive
- [ ] Google login works smoothly

## Next Steps

Once all tests pass:
1. Push to GitHub
2. Follow `DEPLOYMENT_CHECKLIST.md`
3. Deploy to Vercel
4. Run same tests on deployed URL

---

**Ready to deploy?** Check `DEPLOYMENT_CHECKLIST.md` next!
