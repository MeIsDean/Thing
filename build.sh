#!/bin/bash

# This script injects environment variables into script.js for Vercel deployment
# It runs during the Vercel build process

echo "Building for Vercel..."

# Replace placeholders with actual environment variables
sed -i "s|YOUR_SUPABASE_URL|${REACT_APP_SUPABASE_URL}|g" script.js
sed -i "s|YOUR_SUPABASE_ANON_KEY|${REACT_APP_SUPABASE_ANON_KEY}|g" script.js

echo "Build complete!"
