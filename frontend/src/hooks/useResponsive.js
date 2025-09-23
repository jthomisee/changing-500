import { useState, useEffect } from 'react';

// Breakpoint constants
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
};

export const useResponsive = (breakpoint = BREAKPOINTS.mobile) => {
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize with current window width if available
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint;
    }
    return false; // Default for SSR
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return {
    isMobile,
    isTablet:
      !isMobile &&
      (typeof window !== 'undefined'
        ? window.innerWidth < BREAKPOINTS.tablet
        : false),
    isDesktop:
      typeof window !== 'undefined'
        ? window.innerWidth >= BREAKPOINTS.desktop
        : false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  };
};

// Specialized hook for common mobile detection
export const useMobileDetection = () => {
  return useResponsive(BREAKPOINTS.mobile);
};
