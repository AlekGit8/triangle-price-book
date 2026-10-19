-- 0002_remove_business_names.sql
--
-- Product decision (Oct 2026): the site no longer tracks business names at
-- all. No rankings, no business profiles, no per-business aggregates.
-- Individual entries were already anonymous; now nothing business-related
-- is collected or stored, period.
--
-- This migration:
--   1. Drops the per-business aggregate view (business_report_counts).
--   2. Drops the private business_id column from reports.
--   3. Drops the businesses table (including the seed rows).
--
-- Run in the Supabase SQL Editor after deploying the code changes.

-- 1. Drop the view that powered the (now removed) rankings page.
drop view if exists business_report_counts;

-- 2. Drop the private business attribution column from reports.
alter table reports drop column if exists business_id;

-- 3. Drop the businesses table entirely.
drop table if exists businesses;
