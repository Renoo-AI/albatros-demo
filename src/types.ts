// =============================================================
// ALBATROS — Shared Types & Interfaces
// =============================================================

export type EventTypeSlug = "Mariage" | "Soirée" | "Entreprise" | "Anniversaire" | "Autre";

export interface EventType {
  slug: EventTypeSlug;
  name: string;
  price: number;
  icon: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  eventType: EventTypeSlug;
  guests: number;
  notes?: string;
  status: BookingStatus;
  price: number;
  deposit: number;
  balance: number;
  stripe_payment_intent_id?: string;
  payment_gateway?: string;
  gateway_reference?: string;
  gateway_status?: string;
  flouci_payment_url?: string;
  createdAt: string;
}

export interface BlockedDate {
  date: string;
  reason: string;
}

export interface BusinessSettings {
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  google_maps_url: string;
  facebook_url: string;
  instagram_handle: string;
  currency: string;
  timezone: string;
  default_locale: string;
  min_guests: number;
  max_guests: number;
  min_lead_days: number;
  full_refund_days: number;
  partial_refund_days: number;
  deposit_percent: number;
  working_days: number[];
  open_time: string;
  close_time: string;
}
