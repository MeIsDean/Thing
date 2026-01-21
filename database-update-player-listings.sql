-- Update Player Listings to Use Sold Status Instead of Deletion
-- This prevents the issue where buyers can't delete listings and items can be bought multiple times

-- Step 1: Add sold_at timestamp to track when a listing was purchased
ALTER TABLE player_listings ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP DEFAULT NULL;

-- Step 2: Update the browse query RLS policy to only show unsold listings
DROP POLICY IF EXISTS "Anyone can view player listings" ON player_listings;
CREATE POLICY "Anyone can view player listings" ON player_listings
  FOR SELECT USING (sold_at IS NULL AND expires_at > NOW());

-- Step 3: Allow buyers to mark listings as sold (by updating sold_at)
DROP POLICY IF EXISTS "Users can update their own listings" ON player_listings;
CREATE POLICY "Users can update their own listings" ON player_listings
  FOR UPDATE USING (seller_id = auth.uid() OR sold_at IS NULL);

-- Step 4: Keep existing delete policy in case needed for cleanup
-- (sellers can still manually delete their own unsold listings)
DROP POLICY IF EXISTS "Users can delete their own listings" ON player_listings;
CREATE POLICY "Users can delete their own listings" ON player_listings
  FOR DELETE USING (seller_id = auth.uid());

-- Done! Listings are now marked as sold instead of deleted.
