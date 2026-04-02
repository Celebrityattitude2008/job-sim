// ============ BACKEND CONFIG ============
const BACKEND_URL = AppConfig.buildUrl('').slice(0, -1) || 'https://jobsim.pythonanywhere.com';

// ============ AUTHENTICATION CHECK ============
function checkAuthProfile() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'landing.html';
        return false;
    }
    return true;
}

window.addEventListener('load', () => {
    checkAuthProfile();
});

function checkAuthentication() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

if (!checkAuthentication()) throw new Error('Not authenticated');

// ============ PAGE INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Load and apply theme
    const theme = localStorage.getItem('theme') || 'dark';
    applyThemeProfile(theme);
    
    await loadProfileData();
    setupEventListeners();
});

// ============ THEME APPLICATION ============
function applyThemeProfile(theme) {
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

// ============ LOAD PROFILE DATA ============
async function loadProfileData() {
    try {
        const userId = localStorage.getItem('userId');
        const firstName = localStorage.getItem('firstName') || 'Player';
        const fieldOfStudy = localStorage.getItem('fieldOfStudy') || 'Unknown';
        const userEmail = localStorage.getItem('userEmail') || 'email@example.com';

        // Fetch user data from backend
        const response = await fetch(`${BACKEND_URL}/user/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            displayLocalData(firstName, fieldOfStudy);
            return;
        }

        const data = await response.json();
        const user = data.user;

        // Display profile info
        document.getElementById('profileName').textContent = user.username || firstName;
        document.getElementById('profileField').textContent = user.field || fieldOfStudy;
        document.getElementById('profileEmail').textContent = user.email || userEmail;

        // Get character avatar
        const characterAvatars = {
            'Medicine': 'MD',
            'Engineering': 'ENG',
            'Law': 'LAW',
            'Business': 'BUS',
            'Computer Science': 'CS',
            'Mass Communication': 'MEDIA',
            'Nursing': 'NURSE',
            'Agriculture': 'AGR',
            'Political Science': 'PS',
            'Education': 'EDU'
        };

        document.getElementById('profileAvatar').textContent = characterAvatars[user.field] || 'USER';

        // Display current stats
        document.getElementById('currentMoney').textContent = `₦${formatNumber(user.stats.money)}`;
        document.getElementById('currentStress').textContent = `${user.stats.stress}%`;
        document.getElementById('currentGrowth').textContent = user.stats.growth;
        document.getElementById('currentDay').textContent = user.current_day;

        // Display best stats
        document.getElementById('bestMoney').textContent = `₦${formatNumber(user.stats.money)}`;
        document.getElementById('bestGrowth').textContent = user.stats.growth;
        document.getElementById('gamesPlayed').textContent = '1';
        document.getElementById('completed').textContent = user.game_completed ? '1' : '0';

        // Update progress bars
        updateProgressBars(user.stats);

        // Load achievements
        await loadAchievements(userId);

    } catch (error) {
        displayLocalData();
    }
}

// ============ DISPLAY LOCAL DATA ============
function displayLocalData(name = 'Player', field = 'Unknown') {
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileField').textContent = field;
    document.getElementById('profileEmail').textContent = localStorage.getItem('userEmail') || 'email@example.com';

    const money = parseInt(localStorage.getItem('money')) || 150000;
    const stress = parseInt(localStorage.getItem('stress')) || 20;
    const growth = parseInt(localStorage.getItem('growth')) || 0;
    const day = parseInt(localStorage.getItem('currentDay')) || 1;

    document.getElementById('currentMoney').textContent = `₦${formatNumber(money)}`;
    document.getElementById('currentStress').textContent = `${stress}%`;
    document.getElementById('currentGrowth').textContent = growth;
    document.getElementById('currentDay').textContent = day;

    updateProgressBars({ money, stress, growth });
}

// ============ UPDATE PROGRESS BARS ============
function updateProgressBars(stats) {
    const startingMoney = 150000;
    const moneyPercent = Math.min(100, ((stats.money / startingMoney) * 100));
    const growthPercent = Math.min(100, (stats.growth / 500) * 100);
    const stressPercent = Math.min(100, stats.stress);

    document.getElementById('moneyProgressFill').style.width = moneyPercent + '%';
    document.getElementById('moneyPercent').textContent = Math.round(moneyPercent) + '%';

    document.getElementById('growthProgressFill').style.width = growthPercent + '%';
    document.getElementById('growthPercent').textContent = Math.round(growthPercent) + '%';

    document.getElementById('stressProgressFill').style.width = stressPercent + '%';
    document.getElementById('stressPercent').textContent = Math.round(stressPercent) + '%';
}

// ============ LOAD ACHIEVEMENTS ============
async function loadAchievements(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/achievements/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            displayDefaultAchievements();
            return;
        }

        const data = await response.json();
        const achievements = data.achievements || [];

        if (achievements.length === 0) {
            displayDefaultAchievements();
            return;
        }

        const achievementsGrid = document.getElementById('achievementsGrid');
        achievementsGrid.innerHTML = achievements.slice(0, 9).map(ach => `
            <div class="achievement-card">
                <div>
                    <span class="achievement-icon">${ach.achievement_icon}</span>
                    <span class="achievement-name">${ach.achievement_name}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        displayDefaultAchievements();
    }
}

// ============ DISPLAY DEFAULT ACHIEVEMENTS ============
function displayDefaultAchievements() {
    const defaultAchievements = [
        { icon: '🎯', name: 'Starter' },
        { icon: '💰', name: 'Money Maker' },
        { icon: '📈', name: 'Growth King' },
        { icon: '😌', name: 'Zen Master' },
        { icon: '🏆', name: 'Champion' },
        { icon: '⭐', name: 'Rising Star' }
    ];

    const achievementsGrid = document.getElementById('achievementsGrid');
    achievementsGrid.innerHTML = defaultAchievements.map(ach => `
        <div class="achievement-card">
            <div>
                <span class="achievement-icon">${ach.icon}</span>
                <span class="achievement-name">${ach.name}</span>
            </div>
        </div>
    `).join('');
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    document.getElementById('playBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
        window.location.href = 'settings.html';
    });

    document.getElementById('leaderboardBtn').addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

// ============ HELPER FUNCTIONS ============
function formatNumber(num) {
    return num.toLocaleString();
}
