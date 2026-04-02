// ============ BACKEND CONFIG ============
const BACKEND_URL = AppConfig.buildUrl('').slice(0, -1) || 'https://jobsim.pythonanywhere.com';

// ============ AUTHENTICATION CHECK ============
function checkAuthAchievements() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'landing.html';
        return false;
    }
    return true;
}

window.addEventListener('load', () => {
    checkAuthAchievements();
});

// ============ PAGE INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Load and apply theme
    const theme = localStorage.getItem('theme') || 'dark';
    applyThemeAchievements(theme);
    
    await loadAchievements();
    setupEventListeners();
});

// ============ THEME APPLICATION ============
function applyThemeAchievements(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    }
}

// ============ LOAD ACHIEVEMENTS ============
async function loadAchievements() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${BACKEND_URL}/achievements/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            displayDefaultAchievements();
            return;
        }

        const data = await response.json();
        const unlockedAchievements = data.achievements || [];
        
        // Define all possible achievements
        const allAchievements = [
            {
                name: 'First Day',
                icon: '🎯',
                description: 'Complete your first day',
                requirement: 'Play the game'
            },
            {
                name: 'Money Master',
                icon: '💰',
                description: 'Earn ₦200k+',
                requirement: 'End run with ₦200,000+'
            },
            {
                name: 'Zen Master',
                icon: '😌',
                description: 'Keep stress ≤ 20%',
                requirement: 'Maintain low stress'
            },
            {
                name: 'Growth King',
                icon: '📈',
                description: 'Achieve 300+ growth',
                requirement: 'Make smart decisions'
            },
            {
                name: 'Survivor',
                icon: '🏆',
                description: 'Complete all 30 days',
                requirement: 'Finish the game'
            },
            {
                name: 'Perfect Balance',
                icon: '⚖️',
                description: 'Ideal stats',
                requirement: 'Balance all metrics'
            },
            {
                name: 'Hustler',
                icon: '💪',
                description: 'Win 5 games',
                requirement: 'Complete 5 full runs'
            },
            {
                name: 'Entrepreneur',
                icon: '🚀',
                description: 'Business leader',
                requirement: 'Achieve max growth'
            },
            {
                name: 'Lucky Break',
                icon: '🍀',
                description: 'Make risky decisions',
                requirement: 'Take calculated risks'
            },
            {
                name: 'Smart Player',
                icon: '🧠',
                description: 'Never go broke',
                requirement: 'Never reach ₦0'
            }
        ];

        const unlockedNames = new Set(unlockedAchievements.map(a => a.achievement_name));
        const displayData = allAchievements.map(ach => ({
            ...ach,
            unlocked: unlockedNames.has(ach.name)
        }));

        displayAchievements(displayData, unlockedAchievements);
        updateProgressCounts(displayData);

    } catch (error) {
        displayDefaultAchievements();
    }
}

// ============ DISPLAY ACHIEVEMENTS ============
function displayAchievements(allAchievements, unlockedAchievements) {
    const grid = document.getElementById('achievementsGrid');
    
    grid.innerHTML = allAchievements.map(ach => {
        const unlockedData = unlockedAchievements.find(u => u.achievement_name === ach.name);
        const dateStr = unlockedData ? new Date(unlockedData.unlocked_at).toLocaleDateString() : '';
        
        return `
            <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
                <span class="achievement-icon">${ach.icon}</span>
                <p class="achievement-name">${ach.name}</p>
                <p class="achievement-description">${ach.description}</p>
                ${ach.unlocked ? `<p class="achievement-date">Unlocked: ${dateStr}</p>` : `<p class="achievement-description" style="color: #999;">⚠️ Locked</p>`}
            </div>
        `;
    }).join('');
}

// ============ DISPLAY DEFAULT ACHIEVEMENTS ============
function displayDefaultAchievements() {
    const defaultAchievements = [
        { name: 'First Day', icon: '🎯', description: 'Play one game', unlocked: true },
        { name: 'Money Master', icon: '💰', description: 'Earn ₦200k+', unlocked: false },
        { name: 'Zen Master', icon: '😌', description: 'Low stress', unlocked: false },
        { name: 'Growth King', icon: '📈', description: 'Max growth', unlocked: false },
        { name: 'Survivor', icon: '🏆', description: 'Complete 30 days', unlocked: false },
        { name: 'Perfect Balance', icon: '⚖️', description: 'Ideal stats', unlocked: false }
    ];

    displayAchievements(defaultAchievements, []);
    updateProgressCounts(defaultAchievements);
}

// ============ UPDATE PROGRESS COUNTS ============
function updateProgressCounts(achievements) {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.unlocked).length;
    const locked = total - unlocked;

    document.getElementById('totalAchievements').textContent = total;
    document.getElementById('unlockedCount').textContent = unlocked;
    document.getElementById('lockedCount').textContent = locked;
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'landing.html';
    });
}
