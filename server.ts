import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
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

// Create local data directories if they don't exist
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const BLOCKED_FILE = path.join(DATA_DIR, "blocked_dates.json");

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

// Lazy SDK Initializers
let supabaseClient: any = null;
let supabaseAdmin: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      supabaseClient = createClient(url, key);
      console.log("Supabase Client initialized successfully.");
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
      supabaseAdmin = createClient(url, secret);
      console.log("Supabase Admin initialized successfully.");
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

async function startServer() {
  const app = express();
  const PORT = 3000;

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
          await supabase
            .from("bookings")
            .update({ status: "confirmed", paid_at: new Date().toISOString(), stripe_payment_intent_id: session.payment_intent })
            .eq("booking_ref", refId);
        } else {
          await fileMutex.runExclusive(async () => {
            const bookings = await readLocalBookings();
            const match = bookings.find((b) => b.id === refId);
            if (match) {
              match.status = "confirmed";
              match.paid_at = new Date().toISOString();
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
    res.json({
      supabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)),
      stripe: !!process.env.STRIPE_SECRET_KEY,
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

    // Default Fallback
    res.json({
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
      working_days: [4, 5, 6], // Thursday, Friday, Saturday
      open_time: "11:00",
      close_time: "03:00"
    });
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

    // Unify all unavailable dates and return just dates and boolean values to ensure privacy
    const allBlocked = Array.from(new Set([...bookedDates, ...blockedDates]));
    res.json(allBlocked.map((date) => ({ event_date: date, is_blocked: true })));
  });

  // Endpoint: Create Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    const { eventType } = req.body;
    
    // Recalculate price on backend for safety
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
      // Mock client secret for sandbox testing if no Stripe key
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

  // Endpoint: Create a booking & link to Payment Intent
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
      bot_field
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
      status: "pending",
      price: calculatedPrice,
      deposit: calculatedDeposit,
      balance: calculatedBalance,
      stripe_payment_intent_id: safePaymentIntentId,
      createdAt: new Date().toISOString()
    };

    const supabase = getSupabaseAdmin(); // Use service_role client to insert bookings securely bypassing anon restrictions
    if (supabase) {
      // Server-side availability check to prevent double booking
      const { data: blockedData } = await supabase
        .from("blocked_dates")
        .select("id")
        .eq("blocked_date", safeDate);
      if (blockedData && blockedData.length > 0) {
        return res.status(400).json({ error: "Cette date n'est plus disponible (bloquée)." });
      }

      const { data: bookedData } = await supabase
        .from("bookings")
        .select("booking_ref")
        .eq("event_date", safeDate)
        .neq("status", "cancelled");
      if (bookedData && bookedData.length > 0) {
        return res.status(400).json({ error: "Cette date est déjà réservée." });
      }

      const { error } = await supabase.from("bookings").insert({
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
        status: "pending",
        stripe_payment_intent_id: safePaymentIntentId
      });
      if (error) {
        console.error("Supabase booking insert error:", error);
        return res.status(500).json({ error: "Database error" });
      }
    } else {
      // Local fallback with Mutex serializing and server check
      let isAvailable = true;
      let errorMsg = "";
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const blocked = await readLocalBlocked();
        const isBlocked = blocked.some((b) => b.date === safeDate);
        const isBooked = bookings.some((b) => b.date === safeDate && b.status !== "cancelled");

        if (isBlocked) {
          isAvailable = false;
          errorMsg = "Cette date n'est plus disponible (bloquée).";
        } else if (isBooked) {
          isAvailable = false;
          errorMsg = "Cette date est déjà réservée.";
        } else {
          bookings.push(newBooking);
          await writeLocalBookings(bookings);
        }
      });

      if (!isAvailable) {
        return res.status(400).json({ error: errorMsg });
      }
    }

    res.json({ ref, success: true });
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
      const LOCAL_ADMIN_USER = process.env.ADMIN_USER;
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

    if (supabase) {
      // Get the current booking to find its payment intent ID
      const { data: booking } = await supabase.from("bookings").select("stripe_payment_intent_id").eq("booking_ref", safeId).single();
      if (booking) paymentIntentId = booking.stripe_payment_intent_id;

      await supabase.from("bookings").update({ status: safeStatus }).eq("booking_ref", safeId);
    } else {
      await fileMutex.runExclusive(async () => {
        const bookings = await readLocalBookings();
        const match = bookings.find((b) => b.id === safeId);
        if (match) {
          paymentIntentId = match.stripe_payment_intent_id;
          match.status = safeStatus;
          await writeLocalBookings(bookings);
        }
      });
    }

    // Handle Stripe Capture or Cancel - check if mock payment to avoid silent Stripe errors (Finding 7)
    if (paymentIntentId && !paymentIntentId.startsWith("mock_pi_")) {
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
          // Non-blocking error
        }
      }
    } else if (paymentIntentId && paymentIntentId.startsWith("mock_pi_")) {
      console.log(`Mock payment intent ${paymentIntentId} status updated to ${safeStatus} (Stripe skipped).`);
    }

    res.json({ success: true });
  });

  app.post("/api/admin/delete", async (req, res) => {
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

  app.post("/api/admin/clear-db", (req, res) => {
    return res.status(403).json({ error: "Action disabled in production." });
  });

  app.post("/api/admin/restore-seed", (req, res) => {
    return res.status(403).json({ error: "Action disabled in production." });
  });

  app.post("/api/admin/execute-sql", async (req, res) => {
    return res.status(403).json({ error: "Access denied. Manual SQL execution disabled for security." });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
