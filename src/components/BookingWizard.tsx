import React, { useState, useEffect, useMemo } from "react";
import type { EventTypeSlug, BusinessSettings } from "../types";
import { fetchAvailability, createBooking, type CreateBookingInput, type CreateBookingResult, fetchSettings, fetchConfigStatus } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";

import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

const defaultEventPrices: Record<EventTypeSlug, number> = {
  "Mariage": 4000,
  "Soirée": 2500,
  "Entreprise": 2000,
  "Anniversaire": 1500,
  "Autre": 1500,
};

const eventIcons: Record<EventTypeSlug, string> = {
  "Mariage": "fa-rings-wedding",
  "Soirée": "fa-champagne-glasses",
  "Entreprise": "fa-building",
  "Anniversaire": "fa-cake-candles",
  "Autre": "fa-star",
};

export function BookingWizard() {

  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  const eventPrices = useMemo(() => {
    return (settings?.event_prices || defaultEventPrices) as Record<EventTypeSlug, number>;
  }, [settings]);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const [config, setConfig] = useState<{ stripe: boolean, flouci: boolean, konnect: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'konnect' | 'manuel'>('konnect');

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  function getMaxDays(mStr: string, yStr: string): number {
    const month = parseInt(mStr, 10);
    const year = parseInt(yStr, 10);
    if (isNaN(month)) return 31;
    const safeMonth = Math.min(12, Math.max(1, month));
    const safeYear = isNaN(year) ? new Date().getFullYear() : year;
    return new Date(safeYear, safeMonth, 0).getDate();
  }

  const handleVerifyDate = async () => {
    setVerificationError(null);
    setIsVerified(false);
    setSelectedDate(null);
    
    const day = parseInt(selectedDay.trim(), 10);
    const month = parseInt(selectedMonth.trim(), 10) - 1; // 0-indexed month
    const year = parseInt(selectedYear.trim(), 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      setVerificationError("Veuillez remplir tous les champs (Jour, Mois, Année) avec des nombres valides.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2;
    if (year > maxYear) {
      setVerificationError(`L'année sélectionnée ne peut pas dépasser ${maxYear} (maximum 2 ans dans le futur).`);
      return;
    }

    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) {
      setVerificationError("La date saisie n'existe pas (veuillez vérifier le jour, le mois et l'année).");
      return;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // Past date check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    if (parsed < today) {
      setVerificationError("La date choisie est déjà passée.");
      return;
    }

    // Lead days check
    const diffTime = parsed.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < minLeadDays) {
      setVerificationError(`Délai trop court. Les réservations en ligne doivent être effectuées au moins ${minLeadDays} jours à l'avance.`);
      return;
    }

    setCheckingAvailability(true);
    try {
      const blockedDates = await fetchAvailability();
      setAvailability(blockedDates);
      
      if (blockedDates.includes(dateStr)) {
        setVerificationError("Cette date n'est pas disponible (déjà réservée).");
      } else {
        setSelectedDate(dateStr);
        setIsVerified(true);
        toast.success("Date disponible !");
      }
    } catch (err: any) {
      setVerificationError(err.message || "Impossible de vérifier la disponibilité.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const isPastDate = useMemo(() => {
    if (!selectedDate) return false;
    const parts = selectedDate.split("-");
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, [selectedDate]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState<EventTypeSlug>("Mariage");
  const [guests, setGuests] = useState(150);
  const [notes, setNotes] = useState("");
  const [botField, setBotField] = useState("");

  const [bookingResult, setBookingResult] = useState<CreateBookingResult | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const basePrice = eventPrices[eventType] || 1500;
  const depositPercent = settings?.deposit_percent ?? 30;
  const depositAmount = Math.round(basePrice * (depositPercent / 100));

  const minGuests = settings?.min_guests ?? 50;
  const maxGuests = settings?.max_guests ?? 400;
  const minLeadDays = settings?.min_lead_days ?? 14;

  const leadDaysTooShort = useMemo(() => {
    if (!selectedDate) return false;
    const parts = selectedDate.split("-");
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < minLeadDays;
  }, [selectedDate, minLeadDays]);

  useEffect(() => {
    setLoadingAvailability(true);
    fetchSettings()
      .then((data) => setSettings(data))
      .catch((err) => console.error("Error fetching settings:", err));

    fetchConfigStatus()
      .then((data) => {
        setConfig(data);
        setPaymentMethod('konnect');
      })
      .catch((err) => console.error("Error fetching config status:", err));

    fetchAvailability()
      .then((blockedDates) => {
        setAvailability(blockedDates);
      })
      .catch((err) => {
        console.error("Error fetching availability:", err);
      })
      .finally(() => {
        setLoadingAvailability(false);
      });
  }, []);

  const monthsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => t(`month.${idx}`));
  }, [t]);

  const formatNiceDate = (d: Date) => {
    return `${d.getDate()} ${monthsList[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botField) {
      toast.error("Erreur réseau temporaire, veuillez réessayer plus tard.");
      return;
    }
    if (!selectedDate) {
      toast.error("Veuillez d'abord choisir une date.");
      return;
    }
    setStep(3);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setLoadingSubmit(true);

    try {
      const payload = {
        firstName,
        lastName,
        phone,
        email,
        date: selectedDate,
        eventType,
        guests,
        notes,
        bot_field: botField,
        paymentMethod,
        mock: paymentMethod === 'konnect' ? !config?.konnect : false
      };

      const res = await createBooking(payload);
      
      setLoadingSubmit(false);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
      setBookingResult(res);
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer la réservation");
      setLoadingSubmit(false);
    }
  };

  return (
    <section className="bg-zinc-50 dark:bg-zinc-950 py-32 relative overflow-hidden" id="reservation">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6A969]/30 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 space-y-4 animate-fade-in"
        >
          <span className="section-label">Réservation</span>
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white tracking-tight">
            {t("booking.title")}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-sans text-base max-w-lg mx-auto">
            {t("booking.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex justify-center items-center relative mb-16"
        >
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-zinc-200 dark:bg-zinc-800 z-0">
            <div
              className="h-full bg-[#C6A969] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            />
          </div>
          <div className="flex gap-16 md:gap-24">
            {[1, 2, 3].map((num) => {
              const label = num === 1 ? t("booking.step_date") : num === 2 ? t("booking.step_details") : t("booking.step_payment");
              const isActive = step === num;
              const isCompleted = step > num;
              return (
                <div key={num} className="flex flex-col items-center gap-3 relative z-10 bg-zinc-50 dark:bg-zinc-950 px-2">
                  <div className={`w-10 h-10 flex items-center justify-center font-sans font-medium text-sm transition-all duration-500 border rounded-full ${
                    isActive
                      ? "bg-[#C6A969] text-white border-[#C6A969] shadow-[0_4px_15px_rgba(198,169,105,0.3)]"
                      : isCompleted
                        ? "bg-zinc-100 dark:bg-zinc-800 text-[#C6A969] border-[#C6A969]/30"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                  }`}>
                    {isCompleted ? <i className="fa-solid fa-check"></i> : num}
                  </div>
                  <span className={`font-sans text-xs transition-colors duration-300 ${isActive ? "font-medium text-[#C6A969]" : "text-zinc-500"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_8px_60px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_60px_rgb(0,0,0,0.2)] p-8 md:p-12 relative"
        >
          <AnimatePresence mode="wait">

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }} className="space-y-8 text-left">
              <div className="flex flex-col text-left">
                <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-4">{t("booking.step_date")}</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Day input */}
                  <div className="flex flex-col text-left">
                    <label className="text-xs font-sans uppercase tracking-wider text-zinc-400 mb-2">Jour</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 28"
                      value={selectedDay}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val !== "") {
                          let num = parseInt(val, 10);
                          const maxD = getMaxDays(selectedMonth, selectedYear);
                          if (num > maxD) val = String(maxD);
                          if (num < 1) val = "";
                        }
                        setSelectedDay(val);
                        setIsVerified(false);
                        setSelectedDate(null);
                        setVerificationError(null);
                      }}
                      className="input-lux w-full"
                    />
                  </div>

                  {/* Month input */}
                  <div className="flex flex-col text-left">
                    <label className="text-xs font-sans uppercase tracking-wider text-zinc-400 mb-2">Mois</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Ex: 08"
                      value={selectedMonth}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val !== "") {
                          let num = parseInt(val, 10);
                          if (num > 12) val = "12";
                          if (num < 1) val = "";
                        }
                        setSelectedMonth(val);
                        setIsVerified(false);
                        setSelectedDate(null);
                        setVerificationError(null);

                        if (selectedDay) {
                          const maxD = getMaxDays(val, selectedYear);
                          if (parseInt(selectedDay, 10) > maxD) {
                            setSelectedDay(String(maxD));
                          }
                        }
                      }}
                      className="input-lux w-full"
                    />
                  </div>

                  {/* Year input */}
                  <div className="flex flex-col text-left">
                    <label className="text-xs font-sans uppercase tracking-wider text-zinc-400 mb-2">Année</label>
                    <input
                      type="number"
                      min={new Date().getFullYear()}
                      max={new Date().getFullYear() + 2}
                      placeholder={`Ex: ${new Date().getFullYear()}`}
                      value={selectedYear}
                      onChange={(e) => {
                        const currentY = new Date().getFullYear();
                        const maxValY = currentY + 2;
                        let val = e.target.value;
                        if (val !== "") {
                          let num = parseInt(val, 10);
                          if (num > maxValY) val = String(maxValY);
                        }
                        setSelectedYear(val);
                        setIsVerified(false);
                        setSelectedDate(null);
                        setVerificationError(null);

                        if (selectedDay && selectedMonth) {
                          const maxD = getMaxDays(selectedMonth, val);
                          if (parseInt(selectedDay, 10) > maxD) {
                            setSelectedDay(String(maxD));
                          }
                        }
                      }}
                      className="input-lux w-full"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyDate}
                  disabled={checkingAvailability || !selectedDay || !selectedMonth || !selectedYear}
                  className="btn btn-gold flex items-center gap-2 justify-center cursor-pointer w-full shine-effect text-sm font-sans font-medium h-[46px]"
                >
                  {checkingAvailability ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                  )}
                  Vérifier la disponibilité
                </button>
              </div>

              {verificationError && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-sans flex items-start gap-3 animate-fade-in">
                  <i className="fa-solid fa-circle-xmark mt-1"></i>
                  <div>
                    <span className="font-medium block mb-1">Date non disponible</span>
                    {verificationError}
                  </div>
                </div>
              )}

              {isVerified && selectedDate && (
                <div className="p-4 bg-[#C6A969]/5 border border-[#C6A969]/20 text-[#A88B4A] dark:text-[#D4B978] text-sm font-sans flex items-start gap-3 animate-fade-in">
                  <i className="fa-solid fa-circle-check mt-1"></i>
                  <div>
                    <span className="font-medium block mb-1">Date disponible !</span>
                    {t("booking.available_date_success", { date: formatNiceDate(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, parseInt(selectedDay))) })}
                  </div>
                </div>
              )}

              {!isVerified && !verificationError && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-sans flex items-center gap-3">
                  <i className="fa-solid fa-circle-info text-[#C6A969]"></i>
                  Veuillez remplir les 3 champs ci-dessus et cliquer sur "Vérifier la disponibilité" pour continuer.
                </div>
              )}

              <div className="flex justify-end pt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!isVerified || !selectedDate}
                  className="btn btn-gold cursor-pointer"
                >
                  {t("booking.btn_continue")}
                  <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }} className="space-y-8">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">{t("booking.first_name")}</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-lux" placeholder={t("booking.first_name_placeholder")} />
                  </div>
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">{t("booking.last_name")}</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-lux" placeholder={t("booking.last_name_placeholder")} />
                  </div>
                  <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
                    <input type="text" id="bot_field" name="bot_field" value={botField} onChange={(e) => setBotField(e.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">{t("booking.phone")}</label>
                    <input
                      type="tel"
                      required
                      maxLength={8}
                      pattern="[0-9]{8}"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 8) setPhone(val);
                      }}
                      className="input-lux"
                      placeholder={t("booking.phone_placeholder")}
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">{t("booking.email")}</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-lux" placeholder={t("booking.email_placeholder")} />
                  </div>

                  <div className="md:col-span-2 flex flex-col text-left mt-4">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-3">{t("booking.event_type")}</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {(Object.keys(eventPrices) as EventTypeSlug[]).map((slug) => {
                        const isSelected = eventType === slug;
                        return (
                          <button key={slug} type="button" onClick={() => setEventType(slug)} className={`p-4 border text-center transition-all duration-300 cursor-pointer group ${
                            isSelected
                              ? "border-[#C6A969] bg-[#C6A969] text-white shadow-[0_4px_15px_rgba(198,169,105,0.25)]"
                              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-[#C6A969]/40 text-zinc-600 dark:text-zinc-400"
                          }`}>
                            <span className="font-sans text-xs font-medium block">{t(`event.${slug}`)}</span>
                            <span className="text-xs opacity-75 mt-1 block">{eventPrices[slug]} TND</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col text-left md:col-span-2">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">{t("booking.guests")}</label>
                    <input type="number" required min={minGuests} max={maxGuests} value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 0)} className="input-lux" />
                    <span className="text-xs text-zinc-400 mt-1">{t("booking.capacity_limit") || `Capacité autorisée : de ${minGuests} à ${maxGuests} personnes.`}</span>
                  </div>

                  <div className="flex flex-col text-left md:col-span-2">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">{t("booking.notes")}</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-lux" placeholder={t("booking.notes_placeholder")} />
                  </div>
                </div>

                <div className="p-5 bg-[#C6A969]/5 border border-[#C6A969]/15 text-left space-y-2">
                  <div className="flex justify-between items-center text-sm text-zinc-600 dark:text-zinc-400">
                    <span>{t("booking.total_price")}</span>
                    <span>{basePrice.toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-[#C6A969]/10 text-base font-medium text-zinc-950 dark:text-white">
                    <span>{t("booking.deposit_price")}</span>
                    <span className="text-[#C6A969] font-display text-lg">{depositAmount.toLocaleString("fr-TN")} TND</span>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={() => setStep(1)} className="btn btn-outline cursor-pointer">
                    <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>
                    {t("booking.btn_back")}
                  </button>
                  <button type="submit" className="btn btn-gold cursor-pointer" disabled={loadingSubmit}>
                    {t("booking.btn_payment")}
                    <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }} className="space-y-8 text-left">
              <div className="bg-[#C6A969]/5 border border-[#C6A969]/15 p-6 space-y-3">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 border-b border-[#C6A969]/10 pb-2">
                  <span>{t("booking.step_date")}</span>
                  <span className="font-medium text-zinc-950 dark:text-white">{formatNiceDate(parseISO(selectedDate!))}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 border-b border-[#C6A969]/10 pb-2">
                  <span>{t("booking.total_price")}</span>
                  <span className="font-medium text-zinc-950 dark:text-white">{basePrice.toLocaleString("fr-TN")} TND</span>
                </div>
                <div className="flex justify-between text-base pt-1 font-medium text-zinc-950 dark:text-white">
                  <span>{t("booking.deposit_price")}</span>
                  <span className="text-[#C6A969] font-display text-lg">{depositAmount.toLocaleString("fr-TN")} TND</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-sans text-sm font-medium text-[#C6A969] uppercase tracking-wider block">
                  Mode de Paiement Sécurisé
                </label>
                <div className="p-6 border border-[#C6A969]/20 bg-[#C6A969]/5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#C6A969] text-white rounded-none flex items-center justify-center">
                      <i className="fa-solid fa-credit-card text-sm"></i>
                    </div>
                    <span className="font-sans font-medium text-sm text-zinc-900 dark:text-white">
                      {t("booking.payment_online")}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {t("booking.payment_online_desc")}
                  </span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {(!config?.konnect || !settings) && (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-sans flex items-center gap-3">
                      <i className="fa-solid fa-circle-info text-[#C6A969] text-base"></i>
                      <span>Vous allez simuler le paiement en ligne (mode démo/test) pour enregistrer la réservation.</span>
                    </div>
                  )}

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={() => setStep(2)} className="btn btn-outline cursor-pointer" disabled={loadingSubmit}>
                    <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>
                    {t("booking.btn_back")}
                  </button>
                  <button type="submit" className="btn btn-gold cursor-pointer flex items-center gap-2 justify-center min-w-[180px] shine-effect" disabled={loadingSubmit}>
                    {loadingSubmit && <i className="fa-solid fa-spinner fa-spin"></i>}
                    {loadingSubmit 
                      ? t("booking.processing") 
                      : t("booking.btn_pay", { amount: depositAmount })}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 4 && bookingResult && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="space-y-8 py-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto bg-gradient-to-br from-[#C6A969] to-[#A88B4A] text-white rounded-full flex items-center justify-center text-3xl shadow-[0_8px_30px_rgba(198,169,105,0.3)]"
              >
                <i className="fa-solid fa-check"></i>
              </motion.div>

              <div className="space-y-3">
                <h3 className="text-2xl font-display font-medium text-zinc-950 dark:text-white">
                  {paymentMethod === 'manuel' ? "Réservation Enregistrée" : t("booking.success_title")}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 font-sans text-sm max-w-lg mx-auto leading-relaxed">
                  {paymentMethod === 'manuel'
                    ? t("booking.success_text_manuel")
                    : t("booking.success_text")}
                </p>
              </div>

              <div className="inline-block bg-[#C6A969]/5 border border-[#C6A969]/20 px-6 py-3 text-sm font-sans text-zinc-950 dark:text-white font-medium">
                {t("booking.success_ref", { ref: bookingResult.ref })}
              </div>
            </motion.div>
          )}

          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function parseISO(dateString: string): Date {
  const parts = dateString.split("-");
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}
