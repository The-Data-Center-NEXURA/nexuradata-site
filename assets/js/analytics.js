// Vercel Web Analytics - Standalone initialization
(function() {
  'use strict';
  
  // Initialize the analytics queue
  if (!window.va) {
    window.va = function(...params) {
      if (!window.vaq) window.vaq = [];
      window.vaq.push(params);
    };
  }
  
  // Inject the analytics script
  var script = document.createElement('script');
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  script.dataset.sdkn = '@vercel/analytics';
  script.dataset.sdkv = '2.0.1';
  
  script.onerror = function() {
    console.log('[Vercel Web Analytics] Failed to load. Please ensure Web Analytics is enabled in your Vercel project settings.');
  };
  
  // Only add if not already present
  if (!document.head.querySelector('script[src*="/_vercel/insights/script.js"]')) {
    document.head.appendChild(script);
  }
})();
