import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { useLanguage } from "./context/LanguageContext";
import {
  Hero,
  WelcomeIntro,
  LoungeSection,
  SalleSection,
  Galerie,
  Testimonials,
  InfoSection,
} from "./components/PublicViews";
import { BookingWizard } from "./components/BookingWizard";
import { AdminConsole } from "./components/AdminConsole";
import { TopLoadingBar } from "./components/Preloader";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripeKey) {
  console.warn("VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe payments will not work.");
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function MarqueeBanner() {
  const items = ["Mariages", "Fiançailles", "Anniversaires", "Événements", "Réceptions", "Soirées", "Conférences"];
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className="bg-[#C6A969] py-4 overflow-hidden relative">
      <div className="marquee-container">
        <div className="marquee-track">
          {repeated.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-6 px-6">
              <span className="font-display text-sm font-medium text-white/90 tracking-wide whitespace-nowrap">{item}</span>
              <span className="w-1.5 h-1.5 rotate-45 bg-white/40 flex-shrink-0" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CtaBanner() {
  const { t } = useLanguage();
  return (
    <section className="relative py-28 px-6 bg-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/media/gallery-3.png')" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950" />
      <div className="grain-overlay" />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6A969]/40 to-transparent" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        <div className="flex justify-center items-center gap-4">
          <div className="w-12 h-px bg-[#C6A969]/50" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C6A969] font-medium">Albatros</span>
          <div className="w-12 h-px bg-[#C6A969]/50" />
        </div>

        <h2 className="font-display text-3xl md:text-5xl text-white font-medium tracking-tight leading-tight">
          Prêt à créer des souvenirs inoubliables ?
        </h2>
        <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed font-sans">
          Réservez votre date dès maintenant et laissez-nous transformer votre vision en une célébration extraordinaire.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <a
            href="/booking"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/booking");
              window.scrollTo(0, 0);
            }}
            className="btn btn-gold shine-effect"
          >
            {t("hero.cta_book")}
          </a>
          <a
            href="tel:+21698687124"
            className="btn border border-white/20 text-white hover:bg-white/10 hover:border-white/40"
          >
            <i className="fa-solid fa-phone mr-2 text-xs"></i>
            +216 98 687 124
          </a>
        </div>
      </div>
    </section>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 z-40 w-12 h-12 bg-[#C6A969] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(198,169,105,0.3)] hover:bg-[#D4B978] hover:-translate-y-1 transition-all duration-300 animate-fade-in"
      aria-label="Back to top"
    >
      <i className="fa-solid fa-chevron-up text-sm"></i>
    </button>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [loadingKey, setLoadingKey] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setLoadingKey((prev) => prev + 1);
      if (!window.location.hash) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    const originalPush = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPush.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const getQueryParam = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  };

  if (currentPath === "/booking/success") {
    const ref = getQueryParam("ref");
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-8 animate-fade-in">
          <div className="inline-flex w-24 h-24 rounded-full bg-gradient-to-br from-[#C6A969] to-[#A88B4A] text-white items-center justify-center shadow-[0_8px_30px_rgba(198,169,105,0.3)]">
            <i className="fa-solid fa-check text-4xl"></i>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl md:text-5xl text-zinc-950 dark:text-white font-medium tracking-tight">
              {t("success.title")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed max-w-md mx-auto">
              {t("success.text")}
            </p>
          </div>

          {ref && (
            <div className="inline-block px-8 py-4 bg-white dark:bg-zinc-900 border border-[#C6A969]/20 shadow-sm">
              <div className="font-sans text-xs uppercase tracking-widest text-[#C6A969] mb-1">
                {t("success.ref_title")}
              </div>
              <div className="font-mono text-xl text-zinc-950 dark:text-white font-medium">
                {ref}
              </div>
            </div>
          )}

          <div className="pt-6">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/");
              }}
              className="btn btn-gold"
            >
              {t("success.btn_home")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (currentPath === "/booking/cancelled") {
    const ref = getQueryParam("ref");
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-8 animate-fade-in">
          <div className="inline-flex w-24 h-24 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 items-center justify-center shadow-sm">
            <i className="fa-solid fa-xmark text-4xl"></i>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl md:text-5xl text-zinc-950 dark:text-white font-medium tracking-tight">
              {t("cancel.title")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed max-w-md mx-auto">
              {t("cancel.text")}
            </p>
          </div>

          {ref && (
            <div className="text-xs text-zinc-400 font-mono">
              {t("success.ref_title")} : {ref}
            </div>
          )}

          <div className="flex gap-4 justify-center pt-6">
            <a
              href="/#reservation"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/");
                setTimeout(() => {
                  const el = document.getElementById("reservation");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="btn btn-gold"
            >
              {t("cancel.retry")}
            </a>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/");
              }}
              className="btn btn-outline"
            >
              {t("cancel.back")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (currentPath === "/admin") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950 [color-scheme:light]">
        <AdminConsole />
      </div>
    );
  }

  if (currentPath === "/booking") {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <TopLoadingBar key={loadingKey} />
        <Header />
        <div className="pt-12">
          <Elements stripe={stripePromise}>
            <BookingWizard />
          </Elements>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <TopLoadingBar key={loadingKey} />
      <Header />

      <Hero />
      <WelcomeIntro />
      <MarqueeBanner />
      <LoungeSection />
      <SalleSection />
      <Galerie />
      <Testimonials />
      <InfoSection />
      <CtaBanner />

      <Footer />
      <BackToTop />
    </div>
  );
}
