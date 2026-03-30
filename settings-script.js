// ============ BACKEND CONFIG ============
const BACKEND_URL = 'https://JobSim.pythonanywhere.com';

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

        // Display account info
        document.getElementById('usernameDisplay').textContent = localStorage.getItem('firstName') || 'Player';
        document.getElementById('emailDisplay').textContent = localStorage.getItem('userEmail') || 'email@example.com';
        document.getElementById('fieldDisplay').textContent = localStorage.getItem('fieldOfStudy') || 'Unknown';

        // Fetch settings from backend
        const response = await fetch(`${BACKEND_URL}/settings/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.warn('Could not fetch settings from server, using local settings');
            loadLocalSettings();
            return;
        }

        const data = await response.json();
        const settings = data.settings || {};

        // Apply settings to UI
        document.getElementById('soundToggle').checked = settings.sound_enabled !== false;
        document.getElementById('notificationsToggle').checked = settings.notifications_enabled !== false;
        document.getElementById('themeSelect').value = settings.theme || 'dark';
        document.getElementById('difficultySelect').value = settings.difficulty || 'normal';
        document.getElementById('autosaveSelect').value = settings.autosave || 'on';
        
        // Store in localStorage for game use
        localStorage.setItem('soundEnabled', settings.sound_enabled ? 'true' : 'false');
        localStorage.setItem('theme', settings.theme || 'dark');
        localStorage.setItem('gameDifficulty', settings.difficulty || 'normal');
        localStorage.setItem('autosave', settings.autosave || 'on');

    } catch (error) {
        console.error('Error loading settings:', error);
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
} ============ ============
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
        console.error('Error saving settings:', error);
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
        console.error('Error exporting data:', error);
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
        console.error('Error resetting progress:', error);
        alert('Error resetting progress');
    }
}
