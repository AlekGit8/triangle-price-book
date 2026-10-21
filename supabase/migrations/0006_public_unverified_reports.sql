-- 0006_public_unverified_reports.sql
--
-- Manual (no-document) submissions now publish instantly as unverified
-- community reports. The public read policy previously exposed only
-- verified+moderated rows, which would hide those entries, so it is
-- widened: verified+moderated rows AND unverified rows are publicly
-- readable. Rejected rows stay hidden from everyone but the service role.

drop policy if exists "public_read_approved_reports" on public.reports;

create policy "public_read_approved_reports"
  on public.reports for select
  to anon, authenticated
  using (
    (verification_status = 'verified' and moderated_at is not null)
    or verification_status = 'unverified'
  );
