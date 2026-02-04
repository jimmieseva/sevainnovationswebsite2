// SEVA Innovations - TactiLink Payment Configuration
// This file controls Stripe integration settings across the application
// 
// SETUP INSTRUCTIONS:
// 1. Get your Stripe API keys from https://dashboard.stripe.com/apikeys
// 2. Replace the placeholder values below with your actual keys
// 3. Set up your backend endpoint (see STRIPE-BACKEND-SETUP.md)
// 4. Set PAYMENT_MODE to 'live' when ready for production

console.log('=== config.js loading ===');

var SevaConfig = {
  // ===========================================
  // PAYMENT MODE CONFIGURATION
  // ===========================================
  // Options: 'demo' | 'test' | 'live'
  // - 'demo': Uses sandbox mode, no real payments (for UI testing)
  // - 'test': Uses Stripe test mode (for integration testing)
  // - 'live': Uses Stripe live mode (for production)
  PAYMENT_MODE: 'demo',

  // ===========================================
  // STRIPE API KEYS
  // ===========================================
  // Get keys from: https://dashboard.stripe.com/apikeys
  // 
  // TEST MODE KEYS (start with pk_test_ and sk_test_)
  // - Safe for development and testing
  // - Use test card numbers (e.g., 4242 4242 4242 4242)
  //
  // LIVE MODE KEYS (start with pk_live_ and sk_live_)
  // - Process real payments with real money
  // - Only use after thorough testing
  
  STRIPE_KEYS: {
    // Publishable keys (safe to expose in frontend)
    test: 'pk_test_YOUR_PUBLISHABLE_KEY_HERE',
    live: 'pk_live_YOUR_PUBLISHABLE_KEY_HERE'
  },

  // ===========================================
  // BACKEND API CONFIGURATION
  // ===========================================
  // The endpoint that creates Stripe Checkout Sessions
  // Options for hosting:
  // - AWS Lambda + API Gateway (recommended for static sites)
  // - Vercel Serverless Functions
  // - Node.js/Express server
  // - Any backend that can call Stripe API
  
  API_ENDPOINTS: {
    // Development/Test endpoint
    test: '/api/create-checkout-session',
    
    // Production endpoint (replace with your actual API Gateway URL)
    // Example: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/create-checkout-session'
    live: '/api/create-checkout-session'
  },

  // ===========================================
  // SUCCESS/CANCEL URLS
  // ===========================================
  // Where to redirect after payment
  
  REDIRECT_URLS: {
    success: '/tactilink.html?payment=success',
    cancel: '/tactilink.html?payment=canceled'
  },

  // ===========================================
  // PRODUCT CATALOG
  // ===========================================
  // Single source of truth for all products
  // Prices are in cents (e.g., $150.00 = 15000)
  
  PRODUCTS: {
    price_cable_usbc: {
      id: 'price_cable_usbc',
      stripePriceId: null, // Set if using Stripe Price IDs
      name: 'TactiLink Cable - USB-C',
      description: 'Professional-grade TactiLink cable with USB-C connector. 6ft length, shielded, military-grade connectors.',
      price: 15000, // $150.00 in cents
      image: 'ImageDump/Tactilink.jpg',
      sku: 'TL-CBL-USBC',
      connectorType: 'USB-C',
      currency: 'usd'
    },
    price_cable_usba: {
      id: 'price_cable_usba',
      stripePriceId: null,
      name: 'TactiLink Cable - USB-A',
      description: 'Professional-grade TactiLink cable with USB-A connector. 6ft length, shielded, military-grade connectors.',
      price: 15000, // $150.00 in cents
      image: 'ImageDump/Tactilink.jpg',
      sku: 'TL-CBL-USBA',
      connectorType: 'USB-A',
      currency: 'usd'
    },
    price_kit: {
      id: 'price_kit',
      stripePriceId: null,
      name: 'TactiLink Professional Kit',
      description: 'Complete professional solution including RS-232C cable, high-end Tablet PC, adapters, and comprehensive installation guide.',
      price: 350000, // $3,500.00 in cents
      image: 'ImageDump/tablet-latitude-12-7230-black-gallery-4.avif',
      sku: 'TL-KIT-PRO',
      currency: 'usd'
    }
  },

  // ===========================================
  // BUSINESS INFORMATION
  // ===========================================
  
  BUSINESS: {
    name: 'SEVA Innovations',
    email: 'connect@seva-innovations.com',
    phone: '737-292-8071',
    supportEmail: 'support@seva-innovations.com'
  },

  // ===========================================
  // HELPER METHODS
  // ===========================================
  
  // Check if demo mode is active
  isDemoMode() {
    return this.PAYMENT_MODE === 'demo';
  },

  // Check if test mode is active
  isTestMode() {
    return this.PAYMENT_MODE === 'test';
  },

  // Check if live mode is active
  isLiveMode() {
    return this.PAYMENT_MODE === 'live';
  },

  // Get the appropriate Stripe publishable key
  getStripePublishableKey() {
    if (this.isDemoMode()) {
      return null; // No Stripe in demo mode
    }
    return this.isLiveMode() ? this.STRIPE_KEYS.live : this.STRIPE_KEYS.test;
  },

  // Get the appropriate API endpoint
  getApiEndpoint() {
    return this.isLiveMode() ? this.API_ENDPOINTS.live : this.API_ENDPOINTS.test;
  },

  // Get product by ID
  getProduct(productId) {
    return this.PRODUCTS[productId] || null;
  },

  // Get all products
  getAllProducts() {
    return this.PRODUCTS;
  },

  // Format price for display
  formatPrice(cents) {
    return '$' + (cents / 100).toFixed(2);
  },

  // Get success URL with origin
  getSuccessUrl() {
    return window.location.origin + this.REDIRECT_URLS.success;
  },

  // Get cancel URL with origin
  getCancelUrl() {
    return window.location.origin + this.REDIRECT_URLS.cancel;
  },

  // Validate configuration
  validateConfig() {
    const issues = [];
    
    if (this.isTestMode() || this.isLiveMode()) {
      const key = this.getStripePublishableKey();
      if (!key || key.includes('YOUR_')) {
        issues.push('Stripe publishable key not configured');
      }
      
      const endpoint = this.getApiEndpoint();
      if (!endpoint || endpoint === '/api/create-checkout-session') {
        issues.push('API endpoint may not be configured for production');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues: issues
    };
  }
};

// Freeze config to prevent accidental modification
Object.freeze(SevaConfig.STRIPE_KEYS);
Object.freeze(SevaConfig.API_ENDPOINTS);
Object.freeze(SevaConfig.REDIRECT_URLS);
Object.freeze(SevaConfig.BUSINESS);

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SevaConfig = SevaConfig;
}

// Log configuration status on load (only in non-production)
if (typeof console !== 'undefined' && SevaConfig.PAYMENT_MODE !== 'live') {
  console.log('=== SEVA Payment Configuration ===');
  console.log('Payment Mode:', SevaConfig.PAYMENT_MODE);
  console.log('Demo Mode:', SevaConfig.isDemoMode());
  console.log('=== config.js loaded ===');
}
