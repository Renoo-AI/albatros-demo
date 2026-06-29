// =============================================================
// ALBATROS : Brand Footer Component
// =============================================================
import React from "react";

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-16 px-6 relative z-10 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 pb-16">
        
        {/* Brand Block */}
        <div className="md:col-span-5 space-y-6">
          <span className="font-display text-3xl font-semibold text-white tracking-tight block">
            Albatros.
          </span>
          <p className="text-base leading-relaxed max-w-sm">
            L'art de célébrer les moments qui comptent. Une salle d'exception et un service traiteur haut de gamme à Manouba.
          </p>
          
          {/* Social Links */}
          <div className="flex gap-4 pt-4">
            <a
              href="https://www.facebook.com/salle.albatros.manouba"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-white hover:text-zinc-950 transition-colors"
              aria-label="Facebook"
            >
              <i className="fa-brands fa-facebook-f"></i>
            </a>
            <a
              href="https://wa.me/21698687124"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-white hover:text-zinc-950 transition-colors"
              aria-label="WhatsApp"
            >
              <i className="fa-brands fa-whatsapp"></i>
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-white hover:text-zinc-950 transition-colors"
              aria-label="Instagram"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div className="md:col-span-3 space-y-6">
          <h4 className="font-sans text-sm font-semibold text-white">
            Navigation
          </h4>
          <ul className="space-y-3 list-none p-0 m-0">
            {["Accueil", "Lounge", "La Salle", "Galerie"].map((item) => (
              <li key={item}>
                <a href={`#${item.toLowerCase().replace("la salle", "salle")}`} className="text-sm hover:text-white transition-colors">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-900 text-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>© {new Date().getFullYear()} Albatros. Tous droits réservés.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-200 transition-colors">Mentions légales</a>
          <a href="#" className="hover:text-zinc-200 transition-colors">Confidentialité</a>
        </div>
      </div>
    </footer>
  );
}
