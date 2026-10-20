-- 0004_category_updates.sql
--
-- Renames the "Other" category to "Handyman/Other" and adds six new
-- categories: Windows & Doors, Painting, Flooring, Landscaping, Fencing,
-- Tree Service.
--
-- The reports.category CHECK constraint must list every allowed value, so it
-- is dropped and re-created with the full new set. Existing rows tagged
-- "Other" are migrated to "Handyman/Other" first.

update reports set category = 'Handyman/Other' where category = 'Other';

alter table reports drop constraint if exists reports_category_check;

alter table reports add constraint reports_category_check
  check (category in (
    'HVAC','Plumbing','Electrical','Roofing','Appliances',
    'Windows & Doors','Painting','Flooring','Landscaping','Fencing',
    'Tree Service','Handyman/Other'
  ));
