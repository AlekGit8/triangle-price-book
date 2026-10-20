-- 0005_category_appliances_septic.sql
--
-- Removes the "Appliances" category (appliance purchases rarely involve
-- quotes) and adds "Septic Systems" (pumping, repairs, full replacements —
-- common high-ticket quote-shopped work in the Triangle).
--
-- Existing rows tagged "Appliances" are moved to "Handyman/Other", then the
-- reports.category CHECK constraint is rebuilt with the new set.

update reports set category = 'Handyman/Other' where category = 'Appliances';

alter table reports drop constraint if exists reports_category_check;

alter table reports add constraint reports_category_check
  check (category in (
    'HVAC','Plumbing','Electrical','Roofing',
    'Windows & Doors','Painting','Flooring','Landscaping','Fencing',
    'Tree Service','Septic Systems','Handyman/Other'
  ));
