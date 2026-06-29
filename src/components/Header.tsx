// =============================================================
// ALBATROS : Header Navigation Component
// =============================================================
import React, { useState, useEffect } from "react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const bgClass = scrolled 
    ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-zinc-200 dark:border-zinc-800 py-4 shadow-sm" 
    : "bg-transparent border-transparent py-6";
    
  // Dynamic text colors based on scroll (assuming light text on top hero image, dark text otherwise)
  // Wait, if we use a strict system theme, the header should just adapt to the theme, BUT
  // if the hero is an image, we need white text when at top, and theme text when scrolled.
  const textColor = scrolled ? "text-zinc-950 dark:text-zinc-50" : "text-white";
  const textMuted = scrolled ? "text-zinc-500 dark:text-zinc-400" : "text-white/70";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#accueil" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500">
          <span className={`font-display text-2xl font-medium tracking-tight leading-none block transition-colors duration-300 ${textColor}`}>
            Albatros.
          </span>
        </a>

        {/* Links - Hidden on mobile, single line on desktop */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          {["Accueil", "Lounge", "La Salle", "Media", "Contact"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase().replace("la salle", "salle").replace(" & traiteur", "")}`}
                className={`font-sans text-sm font-medium transition-colors duration-300 hover:text-zinc-900 dark:hover:text-white ${textMuted}`}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className={`hidden sm:flex items-center justify-center w-10 h-10 transition-colors duration-300 ${textMuted} hover:text-zinc-900 dark:hover:text-white`}
            aria-label="Basculer le thème"
          >
            <i className="fa-solid fa-circle-half-stroke"></i>
          </button>
          
          <a
            href="#reservation"
            className="btn btn-primary"
          >
            Réserver
          </a>
        </div>
      </div>
    </nav>
  );
}
