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
        // Get or create user profile
        let { data: profile, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log('Profile does not exist, creating one...');
            // User profile doesn't exist, create one
            const { data: newProfile, error: createError } = await supabaseClient
                .from('user_profiles')
                .insert([{
                    user_id: currentUser.id,
                    email: currentUser.email,
                    score: 0,
                }])
                .select()
                .single();

            if (createError) {
                console.error('Error creating profile:', createError);
                throw createError;
            }
            profile = newProfile;
            console.log('Profile created successfully');
        } else if (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }

        console.log('Profile loaded:', profile);

        // Get inventory items
        const { data: inventory, error: invError } = await supabaseClient
            .from('inventory')
            .select('*')
            .eq('user_id', currentUser.id);

        if (invError) {
            console.error('Error fetching inventory:', invError);
            throw invError;
        }

        console.log('Inventory loaded, items:', inventory?.length || 0);

        // Update UI
        document.getElementById('user-name').textContent = currentUser.email;
        updateScoreDisplay(profile.score);
        updateInventoryDisplay(inventory || []);
        console.log('UI updated successfully');
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Add score
async function addScore(amount) {
    if (!currentUser) return;

    try {
        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('score')
            .eq('user_id', currentUser.id)
            .single();

        const newScore = (profile?.score || 0) + amount;

        const { error } = await supabaseClient
            .from('user_profiles')
            .update({ score: newScore })
            .eq('user_id', currentUser.id);

        if (error) throw error;

        updateScoreDisplay(newScore);
    } catch (error) {
        console.error('Error adding score:', error);
    }
}

// Add item to inventory
async function addItem() {
    if (!currentUser) return;

    const itemName = document.getElementById('item-name').value.trim();
    const itemQuantity = parseInt(document.getElementById('item-quantity').value) || 1;

    if (!itemName) {
        alert('Please enter an item name');
        return;
    }

    try {
        // Check if item already exists
        const { data: existingItem } = await supabaseClient
            .from('inventory')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('item_name', itemName)
            .single();

        if (existingItem) {
            // Update quantity
            const { error } = await supabaseClient
                .from('inventory')
                .update({ quantity: existingItem.quantity + itemQuantity })
                .eq('id', existingItem.id);

            if (error) throw error;
        } else {
            // Add new item
            const { error } = await supabaseClient
                .from('inventory')
                .insert([{
                    user_id: currentUser.id,
                    item_name: itemName,
                    quantity: itemQuantity,
                }]);

            if (error) throw error;
        }

        document.getElementById('item-name').value = '';
        document.getElementById('item-quantity').value = '1';

        // Reload inventory
        const { data: inventory } = await supabaseClient
            .from('inventory')
            .select('*')
            .eq('user_id', currentUser.id);

        updateInventoryDisplay(inventory || []);
    } catch (error) {
        console.error('Error adding item:', error);
        alert('Failed to add item');
    }
}

// Remove item from inventory
async function removeItem(itemId) {
    if (!currentUser) return;

    try {
        const { error } = await supabaseClient
            .from('inventory')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        // Reload inventory
        const { data: inventory } = await supabaseClient
            .from('inventory')
            .select('*')
            .eq('user_id', currentUser.id);

        updateInventoryDisplay(inventory || []);
    } catch (error) {
        console.error('Error removing item:', error);
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
        // Delete user data first
        await supabaseClient
            .from('inventory')
            .delete()
            .eq('user_id', currentUser.id);

        await supabaseClient
            .from('user_profiles')
            .delete()
            .eq('user_id', currentUser.id);

        // Delete the user account (requires admin API)
        // For now, just sign out
        await logout();

        // Note: To fully delete the user account from auth, you need to:
        // 1. Set up a backend endpoint that uses the Supabase admin API
        // 2. Call it with the user ID to delete the auth user
        alert('Account and all associated data have been deleted.');
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
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

function updateInventoryDisplay(items) {
    const container = document.getElementById('inventory-display');

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-message">No items in inventory</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="inventory-item">
            <div class="item-info">
                <h4>${escapeHtml(item.item_name)}</h4>
                <p>Added: ${new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="item-quantity">${item.quantity}</span>
                <button class="btn btn-secondary" onclick="removeItem(${item.id})" style="padding: 6px 12px; font-size: 12px;">Remove</button>
            </div>
        </div>
    `).join('');
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
