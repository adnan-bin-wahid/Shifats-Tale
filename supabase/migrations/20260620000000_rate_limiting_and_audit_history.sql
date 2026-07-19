-- Migration: Add rate limiting table and audit log metadata fields
-- File: supabase/migrations/20260620000000_rate_limiting_and_audit_history.sql

-- 1. Create Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);
-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No public policies exist for rate_limits. Only server-side admin client can access it.

-- 2. Add metadata column to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON public.rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_idx ON public.audit_logs(entity_type);
