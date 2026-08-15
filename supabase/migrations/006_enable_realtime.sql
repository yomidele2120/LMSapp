-- ============================================================================
-- Realtime configuration
-- Run after complete_database.sql. Supabase does not add tables to the
-- realtime publication by default — this is required for
-- components/layout/notification-bell.tsx's postgres_changes subscription
-- to receive live inserts.
-- ============================================================================

alter publication supabase_realtime add table notifications;
