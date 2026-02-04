/**
 * Contact Form Handler using Web3Forms
 * Sends emails to: connect@seva-innovations.com
 * 
 * SETUP:
 * 1. Go to https://web3forms.com/
 * 2. Enter: connect@seva-innovations.com
 * 3. Verify your email
 * 4. Copy the Access Key
 * 5. Replace YOUR_WEB3FORMS_KEY in Index.html with your key
 */

(function() {
  'use strict';

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    initContactForm();
    initSmoothScrolling();
    initNavbarScroll();
  });

  function initContactForm() {
    var form = document.getElementById('form');
    var result = document.getElementById('result');
    
    if (!form) {
      console.log('Contact form not found on this page');
      return;
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Check for access key
      var accessKey = form.querySelector('input[name="access_key"]');
      if (!accessKey || accessKey.value === 'YOUR_WEB3FORMS_KEY') {
        showResult('warning', 'Contact form not configured. Please set up Web3Forms access key.');
        console.error('Web3Forms access key not configured. See formsubmit.js for instructions.');
        return;
      }

      // Get form data
      var formData = new FormData(form);
      var object = Object.fromEntries(formData);
      var json = JSON.stringify(object);

      // Show loading state
      showResult('info', '<i class="fas fa-spinner fa-spin me-2"></i>Sending your message...');
      
      // Disable submit button
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
      submitBtn.disabled = true;

      // Send to Web3Forms
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: json
      })
      .then(function(response) {
        return response.json().then(function(data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function(result) {
        if (result.ok) {
          showResult('success', '<i class="fas fa-check-circle me-2"></i><strong>Thank you!</strong> Your message has been sent to connect@seva-innovations.com. We\'ll get back to you soon.');
          form.reset();
        } else {
          showResult('warning', '<i class="fas fa-exclamation-triangle me-2"></i>' + (result.data.message || 'Something went wrong. Please try again.'));
        }
      })
      .catch(function(error) {
        console.error('Form submission error:', error);
        showResult('danger', '<i class="fas fa-times-circle me-2"></i>Network error. Please check your connection and try again.');
      })
      .finally(function() {
        // Re-enable submit button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      });
    });

    // Add input validation feedback
    var inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(function(input) {
      input.addEventListener('blur', function() {
        if (!this.value.trim()) {
          this.classList.add('is-invalid');
          this.classList.remove('is-valid');
        } else {
          this.classList.remove('is-invalid');
          this.classList.add('is-valid');
        }
      });

      input.addEventListener('input', function() {
        if (this.classList.contains('is-invalid') && this.value.trim()) {
          this.classList.remove('is-invalid');
        }
      });
    });

    function showResult(type, message) {
      if (!result) return;
      result.className = 'alert alert-' + type + ' mt-3';
      result.innerHTML = message;
      result.style.display = 'block';
      
      // Auto-hide success/info messages
      if (type === 'success') {
        setTimeout(function() {
          result.style.display = 'none';
        }, 8000);
      }
    }
  }

  // Smooth scrolling for anchor links
  function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // Navbar background on scroll
  function initNavbarScroll() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;

    function updateNavbar() {
      if (window.scrollY > 50) {
        navbar.classList.add('bg-white', 'shadow');
      } else {
        navbar.classList.remove('bg-white', 'shadow');
      }
    }

    window.addEventListener('scroll', updateNavbar);
    updateNavbar(); // Initial check
  }

})();
