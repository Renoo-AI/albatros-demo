import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../context/LanguageContext";

const galleryImages = [
  "/media/gallery-1.png",
  "/media/gallery-2.png",
  "/media/gallery-3.png",
  "/media/gallery-4.png",
  "/media/gallery-5.png",
  "/media/image.png",
  "/media/gallery-6.png",
  "/media/gallery-7.png",
  "/media/gallery-8.png",
  "/media/gallery-9.png",
  "/media/gallery-10.png",
];

export function FullGallery() {
  const { t } = useLanguage();
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load likes from local storage
    const storedLikes = localStorage.getItem("albatros_gallery_likes");
    if (storedLikes) {
      try {
        setLikes(JSON.parse(storedLikes));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Initialize with random likes
      const initialLikes: Record<string, number> = {};
      galleryImages.forEach((img) => {
        initialLikes[img] = Math.floor(Math.random() * 100) + 10;
      });
      setLikes(initialLikes);
      localStorage.setItem("albatros_gallery_likes", JSON.stringify(initialLikes));
    }

    const storedUserLikes = localStorage.getItem("albatros_gallery_user_likes");
    if (storedUserLikes) {
      try {
        setUserLikes(JSON.parse(storedUserLikes));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLike = (imageSrc: string) => {
    if (userLikes[imageSrc]) return; // Cannot dislike

    const newLikes = { ...likes, [imageSrc]: (likes[imageSrc] || 0) + 1 };
    const newUserLikes = { ...userLikes, [imageSrc]: true };

    setLikes(newLikes);
    setUserLikes(newUserLikes);

    localStorage.setItem("albatros_gallery_likes", JSON.stringify(newLikes));
    localStorage.setItem("albatros_gallery_user_likes", JSON.stringify(newUserLikes));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-display font-medium text-zinc-950 dark:text-white">
          {t("galerie.title")}
        </h1>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, "", "/");
            window.scrollTo(0, 0);
          }}
          className="btn btn-outline dark:text-white dark:border-white/20"
        >
          <i className="fa-solid fa-arrow-left me-2"></i>
          {t("galerie.return", { defaultValue: "Retour" })}
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleryImages.map((img, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            className="group relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900"
          >
            <div className="aspect-[4/3] w-full relative">
              <img
                src={img}
                alt={`Gallery image ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                <button
                  onClick={() => handleLike(img)}
                  disabled={userLikes[img]}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all ${
                    userLikes[img]
                      ? "bg-red-500/80 text-white"
                      : "bg-white/20 text-white hover:bg-white/40"
                  }`}
                >
                  <i className={`${userLikes[img] ? "fa-solid" : "fa-regular"} fa-heart`}></i>
                  <span className="text-sm font-medium">{likes[img] || 0}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
