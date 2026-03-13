-- ============================================================
-- Auditflow Phase 3 Migration
-- ============================================================
-- This migration adds: Team accounts, API keys, QuickBooks/Xero
-- integrations, white-label partner support, and partner referrals.
--
-- Prerequisites: Run schema.sql first (contains Phase 1 + Phase 2).
-- Execute this file in the Supabase SQL editor after Phase 1+2
-- schemas have been applied.
-- ============================================================


-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'team_starter'
    CHECK (subscription_tier IN ('team_starter', 'team_pro')),
  max_members INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Team invites table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team scan counts table (enforces hard caps per team billing period)
CREATE TABLE IF NOT EXISTS team_scan_counts (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  "limit" INTEGER NOT NULL,
  PRIMARY KEY (team_id, billing_period_start)
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Integrations table (QuickBooks / Xero)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL
    CHECK (provider IN ('quickbooks', 'xero')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  realm_id TEXT,   -- QuickBooks company ID
  tenant_id TEXT,  -- Xero organization ID
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- White-label configs table (partner branding)
CREATE TABLE IF NOT EXISTS white_label_configs (
  partner_user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1B2A4A',
  accent_color TEXT NOT NULL DEFAULT '#2A9D8F',
  custom_domain TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partner clients table (maps partners to their client users)
CREATE TABLE IF NOT EXISTS partner_clients (
  partner_id UUID NOT NULL REFERENCES auth.users(id),
  client_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (partner_id, client_user_id)
);

-- Partner referrals table (revenue tracking)
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id),
  client_user_id UUID NOT NULL REFERENCES auth.users(id),
  scan_id UUID REFERENCES scans(id),
  revenue_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  revenue_share_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================

-- Add team_id to users (nullable, only set for team members)
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Add partner_id to users (nullable, set when user is a partner's client)
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users(id);

-- Add team_id to scans (nullable, set for team-owned scans)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Drop the existing subscription_tier CHECK constraint on users and
-- recreate it to include the new Phase 3 tiers.
-- Supabase/Postgres names auto-generated CHECK constraints as
-- <table>_<column>_check, but we search for any matching constraint
-- to be safe.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'public.users'::regclass
    AND att.attname = 'subscription_tier'
    AND con.contype = 'c'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
  END IF;
END
$$;

ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'starter', 'pro', 'personal', 'team_starter', 'team_pro'));


-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash_active ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner_id ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_scans_team_id ON scans(team_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);


-- ============================================================
-- 4. ROW LEVEL SECURITY — ENABLE RLS
-- ============================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_scan_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- -----------------------------------------------------------
-- teams
-- -----------------------------------------------------------

-- Team members can view their team
CREATE POLICY "Team members can select their team" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team owner can update their team
CREATE POLICY "Team owner can update team" ON teams
  FOR UPDATE USING (owner_user_id = auth.uid());

-- Any authenticated user can create a team (they become the owner)
CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- Team owner can delete their team
CREATE POLICY "Team owner can delete team" ON teams
  FOR DELETE USING (owner_user_id = auth.uid());

-- -----------------------------------------------------------
-- team_members
-- -----------------------------------------------------------

-- Members of the same team can view each other
CREATE POLICY "Team members can select members of their team" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members AS tm WHERE tm.user_id = auth.uid()
    )
  );

-- Team owner or admin can add members
CREATE POLICY "Team owner or admin can insert members" ON team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members AS tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- Team owner or admin can remove members
CREATE POLICY "Team owner or admin can delete members" ON team_members
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members AS tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- Team owner or admin can update member roles
CREATE POLICY "Team owner or admin can update members" ON team_members
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members AS tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- -----------------------------------------------------------
-- team_invites
-- -----------------------------------------------------------

-- Team members can view invites for their team
CREATE POLICY "Team members can select invites for their team" ON team_invites
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team owner or admin can create invites
CREATE POLICY "Team owner or admin can insert invites" ON team_invites
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owner or admin can delete/revoke invites
CREATE POLICY "Team owner or admin can delete invites" ON team_invites
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow update for accepting invites (any authenticated user can accept
-- an invite addressed to them by setting accepted_at)
CREATE POLICY "Invited user can accept invite" ON team_invites
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- -----------------------------------------------------------
-- team_scan_counts
-- -----------------------------------------------------------

-- Team members can view their team's scan counts
CREATE POLICY "Team members can select their team scan counts" ON team_scan_counts
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- api_keys
-- -----------------------------------------------------------

-- Users can view their own API keys
CREATE POLICY "Users can select own api keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can insert own api keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys (e.g., deactivate)
CREATE POLICY "Users can update own api keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own api keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------
-- integrations
-- -----------------------------------------------------------

-- Users can view their own integrations
CREATE POLICY "Users can select own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own integrations
CREATE POLICY "Users can insert own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------
-- white_label_configs
-- -----------------------------------------------------------

-- Partner can view their own config
CREATE POLICY "Partner can select own white label config" ON white_label_configs
  FOR SELECT USING (auth.uid() = partner_user_id);

-- Partner can create their own config
CREATE POLICY "Partner can insert own white label config" ON white_label_configs
  FOR INSERT WITH CHECK (auth.uid() = partner_user_id);

-- Partner can update their own config
CREATE POLICY "Partner can update own white label config" ON white_label_configs
  FOR UPDATE USING (auth.uid() = partner_user_id);

-- Partner can delete their own config
CREATE POLICY "Partner can delete own white label config" ON white_label_configs
  FOR DELETE USING (auth.uid() = partner_user_id);

-- -----------------------------------------------------------
-- partner_clients
-- -----------------------------------------------------------

-- Partner can view their own clients
CREATE POLICY "Partner can select own clients" ON partner_clients
  FOR SELECT USING (auth.uid() = partner_id);

-- Partner can add clients
CREATE POLICY "Partner can insert own clients" ON partner_clients
  FOR INSERT WITH CHECK (auth.uid() = partner_id);

-- Partner can remove clients
CREATE POLICY "Partner can delete own clients" ON partner_clients
  FOR DELETE USING (auth.uid() = partner_id);

-- -----------------------------------------------------------
-- partner_referrals
-- -----------------------------------------------------------

-- Partner can view their own referrals
CREATE POLICY "Partner can select own referrals" ON partner_referrals
  FOR SELECT USING (auth.uid() = partner_id);

-- -----------------------------------------------------------
-- Update existing scans policy to allow team-based access
-- -----------------------------------------------------------

-- Team members can view scans that belong to their team
CREATE POLICY "Team members can read team scans" ON scans
  FOR SELECT USING (
    team_id IS NOT NULL
    AND team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- Team members can insert scans under their team
CREATE POLICY "Team members can insert team scans" ON scans
  FOR INSERT WITH CHECK (
    team_id IS NOT NULL
    AND team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );
