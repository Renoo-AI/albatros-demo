import React, { useState, useEffect } from "react";
import { useLanguage, type Language } from "../context/LanguageContext";
import {
  House, Sofa, Building2, Image, Phone,
  Sun, Moon, Globe, CalendarCheck, ChevronDown, MoreHorizontal
} from "lucide-react";

const THEME_KEY = "albatros_theme";

export function Header() {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark");
  });
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const sections = ["accueil", "lounge", "salle", "media", "contact"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
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

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  const isHome = window.location.pathname === "/";

  const navItems = [
    { key: "nav.home", href: "/#accueil", icon: House },
    { key: "nav.lounge", href: "/#lounge", icon: Sofa },
    { key: "nav.salle", href: "/#salle", icon: Building2 },
    { key: "nav.media", href: "/#media", icon: Image },
    { key: "nav.contact", href: "/#contact", icon: Phone },
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

  const handleBookClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    window.history.pushState({}, "", "/booking");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className={`fixed left-0 top-0 h-full z-50 hidden md:flex flex-col items-stretch py-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-zinc-200/60 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl ${
          sidebarHovered ? "w-[220px]" : "w-[72px]"
        }`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <a
          href="/#accueil"
          onClick={(e) => handleNavClick(e, "/#accueil")}
          className="flex items-center justify-center h-10 mb-6 text-zinc-950 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A969] mx-3"
        >
          <span className="font-display text-xl font-medium tracking-tight">
            A<span className="text-[#C6A969]">.</span>
          </span>
        </a>

        <div className="flex flex-col items-stretch gap-0.5 flex-1 px-2">
          {navItems.map((item) => {
            const isActive = isHome && item.href === `/#${activeSection}`;
            const Icon = item.icon;
            return (
              <a
                key={item.key}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-300 rounded-lg group ${
                  isActive
                    ? "text-[#C6A969] bg-[#C6A969]/10"
                    : "text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className={`font-sans text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  sidebarHovered ? "opacity-100 max-w-[140px] ml-0" : "opacity-0 max-w-0 -ml-0"
                }`}>
                  {t(item.key)}
                </span>
              </a>
            );
          })}
        </div>

        <div className="flex flex-col items-stretch gap-0.5 px-2 pt-4 mt-auto border-t border-zinc-200/60 dark:border-zinc-800/60">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300 rounded-lg"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span className={`font-sans text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
              sidebarHovered ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
            }`}>
              {isDark ? "Clair" : "Sombre"}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300 rounded-lg"
            >
              <Globe size={16} />
              <span className={`font-sans text-xs font-semibold uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ${
                sidebarHovered ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
              }`}>
                {language}
              </span>
              <ChevronDown size={10} className={`transition-transform duration-300 flex-shrink-0 ${
                langDropdownOpen ? "rotate-180" : ""
              } ${sidebarHovered ? "opacity-100" : "opacity-0 max-w-0 overflow-hidden"}`} />
            </button>

            {langDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />
                <div className="absolute top-0 left-full ml-2 z-50 w-36 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl py-1.5">
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
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-300 cursor-pointer block ${
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

          <a
            href="/booking"
            onClick={handleBookClick}
            className="flex items-center gap-3 px-3 py-2.5 text-[#C6A969] hover:bg-[#C6A969]/10 transition-all duration-300 rounded-lg mt-1"
          >
            <CalendarCheck size={16} />
            <span className={`font-sans text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
              sidebarHovered ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
            }`}>
              {t("nav.book")}
            </span>
          </a>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around h-16 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl pb-1 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = isHome && item.href === `/#${activeSection}`;
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors duration-300 ${
                isActive ? "text-[#C6A969]" : "text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium whitespace-nowrap">{t(item.key)}</span>
            </a>
          );
        })}

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors duration-300 ${
            mobileMenuOpen ? "text-[#C6A969]" : "text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          }`}
        >
          <MoreHorizontal size={18} />
          <span className="text-[9px] font-medium whitespace-nowrap">Plus</span>
        </button>
      </nav>

      {/* Mobile bottom sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute bottom-16 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_-10px_40px_rgb(0,0,0,0.1)] animate-fade-in p-4 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors flex-1"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                {isDark ? "Mode Clair" : "Mode Sombre"}
              </button>

              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                >
                  <Globe size={16} />
                  <span className="uppercase font-semibold">{language}</span>
                  <ChevronDown size={10} className={`transition-transform duration-300 ${
                    langDropdownOpen ? "rotate-180" : ""
                  }`} />
                </button>
                {langDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-36 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl py-1.5 z-50">
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
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer block ${
                          language === lang.code
                            ? "bg-[#C6A969] text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <a
              href="/booking"
              onClick={(e) => { handleBookClick(e); setMobileMenuOpen(false); }}
              className="btn btn-gold w-full mt-3 text-center"
            >
              {t("nav.book")}
            </a>
          </div>
        </div>
      )}

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
