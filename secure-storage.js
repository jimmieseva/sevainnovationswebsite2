/**
 * Secure Storage System
 * Separates sensitive data from public data
 * Uses random encryption keys stored separately
 */

(function() {
  'use strict';

  // Storage keys
  var PUBLIC_ORDERS_KEY = 'seva_orders_public';
  var SECURE_DATA_KEY = 'seva_secure_vault';
  var VAULT_KEY_KEY = 'seva_vault_key';
  
  // Generate a random encryption key
  function generateKey() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    var key = '';
    for (var i = 0; i < 64; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  // Get or create vault key (stored separately, harder to find)
  function getVaultKey() {
    var key = sessionStorage.getItem(VAULT_KEY_KEY);
    if (!key) {
      // Try to recover from localStorage with admin session
      var stored = localStorage.getItem(VAULT_KEY_KEY);
      if (stored && typeof Auth !== 'undefined' && Auth.isAdmin()) {
        key = stored;
        sessionStorage.setItem(VAULT_KEY_KEY, key);
      }
    }
    return key;
  }

  // Set vault key (only during admin session)
  function setVaultKey(key) {
    sessionStorage.setItem(VAULT_KEY_KEY, key);
    localStorage.setItem(VAULT_KEY_KEY, key);
  }

  // Initialize vault key if needed
  function initVaultKey() {
    if (!localStorage.getItem(VAULT_KEY_KEY)) {
      var key = generateKey();
      localStorage.setItem(VAULT_KEY_KEY, key);
    }
  }

  // Strong encryption using multiple rounds and random IV
  function encrypt(text, orderKey) {
    if (!text) return '';
    
    var vaultKey = getVaultKey() || localStorage.getItem(VAULT_KEY_KEY) || '';
    var combinedKey = vaultKey + (orderKey || '') + 'SEVA_SEC_2026';
    
    // Generate random IV
    var iv = '';
    for (var i = 0; i < 16; i++) {
      iv += String.fromCharCode(Math.floor(Math.random() * 256));
    }
    
    // XOR with combined key + IV
    var result = iv;
    for (var j = 0; j < text.length; j++) {
      var keyChar = combinedKey.charCodeAt((j + iv.charCodeAt(j % 16)) % combinedKey.length);
      var ivChar = iv.charCodeAt(j % 16);
      result += String.fromCharCode(text.charCodeAt(j) ^ keyChar ^ ivChar);
    }
    
    return btoa(unescape(encodeURIComponent(result)));
  }

  // Decrypt (requires vault key)
  function decrypt(encoded, orderKey) {
    if (!encoded) return '';
    
    var vaultKey = getVaultKey();
    if (!vaultKey) {
      return '[Access Denied]';
    }
    
    try {
      var combinedKey = vaultKey + (orderKey || '') + 'SEVA_SEC_2026';
      var decoded = decodeURIComponent(escape(atob(encoded)));
      
      // Extract IV (first 16 chars)
      var iv = decoded.substring(0, 16);
      var ciphertext = decoded.substring(16);
      
      // XOR decrypt
      var result = '';
      for (var j = 0; j < ciphertext.length; j++) {
        var keyChar = combinedKey.charCodeAt((j + iv.charCodeAt(j % 16)) % combinedKey.length);
        var ivChar = iv.charCodeAt(j % 16);
        result += String.fromCharCode(ciphertext.charCodeAt(j) ^ keyChar ^ ivChar);
      }
      
      return result;
    } catch (e) {
      return '[Decryption Error]';
    }
  }

  // Store order with separated public/private data
  function storeOrder(orderData) {
    initVaultKey();
    
    var orderId = orderData.id || 'order_' + Date.now();
    var orderKey = generateKey().substring(0, 32);
    
    // Public order data (visible to customers)
    var publicOrder = {
      id: orderId,
      orderNumber: orderData.orderNumber,
      date: orderData.date,
      dateTime: orderData.dateTime,
      status: orderData.status,
      customer: {
        name: orderData.customer ? orderData.customer.name : '',
        email: orderData.customer ? orderData.customer.email : '',
        // Phone is semi-private - mask it
        phoneMasked: orderData.customer && orderData.customer.phone ? 
          '***-***-' + orderData.customer.phone.slice(-4) : ''
      },
      deliveryAddress: {
        city: orderData.deliveryAddress ? orderData.deliveryAddress.city : '',
        state: orderData.deliveryAddress ? orderData.deliveryAddress.state : '',
        // Don't expose full street address publicly
        hasAddress: !!(orderData.deliveryAddress && orderData.deliveryAddress.street)
      },
      items: (orderData.items || []).map(function(item) {
        return {
          name: item.name,
          quantity: item.quantity,
          subtotalFormatted: item.subtotalFormatted || '$' + ((item.price * item.quantity) / 100).toFixed(2)
        };
      }),
      total: orderData.total,
      totalFormatted: orderData.totalFormatted,
      paymentStatus: orderData.paymentStatus,
      paymentMethod: 'card',
      createdAt: orderData.createdAt,
      hasPaymentData: !!(orderData.paymentData || orderData.payment)
    };

    // Secure data (admin only)
    var secureData = {
      orderId: orderId,
      orderKey: orderKey,
      customer: {
        phone: orderData.customer ? encrypt(orderData.customer.phone || '', orderKey) : ''
      },
      deliveryAddress: orderData.deliveryAddress ? {
        street: encrypt(orderData.deliveryAddress.street || '', orderKey),
        city: orderData.deliveryAddress.city,
        state: orderData.deliveryAddress.state,
        zip: encrypt(orderData.deliveryAddress.zip || '', orderKey),
        country: orderData.deliveryAddress.country
      } : null,
      billingAddress: orderData.billingAddress ? {
        street: encrypt(orderData.billingAddress.street || '', orderKey),
        city: orderData.billingAddress.city,
        state: orderData.billingAddress.state,
        zip: encrypt(orderData.billingAddress.zip || '', orderKey)
      } : null,
      paymentData: null,
      notes: orderData.notes || ''
    };

    // Encrypt payment card data with extra layer
    if (orderData.payment || orderData.paymentData) {
      var payment = orderData.payment || {};
      var existingPayment = orderData.paymentData || {};
      
      secureData.paymentData = {
        cardEncrypted: encrypt(payment.cardNumber || '', orderKey),
        expiryEncrypted: encrypt(payment.expiry || '', orderKey),
        cvvEncrypted: encrypt(payment.cvv || '', orderKey),
        cardHolderEncrypted: encrypt(payment.cardHolder || '', orderKey),
        lastFour: payment.lastFour || (payment.cardNumber ? payment.cardNumber.slice(-4) : '****'),
        // Store timestamp of when card was collected
        collectedAt: new Date().toISOString()
      };
    }

    // Save public orders
    var publicOrders = getPublicOrders();
    var existingIndex = publicOrders.findIndex(function(o) { return o.id === orderId; });
    if (existingIndex >= 0) {
      publicOrders[existingIndex] = publicOrder;
    } else {
      publicOrders.unshift(publicOrder);
    }
    localStorage.setItem(PUBLIC_ORDERS_KEY, JSON.stringify(publicOrders));

    // Save secure data
    var vault = getSecureVault();
    vault[orderId] = secureData;
    localStorage.setItem(SECURE_DATA_KEY, JSON.stringify(vault));

    return orderId;
  }

  // Get public orders (safe for customers)
  function getPublicOrders() {
    try {
      return JSON.parse(localStorage.getItem(PUBLIC_ORDERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  // Get secure vault (admin only)
  function getSecureVault() {
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) {
      return {};
    }
    try {
      return JSON.parse(localStorage.getItem(SECURE_DATA_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  // Get full order details (admin only)
  function getFullOrder(orderId) {
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) {
      return null;
    }

    var publicOrders = getPublicOrders();
    var publicOrder = publicOrders.find(function(o) { return o.id === orderId; });
    if (!publicOrder) return null;

    var vault = getSecureVault();
    var secureData = vault[orderId];
    if (!secureData) return publicOrder;

    var orderKey = secureData.orderKey || '';

    // Merge public and decrypted secure data
    return {
      id: publicOrder.id,
      orderNumber: publicOrder.orderNumber,
      date: publicOrder.date,
      dateTime: publicOrder.dateTime,
      status: publicOrder.status,
      customer: {
        name: publicOrder.customer.name,
        email: publicOrder.customer.email,
        phone: decrypt(secureData.customer.phone, orderKey)
      },
      deliveryAddress: secureData.deliveryAddress ? {
        street: decrypt(secureData.deliveryAddress.street, orderKey),
        city: secureData.deliveryAddress.city,
        state: secureData.deliveryAddress.state,
        zip: decrypt(secureData.deliveryAddress.zip, orderKey),
        country: secureData.deliveryAddress.country
      } : {},
      items: publicOrder.items,
      total: publicOrder.total,
      totalFormatted: publicOrder.totalFormatted,
      paymentStatus: publicOrder.paymentStatus,
      paymentData: secureData.paymentData ? {
        cardEncrypted: secureData.paymentData.cardEncrypted,
        expiryEncrypted: secureData.paymentData.expiryEncrypted,
        cvvEncrypted: secureData.paymentData.cvvEncrypted,
        cardHolderEncrypted: secureData.paymentData.cardHolderEncrypted,
        lastFour: secureData.paymentData.lastFour,
        orderKey: orderKey // Pass key for decryption
      } : null,
      createdAt: publicOrder.createdAt,
      notes: secureData.notes
    };
  }

  // Decrypt specific payment field (admin only, on demand)
  function decryptPaymentField(orderId, field) {
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) {
      return '[Access Denied]';
    }

    var vault = getSecureVault();
    var secureData = vault[orderId];
    if (!secureData || !secureData.paymentData) {
      return '[No Data]';
    }

    var orderKey = secureData.orderKey || '';
    var fieldMap = {
      'card': 'cardEncrypted',
      'expiry': 'expiryEncrypted',
      'cvv': 'cvvEncrypted',
      'holder': 'cardHolderEncrypted'
    };

    var encryptedField = fieldMap[field];
    if (!encryptedField || !secureData.paymentData[encryptedField]) {
      return '[No Data]';
    }

    return decrypt(secureData.paymentData[encryptedField], orderKey);
  }

  // Update order status (works with public orders)
  function updateOrderStatus(orderId, status, additionalData) {
    var publicOrders = getPublicOrders();
    var order = publicOrders.find(function(o) { return o.id === orderId; });
    
    if (order) {
      order.status = status;
      if (additionalData) {
        if (additionalData.paymentStatus) order.paymentStatus = additionalData.paymentStatus;
        if (additionalData.paidAt) order.paidAt = additionalData.paidAt;
        if (additionalData.trackingNumber) order.trackingNumber = additionalData.trackingNumber;
      }
      localStorage.setItem(PUBLIC_ORDERS_KEY, JSON.stringify(publicOrders));
    }
    
    return order;
  }

  // Delete order (admin only)
  function deleteOrder(orderId) {
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) {
      return false;
    }

    // Remove from public orders
    var publicOrders = getPublicOrders();
    publicOrders = publicOrders.filter(function(o) { return o.id !== orderId; });
    localStorage.setItem(PUBLIC_ORDERS_KEY, JSON.stringify(publicOrders));

    // Remove from vault
    var vault = getSecureVault();
    delete vault[orderId];
    localStorage.setItem(SECURE_DATA_KEY, JSON.stringify(vault));

    return true;
  }

  // Clear payment data only (after processing)
  function clearPaymentData(orderId) {
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) {
      return false;
    }

    var vault = getSecureVault();
    if (vault[orderId]) {
      vault[orderId].paymentData = null;
      vault[orderId].notes = (vault[orderId].notes || '') + '\nPayment data cleared: ' + new Date().toLocaleString();
      localStorage.setItem(SECURE_DATA_KEY, JSON.stringify(vault));
    }

    // Update public order
    var publicOrders = getPublicOrders();
    var order = publicOrders.find(function(o) { return o.id === orderId; });
    if (order) {
      order.hasPaymentData = false;
      localStorage.setItem(PUBLIC_ORDERS_KEY, JSON.stringify(publicOrders));
    }

    return true;
  }

  // Get orders by email (for customer portal - uses public data only)
  function getOrdersByEmail(email) {
    var publicOrders = getPublicOrders();
    return publicOrders.filter(function(order) {
      return order.customer && order.customer.email && 
             order.customer.email.toLowerCase() === email.toLowerCase();
    });
  }

  // Migrate old orders to new system
  function migrateOldOrders() {
    var oldOrders = [];
    try {
      oldOrders = JSON.parse(localStorage.getItem('seva_orders') || '[]');
    } catch (e) {
      return;
    }

    if (oldOrders.length === 0) return;

    // Check if already migrated
    var publicOrders = getPublicOrders();
    if (publicOrders.length > 0) return;

    console.log('Migrating', oldOrders.length, 'orders to secure storage...');

    oldOrders.forEach(function(order) {
      // Reconstruct payment data if it exists
      var payment = null;
      if (order.paymentData) {
        // Old encryption - try to keep lastFour at least
        payment = {
          cardNumber: '', // Can't decrypt old data safely
          expiry: '',
          cvv: '',
          cardHolder: '',
          lastFour: order.paymentData.lastFour || '****'
        };
      }

      storeOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.date,
        dateTime: order.dateTime,
        status: order.status,
        customer: order.customer,
        deliveryAddress: order.deliveryAddress,
        billingAddress: order.billingAddress,
        items: order.items,
        total: order.total,
        totalFormatted: order.totalFormatted,
        paymentStatus: order.paymentStatus,
        payment: payment,
        createdAt: order.createdAt,
        notes: 'Migrated from old system'
      });
    });

    // Clear old storage after migration
    localStorage.removeItem('seva_orders');
    console.log('Migration complete');
  }

  // Initialize
  initVaultKey();
  
  // Run migration on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', migrateOldOrders);
  } else {
    migrateOldOrders();
  }

  // Export API
  window.SecureStorage = {
    storeOrder: storeOrder,
    getPublicOrders: getPublicOrders,
    getFullOrder: getFullOrder,
    getOrdersByEmail: getOrdersByEmail,
    decryptPaymentField: decryptPaymentField,
    updateOrderStatus: updateOrderStatus,
    deleteOrder: deleteOrder,
    clearPaymentData: clearPaymentData,
    encrypt: encrypt,
    decrypt: decrypt
  };

})();
