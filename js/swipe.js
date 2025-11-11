// Swipe-to-hide for project images (works LTR and RTL)
// Images disappear on a horizontal swipe in either direction.
// Swipe-to-preview overlay for project images (LTR/RTL compatible)
(function(){
  function ensureOverlay(){
    let overlay = document.getElementById('image-preview-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'image-preview-overlay';
      const img = document.createElement('img');
      overlay.appendChild(img);
      overlay.addEventListener('click', closeOverlay);
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function openOverlayFor(imgEl){
    const overlay = ensureOverlay();
    const overlayImg = overlay.querySelector('img');
    // Prefer currentSrc for responsive images
    overlayImg.src = imgEl.currentSrc || imgEl.src;
    overlay.classList.add('active');
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', onKeyDown);
  }

  function closeOverlay(){
    const overlay = document.getElementById('image-preview-overlay');
    if (overlay){
      overlay.classList.remove('active');
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKeyDown);
    }
  }

  function onKeyDown(e){
    if (e.key === 'Escape') closeOverlay();
  }

  function addSwipe(el){
    let startX = 0, startY = 0, startTime = 0;
    const threshold = 30; // min px distance for swipe

    function onStart(x, y){
      startX = x; startY = y; startTime = Date.now();
    }
    function onEnd(x, y){
      const dx = x - startX, dy = y - startY;
      const dt = Date.now() - startTime;
      // horizontal swipe: sufficient distance and mostly horizontal
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) && dt < 800){
        openOverlayFor(el);
      }
    }

    // Pointer events (desktop)
    el.addEventListener('pointerdown', (e)=>{
      if (e.isPrimary) onStart(e.clientX, e.clientY);
    });
    el.addEventListener('pointerup', (e)=>{
      if (e.isPrimary) onEnd(e.clientX, e.clientY);
    });

    // Touch events (mobile)
    el.addEventListener('touchstart', (e)=>{
      const t = e.changedTouches[0];
      if (t) onStart(t.clientX, t.clientY);
    }, {passive:true});
    el.addEventListener('touchend', (e)=>{
      const t = e.changedTouches[0];
      if (t) onEnd(t.clientX, t.clientY);
    });
  }

  function init(){
    const imgs = document.querySelectorAll('.residential-slider-image-wrap img');
    imgs.forEach((img)=>{
      img.classList.add('swipe-preview');
      addSwipe(img);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();