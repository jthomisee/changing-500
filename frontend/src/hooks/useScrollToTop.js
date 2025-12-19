import { useEffect } from 'react';

/**
 * Custom hook to scroll to top when component mounts
 * Useful for standalone pages that need to reset scroll position
 */
export const useScrollToTop = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
};
