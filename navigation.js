// Shared Navigation Component
// This script creates consistent navigation across all pages

function createNavigation(currentPage = '') {
  // Define navigation items
  const navItems = [
    { href: 'Index.html', label: 'Home', id: 'home' },
    { href: 'about.html', label: 'About', id: 'about' },
    { href: 'tactilink.html', label: 'TactiLink', id: 'tactilink' },
    { href: 'lms.html', label: 'LMS', id: 'lms' },
    { href: 'ai-situational-awareness.html', label: 'AI Awareness', id: 'ai-awareness' },
    { href: 'dms.html', label: 'DMS', id: 'dms' },
    { href: 'Index.html#contact', label: 'Contact', id: 'contact' }
  ];
  
  // Determine current page ID
  const currentPageId = currentPage || getCurrentPageId();
  
  // Build navigation HTML
  let navHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div class="container">
        <a class="navbar-brand" href="Index.html">
          <img src="ImageDump/image36.png" 
               alt="SEVA Innovations Logo" width="200" height="100"/>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto align-items-center">
  `;
  
  // Add navigation items
  navItems.forEach(item => {
    const isActive = currentPageId === item.id ? 'active' : '';
    navHTML += `
            <li class="nav-item">
              <a class="nav-link ${isActive}" href="${item.href}">${item.label}</a>
            </li>
    `;
  });
  
  // Add Account link (login/account page only, no admin link for security)
  navHTML += `
            <li class="nav-item">
              <a class="nav-link" href="customer-login.html">
                <i class="fas fa-user me-1"></i>Account
              </a>
            </li>
  `;
  
  // Add shopping cart button if on tactilink page
  if (currentPageId === 'tactilink') {
    navHTML += `
            <li class="nav-item">
              <button class="btn btn-outline-primary position-relative ms-2" onclick="if(typeof openCart === 'function') openCart(); else window.location.href='tactilink.html';" type="button">
                <i class="fas fa-shopping-cart"></i>
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="cart-badge" style="display: none;">0</span>
              </button>
            </li>
    `;
  }
  
  navHTML += `
          </ul>
        </div>
      </div>
    </nav>
  `;
  
  return navHTML;
}

// Get current page ID from URL
function getCurrentPageId() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'Index.html';
  
  const pageMap = {
    'Index.html': 'home',
    'index.html': 'home',
    'about.html': 'about',
    'tactilink.html': 'tactilink',
    'lms.html': 'lms',
    'ai-situational-awareness.html': 'ai-awareness',
    'dms.html': 'dms',
    'cloud-integration.html': 'cloud-integration',
    'customer-login.html': 'account',
    'admin.html': 'admin'
  };
  
  return pageMap[filename] || '';
}

// Initialize navigation
function initNavigation(currentPage = '') {
  // Find existing navbar or create container
  const existingNav = document.querySelector('nav.navbar');
  if (existingNav) {
    const navHTML = createNavigation(currentPage);
    existingNav.outerHTML = navHTML;
  } else {
    // Insert at beginning of body if no nav exists
    const navHTML = createNavigation(currentPage);
    document.body.insertAdjacentHTML('afterbegin', navHTML);
  }
}

// Auto-initialize on DOM load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initNavigation();
    });
  } else {
    initNavigation();
  }
}

// Export for manual use
if (typeof window !== 'undefined') {
  window.Navigation = {
    createNavigation,
    initNavigation,
    getCurrentPageId
  };
}
