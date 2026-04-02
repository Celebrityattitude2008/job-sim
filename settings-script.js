// ============ BACKEND CONFIG ============
const BACKEND_URL = 'https://jobsim.pythonanywhere.com';

// ============ AUTHENTICATION CHECK ============
function checkAuthSettings() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'landing.html';
        return false;
    }
    return true;
}

window.addEventListener('load', () => {
    checkAuthSettings();
});

// ============ PAGE INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme on page load
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    // Apply sound setting
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    window.gameAudio = { enabled: soundEnabled };
    
    await loadSettings();
    setupEventListeners();
});

// ============ LOAD SETTINGS ============
async function loadSettings() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            window.location.href = 'landing.html';
            return;
        }

        // Display account info from localStorage first
        const firstName = localStorage.getItem('firstName') || 'Player';
        const userEmail = localStorage.getItem('userEmail') || 'email@example.com';
        const fieldOfStudy = localStorage.getItem('fieldOfStudy') || 'Unknown';
        
        // Set display immediately from localStorage
        const usernameDisplay = document.getElementById('usernameDisplay');
        const emailDisplay = document.getElementById('emailDisplay');
        const fieldDisplay = document.getElementById('fieldDisplay');
        
        if (usernameDisplay) usernameDisplay.textContent = firstName;
        if (emailDisplay) emailDisplay.textContent = userEmail;
        if (fieldDisplay) fieldDisplay.textContent = fieldOfStudy;

        // Load local settings
        loadLocalSettings();

        // Try to fetch settings from backend, but don't block if it fails
        try {
            const response = await fetch(`${BACKEND_URL}/settings/${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings || {};

                // Update UI with backend settings
                if (document.getElementById('soundToggle')) {
                    document.getElementById('soundToggle').checked = settings.sound_enabled !== false;
                }
                if (document.getElementById('notificationsToggle')) {
                    document.getElementById('notificationsToggle').checked = settings.notifications_enabled !== false;
                }
                if (document.getElementById('themeSelect')) {
                    document.getElementById('themeSelect').value = settings.theme || 'dark';
                }
                if (document.getElementById('difficultySelect')) {
                    document.getElementById('difficultySelect').value = settings.difficulty || 'normal';
                }
                if (document.getElementById('autosaveSelect')) {
                    document.getElementById('autosaveSelect').value = settings.autosave || 'on';
                }
                
                // Store in localStorage for game use
                localStorage.setItem('soundEnabled', settings.sound_enabled ? 'true' : 'false');
                localStorage.setItem('theme', settings.theme || 'dark');
                localStorage.setItem('gameDifficulty', settings.difficulty || 'normal');
                localStorage.setItem('autosave', settings.autosave || 'on');
            }
        } catch (error) {
            // Server unavailable, use local settings
        }

    } catch (error) {
        loadLocalSettings();
    }
}

function loadLocalSettings() {
    // Load from localStorage if backend unavailable
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    const theme = localStorage.getItem('theme') || 'dark';
    const difficulty = localStorage.getItem('gameDifficulty') || 'normal';
    const autosave = localStorage.getItem('autosave') || 'on';
    
    document.getElementById('soundToggle').checked = soundEnabled;
    document.getElementById('notificationsToggle').checked = localStorage.getItem('notificationsEnabled') !== 'false';
    document.getElementById('themeSelect').value = theme;
    document.getElementById('difficultySelect').value = difficulty;
    document.getElementById('autosaveSelect').value = autosave;
}

// ============ TOGGLE LOGOUT BUTTON VISIBILITY ============
function updateLogoutButtonVisibility() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = 'block';
    }
}

// ============ SETUP EVENT LISTENERS ============
function setupEventListeners() {
    const userId = localStorage.getItem('userId');

    // Save Settings
    document.getElementById('saveButton').addEventListener('click', async () => {
        await saveSettings(userId);
    });

    // Cancel
    document.getElementById('cancelButton').addEventListener('click', () => {
        window.location.href = 'profile.html';
    });

    // Export Data
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        exportUserData();
    });

    // Reset Progress
    document.getElementById('resetDataBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            resetProgress();
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'landing.html';
    });

    // Real-time theme change
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        applyTheme(e.target.value);
        localStorage.setItem('theme', e.target.value);
    });

    // Real-time difficulty change
    document.getElementById('difficultySelect').addEventListener('change', (e) => {
        localStorage.setItem('gameDifficulty', e.target.value);
    });

    // Real-time sound toggle
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        localStorage.setItem('soundEnabled', e.target.checked ? 'true' : 'false');
    });

    // Theme toggle button in navbar
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            document.getElementById('themeSelect').value = newTheme;
            updateThemeToggleIcon(newTheme);
        });
        // Update icon on load
        const currentTheme = localStorage.getItem('theme') || 'dark';
        updateThemeToggleIcon(currentTheme);
    }
}

// Update theme toggle button icon
function updateThemeToggleIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ============ SAVE SETTINGS ============
async function saveSettings(userId) {
    try {
        const settings = {
            sound_enabled: document.getElementById('soundToggle').checked ? 1 : 0,
            notifications_enabled: document.getElementById('notificationsToggle').checked ? 1 : 0,
            theme: document.getElementById('themeSelect').value,
            difficulty: document.getElementById('difficultySelect').value
        };

        const response = await fetch(`${BACKEND_URL}/settings/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            alert('Failed to save settings');
            return;
        }

        alert('Settings saved successfully!');
        
        // Apply theme if changed
        applyTheme(settings.theme);
        
        // Store difficulty in localStorage for game use
        localStorage.setItem('gameDifficulty', settings.difficulty);

    } catch (error) {
        alert('Error saving settings');
    }
}

// ============ APPLY THEME ============
function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    } else if (theme === 'auto') {
        root.setAttribute('data-theme', 'auto');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        }
    }
    
    localStorage.setItem('theme', theme);
}

// ============ EXPORT USER DATA ============
function exportUserData() {
    try {
        const userData = {
            username: localStorage.getItem('firstName'),
            email: localStorage.getItem('userEmail'),
            field: localStorage.getItem('fieldOfStudy'),
            money: localStorage.getItem('money'),
            stress: localStorage.getItem('stress'),
            growth: localStorage.getItem('growth'),
            currentDay: localStorage.getItem('currentDay'),
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jobsim-data-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        alert('Data exported successfully!');

    } catch (error) {
        alert('Error exporting data');
    }
}

// ============ RESET PROGRESS ============
function resetProgress() {
    try {
        localStorage.setItem('money', 150000);
        localStorage.setItem('stress', 20);
        localStorage.setItem('growth', 0);
        localStorage.setItem('currentDay', 1);

        alert('Progress reset! Starting fresh...');
        window.location.href = 'index.html';

    } catch (error) {
        alert('Error resetting progress');
    }
}
