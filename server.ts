import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { withSupabase } from "@supabase/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import xss from "xss";
import crypto from "crypto";

// JWT Secret - Fallback to a cryptographically secure random string at startup to prevent forgery
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not set. A random secret has been generated. Admin sessions will invalidate on server restart.");
}


// Load environment variables
dotenv.config();

// Create local data directories if they don't exist (use /tmp on Vercel)
const DATA_DIR = path.join(process.env.VERCEL ? "/tmp" : process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("WARNING: Could not create local data directory. If using Supabase, this is fine on Vercel.");
}

const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const BLOCKED_FILE = path.join(DATA_DIR, "blocked_dates.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Helper to convert Web Request/Response for Express
function runFetchHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers.set(k, v);
        else if (Array.isArray(v)) v.forEach(item => headers.append(k, item));
      }
      const init: RequestInit = {
        method: req.method,
        headers,
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = JSON.stringify(req.body);
      }
      const webReq = new Request(url, init);
      const webRes = await handler(webReq);
      
      res.status(webRes.status);
      webRes.headers.forEach((v, k) => res.setHeader(k, v));
      const text = await webRes.text();
      try {
        res.json(JSON.parse(text));
      } catch {
        res.send(text);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
}

// Mutex to serialize file access and prevent race conditions / data corruption
class Mutex {
  private queue: Promise<any> = Promise.resolve();

  async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    let resolve: any;
    const nextPromise = new Promise((res) => {
      resolve = res;
    });
    const currentQueue = this.queue;
    this.queue = nextPromise;
    try {
      await currentQueue;
      return await callback();
    } finally {
      resolve();
    }
  }
}
const fileMutex = new Mutex();

// Helper to read local bookings asynchronously
async function readLocalBookings(): Promise<any[]> {
  if (!fs.existsSync(BOOKINGS_FILE)) {
    try {
      await fs.promises.writeFile(BOOKINGS_FILE, JSON.stringify([], null, 2));
    } catch {}
    return [];
  }
  try {
    const data = await fs.promises.readFile(BOOKINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to write local bookings asynchronously
async function writeLocalBookings(bookings: any[]): Promise<void> {
  await fs.promises.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// Helper to read local blocked dates asynchronously
async function readLocalBlocked(): Promise<any[]> {
  if (!fs.existsSync(BLOCKED_FILE)) {
    try {
      await fs.promises.writeFile(BLOCKED_FILE, JSON.stringify([], null, 2));
    } catch {}
    return [];
  }
  try {
    const data = await fs.promises.readFile(BLOCKED_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to write local blocked dates asynchronously
async function writeLocalBlocked(dates: any[]): Promise<void> {
  await fs.promises.writeFile(BLOCKED_FILE, JSON.stringify(dates, null, 2));
}

const DEFAULT_SETTINGS = {
  business_name: "Salle Des Fêtes Albatros",
  business_email: "albatros.manouba@gmail.com",
  business_phone: "+216 98 687 124",
  business_address: "Av Complexe Sportif, Manouba 2010, Tunisie",
  google_maps_url: "https://maps.google.com/?q=Av+Complexe+Sportif,+Manouba+2010,+Tunisia",
  facebook_url: "https://www.facebook.com/salle.albatros.manouba",
  instagram_handle: "@albatros.manouba",
  tiktok_handle: null,
  currency: "TND",
  timezone: "Africa/Tunis",
  default_locale: "fr",
  min_guests: 50,
  max_guests: 400,
  min_lead_days: 14,
  full_refund_days: 30,
  partial_refund_days: 7,
  deposit_percent: 30,
  working_days: [4, 5, 6],
  open_time: "11:00",
  close_time: "03:00"
};

async function readLocalSettings(): Promise<any> {
  if (!fs.existsSync(SETTINGS_FILE)) {
    try {
      await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    } catch {}
    return DEFAULT_SETTINGS;
  }
  try {
    const data = await fs.promises.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

async function writeLocalSettings(settings: any): Promise<void> {
  await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Lazy SDK Initializers
let supabaseClient: any = null;
let supabaseAdmin: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        supabaseClient = createClient(url, key);
        console.log("Supabase Client initialized successfully.");
      } catch (err: any) {
        console.error("Failed to initialize Supabase Client:", err.message);
      }
    } else {
      console.log("Supabase URL or Publishable Key is missing. Falling back to Local Database.");
    }
  }
  return supabaseClient;
}

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && secret) {
      try {
        supabaseAdmin = createClient(url, secret);
        console.log("Supabase Admin initialized successfully.");
      } catch (err: any) {
        console.error("Failed to initialize Supabase Admin:", err.message);
      }
    } else {
      console.log("Supabase Secret Key is missing.");
    }
  }
  return supabaseAdmin;
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (secret) {
      stripeClient = new Stripe(secret, {
        apiVersion: "2025-02-11-preview" as any,
      });
      console.log("Stripe Client initialized successfully.");
    } else {
      console.log("Stripe Secret Key is missing. Falling back to Mock Stripe Checkout.");
    }
  }
  return stripeClient;
}

// Konnect helper
function getKonnect() {
  const apiKey = process.env.KONNECT_API_KEY;
  const walletId = process.env.KONNECT_WALLET_ID;
  const isSandbox = !process.env.KONNECT_PRODUCTION || process.env.KONNECT_PRODUCTION === 'false';
  return { apiKey, walletId, isSandbox };
}

let supabaseColumns: string[] = [];

async function detectSupabaseColumns() {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("bookings").select("*").limit(1);
      if (!error && data) {
        if (data.length > 0) {
          supabaseColumns = Object.keys(data[0]);
        } else {
          // If no records, try a check on column names or fallback to test columns
          const testColumns = [
            "booking_ref", "customer_name", "customer_email", "customer_phone", 
            "event_date", "event_type", "guest_count", "notes", "total_price", 
            "deposit_amount", "balance_amount", "status", "stripe_payment_intent_id", 
            "paid_at", "created_at", "payment_gateway", "gateway_reference", 
            "gateway_status", "flouci_payment_id", "flouci_transaction_reference", 
            "flouci_transaction_id", "flouci_payment_url"
          ];
          for (const col of testColumns) {
            const { error: testErr } = await supabase.from("bookings").select(col).limit(1);
            if (!testErr) {
              supabaseColumns.push(col);
            }
          }
        }
        console.log("Detected Supabase bookings columns:", supabaseColumns);
        return;
      }
    } catch (e: any) {
      console.error("Error detecting Supabase columns:", e.message);
    }
  }
}

async function verifyGatewayPayment(refId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin() || getSupabase();
  let booking: any = null;

  if (supabase) {
    const { data, error } = await supabase.from("bookings").select("*").eq("booking_ref", refId).single();
    if (!error && data) {
      booking = data;
    }
  } else {
    const bookings = await readLocalBookings();
    booking = bookings.find((b) => b.id === refId);
  }

  if (!booking) {
    console.log(`Booking ${refId} not found for verification.`);
    return false;
  }

  const paymentGateway = booking.payment_gateway || (booking.stripe_payment_intent_id ? 'stripe' : 'flouci');
  const gatewayReference = booking.gateway_reference || booking.stripe_payment_intent_id || booking.flouci_transaction_reference;
  
  if (!gatewayReference) {
    console.log(`No gateway reference for booking ${refId}`);
    return false;
  }

  let isPaid = false;

  if (paymentGateway === 'stripe') {
    const stripe = getStripe();
    if (stripe && !gatewayReference.startsWith("mock_pi_")) {
      try {
        const intent = await stripe.paymentIntents.retrieve(gatewayReference);
        if (intent.status === 'succeeded' || intent.status === 'requires_capture') {
          isPaid = true;
        }
      } catch (err: any) {
        console.error(`Stripe verification error for ${refId}:`, err.message);
      }
    } else if (gatewayReference.startsWith("mock_pi_")) {
      isPaid = true;
    }
  } else if (paymentGateway === 'flouci') {
    const apiKey = process.env.FLUOCI_API_KEY;
    const secret = process.env.FLUOCI_SIGNING_SECRET_KEY;
    if (apiKey && secret) {
      try {
        const authHeader = `Bearer ${apiKey}:${secret}`;
        const res = await fetch(`https://developers.flouci.com/api/v2/verify_payment/${gatewayReference}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.result && data.result.status === 'SUCCESS') {
            isPaid = true;
          }
        }
      } catch (err: any) {
        console.error(`Flouci verification error for ${refId}:`, err.message);
      }
    }
  } else if (paymentGateway === 'konnect') {
    const { apiKey, isSandbox } = getKonnect();
    if (apiKey) {
      try {
        const baseUrl = isSandbox ? 'https://api.sandbox.konnect.network/api/v2' : 'https://api.konnect.network/api/v2';
        const res = await fetch(`${baseUrl}/payments/${gatewayReference}`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.payment && data.payment.status === 'completed') {
            isPaid = true;
          }
        }
      } catch (err: any) {
        console.error(`Konnect verification error for ${refId}:`, err.message);
      }
    }
  }

  if (isPaid && booking.status !== 'confirmed') {
    console.log(`Payment confirmed for booking ${refId}. Updating database.`);
    if (supabase) {
      const updates: any = {
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        gateway_status: 'captured'
      };
      const filtered: any = { status: 'confirmed', paid_at: updates.paid_at };
      if (supabaseColumns.includes('gateway_status')) filtered.gateway_status = 'captured';

      await supabase.from("bookings").update(filtered).eq("booking_ref", refId);
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === refId);
        if (match) {
          match.status = 'confirmed';
          match.paid_at = new Date().toISOString();
          match.gateway_status = 'captured';
          await writeLocalBookings(bookings);
        }
      });
    }
    return true;
  }

  return booking.status === 'confirmed';
}

export const app = express();

async function startServer() {
  const PORT = process.env.PORT || 3000;

  // Trust proxy to ensure rate limiter works correctly behind load balancers/Cloud Run ingress
  app.set("trust proxy", 1);

  // Security headers with production Content Security Policy
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://api.stripe.com"],
        imgSrc: ["'self'", "data:", "https://*.supabase.co"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    } : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  // Strict rate limiter for bookings
  const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 booking requests per hour
    message: { error: "Trop de tentatives de réservation, veuillez réessayer plus tard." }
  });

  // Use raw body for Stripe webhook endpoint specifically, with body size limit to prevent DoS
  app.post("/api/stripe-webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripe();

    if (!stripe || !sig || !webhookSecret) {
      console.log("Webhook skipped or running in mock mode: missing secret or sig.");
      return res.status(200).json({ received: true, mock: true });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout session completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const refId = session.metadata?.bookingRef || session.client_reference_id;

      if (refId) {
        console.log(`Payment succeeded for booking reference ${refId}`);
        // Update database (Supabase or Local)
        const supabase = getSupabaseAdmin(); // Use admin client for database writes
        if (supabase) {
          const updates: any = { status: "confirmed", paid_at: new Date().toISOString(), stripe_payment_intent_id: session.payment_intent };
          if (supabaseColumns.includes('gateway_status')) updates.gateway_status = 'captured';
          if (supabaseColumns.includes('gateway_reference')) updates.gateway_reference = session.payment_intent;
          await supabase
            .from("bookings")
            .update(updates)
            .eq("booking_ref", refId);
        } else {
          await fileMutex.runExclusive(async () => {
            const bookings = await readLocalBookings();
            const match = bookings.find((b) => b.id === refId);
            if (match) {
              match.status = "confirmed";
              match.paid_at = new Date().toISOString();
              match.gateway_status = "captured";
              await writeLocalBookings(bookings);
            }
          });
        }
      }
    }

    res.json({ received: true });
  });

  // Regular middlewares for all other endpoints with strict limits to prevent memory exhaustion (DoS)
  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: true, limit: "50kb" }));

  // Endpoint: Check integration statuses
  app.get("/api/config-status", (req, res) => {
    const { apiKey: kKey, walletId: kWallet } = getKonnect();
    res.json({
      supabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      flouci: !!(process.env.FLUOCI_API_KEY && process.env.FLUOCI_SIGNING_SECRET_KEY),
      konnect: !!(kKey && kWallet),
      appUrl: process.env.APP_URL || "http://localhost:3000",
    });
  });

  // Endpoint: Get business settings
  app.get("/api/settings", async (req, res) => {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from("business_settings").select("*").single();
      if (!error && data) {
        return res.json(data);
      }
    }

    res.json(await readLocalSettings());
  });

  // Endpoint: Get booked & blocked dates (Privacy-preserving, queries public view to protect GDPR data)
  app.get("/api/availability", async (req, res) => {
    const supabase = getSupabase();
    let bookedDates: string[] = [];
    let blockedDates: string[] = [];

    if (supabase) {
      const { data: bData } = await supabase
        .from("booking_availability")
        .select("event_date");
      const { data: blData } = await supabase
        .from("blocked_dates")
        .select("blocked_date");

      bookedDates = (bData || []).map((b) => b.event_date);
      blockedDates = (blData || []).map((b) => b.blocked_date);
    } else {
      const localBookings = await readLocalBookings();
      const localBlocked = await readLocalBlocked();

      bookedDates = localBookings.filter((b) => b.status !== "cancelled").map((b) => b.date);
      blockedDates = localBlocked.map((b) => b.date);
    }

    const allBlocked = Array.from(new Set([...bookedDates, ...blockedDates]));
    res.json(allBlocked.map((date) => ({ event_date: date, is_blocked: true })));
  });

  // Endpoint: Create Payment Intent (Stripe Only)
  app.post("/api/create-payment-intent", async (req, res) => {
    const { eventType } = req.body;

    const eventPrices: Record<string, number> = {
      "Mariage": 4000,
      "Soirée": 2500,
      "Entreprise": 2000,
      "Anniversaire": 1500,
      "Autre": 1500,
    };
    const calculatedPrice = eventPrices[eventType] || 1500;
    const calculatedDeposit = Math.round(calculatedPrice * 0.30);

    const stripe = getStripe();
    if (!stripe) {
      return res.json({ clientSecret: "pi_mock_secret", mock: true });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: calculatedDeposit * 100, // in cents
        currency: "eur", // Using EUR for testing compatibility
        capture_method: "manual",
        payment_method_types: ["card"],
      });

      res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error: any) {
      console.error("Error creating PaymentIntent:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint: Create a booking & link to Payment Intent / Initiate redirect payments
  app.post("/api/bookings", bookingLimiter, async (req, res) => {
    const {
      firstName,
      lastName,
      phone,
      email,
      date,
      eventType,
      guests,
      notes,
      paymentIntentId,
      bot_field,
      paymentMethod
    } = req.body;

    // Honeypot check
    if (bot_field) {
      console.warn("Honeypot triggered, possible bot submission.");
      return res.status(400).json({ error: "Spam detected." });
    }

    // Coerce to strings/integers to prevent type pollution/confusion attacks
    const safeFirstName = xss(String(firstName || ""));
    const safeLastName = xss(String(lastName || ""));
    const safePhone = xss(String(phone || ""));
    const safeEmail = xss(String(email || ""));
    const safeDate = xss(String(date || ""));
    const safeEventType = xss(String(eventType || ""));
    const safeNotes = xss(String(notes || ""));
    const safePaymentIntentId = xss(String(paymentIntentId || ""));
    const safeGuests = parseInt(String(guests), 10);
    const safePaymentMethod = xss(String(paymentMethod || "stripe"));

    if (isNaN(safeGuests) || safeGuests < 1) {
      return res.status(400).json({ error: "Invalid guest count." });
    }

    if (!safeFirstName || !safeLastName || !safePhone || !safeEmail || !safeDate || !safeEventType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const requestedDate = new Date(safeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      return res.status(400).json({ error: "Invalid date: You cannot book a date in the past." });
    }

    const eventPrices: Record<string, number> = {
      "Mariage": 4000,
      "Soirée": 2500,
      "Entreprise": 2000,
      "Anniversaire": 1500,
      "Autre": 1500,
    };

    const calculatedPrice = eventPrices[safeEventType] || 1500;
    const calculatedDeposit = Math.round(calculatedPrice * 0.30);
    const calculatedBalance = calculatedPrice - calculatedDeposit;

    const ref = "ALB-" + crypto.randomInt(100000, 999999);

    let paymentUrl = null;
    let gatewayRef = null;
    let initialStatus = "pending";

    // Call payment provider API if redirect gateway is selected
    if (safePaymentMethod === 'flouci') {
      initialStatus = "pending_payment";
      try {
        const APP_URL = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
        const apiKey = process.env.FLUOCI_API_KEY;
        const secret = process.env.FLUOCI_SIGNING_SECRET_KEY;
        if (!apiKey || !secret) {
          throw new Error("La configuration Flouci est incomplète sur le serveur.");
        }
        
        const authHeader = `Bearer ${apiKey}:${secret}`;
        const amountInMillimes = calculatedDeposit * 1000;

        const transactionPayload = {
          amount: String(amountInMillimes),
          success_link: `${APP_URL}/payment/success?reference=${ref}`,
          fail_link: `${APP_URL}/payment/failure?reference=${ref}`,
          webhook: `${APP_URL}/api/flouci-webhook`,
          developer_tracking_id: ref,
          accept_card: true,
          client_id: `${safeFirstName} ${safeLastName}`.trim()
        };

        const response = await fetch('https://developers.flouci.com/api/v2/generate_payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(transactionPayload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Flouci API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        if (!data.result || !data.result.success || !data.result.link) {
          throw new Error(data.result?.message || 'Failed to generate payment from Flouci');
        }

        paymentUrl = data.result.link;
        gatewayRef = data.result.payment_id;
      } catch (err: any) {
        console.error("Error creating Flouci payment:", err);
        return res.status(500).json({ error: err.message });
      }
    } else if (safePaymentMethod === 'konnect' || safePaymentMethod === 'd17') {
      initialStatus = "pending_payment";
      try {
        const { apiKey, walletId, isSandbox } = getKonnect();
        if (!apiKey || !walletId) {
          throw new Error("La configuration Konnect est incomplète sur le serveur.");
        }
        const baseUrl = isSandbox ? 'https://api.sandbox.konnect.network/api/v2' : 'https://api.konnect.network/api/v2';
        const APP_URL = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

        const transactionPayload = {
          receiverWalletId: walletId,
          token: 'TND',
          amount: calculatedDeposit * 1000,
          type: 'immediate',
          description: `Acompte Réservation Albatros - Réf: ${ref}`,
          acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
          lifespan: 15,
          firstName: safeFirstName,
          lastName: safeLastName,
          phoneNumber: safePhone,
          email: safeEmail,
          orderId: ref,
          webhook: `${APP_URL}/api/konnect-webhook`,
          silentWebhook: true
        };

        const response = await fetch(`${baseUrl}/payments/init-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(transactionPayload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Konnect API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        if (!data.payUrl || !data.paymentRef) {
          throw new Error('Failed to generate payment from Konnect');
        }

        paymentUrl = data.payUrl;
        gatewayRef = data.paymentRef;
      } catch (err: any) {
        console.error("Error creating Konnect payment:", err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      // Stripe
      gatewayRef = safePaymentIntentId;
    }

    const newBooking = {
      id: ref,
      firstName: safeFirstName,
      lastName: safeLastName,
      phone: safePhone,
      email: safeEmail,
      date: safeDate,
      eventType: safeEventType,
      guests: safeGuests,
      notes: safeNotes,
      status: initialStatus,
      price: calculatedPrice,
      deposit: calculatedDeposit,
      balance: calculatedBalance,
      stripe_payment_intent_id: safePaymentMethod === 'stripe' ? safePaymentIntentId : null,
      payment_gateway: safePaymentMethod,
      gateway_reference: gatewayRef,
      gateway_status: 'pending',
      flouci_payment_id: safePaymentMethod === 'flouci' ? gatewayRef : null,
      flouci_transaction_reference: safePaymentMethod === 'flouci' ? gatewayRef : null,
      flouci_transaction_id: safePaymentMethod === 'flouci' ? gatewayRef : null,
      flouci_payment_url: paymentUrl,
      createdAt: new Date().toISOString()
    };

    const supabaseAdminClient = getSupabaseAdmin();
    if (supabaseAdminClient) {
      const insertPayload: any = {
        booking_ref: ref,
        customer_name: `${safeFirstName} ${safeLastName}`,
        customer_email: safeEmail,
        customer_phone: safePhone,
        event_date: safeDate,
        event_type: safeEventType,
        guest_count: safeGuests,
        notes: safeNotes,
        total_price: newBooking.price,
        deposit_amount: newBooking.deposit,
        balance_amount: newBooking.balance,
        status: initialStatus,
      };

      const extraKeysMap: Record<string, any> = {
        stripe_payment_intent_id: safePaymentMethod === 'stripe' ? safePaymentIntentId : null,
        payment_gateway: safePaymentMethod,
        gateway_reference: gatewayRef,
        gateway_status: 'pending',
        flouci_payment_id: safePaymentMethod === 'flouci' ? gatewayRef : null,
        flouci_transaction_reference: safePaymentMethod === 'flouci' ? gatewayRef : null,
        flouci_transaction_id: safePaymentMethod === 'flouci' ? gatewayRef : null,
        flouci_payment_url: paymentUrl
      };

      for (const [k, v] of Object.entries(extraKeysMap)) {
        if (supabaseColumns.includes(k)) {
          insertPayload[k] = v;
        }
      }

      const { error } = await supabaseAdminClient.from("bookings").insert(insertPayload);
      if (error) {
        console.error("Supabase booking insert error:", error);
        return res.status(500).json({ error: "Erreur de base de données." });
      }
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        bookings.push(newBooking);
        await writeLocalBookings(bookings);
      });
    }

    res.json({ ref, success: true, paymentUrl });
  });

  // Redirect endpoints for user redirects from Flouci / Konnect
  app.get("/payment/success", async (req, res) => {
    const reference = req.query.reference || req.query.payment_ref || req.query.ref || req.query.payment_id;
    if (reference) {
      const safeRef = xss(String(reference));
      await verifyGatewayPayment(safeRef);
      return res.redirect(`/booking/success?ref=${safeRef}`);
    }
    res.redirect("/");
  });

  app.get("/payment/failure", async (req, res) => {
    const reference = req.query.reference || req.query.payment_ref || req.query.ref || req.query.payment_id;
    if (reference) {
      const safeRef = xss(String(reference));
      return res.redirect(`/booking/cancelled?ref=${safeRef}`);
    }
    res.redirect("/");
  });

  // Webhooks
  app.post("/api/flouci-webhook", async (req, res) => {
    const reference = req.body.developer_tracking_id || req.body.reference_id || req.body.payment_id;
    if (reference) {
      await verifyGatewayPayment(xss(String(reference)));
    }
    res.json({ received: true });
  });

  app.post("/api/konnect-webhook", async (req, res) => {
    const paymentRef = req.query.payment_ref || req.body.payment_ref || req.body.paymentRef;
    if (paymentRef) {
      const safeRef = xss(String(paymentRef));
      const supabase = getSupabaseAdmin();
      let bookingRef = null;
      if (supabase) {
        const { data } = await supabase.from("bookings").select("booking_ref").eq("gateway_reference", safeRef).single();
        if (data) bookingRef = data.booking_ref;
      } else {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.gateway_reference === safeRef || b.flouci_transaction_reference === safeRef);
        if (match) bookingRef = match.id;
      }
      if (bookingRef) {
        await verifyGatewayPayment(bookingRef);
      }
    }
    res.json({ received: true });
  });

  // Login rate limiter
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per window
    message: { error: "Trop de tentatives de connexion, veuillez réessayer dans 15 minutes." }
  });

  // Authentication Endpoint
  app.post("/api/auth/admin/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Identifiants manquants" });
    }

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      // Use Supabase admins table
      const { data, error } = await supabase.from("admins").select("*").eq("username", username).single();
      
      console.log("Login attempt:", { username, error, data });

      if (error || !data) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }

      // Removed single admin UUID restriction (f2049c27-59e6-4746-9e91-5b0cad555519 lockout) to support multi-admin setups
      const isValid = await bcrypt.compare(password, data.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }

      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
      await supabase.from("admins").update({ last_login: new Date().toISOString() }).eq("id", data.id);
      return res.json({ token });
    } else {
      // Local fallback (if no supabase)
      const LOCAL_ADMIN_USER = process.env.ADMIN_USER || "admin";
      const LOCAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
      
      if (LOCAL_ADMIN_USER && LOCAL_ADMIN_PASSWORD && username === LOCAL_ADMIN_USER && password === LOCAL_ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token });
      }
      return res.status(401).json({ error: "Identifiants invalides." });
    }
  });

  // Admin endpoints middleware (secured by JWT)
  app.use("/api/admin", (req, res, next) => {
    const token = req.headers["x-admin-token"];
    if (!token || typeof token !== "string") {
      return res.status(401).json({ error: "Unauthorized. Token missing." });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized. Token invalid or expired." });
    }
  });

  app.post("/api/admin/verify-payment", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing booking ID" });
    const success = await verifyGatewayPayment(xss(String(id)));
    res.json({ success });
  });

  app.post("/api/admin/refund-booking", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing booking ID" });
    const safeId = xss(String(id));

    const supabase = getSupabaseAdmin() || getSupabase();
    let booking: any = null;
    if (supabase) {
      const { data } = await supabase.from("bookings").select("*").eq("booking_ref", safeId).single();
      booking = data;
    } else {
      const bookings = await readLocalBookings();
      booking = bookings.find((b) => b.id === safeId);
    }

    if (!booking) {
      return res.status(404).json({ error: "Réservation non trouvée" });
    }

    const gateway = booking.payment_gateway || (booking.stripe_payment_intent_id ? 'stripe' : 'flouci');
    const gatewayRef = booking.gateway_reference || booking.stripe_payment_intent_id || booking.flouci_transaction_reference;

    let refundSuccess = false;
    let errorMessage = "";

    if (!gatewayRef) {
      // Cash/cheque bookings with no gateway — cancel directly
      refundSuccess = true;
    }

    try {
      if (gateway === 'stripe') {
        const stripe = getStripe();
        if (stripe && !gatewayRef.startsWith("mock_pi_")) {
          await stripe.refunds.create({ payment_intent: gatewayRef });
          refundSuccess = true;
        } else {
          refundSuccess = true;
        }
      } else if (gateway === 'flouci') {
        const apiKey = process.env.FLUOCI_API_KEY;
        const secret = process.env.FLUOCI_SIGNING_SECRET_KEY;
        if (apiKey && secret) {
          const authHeader = `Bearer ${apiKey}:${secret}`;
          const resFlouci = await fetch('https://developers.flouci.com/api/v2/refund_payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({ payment_id: gatewayRef })
          });
          if (resFlouci.ok) {
            const data = await resFlouci.json();
            if (data.status === 'success') {
              refundSuccess = true;
            } else {
              errorMessage = data.message || "Erreur de remboursement Flouci";
            }
          } else {
            const txt = await resFlouci.text();
            errorMessage = `Flouci refund failed: ${resFlouci.status} - ${txt}`;
          }
        } else {
          errorMessage = "Configuration Flouci manquante";
        }
      } else if (gateway === 'konnect' || gateway === 'd17') {
        // Konnect/D17 refund is dashboard-only, so we update the local db state directly
        refundSuccess = true;
      }
    } catch (err: any) {
      console.error("Refund error:", err);
      errorMessage = err.message || "Erreur lors du traitement du remboursement";
    }

    if (refundSuccess) {
      if (supabase) {
        const updates: any = { status: 'cancelled', gateway_status: 'refunded' };
        const filtered: any = { status: 'cancelled' };
        if (supabaseColumns.includes('gateway_status')) filtered.gateway_status = 'refunded';
        await supabase.from("bookings").update(filtered).eq("booking_ref", safeId);
      } else {
        await fileMutex.runExclusive(async () => {
          const bookings = await readLocalBookings();
          const match = bookings.find((b) => b.id === safeId);
          if (match) {
            match.status = 'cancelled';
            match.gateway_status = 'refunded';
            await writeLocalBookings(bookings);
          }
        });
      }
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: errorMessage || "Le remboursement a échoué" });
    }
  });



  app.post("/api/admin/manual-pay", async (req, res) => {
    const { id, method } = req.body;
    if (!id || !method) return res.status(400).json({ error: "Missing fields" });
    const safeId = xss(String(id));
    const safeMethod = xss(String(method));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      const updates: any = {
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        payment_gateway: safeMethod,
        gateway_status: 'captured'
      };
      const filtered: any = { status: 'confirmed', paid_at: updates.paid_at };
      if (supabaseColumns.includes('payment_gateway')) filtered.payment_gateway = safeMethod;
      if (supabaseColumns.includes('gateway_status')) filtered.gateway_status = 'captured';

      await supabase.from("bookings").update(filtered).eq("booking_ref", safeId);
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === safeId);
        if (match) {
          match.status = 'confirmed';
          match.paid_at = new Date().toISOString();
          match.payment_gateway = safeMethod;
          match.gateway_status = 'captured';
          await writeLocalBookings(bookings);
        }
      });
    }

    res.json({ success: true });
  });

  app.get("/api/admin/bookings", async (req, res) => {
    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        const mapped = data.map((b) => {
          const names = (b.customer_name || "").split(" ");
          return {
            id: b.booking_ref,
            firstName: names[0] || "",
            lastName: names.slice(1).join(" ") || "",
            phone: b.customer_phone,
            email: b.customer_email,
            date: b.event_date,
            eventType: b.event_type || "wedding",
            guests: b.guest_count,
            notes: b.notes,
            status: b.status,
            price: b.total_price,
            deposit: b.deposit_amount,
            balance: b.balance_amount,
            stripe_payment_intent_id: b.stripe_payment_intent_id,
            payment_gateway: b.payment_gateway || (b.stripe_payment_intent_id ? 'stripe' : 'flouci'),
            gateway_reference: b.gateway_reference || b.stripe_payment_intent_id || b.flouci_transaction_reference,
            gateway_status: b.gateway_status || 'pending',
            flouci_payment_url: b.flouci_payment_url,
            deletedAt: b.deleted_at || undefined,
            createdAt: b.created_at
          };
        });
        return res.json(mapped);
      }
    }

    res.json(await readLocalBookings());
  });

  app.get("/api/admin/blocked", async (req, res) => {
    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from("blocked_dates").select("*");
      if (!error && data) {
        return res.json(data.map((d) => ({ date: d.blocked_date, reason: d.reason })));
      }
    }
    res.json(await readLocalBlocked());
  });

  app.post("/api/admin/block-date", async (req, res) => {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: "Missing date" });
    const safeDate = xss(String(date));
    const safeReason = xss(String(reason || "Fermeture manuelle"));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      await supabase.from("blocked_dates").insert({ blocked_date: safeDate, reason: safeReason });
    } else {
      await fileMutex.runExclusive(async () => {
        const blocked = await readLocalBlocked();
        blocked.push({ date: safeDate, reason: safeReason });
        await writeLocalBlocked(blocked);
      });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/unblock-date", async (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "Missing date" });
    const safeDate = xss(String(date));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      await supabase.from("blocked_dates").delete().eq("blocked_date", safeDate);
    } else {
      await fileMutex.runExclusive(async () => {
        let blocked = await readLocalBlocked();
        blocked = blocked.filter((b) => b.date !== safeDate);
        await writeLocalBlocked(blocked);
      });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/update-status", async (req, res) => {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: "Missing fields" });
    const safeId = xss(String(id));
    const safeStatus = xss(String(status));

    const supabase = getSupabaseAdmin() || getSupabase();
    let paymentIntentId = null;
    let paymentMethod = 'stripe';

    let booking: any = null;
    if (supabase) {
      const { data } = await supabase.from("bookings").select("*").eq("booking_ref", safeId).single();
      booking = data;
    } else {
      const bookings = await readLocalBookings();
      booking = bookings.find((b) => b.id === safeId);
    }

    if (booking) {
      paymentIntentId = booking.gateway_reference || booking.stripe_payment_intent_id || booking.flouci_transaction_reference;
      paymentMethod = booking.payment_gateway || (booking.stripe_payment_intent_id ? 'stripe' : 'flouci');
    }

    if (supabase) {
      await supabase.from("bookings").update({ status: safeStatus }).eq("booking_ref", safeId);
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === safeId);
        if (match) {
          match.status = safeStatus;
          await writeLocalBookings(bookings);
        }
      });
    }

    // Handle Stripe Capture or Cancel
    if (paymentMethod === 'stripe' && paymentIntentId && !paymentIntentId.startsWith("mock_pi_")) {
      const stripe = getStripe();
      if (stripe) {
        try {
          if (safeStatus === "confirmed") {
            await stripe.paymentIntents.capture(paymentIntentId);
            console.log(`Captured payment intent ${paymentIntentId} for booking ${safeId}`);
          } else if (safeStatus === "cancelled") {
            await stripe.paymentIntents.cancel(paymentIntentId);
            console.log(`Canceled payment intent ${paymentIntentId} for booking ${safeId}`);
          }
        } catch (error: any) {
          console.error(`Error processing Stripe intent for ${safeId}:`, error.message);
        }
      }
    }

    res.json({ success: true });
  });

  app.post("/api/admin/edit-booking", async (req, res) => {
    const {
      id,
      firstName,
      lastName,
      email,
      phone,
      date,
      eventType,
      guests,
      notes,
      price,
      deposit,
      balance,
      status
    } = req.body;

    if (!id) return res.status(400).json({ error: "Missing booking ID" });
    const safeId = xss(String(id));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      const updates: any = {};
      if (firstName !== undefined || lastName !== undefined) {
        updates.customer_name = `${firstName || ""} ${lastName || ""}`.trim();
      }
      if (email !== undefined) updates.customer_email = xss(String(email));
      if (phone !== undefined) updates.customer_phone = xss(String(phone));
      if (date !== undefined) updates.event_date = xss(String(date));
      if (eventType !== undefined) updates.event_type = xss(String(eventType));
      if (guests !== undefined) updates.guest_count = parseInt(String(guests), 10);
      if (notes !== undefined) updates.notes = xss(String(notes));
      if (price !== undefined) updates.total_price = parseFloat(String(price));
      if (deposit !== undefined) updates.deposit_amount = parseFloat(String(deposit));
      if (balance !== undefined) updates.balance_amount = parseFloat(String(balance));
      if (status !== undefined) updates.status = xss(String(status));

      const { error } = await supabase.from("bookings").update(updates).eq("booking_ref", safeId);
      if (error) {
        console.error("Supabase edit error:", error);
        return res.status(500).json({ error: "Database update failed" });
      }
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === safeId);
        if (match) {
          if (firstName !== undefined) match.firstName = xss(String(firstName));
          if (lastName !== undefined) match.lastName = xss(String(lastName));
          if (email !== undefined) match.email = xss(String(email));
          if (phone !== undefined) match.phone = xss(String(phone));
          if (date !== undefined) match.date = xss(String(date));
          if (eventType !== undefined) match.eventType = xss(String(eventType));
          if (guests !== undefined) match.guests = parseInt(String(guests), 10);
          if (notes !== undefined) match.notes = xss(String(notes));
          if (price !== undefined) match.price = parseFloat(String(price));
          if (deposit !== undefined) match.deposit = parseFloat(String(deposit));
          if (balance !== undefined) match.balance = parseFloat(String(balance));
          if (status !== undefined) match.status = xss(String(status));
          await writeLocalBookings(bookings);
        }
      });
    }

    res.json({ success: true });
  });

  // Soft-delete: mark as deleted instead of removing
  app.post("/api/admin/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id" });
    const safeId = xss(String(id));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      await supabase.from("bookings").update({ deleted_at: new Date().toISOString() }).eq("booking_ref", safeId);
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === safeId);
        if (match) {
          match.deletedAt = new Date().toISOString();
          await writeLocalBookings(bookings);
        }
      });
    }

    res.json({ success: true });
  });

  // Restore a soft-deleted booking
  app.post("/api/admin/restore", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id" });
    const safeId = xss(String(id));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      await supabase.from("bookings").update({ deleted_at: null }).eq("booking_ref", safeId);
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === safeId);
        if (match) {
          delete match.deletedAt;
          await writeLocalBookings(bookings);
        }
      });
    }

    res.json({ success: true });
  });

  // Permanently delete a booking from the database
  app.post("/api/admin/permanent-delete", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id" });
    const safeId = xss(String(id));

    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      await supabase.from("bookings").delete().eq("booking_ref", safeId);
    } else {
      await fileMutex.runExclusive(async () => {
        let bookings = await readLocalBookings();
        bookings = bookings.filter((b) => b.id !== safeId);
        await writeLocalBookings(bookings);
      });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/settings", async (req, res) => {
    const updates = req.body;
    const supabase = getSupabaseAdmin() || getSupabase();

    if (supabase) {
      const { data: currentSettings, error: selectError } = await supabase.from("business_settings").select("id").limit(1);
      if (!selectError && currentSettings && currentSettings.length > 0) {
        const { error: updateError } = await supabase.from("business_settings").update(updates).eq("id", currentSettings[0].id);
        if (updateError) {
          console.error("Supabase settings update error:", updateError);
          return res.status(500).json({ error: "Database update failed" });
        }
      } else {
        const { error: insertError } = await supabase.from("business_settings").insert(updates);
        if (insertError) {
          console.error("Supabase settings insert error:", insertError);
          return res.status(500).json({ error: "Database insert failed" });
        }
      }
    } else {
      await fileMutex.runExclusive(async () => {
        const currentLocal = await readLocalSettings();
        const merged = { ...currentLocal, ...updates };
        await writeLocalSettings(merged);
      });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/clear-db", (req, res) => {
    return res.status(403).json({ error: "Action disabled in production." });
  });

  app.post("/api/admin/restore-seed", (req, res) => {
    return res.status(403).json({ error: "Action disabled in production." });
  });

  app.post("/api/admin/execute-sql", async (req, res) => {
    return res.status(403).json({ error: "Access denied. Manual SQL execution disabled for security." });
  });


  // API Catch-all
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route Not Found", url: req.url, originalUrl: req.originalUrl });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (!process.env.VERCEL) {
      app.use(express.static(distPath));
    }
    app.get("*", (req, res) => {
      if (process.env.VERCEL) {
        return res.status(404).send("Not Found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Detect Supabase schema columns
  await detectSupabaseColumns();

  // Seed default admin in Supabase if no admins exist (Finding 9)
  const supabaseAdminClient = getSupabaseAdmin();
  if (supabaseAdminClient) {
    try {
      const { count, error } = await supabaseAdminClient
        .from("admins")
        .select("*", { count: "exact", head: true });
      if (!error && count === 0) {
        const defaultPassword = process.env.ADMIN_PASSWORD || "albatros2026";
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        await supabaseAdminClient.from("admins").insert({
          id: "f2049c27-59e6-4746-9e91-5b0cad555519",
          username: "admin",
          password_hash: passwordHash
        });
        console.log("Default admin account seeded successfully in database.");
      }
    } catch (e: any) {
      console.error("Error seeding default admin:", e.message);
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT as number, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
startServer().catch((err) => {
  console.error("Fatal error in startServer:", err);
});
