/**
 * Shopping Cart System for TactiLink
 * Integrates with admin panel for dynamic pricing
 * Prices flow through to Stripe checkout
 */

(function() {
  'use strict';

  var CART_KEY = 'tactilink_cart';

  // Default product catalog (used if admin content not available)
  var DEFAULT_PRODUCTS = {
    'usbc': {
      id: 'usbc',
      name: 'TactiLink Cable - USB-C',
      description: 'Professional-grade TactiLink cable with USB-C connector. 6ft length, shielded, military-grade connectors.',
      price: 30000, // $300.00 in cents
      image: 'ImageDump/Tactilink.jpg'
    },
    'usba': {
      id: 'usba',
      name: 'TactiLink Cable - USB-A',
      description: 'Professional-grade TactiLink cable with USB-A connector. 6ft length, shielded, military-grade connectors.',
      price: 30000, // $300.00 in cents
      image: 'ImageDump/Tactilink.jpg'
    },
    'kit': {
      id: 'kit',
      name: 'TactiLink Professional Kit',
      description: 'Complete professional solution including RS-232C cable, high-end Tablet PC, adapters, and installation guide.',
      price: 350000, // $3,500.00 in cents
      image: 'ImageDump/tablet-latitude-12-7230-black-gallery-4.avif'
    }
  };

  // Get products with admin pricing
  function getProducts() {
    var products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    
    // Try to load admin-configured content
    if (typeof SiteContent !== 'undefined') {
      try {
        var content = SiteContent.get('tactilink');
        var images = SiteContent.get('images');
        
        if (content) {
          // USB-C Cable
          if (content.cableUsbcName) products.usbc.name = content.cableUsbcName;
          if (content.cableUsbcDesc) products.usbc.description = content.cableUsbcDesc;
          if (content.cableUsbcPrice) {
            // Convert dollars to cents
            var usbcPrice = parseFloat(content.cableUsbcPrice);
            if (!isNaN(usbcPrice) && usbcPrice > 0) {
              products.usbc.price = Math.round(usbcPrice * 100);
            }
          }
          
          // USB-A Cable
          if (content.cableUsbaName) products.usba.name = content.cableUsbaName;
          if (content.cableUsbaDesc) products.usba.description = content.cableUsbaDesc;
          if (content.cableUsbaPrice) {
            var usbaPrice = parseFloat(content.cableUsbaPrice);
            if (!isNaN(usbaPrice) && usbaPrice > 0) {
              products.usba.price = Math.round(usbaPrice * 100);
            }
          }
          
          // Professional Kit
          if (content.kitName) products.kit.name = content.kitName;
          if (content.kitDesc) products.kit.description = content.kitDesc;
          if (content.kitPrice) {
            var kitPrice = parseFloat(content.kitPrice);
            if (!isNaN(kitPrice) && kitPrice > 0) {
              products.kit.price = Math.round(kitPrice * 100);
            }
          }
        }
        
        // Apply images from admin
        if (images) {
          if (images.tactilink) {
            products.usbc.image = images.tactilink;
            products.usba.image = images.tactilink;
          }
          if (images.tactilinkKit) {
            products.kit.image = images.tactilinkKit;
          }
        }
      } catch (e) {
        console.warn('Could not load admin content, using defaults:', e);
      }
    }
    
    return products;
  }

  // Cart state
  var cart = [];

  // Load cart from localStorage
  function loadCart() {
    try {
      var saved = localStorage.getItem(CART_KEY);
      if (saved) {
        cart = JSON.parse(saved);
        if (!Array.isArray(cart)) cart = [];
        
        // Refresh cart prices from current product catalog
        refreshCartPrices();
      }
    } catch (e) {
      cart = [];
    }
    return cart;
  }

  // Refresh cart items with current prices from admin
  function refreshCartPrices() {
    var products = getProducts();
    var updated = false;
    
    for (var i = 0; i < cart.length; i++) {
      var product = products[cart[i].id];
      if (product) {
        // Update price to current admin price
        if (cart[i].price !== product.price) {
          cart[i].price = product.price;
          updated = true;
        }
        // Also update name/description in case they changed
        cart[i].name = product.name;
        cart[i].description = product.description;
        cart[i].image = product.image;
      }
    }
    
    if (updated) {
      saveCart();
    }
  }

  // Save cart to localStorage
  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }

  // Add item to cart
  function addToCart(productId, quantity) {
    quantity = parseInt(quantity) || 1;
    if (quantity < 1) return false;

    var products = getProducts();
    var product = products[productId];
    
    if (!product) {
      console.error('Product not found:', productId);
      return false;
    }

    // Find existing item
    var existingIndex = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === productId) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
      // Update price in case it changed
      cart[existingIndex].price = product.price;
      cart[existingIndex].name = product.name;
      cart[existingIndex].description = product.description;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price, // Price in cents from admin
        image: product.image,
        quantity: quantity
      });
    }

    saveCart();
    updateUI();
    showNotification(product.name, quantity);
    return true;
  }

  // Remove item from cart
  function removeFromCart(productId) {
    cart = cart.filter(function(item) {
      return item.id !== productId;
    });
    saveCart();
    updateUI();
  }

  // Update item quantity
  function updateQuantity(productId, quantity) {
    quantity = parseInt(quantity) || 0;
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    var products = getProducts();
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === productId) {
        cart[i].quantity = quantity;
        // Refresh price from admin
        if (products[productId]) {
          cart[i].price = products[productId].price;
        }
        break;
      }
    }
    saveCart();
    updateUI();
  }

  // Get cart total in cents
  function getTotal() {
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].price * cart[i].quantity;
    }
    return total;
  }

  // Get item count
  function getItemCount() {
    var count = 0;
    for (var i = 0; i < cart.length; i++) {
      count += cart[i].quantity;
    }
    return count;
  }

  // Clear cart
  function clearCart() {
    cart = [];
    saveCart();
    updateUI();
  }

  // Get cart items (with current prices)
  function getItems() {
    // Always return items with refreshed prices
    refreshCartPrices();
    return cart.slice();
  }

  // Format price
  function formatPrice(cents) {
    return '$' + (cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

  // Update UI elements
  function updateUI() {
    var count = getItemCount();
    var total = getTotal();

    // Update badges
    var badges = document.querySelectorAll('.cart-badge, #cart-badge, #cart-badge-header');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = count;
      badges[i].style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Update totals
    var totals = document.querySelectorAll('#cart-total, #cart-grand-total');
    for (var j = 0; j < totals.length; j++) {
      totals[j].textContent = formatPrice(total);
    }

    // Update cart items display
    var itemsContainer = document.getElementById('cart-items');
    var emptyMessage = document.getElementById('cart-empty');
    var checkoutBtn = document.getElementById('cart-checkout-btn');

    if (itemsContainer) {
      if (cart.length === 0) {
        itemsContainer.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        if (checkoutBtn) checkoutBtn.disabled = true;
      } else {
        if (emptyMessage) emptyMessage.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = false;
        renderCartItems(itemsContainer);
      }
    }
  }

  // Render cart items
  function renderCartItems(container) {
    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      html += '<div class="cart-item border-bottom pb-3 mb-3">' +
        '<div class="d-flex">' +
        '<img src="' + item.image + '" alt="' + item.name + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" class="me-3">' +
        '<div class="flex-grow-1">' +
        '<h6 class="mb-1">' + item.name + '</h6>' +
        '<div class="d-flex align-items-center gap-2 mb-2">' +
        '<button class="btn btn-sm btn-outline-secondary" onclick="Cart.updateQuantity(\'' + item.id + '\',' + (item.quantity - 1) + ')">−</button>' +
        '<span class="px-2">' + item.quantity + '</span>' +
        '<button class="btn btn-sm btn-outline-secondary" onclick="Cart.updateQuantity(\'' + item.id + '\',' + (item.quantity + 1) + ')">+</button>' +
        '<button class="btn btn-sm btn-link text-danger" onclick="Cart.remove(\'' + item.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>' +
        '<strong>' + formatPrice(item.price * item.quantity) + '</strong>' +
        '</div>' +
        '</div>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  // Show notification
  function showNotification(productName, quantity) {
    var existing = document.getElementById('cart-notification');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.id = 'cart-notification';
    div.className = 'alert alert-success position-fixed shadow';
    div.style.cssText = 'bottom:20px;right:20px;z-index:9999;min-width:280px;';
    div.innerHTML = '<i class="fas fa-check-circle me-2"></i><strong>Added to cart!</strong><br>' +
      quantity + 'x ' + productName +
      '<button type="button" class="btn-close float-end" onclick="this.parentElement.remove()"></button>';
    document.body.appendChild(div);

    setTimeout(function() {
      if (div.parentNode) div.remove();
    }, 3000);
  }

  // Open cart sidebar
  function openCart() {
    // Refresh prices before showing cart
    refreshCartPrices();
    updateUI();
    
    var sidebar = document.getElementById('cart-sidebar');
    if (sidebar && typeof bootstrap !== 'undefined') {
      var offcanvas = bootstrap.Offcanvas.getOrCreateInstance(sidebar);
      offcanvas.show();
    }
  }

  // Close cart sidebar
  function closeCart() {
    var sidebar = document.getElementById('cart-sidebar');
    if (sidebar && typeof bootstrap !== 'undefined') {
      var offcanvas = bootstrap.Offcanvas.getInstance(sidebar);
      if (offcanvas) offcanvas.hide();
    }
  }

  // Checkout - send to Stripe with current prices
  function checkout() {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    // Refresh prices one final time before checkout
    refreshCartPrices();
    
    closeCart();

    // Send cart with current admin prices to Stripe
    if (typeof StripeCheckout !== 'undefined' && typeof StripeCheckout.checkout === 'function') {
      // Cart items already have prices in cents
      StripeCheckout.checkout(cart);
    } else {
      alert('Payment system is loading. Please try again.');
    }
  }

  // Initialize
  function init() {
    loadCart();
    updateUI();
    console.log('Cart initialized with', cart.length, 'items');
    console.log('Product prices:', getProducts());
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API
  window.Cart = {
    add: addToCart,
    remove: removeFromCart,
    updateQuantity: updateQuantity,
    getTotal: getTotal,
    getItemCount: getItemCount,
    getItems: getItems,
    clear: clearCart,
    open: openCart,
    close: closeCart,
    checkout: checkout,
    formatPrice: formatPrice,
    getProducts: getProducts,
    refreshPrices: refreshCartPrices
  };

  // Legacy support
  window.addToCart = addToCart;
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.clearCart = clearCart;
  window.proceedToCheckout = checkout;

})();
