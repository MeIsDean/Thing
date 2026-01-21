# Quick Start Guide

## 5-Minute Setup

### Step 1: Create Supabase Project (2 min)
1. Go to [supabase.com](https://supabase.com) → Sign up/Sign in
2. Click "New Project"
3. Name it "game-dashboard"
4. Save password, choose region
5. Wait for initialization

### Step 2: Setup Database (1 min)
1. In Supabase, go to "SQL Editor"
2. Click "New Query"
3. Copy ALL content from `database-setup.sql` in this folder
4. Paste it into the editor
5. Click "Run"

### Step 3: Get Your Credentials (1 min)
1. Go to "Settings" > "API"
2. Copy:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **Anon Public Key** → `REACT_APP_SUPABASE_ANON_KEY`

### Step 4: Enable Google OAuth (1 min)
1. Create OAuth app at [console.cloud.google.com](https://console.cloud.google.com)
2. Get Client ID
3. In Supabase, go to "Authentication" > "Providers"
4. Enable "Google" and paste your Client ID + Secret
5. Save

### Step 5: Create .env.local
Create a file named `.env.local` in the project folder:
```
REACT_APP_SUPABASE_URL=paste_your_url_here
REACT_APP_SUPABASE_ANON_KEY=paste_your_key_here
```

### Step 6: Run Locally
```bash
# Using Python
python -m http.server 3000

# Using Node
npx http-server -p 3000
```

Visit: `http://localhost:3000`

---

## Deploy to Vercel

### Option 1: GitHub + Vercel (Easiest)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/game-dashboard.git
git push -u origin main
```

Then:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Add env variables (same as .env.local)
4. Deploy!

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## Test It!

1. Open the app
2. Click "Google Sign In"
3. Authorize
4. Add score (+10, +50, +100)
5. Add items to inventory
6. Check Supabase database - data is there!

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "Configure Supabase" error | Check `.env.local` exists with correct values |
| Google login fails | Check OAuth redirect URIs include your URL |
| Can't add items | Check database tables were created successfully |
| Data not saving | Check browser console for errors (F12) |

---

## Next Steps

- Customize the UI in `style.css`
- Add more features in `script.js`
- Update score multipliers in the buttons (change 10, 50, 100 values)
- Add different item types with categories
- Create a leaderboard (query all users' scores)
- Add achievements/badges system

---

Need help? Check the full README.md for detailed documentation!
