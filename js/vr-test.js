// Lightweight visual regression checks for mirrored EN/AR layouts
// Compares cell widths and alignment to catch discrepancies quickly.
(function(){
  function runChecks(){
    const stacks = Array.from(document.querySelectorAll('.residential-quick-stack'));
    let widthMismatches = 0;
    let alignmentIssues = 0;

    stacks.forEach((stack)=>{
      const cells = stack.querySelectorAll(':scope > .w-layout-cell');
      if (cells.length >= 2){
        const w0 = cells[0].getBoundingClientRect().width;
        const w1 = cells[1].getBoundingClientRect().width;
        const diff = Math.abs(w0 - w1);
        if (diff > 8) widthMismatches++;
      }
    });

    if (document.dir === 'rtl'){
      document.querySelectorAll('.project-details-div').forEach((el)=>{
        const ta = getComputedStyle(el).textAlign;
        if (ta !== 'right') alignmentIssues++;
      });
    } else {
      document.querySelectorAll('.project-details-div').forEach((el)=>{
        const ta = getComputedStyle(el).textAlign;
        if (ta !== 'left') alignmentIssues++;
      });
    }

    // Report overlay (non-intrusive) — commented out
    /*
    const overlay = document.createElement('div');
    overlay.setAttribute('id', 'vr-overlay');
    overlay.style.position = 'fixed';
    overlay.style.bottom = '12px';
    overlay.style.right = '12px';
    overlay.style.padding = '10px 12px';
    overlay.style.borderRadius = '8px';
    overlay.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    overlay.style.fontSize = '12px';
    overlay.style.background = 'rgba(0,0,0,0.65)';
    overlay.style.color = '#fff';
    overlay.style.zIndex = '99999';
    overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    overlay.style.pointerEvents = 'none';
    overlay.textContent = `VR: width mismatches=${widthMismatches}, alignment issues=${alignmentIssues}, dir=${document.dir || 'ltr'}`;
    // Remove previous overlay if present
    const prev = document.getElementById('vr-overlay');
    if (prev) prev.remove();
    document.body.appendChild(overlay);
    */
  }

  const init = () => {
    runChecks();
    // Re-run on resize to validate responsiveness
    window.addEventListener('resize', () => {
      // debounce
      clearTimeout(runChecks._t);
      runChecks._t = setTimeout(runChecks, 150);
    });
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();