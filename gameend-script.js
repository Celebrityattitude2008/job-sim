// ============ BACKEND CONFIG ============
const BACKEND_URL = 'https://JobSim.pythonanywhere.com';

// ============ AUTHENTICATION CHECK ============
function checkAuthGameEnd() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'landing.html';
        return false;
    }
    return true;
}

window.addEventListener('load', () => {
    checkAuthGameEnd();
});

function checkAuthentication() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Check auth before proceeding
if (!checkAuthentication()) throw new Error('Not authenticated');

// ============ PAGE INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Load and apply theme
    const theme = localStorage.getItem('theme') || 'dark';
    applyThemeGameEnd(theme);
    
    await loadGameEndStats();
    setupEventListeners();
    createConfetti();
});

// ============ THEME APPLICATION ============
function applyThemeGameEnd(theme) {
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

// ============ LOAD GAME END STATS ============
async function loadGameEndStats() {
    try {
        const userId = localStorage.getItem('userId');
        const firstName = localStorage.getItem('firstName') || 'Player';
        const fieldOfStudy = localStorage.getItem('fieldOfStudy') || 'Unknown';
        
        // Get initial stats from localStorage
        const finalMoney = parseInt(localStorage.getItem('money')) || 0;
        const finalStress = parseInt(localStorage.getItem('stress')) || 0;
        const finalGrowth = parseInt(localStorage.getItem('growth')) || 0;

        // Display player info
        document.getElementById('playerName').textContent = firstName;
        document.getElementById('playerField').textContent = fieldOfStudy;

        // Get character avatar
        const characterData = {
            'Medicine': '👨‍⚕️',
            'Engineering': '👨‍🔧',
            'Law': '👨‍⚖️',
            'Business': '👨‍💼',
            'Computer Science': '👨‍💻',
            'Mass Communication': '📺',
            'Nursing': '👩‍⚕️',
            'Agriculture': '👨‍🌾',
            'Political Science': '🏛️',
            'Education': '👨‍🏫'
        };

        document.getElementById('playerAvatar').textContent = characterData[fieldOfStudy] || '🎓';

        // Display stats
        const startingMoney = 150000;
        const moneyChange = finalMoney - startingMoney;
        
        document.getElementById('finalMoney').textContent = `₦${formatNumber(finalMoney)}`;
        document.getElementById('finalStress').textContent = `${finalStress}%`;
        document.getElementById('finalGrowth').textContent = finalGrowth;

        document.getElementById('moneyChange').textContent = `${moneyChange >= 0 ? '+' : ''}₦${formatNumber(moneyChange)}`;
        document.getElementById('stressChange').textContent = `${finalStress - 20 >= 0 ? '+' : ''}${finalStress - 20}%`;
        document.getElementById('growthChange').textContent = `+${finalGrowth}`;

        // Calculate performance rating
        calculatePerformanceRating(finalMoney, finalStress, finalGrowth);

        // Load achievements
        await loadAchievements(userId);

        // Mark game as completed
        await completeGame(userId, finalMoney, finalStress, finalGrowth);

    } catch (error) {
        console.error('Error loading game end stats:', error);
    }
}

// ============ CALCULATE PERFORMANCE RATING ============
function calculatePerformanceRating(money, stress, growth) {
    let score = 0;
    let maxScore = 100;
    let tips = [];

    // Money rating (0-30 points)
    if (money >= 200000) {
        score += 30;
        tips.push('💰 Excellent money management! You grew your wealth significantly.');
    } else if (money >= 150000) {
        score += 20;
        tips.push('💰 Good money management. You kept your initial capital.');
    } else if (money >= 100000) {
        score += 10;
        tips.push('💰 Moderate money performance. You lost some funds but stayed positive.');
    } else {
        score += 0;
        tips.push('💰 Focus on budgeting next time - your money depleted quickly.');
    }

    // Stress rating (0-30 points)
    if (stress <= 20) {
        score += 30;
        tips.push('😌 Excellent stress management! You stayed calm and collected.');
    } else if (stress <= 40) {
        score += 20;
        tips.push('😌 Good stress management. You handled pressure reasonably well.');
    } else if (stress <= 60) {
        score += 10;
        tips.push('😌 Moderate stress. Try to prioritize self-care next time.');
    } else {
        score += 0;
        tips.push('😌 High stress this time. Remember: mental health is wealth.');
    }

    // Growth rating (0-40 points)
    if (growth >= 300) {
        score += 40;
        tips.push('📈 Outstanding growth! You made smart decisions consistently.');
    } else if (growth >= 200) {
        score += 30;
        tips.push('📈 Strong growth! Your decisions paid off nicely.');
    } else if (growth >= 100) {
        score += 15;
        tips.push('📈 Some growth achieved. More strategic planning could help.');
    } else {
        score += 0;
        tips.push('📈 Limited growth. Focus on taking calculated risks.');
    }

    // Update UI
    const percentage = (score / maxScore) * 100;
    document.getElementById('ratingFill').style.width = percentage + '%';

    // Set rank badge
    let rank = '🏅 Rank: Survivor';
    if (percentage >= 80) rank = '👑 Rank: Mogul';
    else if (percentage >= 60) rank = '💎 Rank: Pro';
    else if (percentage >= 40) rank = '⭐ Rank: Hustler';

    document.getElementById('rankBadge').textContent = rank;
    document.getElementById('ratingText').textContent = tips[Math.floor(Math.random() * tips.length)];

    // Populate tips
    const tipsContainer = document.getElementById('gameTips');
    tipsContainer.innerHTML = tips.map((tip, idx) => `
        <div class="tip-item">
            <span class="tip-number">${idx + 1}</span>
            <p>${tip}</p>
        </div>
    `).join('');
}

// ============ LOAD ACHIEVEMENTS ============
async function loadAchievements(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/achievements/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throwError('Could not load achievements');
        }

        const data = await response.json();
        const achievements = data.achievements || [];

        // Define default achievement set if none are unlocked
        const defaultAchievements = [
            { achievement_name: 'First Day', achievement_icon: '🎯', achievement_description: 'Complete your first day' },
            { achievement_name: 'Survivor', achievement_icon: '🏆', achievement_description: 'Complete all 30 days' },
            { achievement_name: 'Money Master', achievement_icon: '💰', achievement_description: 'End with ₦200k+' }
        ];

        const achievementsToShow = achievements.length > 0 ? achievements : defaultAchievements;

        const achievementsList = document.getElementById('achievementsList');
        achievementsList.innerHTML = achievementsToShow.slice(0, 6).map(ach => `
            <div class="achievement-item">
                <span class="achievement-icon">${ach.achievement_icon}</span>
                <span class="achievement-name">${ach.achievement_name}</span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

// ============ COMPLETE GAME ============
async function completeGame(userId, finalMoney, finalStress, finalGrowth) {
    try {
        const response = await fetch(`${BACKEND_URL}/complete-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                money: finalMoney,
                stress: finalStress,
                growth: finalGrowth
            })
        });

        if (!response.ok) {
            console.warn('Could not mark game as complete');
        }
    } catch (error) {
        console.error('Error completing game:', error);
    }
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        localStorage.setItem('money', 150000);
        localStorage.setItem('stress', 20);
        localStorage.setItem('growth', 0);
        localStorage.setItem('currentDay', 1);
        window.location.href = 'index.html';
    });

    document.getElementById('profileBtn').addEventListener('click', () => {
        window.location.href = 'profile.html';
    });

    document.getElementById('leaderboardBtn').addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
    });
}

// ============ CONFETTI ANIMATION ============
function createConfetti() {
    const celebration = document.getElementById('celebration');
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.backgroundColor = ['#FFD700', '#FFA500', '#FF6B6B', '#4CAF50', '#2196F3'][Math.floor(Math.random() * 5)];
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = (Math.random() * 0.5) + 's';
        celebration.appendChild(confetti);
    }
}

// ============ HELPER FUNCTIONS ============
function formatNumber(num) {
    return num.toLocaleString();
}
