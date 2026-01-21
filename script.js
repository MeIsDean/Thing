// Load environment variables for the app
window.REACT_APP_SUPABASE_URL = 'https://drqfiendmatvchkbihei.supabase.co';
window.REACT_APP_SUPABASE_ANON_KEY = 'sb_publishable_Mul1_bZ0SFlEQOBBgyujCw__xDzer_D';

// Supabase Configuration
// Read from window variables (set above) or use hardcoded values
const SUPABASE_URL = window.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.REACT_APP_SUPABASE_ANON_KEY || '';

let currentUser = null;
let pendingAction = null;
let supabaseClient = null;

// Initialize Supabase
function initSupabase() {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true, // This is important for OAuth redirects!
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
    
    // Check if environment variables are set
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        showLoginError('Please configure your Supabase credentials in environment variables.');
        return;
    }

    // Event listeners
    document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('delete-account-btn').addEventListener('click', showDeleteConfirmation);

    // Listen for auth changes - SET UP FIRST before checking session
    const unsubscribe = supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event, 'Session exists:', !!session);
        if (session) {
            currentUser = session.user;
            console.log('User logged in:', currentUser.email);
            await loadUserData();
            showDashboard();
        } else {
            console.log('User logged out or no session');
            currentUser = null;
            showLoginPage();
        }
    });

    // Give Supabase time to process the redirect, then check session
    setTimeout(async () => {
        console.log('Checking auth status after redirect...');
        await checkAuthStatus();
    }, 500);
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        console.log('Checking auth status. Session exists:', !!session);
        if (session) {
            currentUser = session.user;
            console.log('Found existing session for:', currentUser.email);
            await loadUserData();
            showDashboard();
            return true;
        } else {
            showLoginPage();
            return false;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLoginPage();
    }
}

// Login with Google
async function loginWithGoogle() {
    try {
        // Determine redirect URL based on current location
        const redirectUrl = window.location.origin === 'http://localhost:3000' 
            ? 'http://localhost:3000' 
            : 'https://thing-steel.vercel.app';
        
        console.log('OAuth redirect URL:', redirectUrl);
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            },
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

// Logout
async function logout() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        showLoginPage();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Load user data from database
async function loadUserData() {
    if (!currentUser) {
        console.log('No current user, skipping data load');
        return;
    }

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
            // Account doesn't exist, create one
            const { data: newAccount, error: createError } = await supabaseClient
                .from('accounts')
                .insert([{
                    id: currentUser.id,
                    name: 'Player',
                    money: 0,
                    xp: 0,
                }])
                .select()
                .single();

            if (createError) {
                console.error('Error creating account:', createError);
                throw createError;
            }
            account = newAccount;
            console.log('Account created successfully');
        } else if (error) {
            console.error('Error fetching account:', error);
            throw error;
        }

        console.log('Account loaded:', account);

        // Get inventory with item details
        const { data: inventory, error: invError } = await supabaseClient
            .from('inventory')
            .select('id, quantity, acquired_at, items(id, name, rarity, description)')
            .eq('account_id', currentUser.id);

        if (invError) {
            console.error('Error fetching inventory:', invError);
            throw invError;
        }

        console.log('Inventory loaded, items:', inventory?.length || 0);

        // Update UI
        document.getElementById('user-name').textContent = account.name || 'Player';
        updateStatsDisplay(account);
        updateInventoryDisplay(inventory || []);
        console.log('UI updated successfully');
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Add XP (replaces score)
async function addXP(amount) {
    if (!currentUser) return;

    try {
        const { data: account } = await supabaseClient
            .from('accounts')
            .select('xp')
            .eq('id', currentUser.id)
            .single();

        const newXP = (account?.xp || 0) + amount;

        const { error } = await supabaseClient
            .from('accounts')
            .update({ xp: newXP })
            .eq('id', currentUser.id);

        if (error) throw error;

        updateStatsDisplay({ xp: newXP });
    } catch (error) {
        console.error('Error adding XP:', error);
    }
}

// Collect items (respects cooldown)
async function collectItems() {
    if (!currentUser) return;

    try {
        // Check if enough time has passed since last collection
        const { data: account } = await supabaseClient
            .from('accounts')
            .select('last_collected')
            .eq('id', currentUser.id)
            .single();

        const lastCollected = account?.last_collected ? new Date(account.last_collected) : null;
        const now = new Date();
        const cooldownHours = 4; // Change this to adjust cooldown
        const timeSinceCollection = lastCollected ? (now - lastCollected) / (1000 * 60 * 60) : cooldownHours + 1;

        if (timeSinceCollection < cooldownHours) {
            const hoursRemaining = (cooldownHours - timeSinceCollection).toFixed(1);
            alert(`You can collect again in ${hoursRemaining} hours`);
            return;
        }

        // Grant random item
        const itemRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const rarityWeights = [50, 30, 15, 4, 1]; // Weighted probability
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

        // Get random item of that rarity
        const { data: items, error: itemError } = await supabaseClient
            .from('items')
            .select('id')
            .eq('rarity', selectedRarity);

        if (itemError || !items || items.length === 0) {
            throw new Error('No items available');
        }

        const randomItem = items[Math.floor(Math.random() * items.length)];

        // Check if player already has this item
        const { data: existingInventory } = await supabaseClient
            .from('inventory')
            .select('*')
            .eq('account_id', currentUser.id)
            .eq('item_id', randomItem.id)
            .single();

        if (existingInventory) {
            // Update quantity
            await supabaseClient
                .from('inventory')
                .update({ quantity: existingInventory.quantity + 1 })
                .eq('id', existingInventory.id);
        } else {
            // Add new inventory entry
            await supabaseClient
                .from('inventory')
                .insert([{
                    account_id: currentUser.id,
                    item_id: randomItem.id,
                    quantity: 1,
                }]);
        }

        // Update last_collected timestamp
        await supabaseClient
            .from('accounts')
            .update({ last_collected: now.toISOString() })
            .eq('id', currentUser.id);

        // Reload data
        await loadUserData();
        alert('You collected an item!');
    } catch (error) {
        console.error('Error collecting items:', error);
        alert('Failed to collect items');
    }
}

// Remove item from inventory
async function removeItem(itemId) {
    if (!currentUser) return;

    try {
        const { error } = await supabaseClient
            .from('inventory')
            .delete()
            .eq('id', itemId)
            .eq('account_id', currentUser.id);

        if (error) throw error;

        // Reload inventory
        await loadUserData();
    } catch (error) {
        console.error('Error removing item:', error);
        alert('Failed to remove item');
    }
}

// Show delete account confirmation
function showDeleteConfirmation() {
    pendingAction = 'delete_account';
    document.getElementById('modal-title').textContent = 'Delete Account';
    document.getElementById('modal-message').textContent = 'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.';
    document.getElementById('confirmation-modal').style.display = 'flex';
}

// Confirm action (delete account)
async function confirmAction() {
    if (pendingAction === 'delete_account') {
        await deleteAccount();
    }
    closeModal();
}

// Delete account
async function deleteAccount() {
    if (!currentUser) return;

    try {
        console.log('Starting account deletion for user:', currentUser.id);
        
        // Delete inventory entries first (inventory has FK to accounts)
        console.log('Deleting inventory entries...');
        const { data: invData, error: invError } = await supabaseClient
            .from('inventory')
            .delete()
            .eq('account_id', currentUser.id)
            .select();

        if (invError) {
            console.error('Error deleting inventory:', invError);
            throw invError;
        }
        console.log('Inventory deleted successfully. Deleted rows:', invData);

        // Verify inventory is gone
        const { data: checkInv } = await supabaseClient
            .from('inventory')
            .select('id')
            .eq('account_id', currentUser.id);
        console.log('Inventory count after deletion:', checkInv?.length || 0);

        // Delete account
        console.log('Deleting account record...');
        const { data: accData, error: accError } = await supabaseClient
            .from('accounts')
            .delete()
            .eq('id', currentUser.id)
            .select();

        if (accError) {
            console.error('Error deleting account:', accError);
            throw accError;
        }
        console.log('Account deleted successfully. Deleted rows:', accData);

        // Verify account is gone
        const { data: checkAcc } = await supabaseClient
            .from('accounts')
            .select('id')
            .eq('id', currentUser.id);
        console.log('Account count after deletion:', checkAcc?.length || 0);

        // Sign out
        await logout();

        alert('Account and all associated data have been deleted.');
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account: ' + (error.message || 'Unknown error'));
    }
}

// Close modal
function closeModal() {
    document.getElementById('confirmation-modal').style.display = 'none';
    pendingAction = null;
}

// UI Updates
function showLoginPage() {
    document.getElementById('login-page').style.display = 'block';
    document.getElementById('dashboard-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'block';
}

function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function updateScoreDisplay(score) {
    document.getElementById('score-display').textContent = score;
}

function updateStatsDisplay(account) {
    document.getElementById('xp-display').textContent = account.xp || 0;
    document.getElementById('money-display').textContent = account.money || 0;
    
    // Calculate next collection time if last_collected exists
    if (account.last_collected) {
        const lastCollected = new Date(account.last_collected);
        const nextCollection = new Date(lastCollected.getTime() + 4 * 60 * 60 * 1000);
        const now = new Date();
        const hoursUntil = Math.max(0, (nextCollection - now) / (1000 * 60 * 60));
        
        const nextCollectionEl = document.getElementById('next-collection');
        if (nextCollectionEl) {
            if (hoursUntil > 0) {
                nextCollectionEl.textContent = `Next collection in ${hoursUntil.toFixed(1)} hours`;
            } else {
                nextCollectionEl.textContent = 'Ready to collect!';
            }
        }
    }
}

function updateInventoryDisplay(items) {
    const container = document.getElementById('inventory-display');

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-message">No items in inventory</p>';
        return;
    }

    container.innerHTML = items.map(item => {
        const itemData = item.items;
        const rarityColor = {
            'common': '#95a5a6',
            'uncommon': '#2ecc71',
            'rare': '#3498db',
            'epic': '#9b59b6',
            'legendary': '#f39c12'
        };
        
        return `
            <div class="inventory-item" style="border-left: 4px solid ${rarityColor[itemData.rarity] || '#95a5a6'};">
                <div class="item-info">
                    <h4>${escapeHtml(itemData.name)}</h4>
                    <p class="item-rarity" style="color: ${rarityColor[itemData.rarity] || '#95a5a6'}; font-size: 12px; font-weight: bold;">${itemData.rarity.toUpperCase()}</p>
                    <p style="font-size: 12px; color: #7f8c8d;">${escapeHtml(itemData.description || '')}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="item-quantity">${item.quantity}x</span>
                    <button class="btn btn-secondary" onclick="removeItem('${item.id}')" style="padding: 6px 12px; font-size: 12px;">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('confirmation-modal');
    if (e.target === modal) {
        closeModal();
    }
});
