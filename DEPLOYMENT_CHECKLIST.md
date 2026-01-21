# Deployment Checklist

Use this checklist to ensure everything is ready before deploying to Vercel.

## Pre-Deployment Checklist

### Supabase Setup
- [ ] Supabase project created
- [ ] Database tables created (run database-setup.sql)
- [ ] Row Level Security (RLS) policies enabled
- [ ] Project URL copied
- [ ] Anon public key copied

### Google OAuth Setup
- [ ] Google Cloud project created
- [ ] OAuth 2.0 Client ID created
- [ ] Client ID and Secret saved
- [ ] Google OAuth enabled in Supabase
- [ ] Credentials pasted in Supabase

### Local Development
- [ ] `.env.local` file created with credentials
- [ ] App runs locally without errors
- [ ] Google login works
- [ ] Can add/view score
- [ ] Can add/remove inventory items
- [ ] Sign out button works
- [ ] Delete account button works

### Code Quality
- [ ] No console errors
- [ ] All features tested
- [ ] Responsive design tested on mobile
- [ ] Environment variables not committed (check .gitignore)

### GitHub Setup (if using GitHub + Vercel)
- [ ] Repository created on GitHub
- [ ] Code pushed to main branch
- [ ] `.env.local` NOT in repository
- [ ] `.gitignore` properly configured

### Vercel Setup
- [ ] Vercel account created
- [ ] GitHub connected to Vercel (if using that method)
- [ ] New project created in Vercel
- [ ] Environment variables added:
  - [ ] `REACT_APP_SUPABASE_URL`
  - [ ] `REACT_APP_SUPABASE_ANON_KEY`

### Post-Deployment
- [ ] Deployment successful (no build errors)
- [ ] App loads at vercel URL
- [ ] Google login works with new URL
- [ ] Score saving works
- [ ] Inventory works
- [ ] Data persists after page refresh
- [ ] Check Supabase for saved data
- [ ] Update Google OAuth redirect URIs to include Vercel URL

## URLs to Update

After deploying to Vercel, update these:

### Google Cloud Console
- Add `https://your-vercel-url.vercel.app` to:
  - Authorized origins
  - Authorized redirect URIs

### Supabase (if needed)
- Update Google provider callback settings if they reference specific URLs

## Final Checks

```bash
# Before pushing to GitHub
git status  # Make sure .env.local is NOT listed

# Verify deployment
curl https://your-vercel-url.vercel.app  # Should return HTML
```

## Troubleshooting Post-Deployment

If something doesn't work after deployment:

1. Check Vercel deployment logs
   - Go to Vercel dashboard → your project → Deployments
   - Click on the latest deployment
   - Check "Build Logs" and "Runtime Logs"

2. Check browser console (F12)
   - Look for error messages
   - Check Network tab for failed requests

3. Verify environment variables
   - Vercel dashboard → Settings → Environment Variables
   - Make sure values are correct (copy-paste them again)

4. Check Supabase logs
   - Supabase dashboard → Logs
   - Look for auth or database errors

5. Test Google OAuth flow
   - Make sure redirect URL matches exactly
   - Check Google Cloud Console for errors

## Common Deployment Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" errors | Check all files are pushed to GitHub |
| Environment variables undefined | Re-add env vars in Vercel dashboard |
| Google login gives error | Update redirect URIs in Google Cloud |
| "Database error" | Check RLS policies and Supabase status |
| Blank page | Check browser console, verify Supabase URL is correct |

## Success Indicators

Your deployment is successful when:
- ✅ App loads without errors
- ✅ Google login completes successfully
- ✅ User data saves to Supabase
- ✅ Score persists after logout/login
- ✅ Inventory items appear in database
- ✅ Delete account removes data
- ✅ Browser console has no errors

---

**Now you're ready to deploy!** 🚀
