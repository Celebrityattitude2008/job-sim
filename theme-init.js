// ============ UNIVERSAL THEME INITIALIZATION ============
// This script should be included at the top of every HTML page
// to ensure theme is applied before page renders

function initializePageTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    
    // Set data attribute for CSS
    root.setAttribute('data-theme', theme);
    
    // Apply body classes
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
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        }
    }
}

// Initialize theme immediately before any content renders
initializePageTheme();

// Listen for theme changes from other tabs/windows
window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
        initializePageTheme();
    }
});
