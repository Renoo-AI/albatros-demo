// =============================================================
// ALBATROS — AdminConsole Component (Ultra Premium Stripe Light & Dark Mode)
// =============================================================
import React, { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import type { Booking, BlockedDate, BookingStatus, BusinessSettings, EventTypeSlug } from "../types";
import {
    fetchAdminBookings,
    fetchAdminBlocked,
    blockDate,
    unblockDate,
    updateBookingStatus,
    deleteBooking,
    restoreBooking,
    permanentDeleteBooking,
    fetchSettings,
    updateSettings,
    editBooking,
    refundBooking,
    recordManualPayment,
    createBooking
} from "../lib/api";

const statusColors: Record<BookingStatus | string, string> = {
    pending: "text-amber-700 bg-amber-50 border border-amber-200/60 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
    pending_payment: "text-blue-700 bg-blue-50 border border-blue-200/60 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
    confirmed: "text-emerald-700 bg-emerald-50 border border-emerald-200/60 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    cancelled: "text-zinc-650 bg-zinc-50 border border-zinc-200/60 dark:text-zinc-400 dark:bg-zinc-900/50 dark:border-zinc-800/60",
};

const statusLabels: Record<BookingStatus | string, string> = {
    pending: "En attente",
    pending_payment: "En attente de paiement",
    confirmed: "Confirmé",
    cancelled: "Annulé",
};

const eventLabels: Record<EventTypeSlug, string> = {
    "Mariage": "Mariage",
    "Soirée": "Soirée",
    "Entreprise": "Événement Entreprise",
    "Anniversaire": "Anniversaire",
    "Autre": "Autre Réception",
};

const defaultEventPrices: Record<EventTypeSlug, number> = {
    "Mariage": 4000,
    "Soirée": 2500,
    "Entreprise": 2000,
    "Anniversaire": 1500,
    "Autre": 1500,
};

export function AdminConsole() {
    const [authorized, setAuthorized] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
    const [settings, setSettings] = useState<BusinessSettings | null>(null);

    // Tabs: "dashboard" | "bookings" | "calendar" | "settings" | "trash"
    const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "calendar" | "settings" | "trash">("dashboard");

    // Refund confirmation modal
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundTargetId, setRefundTargetId] = useState<string | null>(null);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Permanent delete confirmation (from trash)
    const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
    const [permanentDeleteTargetId, setPermanentDeleteTargetId] = useState<string | null>(null);

    // Restore confirmation
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

    // Filters for Booking Tab
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Calendar States
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedBlockDate, setSelectedBlockDate] = useState<string | null>(null);
    const [blockReason, setReason] = useState("");

    // Details Modal
    const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        date: "",
        guests: 0,
        notes: "",
        price: 0,
        deposit: 0,
        balance: 0,
        eventType: "Mariage" as EventTypeSlug,
        status: "pending" as BookingStatus
    });

    // Manual Booking Modal
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualForm, setManualForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        date: "",
        eventType: "Mariage" as EventTypeSlug,
        guests: 150,
        notes: "",
        price: 4000,
        deposit: 1200
    });

    // Settings Edit States
    const [settingsForm, setSettingsForm] = useState<BusinessSettings | null>(null);
    const [theme, setTheme] = useState<"light" | "dark">("dark");
    // Check existing session
    useEffect(() => {
        const auth = sessionStorage.getItem("albatros_admin_auth") === "true";
        if (auth) {
            setAuthorized(true);
        }
    }, []);

    // Always dark mode — matches home page design
    const eventPrices = useMemo(() => {
        return (settings?.event_prices || defaultEventPrices) as Record<EventTypeSlug, number>;
    }, [settings]);

    const isAnyModalActive = 
        showRefundModal || 
        showDeleteConfirm || 
        showPermanentDeleteConfirm || 
        showRestoreConfirm || 
        activeBookingId !== null || 
        showManualModal || 
        selectedBlockDate !== null;

    // Active (non-cancelled) bookings
    const activeBookings = useMemo(() => bookings.filter((b) => b.status !== "cancelled"), [bookings]);
    const trashedBookings = useMemo(() => bookings.filter((b) => b.status === "cancelled"), [bookings]);

    // Fetch admin stats and data when authorized
    const loadData = () => {
        Promise.all([fetchAdminBookings(), fetchAdminBlocked(), fetchSettings()])
            .then(([bData, blData, sett]) => {
                setBookings(bData || []);
                setBlockedDates(blData || []);
                setSettings(sett || null);
                setSettingsForm(sett || null);
            })
            .catch((err) => {
                console.error("Admin load error:", err);
                if (err.message.includes("401") || err.message.includes("Unauthorized")) {
                    setAuthError("Session expirée");
                    handleLogout();
                }
            });
    };

    const [realTime, setRealTime] = useState(true);

    const playChime = () => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, start: number, duration: number) => {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.15, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                osc.connect(gain);
                gain.connect(context.destination);
                osc.start(start);
                osc.stop(start + duration);
            };
            const now = context.currentTime;
            playTone(523.25, now, 0.25); // C5
            playTone(659.25, now + 0.1, 0.35); // E5
        } catch (e) {
            console.error("Chime error:", e);
        }
    };

    useEffect(() => {
        let active = true;
        if (authorized) {
            Promise.all([fetchAdminBookings(), fetchAdminBlocked(), fetchSettings()])
                .then(([bData, blData, sett]) => {
                    if (!active) return;
                    setBookings(bData || []);
                    setBlockedDates(blData || []);
                    setSettings(sett || null);
                    setSettingsForm(sett || null);
                })
                .catch((err) => {
                    if (!active) return;
                    console.error("Admin load error:", err);
                    if (err.message.includes("401") || err.message.includes("Unauthorized")) {
                        setAuthError("Session expirée");
                        handleLogout();
                    }
                });
        }
        return () => {
            active = false;
        };
    }, [authorized]);

    useEffect(() => {
        if (!authorized || !realTime || isAnyModalActive) return;

        let active = true;
        const interval = setInterval(() => {
            Promise.all([fetchAdminBookings(), fetchAdminBlocked()])
                .then(([bData, blData]) => {
                    if (!active) return;
                    const freshBookings = bData || [];
                    
                    setBookings((prevBookings) => {
                        const oldIds = new Set(prevBookings.map((b) => b.id));
                        const brandNew = freshBookings.filter((b) => !oldIds.has(b.id));

                        if (brandNew.length > 0) {
                            playChime();
                            brandNew.forEach((fb) => {
                                toast((t) => (
                                    <div className="flex flex-col gap-2 p-1 text-left min-w-[280px]">
                                        <div className="flex items-center gap-2 text-emerald-400 font-display font-medium text-sm">
                                            <i className="fa-solid fa-bell text-xs animate-bounce"></i>
                                            Nouvelle Réservation !
                                        </div>
                                        <div className="text-xs text-zinc-300 font-sans">
                                            <strong className="text-white">{fb.firstName} {fb.lastName}</strong> a réservé le {fb.date} pour un(e) {fb.eventType || "Événement"}.
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                            <button 
                                                onClick={() => { setActiveBookingId(fb.id); toast.dismiss(t.id); }}
                                                className="px-2 py-1 bg-[#C6A969] hover:bg-[#B59858] text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer border-0"
                                            >
                                                Voir
                                            </button>
                                            <button 
                                                onClick={() => toast.dismiss(t.id)}
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer border-0"
                                            >
                                                Fermer
                                            </button>
                                        </div>
                                    </div>
                                ), {
                                    duration: 15000,
                                    position: "top-right",
                                    style: {
                                        background: "#121214",
                                        color: "#fff",
                                        border: "1px solid rgba(198,169,105,0.2)",
                                        borderRadius: "0px",
                                        padding: "12px",
                                    }
                                });
                            });
                        }
                        return freshBookings;
                    });
                    
                    setBlockedDates(blData || []);
                })
                .catch((err) => {
                    if (!active) return;
                    console.error("Silent polling error:", err);
                });
        }, 8000); // check every 8s

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [authorized, realTime, isAnyModalActive]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError("");
        if (!username.trim() || !password.trim()) {
            setAuthError("Veuillez renseigner vos identifiants.");
            return;
        }
        setIsLoggingIn(true);
        
        // Client-side authentication fallback as requested (useful to avoid database lockout issues)
        if (username.trim() === "admin" && password === "albatros2026") {
            localStorage.setItem("adminToken", "mock-admin-token-for-demo");
            sessionStorage.setItem("albatros_admin_auth", "true");
            setAuthorized(true);
            setAuthError("");
            setIsLoggingIn(false);
            loadData();
            return;
        }

        try {
            const res = await fetch("/api/auth/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");
            if (data.token) {
                localStorage.setItem("adminToken", data.token);
                sessionStorage.setItem("albatros_admin_auth", "true");
                setAuthorized(true);
                setAuthError("");
                loadData();
            } else {
                setAuthError("Identifiants invalides. Réessayez.");
                setPassword("");
            }
        } catch (e: any) {
            setAuthError(e.message || "Erreur de connexion.");
            setPassword("");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        sessionStorage.removeItem("albatros_admin_auth");
        setAuthorized(false);
        setUsername("");
        setPassword("");
    };

    const exportToCSV = () => {
        const headers = ["Ref", "Date", "Prenom", "Nom", "Telephone", "Email", "Event", "Montant", "Acompte", "Solde", "Statut", "Creation"];
        const rows = bookings.map((b) => [
            b.id,
            b.date,
            b.firstName,
            b.lastName,
            `"${b.phone}"`,
            b.email,
            b.eventType,
            b.price,
            b.deposit,
            b.balance,
            b.status,
            b.createdAt
        ]);
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reservations_albatros_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV exporté avec succès !");
    };

    const startEditing = (b: Booking) => {
        setEditForm({
            firstName: b.firstName,
            lastName: b.lastName,
            email: b.email,
            phone: b.phone,
            date: b.date,
            guests: b.guests,
            notes: b.notes || "",
            price: b.price,
            deposit: b.deposit,
            balance: b.balance,
            eventType: b.eventType,
            status: b.status
        });
        setIsEditing(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeBookingId) return;
        try {
            await editBooking(activeBookingId, editForm);
            toast.success("Réservation modifiée avec succès !");
            setIsEditing(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la modification");
        }
    };

    // Manual Booking form logic
    const handleManualFormChange = (field: string, value: any) => {
        const nextForm = { ...manualForm, [field]: value };
        if (field === "eventType") {
            const base = eventPrices[value as EventTypeSlug] || 1500;
            nextForm.price = base;
            nextForm.deposit = Math.round(base * ((settingsForm?.deposit_percent || 30) / 100));
        }
        setManualForm(nextForm);
    };

    const handleCreateManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!manualForm.date) {
                toast.error("Veuillez choisir une date.");
                return;
            }

            const res = await createBooking({
                firstName: manualForm.firstName,
                lastName: manualForm.lastName,
                phone: manualForm.phone,
                email: manualForm.email,
                date: manualForm.date,
                eventType: manualForm.eventType,
                guests: manualForm.guests,
                notes: manualForm.notes,
                paymentMethod: "cash"
            });

            if (res.success) {
                toast.success("Réservation créée avec succès !");
                await recordManualPayment(res.ref, "cash");
                toast.success("Paiement en espèces enregistré — réservation confirmée.");
                setShowManualModal(false);
                setManualForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    date: "",
                    eventType: "Mariage",
                    guests: 150,
                    notes: "",
                    price: 4000,
                    deposit: 1200
                });
                loadData();
            }
        } catch (err: any) {
            toast.error(err.message || "Erreur de création de la réservation");
        }
    };

    // Save System Settings
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settingsForm) return;
        try {
            await updateSettings(settingsForm);
            toast.success("Paramètres système enregistrés !");
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la sauvegarde");
        }
    };

    // Statistics Computations
    const stats = useMemo(() => {
        const active = activeBookings.filter((b) => b.status !== "cancelled");
        const confirmed = activeBookings.filter((b) => b.status === "confirmed");
        const totalBookings = active.length;
        const revenue = confirmed.reduce((sum, b) => sum + b.price, 0);
        const deposits = confirmed.reduce((sum, b) => sum + b.deposit, 0);

        // Occupancy (next 90 days)
        let bookedDaysCount = 0;
        const checkDays = 90;
        const bookingDatesSet = new Set(active.map((b) => b.date));
        const blockedDatesSet = new Set(blockedDates.map((b) => b.date));

        const temp = new Date();
        temp.setHours(0, 0, 0, 0);
        for (let i = 0; i < checkDays; i++) {
            const dateKey = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, "0")}-${String(temp.getDate()).padStart(2, "0")}`;
            if (bookingDatesSet.has(dateKey) || blockedDatesSet.has(dateKey)) {
                bookedDaysCount++;
            }
            temp.setDate(temp.getDate() + 1);
        }
        const occupancy = Math.round((bookedDaysCount / checkDays) * 100);

        return { totalBookings, revenue, deposits, occupancy };
    }, [bookings, blockedDates]);

    // Event category breakdown
    const categoryBreakdown = useMemo(() => {
        const counts: Record<string, number> = { "Mariage": 0, "Soirée": 0, "Entreprise": 0, "Anniversaire": 0, "Autre": 0 };
        let maxVal = 1;
        activeBookings.forEach((b) => {
            if (b.status !== "cancelled") {
                const type = b.eventType || "Autre";
                if (counts[type] !== undefined) counts[type]++;
                else counts["Autre"]++;
            }
        });
        maxVal = Math.max(...Object.values(counts), 1);
        return { counts, maxVal };
    }, [bookings]);

    // Filters logic
    const filteredBookings = useMemo(() => {
        return activeBookings.filter((b) => {
            const matchesSearch =
                !search ||
                `${b.firstName} ${b.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
                b.id.toLowerCase().includes(search.toLowerCase()) ||
                b.phone.includes(search) ||
                b.email.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === "all" || b.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [bookings, search, statusFilter]);

    // Calendar helpers
    const monthsList = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const monthLabel = `${monthsList[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const formatDateKey = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const generateWhatsAppLink = (phone: string, firstName: string, lastName: string, date: string) => {
        let cleaned = phone.replace(/\D/g, "");
        if (!cleaned.startsWith("216") && cleaned.length === 8) {
            cleaned = "216" + cleaned;
        }
        const msg = `Bonjour ${firstName} ${lastName}, nous vous contactons de la part de la Salle Albatros concernant votre demande de réservation pour le ${date}.`;
        return `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
    };

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = (firstDay.getDay() + 6) % 7;

        const list = [];
        for (let i = 0; i < startOffset; i++) list.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) list.push(new Date(year, month, d));
        return list;
    }, [currentMonth]);

    const handlePrevMonth = () => {
        setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    };



    const activeBooking = bookings.find((b) => b.id === activeBookingId);

    // Status handlers
    const handleStatusChange = async (id: string, status: BookingStatus) => {
        try {
            if (status === "cancelled") {
                const booking = bookings.find((b) => b.id === id);
                if (booking?.status === "confirmed") {
                    setRefundTargetId(id);
                    setShowRefundModal(true);
                    return;
                }
                await updateBookingStatus(id, status);
                toast.success("Réservation annulée.");
            } else {
                await updateBookingStatus(id, status);
                toast.success(status === "confirmed" ? "Réservation confirmée !" : "Statut mis à jour.");
            }
            loadData();
            if (activeBookingId === id) {
                setActiveBookingId(null);
            }
        } catch (e: any) {
            toast.error(e.message || "Erreur de mise à jour");
        }
    };

    // Date blocking
    const handleBlockDate = async () => {
        if (!selectedBlockDate) {
            toast.error("Veuillez sélectionner un jour sur le calendrier.");
            return;
        }
        const reason = blockReason.trim() || "Fermeture manuelle";
        try {
            await blockDate(selectedBlockDate, reason);
            toast.success(`Date ${selectedBlockDate} bloquée.`);
            loadData();
            setSelectedBlockDate(null);
            setReason("");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleUnblockDate = async (date: string) => {
        try {
            await unblockDate(date);
            toast.success(`Date ${date} débloquée.`);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // Refund handler (called from refund modal)
    const handleRefundConfirm = async () => {
        if (!refundTargetId) return;
        setShowRefundModal(false);
        try {
            await refundBooking(refundTargetId);
            toast.success("Réservation remboursée et annulée.");
            loadData();
            if (activeBookingId === refundTargetId) setActiveBookingId(null);
        } catch (e: any) {
            toast.error(e.message || "Erreur de remboursement");
        }
        setRefundTargetId(null);
    };

    // Delete handler (soft-delete with confirmation)
    const handleDelete = (id: string) => {
        const booking = bookings.find((b) => b.id === id);
        if (booking?.status === "confirmed") {
            setRefundTargetId(id);
            setShowRefundModal(true);
            return;
        }
        setDeleteTargetId(id);
        setShowDeleteConfirm(true);
    };

    // Soft-delete after confirmation
    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return;
        setShowDeleteConfirm(false);
        try {
            await deleteBooking(deleteTargetId);
            toast.success("Réservation déplacée dans la corbeille.");
            loadData();
            if (activeBookingId === deleteTargetId) setActiveBookingId(null);
        } catch (e: any) {
            toast.error(e.message);
        }
        setDeleteTargetId(null);
    };

    // Restore handler
    const handleRestore = (id: string) => {
        setRestoreTargetId(id);
        setShowRestoreConfirm(true);
    };

    const handleRestoreConfirm = async () => {
        if (!restoreTargetId) return;
        setShowRestoreConfirm(false);
        try {
            await restoreBooking(restoreTargetId);
            toast.success("Réservation restaurée !");
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Erreur de restauration");
        }
        setRestoreTargetId(null);
    };

    // Permanent delete from trash
    const handlePermanentDelete = (id: string) => {
        setPermanentDeleteTargetId(id);
        setShowPermanentDeleteConfirm(true);
    };

    const handlePermanentDeleteConfirm = async () => {
        if (!permanentDeleteTargetId) return;
        setShowPermanentDeleteConfirm(false);
        try {
            await permanentDeleteBooking(permanentDeleteTargetId);
            toast.success("Réservation supprimée définitivement.");
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Erreur de suppression");
        }
        setPermanentDeleteTargetId(null);
    };

    if (!authorized) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden dark bg-zinc-50 dark:bg-[#060608]" dir="ltr">
                {/* Solid Background & Gold Glow */}
                <div className="absolute inset-0 bg-zinc-50 dark:bg-[#060608]">
                    <div className="absolute pointer-events-none" style={{ width: '100%', height: '100%', background: "radial-gradient(circle at 50% 0%, rgba(198,169,105,0.15) 0%, transparent 60%)" }} />
                </div>

                {/* Back to site button */}
                <div className="absolute top-8 left-8 z-20">
                    <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", "/"); }} className="inline-flex items-center gap-2 text-black/ dark:text-white/ hover:text-zinc-900 dark:text-white transition-colors font-sans text-sm uppercase tracking-[0.25em] font-semibold bg-black/5 dark:bg-white/5 px-4 py-2 rounded-none border border-black/10 dark:border-white/10 hover:border-white/20">
                        <i className="fa-solid fa-arrow-left text-sm"></i> Retour au site
                    </a>
                </div>

                {/* Login Card */}
                <div className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
                    <div className="bg-white dark:bg-[#0A0A0C] border border-[#C6A969]/30 p-8 sm:p-10 space-y-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">

                        <div className="text-center space-y-3">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#C6A969]/10 border border-[#C6A969]/20 mb-2">
                                <i className="fa-solid fa-lock text-[#C6A969] text-lg"></i>
                            </div>
                            <h2 className="font-display text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                                Console <span style={{ color: "#C6A969" }}>Privée</span>
                            </h2>
                            <p className="font-sans text-sm font-semibold uppercase tracking-[0.25em] text-zinc-600 dark:text-zinc-400">
                                Accès réservé aux administrateurs
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-[#C6A969] text-zinc-500 dark:text-zinc-500">
                                        <i className="fa-solid fa-user text-xs"></i>
                                    </span>
                                    <input type="text" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Utilisateur"
                                        className="input-lux pl-11 h-14" />
                                </div>

                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-[#C6A969] text-zinc-500 dark:text-zinc-500">
                                        <i className="fa-solid fa-key text-xs"></i>
                                    </span>
                                    <input type={showPass ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe"
                                        className="input-lux pl-11 pr-12 h-14" />
                                    <button type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-none cursor-pointer transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-white hover:bg-white/10">
                                        <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"} text-[11px]`}></i>
                                    </button>
                                </div>
                            </div>

                            {authError && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-none bg-red-500/10 border border-red-500/20 animate-fade-in ">
                                    <i className="fa-solid fa-circle-exclamation text-red-500 text-xs shrink-0"></i>
                                    <span className="font-sans text-xs text-red-400 font-medium">{authError}</span>
                                </div>
                            )}

                            <button type="submit" disabled={isLoggingIn}
                                className="btn btn-gold shine-effect w-full h-14 text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLoggingIn ? (
                                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Connexion…</>
                                    ) : (
                                        <>Accéder au tableau de bord <i className="fa-solid fa-arrow-right text-sm"></i></>
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>
                    <p className="mt-8 font-sans text-sm text-center text-black/ dark:text-white/ uppercase tracking-widest">
                        Albatros © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        );
    }

    const SidebarButton = ({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) => {
        return (
            <button onClick={onClick} className={`flex items-center gap-4 w-full p-3 rounded-none transition-all duration-300 shrink-0 ${active ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border-l-2 border-[#C6A969]' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white border-l-2 border-transparent'}`}>
                <div className="w-6 flex justify-center shrink-0"><i className={`fa-solid ${icon} text-lg`}></i></div>
                <span className="font-sans text-sm font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
            </button>
        );
    };

    const MobileTabButton = ({ icon, active, onClick }: { icon: string; active: boolean; onClick: () => void }) => {
        return (
            <button onClick={onClick} className={`flex items-center justify-center w-12 h-12 rounded-none transition-all ${active ? 'text-[#C6A969]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
                <i className={`fa-solid ${icon} text-xl`}></i>
            </button>
        );
    };


    return (
        <div className={`min-h-screen flex flex-col lg:flex-row font-sans antialiased bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 ${theme}`} dir="ltr">
            <Toaster position="top-right" toastOptions={{ className: 'dark:bg-zinc-900 dark:text-white rounded-none border border-[#C6A969]/20' }} />
            {/* Grain overlay */}
            
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-20 hover:w-64 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#0A0A0C] border-r border-zinc-200 dark:border-white/10 group overflow-hidden shadow-2xl">
                <div className="flex items-center h-20 px-6 shrink-0 border-b border-zinc-200 dark:border-white/10">
                    <span className="font-display text-2xl font-medium tracking-tight text-zinc-900 dark:text-white shrink-0 flex items-center">
                        A<span className="text-[#C6A969] group-hover:hidden">.</span>
                        <span className="hidden group-hover:inline opacity-0 group-hover:opacity-100 group-hover:animate-fade-in transition-opacity">lbatros<span className="text-[#C6A969]">.</span></span>
                    </span>
                </div>
                <nav className="flex-1 py-8 flex flex-col gap-2 px-0 overflow-y-auto overflow-x-hidden">
                    <SidebarButton icon="fa-chart-pie" label="Vue d'ensemble" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
                    <SidebarButton icon="fa-rectangle-list" label="Réservations" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
                    <SidebarButton icon="fa-calendar-days" label="Calendrier" active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} />
                    <SidebarButton icon="fa-gear" label="Configuration" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
                    <div className="my-4 border-t border-zinc-200 dark:border-white/10 mx-6" />
                    <SidebarButton icon="fa-trash-can" label="Corbeille" active={activeTab === "trash"} onClick={() => setActiveTab("trash")} />
                </nav>
                <div className="p-4 border-t border-zinc-200 dark:border-white/10 space-y-2">
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-4 w-full p-3 rounded-none text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors shrink-0">
                        <div className="w-6 flex justify-center shrink-0"><i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i></div>
                        <span className="font-sans text-sm font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
                        </span>
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-4 w-full p-3 rounded-none text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0">
                        <div className="w-6 flex justify-center shrink-0"><i className="fa-solid fa-right-from-bracket text-lg"></i></div>
                        <span className="font-sans text-sm font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE TOP NAV & BOTTOM BAR */}
            <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white dark:bg-[#0A0A0C] border-b border-zinc-200 dark:border-white/10 z-40 flex items-center justify-between px-6 shadow-sm">
                <span className="font-display text-xl font-medium tracking-tight text-zinc-900 dark:text-white">Albatros<span className="text-[#C6A969]">.</span></span>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                    <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
                </button>
            </div>

            <div className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-[#0A0A0C] border-t border-zinc-200 dark:border-white/10 z-50 flex items-center justify-around px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <MobileTabButton icon="fa-chart-pie" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
                <MobileTabButton icon="fa-rectangle-list" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
                <MobileTabButton icon="fa-calendar-days" active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} />
                <MobileTabButton icon="fa-gear" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
                <button onClick={handleLogout} className="text-zinc-500 hover:text-red-500 w-12 h-12 flex items-center justify-center">
                    <i className="fa-solid fa-right-from-bracket text-xl"></i>
                </button>
            </div>

            {/* MAIN VIEW CONTROLLER */}
            <main className="flex-grow w-full lg:ml-20 transition-all duration-300">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-24 pb-32 flex flex-col relative z-10">

                    {/* VIEW HEADER & ACTIONS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-black/5 dark:border-white/[0.06]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="font-sans text-sm uppercase tracking-[0.25em] text-[#C6A969] font-semibold">
                                    {activeTab === "dashboard" && "Vue d'ensemble"}
                                    {activeTab === "bookings" && "Gestion"}
                                    {activeTab === "calendar" && "Planification"}
                                    {activeTab === "settings" && "Préférences"}
                                    {activeTab === "trash" && "Corbeille"}
                                </span>
                                <div className="w-6 h-px bg-[#C6A969]/40" />
                            </div>
                            <h1 className="font-display text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                                {activeTab === "dashboard" && "Tableau de Bord"}
                                {activeTab === "bookings" && "Réservations"}
                                {activeTab === "calendar" && "Calendrier Général"}
                                {activeTab === "settings" && "Configuration de la Salle"}
                                {activeTab === "trash" && "Réservations Supprimées"}
                            </h1>
                            <p className="text-zinc-500 dark:text-zinc-500 text-xs font-sans">
                                Gérez votre établissement Albatros en toute simplicité
                            </p>
                        </div>

                        <div className="flex gap-2 items-center">
                            {(activeTab === "dashboard" || activeTab === "bookings") && (
                                <button 
                                    type="button"
                                    onClick={() => setRealTime(!realTime)}
                                    className={`px-3 py-2 font-sans text-xs font-bold uppercase tracking-wider border transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                                        realTime 
                                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                                            : "bg-white/[0.02] border-black/10 dark:border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                                    }`}
                                    title={realTime ? "Désactiver la mise à jour en temps réel" : "Activer la mise à jour en temps réel"}
                                >
                                    <span className={`relative flex h-2 w-2 ${realTime ? "" : "hidden"}`}>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    {!realTime && <i className="fa-solid fa-circle text-[8px] text-zinc-600"></i>}
                                    {realTime ? "Temps Réel" : "Manuel"}
                                </button>
                            )}
                            {activeTab === "dashboard" && (
                                <>
                                    <button onClick={() => setShowManualModal(true)}
                                        className="px-4 py-2 bg-[#C6A969] hover:brightness-110 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider shadow-none transition-all rounded-none cursor-pointer flex items-center gap-2">
                                        <i className="fa-solid fa-plus text-xs"></i> Créer Réservation
                                    </button>
                                    <button onClick={exportToCSV}
                                        className="px-4 py-2 bg-white/[0.04] hover:brightness-110 text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider border border-black/10 dark:border-white/[0.08] transition-all rounded-none cursor-pointer flex items-center gap-2">
                                        <i className="fa-solid fa-download text-xs"></i> Exporter CSV
                                    </button>
                                </>
                            )}
                            {activeTab === "bookings" && (
                                <button onClick={exportToCSV}
                                    className="px-4 py-2 bg-white/[0.04] hover:brightness-110 text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider border border-black/10 dark:border-white/[0.08] transition-all rounded-none cursor-pointer flex items-center gap-2">
                                    <i className="fa-solid fa-download text-xs"></i> Exporter CSV
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab 1: Dashboard View */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-8 animate-fade-in flex flex-col">
                            {/* Stat Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <StatCard icon="fa-calendar-check" label="Réservations Actives" value={stats.totalBookings} />
                                <StatCard icon="fa-coins" label="Chiffre d'Affaires" value={`${stats.revenue.toLocaleString("fr-TN")} TND`} isGold />
                                <StatCard icon="fa-hand-holding-dollar" label="Acomptes Reçus" value={`${stats.deposits.toLocaleString("fr-TN")} TND`} isGold />
                                <StatCard icon="fa-percent" label="Occupation (90 jours)" value={`${stats.occupancy}%`} />
                            </div>

                            {/* Recent Bookings (Full Width Table) */}
                            <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none space-y-5 transition-all duration-500 card-hover-lift hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                        <h2 className="font-display text-lg font-medium text-zinc-900 dark:text-white">
                                            Réservations Récentes
                                        </h2>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("bookings")}
                                        className="font-sans text-sm font-bold uppercase tracking-wider text-[#C6A969] hover:text-[#B59858] transition-colors"
                                    >
                                        Voir toutes &rarr;
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                                <th className="pb-3 px-3">Réf</th>
                                                <th className="pb-3 px-3">Date</th>
                                                <th className="pb-3 px-3">Client</th>
                                                <th className="pb-3 px-3">Événement</th>
                                                <th className="pb-3 px-3 text-right">Tarif</th>
                                                <th className="pb-3 px-3 text-center">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeBookings.slice(0, 5).map((b) => (
                                                <tr key={b.id} className="border-b border-zinc-100/60 dark:border-zinc-800/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-3.5 px-3 font-semibold text-[#C6A969] text-xs whitespace-nowrap">
                                                        {b.id}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                                        {b.date}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-xs font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                                                        {b.firstName} {b.lastName}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                        {eventLabels[b.eventType] || b.eventType}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-right text-xs font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                                                        {b.price.toLocaleString("fr-TN")} TND
                                                    </td>
                                                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                        <span className={`px-2.5 py-0.5 rounded-none text-sm font-medium tracking-wide border ${statusColors[b.status]}`}>
                                                            {statusLabels[b.status] || b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {activeBookings.length === 0 && (
                                        <div className="text-center py-12 text-zinc-500 dark:text-zinc-500 text-xs italic font-sans">
                                            Aucune réservation enregistrée.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Split content below the table */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Category Breakdown */}
                                <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none space-y-5 transition-all duration-500 card-hover-lift hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                                    <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                        <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                        <h3 className="font-display text-lg font-medium text-zinc-900 dark:text-white">
                                            Statistiques par Événement
                                        </h3>
                                    </div>
                                    <div className="space-y-4 pt-1">
                                        {Object.entries(categoryBreakdown.counts).map(([cat, count]) => {
                                            const pct = Math.round(((count as number) / categoryBreakdown.maxVal) * 100);
                                            return (
                                                <div key={cat} className="space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-zinc-650 dark:text-zinc-300 font-semibold">{cat}</span>
                                                        <span className="text-zinc-600 dark:text-zinc-400 font-bold">{count} réservations</span>
                                                    </div>
                                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-[#C6A969] h-full rounded-none transition-all duration-500" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tips & System info */}
                                <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none space-y-5 transition-all duration-500 card-hover-lift hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                                    <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                        <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                        <h3 className="font-display text-lg font-medium text-zinc-900 dark:text-white">
                                            Informations Générales
                                        </h3>
                                    </div>
                                    <div className="space-y-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <div className="flex items-start gap-3 p-3.5 bg-[#FAF9F6] dark:bg-[#1C1C20] border border-zinc-200/50 dark:border-zinc-800/50 rounded-none">
                                            <i className="fa-solid fa-circle-info text-[#C6A969] mt-0.5 text-sm shrink-0"></i>
                                            <span><strong>Calendrier</strong> : Utilisez la section dédiée pour bloquer temporairement des dates ou visualiser le planning complet en grille.</span>
                                        </div>
                                        <div className="flex items-start gap-3 p-3.5 bg-[#FAF9F6] dark:bg-[#1C1C20] border border-zinc-200/50 dark:border-zinc-800/50 rounded-none">
                                            <i className="fa-solid fa-bell text-[#C6A969] mt-0.5 text-sm shrink-0"></i>
                                            <span>Pour toute réservation en attente, vous disposez d'un accès rapide pour contacter le client par WhatsApp ou Email directement depuis la console.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Bookings List View */}
                    {activeTab === "bookings" && (
                        <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none space-y-6 animate-fade-in transition-all duration-500">
                            {/* Filter controls */}
                            <div className="flex flex-col md:flex-row gap-4 justify-between border-b border-zinc-100 dark:border-zinc-800 pb-5">
                                <div className="relative flex-1 max-w-md">
                                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher nom, réf, téléphone..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="input-lux pl-11"
                                    />
                                </div>

                                <div className="flex gap-1 bg-zinc-50 dark:bg-[#0A0A0C] p-1 border border-zinc-200 dark:border-zinc-800 rounded-none self-start">
                                    <button
                                        onClick={() => setStatusFilter("all")}
                                        className={`px-4 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${statusFilter === "all" ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-none border border-zinc-200/50 dark:border-zinc-800/50" : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        Tous
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter("pending")}
                                        className={`px-4 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${statusFilter === "pending" ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-none border border-zinc-200/50 dark:border-zinc-800/50" : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        En attente
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter("confirmed")}
                                        className={`px-4 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${statusFilter === "confirmed" ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-none border border-zinc-200/50 dark:border-zinc-800/50" : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        Confirmés
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter("cancelled")}
                                        className={`px-4 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${statusFilter === "cancelled" ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-none border border-zinc-200/50 dark:border-zinc-800/50" : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                            }`}
                                    >
                                        Annulés
                                    </button>
                                </div>
                            </div>

                            {/* Main Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[760px]">
                                    <thead>
                                        <tr className="border-b border-zinc-100 dark:border-zinc-800 text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                            <th className="pb-3 px-3">Réf</th>
                                            <th className="pb-3 px-3">Date</th>
                                            <th className="pb-3 px-3">Client</th>
                                            <th className="pb-3 px-3">Téléphone</th>
                                            <th className="pb-3 px-3">Événement</th>
                                            <th className="pb-3 px-3 text-right">Tarif</th>
                                            <th className="pb-3 px-3 text-center">Statut</th>
                                            <th className="pb-3 px-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBookings.map((b) => (
                                            <tr key={b.id} className="border-b border-zinc-100/60 dark:border-zinc-800/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                                <td className="py-3.5 px-3 font-semibold text-[#C6A969] text-xs whitespace-nowrap">
                                                    {b.id}
                                                </td>
                                                <td className="py-3.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                                    {b.date}
                                                </td>
                                                <td className="py-3.5 px-3 text-xs font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                                                    {b.firstName} {b.lastName}
                                                </td>
                                                <td className="py-3.5 px-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                    {b.phone}
                                                </td>
                                                <td className="py-3.5 px-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                    {eventLabels[b.eventType] || b.eventType}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-xs font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                                                    {b.price.toLocaleString("fr-TN")} TND
                                                </td>
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-none text-sm font-medium tracking-wide border ${statusColors[b.status]}`}>
                                                        {statusLabels[b.status] || b.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => setActiveBookingId(b.id)}
                                                        className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-[#C6A969] dark:hover:border-[#C6A969] hover:text-[#C6A969] dark:hover:text-[#C6A969] text-zinc-650 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer rounded-none inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900"
                                                    >
                                                        <i className="fa-solid fa-eye text-xs"></i> Gérer
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {filteredBookings.length === 0 && (
                                    <div className="text-center py-16 text-zinc-600 dark:text-zinc-400 text-xs italic font-sans">
                                        Aucune réservation trouvée.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Calendar View */}
                    {activeTab === "calendar" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* Interactive monthly calendar */}
                            <div className="lg:col-span-2 bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none space-y-6 transition-all duration-500">
                                <div className="flex items-center justify-between">
                                    <button onClick={handlePrevMonth} className="w-9 h-9 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-900 dark:text-white flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-colors bg-white dark:bg-zinc-900 shadow-none">
                                        <i className="fa-solid fa-chevron-left text-xs"></i>
                                    </button>
                                    <h4 className="font-display text-lg font-medium text-zinc-850 dark:text-white">
                                        {monthLabel}
                                    </h4>
                                    <button onClick={handleNextMonth} className="w-9 h-9 rounded-none border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-900 dark:text-white flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-colors bg-white dark:bg-zinc-900 shadow-none">
                                        <i className="fa-solid fa-chevron-right text-xs"></i>
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {dayNames.map((d) => (
                                        <div key={d} className="text-center text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-bold py-2">
                                            {d}
                                        </div>
                                    ))}
                                    {calendarDays.map((date, idx) => {
                                        if (!date) return <div key={`empty-${idx}`} className="aspect-square" />;
                                        const dateStr = formatDateKey(date);
                                        const booking = bookings.find((b) => b.date === dateStr && b.status !== "cancelled");
                                        const block = blockedDates.find((bd) => bd.date === dateStr);
                                        const isPast = date < today;

                                        let cellStyle = "bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-650";
                                        if (isPast) {
                                            cellStyle = "bg-zinc-50/50 dark:bg-zinc-905/30 text-zinc-300 dark:text-zinc-600 border border-zinc-100 dark:border-zinc-900/40 cursor-not-allowed opacity-40";
                                        } else if (booking) {
                                            cellStyle = "bg-[#C6A969]/10 text-[#C6A969] font-bold border border-[#C6A969]/40";
                                        } else if (block) {
                                            cellStyle = "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20";
                                        }

                                        if (selectedBlockDate === dateStr) {
                                            cellStyle = "bg-zinc-900 dark:bg-white text-zinc-900 dark:text-zinc-950 font-bold border border-zinc-900 dark:border-white shadow-none scale-105";
                                        }

                                        return (
                                            <button
                                                key={dateStr}
                                                disabled={isPast}
                                                onClick={() => {
                                                    setSelectedBlockDate(dateStr);
                                                }}
                                                className={`aspect-square rounded-none flex flex-col items-center justify-center transition-all cursor-pointer relative ${cellStyle}`}
                                            >
                                                <span className="text-sm font-semibold">{date.getDate()}</span>
                                                {booking && <span className="absolute bottom-2.5 w-1.5 h-1.5 bg-[#C6A969] rounded-none"></span>}
                                                {block && <span className="absolute bottom-2.5 w-1.5 h-1.5 bg-red-500 rounded-none"></span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Interactive Side Panel */}
                            <div className="space-y-6">
                                {selectedBlockDate ? (
                                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 space-y-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none animate-fade-in transition-all duration-500">
                                        <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                            <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                            <h3 className="font-display text-base font-medium text-zinc-850 dark:text-white">
                                                Date : {selectedBlockDate}
                                            </h3>
                                        </div>

                                        {(() => {
                                            const booking = bookings.find((b) => b.date === selectedBlockDate && b.status !== "cancelled");
                                            const block = blockedDates.find((bd) => bd.date === selectedBlockDate);

                                            if (booking) {
                                                return (
                                                    <div className="space-y-4">
                                                        <div className="p-4 bg-zinc-50 dark:bg-[#1C1C1F] border border-zinc-200 dark:border-zinc-800 rounded-none space-y-2">
                                                            <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 uppercase block">Réservation</span>
                                                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{booking.firstName} {booking.lastName}</h4>
                                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{eventLabels[booking.eventType] || booking.eventType}</p>
                                                            <p className="text-xs font-bold text-[#C6A969]">{booking.price.toLocaleString("fr-TN")} TND</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setActiveBookingId(booking.id)}
                                                            className="w-full py-2.5 bg-zinc-900 dark:bg-white hover:brightness-110 dark:hover:bg-zinc-100 text-zinc-900 dark:text-zinc-950 text-xs font-semibold rounded-none transition-all cursor-pointer"
                                                        >
                                                            Consulter la Fiche
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            if (block) {
                                                return (
                                                    <div className="space-y-4">
                                                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-800 dark:text-red-400 text-xs rounded-none">
                                                            <span className="font-bold block mb-1">Date bloquée manuellement</span>
                                                            Motif : {block.reason}
                                                        </div>
                                                        <button
                                                            onClick={() => handleUnblockDate(selectedBlockDate)}
                                                            className="w-full py-2.5 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-zinc-850 text-red-650 dark:text-red-400 text-xs font-semibold rounded-none transition-all cursor-pointer bg-white dark:bg-zinc-900"
                                                        >
                                                            Débloquer la date
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">Cette date est libre.</p>

                                                    <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                                        <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Bloquer cette journée</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Motif (Ex: Maintenance, Fermeture...)"
                                                            value={blockReason}
                                                            onChange={(e) => setReason(e.target.value)}
                                                            className="w-full p-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-white text-xs focus:outline-none focus:border-[#C6A969] rounded-none placeholder-zinc-400 dark:placeholder-zinc-650"
                                                        />
                                                        <button
                                                            onClick={handleBlockDate}
                                                            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-zinc-900 dark:text-white text-xs font-semibold rounded-none transition-all cursor-pointer"
                                                        >
                                                            Confirmer le Blocage
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 text-zinc-600 dark:text-zinc-400 text-center text-xs italic font-sans shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none transition-all duration-500">
                                        Sélectionnez un jour sur le calendrier.
                                    </div>
                                )}

                                {/* Blocked Dates List */}
                                <div className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 text-left shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none transition-all duration-500">
                                    <div className="flex items-center gap-3 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                                        <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                        <h3 className="font-display text-base font-medium text-zinc-855 dark:text-white">
                                            Dates bloquées
                                        </h3>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {blockedDates.map((d) => (
                                            <div key={d.date} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-[#1B1B1E] border border-zinc-200/60 dark:border-zinc-800/60 text-xs rounded-none">
                                                <div>
                                                    <span className="font-bold text-zinc-700 dark:text-zinc-300 block">{d.date}</span>
                                                    <span className="text-sm text-zinc-450 dark:text-zinc-500 block">{d.reason}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleUnblockDate(d.date)}
                                                    className="w-7 h-7 border border-zinc-200 dark:border-zinc-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 rounded-none flex items-center justify-center transition-all cursor-pointer bg-white dark:bg-zinc-900"
                                                >
                                                    <i className="fa-solid fa-unlock text-sm"></i>
                                                </button>
                                            </div>
                                        ))}

                                        {blockedDates.length === 0 && (
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400 italic font-sans text-center">Aucune date bloquée.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: System Settings View */}
                    {activeTab === "settings" && settingsForm && (
                        <form onSubmit={handleSaveSettings} className="bg-white/80 dark:bg-[#121214]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-none p-6 max-w-3xl text-left space-y-8 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-none animate-fade-in transition-all duration-500">
                            <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="w-1 h-6 bg-[#C6A969] rounded-none" />
                                <h3 className="font-display text-xl font-medium text-zinc-900 dark:text-white">
                                    Configuration de la Salle & Tarifs
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Nom de la Salle</label>
                                    <input
                                        type="text"
                                        required
                                        value={settingsForm.business_name}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, business_name: e.target.value })}
                                        className="input-lux"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Téléphone</label>
                                    <input
                                        type="text"
                                        required
                                        value={settingsForm.business_phone}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, business_phone: e.target.value })}
                                        className="input-lux"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Email de Contact</label>
                                    <input
                                        type="email"
                                        required
                                        value={settingsForm.business_email}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, business_email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Adresse</label>
                                    <input
                                        type="text"
                                        required
                                        value={settingsForm.business_address}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, business_address: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Capacité Minimale (Invités)</label>
                                    <input
                                        type="number"
                                        required
                                        value={settingsForm.min_guests}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, min_guests: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Capacité Maximale (Invités)</label>
                                    <input
                                        type="number"
                                        required
                                        value={settingsForm.max_guests}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, max_guests: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Acompte Requis (%)</label>
                                    <input
                                        type="number"
                                        required
                                        value={settingsForm.deposit_percent}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, deposit_percent: parseInt(e.target.value) || 30 })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Lien Google Maps</label>
                                    <input
                                        type="text"
                                        value={settingsForm.google_maps_url || ""}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, google_maps_url: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-4 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-4 bg-[#C6A969] rounded-none" />
                                    <h4 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                                        Tarifs des Événements (TND)
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(["Mariage", "Soirée", "Entreprise", "Anniversaire", "Autre"] as EventTypeSlug[]).map((slug) => {
                                        const currentPrices = settingsForm.event_prices || defaultEventPrices;
                                        const priceVal = currentPrices[slug] !== undefined ? currentPrices[slug] : defaultEventPrices[slug];
                                        return (
                                            <div key={slug} className="flex flex-col">
                                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                                    {slug === "Entreprise" ? "Entreprise / Pro" : slug}
                                                </label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    value={priceVal}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newPrices = { ...currentPrices, [slug]: val };
                                                        setSettingsForm({ ...settingsForm, event_prices: newPrices });
                                                    }}
                                                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-850 dark:text-white focus:outline-none focus:border-[#C6A969] transition-all rounded-none"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-black/10 dark:border-white/10">
                                <button type="submit"
                                    className="px-6 py-2.5 bg-[#C6A969] hover:brightness-110 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider shadow-none transition-all rounded-none cursor-pointer">
                                    Enregistrer la Configuration
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Tab 5: Trash View */}
                    {activeTab === "trash" && (
                        <div className="bg-white dark:bg-[#0F0F11] border border-black/5 dark:border-white/[0.06] rounded-none p-6 shadow-none space-y-6 animate-fade-in transition-all duration-500">
                            <div className="flex items-center gap-3 pb-3 border-b border-black/10 dark:border-white/10">
                                <div className="w-1 h-5 bg-red-400 rounded-none" />
                                <h3 className="font-display text-lg font-medium text-zinc-900 dark:text-white">Corbeille</h3>
                                {trashedBookings.length > 0 && (
                                    <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-none border border-black/5 dark:border-white/[0.06]">
                                        {trashedBookings.length} élément(s)
                                    </span>
                                )}
                            </div>

                            {trashedBookings.length === 0 ? (
                                <div className="text-center py-16 text-zinc-500 dark:text-zinc-500 text-xs italic font-sans">
                                    <i className="fa-solid fa-trash-can mb-3 text-2xl text-zinc-600 block"></i>
                                    La corbeille est vide.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="border-b border-black/10 dark:border-white/10 font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                                <th className="pb-3 px-3">Réf</th>
                                                <th className="pb-3 px-3">Client</th>
                                                <th className="pb-3 px-3">Date</th>
                                                <th className="pb-3 px-3">Montant</th>
                                                <th className="pb-3 px-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trashedBookings.map((b) => (
                                                <tr key={b.id} className="border-b border-black/5 dark:border-white/[0.04] hover:bg-white dark:bg-[#0F0F11] transition-colors">
                                                    <td className="py-3.5 px-3 font-semibold text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">{b.id}</td>
                                                    <td className="py-3.5 px-3 text-xs font-semibold text-zinc-900 dark:text-white whitespace-nowrap">{b.firstName} {b.lastName}</td>
                                                    <td className="py-3.5 px-3 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{b.date}</td>
                                                    <td className="py-3.5 px-3 text-xs font-bold text-zinc-300 whitespace-nowrap">{b.price.toLocaleString("fr-TN")} TND</td>
                                                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => handleRestore(b.id)}
                                                                className="px-3 py-1.5 bg-white/[0.04] hover:bg-emerald-500/20 border border-black/10 dark:border-white/[0.08] hover:border-emerald-500/40 text-zinc-600 dark:text-zinc-400 hover:text-emerald-400 font-sans text-sm font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-1.5">
                                                                <i className="fa-solid fa-rotate-left text-xs"></i> Restaurer
                                                            </button>
                                                            <button onClick={() => handlePermanentDelete(b.id)}
                                                                className="px-3 py-1.5 bg-white/[0.04] hover:bg-red-500/20 border border-black/10 dark:border-white/[0.08] hover:border-red-500/40 text-zinc-500 dark:text-zinc-500 hover:text-red-400 font-sans text-sm font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-1.5">
                                                                <i className="fa-solid fa-trash-can text-xs"></i> Suppr.
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            {activeBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
                    <div className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/[0.08] rounded-none w-full max-w-xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-white dark:bg-[#0F0F11]">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                <h3 className="font-display text-lg font-medium text-zinc-900 dark:text-white">
                                    {isEditing ? "Modifier la Réservation" : "Fiche Client & Réservation"}
                                </h3>
                            </div>
                            <button onClick={() => { setActiveBookingId(null); setIsEditing(false); }}
                                className="text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:text-white transition-colors cursor-pointer">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto bg-zinc-50 dark:bg-[#121214] flex-1 text-left">
                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-4 font-sans text-xs">
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Prénom</label>
                                            <input type="text" required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Nom</label>
                                            <input type="text" required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Email</label>
                                            <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Téléphone</label>
                                            <input type="text" required value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Date</label>
                                            <input type="text" required value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Type d'Événement</label>
                                            <select value={editForm.eventType} onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value as EventTypeSlug })} className="input-lux">
                                                <option value="Mariage">Mariage</option><option value="Soirée">Soirée</option><option value="Entreprise">Entreprise</option><option value="Anniversaire">Anniversaire</option><option value="Autre">Autre</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Invités</label>
                                            <input type="number" required value={editForm.guests} onChange={(e) => setEditForm({ ...editForm, guests: parseInt(e.target.value) || 0 })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Tarif Total (TND)</label>
                                            <input type="number" required value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Acompte (TND)</label>
                                            <input type="number" required value={editForm.deposit} onChange={(e) => setEditForm({ ...editForm, deposit: parseInt(e.target.value) || 0 })} className="input-lux" />
                                        </div>
                                        <div className="flex flex-col col-span-2">
                                            <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block mb-1">Notes</label>
                                            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="input-lux" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4 text-xs border-b border-black/10 dark:border-white/10 pb-4">
                                            <div>
                                                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 font-bold uppercase block mb-1">Référence</span>
                                                <span className="font-semibold text-[#C6A969]">{activeBooking.id}</span>
                                            </div>
                                            <div>
                                                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 font-bold uppercase block mb-1">Date Sélectionnée</span>
                                                <span className="font-semibold text-zinc-200">{activeBooking.date}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs border-b border-black/10 dark:border-white/10 pb-4">
                                            <div>
                                                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 font-bold uppercase block mb-1">Client</span>
                                                <span className="font-bold text-zinc-900 dark:text-white text-sm">{activeBooking.firstName} {activeBooking.lastName}</span>
                                            </div>
                                            <div>
                                                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 font-bold uppercase block mb-1">Type d'Événement</span>
                                                <span className="font-bold text-zinc-200">{eventLabels[activeBooking.eventType] || activeBooking.eventType}</span>
                                            </div>
                                            <div>
                                                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 font-bold uppercase block mb-1">Email</span>
                                                <span className="text-zinc-300 font-medium">{activeBooking.email}</span>
                                            </div>
                                            <div>
                                                <span className="font-sans text-sm text-zinc-500 dark:text-zinc-500 font-bold uppercase block mb-1">Téléphone</span>
                                                <span className="text-zinc-300 font-medium">{activeBooking.phone}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 border-b border-black/10 dark:border-white/10 pb-4">
                                            <a href={generateWhatsAppLink(activeBooking.phone, activeBooking.firstName, activeBooking.lastName, activeBooking.date)}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-2 cursor-pointer rounded-none decoration-none">
                                                <i className="fa-brands fa-whatsapp text-sm"></i> WhatsApp Client
                                            </a>
                                            <a href={`mailto:${activeBooking.email}?subject=Réservation%20Albatros`}
                                                className="flex-1 py-2.5 bg-white/[0.04] hover:brightness-110 border border-black/10 dark:border-white/10 text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-2 cursor-pointer rounded-none decoration-none">
                                                <i className="fa-solid fa-envelope text-sm"></i> Envoyer un Email
                                            </a>
                                        </div>
                                        <div className="bg-white dark:bg-[#0A0A0C] border border-black/10 dark:border-white/10 p-5 rounded-none text-xs space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500 dark:text-zinc-500 font-medium">Tarif Total :</span>
                                                <span className="font-bold text-zinc-900 dark:text-white">{activeBooking.price.toLocaleString("fr-TN")} TND</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500 dark:text-zinc-500 font-medium">Acompte Requis :</span>
                                                <span className="font-bold text-[#C6A969]">{activeBooking.deposit.toLocaleString("fr-TN")} TND</span>
                                            </div>
                                            <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-2 font-bold text-xs">
                                                <span className="text-zinc-500 dark:text-zinc-500 font-medium">Statut :</span>
                                                <span className={`px-2.5 py-0.5 rounded-none text-sm font-semibold border ${statusColors[activeBooking.status]}`}>
                                                    {statusLabels[activeBooking.status] || activeBooking.status}
                                                </span>
                                            </div>
                                        </div>
                                        {activeBooking.status === "pending" && (
                                            <div className="p-4 bg-white dark:bg-[#0A0A0C] border border-black/10 dark:border-white/10 rounded-none text-xs space-y-3 text-left">
                                                <span className="font-bold text-zinc-300 block font-sans text-sm uppercase tracking-wider">Enregistrer un paiement hors-ligne :</span>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={async () => { try { await recordManualPayment(activeBooking.id, "cash"); toast.success("Paiement Espèces validé !"); loadData(); } catch (e: any) { toast.error(e.message); } }}
                                                        className="flex-1 py-2 bg-white/[0.04] hover:brightness-110 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white text-xs font-semibold rounded-none cursor-pointer">Espèces</button>
                                                    <button type="button" onClick={async () => { try { await recordManualPayment(activeBooking.id, "cheque"); toast.success("Paiement Chèque validé !"); loadData(); } catch (e: any) { toast.error(e.message); } }}
                                                        className="flex-1 py-2 bg-white/[0.04] hover:brightness-110 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white text-xs font-semibold rounded-none cursor-pointer">Chèque</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#0F0F11] flex justify-between items-center">
                                <div>
                                    {!isEditing && (
                                        <button type="button" onClick={() => handleDelete(activeBooking.id)}
                                            className="px-4 py-2 border border-red-900/50 text-red-400 hover:bg-red-950/20 hover:border-red-500/50 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors bg-zinc-900">
                                            Supprimer
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3 text-xs font-semibold">
                                    {isEditing ? (
                                        <>
                                            <button type="button" onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors bg-zinc-900">Annuler</button>
                                            <button type="submit"
                                                className="px-4 py-2 bg-[#C6A969] hover:brightness-110 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors shadow-none">Enregistrer</button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => startEditing(activeBooking)}
                                                className="px-4 py-2 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors bg-zinc-900">Modifier</button>
                                            {(activeBooking.status === "pending" || activeBooking.status === "pending_payment") && (
                                                <button type="button" onClick={() => handleStatusChange(activeBooking.id, "confirmed")}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Payé</button>
                                            )}
                                            {activeBooking.status === "confirmed" && (
                                                <button type="button" onClick={() => { setRefundTargetId(activeBooking.id); setShowRefundModal(true); }}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Rembourser</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Refund Confirmation Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 animate-fade-in">
                    <div className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/[0.08] rounded-none w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-none bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <i className="fa-solid fa-triangle-exclamation text-red-400 text-2xl"></i>
                            </div>
                            <h3 className="font-display text-xl font-medium text-zinc-900 dark:text-white">Confirmer le Remboursement</h3>
                            <p className="font-sans text-sm text-zinc-600 dark:text-zinc-400">
                                Rembourser et annuler cette réservation ?<br />
                                <span className="text-zinc-500 dark:text-zinc-500">Cette action est irréversible.</span>
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setShowRefundModal(false); setRefundTargetId(null); }}
                                    className="flex-1 py-2.5 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Annuler</button>
                                <button onClick={handleRefundConfirm}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Confirmer le Remboursement</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 animate-fade-in">
                    <div className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/[0.08] rounded-none w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-none bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <i className="fa-solid fa-trash-can text-amber-400 text-2xl"></i>
                            </div>
                            <h3 className="font-display text-xl font-medium text-zinc-900 dark:text-white">Déplacer vers la corbeille ?</h3>
                            <p className="font-sans text-sm text-zinc-600 dark:text-zinc-400">
                                Cette réservation sera déplacée dans la corbeille.<br />
                                <span className="text-zinc-500 dark:text-zinc-500">Vous pourrez la restaurer plus tard.</span>
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                                    className="flex-1 py-2.5 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Annuler</button>
                                <button onClick={handleDeleteConfirm}
                                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Confirmer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Confirmation Modal */}
            {showRestoreConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 animate-fade-in">
                    <div className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/[0.08] rounded-none w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <i className="fa-solid fa-rotate-left text-emerald-400 text-2xl"></i>
                            </div>
                            <h3 className="font-display text-xl font-medium text-zinc-900 dark:text-white">Restaurer la réservation ?</h3>
                            <p className="font-sans text-sm text-zinc-600 dark:text-zinc-400">
                                Cette réservation sera restaurée et réapparaîtra dans la liste principale.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setShowRestoreConfirm(false); setRestoreTargetId(null); }}
                                    className="flex-1 py-2.5 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Annuler</button>
                                <button onClick={handleRestoreConfirm}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Restaurer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirmation Modal */}
            {showPermanentDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 animate-fade-in">
                    <div className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/[0.08] rounded-none w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-none bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <i className="fa-solid fa-trash-can text-red-400 text-2xl"></i>
                            </div>
                            <h3 className="font-display text-xl font-medium text-zinc-900 dark:text-white">Supprimer définitivement ?</h3>
                            <p className="font-sans text-sm text-zinc-600 dark:text-zinc-400">
                                Cette réservation sera supprimée définitivement.<br />
                                <span className="text-red-400">Cette action est irréversible.</span>
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setShowPermanentDeleteConfirm(false); setPermanentDeleteTargetId(null); }}
                                    className="flex-1 py-2.5 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Annuler</button>
                                <button onClick={handlePermanentDeleteConfirm}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-zinc-900 dark:text-white font-sans text-sm font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors">Supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Booking Creation Modal */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
                    <div className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/[0.08] rounded-none w-full max-w-xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-white dark:bg-[#0F0F11]">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-5 bg-[#C6A969] rounded-none" />
                                <h3 className="font-display text-lg font-medium text-zinc-900 dark:text-white">
                                    Créer une Réservation Manuelle
                                </h3>
                            </div>
                            <button onClick={() => setShowManualModal(false)}
                                className="text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:text-white transition-colors cursor-pointer">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreateManualBooking} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto bg-zinc-50 dark:bg-[#121214] flex-1 text-left space-y-4 font-sans text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Prénom *</label>
                                        <input type="text" required value={manualForm.firstName} onChange={(e) => handleManualFormChange("firstName", e.target.value)}
                                            className="input-lux" placeholder="Youssef" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Nom *</label>
                                        <input type="text" required value={manualForm.lastName} onChange={(e) => handleManualFormChange("lastName", e.target.value)}
                                            className="input-lux" placeholder="Trabelsi" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Email *</label>
                                        <input type="email" required value={manualForm.email} onChange={(e) => handleManualFormChange("email", e.target.value)}
                                            className="input-lux" placeholder="client@gmail.com" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Téléphone *</label>
                                        <input type="text" required value={manualForm.phone} onChange={(e) => handleManualFormChange("phone", e.target.value)}
                                            className="input-lux" placeholder="98687124" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Date (AAAA-MM-JJ) *</label>
                                        <input type="text" required value={manualForm.date} onChange={(e) => handleManualFormChange("date", e.target.value)}
                                            className="input-lux" placeholder="Ex: 2026-08-15" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Type d'Événement *</label>
                                        <select value={manualForm.eventType} onChange={(e) => handleManualFormChange("eventType", e.target.value)}
                                            className="input-lux">
                                            <option value="Mariage">Mariage</option><option value="Soirée">Soirée</option><option value="Entreprise">Entreprise</option><option value="Anniversaire">Anniversaire</option><option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Invités *</label>
                                        <input type="number" required value={manualForm.guests} onChange={(e) => handleManualFormChange("guests", parseInt(e.target.value) || 0)}
                                            className="input-lux" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Tarif Total (TND)</label>
                                        <input type="number" disabled value={manualForm.price}
                                            className="input-lux px-3 py-2 opacity-60 cursor-not-allowed" />
                                    </div>
                                    <div className="flex flex-col col-span-2">
                                        <label className="font-sans text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">Notes ou consignes</label>
                                        <textarea value={manualForm.notes} onChange={(e) => handleManualFormChange("notes", e.target.value)} rows={2}
                                            className="input-lux" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#0F0F11] flex justify-end gap-3 font-sans text-sm font-bold uppercase tracking-wider">
                                <button type="button" onClick={() => setShowManualModal(false)}
                                    className="px-4 py-2 border border-black/10 dark:border-white/10 hover:bg-white/[0.04] text-zinc-300 rounded-none cursor-pointer transition-colors bg-zinc-900">Annuler</button>
                                <button type="submit"
                                    className="px-5 py-2 bg-[#C6A969] hover:brightness-110 text-zinc-900 dark:text-white rounded-none cursor-pointer transition-all shadow-none">Créer la Réservation</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Dock Tab Button Component
function DockTabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer select-none border ${active
                    ? "bg-[#C6A969] text-zinc-900 dark:text-white shadow-[0_4px_15px_rgba(198,169,105,0.25)] border-[#C6A969]"
                    : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border-transparent"
                }`}
        >
            <i className={`fa-solid ${icon} text-sm`}></i>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

// Stats Card View Component
function StatCard({ icon, label, value, isGold }: { icon: string; label: string; value: any; isGold?: boolean }) {
    return (
        <div className="group bg-white dark:bg-[#0F0F11] border border-black/5 dark:border-white/[0.06] p-5 flex items-center gap-4 text-left rounded-none shadow-none transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 card-hover-lift">
            <div className={`w-10 h-10 rounded-none flex items-center justify-center text-md transition-all duration-300 group-hover:scale-110 ${isGold ? "bg-amber-500/10 text-[#C6A969] border border-[#C6A969]/20" : "bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-black/10 dark:border-white/10"
                }`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <span className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500 block mb-0.5">
                    {label}
                </span>
                <h3 className={`font-display text-2xl font-medium leading-tight ${isGold ? "text-[#C6A969]" : "text-zinc-900 dark:text-white"}`}>
                    {value}
                </h3>
            </div>
        </div>
    );
}
