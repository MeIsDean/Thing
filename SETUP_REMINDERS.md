# Setup Reminders

## Before You Start

Make sure you have:
- [ ] Supabase account (free at supabase.com)
- [ ] Google Cloud account (free at console.cloud.google.com)
- [ ] GitHub account (for Vercel deployment)
- [ ] Vercel account (free at vercel.com)
- [ ] Text editor or VS Code installed

## Critical: Files to NOT Commit

⚠️ **IMPORTANT**: These must NOT go to GitHub:

```
.env.local          ← Your secret credentials!
.env                ← Environment variables
*.local             ← Local overrides
node_modules/       ← Dependencies
```

These are already in `.gitignore` ✓

## Essential Credentials

You'll need THREE pieces of information:

### From Supabase
1. **Project URL**
   - Format: `https://xxxx.supabase.co`
   - Location: Settings → API → Project URL
   - Used as: `REACT_APP_SUPABASE_URL`

2. **Anon Public Key**
   - Long string starting with `eyJ`
   - Location: Settings → API → anon public
   - Used as: `REACT_APP_SUPABASE_ANON_KEY`

### From Google Cloud
3. **OAuth Client ID**
   - Format: `xxx.apps.googleusercontent.com`
   - Location: APIs & Services → Credentials
   - Used in: Supabase Google provider config

## Step-by-Step Setup

### 1️⃣ Supabase Setup (5 minutes)

```
1. Go to supabase.com
2. Sign up/Log in
3. Click "New Project"
4. Fill in:
   - Name: game-dashboard
   - Password: (strong password)
   - Region: (closest to you)
5. Wait for initialization (3-5 min)
6. Copy URL and key to safe location
```

### 2️⃣ Database Setup (2 minutes)

```
1. In Supabase, go to SQL Editor
2. Click "New Query"
3. Copy EVERYTHING from database-setup.sql
4. Paste into editor
5. Click "Run"
6. Should see "success" messages
```

### 3️⃣ Google OAuth Setup (5 minutes)

```
1. Go to console.cloud.google.com
2. Create new project
3. Go to APIs & Services → Credentials
4. Click "Create Credentials" → OAuth 2.0 Client ID
5. Choose "Web application"
6. Add Authorized redirect URIs:
   - http://localhost:3000
   - https://your-vercel-url.vercel.app (later)
7. Copy Client ID
```

### 4️⃣ Supabase Google Provider Setup (2 minutes)

```
1. In Supabase, go to Authentication → Providers
2. Find "Google" and click to enable
3. Paste Client ID and Client Secret
4. Save
```

### 5️⃣ Local Setup (2 minutes)

```
1. Create .env.local in project root
2. Add:
   REACT_APP_SUPABASE_URL=https://your-url.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-long-key
3. Save file
4. Start server: python -m http.server 3000
5. Visit: http://localhost:3000
```

## Quick Reference

### Most Important URLs

| Service | URL |
|---------|-----|
| Supabase | https://supabase.com |
| Google Cloud | https://console.cloud.google.com |
| Vercel | https://vercel.com |
| Your App (Local) | http://localhost:3000 |

### Key Files You'll Edit

| File | Edit When | What to Add |
|------|-----------|------------|
| .env.local | Setup | Your credentials |
| script.js | Adding features | New JavaScript |
| style.css | Customizing | New styles |
| index.html | Adding UI | New HTML |

### Commands You'll Use

```bash
# Start local server
python -m http.server 3000

# Stop server (in terminal)
Ctrl+C

# Hard refresh browser
Ctrl+Shift+R  (Windows/Linux)
Cmd+Shift+R   (Mac)

# Deploy to Vercel
git push          # Push to GitHub
# Then deploy from Vercel dashboard
```

## Common Mistakes

❌ **Mistake**: Committing .env.local to GitHub
✅ **Fix**: It's in .gitignore, won't commit if you use git

❌ **Mistake**: Wrong Google redirect URIs
✅ **Fix**: Must match exactly - including protocol (http:// vs https://)

❌ **Mistake**: Credentials not in .env.local
✅ **Fix**: Create file with exact names: REACT_APP_SUPABASE_URL

❌ **Mistake**: Not running database-setup.sql
✅ **Fix**: Tables won't exist - run it in Supabase SQL Editor

❌ **Mistake**: Google not enabled in Supabase
✅ **Fix**: Go to Authentication → Providers → Enable Google

## Verification Checklist

After setup, verify everything:

```
Supabase:
☐ Project created
☐ Can access dashboard
☐ Tables exist (check Table Editor)
☐ Google provider enabled

Google OAuth:
☐ OAuth app created
☐ Client ID obtained
☐ Credentials in Supabase

Local Setup:
☐ .env.local created
☐ Credentials added
☐ Server running
☐ App loads at localhost:3000

Testing:
☐ Google login button visible
☐ Can click and authorize
☐ Dashboard appears after login
☐ Can add score
☐ Can add items
```

## What to Do If Stuck

1. **Check browser console** (F12)
   - Look for red error messages
   - Usually tells you what's wrong

2. **Check Supabase logs**
   - Supabase dashboard → Logs
   - Shows auth and database errors

3. **Read TROUBLESHOOTING.md**
   - Common issues with solutions
   - Specific error codes explained

4. **Re-verify credentials**
   - Copy-paste again (avoid typos)
   - Make sure no extra spaces
   - Compare with .env.example

## Success Indicators

✅ You know setup is working when:

1. Page loads at http://localhost:3000
2. "Google Sign In" button is visible
3. Clicking button opens Google login
4. After authorizing, dashboard appears
5. Email shown in header
6. Can add score and items
7. Data appears in Supabase database

## Next Steps After Setup Works

1. **Test all features** (use LOCAL_TESTING.md)
2. **Read FEATURES.md** (understand capabilities)
3. **Deploy to Vercel** (use DEPLOYMENT_CHECKLIST.md)
4. **Add custom features** (see API_EXAMPLES.md)

## Files Included

✓ index.html - UI structure
✓ style.css - Responsive styling
✓ script.js - App logic + Supabase
✓ package.json - Project info
✓ vercel.json - Vercel config
✓ database-setup.sql - Database schema
✓ .env.example - Credential template
✓ .gitignore - Git rules

## Need Help?

Start with these in order:

1. START_HERE.md - Navigation guide
2. QUICKSTART.md - 5-minute setup
3. README.md - Complete docs
4. TROUBLESHOOTING.md - Common issues
5. API_EXAMPLES.md - Add features

**Everything is documented. You got this!** 🚀

## Final Reminder

```
The most important thing:
Your .env.local file must exist and have correct values!

Without it, you'll see:
"Please configure your Supabase credentials"

To fix:
1. Create .env.local
2. Add credentials
3. Restart server
4. Hard refresh browser (Ctrl+Shift+R)
```

**Now go to START_HERE.md and pick your path!** 🎉
