// =============================================================
// ALBATROS : Core Application Entry & Router
// =============================================================
import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
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

// Initialize Stripe with Publishable Key (from env only, no hardcoded fallback)
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripeKey) {
  console.warn("VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe payments will not work.");
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Monitor location changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    // Overwrite history pushes to also fire popstate
    const originalPush = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPush.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Quick helper to fetch query params
  const getQueryParam = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  };

  // -------------------------------------------------------------
  // STRIPE SUCCESS VIEW
  // -------------------------------------------------------------
  if (currentPath === "/booking/success") {
    const ref = getQueryParam("ref");
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-8 animate-fade-in">
          <div className="inline-flex w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 items-center justify-center shadow-sm">
            <i className="fa-solid fa-check text-4xl"></i>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl md:text-5xl text-zinc-950 dark:text-white font-medium tracking-tight">
              Réservation confirmée
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed max-w-md mx-auto">
              Votre acompte a bien été reçu. Nous vous contacterons sous 24h pour finaliser les détails de votre événement.
            </p>
          </div>

          {ref && (
            <div className="inline-block px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="font-sans text-xs uppercase tracking-widest text-zinc-500 mb-1">
                Référence
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
              className="btn btn-primary"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STRIPE CANCELLED VIEW
  // -------------------------------------------------------------
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
              Paiement annulé
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed max-w-md mx-auto">
              Votre acompte n'a pas pu être traité. Votre date n'a pas été confirmée. Vous pouvez réessayer d'effectuer la réservation.
            </p>
          </div>

          {ref && (
            <div className="text-xs text-zinc-400 font-mono">
              Tentative : {ref}
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
              className="btn btn-primary"
            >
              Réessayer
            </a>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/");
              }}
              className="btn btn-outline"
            >
              Retour
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN CONSOLE VIEW
  // -------------------------------------------------------------
  if (currentPath === "/admin") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950 [color-scheme:light]">
        <AdminConsole />
      </div>
    );
  }

  // -------------------------------------------------------------
  // PUBLIC WEBSITE (LANDING & BOOKING)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      
      {/* Brand Showcase Sections */}
      <Hero />
      <WelcomeIntro />
      <LoungeSection />
      <SalleSection />
      <Galerie />
      <Testimonials />

      {/* Interactive Booking Wizard with Stripe Elements */}
      <Elements stripe={stripePromise}>
        <BookingWizard />
      </Elements>

      {/* Practical Details */}
      <InfoSection />

      <Footer />
    </div>
  );
}

