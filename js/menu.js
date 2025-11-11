// Mobile menu toggle logic: keeps overlay in sync and adds a direct trigger
document.addEventListener('DOMContentLoaded', function () {
  const overlays = Array.from(document.querySelectorAll('.mobile-nav-content-wrapper'));
  const navButtons = Array.from(document.querySelectorAll('.w-nav-button'));
  const lottieTriggers = Array.from(document.querySelectorAll('.mobile-lottie-wrapper .lottie'));

  function setOpen(open) {
    overlays.forEach((ov) => {
      ov.classList.toggle('open', open);
      // Keep overlay visible to allow slide-in/out animation; disable interaction when closed
      ov.style.pointerEvents = open ? 'auto' : 'none';
    });
    // Lock page scroll while menu is open
    document.documentElement.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
  }

  function toggleOpen() {
    const isAnyOpen = overlays.some((ov) => ov.classList.contains('open'));
    setOpen(!isAnyOpen);
  }

  // Sync overlay with Webflow button state via MutationObserver
  navButtons.forEach((btn) => {
    const observer = new MutationObserver(() => {
      const isOpen = btn.classList.contains('w--open');
      setOpen(isOpen);
    });
    observer.observe(btn, { attributes: true, attributeFilter: ['class'] });

    // Also bind a click fallback on the Webflow burger
    btn.addEventListener('click', () => {
      // Let Webflow toggle first; our observer will catch the change
      // In case Webflow is not active, toggle manually
      const currentlyOpen = overlays.some((ov) => ov.classList.contains('open'));
      // If Webflow doesn't flip class within a tick, we ensure the toggle
      setTimeout(() => {
        const stillSame = overlays.some((ov) => ov.classList.contains('open')) === currentlyOpen;
        if (stillSame) toggleOpen();
      }, 50);
    });
  });

  // Bind direct toggle on the mobile lottie trigger (div > svg)
  lottieTriggers.forEach((lt) => {
    lt.addEventListener('click', (e) => {
      // Do not prevent default or stop propagation so Webflow IX2
      // can play the Lottie animation on click.
      toggleOpen();
    });
  });

  // Close overlay when any link inside it is clicked
  document.querySelectorAll('.mobile-nav-content-wrapper a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  // Click outside content closes overlay (background area of the wrapper)
  overlays.forEach((ov) => {
    ov.addEventListener('click', (e) => {
      if (e.target === ov) setOpen(false);
    });
  });

  // Escape key closes overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
});