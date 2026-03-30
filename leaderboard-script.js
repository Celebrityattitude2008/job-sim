// ============ BACKEND CONFIG ============
const BACKEND_URL = 'https://JobSim.pythonanywhere.com';

// ============ AUTHENTICATION CHECK ============
function checkAuthLeaderboard() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'landing.html';
        return false;
    }
    return true;
}

window.addEventListener('load', () => {
    checkAuthLeaderboard();
});

// ============ STATE ============
let currentField = 'all';

// ============ PAGE INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Load and apply theme
    const theme = localStorage.getItem('theme') || 'dark';
    applyThemeLeaderboard(theme);
    
    await loadLeaderboard();
    setupEventListeners();
});

// ============ THEME APPLICATION ============
function applyThemeLeaderboard(theme) {
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

// ============ LOAD LEADERBOARD ============
async function loadLeaderboard() {
    try {
        const url = currentField === 'all' 
            ? `${BACKEND_URL}/leaderboard`
            : `${BACKEND_URL}/leaderboard?field=${currentField}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            displayNoData();
            return;
        }

        const data = await response.json();
        const leaderboard = data.leaderboard || [];

        if (leaderboard.length === 0) {
            displayNoData();
            return;
        }

        displayLeaderboard(leaderboard);
        displayUserRank();

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        displayNoData();
    }
}

// ============ DISPLAY LEADERBOARD ============
function displayLeaderboard(leaderboard) {
    const tbody = document.getElementById('leaderboardBody');
    
    tbody.innerHTML = leaderboard.map((player, index) => {
        const rank = index + 1;
        let medal = '';
        
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        
        return `
            <tr>
                <td class="rank">${medal || rank}</td>
                <td class="player">${player.username}</td>
                <td class="field">${player.field_of_study}</td>
                <td class="money">₦${formatNumber(player.money)}</td>
                <td class="growth">${player.growth}</td>
                <td class="stress">${player.stress}%</td>
                <td class="days">${player.current_day}/30</td>
            </tr>
        `;
    }).join('');
}

// ============ DISPLAY NO DATA ============
function displayNoData() {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7">No players on this leaderboard yet. Be the first!</td>
        </tr>
    `;
}

// ============ DISPLAY USER RANK ============
function displayUserRank() {
    try {
        const userId = localStorage.getItem('userId');
        const firstName = localStorage.getItem('firstName') || 'Player';
        const money = parseInt(localStorage.getItem('money')) || 0;
        const growth = parseInt(localStorage.getItem('growth')) || 0;

        if (!userId) return;

        const rows = document.querySelectorAll('#leaderboardBody tr');
        let userRank = -1;

        rows.forEach((row, index) => {
            const playerName = row.querySelector('.player')?.textContent;
            if (playerName === firstName) {
                userRank = index + 1;
            }
        });

        const card = document.getElementById('yourRankCard');
        if (userRank > 0) {
            card.innerHTML = `
                <div class="rank-info">
                    <span class="rank-position">#${userRank}</span>
                    <div class="rank-details">
                        <p class="rank-name">${firstName}</p>
                        <p class="rank-field">Great progress!</p>
                    </div>
                </div>
                <div class="rank-stats">
                    <span class="stat">💰 ₦${formatNumber(money)}</span>
                    <span class="stat">📈 ${growth}</span>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error displaying user rank:', error);
    }
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Update current field and reload
            currentField = e.target.dataset.field;
            await loadLeaderboard();
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'landing.html';
    });
}

// ============ HELPER FUNCTIONS ============
function formatNumber(num) {
    return num.toLocaleString();
}
