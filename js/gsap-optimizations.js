/**
 * GSAP Animation Optimizations
 * Consolidated and performance-optimized animations for Calma website
 * Reduces redundant code and improves animation performance
 */

// Performance optimization: Use will-change CSS property for animated elements
function addWillChange(elements, properties = 'transform, opacity') {
  elements.forEach(el => {
    if (el) el.style.willChange = properties;
  });
}

// Remove will-change after animation completes to free up resources
function removeWillChange(elements) {
  elements.forEach(el => {
    if (el) el.style.willChange = 'auto';
  });
}

// Optimized batch animation function
function createOptimizedScrollTrigger(elements, animationProps, triggerProps = {}) {
  if (!elements || elements.length === 0) return;
  
  const defaultTriggerProps = {
    start: "top 85%",
    toggleActions: "play none none none",
    once: true,
    ...triggerProps
  };
  
  // Add will-change before animation
  addWillChange(elements);
  
  return gsap.fromTo(elements, 
    animationProps.from || {},
    {
      ...animationProps.to,
      scrollTrigger: {
        trigger: elements[0],
        ...defaultTriggerProps
      },
      onComplete: () => {
        // Remove will-change after animation
        removeWillChange(elements);
        if (animationProps.onComplete) animationProps.onComplete();
      }
    }
  );
}

// Consolidated image animations with performance optimizations
function initOptimizedImageAnimations() {
  // Slider images with stagger optimization
  const sliderImages = document.querySelectorAll(".image-wrapper.slider");
  if (sliderImages.length > 0) {
    createOptimizedScrollTrigger(sliderImages, {
      from: { scale: 1.1, filter: "blur(10px)", opacity: 0 },
      to: {
        scale: 1,
        filter: "blur(0px)",
        opacity: 1,
        duration: 1.2, // Reduced from 1.5s
        ease: "power2.out", // Changed from power3.out for better performance
        stagger: 0.15 // Reduced from 0.2s
      }
    }, { start: "top 80%" });
  }
  
  // Portrait and wide images - batch processing
  const imageConfigs = [
    {
      selector: ".image-wrapper.portrait",
      from: { y: 100, scale: 0.9, opacity: 0 },
      to: { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" }
    },
    {
      selector: ".wide-image-wrapper",
      from: { x: 100, scale: 1.1, opacity: 0 },
      to: { x: 0, scale: 1, opacity: 1, duration: 1.3, ease: "power2.out" }
    },
    {
      selector: ".cta-image-wrapper",
      from: { y: 100, scale: 1.1, opacity: 0 },
      to: { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" },
      trigger: ".cta-right-grid"
    },
    {
      selector: ".section-hero-image-wrapper",
      from: { opacity: 0, y: 100, scale: 1.1 },
      to: { opacity: 1, y: 0, scale: 1, duration: 1, delay: 0.6, ease: "power2.out" }
    },
    {
      selector: ".ceo-image-wrapper",
      from: { x: 100, opacity: 0, scale: 0.95 },
      to: { x: 0, opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" }
    }
  ];
  
  imageConfigs.forEach(config => {
    const elements = document.querySelectorAll(config.selector);
    if (elements.length > 0) {
      createOptimizedScrollTrigger(elements, {
        from: config.from,
        to: config.to
      }, config.trigger ? { trigger: config.trigger } : {});
    }
  });
  
  // Batch process multiple image wrapper types
  const imageWrapperSelectors = [
    ".right-image-wrapper",
    ".brand-logo-wrapper", 
    ".quick-stack-img-wrapper",
    ".residential-slider-image-wrap",
    ".grid-image-wrapper",
    ".commercial-project-img-wrapper"
  ];
  
  imageWrapperSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      createOptimizedScrollTrigger(elements, {
        from: { y: 60, opacity: 0 }, // Reduced from 80px
        to: { y: 0, opacity: 1, duration: 1, ease: "power2.out", stagger: 0.1 }
      });
    }
  });
}

// Optimized text animations with reduced DOM queries
function initOptimizedTextAnimations() {
  // Batch process heading animations
  const headingSelectors = [
    ".section-name", ".section-heading", ".pattern-heading",
    ".stats-heading", ".status-heading", ".cta-heading",
    ".project-grid-name", ".stats", ".page-hero-heading", ".project-heading"
  ];
  
  const allHeadings = headingSelectors.flatMap(selector => 
    Array.from(document.querySelectorAll(selector))
  );
  
  allHeadings.forEach(el => {
    if (!el.dataset.splitDone) {
      const split = new SplitType(el, { types: "words", tagName: "span" });
      el.dataset.splitDone = "true";
      
      addWillChange(split.words);
      
      gsap.from(split.words, {
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
          once: true
        },
        opacity: 0,
        y: 40, // Reduced from 60px
        skewY: 3, // Reduced from 6 degrees
        stagger: 0.03, // Reduced from 0.05s
        duration: 0.8, // Reduced from 1s
        ease: "power2.out",
        onComplete: () => removeWillChange(split.words)
      });
    }
  });
  
  // Batch process fade-in elements
  const fadeInSelectors = [
    ".pattern-sub-heading", ".project-sub-heading", ".paragraph",
    ".stats-sub-heading", ".sub-heading", ".button"
  ];
  
  const allFadeElements = fadeInSelectors.flatMap(selector => 
    Array.from(document.querySelectorAll(selector))
  );
  
  if (allFadeElements.length > 0) {
    createOptimizedScrollTrigger(allFadeElements, {
      from: { opacity: 0, y: 20 }, // Reduced from 30px
      to: { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.05 }
    }, { start: "top 90%" });
  }
  
  // Batch process logo/icon animations
  const logoSelectors = [
    ".center-logo-wrapper", ".center-logo-calma", 
    ".calma-logo-wrapper", ".grid-icon"
  ];
  
  const allLogos = logoSelectors.flatMap(selector => 
    Array.from(document.querySelectorAll(selector))
  );
  
  if (allLogos.length > 0) {
    createOptimizedScrollTrigger(allLogos, {
      from: { scale: 0.9, opacity: 0 }, // Reduced from 0.85
      to: { scale: 1, opacity: 1, duration: 0.8, ease: "power2.out", stagger: 0.1 }
    });
  }
}

// Optimized footer animation with reduced complexity
function initOptimizedFooterAnimation() {
  const footer = document.querySelector(".footer");
  if (!footer) return;
  
  const footerElements = {
    logo: footer.querySelector(".footer-logo-div"),
    leftGrid: footer.querySelector(".footer-left-grid"),
    downloadHeading: footer.querySelector(".download-heading"),
    downloadTexts: footer.querySelectorAll(".download-text"),
    lines: footer.querySelectorAll(".line.footer"),
    middleDiv: footer.querySelector(".footer-middle-div"),
    footerTexts: footer.querySelectorAll(".footer-text"),
    bottomDiv: footer.querySelector(".footer-bottom-div"),
    termsHeadings: footer.querySelectorAll(".terms-heading"),
    icons: footer.querySelectorAll(".icon")
  };
  
  // Add will-change to all footer elements
  Object.values(footerElements).forEach(el => {
    if (el && el.length) {
      addWillChange(Array.from(el));
    } else if (el) {
      addWillChange([el]);
    }
  });
  
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: footer,
      start: "top 80%",
      once: true
    },
    onComplete: () => {
      // Remove will-change after animation
      Object.values(footerElements).forEach(el => {
        if (el && el.length) {
          removeWillChange(Array.from(el));
        } else if (el) {
          removeWillChange([el]);
        }
      });
    }
  });
  
  // Simplified footer timeline with reduced durations
  tl.from(footerElements.logo, { y: 30, opacity: 0, duration: 0.6, ease: "power2.out" })
    .from(footerElements.leftGrid, { y: 30, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.4")
    .from(footerElements.downloadHeading, { y: 20, opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
    .from(footerElements.downloadTexts, { y: 15, opacity: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" }, "-=0.3")
    .from(footerElements.lines, { scaleX: 0, transformOrigin: "left", opacity: 0, duration: 0.4, ease: "power2.out" }, "-=0.3")
    .from(footerElements.middleDiv, { y: 25, opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.2")
    .from(footerElements.footerTexts, { y: 15, opacity: 0, stagger: 0.03, duration: 0.4, ease: "power2.out" }, "-=0.2")
    .from(footerElements.bottomDiv, { y: 25, opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
    .from(footerElements.termsHeadings, { y: 15, opacity: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" }, "-=0.3")
    .from(footerElements.icons, { y: 15, opacity: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" }, "-=0.3");
}

// Optimized stats animation
function initOptimizedStatsAnimation() {
  const statsContainers = document.querySelectorAll(".location.stats.div");
  
  statsContainers.forEach(container => {
    const lines = container.querySelectorAll(".line");
    const stats = container.querySelectorAll(".stats");
    
    if (lines.length === 0 && stats.length === 0) return;
    
    addWillChange([...lines, ...stats]);
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        toggleActions: "play none none none",
        once: true
      },
      onComplete: () => removeWillChange([...lines, ...stats])
    });
    
    // Simplified animation with reduced durations
    if (lines.length > 0) {
      tl.from(lines, {
        opacity: 0,
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.3,
        stagger: 0.1,
        ease: "power2.out"
      });
    }
    
    if (stats.length > 0) {
      tl.from(stats, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.1,
        ease: "power2.out"
      }, "-=0.2");
    }
  });
}

// Main initialization function
function initGSAPOptimizations() {
  // Only run if GSAP and ScrollTrigger are available
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP or ScrollTrigger not loaded. Skipping optimized animations.');
    return;
  }
  
  gsap.registerPlugin(ScrollTrigger);
  
  // Set global GSAP defaults for better performance
  gsap.defaults({
    ease: "power2.out",
    duration: 0.8
  });
  
  // Initialize all optimized animations
  initOptimizedImageAnimations();
  initOptimizedTextAnimations();
  initOptimizedFooterAnimation();
  initOptimizedStatsAnimation();
  
  // Refresh ScrollTrigger after all animations are set up
  ScrollTrigger.refresh();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initGSAPOptimizations };
} else {
  window.initGSAPOptimizations = initGSAPOptimizations;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGSAPOptimizations);
} else {
  initGSAPOptimizations();
}