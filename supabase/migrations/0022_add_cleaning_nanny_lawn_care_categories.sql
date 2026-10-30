-- 0022_add_cleaning_nanny_lawn_care_categories.sql
--
-- Adds three categories (Oct 30, 2026): "Cleaning", "Nanny",
-- "Lawn Care".
--
-- Rebuilds the reports.category CHECK constraint with the new set.
-- No existing rows change: the new values are only added to the list.

alter table reports drop constraint if exists reports_category_check;

alter table reports add constraint reports_category_check
  check (category in (
    'HVAC','Plumbing','Electrical','Roofing',
    'Windows & Doors','Painting','Flooring','Landscaping','Fencing',
    'Tree Service','Pools','Septic Systems',
    'Garage Doors','Crawl Spaces','Gutter Guards','Chimneys','Garage Floors',
    'Concrete',
    'Cleaning','Nanny','Lawn Care',
    'Handyman/Other'
  ));
