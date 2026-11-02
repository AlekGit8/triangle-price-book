-- 0027_add_remodeling_category.sql
--
-- Adds the "Remodeling" category (Nov 2, 2026): kitchen, bathroom, and
-- whole-home remodeling work, previously filed under Handyman/Other
-- or other trades.
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
    'Handyman/Other'
  ));
