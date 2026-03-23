#!/usr/bin/env python3
"""
Supabase Database Setup Script
Creates all required tables for the Bynix trading platform
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Create Supabase client with service role key (admin access)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# SQL statements to create tables
SQL_STATEMENTS = """
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
    amount DECIMAL(15,2) NOT NULL,
    duration INTEGER NOT NULL,
    entry_price DECIMAL(20,8),
    exit_price DECIMAL(20,8),
    pnl DECIMAL(15,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    account_type TEXT DEFAULT 'demo' CHECK (account_type IN ('demo', 'real')),
    payout_percentage DECIMAL(5,2) DEFAULT 92.00,
    used_bonus_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at);

-- Deposits table
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
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'confirming', 'completed', 'failed', 'expired')),
    is_first_deposit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_payment_id ON public.deposits(payment_id);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    wallet_address TEXT NOT NULL,
    network TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'trade', 'deposit', 'withdrawal', 'system', 'promo')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Chart data table
CREATE TABLE IF NOT EXISTS public.chart_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_chart_data_symbol ON public.chart_data(symbol);
CREATE INDEX IF NOT EXISTS idx_chart_data_timestamp ON public.chart_data(timestamp);

-- OTP table for email verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY IF NOT EXISTS "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY IF NOT EXISTS "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create policies for trades table
CREATE POLICY IF NOT EXISTS "Users can view own trades" ON public.trades
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can create own trades" ON public.trades
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create policies for deposits table
CREATE POLICY IF NOT EXISTS "Users can view own deposits" ON public.deposits
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create policies for withdrawals table
CREATE POLICY IF NOT EXISTS "Users can view own withdrawals" ON public.withdrawals
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create policies for notifications table
CREATE POLICY IF NOT EXISTS "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Service role can do everything (for backend)
CREATE POLICY IF NOT EXISTS "Service role full access users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access trades" ON public.trades
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access deposits" ON public.deposits
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access withdrawals" ON public.withdrawals
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access notifications" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Public read chart data" ON public.chart_data
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Service role full access chart_data" ON public.chart_data
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access otp" ON public.otp_codes
    FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
"""

def setup_database():
    """Execute SQL to set up database tables"""
    print("🚀 Setting up Supabase database tables...")
    
    try:
        # Execute the SQL using Supabase's RPC
        # Note: For complex SQL, you should run this directly in Supabase SQL Editor
        print("📝 SQL statements generated. Please run these in Supabase SQL Editor:")
        print("-" * 60)
        print(SQL_STATEMENTS)
        print("-" * 60)
        print("\n✅ Copy the SQL above and paste it in your Supabase Dashboard:")
        print("   1. Go to https://supabase.com/dashboard")
        print("   2. Select your project")
        print("   3. Go to SQL Editor")
        print("   4. Paste the SQL and click 'Run'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    setup_database()
