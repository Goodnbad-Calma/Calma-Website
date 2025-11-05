// Mobile menu toggle logic: keeps overlay in sync with Webflow burger
document.addEventListener('DOMContentLoaded', function () {
  const overlays = Array.from(document.querySelectorAll('.mobile-nav-content-wrapper'));
  const navButtons = Array.from(document.querySelectorAll('.w-nav-button'));

  function setOpen(open) {
    overlays.forEach((ov) => {
      ov.classList.toggle('open', open);
      ov.style.visibility = open ? 'visible' : 'hidden';
      ov.style.pointerEvents = open ? 'auto' : 'none';
    });
  }

  // Sync overlay with Webflow button state via MutationObserver
  navButtons.forEach((btn) => {
    const observer = new MutationObserver(() => {
      const isOpen = btn.classList.contains('w--open');
      setOpen(isOpen);
    });
    observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
  });

  // Also close overlay when links inside it are clicked
  document.querySelectorAll('.mobile-nav-content-wrapper a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  // Escape key closes overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
});