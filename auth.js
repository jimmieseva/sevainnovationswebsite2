// Authentication System
// Simple authentication using localStorage (for demo purposes)
// In production, this should be replaced with proper backend authentication

const AUTH_STORAGE_KEY = 'seva_auth';
const ADMIN_CREDENTIALS_KEY = 'seva_admin_credentials';

// Default admin credentials (should be changed in production)
const DEFAULT_ADMIN_EMAIL = 'admin@seva-innovations.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123'; // Change this!

// Initialize auth storage
function initAuthStorage() {
  // Initialize admin credentials if not set
  if (!localStorage.getItem(ADMIN_CREDENTIALS_KEY)) {
    localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify({
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      // In production, password should be hashed
      role: 'admin'
    }));
  }
}

// Login function
function login(email, password, isAdmin = false) {
  initAuthStorage();
  
  if (isAdmin) {
    // Admin login
    const adminCreds = JSON.parse(localStorage.getItem(ADMIN_CREDENTIALS_KEY));
    if (email === adminCreds.email && password === adminCreds.password) {
      const session = {
        email: email,
        role: 'admin',
        loginTime: new Date().toISOString(),
        isAuthenticated: true
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return { success: true, user: session };
    } else {
      return { success: false, error: 'Invalid admin credentials' };
    }
  } else {
    // Customer login - for demo, we'll use email as identifier
    // In production, you'd verify against a database
    const session = {
      email: email,
      role: 'customer',
      loginTime: new Date().toISOString(),
      isAuthenticated: true
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true, user: session };
  }
}

// Logout function
function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  return true;
}

// Check if user is authenticated
function isAuthenticated() {
  const authData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!authData) return false;
  
  try {
    const session = JSON.parse(authData);
    return session.isAuthenticated === true;
  } catch (e) {
    return false;
  }
}

// Get current user
function getCurrentUser() {
  const authData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!authData) return null;
  
  try {
    return JSON.parse(authData);
  } catch (e) {
    return null;
  }
}

// Check if user is admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Require authentication (redirect if not authenticated)
function requireAuth(redirectUrl = 'customer-login.html') {
  if (!isAuthenticated()) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

// Require admin (redirect if not admin)
function requireAdmin(redirectUrl = 'customer-login.html') {
  if (!isAdmin()) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

// Update admin password
function updateAdminPassword(newPassword) {
  if (!isAdmin()) {
    return { success: false, error: 'Unauthorized' };
  }
  
  const adminCreds = JSON.parse(localStorage.getItem(ADMIN_CREDENTIALS_KEY));
  adminCreds.password = newPassword;
  localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(adminCreds));
  return { success: true };
}

// Export functions
if (typeof window !== 'undefined') {
  window.Auth = {
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    isAdmin,
    requireAuth,
    requireAdmin,
    updateAdminPassword,
    initAuthStorage
  };
}

// Initialize on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    initAuthStorage();
  });
}
