import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "fr" | "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Nav
    "nav.home": "Accueil",
    "nav.lounge": "Lounge",
    "nav.salle": "La Salle",
    "nav.media": "Galerie",
    "nav.contact": "Contact",
    "nav.book": "Réserver",
    
    // Hero
    "hero.title": "L'art de célébrer les moments qui comptent.",
    "hero.subtitle": "Salle des fêtes et service traiteur d'exception à Manouba.",
    "hero.cta_book": "Réserver une date",
    "hero.cta_discover": "Découvrir le lieu",
    
    // CtaBanner
    "cta.title": "Prêt à créer des souvenirs inoubliables ?",
    "cta.text": "Réservez votre date dès maintenant et laissez-nous transformer votre vision en une célébration extraordinaire.",
    
    // Welcome
    "welcome.title": "Le prestige d'une célébration réussie",
    "welcome.text": "Situé à Manouba, Albatros est le lieu d'exception pour tous vos événements marquants. Que ce soit pour un mariage féerique, des fiançailles mémorables ou une réception de haut standing, notre salle raffinée et notre équipe dévouée mettent tout en œuvre pour faire de votre célébration un moment inoubliable et magique.",
    
    // Lounge
    "lounge.title": "Le Lounge et l'Espace Traiteur",
    "lounge.text": "Pour accompagner vos festivités, Albatros met à votre disposition un service traiteur d'exception et un espace lounge raffiné pour accueillir vos invités d'honneur dans les meilleures conditions. Nos équipes élaborent des buffets prestigieux et des pâtisseries fines traditionnelles et modernes.",
    "lounge.buffets_title": "Buffets et Dîners",
    "lounge.buffets_text": "Conception de menus sur mesure allant des amuse-bouches délicats aux repas gastronomiques complets.",
    "lounge.pastry_title": "Pâtisserie Fine",
    "lounge.pastry_text": "Une sélection de douceurs tunisiennes traditionnelles et créations contemporaines faites maison.",
    
    // Salle
    "salle.title": "Un espace pensé pour les grandes réceptions",
    "salle.text": "La salle des fêtes Albatros est l'écrin idéal pour vos mariages, fiançailles, anniversaires et événements professionnels. Avec une capacité d'accueil généreuse et une décoration élégante, nous donnons vie à vos rêves les plus ambitieux.",
    "salle.stat_guests_num": "400",
    "salle.stat_guests_label": "Capacité d'invités maximum",
    "salle.stat_years_num": "15+",
    "salle.stat_years_label": "Années d'expertise événementielle",
    
    // Galerie
    "galerie.title": "Moments d'exception",
    "galerie.see_more": "Voir plus",
    "galerie.return": "Retour",
    
    // Testimonials
    "testimonials.title": "L'avis de nos invités",
    "testimonials.1.text": "\"Une journée de rêve, parfaitement orchestrée. L'équipe a su comprendre nos attentes et les dépasser. La salle était magnifique, le repas exceptionnel. Nos invités en parlent encore.\"",
    "testimonials.1.author": "Sophie et Karim Benali",
    "testimonials.1.date": "Mariage, Juin 2025",
    "testimonials.2.text": "\"Nous avons célébré les 60 ans de ma mère à Albatros. Accueil chaleureux, service impeccable, décoration soignée. Un grand merci à toute l'équipe pour ce moment inoubliable.\"",
    "testimonials.2.author": "Nadia Cherif",
    "testimonials.2.date": "Anniversaire, Mars 2025",
    
    // Info / Contact
    "info.title": "Nous trouver",
    "info.address_label": "Adresse",
    "info.address_value": "Av Complexe Sportif, Manouba 2010, Tunisie",
    "info.phone_label": "Téléphone",
    "info.email_label": "Email",
    "info.hours_title": "Horaires",
    "info.hours_office_title": "Bureau des réservations",
    "info.hours_office_week": "Lundi - Samedi",
    "info.hours_office_week_val": "09h00 - 18h00",
    "info.hours_office_sunday": "Dimanche",
    "info.hours_office_sunday_val": "Sur rendez-vous",
    "info.hours_events_title": "Salle Des Fêtes (Événements)",
    "info.hours_events_weekend": "Vendredi - Samedi",
    "info.hours_events_weekend_val": "11h00 - 03h00",
    "info.hours_events_week": "Dimanche - Jeudi",
    "info.hours_events_week_val": "11h00 - 23h00",
    
    // Footer
    "footer.brand_text": "L'art de célébrer les moments qui comptent. Une salle d'exception et un service traiteur haut de gamme à Manouba.",
    "footer.nav_title": "Navigation",
    "footer.rights": "© {year} Albatros. Tous droits réservés.",
    "footer.legal": "Mentions légales",
    "footer.privacy": "Confidentialité",
    
    // Booking
    "booking.title": "Réserver votre instant",
    "booking.subtitle": "Choisissez votre date et sécurisez votre événement en quelques minutes.",
    "booking.step_date": "Date",
    "booking.step_details": "Détails",
    "booking.step_payment": "Paiement",
    "booking.day": "Jour",
    "booking.month": "Mois",
    "booking.year": "Année",
    "booking.past_date_title": "Date Invalide",
    "booking.past_date_error": "Vous ne pouvez pas sélectionner une date dans le passé.",
    "booking.unavailable_date_title": "Date Indisponible",
    "booking.unavailable_date_error": "Cette date est déjà réservée ou bloquée.",
    "booking.available_date_title": "Date Disponible",
    "booking.available_date_success": "La date du {date} est libre.",
    "booking.select_date_prompt": "Sélectionnez une date pour vérifier la disponibilité.",
    "booking.btn_continue": "Continuer",
    "booking.first_name": "Prénom *",
    "booking.first_name_placeholder": "Ex: Youssef",
    "booking.last_name": "Nom *",
    "booking.last_name_placeholder": "Ex: Trabelsi",
    "booking.phone": "Téléphone *",
    "booking.phone_placeholder": "+216 -- --- ---",
    "booking.email": "Email *",
    "booking.email_placeholder": "Ex: client@gmail.com",
    "booking.event_type": "Type d'événement *",
    "booking.guests": "Nombre d'invités *",
    "booking.notes": "Notes ou demandes",
    "booking.notes_placeholder": "Détails de décoration, traiteur, planification spécifique...",
    "booking.total_price": "Tarif Estimé de la Salle",
    "booking.deposit_price": "Acompte requis (30%)",
    "booking.btn_back": "Retour",
    "booking.btn_payment": "Paiement",
    "booking.summary_title": "Résumé de réservation",
    "booking.card_info": "Informations de paiement *",
    "booking.btn_pay": "Payer {amount} TND",
    "booking.processing": "Traitement...",
    "booking.success_title": "Réservation confirmée",
    "booking.success_text": "Votre acompte a bien été reçu. Nous vous contacterons sous 24h pour finaliser les détails.",
    "booking.success_ref": "Réf: {ref}",
    "booking.choose_payment_method": "Choisir votre méthode de paiement :",
    "booking.stripe_desc": "Cartes internationales (Visa / Mastercard)",
    "booking.flouci_desc": "Portefeuille mobile et cartes bancaires locales",
    "booking.konnect_desc": "e-DINAR, Sobflous et portefeuilles tunisiens",
    "booking.d17_desc": "Paiement mobile via l'application Poste D17",
    
    // Stripe cancel/success page in App.tsx
    "success.title": "Réservation confirmée",
    "success.text": "Votre acompte a bien été reçu. Nous vous contacterons sous 24h pour finaliser les détails de votre événement.",
    "success.ref_title": "Référence",
    "success.btn_home": "Retour à l'accueil",
    "cancel.title": "Paiement annulé",
    "cancel.text": "Votre acompte n'a pas pu être traité. Votre date n'a pas été confirmée. Vous pouvez réessayer d'effectuer la réservation.",
    "cancel.retry": "Réessayer",
    "cancel.back": "Retour",
    
    // Events
    "event.Mariage": "Mariage",
    "event.Soirée": "Soirée",
    "event.Entreprise": "Entreprise",
    "event.Anniversaire": "Anniversaire",
    "event.Autre": "Autre",
    
    // Months
    "month.0": "Janvier",
    "month.1": "Février",
    "month.2": "Mars",
    "month.3": "Avril",
    "month.4": "Mai",
    "month.5": "Juin",
    "month.6": "Juillet",
    "month.7": "Août",
    "month.8": "Septembre",
    "month.9": "Octobre",
    "month.10": "Novembre",
    "month.11": "Décembre"
  },
  en: {
    // Nav
    "nav.home": "Home",
    "nav.lounge": "Lounge",
    "nav.salle": "The Hall",
    "nav.media": "Gallery",
    "nav.contact": "Contact",
    "nav.book": "Book",
    
    // Hero
    "hero.title": "The art of celebrating the moments that matter.",
    "hero.subtitle": "Exceptional event hall and catering service in Manouba.",
    "hero.cta_book": "Book a date",
    "hero.cta_discover": "Discover the venue",
    
    // CtaBanner
    "cta.title": "Ready to create unforgettable memories?",
    "cta.text": "Book your date now and let us transform your vision into an extraordinary celebration.",
    
    // Welcome
    "welcome.title": "The prestige of a successful celebration",
    "welcome.text": "Located in Manouba, Albatros is the exceptional venue for all your landmark events. Whether for a magical wedding, a memorable engagement, or a high-class reception, our refined hall and dedicated team do everything to make your celebration an unforgettable and magical moment.",
    
    // Lounge
    "lounge.title": "The Lounge & Catering Space",
    "lounge.text": "To accompany your festivities, Albatros provides an exceptional catering service and a refined lounge area to welcome your guests of honor in the best conditions. Our teams prepare prestigious buffets and fine traditional and modern pastries.",
    "lounge.buffets_title": "Buffets and Dinners",
    "lounge.buffets_text": "Tailored menu designs ranging from delicate appetizers to full gourmet meals.",
    "lounge.pastry_title": "Fine Pastry",
    "lounge.pastry_text": "A selection of traditional Tunisian sweets and homemade contemporary creations.",
    
    // Salle
    "salle.title": "A space designed for grand receptions",
    "salle.text": "The Albatros event hall is the ideal setting for your weddings, engagements, birthdays, and professional events. With a generous capacity and elegant decoration, we bring your most ambitious dreams to life.",
    "salle.stat_guests_num": "400",
    "salle.stat_guests_label": "Maximum guest capacity",
    "salle.stat_years_num": "15+",
    "salle.stat_years_label": "Years of event expertise",
    
    // Galerie
    "galerie.title": "Exceptional moments",
    "galerie.see_more": "See more",
    "galerie.return": "Return",
    
    // Testimonials
    "testimonials.title": "Guest reviews",
    "testimonials.1.text": "\"A dream day, perfectly orchestrated. The team understood our expectations and exceeded them. The hall was magnificent, the meal exceptional. Our guests are still talking about it.\"",
    "testimonials.1.author": "Sophie and Karim Benali",
    "testimonials.1.date": "Wedding, June 2025",
    "testimonials.2.text": "\"We celebrated my mother's 60th birthday at Albatros. Warm welcome, impeccable service, elegant decoration. A big thank you to the whole team for this unforgettable moment.\"",
    "testimonials.2.author": "Nadia Cherif",
    "testimonials.2.date": "Birthday, March 2025",
    
    // Info / Contact
    "info.title": "Find us",
    "info.address_label": "Address",
    "info.address_value": "Av Complexe Sportif, Manouba 2010, Tunisia",
    "info.phone_label": "Phone",
    "info.email_label": "Email",
    "info.hours_title": "Opening Hours",
    "info.hours_office_title": "Booking Office",
    "info.hours_office_week": "Monday - Saturday",
    "info.hours_office_week_val": "09:00 AM - 06:00 PM",
    "info.hours_office_sunday": "Sunday",
    "info.hours_office_sunday_val": "By appointment",
    "info.hours_events_title": "Event Hall (Events)",
    "info.hours_events_weekend": "Friday - Saturday",
    "info.hours_events_weekend_val": "11:00 AM - 03:00 AM",
    "info.hours_events_week": "Sunday - Thursday",
    "info.hours_events_week_val": "11:00 AM - 11:00 PM",
    
    // Footer
    "footer.brand_text": "The art of celebrating the moments that matter. An exceptional venue and premium catering service in Manouba.",
    "footer.nav_title": "Navigation",
    "footer.rights": "© {year} Albatros. All rights reserved.",
    "footer.legal": "Legal notice",
    "footer.privacy": "Privacy policy",
    
    // Booking
    "booking.title": "Book your moment",
    "booking.subtitle": "Choose your date and secure your event in just a few minutes.",
    "booking.step_date": "Date",
    "booking.step_details": "Details",
    "booking.step_payment": "Payment",
    "booking.day": "Day",
    "booking.month": "Month",
    "booking.year": "Year",
    "booking.past_date_title": "Invalid Date",
    "booking.past_date_error": "You cannot select a date in the past.",
    "booking.unavailable_date_title": "Date Unavailable",
    "booking.unavailable_date_error": "This date is already booked or blocked.",
    "booking.available_date_title": "Date Available",
    "booking.available_date_success": "The date {date} is available.",
    "booking.select_date_prompt": "Select a date to check availability.",
    "booking.btn_continue": "Continue",
    "booking.first_name": "First Name *",
    "booking.first_name_placeholder": "E.g. Youssef",
    "booking.last_name": "Last Name *",
    "booking.last_name_placeholder": "E.g. Trabelsi",
    "booking.phone": "Phone *",
    "booking.phone_placeholder": "+216 -- --- ---",
    "booking.email": "Email *",
    "booking.email_placeholder": "E.g. client@gmail.com",
    "booking.event_type": "Event Type *",
    "booking.guests": "Number of Guests *",
    "booking.notes": "Notes or Requests",
    "booking.notes_placeholder": "Details about decoration, catering, specific schedules...",
    "booking.total_price": "Estimated Hall Rate",
    "booking.deposit_price": "Required Deposit (30%)",
    "booking.btn_back": "Back",
    "booking.btn_payment": "Payment",
    "booking.summary_title": "Booking Summary",
    "booking.card_info": "Payment Information *",
    "booking.btn_pay": "Pay {amount} TND",
    "booking.processing": "Processing...",
    "booking.success_title": "Booking confirmed",
    "booking.success_text": "Your deposit has been successfully received. We will contact you within 24 hours to finalize details.",
    "booking.success_ref": "Ref: {ref}",
    "booking.choose_payment_method": "Choose your payment method:",
    "booking.stripe_desc": "International cards (Visa / Mastercard)",
    "booking.flouci_desc": "Mobile wallet and local bank cards",
    "booking.konnect_desc": "e-DINAR, Sobflous and Tunisian wallets",
    "booking.d17_desc": "Mobile payment via Poste D17 app",
    
    // Stripe cancel/success page in App.tsx
    "success.title": "Booking confirmed",
    "success.text": "Your deposit has been successfully received. We will contact you within 24 hours to finalize your event details.",
    "success.ref_title": "Reference",
    "success.btn_home": "Back to Home",
    "cancel.title": "Payment cancelled",
    "cancel.text": "Your deposit payment could not be processed. Your date has not been confirmed. You can try again to complete the booking.",
    "cancel.retry": "Try Again",
    "cancel.back": "Back",
    
    // Events
    "event.Mariage": "Wedding",
    "event.Soirée": "Evening Party",
    "event.Entreprise": "Corporate Event",
    "event.Anniversaire": "Birthday",
    "event.Autre": "Other",
    
    // Months
    "month.0": "January",
    "month.1": "February",
    "month.2": "March",
    "month.3": "April",
    "month.4": "May",
    "month.5": "June",
    "month.6": "July",
    "month.7": "August",
    "month.8": "September",
    "month.9": "October",
    "month.10": "November",
    "month.11": "December"
  },
  ar: {
    // Nav
    "nav.home": "الرئيسية",
    "nav.lounge": "الصالون",
    "nav.salle": "القاعة",
    "nav.media": "المعرض",
    "nav.contact": "الاتصال",
    "nav.book": "احجز الآن",
    
    // Hero
    "hero.title": "فن الاحتفال باللحظات التي لا تُنسى.",
    "hero.subtitle": "قاعة مناسبات وخدمات بوفيه استثنائية في منوبة.",
    "hero.cta_book": "احجز تاريخاً",
    "hero.cta_discover": "اكتشف المكان",
    
    // CtaBanner
    "cta.title": "هل أنت مستعد لصنع ذكريات لا تُنسى؟",
    "cta.text": "احجز موعدك الآن ودعنا نحول رؤيتك إلى احتفال استثنائي.",
    
    // Welcome
    "welcome.title": "فخامة الاحتفالات الناجحة",
    "welcome.text": "تقع قاعة الباتروس (Albatros) في منوبة، وهي المكان المثالي لجميع مناسباتكم المميزة. سواء كان حفل زفاف أسطوري، خطوبة مميزة، أو استقبال راقٍ، فإن قاعتنا الفخمة وفريقنا المتفاني يبذلون قصارى جهدهم لجعل احتفالكم لحظة سحرية لا تُنسى.",
    
    // Lounge
    "lounge.title": "الصالون وفضاء البوفيه",
    "lounge.text": "لمرافقة احتفالاتكم، توفر لكم الباتروس خدمات بوفيه استثنائية ومساحة صالون راقية لاستقبل ضيوفكم الكرام في أفضل الظروف. تقوم فرقنا بإعداد بوفيهات فاخرة وحلويات راقية تقليدية وعصرية.",
    "lounge.buffets_title": "البوفيه والعشاء",
    "lounge.buffets_text": "تصميم قوائم طعام مخصصة من المقبلات الخفيفة إلى الوجبات الفاخرة الكاملة.",
    "lounge.pastry_title": "الحلويات الراقية",
    "lounge.pastry_text": "تشكيلة من الحلويات التونسية التقليدية والابتكارات العصرية المصنوعة منزلياً.",
    
    // Salle
    "salle.title": "فضاء مصمم للاستقبالات الكبرى",
    "salle.text": "قاعة الأفراح الباتروس هي الإطار المثالي لحفلات الزفاف، الخطوبة، أعياد الميلاد، والفعاليات المهنية. بفضل طاقة استيعابها الكبيرة وديكورها الأنيق، نجسد أحلامكم الأكثر طموحاً.",
    "salle.stat_guests_num": "400",
    "salle.stat_guests_label": "أقصى سعة للضيوف",
    "salle.stat_years_num": "15+",
    "salle.stat_years_label": "سنوات من الخبرة في تنظيم الحفلات",
    
    // Galerie
    "galerie.title": "لحظات استثنائية",
    "galerie.see_more": "عرض المزيد",
    "galerie.return": "رجوع",
    
    // Testimonials
    "testimonials.title": "آراء ضيوفنا الكرام",
    "testimonials.1.text": "\"يوم أحلام رائع ومنظم بدقة متناهية. تفهم الفريق توقعاتنا وتجاوزها بكثير. كانت القاعة غاية في الجمال والوجبة استثنائية. ما زال ضيوفنا يتحدثون عنها حتى اليوم.\"",
    "testimonials.1.author": "صوفي وكريم بن علي",
    "testimonials.1.date": "حفل زفاف، جوان 2025",
    "testimonials.2.text": "\"احتفلنا بعيد ميلاد والدتي الستين في الباتروس. استقبال دافئ، خدمة لا تشوبها شائبة، وديكور أنيق. شكراً جزيلاً لكافة أفراد الفريق على هذه اللحظة الرائعة.\"",
    "testimonials.2.author": "نادية الشريف",
    "testimonials.2.date": "عيد ميلاد، مارس 2025",
    
    // Info / Contact
    "info.title": "موقعنا",
    "info.address_label": "العنوان",
    "info.address_value": "شارع المركب الرياضي، منوبة 2010، تونس",
    "info.phone_label": "الهاتف",
    "info.email_label": "البريد الإلكتروني",
    "info.hours_title": "أوقات العمل",
    "info.hours_office_title": "مكتب الحجوزات",
    "info.hours_office_week": "الاثنين - السبت",
    "info.hours_office_week_val": "09:00 صباحاً - 06:00 مساءً",
    "info.hours_office_sunday": "الأحد",
    "info.hours_office_sunday_val": "بموعد مسبق",
    "info.hours_events_title": "قاعة المناسبات (الاحتفالات)",
    "info.hours_events_weekend": "الجمعة - السبت",
    "info.hours_events_weekend_val": "11:00 صباحاً - 03:00 صباحاً",
    "info.hours_events_week": "الأحد - الخميس",
    "info.hours_events_week_val": "11:00 صباحاً - 11:00 مساءً",
    
    // Footer
    "footer.brand_text": "فن الاحتفال باللحظات السعيدة. قاعة أفراح وخدمات بوفيه راقية في منوبة.",
    "footer.nav_title": "روابط سريعة",
    "footer.rights": "© {year} الباتروس. جميع الحقوق محفوظة.",
    "footer.legal": "شروط الاستخدام",
    "footer.privacy": "سياسة الخصوصية",
    
    // Booking
    "booking.title": "احجز موعدك",
    "booking.subtitle": "اختر تاريخك وأمّن حجز مناسبتك في دقائق معدودة.",
    "booking.step_date": "التاريخ",
    "booking.step_details": "التفاصيل",
    "booking.step_payment": "الدفع",
    "booking.day": "اليوم",
    "booking.month": "الشهر",
    "booking.year": "السنة",
    "booking.past_date_title": "تاريخ غير صالح",
    "booking.past_date_error": "لا يمكنك اختيار تاريخ في الماضي.",
    "booking.unavailable_date_title": "تاريخ غير متاح",
    "booking.unavailable_date_error": "هذا التاريخ محجوز أو مغلق بالفعل.",
    "booking.available_date_title": "تاريخ متاح",
    "booking.available_date_success": "تاريخ {date} متاح للحجز.",
    "booking.select_date_prompt": "الرجاء اختيار تاريخ للتحقق من التوفر.",
    "booking.btn_continue": "متابعة",
    "booking.first_name": "الاسم الشخصي *",
    "booking.first_name_placeholder": "مثال: يوسف",
    "booking.last_name": "اللقب *",
    "booking.last_name_placeholder": "مثال: الطرابلسي",
    "booking.phone": "رقم الهاتف *",
    "booking.phone_placeholder": "+216 -- --- ---",
    "booking.email": "البريد الإلكتروني *",
    "booking.email_placeholder": "مثال: client@gmail.com",
    "booking.event_type": "نوع المناسبة *",
    "booking.guests": "عدد الضيوف *",
    "booking.notes": "ملاحظات أو طلبات خاصة",
    "booking.notes_placeholder": "تفاصيل الديكور، خدمات البوفيه، تخطيط خاص...",
    "booking.total_price": "التكلفة التقديرية للقاعة",
    "booking.deposit_price": "مبلغ العربون المطلوب (30%)",
    "booking.btn_back": "رجوع",
    "booking.btn_payment": "الدفع",
    "booking.summary_title": "ملخص الحجز",
    "booking.card_info": "تفاصيل الدفع *",
    "booking.btn_pay": "دفع {amount} دينار",
    "booking.processing": "جاري معالجة الدفع...",
    "booking.success_title": "تم تأكيد الحجز بنجاح",
    "booking.success_text": "لقد تلقينا مبلغ العربون. سنتصل بك في غضون 24 ساعة لإنهاء تفاصيل مناسبتك.",
    "booking.success_ref": "رمز الحجز: {ref}",
    "booking.choose_payment_method": "اختر طريقة الدفع:",
    "booking.stripe_desc": "البطاقات الدولية (فيزا / ماستركارد)",
    "booking.flouci_desc": "المحفظة الإلكترونية والبطاقات البنكية المحلية",
    "booking.konnect_desc": "الدينار الإلكتروني (e-DINAR) والمحافظ التونسية",
    "booking.d17_desc": "الدفع عبر الهاتف المحمول (Poste D17)",
    
    // Stripe cancel/success page in App.tsx
    "success.title": "تم تأكيد الحجز",
    "success.text": "تم استلام مبلغ العربون بنجاح. سنتواصل معك خلال 24 ساعة لتأكيد تفاصيل الحفل.",
    "success.ref_title": "رمز الحجز",
    "success.btn_home": "العودة للرئيسية",
    "cancel.title": "تم إلغاء عملية الدفع",
    "cancel.text": "تعذر معالجة مبلغ العربون ولم يتم تأكيد موعدك بعد. يمكنك إعادة محاولة الحجز والدفع.",
    "cancel.retry": "إعادة المحاولة",
    "cancel.back": "رجوع",
    
    // Events
    "event.Mariage": "زواج",
    "event.Soirée": "سهرة خاصة",
    "event.Entreprise": "فعالية شركة",
    "event.Anniversaire": "عيد ميلاد",
    "event.Autre": "أخرى",
    
    // Months
    "month.0": "جانفي",
    "month.1": "فيفري",
    "month.2": "مارس",
    "month.3": "أفريل",
    "month.4": "ماي",
    "month.5": "جوان",
    "month.6": "جويلية",
    "month.7": "أوت",
    "month.8": "سبتمبر",
    "month.9": "أكتوبر",
    "month.10": "نوفمبر",
    "month.11": "ديسمبر"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("albatros_lang") as Language;
    return saved === "en" || saved === "ar" || saved === "fr" ? saved : "fr";
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem("albatros_lang", lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const langDict = translations[language];
    let template = langDict[key] || translations["fr"][key] || key;
    
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        template = template.replace(`{${k}}`, String(v));
      });
    }
    return template;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
