-- 0003_fix_security_definer.sql
--
-- Fixes the CRITICAL Security Advisor finding: the service_aggregates view
-- was defined with the SECURITY DEFINER property, meaning it executed with
-- the view owner's permissions and bypassed RLS on the reports table.
--
-- With security_invoker = true, the view respects the querying user's RLS
-- policies instead. Results are unchanged for public users: the
-- public_read_approved_reports policy exposes exactly the verified +
-- moderated rows this view aggregates, and the service role bypasses RLS
-- either way.
--
-- Also adds the missing index on verifications.report_id (Performance
-- Advisor info-level suggestion).

alter view public.service_aggregates set (security_invoker = true);

create index if not exists verifications_report_id_idx
  on public.verifications (report_id);
