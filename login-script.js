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
toSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    clearErrors();
    clearFormFields();
});

toLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    clearErrors();
    clearFormFields();
});

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
    spinner.classList.remove('hidden');
}

function hideSpinner() {
    spinner.classList.add('hidden');
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 4000);
}

function clearErrors() {
    loginEmailError.textContent = '';
    loginPasswordError.textContent = '';
    nameError.textContent = '';
    signupEmailError.textContent = '';
    fieldError.textContent = '';
    passwordError.textContent = '';
}

function clearFormFields() {
    loginEmail.value = '';
    loginPassword.value = '';
    signupName.value = '';
    signupEmail.value = '';
    fieldOfStudy.value = '';
    signupPassword.value = '';
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function disableButtons(disabled) {
    loginBtn.disabled = disabled;
    signupBtn.disabled = disabled;
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
    const originalText = signupBtn.textContent;
    signupBtn.textContent = 'Processing...';

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
            signupBtn.textContent = originalText;

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
        signupBtn.textContent = originalText;
        showStatus('Omo, something went wrong. Check your network or try again!', 'error');
    }
}

signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleSignup();
});

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
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Processing...';

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
            loginBtn.textContent = originalText;

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
        loginBtn.textContent = originalText;
        showStatus('Omo, something went wrong. Check your network or try again!', 'error');
    }
}

loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleLogin();
});

// ============ PERSIST LOGIN STATE ============
// Check if user is already logged in (localStorage)
if (localStorage.getItem('userId')) {
    // User is logged in - redirect to game
    window.location.href = 'index.html';
}

// ============ CLEAR ERRORS ON INPUT ============
loginEmail.addEventListener('input', () => {
    loginEmailError.textContent = '';
});

loginPassword.addEventListener('input', () => {
    loginPasswordError.textContent = '';
});

signupName.addEventListener('input', () => {
    nameError.textContent = '';
});

signupEmail.addEventListener('input', () => {
    signupEmailError.textContent = '';
});

fieldOfStudy.addEventListener('change', (e) => {
    fieldError.textContent = '';
    
    // Update character when field changes
    const selectedField = e.target.value;
    
    if (selectedField && characterData[selectedField]) {
        const data = characterData[selectedField];
        
        // Update character image
        characterImage.src = data.image;
        characterImage.style.animation = 'none';
        
        // Trigger reflow to restart animation
        void characterImage.offsetWidth;
        characterImage.style.animation = '';
        
        // Update status bubble
        statusBubble.innerHTML = `<p>${data.status}</p>`;
        statusBubble.style.animation = 'none';
        
        // Trigger reflow to restart animation
        void statusBubble.offsetWidth;
        statusBubble.style.animation = 'bubblePop 0.5s ease-out';
    }
});

signupPassword.addEventListener('input', () => {
    passwordError.textContent = '';
});

// ============ ENTER KEY SUBMISSION ============
loginEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginPassword.focus();
});

loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

signupName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') signupEmail.focus();
});

signupEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fieldOfStudy.focus();
});

fieldOfStudy.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') signupPassword.focus();
});

signupPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') signupBtn.click();
});

