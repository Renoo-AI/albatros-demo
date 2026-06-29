// =============================================================
// ALBATROS : BookingWizard Component
// =============================================================
import React, { useState, useEffect, useMemo } from "react";
import type { EventTypeSlug } from "../types";
import { fetchAvailability, createBooking, type CreateBookingInput, type CreateBookingResult } from "../lib/api";
import { motion } from "motion/react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";

const eventPrices: Record<EventTypeSlug, number> = {
  "Mariage": 4000,
  "Soirée": 2500,
  "Entreprise": 2000,
  "Anniversaire": 1500,
  "Autre": 1500,
};

const eventLabels: Record<EventTypeSlug, string> = {
  "Mariage": "Mariage",
  "Soirée": "Soirée",
  "Entreprise": "Entreprise",
  "Anniversaire": "Anniversaire",
  "Autre": "Autre",
};

export function BookingWizard() {
  const stripe = useStripe();
  const elements = useElements();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Dropdown states
  const [selDay, setSelDay] = useState<string>("");
  const [selMonth, setSelMonth] = useState<string>("");
  const [selYear, setSelYear] = useState<string>("");

  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        setSelYear(parts[0]);
        setSelMonth(String(parseInt(parts[1])));
        setSelDay(String(parseInt(parts[2])));
      }
    } else {
      setSelDay("");
      setSelMonth("");
      setSelYear("");
    }
  }, [selectedDate]);

  const daysInSelectedMonth = useMemo(() => {
    const y = parseInt(selYear) || 2026;
    const m = parseInt(selMonth) || 1;
    return new Date(y, m, 0).getDate();
  }, [selMonth, selYear]);

  const isPastDate = useMemo(() => {
    if (!selectedDate) return false;
    const parts = selectedDate.split("-");
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, [selectedDate]);

  const handleDropdownChange = (d: string, m: string, y: string) => {
    if (d && m && y) {
      const formattedDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      setSelectedDate(formattedDate);
    } else {
      setSelectedDate(null);
    }
  };

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
  const depositPercent = 30;
  const depositAmount = Math.round(basePrice * (depositPercent / 100));

  useEffect(() => {
    setLoadingAvailability(true);
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

  const monthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

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
    if (!stripe || !elements || !selectedDate) return;

    setLoadingSubmit(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const intentResult = await import("../lib/api").then(m => m.createPaymentIntent(eventType));
      
      if (intentResult.mock) {
        const result = await createBooking({
          firstName, lastName, phone, email, date: selectedDate, eventType, guests, notes, paymentIntentId: "mock_pi_" + Date.now(), bot_field: botField
        });
        setBookingResult(result);
        setStep(4);
        return;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(intentResult.clientSecret, {
        payment_method: {
          card: cardElement as any,
          billing_details: { name: `${firstName} ${lastName}`, email, phone },
        },
      });

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent && paymentIntent.status === "requires_capture") {
        const result = await createBooking({
          firstName, lastName, phone, email, date: selectedDate, eventType, guests, notes, paymentIntentId: paymentIntent.id, bot_field: botField
        });
        setBookingResult(result);
        setStep(4);
      } else {
        throw new Error("Le paiement n'a pas pu être autorisé. Veuillez réessayer.");
      }

    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer la réservation");
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <section className="bg-zinc-50 dark:bg-zinc-950 py-32 relative overflow-hidden" id="reservation">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-5xl font-display font-medium text-zinc-950 dark:text-white tracking-tight">
            Réserver votre instant
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-sans text-base max-w-lg mx-auto">
            Choisissez votre date et sécurisez votre événement en quelques minutes.
          </p>
        </motion.div>

        {/* Steps indicator */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex justify-center items-center relative mb-16"
        >
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-zinc-200 dark:bg-zinc-800 z-0" />
          <div className="flex gap-16 md:gap-24">
            {[1, 2, 3].map((num) => {
              const label = num === 1 ? "Date" : num === 2 ? "Détails" : "Paiement";
              const isActive = step === num;
              const isCompleted = step > num;
              return (
                <div key={num} className="flex flex-col items-center gap-3 relative z-10 bg-zinc-50 dark:bg-zinc-950 px-2">
                  <div className={`w-10 h-10 flex items-center justify-center font-sans font-medium text-sm transition-colors duration-300 border rounded-full ${isActive ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white" : isCompleted ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white border-zinc-300 dark:border-zinc-700" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"}`}>
                    {isCompleted ? <i className="fa-solid fa-check"></i> : num}
                  </div>
                  <span className={`font-sans text-xs ${isActive ? "font-medium text-zinc-950 dark:text-white" : "text-zinc-500"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Wizard Container */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 shadow-[0_8px_40px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.2)] p-8 md:p-12 relative"
        >
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col text-left">
                  <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Jour</label>
                  <select value={selDay} onChange={(e) => { const val = e.target.value; setSelDay(val); handleDropdownChange(val, selMonth, selYear); }} className="input-lux cursor-pointer">
                    <option value="">--</option>
                    {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{String(d).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col text-left">
                  <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Mois</label>
                  <select value={selMonth} onChange={(e) => { const val = e.target.value; setSelMonth(val); handleDropdownChange(selDay, val, selYear); }} className="input-lux cursor-pointer">
                    <option value="">--</option>
                    {monthsList.map((m, idx) => (
                      <option key={m} value={String(idx + 1)}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col text-left">
                  <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Année</label>
                  <select value={selYear} onChange={(e) => { const val = e.target.value; setSelYear(val); handleDropdownChange(selDay, selMonth, val); }} className="input-lux cursor-pointer">
                    <option value="">--</option>
                    {[2026, 2027, 2028].map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDate ? (
                isPastDate ? (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-sans flex items-start gap-3">
                    <i className="fa-solid fa-circle-xmark mt-1"></i>
                    <div>
                      <span className="font-medium block mb-1">Date Invalide</span>
                      Vous ne pouvez pas sélectionner une date dans le passé.
                    </div>
                  </div>
                ) : availability.includes(selectedDate) ? (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-sans flex items-start gap-3">
                    <i className="fa-solid fa-circle-xmark mt-1"></i>
                    <div>
                      <span className="font-medium block mb-1">Date Indisponible</span>
                      Cette date est déjà réservée ou bloquée.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 text-sm font-sans flex items-start gap-3">
                    <i className="fa-solid fa-circle-check mt-1"></i>
                    <div>
                      <span className="font-medium block mb-1">Date Disponible</span>
                      La date du {formatNiceDate(parseISO(selectedDate))} est libre.
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-sans flex items-center gap-3">
                  <i className="fa-solid fa-calendar"></i>
                  Sélectionnez une date pour vérifier la disponibilité.
                </div>
              )}

              <div className="flex justify-end pt-8">
                <button type="button" onClick={() => setStep(2)} disabled={!selectedDate || isPastDate || availability.includes(selectedDate)} className="btn btn-primary">
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Prénom *</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-lux" placeholder="Ex: Youssef" />
                  </div>
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Nom *</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-lux" placeholder="Ex: Trabelsi" />
                  </div>
                  <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
                    <input type="text" id="bot_field" name="bot_field" value={botField} onChange={(e) => setBotField(e.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Téléphone *</label>
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input-lux" placeholder="+216 -- --- ---" />
                  </div>
                  <div className="flex flex-col text-left">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Email *</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-lux" placeholder="Ex: client@gmail.com" />
                  </div>

                  <div className="md:col-span-2 flex flex-col text-left mt-4">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-3">Type d'événement *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {(Object.keys(eventPrices) as EventTypeSlug[]).map((slug) => {
                        const isSelected = eventType === slug;
                        return (
                          <button key={slug} type="button" onClick={() => setEventType(slug)} className={`p-4 border text-center transition-all duration-300 ${isSelected ? "border-zinc-900 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-zinc-400 text-zinc-600 dark:text-zinc-400"}`}>
                            <span className="font-sans text-xs font-medium block">{eventLabels[slug]}</span>
                            <span className="text-xs opacity-75 mt-1 block">{eventPrices[slug]} TND</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col text-left md:col-span-2">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Nombre d'invités *</label>
                    <input type="number" required min={50} max={400} value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 0)} className="input-lux" />
                  </div>

                  <div className="flex flex-col text-left md:col-span-2">
                    <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Notes ou demandes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-lux" placeholder="Détails de décoration, traiteur, planification spécifique..." />
                  </div>
                </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left space-y-2">
                    <div className="flex justify-between items-center text-sm text-zinc-600 dark:text-zinc-400">
                      <span>Tarif Estimé de la Salle</span>
                      <span>{basePrice.toLocaleString("fr-TN")} TND</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 text-base font-medium text-zinc-950 dark:text-white">
                      <span>Acompte requis (30%)</span>
                      <span>{depositAmount.toLocaleString("fr-TN")} TND</span>
                    </div>
                  </div>

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={() => setStep(1)} className="btn btn-outline">Retour</button>
                  <button type="submit" className="btn btn-primary" disabled={loadingSubmit}>Paiement</button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 space-y-3">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span>Date</span>
                  <span className="font-medium text-zinc-950 dark:text-white">{formatNiceDate(parseISO(selectedDate!))}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span>Tarif total</span>
                  <span className="font-medium text-zinc-950 dark:text-white">{basePrice.toLocaleString("fr-TN")} TND</span>
                </div>
                <div className="flex justify-between text-base pt-1 font-medium text-zinc-950 dark:text-white">
                  <span>Acompte à payer</span>
                  <span>{depositAmount.toLocaleString("fr-TN")} TND</span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="flex flex-col text-left">
                  <label className="font-sans text-sm font-medium text-zinc-950 dark:text-white mb-2">Informations de paiement *</label>
                  <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 transition-colors">
                    <CardElement options={{ style: { base: { fontSize: '15px', color: '#18181b', '::placeholder': { color: '#a1a1aa' } }, invalid: { color: '#ef4444' } } }} />
                  </div>
                </div>
                <div className="flex justify-between pt-6">
                  <button type="button" onClick={() => setStep(2)} className="btn btn-outline" disabled={loadingSubmit}>Retour</button>
                  <button type="submit" className="btn btn-primary" disabled={loadingSubmit}>
                    {loadingSubmit ? "Traitement..." : `Payer ${depositAmount} TND`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && bookingResult && (
            <div className="space-y-8 py-6 text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full flex items-center justify-center text-2xl">
                <i className="fa-solid fa-check"></i>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-display font-medium text-zinc-950 dark:text-white">
                  Réservation confirmée
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 font-sans text-sm max-w-sm mx-auto">
                  Votre acompte a bien été reçu. Nous vous contacterons sous 24h pour finaliser les détails.
                </p>
              </div>

              <div className="inline-block bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-6 py-3 text-sm font-mono text-zinc-950 dark:text-white font-medium">
                Réf: {bookingResult.ref}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function parseISO(dateString: string): Date {
  const parts = dateString.split("-");
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

