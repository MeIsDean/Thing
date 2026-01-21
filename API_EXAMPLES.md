<!-- Optional: API Examples for Advanced Features -->

<!-- This file contains code snippets for enhancing your game dashboard -->

# API Examples & Future Enhancements

## Backend Endpoint Examples

### 1. Delete User Auth Account (Node.js)

You'll need this to fully delete user authentication accounts.

```javascript
// api/deleteUser.js (using Express.js)
const { createClient } = require('@supabase/supabase-js');

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role key!
);

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Verify user is authenticated
    const { data: { user } } = await admin.auth.getUser(req.auth.token);
    if (user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete user from auth
    await admin.auth.admin.deleteUser(userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 2. Get Leaderboard (Supabase RPC)

```sql
-- Create a function for leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INT DEFAULT 10)
RETURNS TABLE(email VARCHAR, score INT, rank INT)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    email,
    score,
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank
  FROM user_profiles
  ORDER BY score DESC
  LIMIT limit_count;
$$;
```

Use in JavaScript:
```javascript
async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .rpc('get_leaderboard', { limit_count: limit });
  
  if (error) console.error(error);
  return data;
}
```

### 3. Add Achievements System

```sql
-- Create achievements table
CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_name VARCHAR(255) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can view their achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Add achievement trigger
CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- First 100 points
  IF NEW.score >= 100 AND OLD.score < 100 THEN
    INSERT INTO achievements (user_id, achievement_name)
    VALUES (NEW.user_id, 'Century Club');
  END IF;
  
  -- First 500 points
  IF NEW.score >= 500 AND OLD.score < 500 THEN
    INSERT INTO achievements (user_id, achievement_name)
    VALUES (NEW.user_id, 'High Roller');
  END IF;
  
  RETURN NEW;
END
$$;

CREATE TRIGGER achievement_trigger
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION check_achievements();
```

### 4. Item Rarity System

```sql
-- Add rarity column to inventory
ALTER TABLE inventory ADD COLUMN rarity VARCHAR(50) DEFAULT 'common';

-- Inventory with rarity
CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
ALTER TABLE inventory ALTER COLUMN rarity TYPE item_rarity USING rarity::item_rarity;

-- Update schema in JavaScript
async function addItemWithRarity(itemName, quantity, rarity) {
  const { error } = await supabase
    .from('inventory')
    .insert([{
      user_id: currentUser.id,
      item_name: itemName,
      quantity: quantity,
      rarity: rarity,
    }]);
  
  if (error) throw error;
}
```

## JavaScript Function Enhancements

### Get Total Item Count

```javascript
async function getTotalInventoryCount() {
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('user_id', currentUser.id);
  
  if (error) throw error;
  return data.reduce((sum, item) => sum + item.quantity, 0);
}
```

### Update Item Quantity

```javascript
async function updateItemQuantity(itemId, newQuantity) {
  if (newQuantity <= 0) {
    return removeItem(itemId);
  }

  const { error } = await supabase
    .from('inventory')
    .update({ quantity: newQuantity })
    .eq('id', itemId);
  
  if (error) throw error;
  
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', currentUser.id);
  
  updateInventoryDisplay(inventory || []);
}
```

### Batch Add Items

```javascript
async function addMultipleItems(items) {
  // items = [{name: 'sword', quantity: 2}, {name: 'potion', quantity: 5}]
  
  const itemsToInsert = items.map(item => ({
    user_id: currentUser.id,
    item_name: item.name,
    quantity: item.quantity,
  }));
  
  const { error } = await supabase
    .from('inventory')
    .insert(itemsToInsert);
  
  if (error) throw error;
  
  // Reload inventory
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', currentUser.id);
  
  updateInventoryDisplay(inventory || []);
}
```

## Advanced UI Enhancements

### Search/Filter Inventory

```javascript
function filterInventory(searchTerm) {
  const items = document.querySelectorAll('.inventory-item');
  
  items.forEach(item => {
    const itemName = item.querySelector('h4').textContent.toLowerCase();
    if (itemName.includes(searchTerm.toLowerCase())) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// Add to HTML
// <input type="text" id="search-inventory" placeholder="Search items..." 
//   oninput="filterInventory(this.value)">
```

### Item Categories

```javascript
// Update inventory display with categories
function updateInventoryDisplayWithCategories(items) {
  const categories = {};
  
  items.forEach(item => {
    const category = item.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(item);
  });
  
  const container = document.getElementById('inventory-display');
  container.innerHTML = Object.entries(categories).map(([category, categoryItems]) => `
    <div class="inventory-category">
      <h3>${escapeHtml(category)}</h3>
      <div class="category-items">
        ${categoryItems.map(item => `
          <div class="inventory-item">
            <div class="item-info">
              <h4>${escapeHtml(item.item_name)}</h4>
              <p>${escapeHtml(category)}</p>
            </div>
            <div class="item-quantity">${item.quantity}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
```

## Real-time Features

### Real-time Score Updates

```javascript
// Subscribe to score changes
supabase
  .channel(`user:${currentUser.id}:score`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_profiles',
      filter: `user_id=eq.${currentUser.id}`,
    },
    (payload) => {
      updateScoreDisplay(payload.new.score);
    }
  )
  .subscribe();
```

### Real-time Inventory Updates

```javascript
// Subscribe to inventory changes
supabase
  .channel(`user:${currentUser.id}:inventory`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'inventory',
      filter: `user_id=eq.${currentUser.id}`,
    },
    (payload) => {
      loadUserData(); // Refresh inventory
    }
  )
  .subscribe();
```

## Analytics

### Log User Actions

```sql
CREATE TABLE analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

```javascript
async function logAction(action, details = {}) {
  if (!currentUser) return;
  
  await supabase
    .from('analytics')
    .insert([{
      user_id: currentUser.id,
      action: action,
      details: details,
    }]);
}

// Usage
logAction('score_added', { amount: 100 });
logAction('item_added', { itemName: 'sword', quantity: 1 });
```

## Trading System

```sql
CREATE TABLE trades (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  item_id BIGINT NOT NULL REFERENCES inventory(id),
  quantity INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Deployment Tips

- Backend functions should use the **service role key** for admin operations
- Frontend code uses the **anon key** - it's safe to expose
- Keep backend code in a separate repository or `/api` folder
- Use environment variables for all sensitive data
- Test thoroughly before deploying to production

---

See README.md for more documentation!
