/**
 * Global Image Optimizer
 * Handles lazy loading, eager loading for critical images, and fallback behavior
 * Optimized for mobile performance and WebP support detection
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        LAZY_THRESHOLD: '50px',
        EAGER_CLASS: 'eager-load',
        CRITICAL_CLASS: 'critical-image',
        FALLBACK_CLASS: 'has-fallback',
        WEBP_CHECK: true,
        MOBILE_BREAKPOINT: 768,
        TABLET_BREAKPOINT: 1024
    };

    // WebP support detection
    let webpSupported = null;
    
    function checkWebPSupport() {
        return new Promise((resolve) => {
            if (webpSupported !== null) {
                resolve(webpSupported);
                return;
            }
            
            const webP = new Image();
            webP.onload = webP.onerror = function () {
                webpSupported = (webP.height === 2);
                resolve(webpSupported);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    // Get optimized image source
    function getOptimizedSrc(img, isWebPSupported) {
        let src = img.dataset.src || img.src;
        
        // Handle WebP conversion for supported formats
        if (isWebPSupported && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png'))) {
            const webpSrc = src.replace(/\.(jpg|jpeg|png)/g, '.webp');
            // Check if WebP version exists by trying to load it
            return new Promise((resolve) => {
                const testImg = new Image();
                testImg.onload = () => resolve(webpSrc);
                testImg.onerror = () => resolve(src);
                testImg.src = webpSrc;
            });
        }
        
        return Promise.resolve(src);
    }

    // Set appropriate loading attributes
    function setLoadingAttributes(img, isCritical = false) {
        if (isCritical || img.classList.contains(CONFIG.CRITICAL_CLASS)) {
            img.loading = 'eager';
            img.fetchPriority = 'high';
            img.decoding = 'async';
        } else if (!img.hasAttribute('loading')) {
            img.loading = 'lazy';
            img.decoding = 'async';
        }
    }

    // Handle image fallback
    function setupFallback(img) {
        if (!img.dataset.fallback) return;
        
        img.addEventListener('error', function fallbackHandler() {
            const fallbackSrc = img.dataset.fallback;
            if (fallbackSrc && img.src !== fallbackSrc) {
                img.src = fallbackSrc;
                img.removeEventListener('error', fallbackHandler);
            }
        });
    }

    // Process critical images immediately
    function processCriticalImages() {
        const criticalImages = document.querySelectorAll('.' + CONFIG.CRITICAL_CLASS + ', .hero-image, .slide-photo:first-child img');
        
        criticalImages.forEach(img => {
            if (img.dataset.processed) return;
            
            img.dataset.processed = 'true';
            setLoadingAttributes(img, true);
            setupFallback(img);
            
            // Handle source optimization
            checkWebPSupport().then(isWebPSupported => {
                getOptimizedSrc(img, isWebPSupported).then(optimizedSrc => {
                    if (img.dataset.src) {
                        img.src = optimizedSrc;
                        delete img.dataset.src;
                    }
                });
            });
        });
    }

    // Lazy loading implementation
    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        
                        if (img.dataset.processed) return;
                        img.dataset.processed = 'true';
                        
                        // Process the image
                        checkWebPSupport().then(isWebPSupported => {
                            getOptimizedSrc(img, isWebPSupported).then(optimizedSrc => {
                                if (img.dataset.src) {
                                    img.src = optimizedSrc;
                                    delete img.dataset.src;
                                }
                                
                                setLoadingAttributes(img);
                                setupFallback(img);
                                
                                // Add loaded class for styling
                                img.addEventListener('load', () => {
                                    img.classList.add('loaded');
                                    img.classList.remove('lazy');
                                });
                                
                                observer.unobserve(img);
                            });
                        });
                    }
                });
            }, {
                rootMargin: CONFIG.LAZY_THRESHOLD
            });

            // Observe lazy images
            const lazyImages = document.querySelectorAll('img[loading="lazy"], img[data-src], .lazy:not(.eager-load)');
            lazyImages.forEach(img => {
                if (!img.dataset.processed) {
                    imageObserver.observe(img);
                }
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }
            });
        }
    }

    // Mobile-specific optimizations
    function optimizeForMobile() {
        const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
        const isTablet = window.innerWidth < CONFIG.TABLET_BREAKPOINT;
        
        if (isMobile) {
            // Prefetch first few slider images on mobile
            const sliderImages = document.querySelectorAll('.speaker-slider img, .project-slider img');
            sliderImages.forEach((img, index) => {
                if (index < 3 && img.dataset.src) {
                    const prefetchLink = document.createElement('link');
                    prefetchLink.rel = 'prefetch';
                    prefetchLink.href = img.dataset.src;
                    document.head.appendChild(prefetchLink);
                }
            });
        }
        
        // Optimize image sizes based on viewport
        document.querySelectorAll('img').forEach(img => {
            if (img.dataset.srcset) {
                const srcset = img.dataset.srcset;
                const sizes = isMobile ? '100vw' : isTablet ? '80vw' : 'auto';
                img.setAttribute('sizes', sizes);
            }
        });
    }

    // Initialize the optimizer
    function init() {
        // Process critical images first
        processCriticalImages();
        
        // Setup lazy loading
        setupLazyLoading();
        
        // Mobile optimizations
        optimizeForMobile();
        
        // Handle dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                        images.forEach(img => {
                            if (!img.dataset.processed) {
                                if (img.classList.contains(CONFIG.CRITICAL_CLASS)) {
                                    processCriticalImages();
                                } else {
                                    setupLazyLoading();
                                }
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Handle window resize for responsive optimizations
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(optimizeForMobile, 250);
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose utility functions
    window.ImageOptimizer = {
        refresh: function() {
            setupLazyLoading();
            processCriticalImages();
        },
        markCritical: function(selector) {
            document.querySelectorAll(selector).forEach(img => {
                img.classList.add(CONFIG.CRITICAL_CLASS);
                processCriticalImages();
            });
        }
    };

})();