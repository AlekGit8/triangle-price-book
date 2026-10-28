-- 0015_add_concrete_category.sql
--
-- Adds one category (Oct 27, 2026): "Concrete" (driveways, patios,
-- foundations, slabs, repairs).
--
-- Rebuilds the reports.category CHECK constraint with the new set.
-- No existing rows change: the new value is only added to the list.

alter table reports drop constraint if exists reports_category_check;

alter table reports add constraint reports_category_check
  check (category in (
    'HVAC','Plumbing','Electrical','Roofing',
    'Windows & Doors','Painting','Flooring','Landscaping','Fencing',
    'Tree Service','Pools','Septic Systems',
    'Garage Doors','Crawl Spaces','Gutter Guards','Chimneys','Garage Floors',
    'Concrete',
    'Handyman/Other'
  ));
