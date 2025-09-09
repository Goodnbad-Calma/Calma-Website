/**
 * Enhanced Slider Functionality
 * Handles auto-flip for non-speaker sliders and background detection
 */

(function() {
  'use strict';

  // Configuration
  const AUTO_FLIP_INTERVAL = 4000; // 4 seconds
  const BACKGROUND_DETECTION_THRESHOLD = 128; // RGB threshold for dark/light detection

  /**
   * Initialize slider enhancements
   */
  function initSliderEnhancements() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupSliders);
    } else {
      setupSliders();
    }
  }

  /**
   * Setup all sliders with appropriate functionality
   */
  function setupSliders() {
    const allSliders = document.querySelectorAll('.w-slider');
    
    allSliders.forEach(slider => {
      if (slider.classList.contains('speaker-slider')) {
        // Speaker slider keeps manual controls and touch
        setupSpeakerSlider(slider);
      } else {
        // Other sliders get auto-flip functionality
        setupAutoFlipSlider(slider);
      }
    });

    // Setup background detection for arrow assets
    setupBackgroundDetection();
  }

  /**
   * Setup speaker slider with enhanced touch and arrow functionality
   */
  function setupSpeakerSlider(slider) {
    // Enable touch functionality
    enableTouchNavigation(slider);
    
    // Setup arrow click handlers
    const leftArrow = slider.querySelector('.w-slider-arrow-left');
    const rightArrow = slider.querySelector('.w-slider-arrow-right');
    
    if (leftArrow) {
      leftArrow.addEventListener('click', () => navigateSlider(slider, 'prev'));
    }
    
    if (rightArrow) {
      rightArrow.addEventListener('click', () => navigateSlider(slider, 'next'));
    }

    // Pause auto-flip on hover/touch
    slider.addEventListener('mouseenter', () => pauseSlider(slider));
    slider.addEventListener('mouseleave', () => resumeSlider(slider));
    slider.addEventListener('touchstart', () => pauseSlider(slider));
    slider.addEventListener('touchend', () => {
      setTimeout(() => resumeSlider(slider), 2000); // Resume after 2 seconds
    });
  }

  /**
   * Setup auto-flip functionality for non-speaker sliders
   */
  function setupAutoFlipSlider(slider) {
    // Disable manual arrows (already hidden by CSS)
    const arrows = slider.querySelectorAll('.w-slider-arrow-left, .w-slider-arrow-right');
    arrows.forEach(arrow => {
      arrow.style.pointerEvents = 'none';
    });

    // Enable touch functionality
    enableTouchNavigation(slider);

    // Start auto-flip
    startAutoFlip(slider);

    // Pause on hover/interaction
    slider.addEventListener('mouseenter', () => pauseSlider(slider));
    slider.addEventListener('mouseleave', () => resumeSlider(slider));
    slider.addEventListener('touchstart', () => pauseSlider(slider));
    slider.addEventListener('touchend', () => {
      setTimeout(() => resumeSlider(slider), 3000); // Resume after 3 seconds
    });
  }

  /**
   * Enable touch navigation for sliders
   */
  function enableTouchNavigation(slider) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let isVerticalScroll = false;

    slider.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
      isVerticalScroll = false;
    }, { passive: true });

    slider.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      
      const currentX = e.touches[0].clientX;
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

    slider.addEventListener('touchend', function(e) {
      if (!isDragging || isVerticalScroll) {
        isDragging = false;
        return;
      }
      
      const endX = e.changedTouches[0].clientX;
      const diffX = endX - startX;
      const swipeThreshold = 50;
      
      if (Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) {
          navigateSlider(slider, 'prev');
        } else {
          navigateSlider(slider, 'next');
        }
      }
      
      isDragging = false;
    }, { passive: true });
  }

  /**
   * Navigate slider programmatically
   */
  function navigateSlider(slider, direction) {
    const slides = slider.querySelectorAll('.w-slide');
    const currentSlide = slider.querySelector('.w-slide.w--current') || slides[0];
    const currentIndex = Array.from(slides).indexOf(currentSlide);
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % slides.length;
    } else {
      nextIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    }
    
    // Trigger slider navigation
    const targetSlide = slides[nextIndex];
    if (targetSlide) {
      // Remove current class from all slides
      slides.forEach(slide => slide.classList.remove('w--current'));
      // Add current class to target slide
      targetSlide.classList.add('w--current');
      
      // Update slider mask position
      const sliderMask = slider.querySelector('.w-slider-mask');
      if (sliderMask) {
        const slideWidth = targetSlide.offsetWidth;
        sliderMask.style.transform = `translateX(-${nextIndex * slideWidth}px)`;
      }
    }
  }

  /**
   * Start auto-flip functionality
   */
  function startAutoFlip(slider) {
    if (slider._autoFlipInterval) {
      clearInterval(slider._autoFlipInterval);
    }
    
    slider._autoFlipInterval = setInterval(() => {
      if (!slider._isPaused) {
        navigateSlider(slider, 'next');
      }
    }, AUTO_FLIP_INTERVAL);
  }

  /**
   * Pause slider auto-flip
   */
  function pauseSlider(slider) {
    slider._isPaused = true;
  }

  /**
   * Resume slider auto-flip
   */
  function resumeSlider(slider) {
    slider._isPaused = false;
  }

  /**
   * Setup background detection for arrow assets
   */
  function setupBackgroundDetection() {
    // Check contact level or background darkness
    const contactElements = document.querySelectorAll('[class*="contact"], .speaker-slider-wrapper');
    
    contactElements.forEach(element => {
      const bgColor = getComputedStyle(element).backgroundColor;
      const isDark = isBackgroundDark(bgColor);
      
      // Update arrow assets based on background
      const arrows = element.querySelectorAll('.slide-arrow');
      arrows.forEach(arrow => {
        if (arrow.src.includes('Asset-12-1-1.png') && isDark) {
          arrow.src = arrow.src.replace('Asset-12-1-1.png', 'Asset-12-2.png');
        } else if (arrow.src.includes('Asset-12-2.png') && !isDark) {
          arrow.src = arrow.src.replace('Asset-12-2.png', 'Asset-12-1-1.png');
        }
      });
    });
  }

  /**
   * Determine if background is dark
   */
  function isBackgroundDark(bgColor) {
    // Parse RGB values from background color
    const rgb = bgColor.match(/\d+/g);
    if (!rgb || rgb.length < 3) return false;
    
    // Calculate luminance
    const r = parseInt(rgb[0]);
    const g = parseInt(rgb[1]);
    const b = parseInt(rgb[2]);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    
    return luminance < BACKGROUND_DETECTION_THRESHOLD;
  }

  /**
   * Cleanup function
   */
  function cleanup() {
    const sliders = document.querySelectorAll('.w-slider');
    sliders.forEach(slider => {
      if (slider._autoFlipInterval) {
        clearInterval(slider._autoFlipInterval);
      }
    });
  }

  // Initialize when script loads
  initSliderEnhancements();

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);

  // Export for global access if needed
  window.SliderEnhancements = {
    init: initSliderEnhancements,
    cleanup: cleanup
  };

})();