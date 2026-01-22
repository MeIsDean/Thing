// Load environment variables
window.REACT_APP_SUPABASE_URL = 'https://drqfiendmatvchkbihei.supabase.co';
window.REACT_APP_SUPABASE_ANON_KEY = 'sb_publishable_Mul1_bZ0SFlEQOBBgyujCw__xDzer_D';

const SUPABASE_URL = window.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.REACT_APP_SUPABASE_ANON_KEY || '';

let currentUser = null;
let pendingAction = null;
let supabaseClient = null;
let currentTab = 'home';
let userAccount = null;

// Random name generation for new players
function generateRandomPlayerName() {
    const adjectives = [
        'Swift', 'Mighty', 'Clever', 'Bold', 'Wise', 'Brave', 'Keen', 'Agile',
        'Sharp', 'Quick', 'Steady', 'Silent', 'Lucky', 'Bright', 'Dark', 'Fierce',
        'Noble', 'Wild', 'Free', 'Pure', 'True', 'Rare', 'Epic', 'Mystic',
        'Shadow', 'Storm', 'Phoenix', 'Dragon', 'Wolf', 'Eagle', 'Raven', 'Tiger'
    ];

    const nouns = [
        'Seeker', 'Wanderer', 'Explorer', 'Guardian', 'Sentinel', 'Knight', 'Ranger',
        'Warrior', 'Hunter', 'Archer', 'Mage', 'Sage', 'Mystic', 'Oracle', 'Oracle',
        'Slayer', 'Warden', 'Paladin', 'Rogue', 'Ninja', 'Assassin', 'Barbarian',
        'Shaman', 'Druid', 'Bard', 'Tracker', 'Scout', 'Spy', 'Champion', 'Hero'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);

    return `${adjective}${noun}${number}`;
}

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

    hideLoadingScreen();
});

// Google Login
async function loginWithGoogle() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) throw error;
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Failed to login with Google');
    }
}

// Load user data
async function loadUserData() {
    if (!currentUser) return;

    try {
        // Check if account exists
        const { data: account } = await supabaseClient
            .from('accounts')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (!account) {
            // Create new account
            const newName = generateRandomPlayerName();
            await supabaseClient
                .from('accounts')
                .insert([{ id: currentUser.id, name: newName, money: 100, xp: 0 }]);
            userAccount = { id: currentUser.id, name: newName, money: 100, xp: 0 };
        } else {
            userAccount = account;
        }

        // Update UI
        document.getElementById('user-name').textContent = userAccount.name;
        document.getElementById('money-display').textContent = userAccount.money;
        document.getElementById('xp-display').textContent = userAccount.xp;

        // Load all tab data
        await loadHome();
        await loadInventory();
        await loadShop();
        await loadFriends();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadHome() {
    if (!currentUser) return;

    try {
        const now = new Date();
        const lastCollected = new Date(userAccount.last_collected || 0);
        const cooldownMs = 3 * 60 * 60 * 1000; // 3 hours
        const timeSinceLastCollection = now - lastCollected;

        if (timeSinceLastCollection >= cooldownMs) {
            document.getElementById('collect-btn').disabled = false;
            document.getElementById('collect-btn').innerHTML = '<i class="bi bi-gift"></i> Collect Now';
            document.getElementById('collection-status').textContent = 'Ready to collect!';
            document.getElementById('collection-time').textContent = '';
        } else {
            const remainingMs = cooldownMs - timeSinceLastCollection;
            const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
            document.getElementById('collect-btn').disabled = true;
            document.getElementById('collect-btn').innerHTML = '<i class="bi bi-gift"></i> Collect Now';
            document.getElementById('collection-status').textContent = 'Item collected!';
            document.getElementById('collection-time').textContent = `Next in ${remainingHours}h`;
        }
    } catch (error) {
        console.error('Error loading home:', error);
    }
}

async function collectItem() {
    if (!currentUser || !userAccount) return;

    try {
        // Get random type
        const { data: allTypes } = await supabaseClient
            .from('type')
            .select('id');

        if (!allTypes || allTypes.length === 0) {
            showNotification('No items available', 'warning');
            return;
        }

        const randomType = allTypes[Math.floor(Math.random() * allTypes.length)];

        // Add to inventory
        await supabaseClient
            .from('inventory')
            .insert([{
                account_id: currentUser.id,
                type_id: randomType.id
            }]);

        // Update last_collected time
        await supabaseClient
            .from('accounts')
            .update({ last_collected: new Date().toISOString() })
            .eq('id', currentUser.id);

        showNotification('Item collected!', 'success');
        await loadUserData();
    } catch (error) {
        console.error('Error collecting item:', error);
        showNotification('Failed to collect item', 'error');
    }
}
async function loadInventory() {
    if (!currentUser) return;

    try {
        const { data: items } = await supabaseClient
            .from('inventory')
            .select('id, type(id, name, rarity), acquired_at')
            .eq('account_id', currentUser.id)
            .order('acquired_at', { ascending: false });

        const inventoryDisplay = document.getElementById('inventory-display');

        if (!items || items.length === 0) {
            inventoryDisplay.innerHTML = '<p class="empty-message">No items in inventory</p>';
            return;
        }

        inventoryDisplay.innerHTML = items.map(item => `
            <div class="inventory-item">
                <div class="item-header">
                    <p class="item-name">${escapeHtml(item.type.name)}</p>
                    <span class="rarity-badge rarity-${item.type.rarity}">${item.type.rarity}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// SHOP TAB
async function loadShop() {
    if (!currentUser) return;

    try {
        const { data: listings } = await supabaseClient
            .from('shop')
            .select('id, owner_id, type_id, price, type(name, rarity), accounts!shop_owner_id_fkey(name)')
            .order('created_at', { ascending: false });

        const shopDisplay = document.getElementById('shop-display');

        if (!listings || listings.length === 0) {
            shopDisplay.innerHTML = '<p class="empty-message">No items in marketplace</p>';
            return;
        }

        shopDisplay.innerHTML = listings.map(listing => {
            const isOwnListing = listing.owner_id === currentUser.id;

            return `
                <div class="shop-item">
                    <div class="shop-item-header">
                        <p class="shop-item-name">${escapeHtml(listing.type.name)}</p>
                        <span class="rarity-badge rarity-${listing.type.rarity}">${listing.type.rarity}</span>
                    </div>
                    <p class="shop-item-price">💰 ${listing.price}</p>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Seller: ${escapeHtml(listing.accounts.name)}</p>
                    ${isOwnListing
                        ? `<button class="btn btn-secondary btn-small" onclick="cancelListing('${listing.id}')">Cancel Sale</button>`
                        : `<button class="btn btn-primary btn-small" onclick="buyListing('${listing.id}', ${listing.price}, '${listing.type_id}', '${listing.owner_id}')">Buy</button>`
                    }
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading shop:', error);
        showNotification('Failed to load marketplace', 'error');
    }
}

async function openSellModal() {
    if (!currentUser) return;

    try {
        // Get user's inventory
        const { data: items } = await supabaseClient
            .from('inventory')
            .select('id, type(id, name), type_id')
            .eq('account_id', currentUser.id);

        const select = document.getElementById('sell-item-select');
        select.innerHTML = '<option value="">Choose an item...</option>';

        if (!items || items.length === 0) {
            select.innerHTML = '<option value="">You have no items to sell</option>';
            select.disabled = true;
        } else {
            items.forEach(inv => {
                const option = document.createElement('option');
                option.value = inv.id;
                option.dataset.typeId = inv.type_id;
                option.dataset.typeName = inv.type.name;
                option.textContent = inv.type.name;
                select.appendChild(option);
            });
            select.disabled = false;
        }

        document.getElementById('sell-price-input').value = '';
        document.getElementById('sell-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error opening sell modal:', error);
        showNotification('Failed to open sell dialog', 'error');
    }
}

function closeSellModal() {
    document.getElementById('sell-modal').style.display = 'none';
}

async function submitSellItem() {
    if (!currentUser) return;

    const select = document.getElementById('sell-item-select');
    const priceInput = document.getElementById('sell-price-input');
    const selectedOption = select.options[select.selectedIndex];

    if (!selectedOption.value) {
        showNotification('Please select an item', 'warning');
        return;
    }

    const price = parseInt(priceInput.value);
    if (!price || price < 1) {
        showNotification('Please enter a valid price', 'warning');
        return;
    }

    try {
        const inventoryId = selectedOption.value;
        const typeId = selectedOption.dataset.typeId;

        // Create shop listing
        const { error: insertError } = await supabaseClient
            .from('shop')
            .insert([{
                owner_id: currentUser.id,
                type_id: typeId,
                price: price
            }]);

        if (insertError) {
            if (insertError.code === '23505') {
                showNotification('You already have this item listed for sale', 'warning');
            } else {
                throw insertError;
            }
            return;
        }

        // Remove from inventory
        await supabaseClient
            .from('inventory')
            .delete()
            .eq('id', inventoryId);

        showNotification('Item listed for sale!', 'success');
        closeSellModal();
        await loadUserData();
    } catch (error) {
        console.error('Error selling item:', error);
        showNotification('Failed to list item', 'error');
    }
}

async function cancelListing(listingId) {
    if (!currentUser) return;

    try {
        // Get the listing
        const { data: listing } = await supabaseClient
            .from('shop')
            .select('type_id')
            .eq('id', listingId)
            .single();

        if (!listing) {
            showNotification('Listing not found', 'error');
            return;
        }

        // Delete from shop
        await supabaseClient
            .from('shop')
            .delete()
            .eq('id', listingId);

        // Return to inventory
        await supabaseClient
            .from('inventory')
            .insert([{
                account_id: currentUser.id,
                type_id: listing.type_id
            }]);

        showNotification('Sale cancelled, item returned to inventory', 'success');
        await loadUserData();
    } catch (error) {
        console.error('Error cancelling listing:', error);
        showNotification('Failed to cancel sale', 'error');
    }
}

async function buyListing(listingId, price, typeId, sellerId) {
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
        await supabaseClient
            .from('inventory')
            .insert([{
                account_id: currentUser.id,
                type_id: typeId
            }]);

        // Record transaction - SERVER TRIGGER WILL DELETE THE SHOP LISTING
        // This is the only place we touch the shop table from client
        // The trigger is the source of truth for deletion
        const { error: transactionError } = await supabaseClient
            .from('transactions')
            .insert([{
                buyer_id: currentUser.id,
                seller_id: sellerId,
                type_id: typeId,
                price: price
            }]);

        if (transactionError) throw transactionError;

        showNotification('Item purchased!', 'success');
        await loadUserData();
    } catch (error) {
        console.error('Error buying item:', error);
        showNotification('Failed to purchase item', 'error');
    }
}

// FRIENDS TAB
async function loadFriends() {
    if (!currentUser) return;

    try {
        // Load accepted friends
        const { data: acceptedFriends } = await supabaseClient
            .from('friends')
            .select('id, requester_id, recipient_id, accounts_requester:accounts!friends_requester_id_fkey(name), accounts_recipient:accounts!friends_recipient_id_fkey(name)')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);

        // Load pending requests (where I'm the recipient)
        const { data: pendingRequests } = await supabaseClient
            .from('friends')
            .select('id, requester_id, accounts!friends_requester_id_fkey(name)')
            .eq('recipient_id', currentUser.id)
            .eq('status', 'pending');

        // Load pending requests (where I'm the requester)
        const { data: sentRequests } = await supabaseClient
            .from('friends')
            .select('id, recipient_id, accounts!friends_recipient_id_fkey(name)')
            .eq('requester_id', currentUser.id)
            .eq('status', 'pending');

        const friendsDisplay = document.getElementById('friends-display');
        let html = '';

        // Show received requests
        if (pendingRequests && pendingRequests.length > 0) {
            html += '<div style="margin-bottom: 2rem;"><h4>Friend Requests</h4>';
            html += pendingRequests.map(req => `
                <div class="friend-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <p class="friend-name">${escapeHtml(req.accounts.name)} (wants to add you)</p>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary btn-small" onclick="acceptFriendRequest('${req.id}')">Accept</button>
                        <button class="btn btn-secondary btn-small" onclick="rejectFriendRequest('${req.id}')">Reject</button>
                    </div>
                </div>
            `).join('') + '</div>';
        }

        // Show sent requests
        if (sentRequests && sentRequests.length > 0) {
            html += '<div style="margin-bottom: 2rem;"><h4>Pending Requests</h4>';
            html += sentRequests.map(req => `
                <div class="friend-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <p class="friend-name">${escapeHtml(req.accounts.name)} (request sent)</p>
                    <button class="btn btn-secondary btn-small" onclick="cancelFriendRequest('${req.id}')">Cancel</button>
                </div>
            `).join('') + '</div>';
        }

        // Show accepted friends
        if (acceptedFriends && acceptedFriends.length > 0) {
            html += '<div><h4>Friends</h4>';
            html += acceptedFriends.map(friendship => {
                const friendData = friendship.requester_id === currentUser.id 
                    ? friendship.accounts_recipient 
                    : friendship.accounts_requester;
                return `
                    <div class="friend-item" style="display: flex; justify-content: space-between; align-items: center;">
                        <p class="friend-name">${escapeHtml(friendData.name)}</p>
                        <button class="btn btn-danger btn-small" onclick="removeFriend('${friendship.id}')">Remove</button>
                    </div>
                `;
            }).join('') + '</div>';
        }

        if (!html) {
            html = '<p class="empty-message">No friends yet</p>';
        }

        friendsDisplay.innerHTML = html;
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

async function addFriend() {
    if (!currentUser) return;

    const username = document.getElementById('friend-input').value.trim();
    if (!username) {
        showNotification('Enter a username', 'warning');
        return;
    }

    try {
        // Find user by username
        const { data: user } = await supabaseClient
            .from('accounts')
            .select('id')
            .eq('name', username)
            .single();

        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        if (user.id === currentUser.id) {
            showNotification('Cannot add yourself', 'warning');
            return;
        }

        // Check if request already exists
        const { data: existing } = await supabaseClient
            .from('friends')
            .select('id')
            .or(`and(requester_id.eq.${currentUser.id},recipient_id.eq.${user.id}),and(requester_id.eq.${user.id},recipient_id.eq.${currentUser.id})`);

        if (existing && existing.length > 0) {
            showNotification('Request already exists', 'warning');
            return;
        }

        // Send friend request
        await supabaseClient
            .from('friends')
            .insert([{
                requester_id: currentUser.id,
                recipient_id: user.id,
                status: 'pending'
            }]);

        showNotification('Friend request sent!', 'success');
        document.getElementById('friend-input').value = '';
        await loadFriends();
    } catch (error) {
        console.error('Error adding friend:', error);
        showNotification('Failed to send request', 'error');
    }
}

async function acceptFriendRequest(friendshipId) {
    if (!currentUser) return;

    try {
        await supabaseClient
            .from('friends')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', friendshipId);

        showNotification('Friend request accepted!', 'success');
        await loadFriends();
    } catch (error) {
        console.error('Error accepting request:', error);
        showNotification('Failed to accept request', 'error');
    }
}

async function rejectFriendRequest(friendshipId) {
    if (!currentUser) return;

    try {
        await supabaseClient
            .from('friends')
            .delete()
            .eq('id', friendshipId);

        showNotification('Friend request rejected', 'success');
        await loadFriends();
    } catch (error) {
        console.error('Error rejecting request:', error);
        showNotification('Failed to reject request', 'error');
    }
}

async function cancelFriendRequest(friendshipId) {
    if (!currentUser) return;

    try {
        await supabaseClient
            .from('friends')
            .delete()
            .eq('id', friendshipId);

        showNotification('Friend request cancelled', 'success');
        await loadFriends();
    } catch (error) {
        console.error('Error cancelling request:', error);
        showNotification('Failed to cancel request', 'error');
    }
}

async function removeFriend(friendshipId) {
    if (!currentUser) return;

    try {
        await supabaseClient
            .from('friends')
            .delete()
            .eq('id', friendshipId);

        showNotification('Friend removed', 'success');
        await loadFriends();
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification('Failed to remove friend', 'error');
    }
}

// PROFILE TAB
async function changeUsername() {
    if (!currentUser) return;

    const newName = document.getElementById('name-input').value.trim();
    if (!newName) {
        showNotification('Enter a new name', 'warning');
        return;
    }

    if (newName === userAccount.name) {
        showNotification('That is already your name', 'warning');
        return;
    }

    try {
        await supabaseClient
            .from('accounts')
            .update({ name: newName })
            .eq('id', currentUser.id);

        userAccount.name = newName;
        document.getElementById('user-name').textContent = newName;
        document.getElementById('name-input').value = '';
        showNotification('Username changed!', 'success');
    } catch (error) {
        console.error('Error changing username:', error);
        if (error.message && error.message.includes('unique')) {
            showNotification('That name is already taken', 'error');
        } else {
            showNotification('Failed to change username', 'error');
        }
    }
}

async function changeName() {
    await changeUsername();
    closeChangeNameInput();
}

function openChangeNameInput() {
    document.getElementById('change-name-section').style.display = 'block';
    document.getElementById('name-input').focus();
}

function closeChangeNameInput() {
    document.getElementById('change-name-section').style.display = 'none';
    document.getElementById('name-input').value = '';
}

async function logout() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        userAccount = null;
        showLoginPage();
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

async function deleteAccount() {
    if (!currentUser) return;

    try {
        await supabaseClient.from('accounts').delete().eq('id', currentUser.id);
        await supabaseClient.auth.signOut();
        currentUser = null;
        userAccount = null;
        showLoginPage();
        showNotification('Account deleted', 'success');
    } catch (error) {
        console.error('Error deleting account:', error);
        showNotification('Failed to delete account', 'error');
    }
}

// TAB SWITCHING
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');

    // Reload data for the tab
    if (tab === 'home') loadHome();
    if (tab === 'inventory') loadInventory();
    if (tab === 'shop') loadShop();
    if (tab === 'friends') loadFriends();
}

// UTILITY FUNCTIONS
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
    document.getElementById('modal-message').textContent = `To permanently delete your account, type your username below:\n\n${userAccount.name}`;
    
    const modal = document.getElementById('confirmation-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Create confirmation input
    let confirmInput = modalContent.querySelector('#delete-username-confirm');
    if (!confirmInput) {
        confirmInput = document.createElement('input');
        confirmInput.id = 'delete-username-confirm';
        confirmInput.type = 'text';
        confirmInput.className = 'input-field';
        confirmInput.placeholder = `Type "${userAccount.name}" to confirm`;
        confirmInput.style.marginTop = '1rem';
        modalContent.querySelector('p').insertAdjacentElement('afterend', confirmInput);
    } else {
        confirmInput.value = '';
    }
    
    document.getElementById('modal-confirm-btn').textContent = 'Delete';
    document.getElementById('modal-confirm-btn').className = 'btn btn-danger';
    modal.style.display = 'flex';
}

function confirmAction() {
    if (pendingAction === 'delete_account') {
        const confirmInput = document.getElementById('delete-username-confirm');
        if (!confirmInput || confirmInput.value !== userAccount.name) {
            showNotification('Username does not match', 'error');
            return;
        }
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
