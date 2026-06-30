import React, { useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { useLanguage } from "../context/LanguageContext";

export function Hero() {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, 200]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <header className="relative min-h-[100dvh] flex items-center justify-center px-6 overflow-hidden bg-zinc-950" id="accueil">
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.55 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        style={{ y: bgY, backgroundImage: "url('/media/image.png')" }}
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat will-change-transform"
      />

      <div className="grain-overlay" />
      <div className="absolute inset-0 z-0 bg-zinc-950/20" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent opacity-90" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-zinc-950/30 via-transparent to-zinc-950/30" />

      <div className="absolute top-[15%] left-[8%] w-px h-28 bg-gradient-to-b from-transparent via-[#C6A969]/25 to-transparent z-10 hidden lg:block animate-float" />
      <div className="absolute top-[25%] right-[10%] w-px h-20 bg-gradient-to-b from-transparent via-[#C6A969]/20 to-transparent z-10 hidden lg:block animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-[30%] left-[15%] w-16 h-px bg-gradient-to-r from-transparent via-[#C6A969]/15 to-transparent z-10 hidden lg:block animate-float" style={{ animationDelay: "4s" }} />

      <motion.div style={{ opacity }} className="relative z-10 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        <div className="max-w-4xl space-y-8 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex items-center gap-4"
          >
            <div className="w-10 h-px bg-[#C6A969]/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C6A969]/80 font-medium">
              Manouba, Tunisie
            </span>
            <div className="w-10 h-px bg-[#C6A969]/60" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl md:text-7xl lg:text-8xl text-white font-medium tracking-tight leading-[1.05] select-none"
          >
            {t("hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="font-sans text-lg md:text-xl text-zinc-300/90 max-w-xl leading-relaxed"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap justify-center gap-4 pt-6"
          >
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
              href="#salle"
              className="btn border border-white/20 text-white hover:bg-white/10 hover:border-white/40"
            >
              {t("hero.cta_discover")}
            </a>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-white/40">
            <path d="M8 4L8 18M8 18L14 12M8 18L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </header>
  );
}

export function WelcomeIntro() {
  const { t } = useLanguage();
  return (
    <section className="py-28 px-6 bg-zinc-50 dark:bg-zinc-950 text-center overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 gold-line opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto space-y-8 relative z-10"
      >
        <div className="flex flex-col items-center gap-4">
          <span className="section-label">Bienvenue</span>
          <div className="w-8 h-px bg-[#C6A969]" />
        </div>
        <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight">
          {t("welcome.title")}
        </h2>
        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans max-w-2xl mx-auto">
          {t("welcome.text")}
        </p>
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rotate-45 border border-[#C6A969]/40" />
            <div className="w-12 h-px bg-[#C6A969]/30" />
            <div className="w-2 h-2 rotate-45 bg-[#C6A969]/30" />
            <div className="w-12 h-px bg-[#C6A969]/30" />
            <div className="w-2 h-2 rotate-45 border border-[#C6A969]/40" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function LoungeSection() {
  const { t } = useLanguage();
  return (
    <section className="py-28 px-6 bg-white dark:bg-zinc-900 border-t border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden" id="lounge">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full aspect-[4/3] md:aspect-[16/10] md:max-h-[420px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden group"
        >
          <img
            src="/media/gallery-1.png"
            alt="L'Espace Lounge Albatros"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6A969]/40 to-transparent" />
        </motion.div>

        <div className="space-y-8">
          <div className="space-y-4">
            <span className="section-label">Lounge & Traiteur</span>
            <h2 className="text-3xl md:text-4xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight">
              {t("lounge.title")}
            </h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed font-sans">
            {t("lounge.text")}
          </p>

          <div className="grid grid-cols-1 gap-5 pt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="glass-gold p-6 card-hover-lift"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-[#C6A969]/20 bg-[#C6A969]/5">
                  <i className="fa-solid fa-utensils text-[#C6A969] text-sm"></i>
                </div>
                <div>
                  <h3 className="font-sans font-medium text-zinc-950 dark:text-white mb-2">{t("lounge.buffets_title")}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{t("lounge.buffets_text")}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="glass-gold p-6 card-hover-lift"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-[#C6A969]/20 bg-[#C6A969]/5">
                  <i className="fa-solid fa-cake-candles text-[#C6A969] text-sm"></i>
                </div>
                <div>
                  <h3 className="font-sans font-medium text-zinc-950 dark:text-white mb-2">{t("lounge.pastry_title")}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{t("lounge.pastry_text")}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SalleSection() {
  const { t } = useLanguage();
  return (
    <section className="py-28 px-6 bg-zinc-50 dark:bg-zinc-950 overflow-hidden" id="salle">
      <div className="max-w-7xl mx-auto mb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <span className="section-label">La Salle</span>
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight max-w-2xl">
            {t("salle.title")}
          </h2>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-8 flex flex-col h-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-gold p-8 flex-1 card-hover-lift"
          >
            <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed font-sans mb-8">
              {t("salle.text")}
            </p>

            <div className="space-y-6 pt-6 border-t border-[#C6A969]/15">
              <div className="group">
                <span className="font-display text-5xl text-gold-gradient leading-none block mb-2">
                  {t("salle.stat_guests_num")}
                </span>
                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-400">
                  {t("salle.stat_guests_label")}
                </span>
              </div>
              <div className="group">
                <span className="font-display text-5xl text-gold-gradient leading-none block mb-2">
                  {t("salle.stat_years_num")}
                </span>
                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-400">
                  {t("salle.stat_years_label")}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-8 relative w-full aspect-video md:max-h-[420px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden group"
        >
          <img
            src="/media/gallery-2.png"
            alt="Salle Des Fêtes Albatros"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6A969]/40 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

export function Galerie() {
  const { t } = useLanguage();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const images = [
    "/media/gallery-1.png",
    "/media/gallery-2.png",
    "/media/gallery-3.png",
    "/media/gallery-4.png",
    "/media/gallery-5.png"
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setLightboxImage(null);
  }, []);

  useEffect(() => {
    if (lightboxImage) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxImage, handleKeyDown]);

  const galleryItems = [
    { src: images[0], span: "md:col-span-8", height: "md:h-[520px]" },
    { src: images[1], span: "md:col-span-4", height: "md:h-[520px]" },
    { src: images[2], span: "md:col-span-4", height: "md:h-[400px]" },
    { src: images[3], span: "md:col-span-4", height: "md:h-[400px]" },
    { src: images[4], span: "md:col-span-4", height: "md:h-[400px]" },
  ];

  return (
    <section className="py-28 px-6 bg-white dark:bg-zinc-950 overflow-hidden" id="media">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14 space-y-4"
        >
          <span className="section-label">Galerie</span>
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white tracking-tight">
            {t("galerie.title")}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {galleryItems.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setLightboxImage(img.src)}
              className={`${img.span} aspect-[4/3] md:aspect-auto ${img.height} relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 group cursor-pointer`}
            >
              <img src={img.src} alt={`Galerie ${i + 1}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105" />
              <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/30 transition-all duration-500 flex items-center justify-center z-10">
                <div className="w-12 h-12 border border-white/0 group-hover:border-white/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 bg-white/10 backdrop-blur-sm">
                  <i className="fa-solid fa-expand text-white text-sm"></i>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6A969]/0 group-hover:via-[#C6A969]/50 to-transparent transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] bg-zinc-950/95 backdrop-blur-xl flex items-center justify-center p-6 md:p-12 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white border border-white/20 hover:border-white/40 transition-all bg-white/5 backdrop-blur-sm z-10"
              onClick={() => setLightboxImage(null)}
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </motion.button>
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              src={lightboxImage}
              alt="Gallery"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    { num: 1, initials: "SK" },
    { num: 2, initials: "NC" },
  ];

  return (
    <section className="py-28 px-6 bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative" id="avis">
      <div className="absolute top-0 left-0 right-0 gold-line opacity-30" />
      <div className="max-w-7xl mx-auto space-y-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4"
        >
          <span className="section-label">Témoignages</span>
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white tracking-tight">
            {t("testimonials.title")}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((item, idx) => (
            <motion.div
              key={item.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.15 }}
              className="glass-gold p-8 md:p-10 relative flex flex-col justify-between card-hover-lift"
            >
              <i className="fa-solid fa-quote-left text-5xl text-[#C6A969]/10 absolute top-6 right-8"></i>

              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <i key={star} className="fa-solid fa-star text-[#C6A969] text-xs"></i>
                ))}
              </div>

              <p className="font-sans text-lg md:text-xl leading-relaxed text-zinc-700 dark:text-zinc-300 relative z-10 mb-8">
                "{t(`testimonials.${item.num}.text`)}"
              </p>

              <div className="flex items-center gap-4 relative z-10 pt-6 border-t border-[#C6A969]/15">
                <div className="w-12 h-12 bg-gradient-to-br from-[#C6A969] to-[#A88B4A] flex items-center justify-center text-white font-display font-semibold text-sm">
                  {item.initials}
                </div>
                <div>
                  <div className="font-sans text-base font-medium text-zinc-950 dark:text-white">
                    {t(`testimonials.${item.num}.author`)}
                  </div>
                  <div className="font-sans text-sm text-zinc-500">
                    {t(`testimonials.${item.num}.date`)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InfoSection() {
  const { t } = useLanguage();

  const contactItems = [
    {
      icon: "fa-location-dot",
      label: t("info.address_label"),
      content: (
        <a
          href="https://www.bing.com/maps/default.aspx?v=2&pc=FACEBK&mid=8100&where1=Av%20Complexe%20Sportif%2C%20Manouba%2C%20Tunisia%2C%202010&FORM=FBKPL1"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#C6A969] transition-colors duration-300 inline-block"
        >
          Av Complexe Sportif,<br />Manouba 2010, Tunisie
        </a>
      ),
    },
    {
      icon: "fa-phone",
      label: t("info.phone_label"),
      content: (
        <>
          <a href="tel:+21698687124" className="hover:text-[#C6A969] transition-colors block">+216 98 687 124</a>
          <a href="tel:+21620247599" className="hover:text-[#C6A969] transition-colors block">+216 20 247 599</a>
        </>
      ),
    },
    {
      icon: "fa-envelope",
      label: t("info.email_label"),
      content: (
        <a href="mailto:albatros.manouba@gmail.com" className="hover:text-[#C6A969] transition-colors">
          albatros.manouba@gmail.com
        </a>
      ),
    },
  ];

  return (
    <section className="py-28 px-6 bg-white dark:bg-zinc-950 overflow-hidden" id="contact">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <span className="section-label">Contact</span>
            <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight">
              {t("info.title")}
            </h2>
          </motion.div>

          <div className="space-y-8 font-sans">
            {contactItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="flex gap-5 items-start group"
              >
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 border border-[#C6A969]/20 bg-[#C6A969]/5 group-hover:bg-[#C6A969]/10 group-hover:border-[#C6A969]/40 transition-all duration-300">
                  <i className={`fa-solid ${item.icon} text-[#C6A969]`}></i>
                </div>
                <div>
                  <span className="block font-sans font-medium text-zinc-950 dark:text-white mb-1 text-sm uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                    {item.content}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="glass-gold p-10 md:p-12 font-sans card-hover-lift"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 flex items-center justify-center border border-[#C6A969]/20 bg-[#C6A969]/5">
              <i className="fa-regular fa-clock text-[#C6A969] text-sm"></i>
            </div>
            <h3 className="font-display text-2xl font-medium text-zinc-950 dark:text-white tracking-tight">
              {t("info.hours_title")}
            </h3>
          </div>

          <div className="space-y-8">
            <div>
              <div className="font-sans font-semibold text-zinc-950 dark:text-white border-b border-[#C6A969]/15 pb-3 mb-4 text-sm uppercase tracking-wider">
                {t("info.hours_office_title")}
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">{t("info.hours_office_week")}</span>
                <span className="text-zinc-950 dark:text-white font-medium">{t("info.hours_office_week_val")}</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">{t("info.hours_office_sunday")}</span>
                <span className="text-zinc-950 dark:text-white font-medium">{t("info.hours_office_sunday_val")}</span>
              </div>
            </div>

            <div>
              <div className="font-sans font-semibold text-zinc-950 dark:text-white border-b border-[#C6A969]/15 pb-3 mb-4 text-sm uppercase tracking-wider">
                {t("info.hours_events_title")}
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">{t("info.hours_events_weekend")}</span>
                <span className="text-zinc-950 dark:text-white font-medium">{t("info.hours_events_weekend_val")}</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">{t("info.hours_events_week")}</span>
                <span className="text-zinc-950 dark:text-white font-medium">{t("info.hours_events_week_val")}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
