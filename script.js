// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBnv6OO3op-wTsvmdhBV5LeOD936U6VMb8",
    authDomain: "warehouse-dcb05.firebaseapp.com",
    projectId: "warehouse-dcb05",
    storageBucket: "warehouse-dcb05.firebasestorage.app",
    messagingSenderId: "659674791187",
    appId: "1:659674791187:web:6ba00f986ad2e9b2f5eee6",
    measurementId: "G-1CDSFRS6G3"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables
const CORRECT_PASSWORD = "Zxzx1212zxzX";
let currentItems = [];
let currentFilter = "";

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (localStorage.getItem('wms_authenticated') === 'true') {
        showMainApp();
    }
    
    // Add enter key listener for password input
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Initialize form handlers
    initializeFormHandlers();
});

// Authentication Functions
function login() {
    const password = passwordInput.value;
    
    if (password === CORRECT_PASSWORD) {
        localStorage.setItem('wms_authenticated', 'true');
        showMainApp();
        loginError.textContent = '';
        passwordInput.value = '';
    } else {
        loginError.textContent = 'Incorrect password. Please try again.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function logout() {
    localStorage.removeItem('wms_authenticated');
    loginScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
    passwordInput.focus();
}

function showMainApp() {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    loadItems();
}

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabMap = {
        'items': 'itemsTab',
        'add-item': 'addItemTab',
        'activity': 'activityTab'
    };
    
    document.getElementById(tabMap[tabName]).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'items') {
        loadItems();
    } else if (tabName === 'activity') {
        loadAllActivity();
    }
}

// Form Handlers
function initializeFormHandlers() {
    // Add Item Form
    document.getElementById('addItemForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addItem();
    });
    
    // Edit Item Form
    document.getElementById('editItemForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateItem();
    });
    
    // Activity Form
    document.getElementById('activityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addActivity();
    });
}

// Item Management Functions
async function addItem() {
    try {
        const itemData = {
            name: document.getElementById('itemName').value,
            itemId: document.getElementById('itemId').value,
            notes: document.getElementById('notes').value,
            location: document.getElementById('location').value,
            entity: document.getElementById('entity').value,
            category: document.getElementById('category').value,
            itemTypes: getSelectedCheckboxes('addItemForm'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('items').add(itemData);
        
        showMessage('Item added successfully!', 'success');
        document.getElementById('addItemForm').reset();
        
        // Switch to items tab and reload
        showTab('items');
        
    } catch (error) {
        console.error('Error adding item:', error);
        showMessage('Error adding item. Please try again.', 'error');
    }
}

async function loadItems() {
    try {
        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.innerHTML = '<div class="loading">Loading items...</div>';
        
        const snapshot = await db.collection('items').orderBy('createdAt', 'desc').get();
        currentItems = [];
        
        snapshot.forEach(doc => {
            currentItems.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayItems(currentItems);
        
    } catch (error) {
        console.error('Error loading items:', error);
        document.getElementById('itemsContainer').innerHTML = 
            '<div class="error-message">Error loading items. Please refresh the page.</div>';
    }
}

function displayItems(items) {
    const itemsContainer = document.getElementById('itemsContainer');
    
    if (items.length === 0) {
        itemsContainer.innerHTML = '<div class="loading">No items found.</div>';
        return;
    }
    
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'items-grid';
    
    items.forEach(item => {
        const itemCard = createItemCard(item);
        itemsGrid.appendChild(itemCard);
    });
    
    itemsContainer.innerHTML = '';
    itemsContainer.appendChild(itemsGrid);
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const itemTypes = item.itemTypes && item.itemTypes.length > 0 
        ? item.itemTypes.map(type => `<span class="item-type-tag">${type}</span>`).join('')
        : '';
    
    card.innerHTML = `
        <div class="item-header">
            <h3 class="item-name">${item.name}</h3>
            <span class="item-entity">${item.entity}</span>
        </div>
        <div class="item-details">
            ${item.itemId ? `<div class="item-detail"><strong>ID:</strong> ${item.itemId}</div>` : ''}
            ${item.location ? `<div class="item-detail"><strong>Location:</strong> ${item.location}</div>` : ''}
            ${item.category ? `<div class="item-detail"><strong>Category:</strong> ${item.category}</div>` : ''}
            ${item.notes ? `<div class="item-detail"><strong>Notes:</strong> ${item.notes}</div>` : ''}
        </div>
        ${itemTypes ? `<div class="item-types">${itemTypes}</div>` : ''}
        <div class="item-actions">
            <button class="btn-edit" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn-activity" onclick="showItemActivity('${item.id}', '${item.name}')">Activity</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
        </div>
    `;
    
    return card;
}

function filterItems() {
    const entityFilter = document.getElementById('entityFilter').value;
    currentFilter = entityFilter;
    
    if (entityFilter === '') {
        displayItems(currentItems);
    } else {
        const filteredItems = currentItems.filter(item => item.entity === entityFilter);
        displayItems(filteredItems);
    }
}

async function editItem(itemId) {
    try {
        const doc = await db.collection('items').doc(itemId).get();
        if (!doc.exists) {
            showMessage('Item not found.', 'error');
            return;
        }
        
        const item = doc.data();
        
        // Populate edit form
        document.getElementById('editItemDocId').value = itemId;
        document.getElementById('editItemName').value = item.name || '';
        document.getElementById('editItemId').value = item.itemId || '';
        document.getElementById('editNotes').value = item.notes || '';
        document.getElementById('editLocation').value = item.location || '';
        document.getElementById('editEntity').value = item.entity || '';
        document.getElementById('editCategory').value = item.category || '';
        
        // Set checkboxes
        const checkboxes = document.querySelectorAll('#editItemTypes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = item.itemTypes && item.itemTypes.includes(checkbox.value);
        });
        
        // Show modal
        document.getElementById('editModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading item for edit:', error);
        showMessage('Error loading item. Please try again.', 'error');
    }
}

async function updateItem() {
    try {
        const itemId = document.getElementById('editItemDocId').value;
        
        const itemData = {
            name: document.getElementById('editItemName').value,
            itemId: document.getElementById('editItemId').value,
            notes: document.getElementById('editNotes').value,
            location: document.getElementById('editLocation').value,
            entity: document.getElementById('editEntity').value,
            category: document.getElementById('editCategory').value,
            itemTypes: getSelectedCheckboxes('editItemForm'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('items').doc(itemId).update(itemData);
        
        showMessage('Item updated successfully!', 'success');
        closeEditModal();
        loadItems();
        
    } catch (error) {
        console.error('Error updating item:', error);
        showMessage('Error updating item. Please try again.', 'error');
    }
}

async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Delete item
        await db.collection('items').doc(itemId).delete();
        
        // Delete associated activities
        const activitiesSnapshot = await db.collection('activities')
            .where('itemId', '==', itemId)
            .get();
        
        const batch = db.batch();
        activitiesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        showMessage('Item deleted successfully!', 'success');
        loadItems();
        
    } catch (error) {
        console.error('Error deleting item:', error);
        showMessage('Error deleting item. Please try again.', 'error');
    }
}

// Activity Management Functions
async function showItemActivity(itemId, itemName) {
    document.getElementById('activityItemId').value = itemId;
    document.getElementById('activityModalTitle').textContent = `Activity for: ${itemName}`;
    
    // Load activity history
    await loadItemActivity(itemId);
    
    // Show modal
    document.getElementById('activityModal').classList.remove('hidden');
}

async function loadItemActivity(itemId) {
    try {
        const activityList = document.getElementById('itemActivityList');
        activityList.innerHTML = '<div class="loading">Loading activity...</div>';
        
        const snapshot = await db.collection('activities')
            .where('itemId', '==', itemId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            activityList.innerHTML = '<div class="loading">No activity recorded for this item.</div>';
            return;
        }
        
        activityList.innerHTML = '';
        snapshot.forEach(doc => {
            const activity = doc.data();
            const activityElement = createActivityElement(activity);
            activityList.appendChild(activityElement);
        });
        
    } catch (error) {
        console.error('Error loading activity:', error);
        document.getElementById('itemActivityList').innerHTML = 
            '<div class="error-message">Error loading activity.</div>';
    }
}

async function addActivity() {
    try {
        const itemId = document.getElementById('activityItemId').value;
        const activityType = document.getElementById('activityType').value;
        const description = document.getElementById('activityDescription').value;
        
        const activityData = {
            itemId: itemId,
            type: activityType,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('activities').add(activityData);
        
        showMessage('Activity added successfully!', 'success');
        document.getElementById('activityForm').reset();
        
        // Reload activity for this item
        await loadItemActivity(itemId);
        
    } catch (error) {
        console.error('Error adding activity:', error);
        showMessage('Error adding activity. Please try again.', 'error');
    }
}

async function loadAllActivity() {
    try {
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '<div class="loading">Loading activity...</div>';
        
        // Get all activities with item names
        const activitiesSnapshot = await db.collection('activities')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        if (activitiesSnapshot.empty) {
            activityList.innerHTML = '<div class="loading">No activity recorded.</div>';
            return;
        }
        
        // Get item names for activities
        const itemIds = [...new Set(activitiesSnapshot.docs.map(doc => doc.data().itemId))];
        const itemsData = {};
        
        for (const itemId of itemIds) {
            try {
                const itemDoc = await db.collection('items').doc(itemId).get();
                if (itemDoc.exists) {
                    itemsData[itemId] = itemDoc.data().name;
                } else {
                    itemsData[itemId] = 'Unknown Item';
                }
            } catch (error) {
                itemsData[itemId] = 'Unknown Item';
            }
        }
        
        activityList.innerHTML = '';
        activitiesSnapshot.forEach(doc => {
            const activity = doc.data();
            activity.itemName = itemsData[activity.itemId] || 'Unknown Item';
            const activityElement = createActivityElement(activity, true);
            activityList.appendChild(activityElement);
        });
        
    } catch (error) {
        console.error('Error loading all activity:', error);
        document.getElementById('activityList').innerHTML = 
            '<div class="error-message">Error loading activity.</div>';
    }
}

function createActivityElement(activity, showItemName = false) {
    const element = document.createElement('div');
    element.className = `activity-item activity-${activity.type}`;
    
    const date = activity.createdAt ? 
        activity.createdAt.toDate().toLocaleString() : 
        'Unknown date';
    
    element.innerHTML = `
        <div class="activity-header">
            <span class="activity-type ${activity.type}">${activity.type === 'in' ? 'Put In' : 'Took Out'}</span>
            <span class="activity-date">${date}</span>
        </div>
        ${showItemName ? `<div class="activity-item-name"><strong>Item:</strong> ${activity.itemName}</div>` : ''}
        <div class="activity-description">${activity.description}</div>
    `;
    
    return element;
}

// Modal Functions
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.add('hidden');
    document.getElementById('activityForm').reset();
}

// Utility Functions
function getSelectedCheckboxes(formId) {
    const checkboxes = document.querySelectorAll(`#${formId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    // Insert at the top of the active tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        activeTab.insertBefore(messageDiv, activeTab.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const editModal = document.getElementById('editModal');
    const activityModal = document.getElementById('activityModal');
    
    if (event.target === editModal) {
        closeEditModal();
    }
    
    if (event.target === activityModal) {
        closeActivityModal();
    }
});

// Error handling for Firebase
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    if (event.reason && event.reason.code) {
        let message = 'An error occurred. Please try again.';
        
        switch (event.reason.code) {
            case 'permission-denied':
                message = 'Permission denied. Please check your Firebase security rules.';
                break;
            case 'unavailable':
                message = 'Service temporarily unavailable. Please try again later.';
                break;
            case 'unauthenticated':
                message = 'Authentication required. Please refresh the page.';
                break;
        }
        
        showMessage(message, 'error');
    }
});
