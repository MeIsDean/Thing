# Game Dashboard

A modern web application with Google OAuth login, user scoring system, and inventory management powered by Supabase.

## Features

- 🔐 Google OAuth authentication via Supabase
- 📊 User score tracking system
- 📦 Inventory management with item tracking
- 👤 User accounts with persistent data
- 🗑️ Account deletion and sign out
- 🚀 Ready for Vercel deployment
- 📱 Fully responsive design

## Prerequisites

Before you start, make sure you have:

1. A Supabase account ([create one here](https://supabase.com))
2. A Google OAuth application ([setup guide](https://support.google.com/cloud/answer/6158849))
3. Git installed
4. A GitHub account
5. A Vercel account ([create one here](https://vercel.com))

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - Project name: "game-dashboard"
   - Database password: (generate a strong password)
   - Region: (choose closest to you)
4. Wait for the project to initialize

### 2. Create Database Tables

In your Supabase project, go to the SQL Editor and run:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for inventory
CREATE POLICY "Users can view their own inventory"
  ON inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert items to their inventory"
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON inventory FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000` (for local development)
   - Your deployed Vercel URL: `https://your-app.vercel.app`
   - Also add: `https://your-supabase-project.supabase.co/auth/v1/callback`
7. Copy your Client ID

### 4. Configure Supabase for Google OAuth

1. In Supabase, go to "Authentication" > "Providers"
2. Find "Google" and click to enable it
3. Paste your Google Client ID and Client Secret
4. Save

### 5. Get Supabase Credentials

In your Supabase project:

1. Go to "Settings" > "API"
2. Copy:
   - Project URL (this is your `REACT_APP_SUPABASE_URL`)
   - Anon Public key (this is your `REACT_APP_SUPABASE_ANON_KEY`)

### 6. Local Development

1. Clone or download this project
2. Create `.env.local` file in the project root
3. Add your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start local server:
   ```bash
   # Using Python 3
   python -m http.server 3000
   
   # Or using Node.js
   npx http-server -p 3000
   ```
5. Open `http://localhost:3000` in your browser

### 7. Deploy to Vercel

#### Option A: GitHub + Vercel (Recommended)

1. Push this project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/game-dashboard.git
   git branch -M main
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `REACT_APP_SUPABASE_URL`: Your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase key
6. Click "Deploy"

#### Option B: Direct Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts and add environment variables when asked

### 8. Update Redirect URIs

After deploying to Vercel:

1. Get your Vercel deployment URL (e.g., `https://game-dashboard-xyz.vercel.app`)
2. Update Google OAuth:
   - Add `https://your-vercel-url.vercel.app` to authorized origins
   - Add `https://your-vercel-url.vercel.app` to authorized redirect URIs
3. Update Supabase Google provider with your Vercel URL in the callback settings

## File Structure

```
.
├── index.html           # Main HTML file
├── style.css           # Styling
├── script.js           # Frontend logic and Supabase integration
├── package.json        # Project metadata
├── vercel.json         # Vercel configuration
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Usage

### Logging In
1. Click "Google Sign In"
2. Authorize with your Google account
3. You'll be redirected to your dashboard

### Managing Score
1. Use the buttons (+10, +50, +100) to add score
2. Score is saved to your profile

### Managing Inventory
1. Enter item name and quantity
2. Click "Add Item"
3. Items appear in your inventory
4. Click "Remove" to delete items

### Account Management
1. Click "Sign Out" to logout
2. Go to "Account Settings" and click "Delete Account" to permanently delete everything
   - This removes all your data and logs you out

## Environment Variables

Create a `.env.local` file with:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security Notes

- Never commit `.env.local` to version control
- The `.env.example` file shows what variables you need
- Supabase Row Level Security (RLS) ensures users can only access their own data
- Google OAuth handles password security

## Backend Account Deletion

To fully delete user accounts from the auth system (not just data), you'll need a backend. Create a simple Node.js/Python backend that:

1. Accepts a request with the user ID
2. Uses the Supabase admin API key to delete the user
3. Returns success/failure

This is needed because the client-side code can't access the admin API.

Example Node.js backend endpoint:

```javascript
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Admin key!
);

app.post('/api/delete-user', async (req, res) => {
  const { userId } = req.body;
  try {
    await admin.auth.admin.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

### "Please configure your Supabase credentials"
- Make sure you've added environment variables to `.env.local` (local) or Vercel (production)
- Restart your development server after adding env vars

### Google login not working
- Check that Google OAuth callback URLs are correctly configured
- Verify Client ID matches in both Google Console and Supabase
- Clear browser cookies and try again

### Database permission errors
- Check that Row Level Security policies are properly configured
- Ensure the user is logged in before accessing protected data

### Data not saving
- Check browser console for errors (F12)
- Verify Supabase tables exist and have correct names
- Check that RLS policies allow the operations

## Support

For issues with:
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **Google OAuth**: [Google Auth Documentation](https://developers.google.com/identity/protocols/oauth2)

## License

MIT
