-- Fresh Database Setup from Ground Zero
-- This script creates all tables with proper schema for the game system

-- Step 1: Drop all existing tables (clean slate)
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS items CASCADE;

-- Step 2: Create accounts table (linked to Supabase auth.users)
CREATE TABLE accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Player',
  money INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  last_collected TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create items table (global item definitions)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create inventory table (player item collections)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, item_id)
);

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for accounts table
DROP POLICY IF EXISTS "Users can view their own account" ON accounts;
CREATE POLICY "Users can view their own account" ON accounts
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own account" ON accounts;
CREATE POLICY "Users can update their own account" ON accounts
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own account" ON accounts;
CREATE POLICY "Users can insert their own account" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 7: Create RLS policies for items table
DROP POLICY IF EXISTS "Anyone can view items" ON items;
CREATE POLICY "Anyone can view items" ON items
  FOR SELECT USING (true);

-- Step 8: Create RLS policies for inventory table
DROP POLICY IF EXISTS "Users can view their inventory" ON inventory;
CREATE POLICY "Users can view their inventory" ON inventory
  FOR SELECT USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert into inventory" ON inventory;
CREATE POLICY "Users can insert into inventory" ON inventory
  FOR INSERT WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their inventory" ON inventory;
CREATE POLICY "Users can update their inventory" ON inventory
  FOR UPDATE USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete from inventory" ON inventory;
CREATE POLICY "Users can delete from inventory" ON inventory
  FOR DELETE USING (account_id = auth.uid());

-- Step 9: Insert sample items
INSERT INTO items (name, rarity, description) VALUES
  ('Common Coin', 'common', 'A basic coin worth 10 points'),
  ('Silver Gem', 'uncommon', 'An uncommon gem worth 50 points'),
  ('Golden Crown', 'rare', 'A rare crown worth 200 points'),
  ('Mystic Orb', 'epic', 'An epic orb worth 500 points'),
  ('Legendary Artifact', 'legendary', 'A legendary artifact worth 2000 points');

-- Step 10: Create indexes for performance
CREATE INDEX idx_accounts_created_at ON accounts(created_at);
CREATE INDEX idx_accounts_last_collected ON accounts(last_collected);
CREATE INDEX idx_inventory_account_id ON inventory(account_id);
CREATE INDEX idx_inventory_item_id ON inventory(item_id);
CREATE INDEX idx_items_rarity ON items(rarity);

-- Done! The database is ready for use.
