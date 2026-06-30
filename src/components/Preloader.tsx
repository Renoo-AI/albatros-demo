// =============================================================
// ALBATROS : Elegant Top Progress Loading Bar Component
// =============================================================
import React, { useEffect, useState } from "react";

export function TopLoadingBar() {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Start progress line transition
    const frame = requestAnimationFrame(() => {
      setWidth(100);
    });

    // Fade out indicator after animation completes
    const timer = setTimeout(() => {
      setVisible(false);
    }, 600);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div 
      className="fixed top-0 left-0 h-[3px] bg-[#9D8159] dark:bg-white z-[9999] transition-all duration-[600ms] ease-out pointer-events-none"
      style={{ width: `${width}%` }}
    />
  );
}
