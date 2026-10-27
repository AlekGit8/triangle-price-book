-- 0013_add_categories_garage_crawl_gutter_chimney.sql
--
-- Adds five categories (Oct 27, 2026): "Garage Doors" (installation,
-- openers, repairs), "Crawl Spaces" (encapsulation, moisture control,
-- repairs), "Gutter Guards" (installation), "Chimneys" (cleaning,
-- repairs, caps), and "Garage Floors" (epoxy/coatings, resurfacing).
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
    'Handyman/Other'
  ));
