// Order Management System
// Handles order storage, retrieval, and status updates
// Uses localStorage for demo - can be migrated to backend API

const ORDER_STORAGE_KEY = 'seva_orders';
const ORDER_COUNTER_KEY = 'seva_order_counter';

// Order statuses
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Initialize order storage
function initOrderStorage() {
  if (!localStorage.getItem(ORDER_STORAGE_KEY)) {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(ORDER_COUNTER_KEY)) {
    localStorage.setItem(ORDER_COUNTER_KEY, '1000');
  }
}

// Generate unique order ID
function generateOrderId() {
  const counter = parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || '1000');
  const newCounter = counter + 1;
  localStorage.setItem(ORDER_COUNTER_KEY, newCounter.toString());
  return `SEVA-${newCounter}`;
}

// Create a new order
function createOrder(orderData) {
  initOrderStorage();
  
  const orders = getAllOrders();
  const orderId = generateOrderId();
  const timestamp = new Date().toISOString();
  
  const order = {
    id: orderId,
    orderNumber: orderId,
    timestamp: timestamp,
    date: new Date(timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: ORDER_STATUS.PENDING,
    customer: {
      name: orderData.name,
      email: orderData.email,
      phone: orderData.phone || ''
    },
    deliveryAddress: orderData.deliveryAddress || {},
    billingAddress: orderData.billingAddress || {},
    items: orderData.items || [],
    subtotal: orderData.subtotal || 0,
    shipping: orderData.shipping || 0,
    tax: orderData.tax || 0,
    total: orderData.total || orderData.subtotal || 0,
    paymentMethod: orderData.paymentMethod || 'card',
    notes: orderData.notes || '',
    trackingNumber: '',
    estimatedDelivery: ''
  };
  
  orders.push(order);
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  
  return order;
}

// Get all orders
function getAllOrders() {
  initOrderStorage();
  const ordersJson = localStorage.getItem(ORDER_STORAGE_KEY);
  return ordersJson ? JSON.parse(ordersJson) : [];
}

// Get order by ID
function getOrderById(orderId) {
  const orders = getAllOrders();
  return orders.find(order => order.id === orderId || order.orderNumber === orderId);
}

// Get orders by customer email
function getOrdersByEmail(email) {
  const orders = getAllOrders();
  return orders.filter(order => 
    order.customer.email.toLowerCase() === email.toLowerCase()
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Update order status
function updateOrderStatus(orderId, newStatus, additionalData = {}) {
  const orders = getAllOrders();
  const orderIndex = orders.findIndex(order => 
    order.id === orderId || order.orderNumber === orderId
  );
  
  if (orderIndex === -1) {
    throw new Error('Order not found');
  }
  
  orders[orderIndex].status = newStatus;
  
  // Update additional fields if provided
  if (additionalData.trackingNumber) {
    orders[orderIndex].trackingNumber = additionalData.trackingNumber;
  }
  if (additionalData.estimatedDelivery) {
    orders[orderIndex].estimatedDelivery = additionalData.estimatedDelivery;
  }
  if (additionalData.notes) {
    orders[orderIndex].notes = additionalData.notes;
  }
  
  // Add status history
  if (!orders[orderIndex].statusHistory) {
    orders[orderIndex].statusHistory = [];
  }
  orders[orderIndex].statusHistory.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    note: additionalData.note || ''
  });
  
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  return orders[orderIndex];
}

// Delete order (admin only)
function deleteOrder(orderId) {
  const orders = getAllOrders();
  const filteredOrders = orders.filter(order => 
    order.id !== orderId && order.orderNumber !== orderId
  );
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(filteredOrders));
  return true;
}

// Get orders by status
function getOrdersByStatus(status) {
  const orders = getAllOrders();
  return orders.filter(order => order.status === status)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Get order statistics
function getOrderStatistics() {
  const orders = getAllOrders();
  const stats = {
    total: orders.length,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    todayOrders: 0,
    thisWeekOrders: 0,
    thisMonthOrders: 0
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  orders.forEach(order => {
    // Count by status
    if (order.status === ORDER_STATUS.PENDING) stats.pending++;
    else if (order.status === ORDER_STATUS.PROCESSING) stats.processing++;
    else if (order.status === ORDER_STATUS.SHIPPED) stats.shipped++;
    else if (order.status === ORDER_STATUS.DELIVERED) stats.delivered++;
    else if (order.status === ORDER_STATUS.CANCELLED) stats.cancelled++;
    
    // Revenue (only count completed orders)
    if (order.status === ORDER_STATUS.DELIVERED) {
      stats.totalRevenue += order.total;
    }
    
    // Time-based counts
    const orderDate = new Date(order.timestamp);
    if (orderDate >= today) stats.todayOrders++;
    if (orderDate >= weekAgo) stats.thisWeekOrders++;
    if (orderDate >= monthAgo) stats.thisMonthOrders++;
  });
  
  return stats;
}

// Format price
function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Format order status badge
function getStatusBadgeClass(status) {
  const classes = {
    [ORDER_STATUS.PENDING]: 'bg-warning',
    [ORDER_STATUS.PROCESSING]: 'bg-info',
    [ORDER_STATUS.SHIPPED]: 'bg-primary',
    [ORDER_STATUS.DELIVERED]: 'bg-success',
    [ORDER_STATUS.CANCELLED]: 'bg-danger'
  };
  return classes[status] || 'bg-secondary';
}

// Format order status text
function formatStatusText(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
  window.OrderManager = {
    createOrder,
    getAllOrders,
    getOrderById,
    getOrdersByEmail,
    updateOrderStatus,
    deleteOrder,
    getOrdersByStatus,
    getOrderStatistics,
    formatPrice,
    getStatusBadgeClass,
    formatStatusText,
    ORDER_STATUS
  };
}

// Initialize on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    initOrderStorage();
  });
}
