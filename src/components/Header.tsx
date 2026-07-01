import React, { useState, useEffect } from "react";
import { useLanguage, type Language } from "../context/LanguageContext";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = ["accueil", "lounge", "salle", "media", "contact"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: "-20% 0px -60% 0px" }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  const isHome = window.location.pathname === "/";
  const navContainerClass = (!isHome || scrolled)
    ? "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-950/90 py-3 shadow-[0_4px_30px_rgb(0,0,0,0.05)] backdrop-blur-xl"
    : "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent bg-white/90 md:bg-transparent dark:bg-zinc-950/90 md:dark:bg-transparent py-4 md:py-5";

  const textColor = (!isHome || scrolled) ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-950 md:text-white dark:text-zinc-50";
  const textMuted = (!isHome || scrolled) ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500 md:text-white/70 dark:text-zinc-400";

  const navItems = [
    { key: "nav.home", href: "/#accueil" },
    { key: "nav.lounge", href: "/#lounge" },
    { key: "nav.salle", href: "/#salle" },
    { key: "nav.media", href: "/#media" },
    { key: "nav.contact", href: "/#contact" }
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (window.location.pathname === "/") {
      e.preventDefault();
      const targetId = href.replace("/#", "").replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState({}, "", href);
      }
    }
  };

  const handleMobileNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false);
    if (window.location.pathname === "/") {
      e.preventDefault();
      const targetId = href.replace("/#", "").replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState({}, "", href);
      }
    }
  };

  const handleBookClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    window.history.pushState({}, "", "/booking");
  };

  return (
    <>
      <nav className={navContainerClass}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a
            href="/#accueil"
            onClick={(e) => handleNavClick(e, "/#accueil")}
            className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A969]"
          >
            <span className={`font-display text-2xl font-medium tracking-tight leading-none block transition-colors duration-300 ${textColor}`}>
              Albatros<span className="text-[#C6A969]">.</span>
            </span>
          </a>

          <ul className="hidden md:flex items-center gap-7 list-none m-0 p-0">
            {navItems.map((item) => {
              const isActive = isHome && item.href === `/#${activeSection}`;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`font-sans text-[13px] font-medium transition-all duration-300 relative py-1 group/link ${
                      isActive
                        ? "text-zinc-950 dark:text-white"
                        : `${textMuted} hover:text-zinc-900 dark:hover:text-white`
                    }`}
                  >
                    {t(item.key)}
                    <span className={`absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-[#C6A969] transition-transform origin-left duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover/link:scale-x-100'}`}></span>
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide transition-colors duration-300 ${textMuted} hover:text-zinc-900 dark:hover:text-white cursor-pointer select-none uppercase`}
                aria-label="Switch Language"
              >
                <i className="fa-solid fa-globe text-[11px]"></i>
                <span>{language}</span>
                <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-300 ${langDropdownOpen ? "rotate-180" : ""}`}></i>
              </button>

              {langDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-black/5 py-1.5 z-50 animate-fade-in backdrop-blur-xl ltr:right-0 rtl:left-0 rtl:right-auto">
                    {[
                      { code: "fr", label: "Français" },
                      { code: "en", label: "English" },
                      { code: "ar", label: "العربية" }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as Language);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full text-left rtl:text-right px-4 py-2.5 text-xs font-medium transition-colors duration-300 cursor-pointer block ${
                          language === lang.code
                            ? "bg-[#C6A969] text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => document.documentElement.classList.toggle("dark")}
              className={`hidden sm:flex items-center justify-center w-10 h-10 transition-colors duration-300 ${textMuted} hover:text-zinc-900 dark:hover:text-white`}
              aria-label="Toggle theme"
            >
              <i className="fa-solid fa-circle-half-stroke"></i>
            </button>

            <a
              href="/booking"
              onClick={handleBookClick}
              className="btn btn-gold hidden sm:inline-flex text-xs px-6 py-3"
            >
              {t("nav.book")}
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex md:hidden items-center justify-center w-10 h-10 transition-colors duration-300 ${textMuted} hover:text-zinc-900 dark:hover:text-white`}
              aria-label="Toggle Menu"
            >
              <i className={`fa-solid ${mobileMenuOpen ? "fa-xmark" : "fa-bars"} text-lg`}></i>
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className={`fixed inset-x-0 bottom-0 z-40 bg-white/98 dark:bg-zinc-950/98 backdrop-blur-xl md:hidden border-t border-zinc-200/60 dark:border-zinc-800/60 animate-fade-in flex flex-col p-6 space-y-6 shadow-[0_-10px_40px_rgb(0,0,0,0.1)] ${(!isHome || scrolled) ? 'top-[64px]' : 'top-[72px]'}`}>
          <ul className="flex flex-col gap-5 list-none m-0 p-0">
            {navItems.map((item) => {
              const isActive = isHome && item.href === `/#${activeSection}`;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={(e) => handleMobileNavClick(e, item.href)}
                    className={`font-sans text-lg font-medium block transition-colors ${
                      isActive ? "text-[#C6A969]" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {t(item.key)}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-4">
            <button
              onClick={() => {
                document.documentElement.classList.toggle("dark");
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 py-2 text-left"
            >
              <i className="fa-solid fa-circle-half-stroke"></i>
              <span>{document.documentElement.classList.contains("dark") ? "Mode Clair" : "Mode Sombre"}</span>
            </button>

            <a
              href="/booking"
              onClick={handleBookClick}
              className="btn btn-gold w-full text-center"
            >
              {t("nav.book")}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
