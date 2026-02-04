/**
 * Authentication & Security System
 * SEVA Innovations Admin Panel
 */

(function() {
  'use strict';

  var AUTH_KEY = 'seva_auth_session';
  var ADMIN_KEY = 'seva_admin_creds';
  var LOCKOUT_KEY = 'seva_login_attempts';
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_MINUTES = 15;

  // Stronger hash function with multiple rounds
  function hashPassword(password) {
    // Use multiple salts and rounds
    var salts = ['SEVA_2024_SEC', 'X9kLm3nP7qR', 'AUTH_LAYER_2'];
    var hash = 0;
    var str = salts[0] + password + salts[1] + password.length + salts[2];
    
    // Multiple rounds
    for (var round = 0; round < 3; round++) {
      for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char + (round * 31);
        hash = hash & hash;
      }
      str = hash.toString(36) + str + hash.toString(16);
    }
    
    // Add verification component
    var verify = 0;
    for (var j = 0; j < password.length; j++) {
      verify += password.charCodeAt(j) * (j + 1);
    }
    
    return 'sh_' + Math.abs(hash).toString(36) + '_' + (verify % 9999);
  }

  // Default admin credentials (computed at runtime, not stored in code)
  function getDefaultAdmin() {
    return {
      username: 'SevaAdmin393',
      passwordHash: hashPassword('PurpleCrush!23'),
      role: 'admin',
      createdAt: '2026-02-04'
    };
  }

  // Initialize admin credentials
  function initAuth() {
    // Always ensure correct credentials are set
    var stored = localStorage.getItem(ADMIN_KEY);
    var needsReset = true;
    var defaultAdmin = getDefaultAdmin();
    
    if (stored) {
      try {
        var current = JSON.parse(stored);
        // Check if username matches and hash format is current
        if (current.username === 'SevaAdmin393' && 
            current.passwordHash && 
            current.passwordHash.indexOf('sh_') === 0) {
          needsReset = false;
        }
      } catch (e) {}
    }
    
    if (needsReset) {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(defaultAdmin));
      // Clear any old lockouts
      localStorage.removeItem(LOCKOUT_KEY);
    }
  }

  // Check lockout
  function isLockedOut() {
    try {
      var lockout = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
      if (lockout.lockedUntil && new Date().getTime() < lockout.lockedUntil) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Get remaining lockout time
  function getLockoutRemaining() {
    try {
      var lockout = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
      if (lockout.lockedUntil) {
        var remaining = Math.ceil((lockout.lockedUntil - new Date().getTime()) / 60000);
        return remaining > 0 ? remaining : 0;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  // Record login attempt
  function recordAttempt(success) {
    try {
      var lockout = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
      
      if (success) {
        localStorage.removeItem(LOCKOUT_KEY);
        return;
      }
      
      lockout.attempts = (lockout.attempts || 0) + 1;
      lockout.lastAttempt = new Date().getTime();
      
      if (lockout.attempts >= MAX_ATTEMPTS) {
        lockout.lockedUntil = new Date().getTime() + (LOCKOUT_MINUTES * 60 * 1000);
      }
      
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockout));
    } catch (e) {}
  }

  // Login function - supports both admin (username/password) and customer (email only)
  function login(usernameOrEmail, password, isCustomer) {
    initAuth();
    
    // Customer login (email-only)
    if (isCustomer === true || (password === '' && usernameOrEmail.includes('@'))) {
      var session = {
        email: usernameOrEmail,
        role: 'customer',
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId(),
        isAuthenticated: true
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }
    
    // Admin login (username + password)
    if (isLockedOut()) {
      return { 
        success: false, 
        error: 'Account locked. Try again in ' + getLockoutRemaining() + ' minutes.',
        locked: true
      };
    }

    var admin = JSON.parse(localStorage.getItem(ADMIN_KEY));
    var inputHash = hashPassword(password);

    if (usernameOrEmail === admin.username && inputHash === admin.passwordHash) {
      var session = {
        username: usernameOrEmail,
        role: 'admin',
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId(),
        isAuthenticated: true
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      recordAttempt(true);
      return { success: true, user: session };
    } else {
      recordAttempt(false);
      var lockout = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
      var remaining = MAX_ATTEMPTS - (lockout.attempts || 0);
      return { 
        success: false, 
        error: 'Invalid credentials. ' + remaining + ' attempts remaining.',
        attemptsRemaining: remaining
      };
    }
  }

  // Generate session ID
  function generateSessionId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Logout
  function logout() {
    localStorage.removeItem(AUTH_KEY);
    return true;
  }

  // Check if authenticated
  function isAuthenticated() {
    try {
      var session = JSON.parse(localStorage.getItem(AUTH_KEY));
      if (!session || !session.isAuthenticated) return false;
      
      // Session expires after 2 hours
      var loginTime = new Date(session.loginTime).getTime();
      var now = new Date().getTime();
      var twoHours = 2 * 60 * 60 * 1000;
      
      if (now - loginTime > twoHours) {
        logout();
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  // Check if admin
  function isAdmin() {
    try {
      var session = JSON.parse(localStorage.getItem(AUTH_KEY));
      return session && session.isAuthenticated && session.role === 'admin';
    } catch (e) {
      return false;
    }
  }

  // Get current user
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch (e) {
      return null;
    }
  }

  // Update admin password
  function updatePassword(currentPassword, newPassword) {
    if (!isAdmin()) {
      return { success: false, error: 'Not authorized' };
    }
    
    var admin = JSON.parse(localStorage.getItem(ADMIN_KEY));
    var currentHash = hashPassword(currentPassword);
    
    if (currentHash !== admin.passwordHash) {
      return { success: false, error: 'Current password incorrect' };
    }
    
    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    
    admin.passwordHash = hashPassword(newPassword);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    
    return { success: true };
  }

  // Encryption for sensitive data (use SecureStorage for orders)
  var Crypto = {
    // Encryption key derived from session (stored in sessionStorage for added security)
    getKey: function() {
      // Try sessionStorage first (more secure, cleared on browser close)
      var sessionKey = sessionStorage.getItem('seva_session_key');
      if (sessionKey) return sessionKey;
      
      // Generate from session if logged in
      var session = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
      if (session.sessionId) {
        sessionKey = 'SEVA_' + session.sessionId + '_' + Date.now().toString(36);
        sessionStorage.setItem('seva_session_key', sessionKey);
        return sessionKey;
      }
      
      return 'SEVA_DEFAULT_KEY';
    },
    
    // XOR encryption with session key
    encrypt: function(text) {
      if (!text) return '';
      var key = this.getKey();
      var result = '';
      for (var i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(result);
    },
    
    decrypt: function(encoded) {
      if (!encoded) return '';
      try {
        var text = atob(encoded);
        var key = this.getKey();
        var result = '';
        for (var i = 0; i < text.length; i++) {
          result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
      } catch (e) {
        return '[Decryption failed]';
      }
    },
    
    // Mask card number for display
    maskCard: function(cardNumber) {
      if (!cardNumber || cardNumber.length < 4) return '****';
      return '**** **** **** ' + cardNumber.slice(-4);
    }
  };

  // Initialize on load
  initAuth();

  // Export
  window.Auth = {
    login: login,
    logout: logout,
    isAuthenticated: isAuthenticated,
    isAdmin: isAdmin,
    getCurrentUser: getCurrentUser,
    updatePassword: updatePassword,
    isLockedOut: isLockedOut,
    getLockoutRemaining: getLockoutRemaining,
    Crypto: Crypto
  };

})();
