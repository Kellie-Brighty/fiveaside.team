import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that scrolls to the top of the page when the route changes
 * Ensures all pages start at the top when navigating
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window to top immediately (instant scroll)
    window.scrollTo(0, 0);

    // Also scroll any main content container if it exists
    const mainContainer = document.querySelector("main") || document.querySelector(".main-content") || document.querySelector("#root");
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }

    // Fallback: Ensure document body and html element scrolls to top
    if (document.body) {
      document.body.scrollTop = 0;
    }
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
