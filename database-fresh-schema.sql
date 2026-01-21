-- Fresh Database Schema - Complete Redesign

-- Step 1: Rename items table to type (or create new)
DROP TABLE IF EXISTS type CASCADE;
CREATE TABLE type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Recreate inventory table - NO quantity, each item is its own row
DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES type(id) ON DELETE CASCADE,
  acquired_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create shop table - listing of items for sale
DROP TABLE IF EXISTS shop CASCADE;
CREATE TABLE shop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES type(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT owner_type_unique UNIQUE(owner_id, type_id)
);

-- Step 4: Create friends table with request/accept flow
DROP TABLE IF EXISTS friends CASCADE;
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT no_self_friend CHECK (requester_id != recipient_id),
  CONSTRAINT unique_friendship UNIQUE(requester_id, recipient_id)
);

-- Step 5: Optional - transactions table for history (read-only)
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES type(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price > 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Enable RLS
ALTER TABLE type ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies - type (public read)
DROP POLICY IF EXISTS "Anyone can view types" ON type;
CREATE POLICY "Anyone can view types" ON type FOR SELECT USING (true);

-- Step 7: RLS Policies - inventory (only own items)
DROP POLICY IF EXISTS "Users can view own inventory" ON inventory;
CREATE POLICY "Users can view own inventory" ON inventory FOR SELECT USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own inventory" ON inventory;
CREATE POLICY "Users can create own inventory" ON inventory FOR INSERT WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own inventory" ON inventory;
CREATE POLICY "Users can delete own inventory" ON inventory FOR DELETE USING (account_id = auth.uid());

-- Step 8: RLS Policies - shop (anyone can view, owner can delete own, anyone can delete to complete purchase)
DROP POLICY IF EXISTS "Anyone can view shop listings" ON shop;
CREATE POLICY "Anyone can view shop listings" ON shop FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their listings" ON shop;
CREATE POLICY "Users can create their listings" ON shop FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their listings" ON shop;
CREATE POLICY "Users can delete their listings" ON shop FOR DELETE USING (true);

-- Step 9: RLS Policies - friends (users can manage their own requests)
DROP POLICY IF EXISTS "Users can view friend requests" ON friends;
CREATE POLICY "Users can view friend requests" ON friends FOR SELECT USING (requester_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
CREATE POLICY "Users can create friend requests" ON friends FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can accept/reject friend requests" ON friends;
CREATE POLICY "Users can accept/reject friend requests" ON friends FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete friend requests" ON friends;
CREATE POLICY "Users can delete friend requests" ON friends FOR DELETE USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- Step 10: RLS Policies - transactions (view own transactions)
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "System can create transactions" ON transactions;
CREATE POLICY "System can create transactions" ON transactions FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Step 11: Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_account_id ON inventory(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_type_id ON inventory(type_id);
CREATE INDEX IF NOT EXISTS idx_shop_owner_id ON shop(owner_id);
CREATE INDEX IF NOT EXISTS idx_shop_type_id ON shop(type_id);
CREATE INDEX IF NOT EXISTS idx_friends_requester_id ON friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_recipient_id ON friends(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);

-- Step 12: Create trigger to delete shop listing when transaction is created
DROP FUNCTION IF EXISTS delete_shop_on_purchase() CASCADE;
CREATE FUNCTION delete_shop_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM shop 
  WHERE type_id = NEW.type_id AND owner_id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_shop_on_purchase ON transactions;
CREATE TRIGGER trigger_delete_shop_on_purchase
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION delete_shop_on_purchase();

-- Step 13: Insert sample types (if they don't exist)
INSERT INTO type (name, rarity, description) VALUES
  ('Common Sword', 'common', 'A basic iron sword'),
  ('Wooden Shield', 'common', 'A sturdy wooden shield'),
  ('Enchanted Amulet', 'rare', 'Glows with magic power'),
  ('Dragon Egg', 'legendary', 'A legendary dragon egg')
ON CONFLICT (name) DO NOTHING;

-- Done! Fresh schema with automatic deletion on purchase is ready.
