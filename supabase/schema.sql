-- ====================================================================
-- ALBATROS - Supabase Database Schema
-- ====================================================================

-- 1. Table: bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    booking_ref VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    guest_count INTEGER NOT NULL,
    notes TEXT,
    total_price NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    balance_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index to enforce double-booking prevention on active bookings
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_booking_date ON public.bookings (event_date) WHERE (status != 'cancelled');

-- 2. Table: blocked_dates
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocked_date DATE NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Table: business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) DEFAULT 'Salle Des Fêtes Albatros',
    business_email VARCHAR(255) DEFAULT 'albatros.manouba@gmail.com',
    business_phone VARCHAR(50) DEFAULT '+216 98 687 124',
    business_address TEXT DEFAULT 'Av Complexe Sportif, Manouba 2010, Tunisie',
    google_maps_url TEXT,
    facebook_url TEXT,
    instagram_handle TEXT,
    tiktok_handle TEXT,
    currency VARCHAR(10) DEFAULT 'TND',
    timezone VARCHAR(50) DEFAULT 'Africa/Tunis',
    default_locale VARCHAR(10) DEFAULT 'fr',
    min_guests INTEGER DEFAULT 50,
    max_guests INTEGER DEFAULT 400,
    min_lead_days INTEGER DEFAULT 14,
    full_refund_days INTEGER DEFAULT 30,
    partial_refund_days INTEGER DEFAULT 7,
    deposit_percent INTEGER DEFAULT 30,
    working_days JSONB DEFAULT '[4, 5, 6]',
    open_time VARCHAR(10) DEFAULT '11:00',
    close_time VARCHAR(10) DEFAULT '03:00',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Seed Initial Settings
INSERT INTO public.business_settings (business_name, business_email, business_phone, currency, min_guests, max_guests)
VALUES ('Salle Des Fêtes Albatros', 'albatros.manouba@gmail.com', '+216 98 687 124', 'TND', 50, 400)
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) Policies
-- By default we want the server to manage everything. 
-- Since the server uses a service role key or anon key with backend logic, 
-- we can secure the tables to only be accessible by the authenticated service role or via the server.

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to business_settings
CREATE POLICY "Allow public read on business_settings"
ON public.business_settings FOR SELECT
USING (true);

-- Allow public read access to blocked_dates (for availability checking)
CREATE POLICY "Allow public read on blocked_dates"
ON public.blocked_dates FOR SELECT
USING (true);

-- Bookings should not be public. Only the service_role (server) can read/write.
CREATE POLICY "Allow service_role full access on bookings"
ON public.bookings FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Bookings can only be inserted or modified by the server (service_role).
-- The anonymous insert policy has been removed to prevent direct, unvalidated client writes.

-- 4. Table: admins
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    last_login TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only service_role can access admins
CREATE POLICY "Allow service_role full access on admins"
ON public.admins FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ====================================================================
-- Secure Availability View
-- ====================================================================
-- This view exposes only the dates of active bookings, preventing exposure
-- of customer names, emails, and phone numbers (GDPR protection).
CREATE OR REPLACE VIEW public.booking_availability AS
SELECT event_date FROM public.bookings WHERE status != 'cancelled';

GRANT SELECT ON public.booking_availability TO anon, authenticated, service_role;