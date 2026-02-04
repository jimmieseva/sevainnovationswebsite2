// Stripe Payment Handler for TactiLink Cables
// Uses SevaConfig for configuration - see config.js
//
// SETUP INSTRUCTIONS:
// 1. Configure config.js with your Stripe keys and API endpoint
// 2. Set up your backend endpoint (see STRIPE-BACKEND-SETUP.md)
// 3. Change PAYMENT_MODE in config.js from 'demo' to 'test' for testing
// 4. Change PAYMENT_MODE to 'live' when ready for production

// Initialize Stripe instance (lazy initialization)
let stripe = null;

/**
 * Initialize Stripe.js with the appropriate publishable key
 */
function initializeStripe() {
  if (stripe) return stripe;
  
  // Check if config is available
  if (typeof SevaConfig === 'undefined') {
    console.error('SevaConfig not loaded. Make sure config.js is included before stripe-payment.js');
    return null;
  }
  
  // Don't initialize Stripe in demo mode
  if (SevaConfig.isDemoMode()) {
    console.log('Stripe: Running in demo mode - Stripe.js not initialized');
    return null;
  }
  
  const publishableKey = SevaConfig.getStripePublishableKey();
  
  if (!publishableKey || publishableKey.includes('YOUR_')) {
    console.error('Stripe publishable key not configured. Update config.js with your actual key.');
    return null;
  }
  
  // Check if Stripe.js is loaded
  if (typeof Stripe === 'undefined') {
    console.error('Stripe.js not loaded. Include <script src="https://js.stripe.com/v3/"></script>');
    return null;
  }
  
  try {
    stripe = Stripe(publishableKey);
    console.log('Stripe initialized successfully');
    return stripe;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  }
}

/**
 * Get products from config (backward compatibility)
 */
function getProducts() {
  if (typeof SevaConfig !== 'undefined') {
    return SevaConfig.getAllProducts();
  }
  // Fallback products if config not loaded
  return {
    price_cable_usbc: {
      id: 'price_cable_usbc',
      name: 'TactiLink Cable - USB-C',
      description: 'Professional-grade TactiLink cable with USB-C connector.',
      price: 15000,
      image: 'ImageDump/Tactilink.jpg'
    },
    price_cable_usba: {
      id: 'price_cable_usba',
      name: 'TactiLink Cable - USB-A',
      description: 'Professional-grade TactiLink cable with USB-A connector.',
      price: 15000,
      image: 'ImageDump/Tactilink.jpg'
    },
    price_kit: {
      id: 'price_kit',
      name: 'TactiLink Professional Kit',
      description: 'Complete professional solution.',
      price: 350000,
      image: 'ImageDump/tablet-latitude-12-7230-black-gallery-4.avif'
    }
  };
}

// Expose products for backward compatibility
const products = getProducts();

/**
 * Main checkout function - handles both single items and full cart
 * @param {string|Array} productIdOrCart - Product ID string or array of cart items
 * @param {string} productName - Product name (for single item checkout)
 * @param {number} amount - Amount in cents (for single item checkout)
 */
async function checkout(productIdOrCart, productName, amount) {
  // Check configuration
  if (typeof SevaConfig === 'undefined') {
    console.error('Configuration not loaded');
    showContactFallback(productName || 'TactiLink Product', amount || 0);
    return;
  }
  
  // Demo mode - show demo payment form
  if (SevaConfig.isDemoMode()) {
    // Check if this is a cart checkout or single item
    if (productIdOrCart === 'cart' || Array.isArray(productIdOrCart)) {
      // Cart checkout is handled by shopping-cart.js
      return;
    }
    showDemoPaymentForm(productIdOrCart, productName, amount);
    return;
  }
  
  // Initialize Stripe
  const stripeInstance = initializeStripe();
  if (!stripeInstance) {
    console.error('Stripe not initialized');
    showContactFallback(productName || 'TactiLink Product', amount || 0);
    return;
  }
  
  try {
    // Prepare line items for Stripe
    let lineItems = [];
    
    if (Array.isArray(productIdOrCart)) {
      // Cart checkout with multiple items
      lineItems = productIdOrCart.map(item => ({
        productId: item.id,
        productName: item.name,
        productDescription: item.description || '',
        amount: item.price,
        quantity: item.quantity,
        currency: item.currency || 'usd'
      }));
    } else {
      // Single item checkout
      const productsObj = getProducts();
      const product = productsObj[productIdOrCart] || {
        name: productName,
        description: 'TactiLink Product',
        price: amount
      };
      
      lineItems = [{
        productId: productIdOrCart,
        productName: product.name || productName,
        productDescription: product.description || '',
        amount: product.price || amount,
        quantity: 1,
        currency: product.currency || 'usd'
      }];
    }
    
    // Calculate total for display
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const totalItems = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Show loading state on button if available
    const button = event?.target;
    let originalText = '';
    if (button) {
      originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
      button.disabled = true;
    }
    
    // Create checkout session via backend
    const apiEndpoint = SevaConfig.getApiEndpoint();
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lineItems: lineItems,
        successUrl: SevaConfig.getSuccessUrl(),
        cancelUrl: SevaConfig.getCancelUrl(),
        customerEmail: null, // Can be set if user is logged in
        metadata: {
          source: 'tactilink-website',
          itemCount: totalItems
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const session = await response.json();
    
    // Redirect to Stripe Checkout
    const result = await stripeInstance.redirectToCheckout({
      sessionId: session.id
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Reset button
    if (event?.target) {
      event.target.innerHTML = originalText || 'Purchase Now';
      event.target.disabled = false;
    }
    
    // Show error or fallback
    if (error.message.includes('network') || error.message.includes('fetch')) {
      showContactFallback(productName || 'TactiLink Product', amount || 0);
    } else {
      showError(error.message);
    }
  }
}

/**
 * Checkout with cart items - called from shopping-cart.js
 * @param {Array} cartItems - Array of cart items
 */
async function checkoutWithCart(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    console.error('No items in cart');
    return;
  }
  
  // Check if demo mode
  if (typeof SevaConfig !== 'undefined' && SevaConfig.isDemoMode()) {
    // Demo mode - this is handled by shopping-cart.js
    return;
  }
  
  // Real Stripe checkout
  await checkout(cartItems, null, null);
}

/**
 * Demo Payment Form - Sandbox environment for testing
 */
function showDemoPaymentForm(productId, productName, amount) {
  const productsObj = getProducts();
  const product = productsObj[productId] || {
    name: productName || 'TactiLink Product',
    price: amount || 0,
    description: 'TactiLink Cable Product'
  };

  // Create demo payment modal
  const modalHTML = `
    <div class="modal fade" id="demoPaymentModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-shopping-cart me-2"></i>Demo Purchase - ${product.name}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info mb-3">
              <i class="fas fa-info-circle me-2"></i>
              <strong>Demo Mode:</strong> This is a sandbox environment. No actual payment will be processed.
              <br><small class="mt-1 d-block">To enable real payments, configure config.js with your Stripe keys.</small>
            </div>
            
            <div class="mb-3">
              <h6>Product Details</h6>
              <p class="mb-1"><strong>Product:</strong> ${product.name}</p>
              <p class="mb-1"><strong>Description:</strong> ${product.description}</p>
              <p class="mb-0"><strong>Price:</strong> <span class="h5 text-primary">$${((product.price || amount) / 100).toFixed(2)}</span></p>
            </div>
            
            <hr>
            
            <form id="demo-payment-form">
              <h6 class="mb-3"><i class="fas fa-user me-2"></i>Contact Information</h6>
              
              <div class="mb-3">
                <label for="demo-name" class="form-label">Full Name</label>
                <input type="text" class="form-control" id="demo-name" placeholder="John Doe" required>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="demo-email" class="form-label">Email Address</label>
                  <input type="email" class="form-control" id="demo-email" placeholder="john.doe@example.com" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="demo-phone" class="form-label">Phone Number</label>
                  <input type="tel" class="form-control" id="demo-phone" placeholder="(555) 123-4567" required>
                </div>
              </div>
              
              <hr class="my-4">
              
              <h6 class="mb-3"><i class="fas fa-truck me-2"></i>Delivery Address</h6>
              
              <div class="mb-3">
                <label for="demo-delivery-address" class="form-label">Street Address</label>
                <input type="text" class="form-control" id="demo-delivery-address" placeholder="123 Main St" required>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="demo-delivery-city" class="form-label">City</label>
                  <input type="text" class="form-control" id="demo-delivery-city" placeholder="Austin" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="demo-delivery-state" class="form-label">State</label>
                  <input type="text" class="form-control" id="demo-delivery-state" placeholder="TX" required>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="demo-delivery-zip" class="form-label">ZIP Code</label>
                  <input type="text" class="form-control" id="demo-delivery-zip" placeholder="78701" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="demo-delivery-country" class="form-label">Country</label>
                  <input type="text" class="form-control" id="demo-delivery-country" placeholder="United States" value="United States" required>
                </div>
              </div>
              
              <hr class="my-4">
              
              <h6 class="mb-3"><i class="fas fa-credit-card me-2"></i>Payment Information</h6>
              
              <div class="mb-3">
                <label for="demo-card" class="form-label">Card Number</label>
                <input type="text" class="form-control" id="demo-card" placeholder="4242 4242 4242 4242" maxlength="19" required>
                <small class="text-muted">Use any test card number (e.g., 4242 4242 4242 4242)</small>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="demo-expiry" class="form-label">Expiry Date</label>
                  <input type="text" class="form-control" id="demo-expiry" placeholder="12/34" maxlength="5" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="demo-cvc" class="form-label">CVC</label>
                  <input type="text" class="form-control" id="demo-cvc" placeholder="123" maxlength="4" required>
                </div>
              </div>
              
              <div class="mb-3">
                <label for="demo-address" class="form-label">Billing Address</label>
                <input type="text" class="form-control" id="demo-address" placeholder="123 Main St" required>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="demo-city" class="form-label">Billing City</label>
                  <input type="text" class="form-control" id="demo-city" placeholder="Austin" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="demo-zip" class="form-label">Billing ZIP Code</label>
                  <input type="text" class="form-control" id="demo-zip" placeholder="78701" required>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="demo-submit-payment">
              <i class="fas fa-credit-card me-2"></i>Complete Demo Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('demoPaymentModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Format card number input
  const cardInput = document.getElementById('demo-card');
  if (cardInput) {
    cardInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\s/g, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formattedValue;
    });
  }
  
  // Format expiry date input
  const expiryInput = document.getElementById('demo-expiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      e.target.value = value;
    });
  }
  
  // Format phone number input
  const phoneInput = document.getElementById('demo-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 0) {
        if (value.length <= 3) {
          value = '(' + value;
        } else if (value.length <= 6) {
          value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
        } else {
          value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6, 10);
        }
      }
      e.target.value = value;
    });
  }
  
  // Handle form submission
  const submitButton = document.getElementById('demo-submit-payment');
  const form = document.getElementById('demo-payment-form');
  
  if (submitButton && form) {
    submitButton.addEventListener('click', function() {
      // Validate form
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }
      
      // Show processing
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
      
      // Simulate payment processing delay
      setTimeout(() => {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('demoPaymentModal'));
        if (modal) modal.hide();
        
        // Show success message
        showDemoSuccess(product.name, product.price || amount, {
          name: document.getElementById('demo-name').value,
          email: document.getElementById('demo-email').value,
          phone: document.getElementById('demo-phone').value,
          deliveryAddress: {
            street: document.getElementById('demo-delivery-address').value,
            city: document.getElementById('demo-delivery-city').value,
            state: document.getElementById('demo-delivery-state').value,
            zip: document.getElementById('demo-delivery-zip').value,
            country: document.getElementById('demo-delivery-country').value
          }
        });
      }, 1500);
    });
  }
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('demoPaymentModal'));
  modal.show();
  
  // Reset form validation on close
  const modalElement = document.getElementById('demoPaymentModal');
  if (modalElement) {
    modalElement.addEventListener('hidden.bs.modal', function() {
      if (form) form.classList.remove('was-validated');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-credit-card me-2"></i>Complete Demo Purchase';
      }
    });
  }
}

/**
 * Show demo success message
 */
function showDemoSuccess(productName, amount, customerInfo) {
  const deliveryAddressHTML = customerInfo.deliveryAddress ? `
    <p class="mb-2"><strong><i class="fas fa-truck me-1"></i>Delivery Address:</strong><br>
    ${customerInfo.deliveryAddress.street}<br>
    ${customerInfo.deliveryAddress.city}, ${customerInfo.deliveryAddress.state} ${customerInfo.deliveryAddress.zip}<br>
    ${customerInfo.deliveryAddress.country}</p>
  ` : '';
  
  const successHTML = `
    <div class="alert alert-success alert-dismissible fade show shadow-lg" role="alert" style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; max-width: 600px; width: 90%;">
      <div class="d-flex align-items-center">
        <div class="flex-shrink-0">
          <i class="fas fa-check-circle fa-3x text-success"></i>
        </div>
        <div class="flex-grow-1 ms-3">
          <h5 class="alert-heading mb-2">
            <i class="fas fa-check-circle me-2"></i>Purchase Accepted - Demo Mode
          </h5>
          <p class="mb-2"><strong>Product:</strong> ${productName}</p>
          <p class="mb-2"><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
          <p class="mb-2"><strong>Customer:</strong> ${customerInfo.name}</p>
          <p class="mb-2"><strong>Email:</strong> ${customerInfo.email}</p>
          ${customerInfo.phone ? `<p class="mb-2"><strong>Phone:</strong> ${customerInfo.phone}</p>` : ''}
          ${deliveryAddressHTML}
          <hr class="my-2">
          <p class="mb-0 small">
            <i class="fas fa-info-circle me-1"></i>
            This was a demo transaction. No actual payment was processed. 
            <strong>To enable real payments:</strong> Configure your Stripe keys in config.js
          </p>
        </div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  // Remove existing success message
  const existingSuccess = document.querySelector('.alert-success[role="alert"]');
  if (existingSuccess) {
    existingSuccess.remove();
  }
  
  // Add success message
  document.body.insertAdjacentHTML('afterbegin', successHTML);
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    const alert = document.querySelector('.alert-success[role="alert"]');
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 10000);
  
  // Scroll to top to show message
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show error message to user
 */
function showError(message) {
  // Create or update error alert
  let errorDiv = document.getElementById('stripe-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'stripe-error';
    errorDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
    errorDiv.setAttribute('role', 'alert');
    
    const container = document.querySelector('#cables .container');
    const row = document.querySelector('#cables .row');
    if (container && row) {
      container.insertBefore(errorDiv, row);
    } else {
      document.body.insertAdjacentElement('afterbegin', errorDiv);
    }
  }
  
  errorDiv.innerHTML = `
    <strong><i class="fas fa-exclamation-circle me-2"></i>Payment Error:</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 8000);
}

/**
 * Fallback: Show contact form for manual order processing
 */
function showContactFallback(productName, amount) {
  const message = `I would like to purchase: ${productName} ($${(amount / 100).toFixed(2)}). Please contact me to complete the order.`;
  
  // Scroll to contact form
  const contactSection = document.getElementById('contact');
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Pre-fill contact form
  const messageField = document.querySelector('#contact textarea[name="message"]');
  if (messageField) {
    messageField.value = message;
    messageField.focus();
  }
  
  // Get business contact info from config
  const businessEmail = typeof SevaConfig !== 'undefined' ? SevaConfig.BUSINESS.email : 'connect@seva-innovations.com';
  const businessPhone = typeof SevaConfig !== 'undefined' ? SevaConfig.BUSINESS.phone : '737-292-8071';
  
  // Show info alert
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-info alert-dismissible fade show';
  alertDiv.innerHTML = `
    <strong><i class="fas fa-info-circle me-2"></i>Online payment temporarily unavailable.</strong> 
    Please use the contact form below to place your order, or contact us directly at 
    <a href="mailto:${businessEmail}">${businessEmail}</a> or 
    <a href="tel:${businessPhone.replace(/\D/g, '')}">${businessPhone}</a>.
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const contactContainer = document.querySelector('#contact .container');
  const contactHeading = document.querySelector('#contact h2');
  if (contactContainer && contactHeading) {
    contactContainer.insertBefore(alertDiv, contactHeading);
  }
}

/**
 * Handle successful payment redirect
 */
function handlePaymentSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('payment') === 'success' || urlParams.get('success') === 'true') {
    // Clear cart after successful payment
    if (typeof clearCart === 'function') {
      clearCart();
    }
    
    // Show success message
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.innerHTML = `
      <h5><i class="fas fa-check-circle me-2"></i>Payment Successful!</h5>
      <p>Thank you for your purchase. You will receive a confirmation email shortly. Your order will be processed and shipped within 2-3 business days.</p>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('#cables .container');
    const row = document.querySelector('#cables .row');
    if (container && row) {
      container.insertBefore(successDiv, row);
    }
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  if (urlParams.get('payment') === 'canceled' || urlParams.get('canceled') === 'true') {
    // Get business contact info
    const businessEmail = typeof SevaConfig !== 'undefined' ? SevaConfig.BUSINESS.email : 'connect@seva-innovations.com';
    
    // Show cancellation message
    const cancelDiv = document.createElement('div');
    cancelDiv.className = 'alert alert-warning alert-dismissible fade show';
    cancelDiv.innerHTML = `
      <h5><i class="fas fa-info-circle me-2"></i>Payment Canceled</h5>
      <p>Your payment was canceled. If you'd like to complete your purchase, please try again or contact us at <a href="mailto:${businessEmail}">${businessEmail}</a>.</p>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('#cables .container');
    const row = document.querySelector('#cables .row');
    if (container && row) {
      container.insertBefore(cancelDiv, row);
    }
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Check if Stripe is properly configured
 */
function isStripeConfigured() {
  if (typeof SevaConfig === 'undefined') return false;
  if (SevaConfig.isDemoMode()) return false;
  
  const key = SevaConfig.getStripePublishableKey();
  return key && !key.includes('YOUR_');
}

// Expose functions globally
if (typeof window !== 'undefined') {
  window.checkout = checkout;
  window.checkoutWithCart = checkoutWithCart;
  window.showDemoPaymentForm = showDemoPaymentForm;
  window.showDemoSuccess = showDemoSuccess;
  window.showError = showError;
  window.isStripeConfigured = isStripeConfigured;
  window.products = products;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  handlePaymentSuccess();
  
  // Log Stripe status
  if (typeof SevaConfig !== 'undefined') {
    console.log('=== Stripe Payment Status ===');
    console.log('Payment Mode:', SevaConfig.PAYMENT_MODE);
    console.log('Stripe Configured:', isStripeConfigured());
    
    if (!SevaConfig.isDemoMode() && !isStripeConfigured()) {
      console.warn('Stripe keys not configured. Update config.js to enable real payments.');
    }
  }
});
