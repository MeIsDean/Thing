-- Add Friends and Player Marketplace Tables to Existing Database
-- This script adds tables for the Friends and P2P Marketplace functionality

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

-- Step 2: Create player_listings table (items for sale by players)
CREATE TABLE IF NOT EXISTS player_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_listings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for friends table
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

-- Step 5: Create RLS policies for player_listings table
DROP POLICY IF EXISTS "Anyone can view player listings" ON player_listings;
CREATE POLICY "Anyone can view player listings" ON player_listings
  FOR SELECT USING (expires_at > NOW());

DROP POLICY IF EXISTS "Users can create their own listings" ON player_listings;
CREATE POLICY "Users can create their own listings" ON player_listings
  FOR INSERT WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own listings" ON player_listings;
CREATE POLICY "Users can update their own listings" ON player_listings
  FOR UPDATE USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own listings" ON player_listings;
CREATE POLICY "Users can delete their own listings" ON player_listings
  FOR DELETE USING (seller_id = auth.uid());

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_player_listings_seller_id ON player_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_player_listings_expires_at ON player_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_player_listings_item_id ON player_listings(item_id);

-- Done! The database is ready for friends and player marketplace functionality.
