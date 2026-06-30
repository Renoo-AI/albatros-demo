// =============================================================
// ALBATROS — AdminConsole Component
// =============================================================
import React, { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import type { Booking, BlockedDate, BookingStatus } from "../types";
import {
  fetchAdminBookings,
  fetchAdminBlocked,
  blockDate,
  unblockDate,
  updateBookingStatus,
  deleteBooking,
  clearDatabase,
  restoreDemoData,
  fetchSettings,
  fetchConfigStatus,
  executeSQL,
  editBooking,
  verifyAdminPayment,
  refundBooking,
  recordManualPayment,
  type ConfigStatus,
  type SQLResult
} from "../lib/api";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  confirmed: "bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-white dark:text-zinc-900 dark:border-white",
  cancelled: "bg-slate-100 text-slate-500 border border-slate-200",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  cancelled: "Annulé",
};

const eventLabels: Record<string, string> = {
  "Mariage": "Mariage",
  "Soirée": "Soirée",
  "Entreprise": "Entreprise",
  "Anniversaire": "Anniversaire",
  "Autre": "Autre",
};

export function AdminConsole() {
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [config, setConfig] = useState<ConfigStatus | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedBlockDate, setSelectedBlockDate] = useState<string | null>(null);
  const [blockReason, setReason] = useState("");

  // Modal Detail view
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
    status: "pending" as BookingStatus
  });

  // Tab control
  const [activeTab, setActiveTab] = useState<"dashboard" | "sql">("dashboard");

  // SQL Console States
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM bookings ORDER BY date DESC;");
  const [sqlResult, setSqlResult] = useState<SQLResult | null>(null);
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlSuccessMsg, setSqlSuccessMsg] = useState<string | null>(null);

  // Check existing session
  useEffect(() => {
    const auth = sessionStorage.getItem("albatros_admin_auth") === "true";
    if (auth) {
      setAuthorized(true);
    }
  }, []);

  // Fetch admin stats and data when authorized
  const loadData = () => {
    Promise.all([fetchAdminBookings(), fetchAdminBlocked(), fetchConfigStatus()])
      .then(([bData, blData, conf]) => {
        setBookings(bData);
        setBlockedDates(blData);
        setConfig(conf);
      })
      .catch((err) => {
        console.error("Admin load error:", err);
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
           setAuthError("Session expirée");
           handleLogout();
        }
      });
  };

  useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!username.trim() || !password.trim()) {
      setAuthError("Identifiants manquants");
      return;
    }
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      if (data.token) {
        localStorage.setItem("adminToken", data.token);
        sessionStorage.setItem("albatros_admin_auth", "true");
        setAuthorized(true);
        setAuthError("");
        loadData();
      } else {
        setAuthError("Identifiants invalides.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Erreur de connexion.");
      setPassword("");
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
    const csvContent = "data:text/csv;charset=utf-8," 
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

  // Analytics folded stats
  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled");
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const totalBookings = active.length;
    const revenue = confirmed.reduce((sum, b) => sum + b.price, 0);
    const deposits = confirmed.reduce((sum, b) => sum + b.deposit, 0);

    // Compute occupancy rate (next 90 days)
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

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = { "Mariage": 0, "Soirée": 0, "Entreprise": 0, "Anniversaire": 0, "Autre": 0 };
    let maxVal = 1;
    bookings.forEach((b) => {
      if (b.status !== "cancelled") {
        const type = b.eventType || "Autre";
        if (counts[type] !== undefined) counts[type]++;
        else counts["Autre"]++;
      }
    });
    maxVal = Math.max(...Object.values(counts), 1);
    return { counts, maxVal };
  }, [bookings]);

  // Filters on lists
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
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

  // Calendar render details
  const monthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
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

  const generateWhatsAppLink = (phone: string, text: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (!cleaned.startsWith("216") && cleaned.length === 8) {
      cleaned = "216" + cleaned;
    }
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
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

  // Status updates
  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(id, status);
      toast.success(status === "confirmed" ? "Paiement capturé avec succès !" : "Réservation annulée.");
      loadData();
      if (activeBookingId === id) {
        setActiveBookingId(null);
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur de mise à jour");
    }
  };

  // Block actions
  const handleBlockDate = async () => {
    if (!selectedBlockDate) {
      alert("Veuillez sélectionner un jour sur le calendrier.");
      return;
    }
    const reason = blockReason.trim() || "Fermeture manuelle";
    try {
      await blockDate(selectedBlockDate, reason);
      loadData();
      setSelectedBlockDate(null);
      setReason("");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUnblockDate = async (date: string) => {
    if (confirm(`Voulez-vous débloquer le ${date} ?`)) {
      try {
        await unblockDate(date);
        loadData();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  // Danger Maintenance toolings
  const handleRestoreDemo = async () => {
    if (confirm("Restaurer les données fictives d'origine ?")) {
      try {
        await restoreDemoData();
        loadData();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleClearDb = async () => {
    if (confirm("Voulez-vous vider toutes les données ?")) {
      try {
        await clearDatabase();
        loadData();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Supprimer définitivement la réservation ${id} ?`)) {
      try {
        await deleteBooking(id);
        loadData();
        setActiveBookingId(null);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const onRunSQL = async (queryText?: string) => {
    const q = queryText || sqlQuery;
    if (!q.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    setSqlSuccessMsg(null);
    try {
      const res = await executeSQL(q);
      setSqlResult(res);
      if (res.message) {
        setSqlSuccessMsg(res.message);
      } else if (res.rows) {
        setSqlSuccessMsg(`Requête exécutée avec succès. ${res.rows.length} lignes retournées.`);
      }
      const normalizedQ = q.trim().toLowerCase();
      if (!normalizedQ.startsWith("select")) {
        loadData();
      }
    } catch (e: any) {
      setSqlError(e.message || "Une erreur est survenue lors de l'exécution.");
      setSqlResult(null);
    } finally {
      setSqlLoading(false);
    }
  };

  if (!authorized) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
        {/* Abstract background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-zinc-200 dark:bg-zinc-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-zinc-300 dark:bg-zinc-700 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <a 
          href="/" 
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, "", "/");
          }}
          className="absolute top-8 left-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center gap-2 font-medium text-sm z-10"
        >
          <i className="fa-solid fa-arrow-left"></i> Retour
        </a>

        <div className="w-full max-w-md space-y-8 animate-fade-in relative z-10">
          <div className="text-center">
            <h2 className="font-display text-4xl font-semibold text-zinc-950 dark:text-white tracking-tight">
              Albatros.
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-wide uppercase">
              Espace Administration
            </p>
          </div>

          <form onSubmit={handleLogin} className="glass-panel p-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="input-lux"
                />
              </div>
              
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-lux"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn btn-primary flex items-center justify-center gap-2 mt-4"
            >
              Se Connecter
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>

            {authError && (
              <p className="text-red-500 text-sm font-medium text-center animate-fade-in">
                {authError}
              </p>
            )}
          </form>

          <div className="text-xs text-zinc-400 text-center">
            Accès restreint à la gestion Albatros.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] pt-24 pb-12 px-6">
      <Toaster position="bottom-right" />
      <div className="max-w-[1300px] mx-auto space-y-8 animate-fade-in">
        {/* Sub-Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="font-display text-4xl text-[#1C1C1C] font-semibold tracking-wider">
              Administration Albatros
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Pilotez en toute sécurité le calendrier, les réservations et l'intégration Stripe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {config && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider font-semibold border ${
                config.stripe && config.supabase
                  ? "bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                <span className={`w-2 h-2 rounded-full ${config.stripe && config.supabase ? "bg-zinc-900 dark:bg-white" : "bg-amber-500 animate-pulse"}`} />
                {config.stripe && config.supabase ? "Stripe + Supabase actifs" : "Mode bac à sable / local"}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-lg font-mono text-[10px] uppercase tracking-wider font-semibold transition-all"
            >
              Déconnexion
              <i className="fa-solid fa-right-from-bracket ml-1.5"></i>
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "border-[#9D8159] text-[#9D8159]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <i className="fa-solid fa-chart-line mr-2"></i>
            Tableau de Bord & Réservations
          </button>
        </div>

        {activeTab === "dashboard" && (
          <>
        {/* Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon="fa-calendar-check" label="Réservations Actives" value={stats.totalBookings} />
          <StatCard icon="fa-coins" label="Chiffre d'affaires" value={`${stats.revenue.toLocaleString("fr-TN")} TND`} isGold />
          <StatCard icon="fa-hand-holding-dollar" label="Acomptes Reçus (30%)" value={`${stats.deposits.toLocaleString("fr-TN")} TND`} isGold />
          <StatCard icon="fa-percent" label="Taux d'occupation (90j)" value={`${stats.occupancy}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Bookings Panel */}
          <div className="lg:col-span-2 glass-panel p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h2 className="font-display text-2xl text-[#1C1C1C] font-semibold italic">
                Toutes les réservations
              </h2>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-mono uppercase tracking-wider font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-download"></i> Exporter CSV
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, réf, téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#9D8159] focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-1.5 bg-gray-50 p-1 border border-slate-100 rounded-lg self-start">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold rounded-md transition-all ${
                    statusFilter === "all" ? "bg-white text-[#9D8159] shadow-sm" : "text-slate-500 hover:text-[#1C1C1C]"
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold rounded-md transition-all ${
                    statusFilter === "pending" ? "bg-white text-[#9D8159] shadow-sm" : "text-slate-500 hover:text-[#1C1C1C]"
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => setStatusFilter("confirmed")}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold rounded-md transition-all ${
                    statusFilter === "confirmed" ? "bg-white text-[#9D8159] shadow-sm" : "text-slate-500 hover:text-[#1C1C1C]"
                  }`}
                >
                  Confirmés
                </button>
                <button
                  onClick={() => setStatusFilter("cancelled")}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold rounded-md transition-all ${
                    statusFilter === "cancelled" ? "bg-white text-[#9D8159] shadow-sm" : "text-slate-500 hover:text-[#1C1C1C]"
                  }`}
                >
                  Annulés
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    <th className="pb-3">Réf</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Célébration</th>
                    <th className="pb-3 text-right">Montant</th>
                    <th className="pb-3 text-center">Statut</th>
                    <th className="pb-3 text-center">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-4 font-mono font-semibold text-[#9D8159] text-xs">
                        {b.id}
                      </td>
                      <td className="py-4 text-xs font-semibold text-[#1A2238]">
                        {b.date}
                      </td>
                      <td className="py-4 text-sm font-semibold text-[#1A2238]">
                        {b.firstName} {b.lastName}
                      </td>
                      <td className="py-4 text-xs text-slate-500">
                        {eventLabels[b.eventType] || b.eventType}
                      </td>
                      <td className="py-4 text-right font-mono text-xs font-bold text-[#1C1C1C]">
                        {b.price} TND
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider ${statusColors[b.status]}`}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => setActiveBookingId(b.id)}
                          className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:border-[#9D8159] hover:text-[#9D8159] flex items-center justify-center transition-all mx-auto"
                        >
                          <i className="fa-solid fa-eye text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredBookings.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Aucune réservation dans cette catégorie.
                </div>
              )}
            </div>
          </div>

          {/* Calendar & Blocking Side Panel */}
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h2 className="font-display text-xl text-zinc-950 dark:text-white font-semibold mb-4">
                Bloquer une date
              </h2>

              <div className="bg-gray-50 rounded-xl p-4 border border-slate-200 space-y-4">
                {/* Micro calendar navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100">
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <h4 className="font-mono text-xs uppercase tracking-wider font-semibold">
                    {monthLabel}
                  </h4>
                  <button onClick={handleNextMonth} className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100">
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map((d) => (
                    <div key={d} className="text-center text-[8px] font-mono uppercase tracking-widest text-slate-400 font-bold py-1">
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const dateStr = formatDateKey(date);
                    const booking = bookings.find((b) => b.date === dateStr && b.status !== "cancelled");
                    const block = blockedDates.find((bd) => bd.date === dateStr);
                    const isPast = date < today;

                    let bg = "bg-white text-slate-700 hover:bg-[#F0F0F0]";
                    if (isPast) {
                      bg = "bg-transparent text-slate-300 opacity-40 cursor-not-allowed";
                    } else if (booking) {
                      bg = "bg-[#F0F0F0] text-[#9D8159] font-bold border border-[#9D8159]";
                    } else if (block) {
                      bg = "bg-red-50 text-red-600 font-bold border border-red-200";
                    }

                    if (selectedBlockDate === dateStr) {
                      bg = "bg-[#1C1C1C] text-white font-bold scale-105";
                    }

                    return (
                      <button
                        key={dateStr}
                        disabled={isPast}
                        onClick={() => {
                          if (booking) {
                            alert(`La date ${dateStr} a déjà une réservation active.`);
                            return;
                          }
                          setSelectedBlockDate(dateStr);
                        }}
                        className={`aspect-square rounded-lg text-xs font-mono flex items-center justify-center transition-all ${bg}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedBlockDate && (
                <div className="mt-4 space-y-3 p-4 bg-[#F9FBFF] border border-[#EFF2F7] rounded-xl animate-fade-in text-left">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#9D8159] block mb-1">
                    Jour choisi : {selectedBlockDate}
                  </span>
                  <input
                    type="text"
                    placeholder="Raison (Ex: Travaux, fête privée du propriétaire)"
                    value={blockReason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E5E5E5] rounded-lg text-xs focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleBlockDate}
                      className="flex-1 font-mono text-[9px] uppercase tracking-widest bg-[#9D8159] text-white hover:bg-[#8A714E] transition-all py-2 rounded-lg"
                    >
                      Confirmer Blocage
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBlockDate(null);
                        setReason("");
                      }}
                      className="px-3 py-2 border border-[#E5E5E5] hover:bg-white text-xs rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Blocked list direct view */}
            <div className="glass-panel p-6 text-left">
              <h3 className="font-display text-lg text-[#1C1C1C] font-semibold mb-4">
                Dates Bloquées
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {blockedDates.map((d) => (
                  <div key={d.date} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-700 block">{d.date}</span>
                      <span className="text-[10px] text-slate-400 block">{d.reason}</span>
                    </div>
                    <button
                      onClick={() => handleUnblockDate(d.date)}
                      className="w-8 h-8 rounded-full border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-300 flex items-center justify-center transition-all"
                    >
                      <i className="fa-solid fa-unlock"></i>
                    </button>
                  </div>
                ))}

                {blockedDates.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Aucune date bloquée manuellement.</p>
                )}
              </div>
            </div>

            {/* Visual Analytics Charts */}
            <div className="glass-panel p-6 text-left space-y-6">
              <h3 className="font-display text-lg font-semibold text-zinc-950">
                Répartition des Événements
              </h3>
              <div className="space-y-4">
                {Object.entries(categoryBreakdown.counts).map(([cat, count]) => {
                  const pct = Math.round(((count as number) / categoryBreakdown.maxVal) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-medium">
                        <span>{cat}</span>
                        <span className="text-zinc-500">{count} événements</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#9D8159] h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

                      </div>
        </div>
      </>
    )}

      {/* Booking Details Modal */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
              <h3 className="font-display font-medium text-xl text-zinc-950 dark:text-white">
                {isEditing ? "Modifier la réservation" : "Détails de la réservation"}
              </h3>
              <button 
                onClick={() => {
                  setActiveBookingId(null);
                  setIsEditing(false);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 flex-1">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Prénom</label>
                      <input type="text" required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Nom</label>
                      <input type="text" required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Email</label>
                      <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Téléphone</label>
                      <input type="text" required value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Date (AAAA-MM-JJ)</label>
                      <input type="text" required value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Invités</label>
                      <input type="number" required value={editForm.guests} onChange={(e) => setEditForm({ ...editForm, guests: parseInt(e.target.value) || 0 })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Tarif Total (TND)</label>
                      <input type="number" required value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Acompte (TND)</label>
                      <input type="number" required value={editForm.deposit} onChange={(e) => setEditForm({ ...editForm, deposit: parseInt(e.target.value) || 0 })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Solde (TND)</label>
                      <input type="number" required value={editForm.balance} onChange={(e) => setEditForm({ ...editForm, balance: parseInt(e.target.value) || 0 })} className="input-lux" />
                    </div>
                    <div className="flex flex-col text-left col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Notes</label>
                      <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="input-lux" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
                      <div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Réf</div>
                        <div className="font-mono text-zinc-950 dark:text-white font-medium">{activeBooking.id}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Date</div>
                        <div className="font-semibold text-zinc-950 dark:text-white">{activeBooking.date}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Client</div>
                        <div className="font-semibold text-zinc-950 dark:text-white">{activeBooking.firstName} {activeBooking.lastName}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Email</div>
                        <div className="text-zinc-950 dark:text-white">{activeBooking.email}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Téléphone</div>
                        <div className="text-zinc-950 dark:text-white">{activeBooking.phone}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Mode de Paiement</div>
                        <div className="font-semibold text-zinc-950 dark:text-white capitalize">{activeBooking.payment_gateway || "Stripe"}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider mb-1">Référence Transaction</div>
                        <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 break-all bg-white dark:bg-zinc-900 p-2 border border-zinc-200 dark:border-zinc-800">{activeBooking.gateway_reference || activeBooking.stripe_payment_intent_id || "N/A"}</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 mb-6 text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Montant Total</span>
                        <span className="font-medium text-lg text-zinc-950 dark:text-white">{activeBooking.price.toLocaleString("fr-TN")} TND</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Acompte (30%) - Requis/Autorisé</span>
                        <span className="font-medium text-zinc-950 dark:text-white">{activeBooking.deposit.toLocaleString("fr-TN")} TND</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-zinc-200 dark:border-zinc-800 mt-4 pt-4">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Statut Actuel</span>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-mono font-medium uppercase tracking-wider ${statusColors[activeBooking.status]}`}>
                          {statusLabels[activeBooking.status] || activeBooking.status}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-6 space-y-4 text-left">
                      <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Actions de Paiement Admin
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const paid = await verifyAdminPayment(activeBooking.id);
                              if (paid) {
                                toast.success("Paiement vérifié avec succès !");
                                loadData();
                              } else {
                                toast.error("Le paiement n'a pas encore été finalisé par le client.");
                              }
                            } catch (e: any) {
                              toast.error(e.message || "Erreur de vérification");
                            }
                          }}
                          className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer"
                        >
                          <i className="fa-solid fa-rotate mr-1"></i> Vérifier en Direct
                        </button>

                        {activeBooking.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("Voulez-vous vraiment rembourser cet acompte ? Cette action annulera également la réservation.")) {
                                try {
                                  await refundBooking(activeBooking.id);
                                  toast.success("Remboursement traité avec succès !");
                                  loadData();
                                } catch (e: any) {
                                  toast.error(e.message || "Le remboursement a échoué");
                                }
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer"
                          >
                            <i className="fa-solid fa-arrow-rotate-left mr-1"></i> Rembourser
                          </button>
                        )}

                        {activeBooking.status === "pending" && (
                          <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                            <span className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wide px-1">Offline :</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await recordManualPayment(activeBooking.id, "cash");
                                  toast.success("Paiement Espèces enregistré !");
                                  loadData();
                                } catch (e: any) {
                                  toast.error(e.message);
                                }
                              }}
                              className="px-3 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-[10px] rounded cursor-pointer"
                            >
                              Espèces
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await recordManualPayment(activeBooking.id, "cheque");
                                  toast.success("Paiement Chèque enregistré !");
                                  loadData();
                                } catch (e: any) {
                                  toast.error(e.message);
                                }
                              }}
                              className="px-3 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-[10px] rounded cursor-pointer"
                            >
                              Chèque
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-4 justify-between">
                <div>
                  {!isEditing && (
                    <button 
                      type="button"
                      onClick={() => handleDelete(activeBooking.id)}
                      className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="btn btn-outline text-xs font-semibold"
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit"
                        className="btn btn-primary text-xs font-semibold"
                      >
                        Enregistrer
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => startEditing(activeBooking)}
                        className="btn btn-outline text-xs font-semibold"
                      >
                        Modifier les infos
                      </button>
                      {activeBooking.status === "pending" && (
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(activeBooking.id, "confirmed")}
                          className="btn btn-primary text-xs font-semibold"
                        >
                          Confirmer (Capturer)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, isGold }: { icon: string; label: string; value: any; isGold?: boolean }) {
  return (
    <div className="glass-panel p-6 flex items-center gap-4 text-left transition-transform duration-300 hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl ${
        isGold ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
      }`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">
          {label}
        </span>
        <h3 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white leading-none">
          {value}
        </h3>
      </div>
    </div>
  );
}
