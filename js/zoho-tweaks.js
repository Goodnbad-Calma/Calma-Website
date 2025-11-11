// Lightweight tweaks for Zoho SalesIQ bubble positioning
(function() {
  function injectStyle() {
    var css = [
      '.zsiq_float, .siq-cta-container, .siq-ctn-fixed {',
      '  right: 20px !important;',
      '  bottom: 20px !important;',
      '}',
      '[dir="rtl"] .zsiq_float, [dir="rtl"] .siq-cta-container, [dir="rtl"] .siq-ctn-fixed {',
      '  left: 20px !important;',
      '  right: auto !important;',
      '}',
      '@media (max-width: 480px) {',
      '  .zsiq_float, .siq-cta-container, .siq-ctn-fixed {',
      '    right: 12px !important;',
      '    bottom: 12px !important;',
      '  }',
      '  [dir="rtl"] .zsiq_float, [dir="rtl"] .siq-cta-container, [dir="rtl"] .siq-ctn-fixed {',
      '    left: 12px !important;',
      '  }',
      '}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'zoho-tweaks-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function tryAdjustClass() {
    var w = document.getElementById('zsiqwidget');
    if (!w) return;
    // Prefer fixed positioning classes to ensure inset spacing applies
    var float = w.querySelector('.zsiq_float');
    if (float && !float.classList.contains('zsiq_fixed')) {
      float.classList.add('zsiq_fixed');
    }
  }

  function init() {
    injectStyle();
    tryAdjustClass();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // In case SalesIQ injects after DOM ready, re-run a few times
  var attempts = 0;
  var timer = setInterval(function() {
    attempts++;
    tryAdjustClass();
    if (attempts > 10) clearInterval(timer);
  }, 800);
})();