/**
 * Admin Dashboard JavaScript
 * Full CMS functionality for SEVA Innovations
 */

(function() {
  'use strict';

  var currentSection = 'dashboard';
  var currentPage = 'home';
  var unsavedChanges = false;

  // Field definitions for each page
  var PAGE_FIELDS = {
    home: [
      { key: 'heroTitle', label: 'Hero Title', type: 'text' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'text' },
      { key: 'heroDescription', label: 'Hero Description', type: 'textarea' },
      { key: 'aboutTitle', label: 'About Section Title', type: 'text' },
      { key: 'aboutText', label: 'About Section Text', type: 'textarea' }
    ],
    about: [
      { key: 'pageTitle', label: 'Page Title', type: 'text' },
      { key: 'heroTitle', label: 'Hero Title', type: 'text' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'text' },
      { key: 'missionTitle', label: 'Mission Title', type: 'text' },
      { key: 'missionText', label: 'Mission Text', type: 'textarea' },
      { key: 'visionTitle', label: 'Vision Title', type: 'text' },
      { key: 'visionText', label: 'Vision Text', type: 'textarea' },
      { key: 'historyTitle', label: 'History Title', type: 'text' },
      { key: 'historyText', label: 'History Text', type: 'textarea' }
    ],
    tactilink: [
      { key: 'heroTitle', label: 'Hero Title', type: 'text' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'productTitle', label: 'Products Section Title', type: 'text' },
      { key: 'productSubtitle', label: 'Products Section Subtitle', type: 'text' }
    ],
    lms: [
      { key: 'heroTitle', label: 'Hero Title', type: 'text' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'featuresTitle', label: 'Features Title', type: 'text' },
      { key: 'featuresText', label: 'Features Text', type: 'textarea' }
    ],
    dms: [
      { key: 'heroTitle', label: 'Hero Title', type: 'text' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'featuresTitle', label: 'Features Title', type: 'text' },
      { key: 'featuresText', label: 'Features Text', type: 'textarea' }
    ],
    aiAwareness: [
      { key: 'heroTitle', label: 'Hero Title', type: 'text' },
      { key: 'heroSubtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'featuresTitle', label: 'Features Title', type: 'text' },
      { key: 'featuresText', label: 'Features Text', type: 'textarea' }
    ],
    global: [
      { key: 'companyName', label: 'Company Name', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'contactEmail', label: 'Contact Email', type: 'email' },
      { key: 'contactPhone', label: 'Contact Phone', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'city', label: 'City/State/ZIP', type: 'text' },
      { key: 'copyrightYear', label: 'Copyright Year', type: 'text' },
      { key: 'footerText', label: 'Footer Text', type: 'text' }
    ]
  };

  var IMAGE_FIELDS = [
    { key: 'logo', label: 'Site Logo' },
    { key: 'heroHome', label: 'Home Hero Image' },
    { key: 'tactilink', label: 'TactiLink Product Image' },
    { key: 'tactilinkKit', label: 'TactiLink Kit Image' },
    { key: 'lms', label: 'LMS Page Image' },
    { key: 'dms', label: 'DMS Page Image' },
    { key: 'aiAwareness', label: 'AI Awareness Image' }
  ];

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    updateTime();
    setInterval(updateTime, 60000);
  });

  // Check authentication
  function checkAuth() {
    if (typeof Auth === 'undefined' || !Auth.isAdmin()) {
      showLogin();
    } else {
      showDashboard();
    }
  }

  // Show login modal
  function showLogin() {
    var modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();

    document.getElementById('loginForm').onsubmit = function(e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value;
      var password = document.getElementById('loginPassword').value;

      if (typeof Auth !== 'undefined') {
        var result = Auth.login(email, password, true);
        if (result.success) {
          modal.hide();
          showDashboard();
        } else {
          showToast('Invalid credentials', 'danger');
        }
      } else {
        // Fallback simple auth
        if (email === 'admin@seva-innovations.com' && password === 'admin123') {
          localStorage.setItem('admin_logged_in', 'true');
          modal.hide();
          showDashboard();
        } else {
          showToast('Invalid credentials', 'danger');
        }
      }
    };
  }

  // Show dashboard
  function showDashboard() {
    document.getElementById('adminPanel').style.display = 'block';
    loadDashboard();
  }

  // Setup event listeners
  function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.sidebar .nav-link[data-section]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        if (unsavedChanges && !confirm('You have unsaved changes. Continue?')) return;
        unsavedChanges = false;
        
        var section = this.getAttribute('data-section');
        switchSection(section);

        document.querySelectorAll('.sidebar .nav-link').forEach(function(l) {
          l.classList.remove('active');
        });
        this.classList.add('active');
      });
    });

    // Page selector buttons
    document.querySelectorAll('.page-selector .btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.page-selector .btn').forEach(function(b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
        currentPage = this.getAttribute('data-page');
        loadContentFields();
      });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
      e.preventDefault();
      if (confirm('Logout?')) {
        if (typeof Auth !== 'undefined') Auth.logout();
        localStorage.removeItem('admin_logged_in');
        location.reload();
      }
    });

    // Password form
    document.getElementById('passwordForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var newPass = document.getElementById('newPassword').value;
      var confirmPass = document.getElementById('confirmPassword').value;

      if (newPass !== confirmPass) {
        showToast('Passwords do not match', 'danger');
        return;
      }

      if (typeof Auth !== 'undefined') {
        var result = Auth.updateAdminPassword(newPass);
        if (result.success) {
          showToast('Password updated', 'success');
          this.reset();
        } else {
          showToast('Error: ' + result.error, 'danger');
        }
      } else {
        showToast('Password updated', 'success');
        this.reset();
      }
    });

    // Order filter
    document.getElementById('orderFilter').addEventListener('change', function() {
      loadOrders(this.value);
    });

    // Track changes
    document.addEventListener('input', function(e) {
      if (e.target.closest('#contentFields') || e.target.closest('#imageFields')) {
        unsavedChanges = true;
      }
    });
  }

  // Switch section
  function switchSection(section) {
    currentSection = section;

    document.querySelectorAll('.content-section').forEach(function(s) {
      s.style.display = 'none';
    });

    var sectionEl = document.getElementById(section + 'Section');
    if (sectionEl) sectionEl.style.display = 'block';

    switch (section) {
      case 'dashboard': loadDashboard(); break;
      case 'content': loadContentFields(); break;
      case 'images': loadImageFields(); break;
      case 'products': loadProducts(); break;
      case 'orders': loadOrders('all'); break;
    }
  }

  // Load dashboard
  function loadDashboard() {
    var orders = getOrders();
    var pending = orders.filter(function(o) { return o.status === 'pending'; }).length;
    var processing = orders.filter(function(o) { return o.status === 'processing'; }).length;
    var revenue = orders.filter(function(o) { return o.status === 'delivered'; })
      .reduce(function(sum, o) { return sum + (o.total || 0); }, 0);

    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statProcessing').textContent = processing;
    document.getElementById('statRevenue').textContent = '$' + (revenue / 100).toFixed(2);

    // Recent orders
    var recent = orders.slice(0, 5);
    var container = document.getElementById('recentOrders');
    
    if (recent.length === 0) {
      container.innerHTML = '<p class="text-muted">No orders yet.</p>';
    } else {
      container.innerHTML = recent.map(function(order) {
        return '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
          '<div><strong>' + order.orderNumber + '</strong><br><small class="text-muted">' + order.date + '</small></div>' +
          '<div><span class="badge bg-' + getStatusColor(order.status) + '">' + order.status + '</span></div>' +
          '<div><strong>$' + ((order.total || 0) / 100).toFixed(2) + '</strong></div>' +
          '</div>';
      }).join('');
    }
  }

  // Load content fields
  function loadContentFields() {
    var content = SiteContent.get(currentPage) || {};
    var fields = PAGE_FIELDS[currentPage] || [];
    var container = document.getElementById('contentFields');

    var html = '<h5 class="mb-3 text-capitalize">' + currentPage.replace(/([A-Z])/g, ' $1') + ' Page Content</h5>';
    
    fields.forEach(function(field) {
      var value = content[field.key] || '';
      html += '<div class="field-group">';
      html += '<label class="form-label">' + field.label + '</label>';
      
      if (field.type === 'textarea') {
        html += '<textarea class="form-control" rows="3" data-key="' + field.key + '">' + escapeHtml(value) + '</textarea>';
      } else {
        html += '<input type="' + field.type + '" class="form-control" data-key="' + field.key + '" value="' + escapeHtml(value) + '">';
      }
      
      html += '</div>';
    });

    container.innerHTML = html;
  }

  // Load image fields
  function loadImageFields() {
    var images = SiteContent.get('images') || {};
    var container = document.getElementById('imageFields');

    var html = '<div class="row">';
    
    IMAGE_FIELDS.forEach(function(field) {
      var value = images[field.key] || '';
      html += '<div class="col-md-6 mb-4">';
      html += '<div class="field-group">';
      html += '<label class="form-label">' + field.label + '</label>';
      html += '<input type="text" class="form-control mb-2" data-image-key="' + field.key + '" value="' + escapeHtml(value) + '" placeholder="ImageDump/filename.png">';
      
      if (value) {
        html += '<img src="' + escapeHtml(value) + '" class="preview-image mt-2" onerror="this.style.display=\'none\'">';
      }
      
      html += '</div></div>';
    });

    html += '</div>';
    container.innerHTML = html;

    // Add preview update on input
    container.querySelectorAll('input[data-image-key]').forEach(function(input) {
      input.addEventListener('input', function() {
        var img = this.nextElementSibling;
        if (img && img.tagName === 'IMG') {
          img.src = this.value;
          img.style.display = this.value ? 'block' : 'none';
        }
      });
    });
  }

  // Load products
  function loadProducts() {
    var content = SiteContent.get('tactilink') || {};
    
    document.getElementById('prod-usbc-name').value = content.cableUsbcName || '';
    document.getElementById('prod-usbc-desc').value = content.cableUsbcDesc || '';
    document.getElementById('prod-usbc-price').value = content.cableUsbcPrice || '';
    
    document.getElementById('prod-usba-name').value = content.cableUsbaName || '';
    document.getElementById('prod-usba-desc').value = content.cableUsbaDesc || '';
    document.getElementById('prod-usba-price').value = content.cableUsbaPrice || '';
    
    document.getElementById('prod-kit-name').value = content.kitName || '';
    document.getElementById('prod-kit-desc').value = content.kitDesc || '';
    document.getElementById('prod-kit-price').value = content.kitPrice || '';
  }

  // Load orders
  function loadOrders(filter) {
    var orders = getOrders();
    
    if (filter !== 'all') {
      orders = orders.filter(function(o) { return o.status === filter; });
    }

    var container = document.getElementById('ordersList');
    
    if (orders.length === 0) {
      container.innerHTML = '<p class="text-muted">No orders found.</p>';
      return;
    }

    container.innerHTML = orders.map(function(order) {
      var paymentBadge = '';
      if (order.paymentStatus === 'awaiting_payment' || order.status === 'pending_payment') {
        paymentBadge = '<span class="badge bg-danger ms-1">Unpaid</span>';
      } else if (order.paymentStatus === 'paid') {
        paymentBadge = '<span class="badge bg-success ms-1">Paid</span>';
      }
      
      return '<div class="card order-card mb-3">' +
        '<div class="card-body">' +
        '<div class="row align-items-center">' +
        '<div class="col-md-2"><strong>' + order.orderNumber + '</strong><br><small class="text-muted">' + (order.dateTime || order.date) + '</small></div>' +
        '<div class="col-md-3">' + (order.customer ? order.customer.name : 'N/A') + '<br><small class="text-muted">' + (order.customer ? order.customer.email : '') + '</small>' +
        (order.customer && order.customer.phone ? '<br><small class="text-muted">' + order.customer.phone + '</small>' : '') + '</div>' +
        '<div class="col-md-2"><span class="badge bg-' + getStatusColor(order.status) + '">' + formatStatus(order.status) + '</span>' + paymentBadge + '</div>' +
        '<div class="col-md-2"><strong>' + (order.totalFormatted || '$' + ((order.total || 0) / 100).toFixed(2)) + '</strong></div>' +
        '<div class="col-md-3 text-end">' +
        '<button class="btn btn-sm btn-outline-primary me-1" onclick="Admin.viewOrder(\'' + order.id + '\')"><i class="fas fa-eye"></i> View</button>' +
        (order.paymentStatus !== 'paid' ? '<button class="btn btn-sm btn-success me-1" onclick="Admin.markPaid(\'' + order.id + '\')"><i class="fas fa-check"></i> Mark Paid</button>' : '') +
        '</div>' +
        '</div></div></div>';
    }).join('');
  }
  
  // Format status for display
  function formatStatus(status) {
    var labels = {
      'pending_payment': 'Pending Payment',
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  // Save content
  function saveContent() {
    var content = SiteContent.get(currentPage) || {};
    
    document.querySelectorAll('#contentFields [data-key]').forEach(function(el) {
      content[el.getAttribute('data-key')] = el.value;
    });

    SiteContent.updatePage(currentPage, content);
    unsavedChanges = false;
    showToast('Content saved!', 'success');
  }

  // Save images
  function saveImages() {
    var images = SiteContent.get('images') || {};
    
    document.querySelectorAll('#imageFields [data-image-key]').forEach(function(el) {
      images[el.getAttribute('data-image-key')] = el.value;
    });

    SiteContent.updatePage('images', images);
    unsavedChanges = false;
    showToast('Images saved!', 'success');
  }

  // Save products
  function saveProducts() {
    var content = SiteContent.get('tactilink') || {};
    
    content.cableUsbcName = document.getElementById('prod-usbc-name').value;
    content.cableUsbcDesc = document.getElementById('prod-usbc-desc').value;
    content.cableUsbcPrice = document.getElementById('prod-usbc-price').value;
    
    content.cableUsbaName = document.getElementById('prod-usba-name').value;
    content.cableUsbaDesc = document.getElementById('prod-usba-desc').value;
    content.cableUsbaPrice = document.getElementById('prod-usba-price').value;
    
    content.kitName = document.getElementById('prod-kit-name').value;
    content.kitDesc = document.getElementById('prod-kit-desc').value;
    content.kitPrice = document.getElementById('prod-kit-price').value;

    SiteContent.updatePage('tactilink', content);
    showToast('Products saved!', 'success');
  }

  // Reset current page
  function resetCurrentPage() {
    if (confirm('Reset ' + currentPage + ' content to defaults?')) {
      SiteContent.resetPage(currentPage);
      loadContentFields();
      showToast('Content reset to defaults', 'info');
    }
  }

  // Reset all content
  function resetAllContent() {
    if (confirm('Reset ALL content to defaults? This cannot be undone.')) {
      SiteContent.reset();
      loadContentFields();
      showToast('All content reset', 'info');
    }
  }

  // Export content
  function exportContent() {
    var content = SiteContent.load();
    var blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'seva-content-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Content exported', 'success');
  }

  // Import content
  function importContent(input) {
    var file = input.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var content = JSON.parse(e.target.result);
        SiteContent.save(content);
        loadContentFields();
        showToast('Content imported', 'success');
      } catch (err) {
        showToast('Invalid file', 'danger');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  // View order - detailed view with payment processing info
  function viewOrder(orderId) {
    var orders = getOrders();
    var order = orders.find(function(o) { return o.id === orderId; });
    if (!order) return;

    var items = (order.items || []).map(function(item) {
      return '<tr>' +
        '<td>' + item.name + '</td>' +
        '<td class="text-center">' + item.quantity + '</td>' +
        '<td class="text-end">' + (item.priceFormatted || '$' + ((item.price || 0) / 100).toFixed(2)) + '</td>' +
        '<td class="text-end">' + (item.subtotalFormatted || '$' + (((item.price || 0) * item.quantity) / 100).toFixed(2)) + '</td>' +
        '</tr>';
    }).join('');

    var address = order.deliveryAddress || {};
    var addressHtml = address.street ? 
      (address.street + '<br>' + address.city + ', ' + address.state + ' ' + address.zip + '<br>' + (address.country || 'USA')) : 
      '<span class="text-muted">Not provided</span>';

    var paymentStatusHtml = '';
    if (order.paymentStatus === 'paid') {
      paymentStatusHtml = '<span class="badge bg-success">Paid</span>' + 
        (order.paidAt ? '<br><small class="text-muted">Paid on: ' + new Date(order.paidAt).toLocaleString() + '</small>' : '');
    } else {
      paymentStatusHtml = '<span class="badge bg-danger">Awaiting Payment</span>' +
        '<br><small class="text-muted">Ready for manual Stripe processing</small>';
    }

    var content = '<div class="row mb-4">' +
      '<div class="col-md-6">' +
      '<div class="card bg-light">' +
      '<div class="card-body">' +
      '<h6 class="card-title"><i class="fas fa-receipt me-2"></i>Order Info</h6>' +
      '<table class="table table-sm table-borderless mb-0">' +
      '<tr><td class="text-muted">Order #</td><td><strong>' + order.orderNumber + '</strong></td></tr>' +
      '<tr><td class="text-muted">Date</td><td>' + (order.dateTime || order.date) + '</td></tr>' +
      '<tr><td class="text-muted">Status</td><td><span class="badge bg-' + getStatusColor(order.status) + '">' + formatStatus(order.status) + '</span></td></tr>' +
      '<tr><td class="text-muted">Payment</td><td>' + paymentStatusHtml + '</td></tr>' +
      '</table></div></div></div>' +
      '<div class="col-md-6">' +
      '<div class="card bg-light">' +
      '<div class="card-body">' +
      '<h6 class="card-title"><i class="fas fa-user me-2"></i>Customer Info</h6>' +
      '<table class="table table-sm table-borderless mb-0">' +
      '<tr><td class="text-muted">Name</td><td><strong>' + (order.customer ? order.customer.name : 'N/A') + '</strong></td></tr>' +
      '<tr><td class="text-muted">Email</td><td><a href="mailto:' + (order.customer ? order.customer.email : '') + '">' + (order.customer ? order.customer.email : 'N/A') + '</a></td></tr>' +
      '<tr><td class="text-muted">Phone</td><td>' + (order.customer && order.customer.phone ? order.customer.phone : '<span class="text-muted">N/A</span>') + '</td></tr>' +
      '</table></div></div></div>' +
      '</div>' +
      
      '<div class="row mb-4">' +
      '<div class="col-12">' +
      '<div class="card bg-light">' +
      '<div class="card-body">' +
      '<h6 class="card-title"><i class="fas fa-map-marker-alt me-2"></i>Shipping Address</h6>' +
      '<address class="mb-0">' + addressHtml + '</address>' +
      '</div></div></div></div>' +
      
      '<h6><i class="fas fa-box me-2"></i>Order Items</h6>' +
      '<table class="table table-sm">' +
      '<thead class="table-light"><tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Subtotal</th></tr></thead>' +
      '<tbody>' + items + '</tbody>' +
      '<tfoot class="table-light"><tr><td colspan="3" class="text-end"><strong>Total:</strong></td><td class="text-end"><strong class="text-primary fs-5">' + (order.totalFormatted || '$' + ((order.total || 0) / 100).toFixed(2)) + '</strong></td></tr></tfoot>' +
      '</table>' +
      
      (order.paymentStatus !== 'paid' ? 
        '<div class="alert alert-info mt-3">' +
        '<h6><i class="fas fa-info-circle me-2"></i>Manual Payment Processing</h6>' +
        '<p class="mb-2">To process this order via Stripe:</p>' +
        '<ol class="mb-2">' +
        '<li>Go to <a href="https://dashboard.stripe.com/invoices/create" target="_blank">Stripe Dashboard → Invoices</a></li>' +
        '<li>Create invoice for <strong>' + (order.customer ? order.customer.email : 'customer') + '</strong></li>' +
        '<li>Add items totaling <strong>' + (order.totalFormatted || '$' + ((order.total || 0) / 100).toFixed(2)) + '</strong></li>' +
        '<li>Send invoice or payment link to customer</li>' +
        '<li>Once paid, click "Mark Paid" below</li>' +
        '</ol>' +
        '<button class="btn btn-success" onclick="Admin.markPaid(\'' + order.id + '\'); bootstrap.Modal.getInstance(document.getElementById(\'orderModal\')).hide();">' +
        '<i class="fas fa-check me-2"></i>Mark as Paid</button>' +
        '</div>' : 
        '<div class="alert alert-success mt-3"><i class="fas fa-check-circle me-2"></i>Payment received</div>'
      ) +
      
      '<div class="mt-3">' +
      '<div class="btn-group">' +
      '<button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Update Status</button>' +
      '<ul class="dropdown-menu">' +
      '<li><a class="dropdown-item" href="#" onclick="Admin.updateStatus(\'' + order.id + '\',\'pending_payment\')">Pending Payment</a></li>' +
      '<li><a class="dropdown-item" href="#" onclick="Admin.updateStatus(\'' + order.id + '\',\'processing\')">Processing</a></li>' +
      '<li><a class="dropdown-item" href="#" onclick="Admin.updateStatus(\'' + order.id + '\',\'shipped\')">Shipped</a></li>' +
      '<li><a class="dropdown-item" href="#" onclick="Admin.updateStatus(\'' + order.id + '\',\'delivered\')">Delivered</a></li>' +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><a class="dropdown-item text-danger" href="#" onclick="Admin.updateStatus(\'' + order.id + '\',\'cancelled\')">Cancel Order</a></li>' +
      '</ul></div>' +
      '<button class="btn btn-outline-danger ms-2" onclick="if(confirm(\'Delete this order?\')) Admin.deleteOrder(\'' + order.id + '\')">' +
      '<i class="fas fa-trash me-1"></i>Delete</button>' +
      '</div>';

    document.getElementById('orderModalContent').innerHTML = content;
    new bootstrap.Modal(document.getElementById('orderModal')).show();
  }
  
  // Mark order as paid
  function markPaid(orderId) {
    var orders = getOrders();
    var order = orders.find(function(o) { return o.id === orderId; });
    if (order) {
      order.paymentStatus = 'paid';
      order.paidAt = new Date().toISOString();
      order.status = 'processing';
      order.paymentNotes = 'Marked as paid manually on ' + new Date().toLocaleString();
      localStorage.setItem('seva_orders', JSON.stringify(orders));
      loadOrders(document.getElementById('orderFilter').value);
      showToast('Order marked as paid!', 'success');
    }
  }
  
  // Delete order
  function deleteOrder(orderId) {
    var orders = getOrders();
    orders = orders.filter(function(o) { return o.id !== orderId; });
    localStorage.setItem('seva_orders', JSON.stringify(orders));
    loadOrders(document.getElementById('orderFilter').value);
    bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
    showToast('Order deleted', 'info');
  }

  // Update order status
  function updateStatus(orderId, status) {
    var orders = getOrders();
    var order = orders.find(function(o) { return o.id === orderId; });
    if (order) {
      order.status = status;
      localStorage.setItem('seva_orders', JSON.stringify(orders));
      loadOrders(document.getElementById('orderFilter').value);
      showToast('Status updated', 'success');
    }
  }

  // Get orders from storage
  function getOrders() {
    try {
      var stored = localStorage.getItem('seva_orders');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Get status color
  function getStatusColor(status) {
    var colors = {
      pending_payment: 'danger',
      pending: 'warning',
      processing: 'info',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'secondary'
    };
    return colors[status] || 'secondary';
  }

  // Show toast
  function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast show align-items-center text-white bg-' + type + ' border-0';
    toast.innerHTML = '<div class="d-flex"><div class="toast-body">' + message + '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>';
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(function() { if (toast.parentElement) toast.remove(); }, 3000);
  }

  // Update time
  function updateTime() {
    var el = document.getElementById('currentTime');
    if (el) el.textContent = new Date().toLocaleString();
  }

  // Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Expose public API
  window.Admin = {
    saveContent: saveContent,
    saveImages: saveImages,
    saveProducts: saveProducts,
    resetCurrentPage: resetCurrentPage,
    resetAllContent: resetAllContent,
    exportContent: exportContent,
    importContent: importContent,
    viewOrder: viewOrder,
    updateStatus: updateStatus,
    markPaid: markPaid,
    deleteOrder: deleteOrder
  };

})();
