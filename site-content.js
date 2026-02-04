/**
 * Site Content Management System
 * Stores and retrieves editable content for the website
 * Uses localStorage for persistence
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'seva_site_content';

  // Default content structure
  var DEFAULT_CONTENT = {
    // Home page
    home: {
      heroTitle: 'SEVA Innovations',
      heroSubtitle: 'Defense Technology Solutions',
      heroDescription: 'Providing cutting-edge technology solutions for defense and security sectors.',
      aboutTitle: 'About SEVA Innovations',
      aboutText: 'SEVA Innovations delivers advanced technology solutions for defense, security, and enterprise clients worldwide.'
    },
    
    // About page
    about: {
      pageTitle: 'About Us',
      heroTitle: 'About SEVA Innovations',
      heroSubtitle: 'Our Mission & Vision',
      missionTitle: 'Our Mission',
      missionText: 'To deliver innovative technology solutions that enhance operational capabilities and security for our clients.',
      visionTitle: 'Our Vision',
      visionText: 'To be the leading provider of defense and security technology solutions worldwide.',
      historyTitle: 'Our History',
      historyText: 'Founded with a commitment to excellence, SEVA Innovations has grown to become a trusted partner in defense technology.'
    },
    
    // TactiLink page
    tactilink: {
      heroTitle: 'TactiLink Voice Intelligence Platform',
      heroSubtitle: 'Advanced tactical voice intelligence platform enabling real-time communication analysis.',
      productTitle: 'TactiLink Cables & Accessories',
      productSubtitle: 'Professional-grade cables designed for TactiLink Voice Intelligence Platform integration',
      cableUsbcName: 'TactiLink Cable - USB-C',
      cableUsbcDesc: 'Professional-grade cable with USB-C connector. 6ft length, shielded, military-grade.',
      cableUsbcPrice: '150.00',
      cableUsbaName: 'TactiLink Cable - USB-A',
      cableUsbaDesc: 'Professional-grade cable with USB-A connector. 6ft length, shielded, military-grade.',
      cableUsbaPrice: '150.00',
      kitName: 'TactiLink Professional Kit',
      kitDesc: 'Complete solution: RS-232C cable, Tablet PC, adapters, and installation guide.',
      kitPrice: '3500.00'
    },
    
    // LMS page
    lms: {
      heroTitle: 'Logistics Management System',
      heroSubtitle: 'Comprehensive logistics and supply chain management solutions.',
      featuresTitle: 'Key Features',
      featuresText: 'Advanced tracking, inventory management, and real-time analytics for your logistics operations.'
    },
    
    // DMS page
    dms: {
      heroTitle: 'Document Management System',
      heroSubtitle: 'Secure document management and workflow automation.',
      featuresTitle: 'Key Features',
      featuresText: 'Streamline your document workflows with our comprehensive management solution.'
    },
    
    // AI Situational Awareness page
    aiAwareness: {
      heroTitle: 'AI Situational Awareness',
      heroSubtitle: 'Advanced AI-powered situational awareness and threat detection.',
      featuresTitle: 'Capabilities',
      featuresText: 'Real-time threat assessment and analysis powered by advanced artificial intelligence.'
    },
    
    // Global settings
    global: {
      companyName: 'SEVA Innovations',
      tagline: 'Defense Technology Solutions',
      contactEmail: 'contact@seva-innovations.com',
      contactPhone: '+1 (555) 123-4567',
      address: '123 Technology Drive, Suite 100',
      city: 'Washington, DC 20001',
      copyrightYear: '2026',
      footerText: 'All Rights Reserved.'
    },
    
    // Images
    images: {
      logo: 'ImageDump/image36.png',
      heroHome: 'ImageDump/image1.png',
      tactilink: 'ImageDump/Tactilink.jpg',
      tactilinkKit: 'ImageDump/tablet-latitude-12-7230-black-gallery-4.avif',
      lms: 'LMS PHOTOS/warehouseunsplash.jpg',
      dms: 'ImageDump/image2.png',
      aiAwareness: 'ImageDump/image3.png'
    }
  };

  // Load content from storage
  function loadContent() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        // Merge with defaults to ensure all keys exist
        return deepMerge(DEFAULT_CONTENT, parsed);
      }
    } catch (e) {
      console.error('Error loading content:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  }

  // Save content to storage
  function saveContent(content) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      return true;
    } catch (e) {
      console.error('Error saving content:', e);
      return false;
    }
  }

  // Deep merge objects
  function deepMerge(target, source) {
    var result = JSON.parse(JSON.stringify(target));
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  // Get content for a specific page/section
  function getContent(page, key) {
    var content = loadContent();
    if (page && key) {
      return content[page] && content[page][key] !== undefined ? content[page][key] : null;
    } else if (page) {
      return content[page] || null;
    }
    return content;
  }

  // Update content for a specific page/section
  function updateContent(page, key, value) {
    var content = loadContent();
    if (!content[page]) {
      content[page] = {};
    }
    content[page][key] = value;
    return saveContent(content);
  }

  // Update entire page content
  function updatePageContent(page, pageContent) {
    var content = loadContent();
    content[page] = pageContent;
    return saveContent(content);
  }

  // Reset to defaults
  function resetToDefaults() {
    return saveContent(JSON.parse(JSON.stringify(DEFAULT_CONTENT)));
  }

  // Reset specific page to defaults
  function resetPageToDefaults(page) {
    var content = loadContent();
    if (DEFAULT_CONTENT[page]) {
      content[page] = JSON.parse(JSON.stringify(DEFAULT_CONTENT[page]));
      return saveContent(content);
    }
    return false;
  }

  // Get all page names
  function getPageNames() {
    return Object.keys(DEFAULT_CONTENT);
  }

  // Get default content
  function getDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  }

  // Apply content to page elements (call on page load)
  function applyContent(page) {
    var content = loadContent();
    var pageContent = content[page];
    var globalContent = content.global;
    var images = content.images;

    if (!pageContent) return;

    // Apply text content
    document.querySelectorAll('[data-content]').forEach(function(el) {
      var key = el.getAttribute('data-content');
      if (pageContent[key] !== undefined) {
        el.textContent = pageContent[key];
      } else if (globalContent[key] !== undefined) {
        el.textContent = globalContent[key];
      }
    });

    // Apply HTML content
    document.querySelectorAll('[data-content-html]').forEach(function(el) {
      var key = el.getAttribute('data-content-html');
      if (pageContent[key] !== undefined) {
        el.innerHTML = pageContent[key];
      } else if (globalContent[key] !== undefined) {
        el.innerHTML = globalContent[key];
      }
    });

    // Apply image sources
    document.querySelectorAll('[data-image]').forEach(function(el) {
      var key = el.getAttribute('data-image');
      if (images[key] !== undefined) {
        el.src = images[key];
      }
    });

    // Apply background images
    document.querySelectorAll('[data-bg-image]').forEach(function(el) {
      var key = el.getAttribute('data-bg-image');
      if (images[key] !== undefined) {
        el.style.backgroundImage = 'url(' + images[key] + ')';
      }
    });
  }

  // Export public API
  window.SiteContent = {
    get: getContent,
    update: updateContent,
    updatePage: updatePageContent,
    reset: resetToDefaults,
    resetPage: resetPageToDefaults,
    getPageNames: getPageNames,
    getDefaults: getDefaults,
    apply: applyContent,
    load: loadContent,
    save: saveContent
  };

})();
