/**
 * StudyHub - Study Group Finder Application
 * Functionality: User Authentication, Group Management, Join System, Dashboard
 */

// ===================================
// Global State & Data Management
// ===================================

let currentUser = null;
let groups = [];
let users = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application by loading data from localStorage
 */
function initializeApp() {
    loadDataFromStorage();
    updateNavigation();
    if (currentUser) {
        showPage('dashboard');
    } else {
        showPage('landing');
    }
}

// ===================================
// Storage Management
// ===================================

/**
 * Load users and groups from localStorage
 */
function loadDataFromStorage() {
    const storedUsers = localStorage.getItem('users');
    const storedGroups = localStorage.getItem('groups');
    const storedCurrentUser = localStorage.getItem('currentUser');

    users = storedUsers ? JSON.parse(storedUsers) : [];
    groups = storedGroups ? JSON.parse(storedGroups) : [];
    currentUser = storedCurrentUser ? JSON.parse(storedCurrentUser) : null;
}

/**
 * Save data to localStorage
 */
function saveDataToStorage() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('groups', JSON.stringify(groups));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// ===================================
// Page Navigation
// ===================================

/**
 * Show the requested page and hide others
 * @param {string} pageId - The ID of the page to show
 */
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show the requested page
    const pageElement = document.getElementById(`${pageId}-page`);
    if (pageElement) {
        pageElement.classList.add('active');

        // Load page-specific content
        if (pageId === 'dashboard') {
            loadDashboard();
        } else if (pageId === 'browse') {
            loadBrowseGroups();
        } else if (pageId === 'myGroups') {
            loadMyGroups();
        }
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Update navigation based on user login status
 */
function updateNavigation() {
    const navMenu = document.getElementById('navMenu');
    if (currentUser) {
        // Show authenticated navigation
        navMenu.style.display = 'flex';
    } else {
        // Reset to show auth pages
        navMenu.style.display = 'flex';
    }
}

// ===================================
// Authentication
// ===================================

/**
 * Handle user signup
 * @param {Event} event - Form submission event
 */
function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirm').value;
    const errorElement = document.getElementById('signupError');

    // Clear previous error message
    errorElement.classList.remove('show');

    // Validation
    if (password.length < 6) {
        showError('signupError', 'Password must be at least 6 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        showError('signupError', 'Passwords do not match.');
        return;
    }

    if (users.some(user => user.email === email)) {
        showError('signupError', 'An account with this email already exists.');
        return;
    }

    // Create new user
    const newUser = {
        id: Date.now(),
        name,
        email,
        password, // Note: In production, passwords should be hashed
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };

    saveDataToStorage();
    updateNavigation();

    // Show success and navigate to dashboard
    showMessage('Account created successfully! Welcome to StudyHub!', 'success');
    document.getElementById('signupForm').reset();
    setTimeout(() => showPage('dashboard'), 500);
}

/**
 * Handle user login
 * @param {Event} event - Form submission event
 */
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');

    // Clear previous error message
    errorElement.classList.remove('show');

    // Find user
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showError('loginError', 'Invalid email or password.');
        return;
    }

    // Set current user
    currentUser = { id: user.id, name: user.name, email: user.email };
    saveDataToStorage();
    updateNavigation();

    // Show success and navigate to dashboard
    showMessage(`Welcome back, ${user.name}!`, 'success');
    document.getElementById('loginForm').reset();
    setTimeout(() => showPage('dashboard'), 500);
}

/**
 * Handle user logout
 */
function logout() {
    currentUser = null;
    saveDataToStorage();
    updateNavigation();
    showMessage('You have been logged out.', 'info');
    showPage('landing');
}

// ===================================
// Group Management (CRUD)
// ===================================

/**
 * Handle group creation
 * @param {Event} event - Form submission event
 */
function handleCreateGroup(event) {
    event.preventDefault();

    if (!currentUser) {
        showError('createGroupError', 'You must be logged in to create a group.');
        return;
    }

    const name = document.getElementById('groupName').value.trim();
    const subject = document.getElementById('groupSubject').value;
    const description = document.getElementById('groupDescription').value.trim();
    const date = document.getElementById('groupDate').value;
    const time = document.getElementById('groupTime').value;
    const maxMembers = parseInt(document.getElementById('groupMaxMembers').value);
    const errorElement = document.getElementById('createGroupError');

    // Clear previous error message
    errorElement.classList.remove('show');

    // Validation
    if (!name || !subject || !description || !date || !time || !maxMembers) {
        showError('createGroupError', 'Please fill in all fields.');
        return;
    }

    // Create new group
    const newGroup = {
        id: Date.now(),
        name,
        subject,
        description,
        date,
        time,
        maxMembers,
        creatorId: currentUser.id,
        creatorName: currentUser.name,
        members: [currentUser.id], // Creator is automatically a member
        joinRequests: [],
        createdAt: new Date().toISOString()
    };

    groups.push(newGroup);
    saveDataToStorage();

    // Show success and reset form
    showMessage('Study group created successfully!', 'success');
    document.getElementById('createGroupForm').reset();
    setTimeout(() => {
        showPage('dashboard');
        loadDashboard();
    }, 500);
}

/**
 * Join a study group
 * @param {number} groupId - The ID of the group to join
 */
function joinGroup(groupId) {
    if (!currentUser) {
        showError('loginError', 'You must be logged in to join a group.');
        showPage('login');
        return;
    }

    const group = groups.find(g => g.id === groupId);
    if (!group) {
        showMessage('Group not found.', 'error');
        return;
    }

    // Check if already a member
    if (group.members.includes(currentUser.id)) {
        showMessage('You are already a member of this group.', 'info');
        return;
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
        showMessage('This group is full. Try joining the waitlist.', 'warning');
        return;
    }

    // Add user to group
    group.members.push(currentUser.id);
    saveDataToStorage();

    showMessage(`You have successfully joined "${group.name}"!`, 'success');
    loadBrowseGroups();
}

/**
 * Leave a study group
 * @param {number} groupId - The ID of the group to leave
 */
function leaveGroup(groupId) {
    if (!currentUser) return;

    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // Remove user from group
    const index = group.members.indexOf(currentUser.id);
    if (index > -1) {
        group.members.splice(index, 1);
    }

    // If creator leaves, delete the group
    if (group.creatorId === currentUser.id) {
        const groupIndex = groups.indexOf(group);
        if (groupIndex > -1) {
            groups.splice(groupIndex, 1);
        }
    }

    saveDataToStorage();
    showMessage('You have left the group.', 'success');
    loadMyGroups();
}

/**
 * Delete a study group (only creator can delete)
 * @param {number} groupId - The ID of the group to delete
 */
function deleteGroup(groupId) {
    if (!currentUser) return;

    const group = groups.find(g => g.id === groupId);
    if (!group || group.creatorId !== currentUser.id) {
        showMessage('You can only delete groups you created.', 'error');
        return;
    }

    if (confirm(`Are you sure you want to delete "${group.name}"? This cannot be undone.`)) {
        const index = groups.indexOf(group);
        if (index > -1) {
            groups.splice(index, 1);
        }
        saveDataToStorage();
        showMessage('Group deleted successfully.', 'success');
        loadMyGroups();
    }
}

// ===================================
// Dashboard Management
// ===================================

/**
 * Load and display the user dashboard
 */
function loadDashboard() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    // Update greeting
    document.getElementById('userGreeting').textContent = currentUser.name.split(' ')[0];

    // Get user's created groups
    const createdGroups = groups.filter(g => g.creatorId === currentUser.id);
    const createdGroupsContainer = document.getElementById('createdGroups');

    if (createdGroups.length === 0) {
        createdGroupsContainer.innerHTML = '<p class="empty-state">No groups created yet. <a href="#" onclick="showPage(\'createGroup\')">Create one now!</a></p>';
    } else {
        createdGroupsContainer.innerHTML = createdGroups.map(group => createGroupCardHTML(group, 'creator')).join('');
    }

    // Get user's joined groups
    const joinedGroups = groups.filter(g => g.members.includes(currentUser.id) && g.creatorId !== currentUser.id);
    const joinedGroupsContainer = document.getElementById('joinedGroups');

    if (joinedGroups.length === 0) {
        joinedGroupsContainer.innerHTML = '<p class="empty-state">You haven\'t joined any groups yet. <a href="#" onclick="showPage(\'browse\')">Browse groups</a></p>';
    } else {
        joinedGroupsContainer.innerHTML = joinedGroups.map(group => createGroupCardHTML(group, 'member')).join('');
    }
}

// ===================================
// Browse Groups
// ===================================

/**
 * Load and display all available groups
 */
function loadBrowseGroups() {
    const container = document.getElementById('browseGroupsList');

    if (groups.length === 0) {
        container.innerHTML = '<p class="empty-state">No groups found. Be the first to create one!</p>';
        return;
    }

    // Filter out groups the user has already joined
    const availableGroups = groups.filter(g => {
        if (!currentUser) return true;
        return !g.members.includes(currentUser.id);
    });

    if (availableGroups.length === 0) {
        container.innerHTML = '<p class="empty-state">You have already joined all available groups!</p>';
        return;
    }

    container.innerHTML = availableGroups.map(group => createGroupCardHTML(group, 'browse')).join('');
}

/**
 * Filter groups based on search and subject filter
 */
function filterGroups() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value;

    const filtered = groups.filter(group => {
        const nameMatch = group.name.toLowerCase().includes(searchInput);
        const subjectMatch = !subjectFilter || group.subject === subjectFilter;
        const notJoined = !currentUser || !group.members.includes(currentUser.id);

        return nameMatch && subjectMatch && notJoined;
    });

    const container = document.getElementById('browseGroupsList');
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No groups match your search criteria.</p>';
    } else {
        container.innerHTML = filtered.map(group => createGroupCardHTML(group, 'browse')).join('');
    }
}

// ===================================
// My Groups Page
// ===================================

/**
 * Load user's created and joined groups in the My Groups page
 */
function loadMyGroups() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    // Created groups
    const createdGroups = groups.filter(g => g.creatorId === currentUser.id);
    const createdContainer = document.getElementById('myCreatedGroups');

    if (createdGroups.length === 0) {
        createdContainer.innerHTML = '<p class="empty-state">You haven\'t created any groups yet.</p>';
    } else {
        createdContainer.innerHTML = createdGroups.map(group => createGroupCardHTML(group, 'creator')).join('');
    }

    // Joined groups
    const joinedGroups = groups.filter(g => g.members.includes(currentUser.id) && g.creatorId !== currentUser.id);
    const joinedContainer = document.getElementById('myJoinedGroups');

    if (joinedGroups.length === 0) {
        joinedContainer.innerHTML = '<p class="empty-state">You haven\'t joined any groups yet.</p>';
    } else {
        joinedContainer.innerHTML = joinedGroups.map(group => createGroupCardHTML(group, 'member')).join('');
    }
}

/**
 * Switch between tabs in My Groups page
 * @param {string} tabId - The ID of the tab to show
 */
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Hide all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabId).classList.add('active');

    // Highlight selected button
    event.target.classList.add('active');
}

// ===================================
// Group Details Page
// ===================================

/**
 * Display detailed information about a group
 * @param {number} groupId - The ID of the group to display
 */
function showGroupDetails(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) {
        showMessage('Group not found.', 'error');
        return;
    }

    const container = document.getElementById('groupDetailsContent');

    // Get member details
    const memberUsers = users.filter(u => group.members.includes(u.id));

    let html = `
        <div class="group-details-header">
            <h2>${escapeHtml(group.name)}</h2>
            <div class="group-info">
                <span class="info-item">📚 <strong>Subject:</strong> ${escapeHtml(group.subject)}</span>
                <span class="info-item">👥 <strong>Members:</strong> ${group.members.length}/${group.maxMembers}</span>
                <span class="info-item">📅 <strong>Date:</strong> ${formatDate(group.date)}</span>
                <span class="info-item">⏰ <strong>Time:</strong> ${group.time}</span>
            </div>
            <p><strong>Description:</strong></p>
            <p>${escapeHtml(group.description)}</p>
            <p><strong>Created by:</strong> ${escapeHtml(group.creatorName)}</p>
        </div>
    `;

    // Add action buttons
    if (currentUser) {
        if (group.creatorId === currentUser.id) {
            html += `<button class="btn btn-danger btn-small" onclick="deleteGroup(${group.id})">Delete Group</button>`;
        } else if (group.members.includes(currentUser.id)) {
            html += `<button class="btn btn-danger btn-small" onclick="leaveGroup(${group.id})">Leave Group</button>`;
        } else {
            if (group.members.length < group.maxMembers) {
                html += `<button class="btn btn-primary btn-small" onclick="joinGroup(${group.id})">Join Group</button>`;
            } else {
                html += `<p class="warning-message">This group is full.</p>`;
            }
        }
    }

    // Members list
    html += `
        <div class="group-members-list">
            <h3>Group Members</h3>
            <div class="members-grid">
                ${memberUsers.map(member => `
                    <div class="member-card">
                        <p>👤 ${escapeHtml(member.name)}</p>
                        <p style="font-size: 0.85rem; color: #666;">${escapeHtml(member.email)}</p>
                        ${group.creatorId === member.id ? '<p style="color: #6366f1; font-size: 0.85rem;">✨ Creator</p>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
    showPage('groupDetails');
}

// ===================================
// Utility Functions
// ===================================

/**
 * Create HTML for a group card
 * @param {Object} group - The group object
 * @param {string} context - The context ('creator', 'member', or 'browse')
 * @returns {string} HTML string
 */
function createGroupCardHTML(group, context) {
    const isFull = group.members.length >= group.maxMembers;
    const isCreator = currentUser && group.creatorId === currentUser.id;
    const isMember = currentUser && group.members.includes(currentUser.id);

    let actionsHtml = '';

    if (context === 'browse') {
        if (!isMember) {
            actionsHtml = `
                <div class="group-actions">
                    <button class="btn btn-primary btn-small" onclick="joinGroup(${group.id})" ${isFull ? 'disabled' : ''}>
                        ${isFull ? 'Group Full' : 'Join Group'}
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="showGroupDetails(${group.id})">Details</button>
                </div>
            `;
        }
    } else if (context === 'creator') {
        actionsHtml = `
            <div class="group-actions">
                <button class="btn btn-secondary btn-small" onclick="showGroupDetails(${group.id})">View Details</button>
                <button class="btn btn-danger btn-small" onclick="deleteGroup(${group.id})">Delete</button>
            </div>
        `;
    } else if (context === 'member') {
        actionsHtml = `
            <div class="group-actions">
                <button class="btn btn-secondary btn-small" onclick="showGroupDetails(${group.id})">View Details</button>
                <button class="btn btn-danger btn-small" onclick="leaveGroup(${group.id})">Leave</button>
            </div>
        `;
    }

    return `
        <div class="group-card">
            <div class="group-card-header">
                <h3 class="group-title">${escapeHtml(group.name)}</h3>
                <span class="group-badge">${escapeHtml(group.subject)}</span>
            </div>
            <div class="group-info">
                <span class="info-item">👥 ${group.members.length}/${group.maxMembers} members</span>
                <span class="info-item">📅 ${formatDate(group.date)}</span>
                <span class="info-item">⏰ ${group.time}</span>
            </div>
            <p class="group-description">${escapeHtml(group.description.substring(0, 100))}...</p>
            <p class="group-members"><strong>Created by:</strong> ${escapeHtml(group.creatorName)}</p>
            ${actionsHtml}
        </div>
    `;
}

/**
 * Show error message
 * @param {string} elementId - The ID of the error element
 * @param {string} message - The error message
 */
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('show');
}

/**
 * Show notification message
 * @param {string} message - The message text
 * @param {string} type - The message type ('success', 'error', 'info', 'warning')
 */
function showMessage(message, type = 'info') {
    alert(message); // Simple implementation; can be enhanced with toast notifications
}

/**
 * Format date to readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================
// Sample Data Generator (for demo purposes)
// ===================================

/**
 * Generate sample data for demonstration
 * Remove this function in production
 */
function generateSampleData() {
    if (users.length === 0) {
        // Sample users
        users = [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: 'password123',
                createdAt: new Date().toISOString()
            }
        ];

        // Sample groups
        groups = [
            {
                id: 101,
                name: 'Advanced Calculus Study Group',
                subject: 'Mathematics',
                description: 'Focused on calculus topics including derivatives, integrals, and applications. We meet weekly to solve practice problems and discuss difficult concepts.',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                time: '18:00',
                maxMembers: 8,
                creatorId: 1,
                creatorName: 'John Doe',
                members: [1, 2],
                joinRequests: [],
                createdAt: new Date().toISOString()
            },
            {
                id: 102,
                name: 'Physics Fundamentals',
                subject: 'Physics',
                description: 'Understanding the basics of classical mechanics. Perfect for beginners and those preparing for exams.',
                date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                time: '17:30',
                maxMembers: 10,
                creatorId: 2,
                creatorName: 'Jane Smith',
                members: [2],
                joinRequests: [],
                createdAt: new Date().toISOString()
            }
        ];

        saveDataToStorage();
    }
}

// Uncomment the line below to generate sample data on first load
// generateSampleData();