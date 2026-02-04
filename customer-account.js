// Customer Account JavaScript

let currentCustomerEmail = null;

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
      
      // Check if customer has orders
      const orders = OrderManager.getOrdersByEmail(email);
      if (orders.length === 0) {
        alert('No orders found for this email address. Please use the email address you used when placing your order.');
        return;
      }
      
      // Login customer
      const result = Auth.login(email, '', false);
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
  
  const orders = OrderManager.getOrdersByEmail(currentCustomerEmail);
  
  if (orders.length === 0) {
    document.getElementById('customerOrdersList').innerHTML = 
      '<div class="alert alert-info">You have no orders yet.</div>';
    return;
  }
  
  // Update summary counts
  const pending = orders.filter(o => o.status === OrderManager.ORDER_STATUS.PENDING || 
                                     o.status === OrderManager.ORDER_STATUS.PROCESSING).length;
  const delivered = orders.filter(o => o.status === OrderManager.ORDER_STATUS.DELIVERED).length;
  
  document.getElementById('totalOrdersCount').textContent = orders.length;
  document.getElementById('pendingOrdersCount').textContent = pending;
  document.getElementById('deliveredOrdersCount').textContent = delivered;
  
  // Update customer info
  const latestOrder = orders[0];
  document.getElementById('customerEmailDisplay').textContent = currentCustomerEmail;
  document.getElementById('customerNameDisplay').textContent = latestOrder.customer.name || '-';
  document.getElementById('customerPhoneDisplay').textContent = latestOrder.customer.phone || '-';
  
  // Display orders
  displayCustomerOrders(orders);
}

// Display customer orders
function displayCustomerOrders(orders) {
  const container = document.getElementById('customerOrdersList');
  
  const ordersHTML = orders.map(order => {
    const statusClass = OrderManager.getStatusBadgeClass(order.status);
    const statusText = OrderManager.formatStatusText(order.status);
    
    // Determine border color based on status
    let borderColor = '#dee2e6';
    if (order.status === OrderManager.ORDER_STATUS.PENDING) borderColor = '#ffc107';
    else if (order.status === OrderManager.ORDER_STATUS.PROCESSING) borderColor = '#17a2b8';
    else if (order.status === OrderManager.ORDER_STATUS.SHIPPED) borderColor = '#007bff';
    else if (order.status === OrderManager.ORDER_STATUS.DELIVERED) borderColor = '#28a745';
    else if (order.status === OrderManager.ORDER_STATUS.CANCELLED) borderColor = '#dc3545';
    
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
              <strong>${OrderManager.formatPrice(order.total)}</strong><br>
              <small class="text-muted">${order.items.length} item(s)</small>
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
              <div class="timeline-item ${order.status === OrderManager.ORDER_STATUS.PENDING ? 'active' : 'completed'}">
                <strong>Order Placed</strong>
                <small class="text-muted d-block">${order.date}</small>
              </div>
              ${order.status !== OrderManager.ORDER_STATUS.PENDING ? `
                <div class="timeline-item ${order.status === OrderManager.ORDER_STATUS.PROCESSING ? 'active' : 'completed'}">
                  <strong>Processing</strong>
                </div>
              ` : ''}
              ${order.status === OrderManager.ORDER_STATUS.SHIPPED || order.status === OrderManager.ORDER_STATUS.DELIVERED ? `
                <div class="timeline-item ${order.status === OrderManager.ORDER_STATUS.SHIPPED ? 'active' : 'completed'}">
                  <strong>Shipped</strong>
                  ${order.trackingNumber ? `<small class="text-muted d-block">Tracking: ${order.trackingNumber}</small>` : ''}
                </div>
              ` : ''}
              ${order.status === OrderManager.ORDER_STATUS.DELIVERED ? `
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
  const order = OrderManager.getOrderById(orderId);
  if (!order) {
    alert('Order not found');
    return;
  }
  
  // Verify order belongs to current customer
  if (order.customer.email.toLowerCase() !== currentCustomerEmail.toLowerCase()) {
    alert('Access denied');
    return;
  }
  
  const itemsHTML = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${OrderManager.formatPrice(item.price)}</td>
      <td>${OrderManager.formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');
  
  const statusClass = OrderManager.getStatusBadgeClass(order.status);
  const statusText = OrderManager.formatStatusText(order.status);
  
  const content = `
    <div class="row">
      <div class="col-md-6">
        <h6>Order Information</h6>
        <table class="table table-sm">
          <tr><td><strong>Order Number:</strong></td><td>${order.orderNumber}</td></tr>
          <tr><td><strong>Date:</strong></td><td>${order.date}</td></tr>
          <tr><td><strong>Status:</strong></td><td><span class="badge ${statusClass}">${statusText}</span></td></tr>
          ${order.trackingNumber ? `<tr><td><strong>Tracking Number:</strong></td><td>${order.trackingNumber}</td></tr>` : ''}
          ${order.estimatedDelivery ? `<tr><td><strong>Estimated Delivery:</strong></td><td>${order.estimatedDelivery}</td></tr>` : ''}
        </table>
      </div>
      <div class="col-md-6">
        <h6>Delivery Address</h6>
        <address>
          ${order.deliveryAddress.street || ''}<br>
          ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''} ${order.deliveryAddress.zip || ''}<br>
          ${order.deliveryAddress.country || ''}
        </address>
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
              <td colspan="3"><strong>Subtotal:</strong></td>
              <td>${OrderManager.formatPrice(order.subtotal)}</td>
            </tr>
            ${order.shipping > 0 ? `
              <tr>
                <td colspan="3"><strong>Shipping:</strong></td>
                <td>${OrderManager.formatPrice(order.shipping)}</td>
              </tr>
            ` : ''}
            ${order.tax > 0 ? `
              <tr>
                <td colspan="3"><strong>Tax:</strong></td>
                <td>${OrderManager.formatPrice(order.tax)}</td>
              </tr>
            ` : ''}
            <tr>
              <td colspan="3"><strong>Total:</strong></td>
              <td><strong>${OrderManager.formatPrice(order.total)}</strong></td>
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
