#!/usr/bin/env node

// Build script for Vercel - injects environment variables into script.js
// Updated: 2026-01-21
const fs = require('fs');
const path = require('path');

console.log('Building for Vercel...');

// Read script.js
const scriptPath = path.join(__dirname, 'script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// Replace placeholders with environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('Injecting Supabase URL...');
content = content.replace('YOUR_SUPABASE_URL', supabaseUrl);

console.log('Injecting Supabase key...');
content = content.replace('YOUR_SUPABASE_ANON_KEY', supabaseKey);

// Write back
fs.writeFileSync(scriptPath, content, 'utf8');

console.log('Build complete!');
console.log('Supabase URL:', supabaseUrl.substring(0, 20) + '...');
console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...');
