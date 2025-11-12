/**
 * Smooothy initializer
 * - Gracefully initializes sliders and transitions if library and hooks exist
 * - No-ops if elements or lib are absent; safe for all pages
 */
(function(){
  function init(){
    try {
      // Support both ESM import and global
      var SmooothyLib = window.Smooothy || window.smooothy || null;
      if (!SmooothyLib) return; // library not present

      // Basic slider init: any element with `.smooothy-slider`
      var sliders = document.querySelectorAll('.smooothy-slider');
      sliders.forEach(function(el){
        try {
          // API safety: attempt common constructor signatures
          var instance = null;
          if (typeof SmooothyLib === 'function') {
            instance = new SmooothyLib(el, { loop: true, drag: true, autoplay: false });
          } else if (SmooothyLib && typeof SmooothyLib.create === 'function') {
            instance = SmooothyLib.create(el, { loop: true, drag: true, autoplay: false });
          }
          if (instance && typeof instance.update === 'function') {
            instance.update();
          }
        } catch(_){}
      });

      // Transition hooks: elements with `.smooothy-transition`
      var transitions = document.querySelectorAll('.smooothy-transition');
      transitions.forEach(function(el){
        try {
          el.style.willChange = 'transform, opacity';
        } catch(_){}
      });
    } catch(_){}
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();