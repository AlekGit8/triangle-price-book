-- 0023_verifications_extracted_business_name.sql
--
-- Adds the auto-extracted company/contractor name to verification rows
-- (Oct 30, 2026): when a document is uploaded and read, the extraction
-- records the company name it found on the document (or NULL when none
-- was identifiable) so the admin queue can show it as an editable
-- suggestion. This column is admin-only: the paid reveal reads
-- report_business_names, never this column, and verifications rows are
-- service-role only (no public read policy), so an extracted name here
-- can never leak to visitors before the admin confirms it.
--
-- No existing rows change: the new column is NULL for all old rows,
-- which the admin UI treats as "no company pulled" (blank field).

alter table verifications add column if not exists extracted_business_name text;

comment on column verifications.extracted_business_name is 'Company/contractor name auto-extracted from the submitted document. Admin suggestion only — the paid reveal reads report_business_names, never this column. Null when extraction found no name.';
