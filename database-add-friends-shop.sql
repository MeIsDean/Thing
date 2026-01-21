-- Add Friends and Shop Tables to Existing Database
-- This script adds tables for the Friends and Shop functionality

-- Step 1: Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Step 2: Create shop_listings table (items available for sale)
CREATE TABLE IF NOT EXISTS shop_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  buy_price INTEGER NOT NULL DEFAULT 100,
  sell_price INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(item_id)
);

-- Step 3: Create shop_transactions table (transaction history)
CREATE TABLE IF NOT EXISTS shop_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  price_per_unit INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for friends table
DROP POLICY IF EXISTS "Users can view their friends" ON friends;
CREATE POLICY "Users can view their friends" ON friends
  FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert friend requests" ON friends;
CREATE POLICY "Users can insert friend requests" ON friends
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their friends" ON friends;
CREATE POLICY "Users can update their friends" ON friends
  FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete friends" ON friends;
CREATE POLICY "Users can delete friends" ON friends
  FOR DELETE USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Step 6: Create RLS policies for shop_listings table
DROP POLICY IF EXISTS "Anyone can view shop listings" ON shop_listings;
CREATE POLICY "Anyone can view shop listings" ON shop_listings
  FOR SELECT USING (true);

-- Step 7: Create RLS policies for shop_transactions table
DROP POLICY IF EXISTS "Users can view their transactions" ON shop_transactions;
CREATE POLICY "Users can view their transactions" ON shop_transactions
  FOR SELECT USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can create transactions" ON shop_transactions;
CREATE POLICY "Users can create transactions" ON shop_transactions
  FOR INSERT WITH CHECK (account_id = auth.uid());

-- Step 8: Insert shop prices for existing items
INSERT INTO shop_listings (item_id, buy_price, sell_price) 
SELECT id, 100, 50 FROM items 
ON CONFLICT DO NOTHING;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_shop_transactions_account_id ON shop_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_shop_transactions_created_at ON shop_transactions(created_at);

-- Done! The database is ready for friends and shop functionality.
