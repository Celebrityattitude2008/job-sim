/* 
   JobSim Frontend Integration Kit
   Copy this template and paste into your script.js
*/

// ============ CONFIGURATION ============
// Change this to your PythonAnywhere URL when deployed
const API_BASE_URL = 'https://jobsim.pythonanywhere.com';

// ============ AUTHENTICATION ============

/**
 * Sign up a new user
 */
async function signupUser(name, email, password, field) {
    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                field: field
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Store user data in localStorage
            localStorage.setItem('userId', data.user_id);
            localStorage.setItem('username', data.username);
            localStorage.setItem('field', data.field);
            localStorage.setItem('money', data.starter_stats.money);
            localStorage.setItem('stress', data.starter_stats.stress);
            localStorage.setItem('growth', data.starter_stats.growth);
            localStorage.setItem('currentDay', data.starter_stats.current_day);
        }
        
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Log in an existing user
 */
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Store user data in localStorage
            localStorage.setItem('userId', data.user_id);
            localStorage.setItem('username', data.username);
            localStorage.setItem('field', data.field);
            localStorage.setItem('money', data.stats.money);
            localStorage.setItem('stress', data.stats.stress);
            localStorage.setItem('growth', data.stats.growth);
            localStorage.setItem('currentDay', data.current_day);
        }
        
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============ GAMEPLAY ============

/**
 * Get a daily scenario for the user
 */
async function getDailyScenario() {
    try {
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
            return { success: false, error: 'User not logged in' };
        }
        
        const response = await fetch(
            `${API_BASE_URL}/get-daily-task?user_id=${userId}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update user stats after making a choice
 * @param {number} moneyChange - Money gained/lost
 * @param {number} stressChange - Stress gained/lost
 * @param {number} growthChange - Growth/XP gained
 */
async function updateUserStats(moneyChange, stressChange, growthChange) {
    try {
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
            return { success: false, error: 'User not logged in' };
        }
        
        const response = await fetch(`${API_BASE_URL}/update-stats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: parseInt(userId),
                money_change: moneyChange,
                stress_change: stressChange,
                growth_change: growthChange
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update localStorage with new stats
            localStorage.setItem('money', data.new_stats.money);
            localStorage.setItem('stress', data.new_stats.stress);
            localStorage.setItem('growth', data.new_stats.growth);
            localStorage.setItem('currentDay', data.new_stats.current_day);
        }
        
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============ USER PROFILE ============

/**
 * Get full user profile
 */
async function getUserProfile() {
    try {
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
            return { success: false, error: 'User not logged in' };
        }
        
        const response = await fetch(`${API_BASE_URL}/user/${userId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get all available fields of study
 */
async function getAllFields() {
    try {
        const response = await fetch(`${API_BASE_URL}/all-fields`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Check API health
 */
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Log out the user (client-side only)
 */
function logoutUser() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('field');
    localStorage.removeItem('money');
    localStorage.removeItem('stress');
    localStorage.removeItem('growth');
    localStorage.removeItem('currentDay');
    // User logged out
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return !!localStorage.getItem('userId');
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
    return localStorage.getItem('userId');
}

/**
 * Get current user stats from localStorage
 */
function getCurrentStats() {
    return {
        money: parseInt(localStorage.getItem('money')) || 0,
        stress: parseInt(localStorage.getItem('stress')) || 0,
        growth: parseInt(localStorage.getItem('growth')) || 0,
        currentDay: parseInt(localStorage.getItem('currentDay')) || 1
    };
}

// ============ EXAMPLE USAGE ============
/*

// 1. Sign up
const signupResult = await signupUser(
    'John Doe',
    'john@example.com',
    'password123',
    'Medicine'
);

// 2. Login
const loginResult = await loginUser('john@example.com', 'password123');

// 3. Get daily scenario
const scenario = await getDailyScenario();

// 4. User picks an option (e.g., option[0])
const choice = scenario.scenario.options[0];
const impacts = choice.impacts;

// 5. Update stats
const updateResult = await updateUserStats(
    impacts.money,
    impacts.stress,
    impacts.growth
);

// 6. Get current stats from localStorage
const stats = getCurrentStats();

// 7. Log out
logoutUser();

<script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const result = await loginUser(email, password);
        
        if (result.success) {
            alert('Login successful!');
            window.location.href = '/game.html'; // Redirect to game
        } else {
            alert('Login failed: ' + result.error);
        }
    });
</script>

*/
