// =============================================================
// ALBATROS — API Integration layer
// =============================================================
import type { Booking, BlockedDate, BusinessSettings, BookingStatus } from "../types";

export interface ConfigStatus {
  supabase: boolean;
  stripe: boolean;
  flouci: boolean;
  konnect: boolean;
  appUrl: string;
}

export async function fetchConfigStatus(): Promise<ConfigStatus> {
  const res = await fetch("/api/config-status");
  if (!res.ok) throw new Error("Failed to fetch configuration status");
  return res.json();
}

export async function fetchSettings(): Promise<BusinessSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export interface UnavailableDate {
  event_date: string;
  is_blocked: boolean;
}

export async function fetchAvailability(): Promise<string[]> {
  try {
    const res = await fetch("/api/availability");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erreur serveur (${res.status}): ${text.substring(0, 100)}`);
    }
    const data: UnavailableDate[] = await res.json();
    return data.map((d) => d.event_date);
  } catch (err: any) {
    throw new Error(`Erreur réseau: ${err.message}`);
  }
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  mock?: boolean;
  paymentUrl?: string;
  transactionReference?: string;
}

export async function createPaymentIntent(eventType: string): Promise<PaymentIntentResult> {
  const res = await fetch("/api/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create payment intent");
  }
  return res.json();
}

export interface FlouciPaymentRequest {
  amountInCents: number;
  currency: string;
  successUrl: string;
  failureUrl: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface FlouciPaymentResult {
  paymentUrl?: string;
  transactionReference?: string;
  success: boolean;
}

export interface CreateBookingInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string;
  eventType: string;
  guests: number;
  notes?: string;
  paymentIntentId?: string;
  bot_field?: string;
  paymentMethod?: string;
}

export interface CreateBookingResult {
  ref: string;
  success: boolean;
  mock?: boolean;
  paymentUrl?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to submit booking");
  }
  return res.json();
}

// -------------------------------------------------------------
// Admin-specific operations (Local Storage / Session tokens)
// -------------------------------------------------------------

function getAdminToken(): string {
  return localStorage.getItem("adminToken") || "";
}

function getAdminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": getAdminToken()
  };
}

export async function fetchAdminBookings(): Promise<Booking[]> {
  const res = await fetch("/api/admin/bookings", { headers: getAdminHeaders() });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch admin bookings");
  }
  return res.json();
}

export async function fetchAdminBlocked(): Promise<BlockedDate[]> {
  const res = await fetch("/api/admin/blocked", { headers: getAdminHeaders() });
  if (!res.ok) throw new Error("Failed to fetch admin blocked dates");
  return res.json();
}

export async function blockDate(date: string, reason: string): Promise<void> {
  const res = await fetch("/api/admin/block-date", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ date, reason }),
  });
  if (!res.ok) throw new Error("Failed to block date");
}

export async function unblockDate(date: string): Promise<void> {
  const res = await fetch("/api/admin/unblock-date", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ date }),
  });
  if (!res.ok) throw new Error("Failed to unblock date");
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const res = await fetch("/api/admin/update-status", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id, status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
}

export async function deleteBooking(id: string): Promise<void> {
  const res = await fetch("/api/admin/delete", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete booking");
}

export async function restoreBooking(id: string): Promise<void> {
  const res = await fetch("/api/admin/restore", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to restore booking");
}

export async function permanentDeleteBooking(id: string): Promise<void> {
  const res = await fetch("/api/admin/permanent-delete", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to permanently delete booking");
}

export async function editBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const res = await fetch("/api/admin/edit-booking", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to edit booking");
  }
}

export async function clearDatabase(): Promise<void> {
  const res = await fetch("/api/admin/clear-db", { 
    method: "POST",
    headers: getAdminHeaders() 
  });
  if (!res.ok) throw new Error("Failed to clear database");
}

export async function restoreDemoData(): Promise<void> {
  const res = await fetch("/api/admin/restore-seed", { 
    method: "POST",
    headers: getAdminHeaders() 
  });
  if (!res.ok) throw new Error("Failed to restore seed data");
}

export interface SQLResult {
  columns?: string[];
  rows?: any[];
  message?: string;
  affectedRows?: number;
  error?: string;
}

export async function executeSQL(sql: string): Promise<SQLResult> {
  const res = await fetch("/api/admin/execute-sql", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ sql })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Une erreur est survenue lors de l\'exécution SQL");
  }
  return res.json();
}

export async function createFlouciPayment(request: FlouciPaymentRequest): Promise<FlouciPaymentResult> {
  const res = await fetch("/api/flouci-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create Flouci payment");
  }
  return res.json();
}

export async function getFlouciTransactionStatus(transactionReference: string): Promise<any> {
  const res = await fetch("/api/flouci-transaction-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionReference }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to get transaction status");
  }
  return res.json();
}

export async function verifyAdminPayment(id: string): Promise<boolean> {
  const res = await fetch("/api/admin/verify-payment", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to verify payment status");
  }
  const data = await res.json();
  return data.success;
}

export async function refundBooking(id: string): Promise<void> {
  const res = await fetch("/api/admin/refund-booking", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to refund booking");
  }
}

export async function recordManualPayment(id: string, method: string): Promise<void> {
  const res = await fetch("/api/admin/manual-pay", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify({ id, method }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to record manual payment");
  }
}

export async function updateSettings(settings: Partial<BusinessSettings>): Promise<void> {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update settings");
  }
}
