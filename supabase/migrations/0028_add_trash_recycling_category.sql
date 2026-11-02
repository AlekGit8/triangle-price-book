-- 0028_add_trash_recycling_category.sql
--
-- Adds the "Trash/Recycling" category (Nov 2, 2026): trash and
-- recycling pickup, junk removal, and dumpster rental, previously
-- filed under Handyman/Other.
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
    'Cleaning','Nanny','Lawn Care',
    'Remodeling',
    'Trash/Recycling',
    'Handyman/Other'
  ));
