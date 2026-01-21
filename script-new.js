// Load environment variables
window.REACT_APP_SUPABASE_URL = 'https://drqfiendmatvchkbihei.supabase.co';
window.REACT_APP_SUPABASE_ANON_KEY = 'sb_publishable_Mul1_bZ0SFlEQOBBgyujCw__xDzer_D';

const SUPABASE_URL = window.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.REACT_APP_SUPABASE_ANON_KEY || '';

let currentUser = null;
let pendingAction = null;
let supabaseClient = null;
let currentTab = 'home';
let currentShopTab = 'buy';
let userAccount = null;

// Initialize Supabase
function initSupabase() {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            }
        });
        console.log('Supabase initialized');
    } else {
        console.error('Supabase library or credentials missing');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        showLoginError('Please configure your Supabase credentials.');
        return;
    }

    // Event listeners
    document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);

    // Wait longer for Supabase to load the stored session from localStorage
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for existing session first (most important for persistence)
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        console.log('Checking for existing session on app load...');
        console.log('Existing session found:', !!session);
        if (session) {
            currentUser = session.user;
            console.log('Restoring logged in user:', currentUser.email);
            await loadUserData();
            hideLoadingScreen();
            showDashboard();
            
            // Set up auth listener after restoring session
            supabaseClient.auth.onAuthStateChange(async (event, newSession) => {
                console.log('Auth state changed:', event);
                if (!newSession) {
                    currentUser = null;
                    showLoginPage();
                }
            });
            return;
        }
    } catch (error) {
        console.error('Error checking initial session:', error);
    }

    // If no session, set up auth listener and show login
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event, 'Session exists:', !!session);
        if (session) {
            currentUser = session.user;
            console.log('User logged in via auth event:', currentUser.email);
            await loadUserData();
            hideLoadingScreen();
            showDashboard();
        } else {
            currentUser = null;
            hideLoadingScreen();
            showLoginPage();
        }
    });
});

async function loginWithGoogle() {
    try {
        const redirectUrl = window.location.origin === 'http://localhost:3000' 
            ? 'http://localhost:3000' 
            : 'https://thing-steel.vercel.app';
        
        console.log('OAuth redirect URL:', redirectUrl);
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectUrl },
        });

        if (error) {
            showLoginError('Failed to sign in: ' + error.message);
            console.error('OAuth error:', error);
        }
    } catch (error) {
        showLoginError('An error occurred during sign in.');
        console.error('Login error:', error);
    }
}

async function loadUserData() {
    if (!currentUser) return;

    try {
        console.log('Loading user data for:', currentUser.id);
        
        // Get or create account
        let { data: account, error } = await supabaseClient
            .from('accounts')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log('Account does not exist, creating one...');
            const { data: newAccount, error: createError } = await supabaseClient
                .from('accounts')
                .insert([{ id: currentUser.id, name: 'Player', money: 0, xp: 0 }])
                .select()
                .single();

            if (createError) throw createError;
            account = newAccount;
        } else if (error) {
            throw error;
        }

        userAccount = account;
        console.log('Account loaded:', account);

        // Get inventory with item details
        const { data: inventory, error: invError } = await supabaseClient
            .from('inventory')
            .select('id, quantity, items(id, name, rarity, description)')
            .eq('account_id', currentUser.id);

        if (invError) throw invError;

        // Update UI
        document.getElementById('user-name').textContent = account.name || 'Player';
        updateStatsDisplay(account);
        updateInventoryDisplay(inventory || []);
        updateCollectionUI(account);
        loadFriendsList();
        loadShop();
        
        console.log('UI updated');
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function collectItems() {
    if (!currentUser || !userAccount) return;

    try {
        const lastCollected = userAccount.last_collected ? new Date(userAccount.last_collected) : null;
        const now = new Date();
        const cooldownHours = 3;
        const timeSinceCollection = lastCollected ? (now - lastCollected) / (1000 * 60 * 60) : cooldownHours + 1;

        if (timeSinceCollection < cooldownHours) {
            const hoursRemaining = (cooldownHours - timeSinceCollection).toFixed(1);
            showNotification(`You can collect again in ${hoursRemaining} hours`, 'warning');
            return;
        }

        // Get random item
        const itemRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const rarityWeights = [50, 30, 15, 4, 1];
        const random = Math.random() * 100;
        let selectedRarity = itemRarities[0];
        let cumulativeWeight = 0;

        for (let i = 0; i < rarityWeights.length; i++) {
            cumulativeWeight += rarityWeights[i];
            if (random <= cumulativeWeight) {
                selectedRarity = itemRarities[i];
                break;
            }
        }

        const { data: items } = await supabaseClient
            .from('items')
            .select('id')
            .eq('rarity', selectedRarity);

        if (!items || items.length === 0) throw new Error('No items available');

        const randomItem = items[Math.floor(Math.random() * items.length)];

        // Add to inventory
        const { data: existingInventory } = await supabaseClient
            .from('inventory')
            .select('*')
            .eq('account_id', currentUser.id)
            .eq('item_id', randomItem.id)
            .single();

        if (existingInventory) {
            await supabaseClient
                .from('inventory')
                .update({ quantity: existingInventory.quantity + 1 })
                .eq('id', existingInventory.id);
        } else {
            await supabaseClient
                .from('inventory')
                .insert([{ account_id: currentUser.id, item_id: randomItem.id, quantity: 1 }]);
        }

        // Update last_collected
        await supabaseClient
            .from('accounts')
            .update({ last_collected: now.toISOString() })
            .eq('id', currentUser.id);

        await loadUserData();
        showNotification('🎉 You collected an item!', 'success');
    } catch (error) {
        console.error('Error collecting:', error);
        showNotification('Failed to collect items', 'error');
    }
}

async function changeName() {
    const newName = document.getElementById('name-input').value.trim();
    if (!newName) {
        showNotification('Please enter a name', 'warning');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('accounts')
            .update({ name: newName })
            .eq('id', currentUser.id);

        if (error) throw error;

        userAccount.name = newName;
        document.getElementById('user-name').textContent = newName;
        document.getElementById('name-input').value = '';
        showNotification('Name changed successfully!', 'success');
    } catch (error) {
        console.error('Error changing name:', error);
        showNotification('Failed to change name', 'error');
    }
}

async function addFriend() {
    const friendInput = document.getElementById('friend-input').value.trim();
    if (!friendInput) {
        showNotification('Please enter a friend ID or username', 'warning');
        return;
    }

    // TODO: Implement friends system with database
    showNotification('Friends system coming soon!', 'info');
    document.getElementById('friend-input').value = '';
}

function switchShopTab(tab) {
    currentShopTab = tab;
    document.querySelectorAll('.shop-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.shop-section').forEach(sec => sec.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + '-section').classList.add('active');
}

async function logout() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        showLoginPage();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

async function deleteAccount() {
    if (!currentUser) return;

    try {
        console.log('Deleting account for:', currentUser.id);
        
        const { error: invError } = await supabaseClient
            .from('inventory')
            .delete()
            .eq('account_id', currentUser.id);

        if (invError) throw invError;

        const { error: accError } = await supabaseClient
            .from('accounts')
            .delete()
            .eq('id', currentUser.id);

        if (accError) throw accError;

        await logout();
        showNotification('Account deleted successfully.', 'success');
    } catch (error) {
        console.error('Error deleting account:', error);
        showNotification('Failed to delete account: ' + (error.message || 'Unknown error'), 'error');
    }
}

// UI Functions
function switchTab(tab) {
    currentTab = tab;
    
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tab + '-tab').classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

function updateStatsDisplay(account) {
    document.getElementById('xp-display').textContent = account.xp || 0;
    document.getElementById('money-display').textContent = account.money || 0;
}

function updateCollectionUI(account) {
    if (!account.last_collected) {
        document.getElementById('collection-status').textContent = 'Ready to collect!';
        document.getElementById('collection-time').textContent = '';
        document.getElementById('collect-btn').disabled = false;
        return;
    }

    const lastCollected = new Date(account.last_collected);
    const nextCollection = new Date(lastCollected.getTime() + 3 * 60 * 60 * 1000);
    const now = new Date();
    const hoursUntil = Math.max(0, (nextCollection - now) / (1000 * 60 * 60));

    if (hoursUntil > 0) {
        const hours = Math.floor(hoursUntil);
        const minutes = Math.floor((hoursUntil % 1) * 60);
        document.getElementById('collection-status').textContent = `Next collection in ${hours}h ${minutes}m`;
        document.getElementById('collect-btn').disabled = true;
    } else {
        document.getElementById('collection-status').textContent = 'Ready to collect!';
        document.getElementById('collection-time').textContent = '';
        document.getElementById('collect-btn').disabled = false;
    }
}

function updateInventoryDisplay(items) {
    const container = document.getElementById('inventory-display');

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-message">No items yet. Collect items to get started!</p>';
        return;
    }

    const rarityColor = {
        'common': '#95a5a6',
        'uncommon': '#2ecc71',
        'rare': '#3498db',
        'epic': '#9b59b6',
        'legendary': '#f39c12'
    };

    container.innerHTML = items.map(item => {
        const itemData = item.items;
        return `
            <div class="inventory-item" style="border-top: 4px solid ${rarityColor[itemData.rarity] || '#95a5a6'};">
                <div class="item-image">📦</div>
                <div class="item-name">${escapeHtml(itemData.name)}</div>
                <div class="item-rarity" style="color: ${rarityColor[itemData.rarity] || '#95a5a6'};">${itemData.rarity}</div>
                <div class="item-quantity">${item.quantity}x</div>
                <button class="item-remove-btn" onclick="removeItem('${item.id}')">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
    }).join('');
}

async function removeItem(itemId) {
    if (!currentUser) return;

    try {
        const { error } = await supabaseClient
            .from('inventory')
            .delete()
            .eq('id', itemId)
            .eq('account_id', currentUser.id);

        if (error) throw error;
        await loadUserData();
    } catch (error) {
        console.error('Error removing item:', error);
    }
}

// ===== FRIENDS FUNCTIONALITY =====
async function loadFriendsList() {
    if (!currentUser) return;

    try {
        const { data: friends, error } = await supabaseClient
            .from('friends')
            .select('id, user_id, friend_id, accounts!friends_friend_id_fkey(id, name), status')
            .eq('user_id', currentUser.id)
            .eq('status', 'accepted');

        if (error) throw error;

        const friendsDisplay = document.getElementById('friends-display');
        if (!friends || friends.length === 0) {
            friendsDisplay.innerHTML = '<p class="empty-message">No friends yet</p>';
            return;
        }

        friendsDisplay.innerHTML = friends.map(f => `
            <div class="friend-item">
                <div class="friend-info">
                    <p class="friend-name">${escapeHtml(f.accounts.name)}</p>
                </div>
                <button class="btn btn-secondary btn-small" onclick="removeFriend('${f.id}')">Remove</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading friends:', error);
        showNotification('Failed to load friends', 'error');
    }
}

async function addFriend() {
    if (!currentUser) return;

    const input = document.getElementById('friend-input');
    const username = input.value.trim();

    if (!username) {
        showNotification('Please enter a username', 'warning');
        return;
    }

    try {
        const { data: friend, error: fetchError } = await supabaseClient
            .from('accounts')
            .select('id')
            .eq('name', username)
            .single();

        if (fetchError) {
            showNotification('User not found', 'error');
            return;
        }

        if (friend.id === currentUser.id) {
            showNotification('You cannot add yourself', 'warning');
            return;
        }

        const { error } = await supabaseClient
            .from('friends')
            .insert([{ user_id: currentUser.id, friend_id: friend.id, status: 'accepted' }]);

        if (error) {
            showNotification('Failed to add friend', 'error');
            throw error;
        }

        input.value = '';
        showNotification('Friend added!', 'success');
        await loadFriendsList();
    } catch (error) {
        console.error('Error adding friend:', error);
    }
}

async function removeFriend(friendshipId) {
    if (!currentUser) return;

    try {
        const { error } = await supabaseClient
            .from('friends')
            .delete()
            .eq('id', friendshipId);

        if (error) throw error;

        showNotification('Friend removed', 'success');
        await loadFriendsList();
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification('Failed to remove friend', 'error');
    }
}

// ===== SHOP FUNCTIONALITY (Player-to-Player Marketplace) =====
async function loadShop() {
    if (!currentUser) return;

    try {
        // Load my listings
        await loadMyListings();
        // Load market listings
        await loadMarketListings();
        // Populate item dropdown
        await populateItemSelect();
    } catch (error) {
        console.error('Error loading shop:', error);
        showNotification('Failed to load marketplace', 'error');
    }
}

async function populateItemSelect() {
    if (!currentUser) return;

    try {
        const { data: inventory } = await supabaseClient
            .from('inventory')
            .select('id, quantity, items(id, name, rarity), item_id')
            .eq('account_id', currentUser.id);

        const select = document.getElementById('item-select');
        if (!inventory || inventory.length === 0) {
            select.innerHTML = '<option value="">No items to sell</option>';
            return;
        }

        select.innerHTML = '<option value="">Select item to sell...</option>';
        inventory.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            option.dataset.itemId = inv.item_id;
            option.dataset.quantity = inv.quantity;
            option.textContent = `${inv.items.name} (${inv.quantity} available)`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating item select:', error);
    }
}

async function createListing() {
    if (!currentUser) return;

    const select = document.getElementById('item-select');
    const priceInput = document.getElementById('price-input');
    const selectedOption = select.options[select.selectedIndex];

    if (!selectedOption.value) {
        showNotification('Please select an item', 'warning');
        return;
    }

    if (!priceInput.value || priceInput.value < 1) {
        showNotification('Please enter a valid price', 'warning');
        return;
    }

    try {
        const inventoryId = selectedOption.value;
        const itemId = selectedOption.dataset.itemId;
        const price = parseInt(priceInput.value);

        // Create listing that expires in 3 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);

        const { error: listingError } = await supabaseClient
            .from('player_listings')
            .insert([{
                seller_id: currentUser.id,
                item_id: itemId,
                quantity: 1,
                price_per_unit: price,
                expires_at: expiresAt.toISOString()
            }]);

        if (listingError) throw listingError;

        // Remove item from inventory
        const { data: invItem } = await supabaseClient
            .from('inventory')
            .select('quantity')
            .eq('id', inventoryId)
            .single();

        if (invItem.quantity > 1) {
            await supabaseClient
                .from('inventory')
                .update({ quantity: invItem.quantity - 1 })
                .eq('id', inventoryId);
        } else {
            await supabaseClient
                .from('inventory')
                .delete()
                .eq('id', inventoryId);
        }

        showNotification('Item listed for sale! Expires in 3 days.', 'success');
        priceInput.value = '';
        select.value = '';
        await loadUserData();
        await loadShop();
    } catch (error) {
        console.error('Error creating listing:', error);
        showNotification('Failed to create listing', 'error');
    }
}

async function loadMyListings() {
    if (!currentUser) return;

    try {
        // Check for expired listings and return them to inventory
        await handleExpiredListings();

        const { data: listings } = await supabaseClient
            .from('player_listings')
            .select('id, item_id, quantity, price_per_unit, expires_at, items(name, rarity)')
            .eq('seller_id', currentUser.id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        const myListingsDisplay = document.getElementById('my-listings-display');
        if (!listings || listings.length === 0) {
            myListingsDisplay.innerHTML = '<p class="empty-message">No active listings</p>';
            return;
        }

        myListingsDisplay.innerHTML = listings.map(listing => {
            const expiresAt = new Date(listing.expires_at);
            const now = new Date();
            const hoursLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60));

            return `
                <div class="shop-item">
                    <div class="shop-item-header">
                        <p class="shop-item-name">${escapeHtml(listing.items.name)}</p>
                        <span class="rarity-badge rarity-${listing.items.rarity}">${listing.items.rarity}</span>
                    </div>
                    <p class="shop-item-price">💰 ${listing.price_per_unit}</p>
                    <p class="shop-item-quantity">Expires in ${hoursLeft}h</p>
                    <button class="btn btn-secondary btn-small" onclick="cancelListing('${listing.id}', '${listing.item_id}')">Cancel</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading my listings:', error);
    }
}

async function loadMarketListings() {
    if (!currentUser) return;

    try {
        const { data: listings } = await supabaseClient
            .from('player_listings')
            .select('id, seller_id, item_id, quantity, price_per_unit, expires_at, items(name, rarity), accounts!player_listings_seller_id_fkey(name)')
            .gt('expires_at', new Date().toISOString())
            .neq('seller_id', currentUser.id)
            .order('created_at', { ascending: false });

        const marketDisplay = document.getElementById('market-listings-display');
        if (!listings || listings.length === 0) {
            marketDisplay.innerHTML = '<p class="empty-message">No items available in marketplace</p>';
            return;
        }

        marketDisplay.innerHTML = listings.map(listing => {
            return `
                <div class="shop-item">
                    <div class="shop-item-header">
                        <p class="shop-item-name">${escapeHtml(listing.items.name)}</p>
                        <span class="rarity-badge rarity-${listing.items.rarity}">${listing.items.rarity}</span>
                    </div>
                    <p class="shop-item-quantity">Seller: ${escapeHtml(listing.accounts.name)}</p>
                    <p class="shop-item-price">💰 ${listing.price_per_unit}</p>
                    <button class="btn btn-primary btn-small" onclick="buyFromPlayer('${listing.id}', ${listing.price_per_unit}, '${listing.item_id}', '${listing.seller_id}')">Buy</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading market listings:', error);
    }
}

async function buyFromPlayer(listingId, price, itemId, sellerId) {
    if (!currentUser || !userAccount) return;

    try {
        if (userAccount.money < price) {
            showNotification('Not enough money', 'error');
            return;
        }

        // Deduct money from buyer
        await supabaseClient
            .from('accounts')
            .update({ money: userAccount.money - price })
            .eq('id', currentUser.id);

        // Add money to seller
        const { data: seller } = await supabaseClient
            .from('accounts')
            .select('money')
            .eq('id', sellerId)
            .single();

        await supabaseClient
            .from('accounts')
            .update({ money: seller.money + price })
            .eq('id', sellerId);

        // Add item to buyer inventory
        const { data: existing } = await supabaseClient
            .from('inventory')
            .select('id, quantity')
            .eq('account_id', currentUser.id)
            .eq('item_id', itemId)
            .single();

        if (existing) {
            await supabaseClient
                .from('inventory')
                .update({ quantity: existing.quantity + 1 })
                .eq('id', existing.id);
        } else {
            await supabaseClient
                .from('inventory')
                .insert([{ account_id: currentUser.id, item_id: itemId, quantity: 1 }]);
        }

        // Delete listing
        await supabaseClient
            .from('player_listings')
            .delete()
            .eq('id', listingId);

        showNotification('Item purchased!', 'success');
        await loadUserData();
        await loadShop();
    } catch (error) {
        console.error('Error buying item:', error);
        showNotification('Failed to purchase item', 'error');
    }
}

async function cancelListing(listingId, itemId) {
    if (!currentUser) return;

    try {
        // Get listing details
        const { data: listing } = await supabaseClient
            .from('player_listings')
            .select('quantity')
            .eq('id', listingId)
            .single();

        // Return item to inventory
        const { data: existing } = await supabaseClient
            .from('inventory')
            .select('id, quantity')
            .eq('account_id', currentUser.id)
            .eq('item_id', itemId)
            .single();

        if (existing) {
            await supabaseClient
                .from('inventory')
                .update({ quantity: existing.quantity + listing.quantity })
                .eq('id', existing.id);
        } else {
            await supabaseClient
                .from('inventory')
                .insert([{ account_id: currentUser.id, item_id: itemId, quantity: listing.quantity }]);
        }

        // Delete listing
        await supabaseClient
            .from('player_listings')
            .delete()
            .eq('id', listingId);

        showNotification('Listing cancelled', 'success');
        await loadUserData();
        await loadShop();
    } catch (error) {
        console.error('Error cancelling listing:', error);
        showNotification('Failed to cancel listing', 'error');
    }
}

async function handleExpiredListings() {
    if (!currentUser) return;

    try {
        const now = new Date().toISOString();

        // Get expired listings
        const { data: expiredListings } = await supabaseClient
            .from('player_listings')
            .select('id, seller_id, item_id, quantity')
            .lt('expires_at', now);

        if (!expiredListings || expiredListings.length === 0) return;

        // Return each expired listing to owner's inventory
        for (const listing of expiredListings) {
            const { data: existing } = await supabaseClient
                .from('inventory')
                .select('id, quantity')
                .eq('account_id', listing.seller_id)
                .eq('item_id', listing.item_id)
                .single();

            if (existing) {
                await supabaseClient
                    .from('inventory')
                    .update({ quantity: existing.quantity + listing.quantity })
                    .eq('id', existing.id);
            } else {
                await supabaseClient
                    .from('inventory')
                    .insert([{ account_id: listing.seller_id, item_id: listing.item_id, quantity: listing.quantity }]);
            }

            // Delete expired listing
            await supabaseClient
                .from('player_listings')
                .delete()
                .eq('id', listing.id);
        }

        if (expiredListings.some(l => l.seller_id === currentUser.id)) {
            showNotification('Some of your listings expired and were returned to inventory', 'info');
        }
    } catch (error) {
        console.error('Error handling expired listings:', error);
    }
}

function switchShopTab(tab) {
    currentShopTab = tab;
    document.querySelectorAll('.shop-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.shop-section').forEach(section => section.classList.remove('active'));
    document.getElementById(tab + '-section').classList.add('active');
}

function showLoginPage() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('dashboard-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
}

function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function showDeleteConfirm() {
    pendingAction = 'delete_account';
    document.getElementById('modal-title').textContent = 'Delete Account';
    document.getElementById('modal-message').textContent = 'This action cannot be undone. All your data will be permanently deleted.';
    document.getElementById('modal-confirm-btn').textContent = 'Delete';
    document.getElementById('modal-confirm-btn').className = 'btn btn-danger';
    document.getElementById('confirmation-modal').style.display = 'flex';
}

function confirmAction() {
    if (pendingAction === 'delete_account') {
        deleteAccount();
    }
    closeModal();
}

function closeModal() {
    document.getElementById('confirmation-modal').style.display = 'none';
    pendingAction = null;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Notification System
function showNotification(message, type = 'success', duration = 3000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const icons = {
        'success': 'bi-check-circle-fill',
        'error': 'bi-exclamation-circle-fill',
        'warning': 'bi-exclamation-triangle-fill',
        'info': 'bi-info-circle-fill'
    };

    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="bi ${icons[type]} notif-icon"></i>
        <div class="notif-content">${escapeHtml(message)}</div>
        <button class="notif-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;

    container.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('removing');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}
