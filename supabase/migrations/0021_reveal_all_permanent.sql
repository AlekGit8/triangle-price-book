-- 0021_reveal_all_permanent.sql
--
-- Paid reveals, redesign (Oct 29, 2026): the day pass is gone. $4.99 now
-- buys a permanent one-time reveal of ALL verified listings (not a 24h
-- window), and cookies are gone entirely — the token link page IS the
-- list, generated live on each load. $1.99 still reveals one job.
--
-- No purchase rows exist yet (Stripe was never configured before this
-- change), so no data migration is needed: this only widens the type
-- check and drops the now-meaningless expiry column. If a 'day' row
-- somehow existed, the new check below would fail loudly rather than
-- silently converting a time-limited pass into a permanent one.

alter table reveal_purchases drop constraint if exists reveal_purchases_type_check;
alter table reveal_purchases add constraint reveal_purchases_type_check check (type in ('single', 'all'));
alter table reveal_purchases drop column if exists expires_at;
