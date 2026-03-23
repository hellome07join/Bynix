-- =========================================
-- BYNIX TRADING PLATFORM - SUPABASE SETUP
-- Run this in Supabase SQL Editor
-- =========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    demo_balance DECIMAL(15,2) DEFAULT 10000.00,
    real_balance DECIMAL(15,2) DEFAULT 0.00,
    bonus_balance DECIMAL(15,2) DEFAULT 0.00,
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status TEXT DEFAULT 'none',
    kyc_data JSONB DEFAULT '{}',
    first_deposit_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    duration INTEGER NOT NULL,
    entry_price DECIMAL(20,8),
    exit_price DECIMAL(20,8),
    pnl DECIMAL(15,2),
    status TEXT DEFAULT 'active',
    account_type TEXT DEFAULT 'demo',
    payout_percentage DECIMAL(5,2) DEFAULT 92.00,
    used_bonus_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- 3. DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    bonus_amount DECIMAL(15,2) DEFAULT 0.00,
    total_credit DECIMAL(15,2) DEFAULT 0.00,
    bonus_percentage DECIMAL(5,2) DEFAULT 0.00,
    network TEXT,
    promo_code TEXT,
    pay_address TEXT,
    pay_amount DECIMAL(20,8),
    pay_currency TEXT,
    payment_id TEXT,
    status TEXT DEFAULT 'pending',
    is_first_deposit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    wallet_address TEXT NOT NULL,
    network TEXT,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CHART DATA TABLE
CREATE TABLE IF NOT EXISTS public.chart_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, timestamp)
);

-- 7. OTP CODES TABLE
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_payment_id ON public.deposits(payment_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_data_symbol ON public.chart_data(symbol);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- DISABLE RLS FOR SERVICE ROLE ACCESS (backend uses service role key)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR SERVICE ROLE (allows backend full access)
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.chart_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.otp_codes FOR ALL USING (true) WITH CHECK (true);

-- SUCCESS MESSAGE
SELECT 'Tables created successfully!' as status;
