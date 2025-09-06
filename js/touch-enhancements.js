/**
 * Touch Screen Enhancements for Calma Website
 * Provides gesture support, touch feedback, and mobile optimizations
 */

(function() {
  'use strict';

  // Touch detection and device capabilities
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  // Touch gesture tracking
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isScrolling = false;

  /**
   * Initialize touch enhancements when DOM is ready
   */
  function initTouchEnhancements() {
    if (!isTouchDevice) return;

    // Add touch class to body for CSS targeting
    document.body.classList.add('touch-device');
    
    // Initialize touch features
    setupTouchFeedback();
    setupSwipeGestures();
    setupMobileMenuEnhancements();
    setupFormOptimizations();
    setupImageGalleryTouch();
    setupScrollOptimizations();
    
    console.log('Touch enhancements initialized');
  }

  /**
   * Add visual feedback for touch interactions
   */
  function setupTouchFeedback() {
    const touchElements = document.querySelectorAll(
      '.navlink, .button, .mobile-page-link, .language-switch-div, .page-link, .section-heading.dark.nav'
    );

    touchElements.forEach(element => {
      // Add ripple effect on touch
      element.addEventListener('touchstart', function(e) {
        createRippleEffect(this, e.touches[0]);
      }, { passive: true });

      // Add pressed state
      element.addEventListener('touchstart', function() {
        this.classList.add('touch-pressed');
      }, { passive: true });

      element.addEventListener('touchend', function() {
        this.classList.remove('touch-pressed');
      }, { passive: true });

      element.addEventListener('touchcancel', function() {
        this.classList.remove('touch-pressed');
      }, { passive: true });
    });
  }

  /**
   * Create ripple effect for touch feedback
   */
  function createRippleEffect(element, touch) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    const size = Math.max(rect.width, rect.height);
    const x = touch.clientX - rect.left - size / 2;
    const y = touch.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(100, 82, 61, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      z-index: 1000;
    `;

    // Ensure element has relative positioning
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /**
   * Setup swipe gesture detection
   */
  function setupSwipeGestures() {
    // Mobile menu swipe to close
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
      setupSwipeToClose(mobileMenu);
    }

    // Enhanced slider swipe navigation
    const sliders = document.querySelectorAll('.w-slider');
    sliders.forEach(setupSliderSwipe);

    // Image gallery swipe navigation
    const imageGalleries = document.querySelectorAll('.cta-image-wrapper, .grid-image-wrapper');
    imageGalleries.forEach(setupImageSwipe);
  }

  /**
   * Setup swipe to close for mobile menu
   */
  function setupSwipeToClose(menu) {
    menu.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isScrolling = false;
    }, { passive: true });

    menu.addEventListener('touchmove', function(e) {
      if (!touchStartX || !touchStartY) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchStartX - touchX;
      const diffY = touchStartY - touchY;

      // Determine if user is scrolling vertically
      if (Math.abs(diffY) > Math.abs(diffX)) {
        isScrolling = true;
      }
    }, { passive: true });

    menu.addEventListener('touchend', function(e) {
      if (isScrolling) return;

      touchEndX = e.changedTouches[0].clientX;
      const swipeDistance = touchStartX - touchEndX;
      const swipeThreshold = 100;

      // Swipe left to close (for RTL layout)
      if (swipeDistance > swipeThreshold) {
        closeMobileMenu();
      }

      // Reset values
      touchStartX = 0;
      touchStartY = 0;
      touchEndX = 0;
      isScrolling = false;
    }, { passive: true });
  }

  /**
   * Setup image swipe navigation
   */
  function setupImageSwipe(imageContainer) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    imageContainer.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      isDragging = true;
      this.style.transition = 'none';
    }, { passive: true });

    imageContainer.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      
      currentX = e.touches[0].clientX;
      const diffX = currentX - startX;
      
      // Apply transform for visual feedback
      this.style.transform = `translateX(${diffX * 0.3}px)`;
    }, { passive: true });

    imageContainer.addEventListener('touchend', function(e) {
      if (!isDragging) return;
      
      const endX = e.changedTouches[0].clientX;
      const diffX = endX - startX;
      const threshold = 50;

      // Reset transform
      this.style.transition = 'transform 0.3s ease';
      this.style.transform = 'translateX(0)';

      // Handle swipe actions
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          // Swipe right - previous image
          navigateImage(this, 'prev');
        } else {
          // Swipe left - next image
          navigateImage(this, 'next');
        }
      }

      isDragging = false;
    }, { passive: true });
  }

  /**
   * Setup enhanced slider swipe navigation
   */
  function setupSliderSwipe(slider) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    let isVerticalScroll = false;
    
    const sliderMask = slider.querySelector('.w-slider-mask');
    const leftArrow = slider.querySelector('.w-slider-arrow-left');
    const rightArrow = slider.querySelector('.w-slider-arrow-right');
    
    if (!sliderMask) return;

    // Enhanced touch start
    slider.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
      isVerticalScroll = false;
      
      // Disable slider autoplay during touch
      if (slider.getAttribute('data-autoplay') === 'true') {
        slider.setAttribute('data-temp-autoplay', 'true');
        slider.setAttribute('data-autoplay', 'false');
      }
    }, { passive: true });

    // Enhanced touch move with better scroll detection
    slider.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      
      currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(currentY - startY);
      
      // Determine if this is vertical scrolling
      if (diffY > diffX && diffY > 10) {
        isVerticalScroll = true;
        return;
      }
      
      // Prevent default only for horizontal swipes
      if (diffX > 10 && !isVerticalScroll) {
        e.preventDefault();
      }
    }, { passive: false });

    // Enhanced touch end with improved swipe detection
    slider.addEventListener('touchend', function(e) {
      if (!isDragging || isVerticalScroll) {
        resetSliderTouch();
        return;
      }
      
      const endX = e.changedTouches[0].clientX;
      const diffX = endX - startX;
      const swipeThreshold = 50;
      const swipeVelocityThreshold = 0.5;
      
      // Calculate swipe velocity
      const timeDiff = Date.now() - (slider._touchStartTime || Date.now());
      const velocity = Math.abs(diffX) / timeDiff;
      
      // Trigger navigation based on swipe direction and velocity
      if (Math.abs(diffX) > swipeThreshold || velocity > swipeVelocityThreshold) {
        if (diffX > 0) {
          // Swipe right - previous slide
          if (leftArrow) leftArrow.click();
        } else {
          // Swipe left - next slide
          if (rightArrow) rightArrow.click();
        }
      }
      
      resetSliderTouch();
    }, { passive: true });
    
    function resetSliderTouch() {
      isDragging = false;
      isVerticalScroll = false;
      
      // Restore autoplay if it was temporarily disabled
      if (slider.getAttribute('data-temp-autoplay') === 'true') {
        slider.setAttribute('data-autoplay', 'true');
        slider.removeAttribute('data-temp-autoplay');
      }
    }
  }

  /**
   * Navigate between images (placeholder for future gallery implementation)
   */
  function navigateImage(container, direction) {
    // Add visual feedback
    container.style.transform = direction === 'next' ? 'scale(0.95)' : 'scale(1.05)';
    
    setTimeout(() => {
      container.style.transform = 'scale(1)';
    }, 200);

    // Dispatch custom event for other scripts to handle
    const event = new CustomEvent('imageNavigate', {
      detail: { direction, container }
    });
    document.dispatchEvent(event);
  }

  /**
   * Close mobile menu
   */
  function closeMobileMenu() {
    const menuButton = document.querySelector('.w-nav-button');
    if (menuButton && menuButton.classList.contains('w--open')) {
      menuButton.click();
    }
  }

  /**
   * Enhance mobile menu interactions
   */
  function setupMobileMenuEnhancements() {
    const menuButton = document.querySelector('.w-nav-button');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (menuButton) {
      // Add haptic feedback for iOS
      menuButton.addEventListener('touchstart', function() {
        if (isIOS && window.navigator.vibrate) {
          window.navigator.vibrate(10);
        }
      }, { passive: true });

      // Improve menu button accessibility
      menuButton.setAttribute('aria-label', 'Toggle navigation menu');
    }

    // Prevent body scroll when menu is open
    if (mobileMenu) {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = mobileMenu.style.display !== 'none' && 
                            mobileMenu.style.visibility !== 'hidden';
            
            if (isVisible) {
              document.body.style.overflow = 'hidden';
            } else {
              document.body.style.overflow = '';
            }
          }
        });
      });

      observer.observe(mobileMenu, {
        attributes: true,
        attributeFilter: ['style']
      });
    }
  }

  /**
   * Optimize forms for touch input
   */
  function setupFormOptimizations() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Prevent zoom on iOS
      if (isIOS) {
        input.addEventListener('focus', function() {
          this.style.fontSize = '16px';
        });
      }

      // Add touch-friendly focus behavior
      input.addEventListener('touchstart', function() {
        this.focus();
      }, { passive: true });
    });
  }

  /**
   * Setup scroll optimizations for touch devices
   */
  function setupScrollOptimizations() {
    // Smooth scroll behavior for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          e.preventDefault();
          
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    // Optimize scroll performance
    let ticking = false;
    
    function updateScrollPosition() {
      // Add scroll-based classes for animations
      const scrollY = window.pageYOffset;
      
      if (scrollY > 100) {
        document.body.classList.add('scrolled');
      } else {
        document.body.classList.remove('scrolled');
      }
      
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    }, { passive: true });
  }

  /**
   * Add CSS animations for ripple effect
   */
  function addRippleStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
      
      .touch-pressed {
        transform: scale(0.98) !important;
        transition: transform 0.1s ease !important;
      }
      
      .touch-device .scrolled .navbar {
        backdrop-filter: blur(10px);
        background-color: rgba(9, 29, 30, 0.9);
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initTouchEnhancements();
      addRippleStyles();
    });
  } else {
    initTouchEnhancements();
    addRippleStyles();
  }

  // Export functions for external use
  window.TouchEnhancements = {
    createRippleEffect,
    closeMobileMenu,
    isTouchDevice
  };

})();