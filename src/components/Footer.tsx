import React from "react";
import { useLanguage } from "../context/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-zinc-950 text-zinc-400 relative z-10 border-t border-zinc-900">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6A969]/30 to-transparent" />

      <div className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 pb-16">

          <div className="md:col-span-5 space-y-6">
            <span className="font-display text-3xl font-semibold text-white tracking-tight block">
              Albatros<span className="text-[#C6A969]">.</span>
            </span>
            <p className="text-base leading-relaxed max-w-sm font-sans text-zinc-500">
              {t("footer.brand_text")}
            </p>

            <div className="flex gap-3 pt-4">
              <a
                href="https://www.facebook.com/profile.php?id=100091199450045"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center border border-zinc-800 text-zinc-500 hover:bg-[#C6A969] hover:text-white hover:border-[#C6A969] transition-all duration-300"
                aria-label="Facebook"
              >
                <i className="fa-brands fa-facebook-f text-sm"></i>
              </a>
              <a
                href="https://wa.me/21698687124"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center border border-zinc-800 text-zinc-500 hover:bg-[#C6A969] hover:text-white hover:border-[#C6A969] transition-all duration-300"
                aria-label="WhatsApp"
              >
                <i className="fa-brands fa-whatsapp text-sm"></i>
              </a>
            </div>
          </div>

          <div className="md:col-span-3 space-y-6">
            <h4 className="font-mono text-[10px] font-semibold text-[#C6A969] uppercase tracking-[0.2em]">
              {t("footer.nav_title")}
            </h4>
            <ul className="space-y-3 list-none p-0 m-0 font-sans">
              {[
                { key: "nav.home", href: "/#accueil" },
                { key: "nav.lounge", href: "/#lounge" },
                { key: "nav.salle", href: "/#salle" },
                { key: "nav.media", href: "/#media" }
              ].map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      if (window.location.pathname === "/") {
                        e.preventDefault();
                        const targetId = item.href.replace("/#", "").replace("#", "");
                        const el = document.getElementById(targetId);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                          window.history.pushState({}, "", item.href);
                        }
                      }
                    }}
                    className="text-sm text-zinc-500 hover:text-[#C6A969] transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-[#C6A969] transition-all duration-300" />
                    {t(item.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
            <h4 className="font-mono text-[10px] font-semibold text-[#C6A969] uppercase tracking-[0.2em]">
              Contact
            </h4>
            <div className="space-y-3 text-sm text-zinc-500 font-sans">
              <p>Av Complexe Sportif, Manouba 2010</p>
              <p>
                <a href="tel:+21698687124" className="hover:text-[#C6A969] transition-colors">+216 98 687 124</a>
              </p>
              <p>
                <a href="mailto:albatros.manouba@gmail.com" className="hover:text-[#C6A969] transition-colors">albatros.manouba@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 border-t border-zinc-900 text-xs flex flex-col sm:flex-row justify-between items-center gap-4 font-sans text-zinc-600">
        <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
          Crafted with excellence
        </span>
      </div>
    </footer>
  );
}
