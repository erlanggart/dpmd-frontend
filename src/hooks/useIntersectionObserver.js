import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook to detect if an element is visible in viewport
 * @param {Object} options - IntersectionObserver options
 * @returns {Array} [ref, isVisible] - Reference to attach to element and visibility state
 */
export const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observerOptions = {
      root: options.root || null,
      rootMargin: options.rootMargin || '0px',
      threshold: options.threshold || 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Set visibility based on intersection
        setIsVisible(entry.isIntersecting);
      });
    }, observerOptions);

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options.root, options.rootMargin, options.threshold]);

  return [elementRef, isVisible];
};

/**
 * Hook for one-time animation trigger (animates once when first visible)
 * @param {Object} options - IntersectionObserver options
 * @returns {Array} [ref, hasBeenVisible] - Reference and visibility state
 */
export const useIntersectionObserverOnce = (options = {}) => {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasBeenVisible) return;

    const observerOptions = {
      root: options.root || null,
      rootMargin: options.rootMargin || '0px',
      threshold: options.threshold || 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true);
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [hasBeenVisible, options.root, options.rootMargin, options.threshold]);

  return [elementRef, hasBeenVisible];
};
