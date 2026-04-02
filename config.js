// ============ PRODUCTION CONFIG FILE ============
// This file centralizes all configuration for the frontend application
// All hardcoded URLs and environment-dependent settings should be defined here

// Production-ready configuration
const AppConfig = {
    // Determine backend URL based on environment
    getBackendUrl: function() {
        // Check if running on localhost
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            return 'http://localhost:5000';
        }
        
        // Production URL
        return 'https://jobsim.pythonanywhere.com';
    },
    
    // API endpoints (relative to backend URL)
    endpoints: {
        signup: '/signup',
        login: '/login',
        getDailyTask: '/get-daily-task',
        getScenarios: '/get-scenarios',
        updateStats: '/update-stats',
        getUser: '/user',
        getAllFields: '/all-fields',
        health: '/health',
        leaderboard: '/leaderboard',
        achievements: '/achievements',
        unlockAchievement: '/unlock-achievement',
        settings: '/settings',
        completeGame: '/complete-game',
        // Life Simulator endpoints
        ageUp: '/age-up',
        ageUpApply: '/age-up/apply',
        getRandomEvent: '/get-random-event',
        market: '/market',
        lifestyle: '/lifestyle'
    },
    
    // API request configuration
    fetchDefaults: {
        timeout: 15000,  // 15 seconds
        headers: {
            'Content-Type': 'application/json'
        }
    },
    
    // Debug mode (disable in production)
    debug: window.location.hostname === 'localhost',
    
    // Build complete API URL
    buildUrl: function(endpoint) {
        return this.getBackendUrl() + (this.endpoints[endpoint] || endpoint);
    },
    
    // Build complete API URL with parameters
    buildUrlWithParams: function(endpoint, params = {}) {
        const url = new URL(this.buildUrl(endpoint), window.location.origin);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        return url.toString().replace(window.location.origin, '');
    },
    
    // Log debug messages only in debug mode
    log: function(...args) {
        // Debug logging disabled in production
    },
    
    // Log errors always
    error: function(...args) {
        console.error('[JobSim Error]', ...args);
    },
    
    // Version info
    version: '1.0.0',
    appName: 'JobSim'
};

// Make config global
window.AppConfig = AppConfig;
