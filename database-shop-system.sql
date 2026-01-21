-- Fresh Shop System with Shop and Transactions Tables

-- Step 1: Create shop table (active player offers)
CREATE TABLE IF NOT EXISTS shop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price INTEGER NOT NULL CHECK (price > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT seller_item_unique UNIQUE(seller_id, item_id)
);

-- Step 2: Create transactions table (purchase history)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price INTEGER NOT NULL CHECK (price > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- Step 3: Enable Row Level Security
ALTER TABLE shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Step 4: Shop table RLS policies
DROP POLICY IF EXISTS "Anyone can view shop listings" ON shop;
CREATE POLICY "Anyone can view shop listings" ON shop
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own listings" ON shop;
CREATE POLICY "Users can create their own listings" ON shop
  FOR INSERT WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own listings" ON shop;
CREATE POLICY "Users can delete their own listings" ON shop
  FOR DELETE USING (seller_id = auth.uid());

-- Step 5: Transactions table RLS policies
DROP POLICY IF EXISTS "Users can view all transactions" ON transactions;
CREATE POLICY "Users can view all transactions" ON transactions
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_seller_id ON shop(seller_id);
CREATE INDEX IF NOT EXISTS idx_shop_item_id ON shop(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);

-- Step 7: Create trigger to delete shop listing when purchased
DROP FUNCTION IF EXISTS delete_shop_listing_on_purchase() CASCADE;
CREATE FUNCTION delete_shop_listing_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the shop listing after transaction is created
  DELETE FROM shop WHERE item_id = NEW.item_id AND seller_id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_shop_on_purchase ON transactions;
CREATE TRIGGER trigger_delete_shop_on_purchase
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION delete_shop_listing_on_purchase();

-- Done! Fresh shop system is ready.
