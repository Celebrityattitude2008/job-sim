// ============ BACKEND CONFIGURATION ============
const BACKEND_URL = 'https://jobsim.pythonanywhere.com';

// ============ AUTHENTICATION CHECK ============
function checkAuthentication() {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    // If user is not logged in, redirect to landing page
    if (!userId || !userEmail) {
        window.location.href = 'landing.html';
        return false;
    }
    
    return true;
}

// Check authentication before proceeding
if (!checkAuthentication()) {
    // Stop execution - user will be redirected
    throw new Error('User not authenticated');
}

// ============ LOAD THEME ON PAGE START ============
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        }
    }
}

// ============ DIFFICULTY MULTIPLIER SYSTEM ============
function getDifficultyMultiplier() {
    const difficulty = localStorage.getItem('gameDifficulty') || 'normal';
    const multipliers = {
        'easy': { money: 1.5, stress: 0.5, growth: 0.8 },
        'normal': { money: 1.0, stress: 1.0, growth: 1.0 },
        'hard': { money: 0.7, stress: 1.5, growth: 1.3 },
        'nightmare': { money: 0.5, stress: 2.0, growth: 1.8 }
    };
    return multipliers[difficulty] || multipliers['normal'];
}

function applyDifficultyMultipliers(impacts) {
    const multiplier = getDifficultyMultiplier();
    return {
        money: Math.round(impacts.money * multiplier.money),
        stress: Math.round(impacts.stress * multiplier.stress),
        businessGrowth: Math.round(impacts.businessGrowth * multiplier.growth)
    };
}

// ============ SOUND SYSTEM ============
function playSound(soundType) {
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (!soundEnabled) return;
    
    // Use Web Audio API for simple sound effects
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        switch(soundType) {
            case 'click':
                const osc1 = audioContext.createOscillator();
                const gain1 = audioContext.createGain();
                osc1.connect(gain1);
                gain1.connect(audioContext.destination);
                osc1.frequency.value = 400;
                gain1.gain.setValueAtTime(0.1, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc1.start(now);
                osc1.stop(now + 0.1);
                break;
            case 'success':
                for (let i = 0; i < 3; i++) {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = 500 + (i * 150);
                    gain.gain.setValueAtTime(0.1, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.15);
                }
                break;
            case 'error':
                const oscErr = audioContext.createOscillator();
                const gainErr = audioContext.createGain();
                oscErr.connect(gainErr);
                gainErr.connect(audioContext.destination);
                oscErr.frequency.value = 200;
                gainErr.gain.setValueAtTime(0.1, now);
                gainErr.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                oscErr.start(now);
                oscErr.stop(now + 0.2);
                break;
        }
    } catch (e) {
        // Sound not available
    }
}

// ============ AUTOSAVE SYSTEM ============
function initializeAutosave() {
    const autosave = localStorage.getItem('autosave') || 'on';
    if (autosave === 'on') {
        // Auto-save every 30 seconds
        setInterval(() => {
            saveGameProgress();
        }, 30000);
    }
}

function saveGameProgress() {
    // 1. Keep the local save (good for backup)
    localStorage.setItem('money', gameState.money);
    localStorage.setItem('stress', gameState.stress);
    localStorage.setItem('growth', gameState.businessGrowth);
    localStorage.setItem('currentDay', gameState.day);
    localStorage.setItem('age', gameState.age);
    localStorage.setItem('health', gameState.health);
    localStorage.setItem('happiness', gameState.happiness);
    localStorage.setItem('smarts', gameState.smarts);
    localStorage.setItem('looks', gameState.looks);

    // 2. SEND TO SERVER (This updates the leaderboard)
    const username = localStorage.getItem('username') || gameState.firstName || 'Player';

    const payloadData = {
        username: username,
        money: gameState.money,
        growth: gameState.businessGrowth,
        stress: gameState.stress,
        days: gameState.day
    };

    fetch(`${BACKEND_URL}/update-stats`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        // Silently synced to leaderboard
    })
    .catch(error => {
        // Silently handle error (game continues offline)
    });
}

// ============ LOAD SAVED PROGRESS ============
function loadSavedProgress() {
    const savedMoney = parseInt(localStorage.getItem('money')) || 150000;
    const savedStress = parseInt(localStorage.getItem('stress')) || 30;
    const savedGrowth = parseInt(localStorage.getItem('growth')) || 20;
    const savedDay = parseInt(localStorage.getItem('currentDay')) || 1;
    const savedAge = parseInt(localStorage.getItem('age')) || 0;
    const savedHealth = parseInt(localStorage.getItem('health')) || 100;
    const savedHappiness = parseInt(localStorage.getItem('happiness')) || 100;
    const savedSmarts = parseInt(localStorage.getItem('smarts')) || 50;
    const savedLooks = parseInt(localStorage.getItem('looks')) || 50;
    
    return {
        money: savedMoney,
        stress: savedStress,
        businessGrowth: savedGrowth,
        day: savedDay,
        age: savedAge,
        health: savedHealth,
        happiness: savedHappiness,
        smarts: savedSmarts,
        looks: savedLooks
    };
}

// ============ GAME STATE ============
const savedProgress = loadSavedProgress();
let gameState = {
    day: savedProgress.day,
    money: savedProgress.money,
    stress: savedProgress.stress,
    businessGrowth: savedProgress.businessGrowth,
    age: savedProgress.age,
    health: savedProgress.health,
    happiness: savedProgress.happiness,
    smarts: savedProgress.smarts,
    looks: savedProgress.looks,
    phase: 'playing',
    scenarioIndex: -1,
    selectedChoice: null,
    oldMoney: savedProgress.money,
    oldStress: savedProgress.stress,
    oldBusinessGrowth: savedProgress.businessGrowth,
    userId: localStorage.getItem('userId'),
    firstName: localStorage.getItem('firstName'),
    fieldOfStudy: localStorage.getItem('fieldOfStudy'),
};

// ============ SCENARIOS DATA (Loaded from Backend) ============
// Scenarios are now fetched from the backend API at app.py
// No longer hardcoded in this file
let currentScenario = null;  // Will store the loaded scenario from backend

// ============ BACKEND SCENARIO FETCHING ============
async function fetchRandomScenario() {
    /**
     * Fetch a random scenario for the user's field from backend.
     * Called at game start and when user needs a new scenario.
     */
    try {
        const field = gameState.fieldOfStudy;
        
        if (!field) {
            return false;
        }
        
        // Fetch all scenarios for this field from backend
        const response = await fetch(`${BACKEND_URL}/get-scenarios?field=${encodeURIComponent(field)}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.scenarios || data.scenarios.length === 0) {
            return false;
        }
        
        // Pick random scenario from the returned list
        const randomIndex = Math.floor(Math.random() * data.scenarios.length);
        currentScenario = data.scenarios[randomIndex];
        
        // Scenario loaded
        return true;
        
    } catch (error) {
        // Backend unavailable, falling back to generic scenario
        currentScenario = {
            day: gameState.day,
            text: 'A challenge awaits you in ' + gameState.fieldOfStudy + '. What do you do?',
            choices: [
                { text: 'Take it head on', impacts: { money: 10000, stress: 10, businessGrowth: 5 } },
                { text: 'Take it slow', impacts: { money: 5000, stress: -5, businessGrowth: 2 } }
            ]
        };
        return true;
    }
}

// ============ SCENARIOS SOURCING ============
// IMPORTANT: All scenarios are fetched from app.py ONLY
// Do NOT define scenarios anywhere else in this file
// Use fetchRandomScenario() to retrieve scenarios from the backend

// ============ HELPER FUNCTIONS ============
function generateNaijaComment() {
    const money = gameState.money;
    const stress = gameState.stress;
    const growth = gameState.businessGrowth;

    const comments = [
        'That move na small-small! Keep pushing.',
        'Abuja people no sleep, you too stay awake!',
        'The way you thinking, you go make am one day I swear.',
        'Ehhh, bodies don\'t work themselves! Rest when you can.',
        'That decision smell like Naija wisdom, that one.',
        'Your coffers getting better, oya keep the vibe.',
        'Hunger going teach you what money no teach! Push!',
        'That stress level sef, sit down and find your peace small.',
        'Growth don start to show face! You on track for real.',
        'Money tight eh? No worry, tomorrow is another day.',
        'That business strategy sound like Dangote was your teacher!',
        'Na God go bless this labour oh, I see it!',
        'You dey kampe well well! Keep body strong.',
        'If you continue like this, your name go dey mouth in Abuja.',
        'That hustle spirit, your grandchildren go hear am.',
        'Una big for here! Keep the momentum going.',
        'Stress no be small thing o, balance your life well.',
        'The way your business going, competitors go wake up sharp!',
        'That wisdom go carry you far, believe me.',
        'Every small decision matter, you learn am well done.',
        'Eish! Your stress high like NEPA bill. Breathe abeg.',
        'This one look like the beginning of bigger things!',
        'That your decision just open new door somehow.',
        'Body strong, mind sharp, money in hand - that\'s success.',
        'The hustle real but remember, health na number one priority.',
        'Money dey come, stress dey follow - that\'s the game.',
        'Your business growing like weeds in rainy season!',
        'Respect yourself first, then others go respect you.',
        'That boldness na why you go win in the end.',
        'Keep one eye on money, keep one eye on your health.'
    ];

    return comments[Math.floor(Math.random() * comments.length)];
}

function getPersonalityTitle() {
    const m = gameState.money;
    const s = gameState.stress;
    const g = gameState.businessGrowth;

    if (m > 200000 && s < 40) {
        return { title: 'The Abuja Big Boy/Girl', emoji: '👑', message: 'You made serious money AND stayed cool about it. That\'s elite level right there. Dangote who? 😎' };
    }
    if (m > 200000 && s >= 40) {
        return { title: 'The Rich Workaholic', emoji: '💪', message: 'Money chase you harder than you chase money! Rest sometimes brother/sister, health no dey for mall.' };
    }
    if (m <= 150000 && m > 100000 && s < 40) {
        return { title: 'The Chilled Struggler', emoji: '😎', message: 'You no get heavy money but your peace intact. That\'s wisdom! Millions dey worry themselves to grave.' };
    }
    if (m <= 100000 && s >= 50) {
        return { title: 'The Desperate Hustler', emoji: '🔥', message: 'Broke AND tired? That\'s Nigeria for you. But you still here fighting - that resilience na superpower.' };
    }
    if (g > 70) {
        return { title: 'The Growth Machine', emoji: '📈', message: 'Your business expanding like it get wings! People go remember your name in 5 years, guaranteed.' };
    }
    if (m > 180000 && g < 30) {
        return { title: 'The Safe Keeper', emoji: '🏦', message: 'Beautiful money, but no risk mean no growth. That money sitting too comfortable, make am work harder!' };
    }
    return { title: 'The Balanced Entrepreneur', emoji: '⚖️', message: 'You doing okay-okay! Between money, stress, and growth - you holding am together like pro. Nice one!' };
}

function generateNaijaComment() {
    if (gameState.money <= 0) {
        return 'You\'re broke! This happens to the best of us in Nigeria. Business no money = business dead.';
    }
    if (gameState.stress >= 100) {
        return 'Your stress maxed out! Your body force-locked you from business. Rest calls, body answer.';
    }
    return null;
}

// ============ DOM RENDERS ============
function render() {
    if (gameState.phase === 'finished') {
        renderFinishScreen();
    } else if (gameState.phase === 'gameOver') {
        renderGameOverScreen();
    } else if (gameState.phase === 'consequence') {
        renderConsequence();
    } else if (gameState.phase === 'dailySummary') {
        renderDailySummary();
    } else {
        renderGameplay();
    }
}

function renderHeader() {
    const headerHTML = `
        <div class="header-content">
            <div class="header-left">
                <h1>JobSim Nigeria</h1>
                <div class="user-info">Welcome, ${gameState.firstName || 'Player'}! | ${gameState.fieldOfStudy || 'Field Unknown'}</div>
            </div>
            <div class="header-stats">
                Day <span>${gameState.day}/30</span> | 
                Age <span>${gameState.age}</span> | 
                Money NGN<span>${gameState.money.toLocaleString()}</span> | 
                Health <span>${gameState.health}/100</span> | 
                Happiness <span>${gameState.happiness}/100</span> | 
                Smarts <span>${gameState.smarts}/100</span> | 
                Looks <span>${gameState.looks}/100</span> | 
                Stress <span>${gameState.stress}%</span> | 
                Growth <span>${gameState.businessGrowth}</span>
            </div>
            <button class="nav-menu-toggle" id="navMenuToggle" onclick="toggleNavMenu()">☰</button>
            <div class="header-nav" id="headerNav">
                <button class="nav-btn" onclick="closeNavMenu(); window.location.href='profile.html'" title="View Profile">👤 Profile</button>
                <button class="nav-btn" onclick="closeNavMenu(); window.location.href='leaderboard.html'" title="Leaderboard">🏆 Rankings</button>
                <button class="nav-btn" onclick="closeNavMenu(); window.location.href='achievements.html'" title="Achievements">⭐ Awards</button>
                <button class="nav-btn" onclick="closeNavMenu(); window.location.href='settings.html'" title="Settings">⚙️ Settings</button>
                <button class="nav-btn" onclick="closeNavMenu(); window.location.href='tutorial.html'" title="Tutorial">📖 Guide</button>
                <button class="logout-btn" onclick="logoutUser()">🚪 Logout</button>
            </div>
        </div>
    `;
    document.querySelector('.header').innerHTML = headerHTML;
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const navMenu = document.getElementById('headerNav');
        const navToggle = document.getElementById('navMenuToggle');
        if (navMenu && navToggle && !navMenu.contains(event.target) && !navToggle.contains(event.target)) {
            navMenu.classList.remove('active');
        }
    });
}

function toggleNavMenu() {
    const navMenu = document.getElementById('headerNav');
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
}

function closeNavMenu() {
    const navMenu = document.getElementById('headerNav');
    if (navMenu) {
        navMenu.classList.remove('active');
    }
}

// ============ AUTHENTICATION FUNCTIONS ============
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all user data from localStorage
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('firstName');
        localStorage.removeItem('fieldOfStudy');
        
        // Redirect to landing page after logout
        playSound('click');
        window.location.href = 'landing.html';
    }
}

function renderStatBars() {
    const moneyPercent = Math.min(Math.max(gameState.money / 200000, 0), 1) * 100;
    const stressPercent = Math.min(Math.max(gameState.stress / 100, 0), 1) * 100;
    const growthPercent = Math.min(Math.max(gameState.businessGrowth / 100, 0), 1) * 100;

    return `
        <div class="stat-bar">
            <div class="stat-bar-label">
                <span>💰 Money</span>
                <span>₦${gameState.money.toLocaleString()}</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill green" style="width: ${moneyPercent}%"></div>
            </div>
        </div>
        <div class="stat-bar">
            <div class="stat-bar-label">
                <span>😤 Stress</span>
                <span>${gameState.stress}/100</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill red" style="width: ${stressPercent}%"></div>
            </div>
        </div>
        <div class="stat-bar">
            <div class="stat-bar-label">
                <span>📈 Business Growth</span>
                <span>${gameState.businessGrowth}/100</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill blue" style="width: ${growthPercent}%"></div>
            </div>
        </div>
    `;
}

function renderGameplay() {
    renderHeader();
    const scenario = currentScenario;  // Load from backend

    if (!scenario) {
        // First time - get first scenario from backend
        fetchRandomScenario().then(() => {
            render();
        }).catch(error => {
            // Render with fallback scenario
            render();
        });
        return;
    }

    // The ?. and || [] ensures that if choices is missing, it just shows nothing instead of crashing
    const choicesHTML = (scenario.choices || []).map((choice, index) => {
        // Add fallback values so if 'money' or 'stress' is missing, it shows 0 instead of crashing
        const money = choice.impacts?.money || 0;
        const stress = choice.impacts?.stress || 0;
        const growth = choice.impacts?.businessGrowth || 0;
    
        return `
            <div class="choice-btn" onclick="handleChoice(${index})">
                <div class="choice-text">${choice.text}</div>
                <div class="choice-impact">
                    <span class="${money >= 0 ? 'impact-money-positive' : 'impact-money-negative'}">
                        💰 ${money > 0 ? '+' : ''}${money.toLocaleString()}
                    </span>
                    <span class="${stress >= 0 ? 'impact-stress-positive' : 'impact-stress-negative'}">
                        😤 ${stress > 0 ? '+' : ''}${stress}
                    </span>
                    <span class="${growth >= 0 ? 'impact-growth-positive' : 'impact-growth-negative'}">
                        📈 ${growth > 0 ? '+' : ''}${growth}
                    </span>
                </div>
            </div>`;
    }).join(''); // Don't forget .join('') at the end to clean up the commas!

    const gameplayHTML = `
        <div class="card gameplay scenario">
            <div class="scenario-title">${scenario.title || scenario.text?.substring(0, 50) || "Unknown Challenge"}</div>
            <div class="scenario-description">${scenario.description || scenario.text || "A challenge awaits you. Make a decision."}</div>
            <div class="stat-bars">
                ${renderStatBars()}
            </div>
        </div>
        <div class="card">
            <h2 style="margin-bottom: 1.5rem; font-weight: bold;">What do you do?</h2>
            <div class="choices">
                ${choicesHTML}
            </div>
        </div>
    `;

    const containerHTML = `
        ${gameplayHTML}
    `;

    document.querySelector('.container').innerHTML = containerHTML;
}

function renderConsequence() {
    renderHeader();
    const scenario = currentScenario;  // Load from backend
    const choice = gameState.selectedChoice;
    const impacts = choice?.impacts || { money: 0, stress: 0, businessGrowth: 0 };  // Fallback

    const renderImpactSummary = () => {
        let html = '<h3>Impact of Your Decision:</h3>';
        html += '<div class="impact-item">';
        html += `<span>💰 Money:</span>`;
        html += `<span class="${impacts.money >= 0 ? 'positive' : 'negative'}">₦${(impacts.money || 0) > 0 ? '+' : ''}${(impacts.money || 0).toLocaleString()}</span>`;
        html += '</div>';
        
        html += '<div class="impact-item">';
        html += `<span>😤 Stress:</span>`;
        html += `<span class="${(impacts.stress || 0) >= 0 ? 'negative' : 'positive'}">${(impacts.stress || 0) > 0 ? '+' : ''}${impacts.stress || 0}</span>`;
        html += '</div>';
        
        html += '<div class="impact-item">';
        html += `<span>📈 Business Growth:</span>`;
        html += `<span class="${(impacts.businessGrowth || 0) >= 0 ? 'positive' : 'negative'}">${(impacts.businessGrowth || 0) > 0 ? '+' : ''}${impacts.businessGrowth || 0}</span>`;
        html += '</div>';
        
        return html;
    };

    const consequenceHTML = `
        <div class="card">
            <div class="consequence-title">📋 Consequence</div>
            <div class="consequence-choice"><strong>Your Choice:</strong> ${choice?.text || "Unknown choice"}</div>
            <div class="impact-summary">
                ${renderImpactSummary()}
            </div>
            <div class="tutor-box">
                <h3>👨‍🏫 Tutor's Comment</h3>
                <p>${choice?.tutorComment || "You made an interesting decision. Consider the long-term consequences."}</p>
            </div>
            <div style="margin-top: 1.5rem;">
                ${renderStatBars()}
            </div>
            <button class="btn btn-continue" onclick="continueToDayPlay()" style="margin-top: 1.5rem;">Next Day →</button>
        </div>
    `;

    document.querySelector('.container').innerHTML = consequenceHTML;

    // Add shake and vignette
    triggerShake();
    triggerVignette();
}

function renderDailySummary() {
    renderHeader();
    const naijaComment = generateNaijaComment();

    const dailySummaryHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h2>📊 Daily Summary</h2>
                <div class="modal-stats">
                    <div class="modal-stat blue">
                        <div class="modal-stat-label">
                            <span>💰 Money</span>
                            <span class="modal-stat-change ${gameState.money >= gameState.oldMoney ? 'positive' : 'negative'}">
                                ${gameState.money >= gameState.oldMoney ? '+' : ''}${(gameState.money - gameState.oldMoney).toLocaleString()}
                            </span>
                        </div>
                        <div class="modal-stat-detail">Now: ₦${gameState.money.toLocaleString()}</div>
                    </div>
                    <div class="modal-stat red">
                        <div class="modal-stat-label">
                            <span>😤 Stress</span>
                            <span class="modal-stat-change ${gameState.stress <= gameState.oldStress ? 'positive' : 'negative'}">
                                ${gameState.stress > gameState.oldStress ? '+' : ''}${gameState.stress - gameState.oldStress}
                            </span>
                        </div>
                        <div class="modal-stat-detail">Now: ${gameState.stress}/100</div>
                    </div>
                    <div class="modal-stat green">
                        <div class="modal-stat-label">
                            <span>📈 Growth</span>
                            <span class="modal-stat-change ${gameState.businessGrowth >= gameState.oldBusinessGrowth ? 'positive' : 'negative'}">
                                ${gameState.businessGrowth >= gameState.oldBusinessGrowth ? '+' : ''}${gameState.businessGrowth - gameState.oldBusinessGrowth}
                            </span>
                        </div>
                        <div class="modal-stat-detail">Now: ${gameState.businessGrowth}/100</div>
                    </div>
                </div>
                <div class="naija-comment">
                    <p>"${naijaComment}"</p>
                </div>
                <button class="btn btn-primary" onclick="closeGameplay()">Day ${gameState.day + 1} →</button>
            </div>
        </div>
    `;

    document.querySelector('.container').innerHTML = dailySummaryHTML;
}

function renderGameOverScreen() {
    const reason = checkGameOver();
    const personality = getPersonalityTitle();

    const gameOverHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 30;">
            <div class="game-over-screen">
                <div class="game-over-modal">
                    <div class="game-over-title">💀 GAME OVER</div>
                    <div class="game-over-message">${reason}</div>
                    <div class="game-over-stats">
                        <div class="game-over-stat"><strong>Day Reached:</strong> ${gameState.day}/30</div>
                        <div class="game-over-stat"><strong>Final Money:</strong> ₦${gameState.money.toLocaleString()}</div>
                        <div class="game-over-stat"><strong>Final Stress:</strong> ${gameState.stress}/100</div>
                        <div class="game-over-stat"><strong>Final Growth:</strong> ${gameState.businessGrowth}/100</div>
                    </div>
                    <button class="btn btn-restart" onclick="restartGame()">Try Again 🔄</button>
                </div>
            </div>
        </div>
    `;

    document.body.innerHTML = gameOverHTML;
}

function renderFinishScreen() {
    // Save final stats to localStorage
    localStorage.setItem('money', gameState.money);
    localStorage.setItem('stress', gameState.stress);
    localStorage.setItem('growth', gameState.businessGrowth);
    localStorage.setItem('currentDay', gameState.day);

    // Redirect to game end page after a short delay
    setTimeout(() => {
        window.location.href = 'gameend.html';
    }, 1000);

    // Show a brief completion message
    const personality = getPersonalityTitle();
    const finishHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 30;">
            <div class="finish-screen">
                <div class="finish-modal">
                    <div class="finish-emoji">${personality.emoji}</div>
                    <div class="finish-title">${personality.title}</div>
                    <div class="finish-message">Congratulations! Redirecting to results...</div>
                    <div style="text-align: center; margin-top: 20px;">⏳ Loading...</div>
                </div>
            </div>
        </div>
    `;

    document.body.innerHTML = finishHTML;
}

// ============ GAME LOGIC ============
function handleChoice(choiceIndex) {
    playSound('click');
    
    const scenario = currentScenario;  // Load from backend
    
    // Get the choice from the choices array (which is what we now send from backend)
    const choices = scenario.choices || [];
    const choice = choices[choiceIndex];
    
    if (!choice) {
        console.error(`Choice ${choiceIndex} not found in scenario`, scenario);
        return;  // Safety fallback
    }

    gameState.selectedChoice = choice;
    gameState.oldMoney = gameState.money;
    gameState.oldStress = gameState.stress;
    gameState.oldBusinessGrowth = gameState.businessGrowth;

    // Apply difficulty multipliers to impacts
    const impacts = choice.impacts || { money: 0, stress: 0, businessGrowth: 0 };
    const adjustedImpacts = applyDifficultyMultipliers(impacts);
    
    gameState.money += adjustedImpacts.money;
    gameState.stress += adjustedImpacts.stress;
    gameState.businessGrowth = Math.min(gameState.businessGrowth + adjustedImpacts.businessGrowth, 100);

    gameState.stress = Math.max(0, Math.min(gameState.stress, 100));
    gameState.money = Math.max(0, gameState.money);
    gameState.businessGrowth = Math.max(0, gameState.businessGrowth);

    // Save progress
    saveGameProgress();
    
    gameState.phase = 'consequence';

    // Trigger effects and sounds
    if (adjustedImpacts.money < -20000) {
        playSound('error');
        triggerMoneyFlash();
    } else if (adjustedImpacts.money > 20000) {
        playSound('success');
    }

    render();
}

// ============ GAME OVER CHECK ============
function checkGameOver() {
    /**
     * Check if game-over conditions are met.
     * Returns a message if the game is over, null otherwise.
     */
    if (gameState.health <= 0) {
        return '☠️ You collapsed from poor health. Game over.';
    }
    if (gameState.money <= 0) {
        return '💔 You ran out of money! Your business collapsed. Better luck next time.';
    }
    if (gameState.stress >= 100) {
        return '🤯 You\'ve burned out completely! Your body and mind gave up. Rest and try again.';
    }
    return null;  // Game continues
}

function checkRetirement() {
    if (gameState.age >= 90) {
        return '🎉 You reached 90+ years and retired with all your wisdom!';
    }
    return null;
}

function continueToDayPlay() {
    const retirementReason = checkRetirement();
    if (retirementReason) {
        gameState.phase = 'finished';
        render();
        return;
    }

    const gameOverReason = checkGameOver();
    if (gameOverReason) {
        gameState.phase = 'gameOver';
        render();
        return;
    }

    gameState.day++;

    if (gameState.day > 30) {
        gameState.phase = 'finished';
        render();
        return;
    }

    // Clear current scenario so the next day fetches fresh from backend
    currentScenario = null;
    
    gameState.phase = 'dailySummary';
    render();
}

function closeGameplay() {
    // Fetch next scenario from backend (app.py)
    fetchRandomScenario().then(() => {
        gameState.phase = 'playing';
        render();
    }).catch(error => {
        // Fallback: still show something if fetch fails
        gameState.phase = 'playing';
        render();
    });
}

function restartGame() {
    gameState = {
        day: 1,
        money: 150000,
        stress: 30,
        businessGrowth: 20,
        phase: 'playing',
        scenarioIndex: -1,
        selectedChoice: null,
        oldMoney: 150000,
        oldStress: 30,
        oldBusinessGrowth: 20,
    };

    // Update localStorage so the game actually resets
    localStorage.setItem('currentDay', 1);
    localStorage.setItem('money', 150000);
    localStorage.setItem('stress', 30);
    localStorage.setItem('growth', 20);

    document.body.innerHTML = `
        <div class="header"></div>
        <div class="container"></div>
    `;

    render();
}

// ============ ANIMATION TRIGGERS ============
function triggerShake() {
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    }
}

function triggerVignette() {
    let vignette = document.querySelector('.vignette');
    if (!vignette) {
        vignette = document.createElement('div');
        vignette.className = 'vignette';
        document.body.appendChild(vignette);
    }

    vignette.style.opacity = '1';
    setTimeout(() => {
        vignette.style.opacity = '0';
        vignette.style.transition = 'opacity 1s ease-out';
    }, 100);
}

function triggerMoneyFlash() {
    const moneyElement = document.querySelector('[style*="Money"]')?.parentElement;
    if (moneyElement) {
        moneyElement.classList.add('flash-red');
        setTimeout(() => moneyElement.classList.remove('flash-red'), 1800);
    }
}

// ============ LIFE SIMULATOR FUNCTIONS ============
async function triggerAgeUp() {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        alert('You must be logged in to age up!');
        return;
    }

    // Local pre-check for life conditions
    if (gameState.health <= 0) {
        alert('☠️ You are already at 0 health. Please restart.');
        gameState.phase = 'gameOver';
        render();
        return;
    }
    if (gameState.age >= 90) {
        alert('🎉 You are now retired at age 90+. This round is complete.');
        gameState.phase = 'finished';
        render();
        return;
    }
    
    try {
        const response = await fetch(AppConfig.buildUrl(AppConfig.endpoints.ageUp), {
            method: 'POST',
            headers: AppConfig.fetchDefaults.headers,
            body: JSON.stringify({
                user_id: parseInt(userId),
                current_stats: {
                    health: gameState.health || 100,
                    happiness: gameState.happiness || 100,
                    smarts: gameState.smarts || 50,
                    looks: gameState.looks || 50,
                    money: gameState.money || 0
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update game state with new age and stats from response
            gameState.age = data.new_age;
            gameState.category = data.category;
            
            // Show the random event popup
            showLifeEventPopup(data.event, data.new_age);
            
            playSound('success');
        } else {
            alert('Error: ' + data.error);
            playSound('error');
        }
    } catch (error) {
        console.error('Age-up error:', error);
        alert('Failed to age up. Check console for details.');
        playSound('error');
    }
}

function showLifeEventPopup(event, age) {
    const eventPopup = document.createElement('div');
    eventPopup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border: 3px solid #FF6B35;
        border-radius: 15px;
        padding: 30px;
        max-width: 500px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
    `;
    
    const startAge = age - 1;
    const endAge = age;
    
    eventPopup.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #FF6B35; margin: 0 0 10px 0;">Age ${startAge} → ${endAge}</h2>
            <p style="color: #888; margin: 5px 0;">🎂 You're now ${age} years old!</p>
        </div>
        
        <div style="background: #252525; padding: 20px; border-radius: 10px; margin: 20px 0; min-height: 60px;">
            <p style="color: #ddd; margin: 0; line-height: 1.6;">${event.text}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 20px 0;">
            <button class="life-event-btn" data-option="optionA" style="background: #2e7d32; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                <small>${event.optionA.text}</small>
            </button>
            <button class="life-event-btn" data-option="optionB" style="background: #d32f2f; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                <small>${event.optionB.text}</small>
            </button>
            <button class="life-event-btn" data-option="optionC" style="background: #1976d2; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                <small>${event.optionC.text}</small>
            </button>
        </div>
    `;
    
    document.body.appendChild(eventPopup);
    
    // Add button listeners
    eventPopup.querySelectorAll('.life-event-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const option = this.getAttribute('data-option');
            const impacts = event[option].impacts;
            
            // Apply impacts to player stats
            await applyEventImpacts(impacts);
            
            // Remove popup
            eventPopup.remove();
        });
    });
}

async function applyEventImpacts(impacts) {
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(AppConfig.buildUrl(AppConfig.endpoints.ageUpApply), {
            method: 'POST',
            headers: AppConfig.fetchDefaults.headers,
            body: JSON.stringify({
                user_id: parseInt(userId),
                impacts: impacts
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local game state
            gameState.health = data.user.health;
            gameState.happiness = data.user.happiness;
            gameState.smarts = data.user.smarts;
            gameState.looks = data.user.looks;
            gameState.money = data.user.money;
            gameState.age = data.user.age || gameState.age;

            // Persist and refresh HUD
            saveGameProgress();
            render();

            // Show impact animation
            showImpactAnimation(impacts);

            // Check for lifecycle transitions
            apiCheckLifeCycle();
        }
    } catch (error) {
        console.error('Error applying impacts:', error);
    }
}

function showImpactAnimation(impacts) {
    const impactDiv = document.createElement('div');
    impactDiv.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #FF6B35;
        border-radius: 10px;
        padding: 20px;
        color: white;
        z-index: 10001;
        font-weight: bold;
        text-align: center;
    `;
    
    let html = '<h3 style="margin-top: 0; color: #FF6B35;">✨ Stat Changes ✨</h3>';
    
    if (impacts.health) html += `<p>Health: ${impacts.health > 0 ? '+' : ''}${impacts.health}</p>`;
    if (impacts.happiness) html += `<p>Happiness: ${impacts.happiness > 0 ? '+' : ''}${impacts.happiness}</p>`;
    if (impacts.smarts) html += `<p>Smarts: ${impacts.smarts > 0 ? '+' : ''}${impacts.smarts}</p>`;
    if (impacts.looks) html += `<p>Looks: ${impacts.looks > 0 ? '+' : ''}${impacts.looks}</p>`;
    if (impacts.money) html += `<p>Money: ${impacts.money > 0 ? '+' : ''}₦${impacts.money}</p>`;
    
    impactDiv.innerHTML = html;
    document.body.appendChild(impactDiv);
    
    setTimeout(() => impactDiv.remove(), 3000);
}

async function openMarket() {
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(AppConfig.buildUrl(AppConfig.endpoints.market), {
            method: 'GET',
            headers: AppConfig.fetchDefaults.headers
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMarketUI(data.market, userId);
        }
    } catch (error) {
        console.error('Market error:', error);
    }
}

function showMarketUI(market, userId) {
    const marketModal = document.createElement('div');
    marketModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border: 3px solid #FFD700;
        border-radius: 15px;
        padding: 30px;
        max-width: 600px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    `;
    
    marketModal.innerHTML = `
        <h2 style="color: #FFD700; text-align: center; margin-top: 0;">💰 Crypto & Real Estate Market</h2>
        
        <div style="background: #252525; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #FFD700; margin-top: 0;">BitCoin-NG 📈</h3>
            <p>Price: ₦${market.crypto.price.toLocaleString()} ${market.crypto.trend}</p>
            <input type="number" id="cryptoAmount" placeholder="Units to buy" style="width: 100%; padding: 8px; margin: 10px 0;">
            <button onclick="buyCrypto(${market.crypto.price})" style="background: #2e7d32; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Buy Crypto</button>
        </div>
        
        <div style="background: #252525; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #FFD700; margin-top: 0;">Lekki Property 🏠</h3>
            <p>Price: ₦${market.realestate.price.toLocaleString()} ${market.realestate.trend}</p>
            <input type="number" id="propertyAmount" placeholder="Units to buy" style="width: 100%; padding: 8px; margin: 10px 0;">
            <button onclick="buyProperty(${market.realestate.price})" style="background: #d32f2f; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Buy Property</button>
        </div>
        
        <button onclick="this.parentElement.remove()" style="background: #555; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">Close Market</button>
    `;
    
    document.body.appendChild(marketModal);
}

async function openLifestyle() {
    const lifestyleModal = document.createElement('div');
    lifestyleModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border: 3px solid #9C27B0;
        border-radius: 15px;
        padding: 30px;
        max-width: 550px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 0 30px rgba(156, 39, 176, 0.3);
    `;
    
    lifestyleModal.innerHTML = `
        <h2 style="color: #9C27B0; text-align: center; margin-top: 0;">🎯 Lifestyle Activities</h2>
        
        <div style="background: #252525; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #2e7d32;">💪 Gym</h3>
            <p>Improve Health & Looks - ₦50,000 per hour</p>
            <button onclick="doLifestyleActivity('gym', 1)" style="background: #2e7d32; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Go to Gym (1 hour)</button>
        </div>
        
        <div style="background: #252525; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #1976d2;">📚 Study</h3>
            <p>Increase Smarts - ₦30,000 per hour</p>
            <button onclick="doLifestyleActivity('study', 1)" style="background: #1976d2; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Study (1 hour)</button>
        </div>
        
        <div style="background: #252525; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #FF6B35;">🎉 Entertainment</h3>
            <p>Boost Happiness - ₦100,000 per hour</p>
            <button onclick="doLifestyleActivity('entertainment', 1)" style="background: #FF6B35; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Have Fun (1 hour)</button>
        </div>
        
        <div style="background: #252525; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #4CAF50;">😴 Rest</h3>
            <p>Recover Health & Happiness - FREE</p>
            <button onclick="doLifestyleActivity('rest', 1)" style="background: #4CAF50; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Rest (1 hour)</button>
        </div>
        
        <button onclick="this.parentElement.remove()" style="background: #555; color: white; width: 100%; padding: 10px; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">Close</button>
    `;
    
    document.body.appendChild(lifestyleModal);
}

async function doLifestyleActivity(activity, duration) {
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(AppConfig.buildUrl(AppConfig.endpoints.lifestyle), {
            method: 'POST',
            headers: AppConfig.fetchDefaults.headers,
            body: JSON.stringify({
                user_id: parseInt(userId),
                activity: activity,
                duration: duration
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update game state
            gameState.health = data.user.health;
            gameState.happiness = data.user.happiness;
            gameState.smarts = data.user.smarts;
            gameState.looks = data.user.looks;
            gameState.money = data.user.money;
            gameState.age = data.user.age || gameState.age;
            
            // Persist stats
            saveGameProgress();
            render();
            
            alert(`✅ ${data.description}\n💰 Cost: ₦${data.cost.toLocaleString()}`);
            
            // Close lifestyle modal
            document.querySelector('[style*="9C27B0"]')?.remove();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Lifestyle error:', error);
    }
}

async function apiCheckLifeCycle() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please log in first.');
        return;
    }

    try {
        const response = await fetch(AppConfig.buildUrl('/lifecycle-status') + `?user_id=${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: AppConfig.fetchDefaults.headers
        });
        const data = await response.json();

        if (!data.success) {
            alert('Lifecycle check failed: ' + data.error);
            return;
        }

        if (data.status === 'alive') {
            alert('🟢 Alive and well. Keep going!');
            return;
        }

        if (data.status === 'dead') {
            alert('☠️ Dead (health <= 0). Please restart.');
            gameState.phase = 'gameOver';
            render();
            return;
        }

        if (data.status === 'retired') {
            alert('🎉 Retirement reached (age >= 90)!');
            gameState.phase = 'finished';
            render();
            return;
        }

        alert('Unknown lifecycle status: ' + data.status);
    } catch (error) {
        console.error('Lifecycle check error:', error);
        alert('Failed to check lifecycle. See console.');
    }
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initializeTheme();
    
    // Initialize autosave system
    initializeAutosave();
    
    document.body.innerHTML = `
        <div class="header"></div>
        <div class="container"></div>
    `;
    render();
});
