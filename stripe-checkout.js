/**
 * Stripe Checkout Integration for TactiLink
 * 
 * SETUP:
 * 1. Set your Stripe publishable key below
 * 2. Deploy the backend (see /backend folder)
 * 3. Set your API endpoint URL below
 * 4. Set MODE to 'live' when ready for production
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION - EDIT THESE VALUES
  // ============================================
  
  var CONFIG = {
    // Mode: 'demo' (no real payments), 'test' (Stripe test mode), 'live' (real payments)
    MODE: 'live',
    
    // Stripe Publishable Keys (get from https://dashboard.stripe.com/apikeys)
    STRIPE_KEY_TEST: 'pk_test_YOUR_TEST_KEY_HERE',
    STRIPE_KEY_LIVE: 'pk_live_51ST1I1K4v7Thx5Z1CdXMAt5MbWLp8opykyc0HCdyXIxgZRkcnGaWjRPmSn61lzYpfOtfHi4vhOzMJynynUfiSqiR007IkCCWM1',
    
    // Backend API endpoint for creating checkout sessions
    // Deploy backend from /backend folder, then put URL here
    API_ENDPOINT: 'https://1x3wclxec7.execute-api.us-west-1.amazonaws.com/prod/api/create-checkout-session',
    
    // Redirect URLs after payment
    SUCCESS_URL: window.location.origin + '/tactilink.html?payment=success',
    CANCEL_URL: window.location.origin + '/tactilink.html?payment=cancel'
  };

  // ============================================
  // STRIPE INITIALIZATION
  // ============================================
  
  var stripe = null;

  function initStripe() {
    if (stripe) return stripe;
    if (CONFIG.MODE === 'demo') return null;
    
    var key = CONFIG.MODE === 'live' ? CONFIG.STRIPE_KEY_LIVE : CONFIG.STRIPE_KEY_TEST;
    
    if (!key || key.indexOf('YOUR_') !== -1) {
      console.error('Stripe key not configured. Edit stripe-checkout.js');
      return null;
    }
    
    if (typeof Stripe === 'undefined') {
      console.error('Stripe.js not loaded');
      return null;
    }
    
    stripe = Stripe(key);
    return stripe;
  }

  // ============================================
  // CHECKOUT FUNCTION
  // ============================================
  
  function checkout(cartItems) {
    if (!cartItems || cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }

    // Log what's being sent (prices come from admin settings)
    console.log('=== Checkout Started ===');
    console.log('Cart items with admin prices:');
    var checkoutTotal = 0;
    cartItems.forEach(function(item) {
      console.log('  ' + item.name + ': $' + (item.price / 100).toFixed(2) + ' x ' + item.quantity);
      checkoutTotal += item.price * item.quantity;
    });
    console.log('Total to charge: $' + (checkoutTotal / 100).toFixed(2));

    // Demo mode - show demo form
    if (CONFIG.MODE === 'demo') {
      showDemoCheckout(cartItems);
      return;
    }

    // Real Stripe checkout
    var stripeInstance = initStripe();
    if (!stripeInstance) {
      alert('Payment system not configured. Please contact support.');
      return;
    }

    // Show loading
    showLoading(true);

    // Prepare line items for backend - prices are in cents from admin
    var lineItems = cartItems.map(function(item) {
      return {
        name: item.name,
        description: item.description,
        amount: item.price, // Price in cents from admin settings
        quantity: item.quantity
      };
    });
    
    console.log('Sending to Stripe API:', JSON.stringify(lineItems, null, 2));

    // Call backend to create checkout session
    fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineItems: lineItems,
        successUrl: CONFIG.SUCCESS_URL,
        cancelUrl: CONFIG.CANCEL_URL
      })
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Failed to create checkout session');
      return response.json();
    })
    .then(function(data) {
      // Redirect to Stripe Checkout
      return stripeInstance.redirectToCheckout({ sessionId: data.id });
    })
    .then(function(result) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    })
    .catch(function(error) {
      showLoading(false);
      console.error('Checkout error:', error);
      alert('Payment failed: ' + error.message + '\n\nPlease try again or contact support.');
    });
  }

  // ============================================
  // DEMO CHECKOUT (for testing without backend)
  // ============================================
  
  function showDemoCheckout(cartItems) {
    var total = 0;
    var itemsHtml = '';
    
    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      var itemTotal = item.price * item.quantity;
      total += itemTotal;
      itemsHtml += '<div class="d-flex justify-content-between mb-2">' +
        '<span>' + item.quantity + 'x ' + item.name + '</span>' +
        '<strong>$' + (itemTotal / 100).toFixed(2) + '</strong>' +
        '</div>';
    }

    var modalHtml = 
      '<div class="modal fade" id="checkoutModal" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header bg-primary text-white">' +
      '<h5 class="modal-title"><i class="fas fa-lock me-2"></i>Secure Checkout</h5>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      
      '<div class="alert alert-info">' +
      '<i class="fas fa-info-circle me-2"></i>Your order will be submitted for processing. ' +
      'You will receive a payment invoice via email.' +
      '</div>' +
      
      '<div class="row">' +
      '<div class="col-md-5 mb-4">' +
      '<h6 class="mb-3">Order Summary</h6>' +
      '<div class="bg-light p-3 rounded">' + itemsHtml +
      '<hr><div class="d-flex justify-content-between"><strong>Total:</strong><strong class="text-primary">$' + (total / 100).toFixed(2) + '</strong></div>' +
      '</div>' +
      '</div>' +
      
      '<div class="col-md-7">' +
      '<form id="demo-checkout-form">' +
      '<h6 class="mb-3">Contact Information</h6>' +
      '<div class="row g-3 mb-4">' +
      '<div class="col-12"><input type="text" class="form-control" id="demo-name" placeholder="Full Name" required></div>' +
      '<div class="col-md-6"><input type="email" class="form-control" id="demo-email" placeholder="Email" required></div>' +
      '<div class="col-md-6"><input type="tel" class="form-control" id="demo-phone" placeholder="Phone"></div>' +
      '</div>' +
      
      '<h6 class="mb-3">Shipping Address</h6>' +
      '<div class="row g-3 mb-4">' +
      '<div class="col-12"><input type="text" class="form-control" id="demo-address" placeholder="Street Address" required></div>' +
      '<div class="col-md-6"><input type="text" class="form-control" id="demo-city" placeholder="City" required></div>' +
      '<div class="col-md-3"><select class="form-select" id="demo-state" required>' +
      '<option value="" selected>Select State</option>' +
      '<option value="AL">AL - Alabama</option>' +
      '<option value="AK">AK - Alaska</option>' +
      '<option value="AZ">AZ - Arizona</option>' +
      '<option value="AR">AR - Arkansas</option>' +
      '<option value="CA">CA - California</option>' +
      '<option value="CO">CO - Colorado</option>' +
      '<option value="CT">CT - Connecticut</option>' +
      '<option value="DE">DE - Delaware</option>' +
      '<option value="FL">FL - Florida</option>' +
      '<option value="GA">GA - Georgia</option>' +
      '<option value="HI">HI - Hawaii</option>' +
      '<option value="ID">ID - Idaho</option>' +
      '<option value="IL">IL - Illinois</option>' +
      '<option value="IN">IN - Indiana</option>' +
      '<option value="IA">IA - Iowa</option>' +
      '<option value="KS">KS - Kansas</option>' +
      '<option value="KY">KY - Kentucky</option>' +
      '<option value="LA">LA - Louisiana</option>' +
      '<option value="ME">ME - Maine</option>' +
      '<option value="MD">MD - Maryland</option>' +
      '<option value="MA">MA - Massachusetts</option>' +
      '<option value="MI">MI - Michigan</option>' +
      '<option value="MN">MN - Minnesota</option>' +
      '<option value="MS">MS - Mississippi</option>' +
      '<option value="MO">MO - Missouri</option>' +
      '<option value="MT">MT - Montana</option>' +
      '<option value="NE">NE - Nebraska</option>' +
      '<option value="NV">NV - Nevada</option>' +
      '<option value="NH">NH - New Hampshire</option>' +
      '<option value="NJ">NJ - New Jersey</option>' +
      '<option value="NM">NM - New Mexico</option>' +
      '<option value="NY">NY - New York</option>' +
      '<option value="NC">NC - North Carolina</option>' +
      '<option value="ND">ND - North Dakota</option>' +
      '<option value="OH">OH - Ohio</option>' +
      '<option value="OK">OK - Oklahoma</option>' +
      '<option value="OR">OR - Oregon</option>' +
      '<option value="PA">PA - Pennsylvania</option>' +
      '<option value="RI">RI - Rhode Island</option>' +
      '<option value="SC">SC - South Carolina</option>' +
      '<option value="SD">SD - South Dakota</option>' +
      '<option value="TN">TN - Tennessee</option>' +
      '<option value="TX">TX - Texas</option>' +
      '<option value="UT">UT - Utah</option>' +
      '<option value="VT">VT - Vermont</option>' +
      '<option value="VA">VA - Virginia</option>' +
      '<option value="WA">WA - Washington</option>' +
      '<option value="WV">WV - West Virginia</option>' +
      '<option value="WI">WI - Wisconsin</option>' +
      '<option value="WY">WY - Wyoming</option>' +
      '</select></div>' +
      '<div class="col-md-3"><input type="text" class="form-control" id="demo-zip" placeholder="ZIP" required></div>' +
      '</div>' +
      
      '<h6 class="mb-3"><i class="fas fa-lock me-2"></i>Payment Information</h6>' +
      '<div class="row g-3">' +
      '<div class="col-12"><input type="text" class="form-control" id="demo-card" placeholder="Card Number" maxlength="19" required autocomplete="off"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control" id="demo-expiry" placeholder="MM/YY" maxlength="5" required autocomplete="off"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control" id="demo-cvv" placeholder="CVV" maxlength="4" required autocomplete="off"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control" id="demo-cardholder" placeholder="Name on Card" required></div>' +
      '</div>' +
      '<p class="small text-muted mt-2"><i class="fas fa-shield-alt me-1"></i>Your payment information is encrypted and secure.</p>' +
      
      '</form>' +
      '</div>' +
      '</div>' +
      
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-lg" id="demo-pay-btn">' +
      '<i class="fas fa-paper-plane me-2"></i>Submit Order - $' + (total / 100).toFixed(2) +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    // Remove existing modal
    var existing = document.getElementById('checkoutModal');
    if (existing) existing.remove();

    // Add modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    var modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
    modal.show();

    // Handle payment
    document.getElementById('demo-pay-btn').onclick = function() {
      var form = document.getElementById('demo-checkout-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var btn = this;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting Order...';

      // Gather order info with payment details
      var cardNumber = document.getElementById('demo-card').value.replace(/\s/g, '');
      var orderInfo = {
        name: document.getElementById('demo-name').value,
        email: document.getElementById('demo-email').value,
        phone: document.getElementById('demo-phone').value,
        address: document.getElementById('demo-address').value,
        city: document.getElementById('demo-city').value,
        state: document.getElementById('demo-state').value,
        zip: document.getElementById('demo-zip').value,
        total: total,
        items: cartItems,
        // Payment info - will be encrypted before storage
        payment: {
          cardNumber: cardNumber,
          expiry: document.getElementById('demo-expiry').value,
          cvv: document.getElementById('demo-cvv').value,
          cardHolder: document.getElementById('demo-cardholder').value,
          lastFour: cardNumber.slice(-4)
        }
      };

      setTimeout(function() {
        modal.hide();
        
        // Save order to localStorage for admin panel
        saveOrder(orderInfo);
        
        // Clear cart
        if (typeof Cart !== 'undefined') Cart.clear();

        // Show success
        showPaymentSuccess(orderInfo);
      }, 1500);
    };
  }

  // Save order using secure storage system
  function saveOrder(orderInfo) {
    try {
      // Use SecureStorage if available (recommended)
      if (typeof SecureStorage !== 'undefined') {
        var orderId = SecureStorage.storeOrder({
          orderNumber: 'ORD-' + Date.now().toString(36).toUpperCase(),
          date: new Date().toLocaleDateString(),
          dateTime: new Date().toLocaleString(),
          status: 'pending_payment',
          customer: {
            name: orderInfo.name,
            email: orderInfo.email,
            phone: orderInfo.phone
          },
          deliveryAddress: {
            street: orderInfo.address,
            city: orderInfo.city,
            state: orderInfo.state,
            zip: orderInfo.zip,
            country: 'USA'
          },
          items: orderInfo.items.map(function(item) {
            return {
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              priceFormatted: '$' + (item.price / 100).toFixed(2),
              quantity: item.quantity,
              subtotal: item.price * item.quantity,
              subtotalFormatted: '$' + ((item.price * item.quantity) / 100).toFixed(2)
            };
          }),
          total: orderInfo.total,
          totalFormatted: '$' + (orderInfo.total / 100).toFixed(2),
          paymentStatus: 'awaiting_processing',
          payment: orderInfo.payment, // Will be encrypted by SecureStorage
          createdAt: new Date().toISOString()
        });
        
        console.log('Order saved securely:', orderId);
        return;
      }
      
      // Fallback - should not reach here if secure-storage.js is loaded
      console.warn('SecureStorage not available - order not saved');
      
    } catch (e) {
      console.error('Failed to save order:', e);
    }
  }

  // ============================================
  // SUCCESS/CANCEL HANDLING
  // ============================================
  
  function showPaymentSuccess(orderInfo) {
    var html = 
      '<div class="alert alert-success shadow-lg position-fixed" style="top:20px;left:50%;transform:translateX(-50%);z-index:9999;max-width:500px;width:90%;">' +
      '<h4><i class="fas fa-check-circle me-2"></i>Order Submitted!</h4>' +
      '<p class="mb-1"><strong>Thank you for your order</strong></p>' +
      '<p class="mb-1">Name: ' + (orderInfo.name || 'N/A') + '</p>' +
      '<p class="mb-1">Email: ' + (orderInfo.email || 'N/A') + '</p>' +
      '<p class="mb-3">Total: $' + (orderInfo.total / 100).toFixed(2) + '</p>' +
      '<p class="small text-muted mb-0"><i class="fas fa-envelope me-1"></i>You will receive a payment invoice via email shortly.</p>' +
      '<button class="btn-close position-absolute top-0 end-0 m-2" onclick="this.parentElement.remove()"></button>' +
      '</div>';

    document.body.insertAdjacentHTML('afterbegin', html);

    setTimeout(function() {
      var alert = document.querySelector('.alert-success');
      if (alert) alert.remove();
    }, 10000);
  }

  function handleUrlParams() {
    var params = new URLSearchParams(window.location.search);
    
    if (params.get('payment') === 'success') {
      // Clear cart on successful payment
      if (typeof Cart !== 'undefined') Cart.clear();
      
      var html = 
        '<div class="alert alert-success shadow-lg position-fixed" style="top:20px;left:50%;transform:translateX(-50%);z-index:9999;max-width:500px;width:90%;">' +
        '<h4><i class="fas fa-check-circle me-2"></i>Payment Successful!</h4>' +
        '<p>Thank you for your purchase! You will receive a confirmation email shortly.</p>' +
        '<button class="btn-close position-absolute top-0 end-0 m-2" onclick="this.parentElement.remove()"></button>' +
        '</div>';
      document.body.insertAdjacentHTML('afterbegin', html);
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (params.get('payment') === 'cancel') {
      var cancelHtml = 
        '<div class="alert alert-warning shadow-lg position-fixed" style="top:20px;left:50%;transform:translateX(-50%);z-index:9999;max-width:500px;width:90%;">' +
        '<h4><i class="fas fa-info-circle me-2"></i>Payment Cancelled</h4>' +
        '<p>Your payment was cancelled. Your cart items are still saved.</p>' +
        '<button class="btn-close position-absolute top-0 end-0 m-2" onclick="this.parentElement.remove()"></button>' +
        '</div>';
      document.body.insertAdjacentHTML('afterbegin', cancelHtml);
      
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // ============================================
  // LOADING INDICATOR
  // ============================================
  
  function showLoading(show) {
    var existing = document.getElementById('checkout-loading');
    if (existing) existing.remove();
    
    if (show) {
      var html = 
        '<div id="checkout-loading" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background:rgba(0,0,0,0.5);z-index:9999;">' +
        '<div class="bg-white p-4 rounded shadow text-center">' +
        '<div class="spinner-border text-primary mb-3"></div>' +
        '<p class="mb-0">Redirecting to secure checkout...</p>' +
        '</div>' +
        '</div>';
      document.body.insertAdjacentHTML('beforeend', html);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  function init() {
    handleUrlParams();
    console.log('Stripe Checkout initialized (Mode: ' + CONFIG.MODE + ')');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API
  window.StripeCheckout = {
    checkout: checkout,
    config: CONFIG
  };

})();
