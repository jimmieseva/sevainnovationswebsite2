const form = document.getElementById('form');
const result = document.getElementById('result');

form.addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Get form data
  const formData = new FormData(form);
  const object = Object.fromEntries(formData);
  const json = JSON.stringify(object);
  
  // Show loading state
  result.innerHTML = '<div class="alert alert-info">Sending your message...</div>';
  result.style.display = 'block';
  
  // Disable submit button
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  submitBtn.disabled = true;

  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: json
  })
  .then(async (response) => {
    let json = await response.json();
    if (response.status == 200) {
      result.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> Thank you! Your message has been sent successfully. We\'ll get back to you soon.</div>';
      form.reset();
    } else {
      console.log(response);
      result.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> ' + (json.message || 'Something went wrong. Please try again.') + '</div>';
    }
  })
  .catch(error => {
    console.log(error);
    result.innerHTML = '<div class="alert alert-danger"><i class="fas fa-times-circle"></i> Network error. Please check your connection and try again.</div>';
  })
  .finally(() => {
    // Re-enable submit button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Hide result after 5 seconds
    setTimeout(() => {
      result.style.display = 'none';
    }, 5000);
  });
});

// Add smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add navbar background on scroll
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('bg-white');
    navbar.classList.add('shadow');
  } else {
    navbar.classList.remove('bg-white');
    navbar.classList.remove('shadow');
  }
});

// Add loading animation for page
window.addEventListener('load', function() {
  document.body.classList.add('loaded');
});

// Add form validation feedback
const inputs = form.querySelectorAll('input, textarea');
inputs.forEach(input => {
  input.addEventListener('blur', function() {
    if (this.hasAttribute('required') && !this.value.trim()) {
      this.classList.add('is-invalid');
    } else {
      this.classList.remove('is-invalid');
      this.classList.add('is-valid');
    }
  });
  
  input.addEventListener('input', function() {
    if (this.classList.contains('is-invalid')) {
      this.classList.remove('is-invalid');
    }
  });
}); 