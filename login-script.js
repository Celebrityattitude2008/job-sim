// ============ BACKEND CONFIG ============
const BACKEND_URL = 'https://jobsim.pythonanywhere.com';

// ============ DOM ELEMENTS ============
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toSignupBtn = document.getElementById('to-signup');
const toLoginBtn = document.getElementById('to-login');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const spinner = document.getElementById('loading-spinner');
const statusMessage = document.getElementById('status-message');

// Debug: Log if elements are found
if (!loginForm || !signupForm || !toSignupBtn || !toLoginBtn || !loginBtn || !signupBtn) {
    console.error('Missing required DOM elements:', {
        loginForm: !!loginForm,
        signupForm: !!signupForm,
        toSignupBtn: !!toSignupBtn,
        toLoginBtn: !!toLoginBtn,
        loginBtn: !!loginBtn,
        signupBtn: !!signupBtn
    });
}

// Login field elements
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginEmailError = document.getElementById('login-email-error');
const loginPasswordError = document.getElementById('login-password-error');

// Signup field elements
const signupName = document.getElementById('signup-name');
const signupEmail = document.getElementById('signup-email');
const fieldOfStudy = document.getElementById('field-of-study');
const signupPassword = document.getElementById('signup-password');
const nameError = document.getElementById('name-error');
const signupEmailError = document.getElementById('signup-email-error');
const fieldError = document.getElementById('field-error');
const passwordError = document.getElementById('password-error');

// Character elements
const characterImage = document.getElementById('character-image');
const statusBubble = document.getElementById('status-bubble');

// ============ CHARACTER DATA MAPPING ============
const characterData = {
    'Medicine': {
        image: 'https://humaaans.com/avatars?img=doctor_1',
        status: 'Are you ready for 12-hour shifts?'
    },
    'Engineering': {
        image: 'https://humaaans.com/avatars?img=engineer_1',
        status: 'Let\'s build something incredible together!'
    },
    'Law': {
        image: 'https://humaaans.com/avatars?img=lawyer_1',
        status: 'Justice requires dedication. You got this!'
    },
    'Business': {
        image: 'https://humaaans.com/avatars?img=business_1',
        status: 'Ready to disrupt the market?'
    },
    'Computer Science': {
        image: 'https://humaaans.com/avatars?img=developer_1',
        status: 'Code the future, one line at a time.'
    },
    'Mass Communication': {
        image: 'https://humaaans.com/avatars?img=media_1',
        status: 'Your story matters. Tell it well.'
    },
    'Nursing': {
        image: 'https://humaaans.com/avatars?img=nurse_1',
        status: 'Compassion + Skill = Great nursing.'
    },
    'Agriculture': {
        image: 'https://humaaans.com/avatars?img=farmer_1',
        status: 'Growing food and futures.'
    },
    'Political Science': {
        image: 'https://humaaans.com/avatars?img=politician_1',
        status: 'Lead with wisdom and integrity.'
    },
    'Education': {
        image: 'https://humaaans.com/avatars?img=teacher_1',
        status: 'Shaping minds, changing worlds.'
    }
};

// ============ FLOATING ICONS INITIALIZATION ============
function initializeFloatingIcons() {
    const iconsContainer = document.getElementById('floating-icons-container');
    const icons = [];
    
    icons.forEach((icon, index) => {
        const floatingIcon = document.createElement('div');
        floatingIcon.className = 'floating-icon';
        floatingIcon.textContent = icon;
        
        // Random position
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;
        floatingIcon.style.left = randomX + '%';
        floatingIcon.style.top = randomY + '%';
        
        // Random animation duration (15-30 seconds)
        const duration = 15 + Math.random() * 15;
        floatingIcon.style.animationDuration = duration + 's';
        
        // Random delay
        const delay = Math.random() * 10;
        floatingIcon.style.animationDelay = delay + 's';
        
        iconsContainer.appendChild(floatingIcon);
    });
}

// Initialize floating icons on page load
initializeFloatingIcons();


// ============ FORM TOGGLE ============
if (toSignupBtn) {
    toSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginForm && signupForm) {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            clearErrors();
            clearFormFields();
        }
    });
}

if (toLoginBtn) {
    toLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginForm && signupForm) {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            clearErrors();
            clearFormFields();
        }
    });
}

// ============ BACKEND HEALTH CHECK ============
async function checkBackendHealth() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            return false;
        }
        return true;
    } catch (error) {
        showStatus('⚠️ Game Server is sleeping. Try again in a moment.', 'warning');
        return false;
    }
}

// Check backend on page load
window.addEventListener('load', () => {
    initializeFloatingIcons();
    checkBackendHealth();
});

// ============ UTILITY FUNCTIONS ============
function showSpinner() {
    if (spinner) spinner.classList.remove('hidden');
}

function hideSpinner() {
    if (spinner) spinner.classList.add('hidden');
}

function showStatus(message, type) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
        if (statusMessage) statusMessage.classList.add('hidden');
    }, 4000);
}

function clearErrors() {
    if (loginEmailError) loginEmailError.textContent = '';
    if (loginPasswordError) loginPasswordError.textContent = '';
    if (nameError) nameError.textContent = '';
    if (signupEmailError) signupEmailError.textContent = '';
    if (fieldError) fieldError.textContent = '';
    if (passwordError) passwordError.textContent = '';
}

function clearFormFields() {
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (signupName) signupName.value = '';
    if (signupEmail) signupEmail.value = '';
    if (fieldOfStudy) fieldOfStudy.value = '';
    if (signupPassword) signupPassword.value = '';
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function disableButtons(disabled) {
    if (loginBtn) loginBtn.disabled = disabled;
    if (signupBtn) signupBtn.disabled = disabled;
}

// ============ SIGN UP LOGIC ============
async function handleSignup() {
    clearErrors();
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const field = fieldOfStudy.value;
    const password = signupPassword.value;

    // Validation
    let hasError = false;

    if (!name || name.length < 2) {
        nameError.textContent = 'Name must be at least 2 characters';
        hasError = true;
    }

    if (!isValidEmail(email)) {
        signupEmailError.textContent = 'Please enter a valid email';
        hasError = true;
    }

    if (!field) {
        fieldError.textContent = 'Oga/Madam, pick your profession abeg!';
        hasError = true;
    }

    if (!password || password.length < 6) {
        passwordError.textContent = 'Password must be at least 6 characters';
        hasError = true;
    }

    if (hasError) return;

    showSpinner();
    disableButtons(true);
    const originalText = signupBtn ? signupBtn.textContent : 'Sign Up';
    if (signupBtn) signupBtn.textContent = 'Processing...';

    try {
        const response = await fetch(`${BACKEND_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                field: field
            })
        });

        const data = await response.json();

        if (!response.ok) {
            hideSpinner();
            disableButtons(false);
            if (signupBtn) signupBtn.textContent = originalText;

            // Handle specific error messages
            if (data.message && data.message.includes('already')) {
                signupEmailError.textContent = 'This email don register already broda/sista!';
            } else {
                signupEmailError.textContent = data.message || 'Signup failed. Try again!';
            }
            return;
        }

        // Save to localStorage
        localStorage.setItem('username', name);  // Full name for leaderboard sync
        localStorage.setItem('firstName', name.split(' ')[0]);
        localStorage.setItem('fieldOfStudy', field);
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('userEmail', email);

        showStatus('✓ Account created successfully! Redirecting...', 'success');
        hideSpinner();

        // Redirect after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        hideSpinner();
        disableButtons(false);
        if (signupBtn) signupBtn.textContent = originalText;
        showStatus('Omo, something went wrong. Check your network or try again!', 'error');
    }
}

if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSignup();
    });
}

// ============ SIGN IN LOGIC ============
async function handleLogin() {
    clearErrors();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // Validation
    let hasError = false;

    if (!isValidEmail(email)) {
        loginEmailError.textContent = 'Please enter a valid email';
        hasError = true;
    }

    if (!password || password.length < 6) {
        loginPasswordError.textContent = 'Password must be at least 6 characters';
        hasError = true;
    }

    if (hasError) return;

    showSpinner();
    disableButtons(true);
    const originalText = loginBtn ? loginBtn.textContent : 'Sign In';
    if (loginBtn) loginBtn.textContent = 'Processing...';

    try {
        const response = await fetch(`${BACKEND_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            hideSpinner();
            disableButtons(false);
            if (loginBtn) loginBtn.textContent = originalText;

            if (data.message && data.message.includes('not found')) {
                loginEmailError.textContent = 'No account found with this email';
            } else if (data.message && data.message.includes('password')) {
                loginPasswordError.textContent = 'Incorrect password';
            } else {
                loginEmailError.textContent = data.message || 'Login failed. Try again!';
            }
            return;
        }

        // Save to localStorage
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('username', data.username);  // Full username for leaderboard sync
        localStorage.setItem('userEmail', email);
        localStorage.setItem('firstName', data.username ? data.username.split(' ')[0] : 'Player');
        if (data.field) {
            localStorage.setItem('fieldOfStudy', data.field);
        }

        showStatus('✓ Signed in successfully! Redirecting...', 'success');
        hideSpinner();

        // Redirect after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        hideSpinner();
        disableButtons(false);
        if (loginBtn) loginBtn.textContent = originalText;
        showStatus('Omo, something went wrong. Check your network or try again!', 'error');
    }
}

if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogin();
    });
}

// ============ PERSIST LOGIN STATE ============
// Check if user is already logged in (localStorage)
if (localStorage.getItem('userId')) {
    // User is logged in - redirect to game
    window.location.href = 'index.html';
}

// ============ CLEAR ERRORS ON INPUT ============
if (loginEmail) {
    loginEmail.addEventListener('input', () => {
        if (loginEmailError) loginEmailError.textContent = '';
    });
}

if (loginPassword) {
    loginPassword.addEventListener('input', () => {
        if (loginPasswordError) loginPasswordError.textContent = '';
    });
}

if (signupName) {
    signupName.addEventListener('input', () => {
        if (nameError) nameError.textContent = '';
    });
}

if (signupEmail) {
    signupEmail.addEventListener('input', () => {
        if (signupEmailError) signupEmailError.textContent = '';
    });
}

if (fieldOfStudy) {
    fieldOfStudy.addEventListener('change', (e) => {
        if (fieldError) fieldError.textContent = '';
        
        // Update character when field changes
        const selectedField = e.target.value;
        
        if (selectedField && characterData[selectedField]) {
            const data = characterData[selectedField];
            
            // Update character image
            if (characterImage) {
                characterImage.src = data.image;
                characterImage.style.animation = 'none';
                
                // Trigger reflow to restart animation
                void characterImage.offsetWidth;
                characterImage.style.animation = '';
            }
            
            // Update status bubble
            if (statusBubble) {
                statusBubble.innerHTML = `<p>${data.status}</p>`;
                statusBubble.style.animation = 'none';
                
                // Trigger reflow to restart animation
                void statusBubble.offsetWidth;
                statusBubble.style.animation = 'bubblePop 0.5s ease-out';
            }
        }
    });
}

if (signupPassword) {
    signupPassword.addEventListener('input', () => {
        if (passwordError) passwordError.textContent = '';
    });
}

// ============ ENTER KEY SUBMISSION ============
if (loginEmail) {
    loginEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && loginPassword) loginPassword.focus();
    });
}

if (loginPassword) {
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && loginBtn) loginBtn.click();
    });
}

if (signupName) {
    signupName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && signupEmail) signupEmail.focus();
    });
}

if (signupEmail) {
    signupEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && fieldOfStudy) fieldOfStudy.focus();
    });
}

if (fieldOfStudy) {
    fieldOfStudy.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && signupPassword) signupPassword.focus();
    });
}

if (signupPassword) {
    signupPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && signupBtn) signupBtn.click();
    });
}

