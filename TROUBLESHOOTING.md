# Troubleshooting Guide

## Common Issues & Solutions

### 🔧 Setup Issues

#### "Please configure your Supabase credentials"

**Problem**: The app shows an error message on the login page.

**Causes**:
- `.env.local` file doesn't exist
- Environment variables not set correctly
- Environment variables not loaded after restart

**Solutions**:
1. Create `.env.local` file in project root (if not using Vercel)
2. Copy from `.env.example` and fill in your values:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Save the file
4. Restart your local server completely:
   - Stop the running server (Ctrl+C)
   - Start it again
5. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

**For Vercel Users**:
1. Go to Vercel dashboard → Your project
2. Click "Settings" → "Environment Variables"
3. Add:
   - Name: `REACT_APP_SUPABASE_URL`, Value: your URL
   - Name: `REACT_APP_SUPABASE_ANON_KEY`, Value: your key
4. Redeploy or wait for new deployment

---

### 🔐 Authentication Issues

#### Google login button doesn't work

**Problem**: Clicking the button does nothing or shows an error.

**Causes**:
- Google Client ID not configured
- Supabase Google provider not enabled
- Redirect URIs not whitelisted
- CORS policy blocking

**Solutions**:
1. **Check Google Cloud Console**:
   - Go to console.cloud.google.com
   - Find your project
   - Check OAuth 2.0 credentials exist
   - Verify Client ID is correct

2. **Check Supabase Configuration**:
   - Go to Supabase dashboard
   - Authentication → Providers
   - Google should be enabled (toggle green)
   - Client ID and Secret should be filled

3. **Update Redirect URIs**:
   ```
   Needed URIs:
   - http://localhost:3000 (local dev)
   - https://your-vercel-url.vercel.app (production)
   - https://your-project.supabase.co/auth/v1/callback
   ```
   
   Add them to:
   - Google Cloud Console → OAuth 2.0 credentials
   - Supabase → Authentication → Providers → Google settings

4. **Clear Cache**:
   - Clear browser cache
   - Clear cookies
   - Try in incognito/private window
   - Try different browser

5. **Check Browser Console**:
   - Press F12
   - Go to "Console" tab
   - Look for error messages
   - Google OAuth errors usually show here

#### "Invalid redirect_uri" error after login

**Problem**: Google login fails with redirect error.

**Solution**:
- The exact redirect URI must be in Google Console
- For localhost: `http://localhost:3000`
- For Vercel: `https://your-domain.vercel.app`
- Make sure there's no trailing slash
- Case sensitive!

#### Stuck on login page after Google authorization

**Problem**: You authorize Google but don't get redirected to dashboard.

**Solutions**:
1. Hard refresh (Ctrl+Shift+R)
2. Check browser console for errors (F12)
3. Verify Supabase credentials are correct
4. Check network tab for failed requests
5. Try in private/incognito window
6. Clear all cookies and try again

---

### 💾 Database Issues

#### "Database error" when trying to add items

**Problem**: Adding items fails with database error.

**Causes**:
- Tables don't exist
- RLS policies block access
- Wrong column names
- Supabase connection failed

**Solutions**:

1. **Check Tables Exist**:
   - Go to Supabase dashboard
   - Click "Table Editor"
   - Should see:
     - `user_profiles` table
     - `inventory` table
   - If not, run `database-setup.sql`

2. **Check RLS Policies**:
   - Go to each table
   - Click "RLS" button
   - Should show policies
   - If not, re-run the SQL setup

3. **Verify Supabase Connection**:
   - Check credentials in `.env.local`
   - Verify Project URL format: `https://xxx.supabase.co`
   - Verify Anon Key is correct length (long string)

4. **Check Browser Console**:
   - F12 → Console
   - Look for error details
   - Supabase usually shows specific error messages

#### Data not saving to database

**Problem**: You add items/score but it doesn't show in Supabase.

**Causes**:
- Not logged in
- RLS policies preventing write
- Network connection failed
- Supabase credentials wrong

**Solutions**:

1. **Verify You're Logged In**:
   - Check if user email shows in header
   - If not logged in, data won't save

2. **Check Network Requests**:
   - F12 → Network tab
   - Add an item
   - Look for POST/UPDATE requests to Supabase
   - Should show status 200-201

3. **Check RLS Policies**:
   ```sql
   -- Run in Supabase SQL Editor to verify:
   SELECT * FROM user_profiles;
   SELECT * FROM inventory;
   ```
   - If query fails, RLS is blocking you
   - Verify policies allow INSERT/UPDATE

4. **Check User ID**:
   - F12 → Application tab
   - Look for session/auth data
   - User ID should exist

#### "PGRST116" error

**Problem**: Specific error code in console.

**Meaning**: Row doesn't exist (usually harmless for profile creation)

**Solution**: This is normal - means profile will be created automatically. If you see this repeatedly, check RLS policies.

---

### 🎨 Frontend Issues

#### Page doesn't load at all (blank screen)

**Problem**: Opening the app shows blank page.

**Causes**:
- JavaScript error
- File not found
- Server not running
- CORS issue

**Solutions**:

1. **Check Server is Running**:
   - Python: `python -m http.server 3000`
   - Node: `http-server -p 3000`
   - Should show "Serving" message

2. **Check Browser Console**:
   - F12 → Console tab
   - Look for error messages
   - Check for 404 errors (missing files)

3. **Check Files Exist**:
   - `index.html`
   - `style.css`
   - `script.js`
   - All in project root

4. **Clear Cache**:
   - Hard refresh (Ctrl+Shift+R)
   - Clear browser cache
   - Close and reopen browser

#### Buttons not working

**Problem**: Clicking buttons does nothing.

**Causes**:
- JavaScript error
- Event listeners not attached
- Missing Supabase config
- Browser console errors

**Solutions**:

1. **Check Browser Console**:
   - F12 → Console
   - Look for JavaScript errors
   - Red text indicates problems

2. **Check Supabase Config**:
   - Buttons need Supabase initialized
   - Check `.env.local` exists and has correct values

3. **Try Page Refresh**:
   - Full page refresh (F5)
   - Hard refresh (Ctrl+Shift+R)

4. **Test in Different Browser**:
   - Try Chrome, Firefox, Safari
   - Browser-specific issues sometimes happen

#### Items don't appear after adding

**Problem**: You add an item but it doesn't show in inventory list.

**Causes**:
- Database save failed (check console)
- Display code has error
- Item added but not fetched
- Supabase returned error

**Solutions**:

1. **Check Console for Errors**:
   - F12 → Console
   - Add an item
   - Look for errors

2. **Check Network Request**:
   - F12 → Network
   - Look for request to Supabase
   - Should be status 200-201

3. **Verify Database Has Data**:
   - Supabase dashboard
   - Table Editor → inventory
   - Should see your item

4. **Try Refreshing Page**:
   - If item saved but not showing, refresh might help
   - Data will load from database

#### Style looks broken (ugly colors, misaligned)

**Problem**: CSS not loading properly.

**Causes**:
- `style.css` file missing
- CSS file not in project root
- Browser cache issue

**Solutions**:

1. **Check style.css Exists**:
   - Should be in project root
   - Same folder as `index.html`

2. **Hard Refresh**:
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)
   - Clears browser cache

3. **Check File Extension**:
   - Must be exactly `style.css`
   - Not `styles.css` or `style.scss`
   - Lowercase extension

---

### 📱 Mobile/Responsive Issues

#### Layout broken on mobile

**Problem**: App looks weird on phone screen.

**Causes**:
- CSS media queries not working
- Viewport meta tag issue
- Browser zoom level

**Solutions**:

1. **Check Viewport Tag**:
   - Should be in `<head>`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **Check Device Zoom**:
   - Phone: Try zooming out (pinch)
   - Browser: Check zoom level (Ctrl+0 to reset)

3. **Test Different Phones**:
   - Try different device sizes
   - Use browser DevTools mobile view (F12 → device icon)

#### Buttons hard to click on mobile

**Problem**: Too small or hard to tap.

**Solution**:
- Buttons have 48px minimum height (mobile standard)
- If still hard, zoom in (pinch to zoom)
- Try landscape orientation

---

### 🚀 Deployment Issues

#### Deployment fails on Vercel

**Problem**: Build fails or deployment shows red X.

**Solutions**:

1. **Check Build Logs**:
   - Vercel dashboard → Deployments
   - Click failed deployment
   - Read the error message
   - Usually says what's wrong

2. **Common Causes**:
   - `.env.local` not added to Vercel (add environment variables)
   - Missing files (check GitHub has all files)
   - Typo in environment variable names

3. **Verify Files in GitHub**:
   ```
   index.html ✓
   style.css ✓
   script.js ✓
   package.json ✓
   vercel.json ✓
   ```
   - All should be pushed to main branch

4. **Check Environment Variables**:
   - Vercel Settings → Environment Variables
   - Add both:
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`
   - Redeploy

#### App loads but shows blank page on Vercel

**Problem**: Deployment successful but app doesn't work.

**Solutions**:

1. **Check Browser Console**:
   - F12 → Console
   - Look for error messages
   - Usually shows what's wrong

2. **Verify Environment Variables**:
   - Vercel Settings → Environment Variables
   - Check values are correct
   - Compare with working local version

3. **Update Google OAuth**:
   - Add Vercel URL to Google Console redirect URIs
   - Format: `https://your-domain.vercel.app`
   - Wait a few minutes for propagation

4. **Check Supabase**:
   - Make sure Google OAuth enabled in Supabase
   - Credentials haven't changed
   - Supabase project still active

#### Google login not working after deployment

**Problem**: Works locally but fails on Vercel.

**Causes**:
- Google redirect URI not updated
- Supabase credentials wrong
- CORS issue

**Solutions**:

1. **Update Google Console**:
   - Add exact Vercel URL
   - Format: `https://your-vercel-app.vercel.app`
   - No trailing slash
   - Wait 5-10 minutes for propagation

2. **Verify Credentials**:
   - Compare Vercel env vars with local `.env.local`
   - Should be identical
   - Copy-paste to avoid typos

3. **Check Supabase Status**:
   - Go to Supabase dashboard
   - Check project is running
   - Check Google provider still enabled

---

### 📊 Performance Issues

#### App loads slowly

**Problem**: Takes a long time to load.

**Causes**:
- Slow internet connection
- Supabase project loading
- Many users on free tier
- Browser cache needs clearing

**Solutions**:

1. **Check Internet Speed**:
   - Test at speedtest.net
   - If slow, that's the issue
   - Try different network

2. **Check Supabase Status**:
   - Go to status.supabase.com
   - Should show all green
   - If red, might be experiencing issues

3. **Clear Browser Cache**:
   - F12 → Application
   - Clear all cache
   - Refresh page

4. **Upgrade Supabase** (if needed):
   - Free tier has some limitations
   - Paid tier has better performance

#### Buttons are slow to respond

**Problem**: Click button, nothing happens for few seconds.

**Causes**:
- Network latency
- Supabase slow
- Database query slow
- Too many users on free tier

**Solutions**:

1. **Check Network Tab**:
   - F12 → Network
   - Click button
   - See how long request takes
   - >5 seconds = slow connection or server

2. **Try Different Server**:
   - Supabase has multiple regions
   - Check your region is close to you
   - Can't change after project creation

3. **Optimize Queries**:
   - Check Supabase indexes exist
   - Already done in `database-setup.sql`

4. **Check Supabase Status**:
   - Maybe free tier is overloaded
   - Consider upgrading to pro tier

---

## Getting Help

### Where to Find Answers

1. **Check Docs**:
   - README.md - General setup
   - API_EXAMPLES.md - Advanced features
   - FEATURES.md - What app can do

2. **Check Browser Console**:
   - Press F12
   - Go to Console tab
   - Errors usually tell you what's wrong

3. **Check Supabase Logs**:
   - Supabase dashboard → Logs
   - See what went wrong on backend

4. **Check Vercel Logs**:
   - Vercel dashboard → Deployments
   - Click deployment → Logs
   - See deployment errors

5. **Official Docs**:
   - [Supabase Docs](https://supabase.com/docs)
   - [Vercel Docs](https://vercel.com/docs)
   - [Google OAuth Docs](https://developers.google.com/identity)

### Debug Checklist

When something doesn't work:
- [ ] Check browser console (F12)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Check `.env.local` values
- [ ] Verify Supabase credentials
- [ ] Check database tables exist
- [ ] Try different browser
- [ ] Try incognito window
- [ ] Check internet connection
- [ ] Restart server (if local)
- [ ] Check official documentation

---

Still stuck? Check the specific error messages in browser console - they usually give the exact problem!
