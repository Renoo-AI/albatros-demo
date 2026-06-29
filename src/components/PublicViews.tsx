// =============================================================
// ALBATROS : Public Brand Sections Component
// =============================================================
import React from "react";
import { motion } from "motion/react";

export function Hero() {
  return (
    <header className="relative min-h-[100dvh] flex items-center justify-center px-6 overflow-hidden bg-zinc-950" id="accueil">
      {/* Background Image */}
      <motion.div 
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1920&q=80')" }}
      />
      
      {/* Subtle bottom gradient to ensure text contrast */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90" />

      <div className="relative z-10 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        <div className="max-w-4xl space-y-8 flex flex-col items-center">
          <motion.h1 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl md:text-7xl lg:text-8xl text-white font-medium tracking-tight leading-[1.05] select-none"
          >
            L'art de célébrer les moments qui comptent.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-sans text-lg md:text-xl text-zinc-300 max-w-xl leading-relaxed"
          >
            Salle des fêtes et service traiteur d'exception à Manouba.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap justify-center gap-4 pt-6"
          >
            <a
              href="#reservation"
              className="btn bg-white text-zinc-950 hover:bg-zinc-200"
            >
              Réserver une date
            </a>
            <a
              href="#salle"
              className="btn border border-white/20 text-white hover:bg-white/10"
            >
              Découvrir le lieu
            </a>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

export function WelcomeIntro() {
  return (
    <section className="py-32 px-6 bg-zinc-50 dark:bg-zinc-950 text-center overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto space-y-8"
      >
        <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight">
          Le prestige d'une célébration réussie
        </h2>
        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans max-w-2xl mx-auto">
          Situé à Manouba, Albatros est le lieu d'exception pour tous vos événements marquants. Que ce soit pour un mariage féerique, des fiançailles mémorables ou une réception de haut standing, notre salle raffinée et notre équipe dévouée mettent tout en œuvre pour faire de votre célébration un moment inoubliable et magique.
        </p>
      </motion.div>
    </section>
  );
}

export function LoungeSection() {
  return (
    <section className="py-24 px-6 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden" id="lounge">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Visual Showcase */}
        <motion.div 
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
        >
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80"
            alt="L'Espace Lounge Albatros"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] hover:scale-105"
          />
        </motion.div>

        {/* Description & List */}
        <motion.div 
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight">
            Le Lounge et l'Espace Traiteur
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed font-sans">
            Pour accompagner vos festivités, Albatros met à votre disposition un service traiteur d'exception et un espace lounge raffiné pour accueillir vos invités d'honneur dans les meilleures conditions. Nos équipes élaborent des buffets prestigieux et des pâtisseries fines traditionnelles et modernes.
          </p>

          <div className="grid grid-cols-1 gap-6 pt-4">
            <div className="glass-panel p-6">
              <h3 className="font-sans font-medium text-zinc-950 dark:text-white mb-2">Buffets et Dîners</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">Conception de menus sur mesure allant des amuse-bouches délicats aux repas gastronomiques complets.</p>
            </div>
            <div className="glass-panel p-6">
              <h3 className="font-sans font-medium text-zinc-950 dark:text-white mb-2">Pâtisserie Fine</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">Une sélection de douceurs tunisiennes traditionnelles et créations contemporaines faites maison.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function SalleSection() {
  return (
    <section className="py-24 px-6 bg-zinc-50 dark:bg-zinc-950 overflow-hidden" id="salle">
      {/* Full width heading to break zigzag pattern */}
      <div className="max-w-7xl mx-auto mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight max-w-2xl"
        >
          Un espace pensé pour les grandes réceptions
        </motion.h2>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Stats and Info in a Bento-like column */}
        <motion.div 
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-4 space-y-8 flex flex-col h-full"
        >
          <div className="glass-panel p-8 flex-1">
            <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed font-sans mb-8">
              La salle des fêtes Albatros est l'écrin idéal pour vos mariages, fiançailles, anniversaires et événements professionnels. Avec une capacité d'accueil généreuse et une décoration élégante, nous donnons vie à vos rêves les plus ambitieux.
            </p>
            
            <div className="space-y-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="font-display text-4xl text-zinc-950 dark:text-white leading-none block mb-1">
                  400
                </span>
                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-400">
                  Capacité d'invités maximum
                </span>
              </div>
              <div>
                <span className="font-display text-4xl text-zinc-950 dark:text-white leading-none block mb-1">
                  15+
                </span>
                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-400">
                  Années d'expertise événementielle
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Large feature image */}
        <motion.div 
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="lg:col-span-8 relative aspect-video md:aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
        >
          <img
            src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80"
            alt="Salle Des Fêtes Albatros"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] hover:scale-105"
          />
        </motion.div>
      </div>
    </section>
  );
}

export function Galerie() {
  const images = [
    "/media/gallery-1.png",
    "/media/gallery-2.png",
    "/media/gallery-3.png",
    "/media/gallery-4.png",
    "/media/gallery-5.png"
  ];

  return (
    <section className="py-24 px-6 bg-white dark:bg-zinc-950 overflow-hidden" id="media">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white tracking-tight">
            Moments d'exception
          </h2>
        </motion.div>

        {/* Clean Masonry / Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            className="md:col-span-8 aspect-[4/3] md:aspect-auto md:h-[500px] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 group"
          >
            <img src={images[0]} alt="Galerie 1" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }}
            className="md:col-span-4 aspect-square md:aspect-auto md:h-[500px] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 group"
          >
            <img src={images[1]} alt="Galerie 2" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
            className="md:col-span-4 aspect-square md:aspect-auto md:h-[400px] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 group"
          >
            <img src={images[2]} alt="Galerie 3" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}
            className="md:col-span-4 aspect-square md:aspect-auto md:h-[400px] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 group"
          >
            <img src={images[3]} alt="Galerie 4" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }}
            className="md:col-span-4 aspect-square md:aspect-auto md:h-[400px] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 group"
          >
            <img src={images[4]} alt="Galerie 5" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="py-32 px-6 bg-zinc-950 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight">
            L'avis de nos invités
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-10 md:p-12 bg-zinc-900 flex flex-col justify-between"
          >
            <p className="font-sans text-xl md:text-2xl leading-relaxed text-zinc-100 font-light">
              "Une journée de rêve, parfaitement orchestrée. L'équipe a su comprendre nos attentes et les dépasser. La salle était magnifique, le repas exceptionnel. Nos invités en parlent encore."
            </p>
            <div className="pt-8 mt-8 border-t border-zinc-800">
              <div className="font-sans text-sm font-medium text-white">
                Sophie et Karim Benali
              </div>
              <div className="font-sans text-sm text-zinc-500 mt-1">
                Mariage, Juin 2025
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="p-10 md:p-12 bg-zinc-900 flex flex-col justify-between"
          >
            <p className="font-sans text-xl md:text-2xl leading-relaxed text-zinc-100 font-light">
              "Nous avons célébré les 60 ans de ma mère à Albatros. Accueil chaleureux, service impeccable, décoration soignée. Un grand merci à toute l'équipe pour ce moment inoubliable."
            </p>
            <div className="pt-8 mt-8 border-t border-zinc-800">
              <div className="font-sans text-sm font-medium text-white">
                Nadia Cherif
              </div>
              <div className="font-sans text-sm text-zinc-500 mt-1">
                Anniversaire, Mars 2025
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function InfoSection() {
  return (
    <section className="py-24 px-6 bg-white dark:bg-zinc-950 overflow-hidden" id="contact">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Practical info */}
        <motion.div 
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-12"
        >
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white leading-tight tracking-tight">
            Nous trouver
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-zinc-950 dark:text-white">
                <i className="fa-solid fa-location-dot text-xl"></i>
              </div>
              <div>
                <span className="block font-sans font-medium text-zinc-950 dark:text-white mb-1">
                  Adresse
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                  Av Complexe Sportif,<br />Manouba 2010, Tunisie
                </span>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-zinc-950 dark:text-white">
                <i className="fa-solid fa-phone text-xl"></i>
              </div>
              <div>
                <span className="block font-sans font-medium text-zinc-950 dark:text-white mb-1">
                  Téléphone
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                  +216 98 687 124<br />+216 20 247 599
                </span>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-zinc-950 dark:text-white">
                <i className="fa-solid fa-envelope text-xl"></i>
              </div>
              <div>
                <span className="block font-sans font-medium text-zinc-950 dark:text-white mb-1">
                  Email
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                  albatros.manouba@gmail.com
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Operating Hours */}
        <motion.div 
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="glass-panel p-10 md:p-12"
        >
          <h3 className="font-display text-3xl font-medium text-zinc-950 dark:text-white mb-8 tracking-tight">Horaires</h3>
          
          <div className="space-y-8">
            <div>
              <div className="font-sans font-semibold text-zinc-950 dark:text-white border-b border-zinc-200 dark:border-zinc-700 pb-3 mb-4">
                Bureau des réservations
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Lundi - Samedi</span>
                <span className="text-zinc-950 dark:text-white font-medium">09h00 - 18h00</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Dimanche</span>
                <span className="text-zinc-950 dark:text-white font-medium">Sur rendez-vous</span>
              </div>
            </div>

            <div>
              <div className="font-sans font-semibold text-zinc-950 dark:text-white border-b border-zinc-200 dark:border-zinc-700 pb-3 mb-4">
                Salle Des Fêtes (Événements)
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Vendredi - Samedi</span>
                <span className="text-zinc-950 dark:text-white font-medium">11h00 - 03h00</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Dimanche - Jeudi</span>
                <span className="text-zinc-950 dark:text-white font-medium">11h00 - 23h00</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

