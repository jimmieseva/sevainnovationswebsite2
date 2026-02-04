// Customer Account JavaScript
// Uses SecureStorage for sanitized order data (no sensitive info exposed)

let currentCustomerEmail = null;

// Get customer orders using secure storage
function getCustomerOrders(email) {
  // Use SecureStorage if available (returns sanitized data only)
  if (typeof SecureStorage !== 'undefined') {
    return SecureStorage.getOrdersByEmail(email);
  }
  // Fallback to OrderManager
  if (typeof OrderManager !== 'undefined') {
    return OrderManager.getOrdersByEmail(email);
  }
  return [];
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  // Check if already logged in
  const user = Auth.getCurrentUser();
  if (user && user.role === 'customer') {
    currentCustomerEmail = user.email;
    showAccountDashboard();
  } else {
    showLoginForm();
  }
  
  setupEventListeners();
});

// Show login form
function showLoginForm() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('accountSection').style.display = 'none';
}

// Show account dashboard
function showAccountDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('accountSection').style.display = 'block';
  loadCustomerData();
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('customerLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('customerEmail').value.trim();
      
      if (!email) {
        alert('Please enter your email address');
        return;
      }
      
      // Check if customer has orders using secure storage
      const orders = getCustomerOrders(email);
      if (orders.length === 0) {
        alert('No orders found for this email address. Please use the email address you used when placing your order.');
        return;
      }
      
      // Login customer
      const result = Auth.login(email, '', true); // true = isCustomer
      if (result.success) {
        currentCustomerEmail = email;
        showAccountDashboard();
      } else {
        alert('Error logging in. Please try again.');
      }
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutCustomerBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
        currentCustomerEmail = null;
        showLoginForm();
        document.getElementById('customerLoginForm').reset(); 
      }
    });
  }
}

// Load customer data
function loadCustomerData() {
  if (!currentCustomerEmail) return;
  
  // Use secure storage for sanitized data
  const orders = getCustomerOrders(currentCustomerEmail);
  
  if (orders.length === 0) {
    document.getElementById('customerOrdersList').innerHTML = 
      '<div class="alert alert-info">You have no orders yet.</div>';
    return;
  }
  
  // Update summary counts (handle both old and new status formats)
  const pendingStatuses = ['pending', 'pending_payment', 'processing'];
  const pending = orders.filter(o => pendingStatuses.includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  
  document.getElementById('totalOrdersCount').textContent = orders.length;
  document.getElementById('pendingOrdersCount').textContent = pending;
  document.getElementById('deliveredOrdersCount').textContent = delivered;
  
  // Update customer info (use sanitized data from SecureStorage)
  const latestOrder = orders[0];
  document.getElementById('customerEmailDisplay').textContent = currentCustomerEmail;
  document.getElementById('customerNameDisplay').textContent = latestOrder.customer ? latestOrder.customer.name || '-' : '-';
  // Phone is masked in SecureStorage public data
  document.getElementById('customerPhoneDisplay').textContent = latestOrder.customer ? (latestOrder.customer.phoneMasked || latestOrder.customer.phone || '-') : '-';
  
  // Display orders
  displayCustomerOrders(orders);
}

// Get status badge class
function getStatusBadgeClass(status) {
  const classes = {
    'pending': 'bg-warning',
    'pending_payment': 'bg-danger',
    'processing': 'bg-info',
    'shipped': 'bg-primary',
    'delivered': 'bg-success',
    'cancelled': 'bg-secondary'
  };
  return classes[status] || 'bg-secondary';
}

// Format status text
function formatStatusText(status) {
  const labels = {
    'pending': 'Pending',
    'pending_payment': 'Awaiting Payment',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
}

// Format price
function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Display customer orders
function displayCustomerOrders(orders) {
  const container = document.getElementById('customerOrdersList');
  
  const ordersHTML = orders.map(order => {
    const statusClass = getStatusBadgeClass(order.status);
    const statusText = formatStatusText(order.status);
    
    // Determine border color based on status
    let borderColor = '#dee2e6';
    if (order.status === 'pending' || order.status === 'pending_payment') borderColor = '#ffc107';
    else if (order.status === 'processing') borderColor = '#17a2b8';
    else if (order.status === 'shipped') borderColor = '#007bff';
    else if (order.status === 'delivered') borderColor = '#28a745';
    else if (order.status === 'cancelled') borderColor = '#dc3545';
    
    // Use totalFormatted if available, otherwise format the cents value
    const totalDisplay = order.totalFormatted || formatPrice(order.total || 0);
    const itemCount = order.items ? order.items.length : 0;
    
    return `
      <div class="card order-card mb-3" style="border-left-color: ${borderColor};">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-3">
              <strong>Order #${order.orderNumber}</strong><br>
              <small class="text-muted">${order.date}</small>
            </div>
            <div class="col-md-2">
              <span class="badge ${statusClass} status-badge">${statusText}</span>
            </div>
            <div class="col-md-3">
              <strong>${totalDisplay}</strong><br>
              <small class="text-muted">${itemCount} item(s)</small>
            </div>
            <div class="col-md-2">
              ${order.trackingNumber ? `
                <small class="text-muted">Tracking:</small><br>
                <strong>${order.trackingNumber}</strong>
              ` : '<small class="text-muted">No tracking yet</small>'}
            </div>
            <div class="col-md-2 text-end">
              <button class="btn btn-sm btn-outline-primary" onclick="viewCustomerOrder('${order.id}')">
                <i class="fas fa-eye me-1"></i>View Details
              </button>
            </div>
          </div>
          
          <!-- Order Timeline -->
          <div class="mt-3 pt-3 border-top">
            <div class="order-timeline">
              <div class="timeline-item ${order.status === 'pending' || order.status === 'pending_payment' ? 'active' : 'completed'}">
                <strong>Order Placed</strong>
                <small class="text-muted d-block">${order.date}</small>
              </div>
              ${order.status !== 'pending' && order.status !== 'pending_payment' ? `
                <div class="timeline-item ${order.status === 'processing' ? 'active' : 'completed'}">
                  <strong>Processing</strong>
                </div>
              ` : ''}
              ${order.status === 'shipped' || order.status === 'delivered' ? `
                <div class="timeline-item ${order.status === 'shipped' ? 'active' : 'completed'}">
                  <strong>Shipped</strong>
                  ${order.trackingNumber ? `<small class="text-muted d-block">Tracking: ${order.trackingNumber}</small>` : ''}
                </div>
              ` : ''}
              ${order.status === 'delivered' ? `
                <div class="timeline-item completed">
                  <strong>Delivered</strong>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = ordersHTML;
}

// View order details
function viewCustomerOrder(orderId) {
  // Get order from customer's orders (already filtered by email)
  const orders = getCustomerOrders(currentCustomerEmail);
  const order = orders.find(o => o.id === orderId);
  
  if (!order) {
    alert('Order not found');
    return;
  }
  
  // Verify order belongs to current customer
  if (!order.customer || order.customer.email.toLowerCase() !== currentCustomerEmail.toLowerCase()) {
    alert('Access denied');
    return;
  }
  
  // Build items HTML (handle both old and new item formats)
  const itemsHTML = (order.items || []).map(item => {
    const itemSubtotal = item.subtotalFormatted || formatPrice((item.price || 0) * (item.quantity || 1));
    const unitPrice = item.priceFormatted || formatPrice(item.price || 0);
    return `
      <tr>
        <td>${item.name || 'Item'}</td>
        <td>${item.quantity || 1}</td>
        <td>${unitPrice}</td>
        <td>${itemSubtotal}</td>
      </tr>
    `;
  }).join('');
  
  const statusClass = getStatusBadgeClass(order.status);
  const statusText = formatStatusText(order.status);
  const totalDisplay = order.totalFormatted || formatPrice(order.total || 0);
  
  // Delivery address (sanitized in SecureStorage - only city/state visible to customers)
  const deliveryAddress = order.deliveryAddress || {};
  const addressHtml = deliveryAddress.hasAddress ? 
    `${deliveryAddress.city || ''}, ${deliveryAddress.state || ''}` :
    (deliveryAddress.city ? `${deliveryAddress.city}, ${deliveryAddress.state || ''} ${deliveryAddress.zip || ''}` : '<span class="text-muted">Address on file</span>');
  
  const content = `
    <div class="row">
      <div class="col-md-6">
        <h6>Order Information</h6>
        <table class="table table-sm">
          <tr><td><strong>Order Number:</strong></td><td>${order.orderNumber}</td></tr>
          <tr><td><strong>Date:</strong></td><td>${order.dateTime || order.date}</td></tr>
          <tr><td><strong>Status:</strong></td><td><span class="badge ${statusClass}">${statusText}</span></td></tr>
          ${order.trackingNumber ? `<tr><td><strong>Tracking Number:</strong></td><td>${order.trackingNumber}</td></tr>` : ''}
          ${order.estimatedDelivery ? `<tr><td><strong>Estimated Delivery:</strong></td><td>${order.estimatedDelivery}</td></tr>` : ''}
        </table>
      </div>
      <div class="col-md-6">
        <h6>Delivery Location</h6>
        <address>
          ${addressHtml}
        </address>
        <small class="text-muted">Full address details stored securely</small>
      </div>
    </div>
    
    <div class="row mt-3">
      <div class="col-12">
        <h6>Order Items</h6>
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Order Total:</strong></td>
              <td><strong>${totalDisplay}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  
  document.getElementById('orderDetailContent').innerHTML = content;
  const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
  modal.show();
}

// Make functions globally available
window.viewCustomerOrder = viewCustomerOrder;
