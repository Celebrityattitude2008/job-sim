// ============ TUTORIAL PAGE SCRIPT ============
// Minimal script - mostly for interactivity and future enhancements

// ============ AUTHENTICATION CHECK ============
function checkAuthTutorial() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'landing.html';
        return false;
    }
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    return true;
}

window.addEventListener('load', () => {
    checkAuthTutorial();
});

// ============ THEME APPLICATION ============
function applyThemeTutorial(theme) {
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

document.addEventListener('DOMContentLoaded', () => {
    // Load and apply theme
    const theme = localStorage.getItem('theme') || 'dark';
    applyThemeTutorial(theme);
    
    // Setup expand/collapse buttons
    const toggleButtons = document.querySelectorAll('.expand-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parent = btn.closest('.faq-item');
            parent.classList.toggle('open');
            btn.textContent = parent.classList.contains('open') ? '[-]' : '[+]';
        });
    });

    // Smooth scroll behavior for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Track tutorial completion
    trackTutorialView();
});

// ============ TRACK TUTORIAL VIEW ============
function trackTutorialView() {
    const viewedTutorial = localStorage.getItem('tutorialViewed');
    if (!viewedTutorial) {
        localStorage.setItem('tutorialViewed', 'true');
        // Tutorial viewed for first time
    }
}

// ============ HELPER FUNCTIONS ============
function smoothScroll(target) {
    target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}
