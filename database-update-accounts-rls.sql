-- Update Accounts Table RLS to Allow Public Read Access
-- This allows players to see other players' names for friends/marketplace

-- First, drop existing restrictive RLS policies on accounts
DROP POLICY IF EXISTS "Users can view their own account" ON accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own account" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own account" ON accounts;

-- Step 1: Create new RLS policies for accounts table
-- Anyone can read all accounts (needed for marketplace and friends)
CREATE POLICY "Anyone can view accounts" ON accounts
  FOR SELECT USING (true);

-- Users can only update their own account
CREATE POLICY "Users can update their own account" ON accounts
  FOR UPDATE USING (auth.uid() = id);

-- Users can only insert their own account
CREATE POLICY "Users can insert their own account" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only delete their own account
CREATE POLICY "Users can delete their own account" ON accounts
  FOR DELETE USING (auth.uid() = id);

-- Done! Accounts are now readable by all users for marketplace/friends functionality.
