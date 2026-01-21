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

    // Auth listener - this maintains session persistence
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event, 'Session exists:', !!session);
        if (session) {
            currentUser = session.user;
            console.log('User logged in:', currentUser.email);
            await loadUserData();
            showDashboard();
        } else {
            currentUser = null;
            showLoginPage();
        }
    });

    // Check for existing session first (most important for persistence)
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        console.log('Existing session found:', !!session);
        if (session) {
            currentUser = session.user;
            await loadUserData();
            showDashboard();
            return;
        }
    } catch (error) {
        console.error('Error checking initial session:', error);
    }

    // If no session, check for OAuth redirect
    setTimeout(async () => {
        console.log('Checking auth status after potential redirect...');
        await checkAuthStatus();
    }, 500);
});

async function checkAuthStatus() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            await loadUserData();
            showDashboard();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        showLoginPage();
    }
}

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
            alert(`You can collect again in ${hoursRemaining} hours`);
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
        alert('🎉 You collected an item!');
    } catch (error) {
        console.error('Error collecting:', error);
        alert('Failed to collect items');
    }
}

async function changeName() {
    const newName = document.getElementById('name-input').value.trim();
    if (!newName) {
        alert('Please enter a name');
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
        alert('Name changed successfully!');
    } catch (error) {
        console.error('Error changing name:', error);
        alert('Failed to change name');
    }
}

async function addFriend() {
    const friendInput = document.getElementById('friend-input').value.trim();
    if (!friendInput) {
        alert('Please enter a friend ID or username');
        return;
    }

    // TODO: Implement friends system with database
    alert('Friends system coming soon!');
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
        alert('Account deleted successfully.');
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account: ' + (error.message || 'Unknown error'));
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

function showLoginPage() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('dashboard-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'flex';
}

function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function showLogoutConfirm() {
    pendingAction = 'logout';
    document.getElementById('modal-title').textContent = 'Sign Out';
    document.getElementById('modal-message').textContent = 'Are you sure you want to sign out?';
    document.getElementById('modal-confirm-btn').textContent = 'Sign Out';
    document.getElementById('modal-confirm-btn').className = 'btn btn-secondary';
    document.getElementById('confirmation-modal').style.display = 'flex';
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
    } else if (pendingAction === 'logout') {
        logout();
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
