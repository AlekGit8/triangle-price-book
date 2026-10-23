-- 0007_add_pools_category.sql
--
-- Adds the "Pools" category (installation, resurfacing, equipment, repairs —
-- common high-ticket quote-shopped work in the Triangle).
--
-- Rebuilds the reports.category CHECK constraint with the new set.

alter table reports drop constraint if exists reports_category_check;

alter table reports add constraint reports_category_check
  check (category in (
    'HVAC','Plumbing','Electrical','Roofing',
    'Windows & Doors','Painting','Flooring','Landscaping','Fencing',
    'Tree Service','Pools','Septic Systems','Handyman/Other'
  ));
