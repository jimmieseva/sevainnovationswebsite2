// Lightweight Cart Badge Script
// Shows cart badge on all pages without requiring full cart functionality
// This ensures the cart count persists across navigation

const CART_STORAGE_KEY = 'tactilink_cart';

// Get cart item count from localStorage
function getCartItemCount() {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      return cart.reduce((count, item) => count + (item.quantity || 0), 0);
    }
  } catch (e) {
    console.error('Error reading cart:', e);
  }
  return 0;
}

// Update cart badge on page
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const count = getCartItemCount();
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // Also update badge in header if it exists
  const badgeHeader = document.getElementById('cart-badge-header');
  if (badgeHeader) {
    if (count > 0) {
      badgeHeader.textContent = count;
      badgeHeader.style.display = 'inline-block';
    } else {
      badgeHeader.style.display = 'none';
    }
  }
}

// Listen for cart updates from other pages/tabs
function setupCartListener() {
  // Listen for storage events (when cart is updated in another tab/window)
  window.addEventListener('storage', function(e) {
    if (e.key === CART_STORAGE_KEY) {
      updateCartBadge();
    }
  });
  
  // Also listen for custom cart update events
  window.addEventListener('cartUpdated', function() {
    updateCartBadge();
  });
  
  // Poll for cart updates (in case storage event doesn't fire)
  // Only poll every 2 seconds to reduce overhead
  setInterval(function() {
    updateCartBadge();
  }, 2000);
}

// Initialize on page load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      updateCartBadge();
      setupCartListener();
    });
  } else {
    updateCartBadge();
    setupCartListener();
  }
}

// Export for manual updates
if (typeof window !== 'undefined') {
  window.CartBadge = {
    update: updateCartBadge,
    getCount: getCartItemCount
  };
}
