-- 0019_admin_aggregation.sql
--
-- Server-side aggregation for the admin analytics + sponsors tabs (Oct 27,
-- 2026 code review, P5). Both routes used to pull up to 50,000 raw rows
-- and aggregate in JavaScript — the heaviest queries on the site and the
-- likely source of the Oct 25 CPU-time (1102) errors (68 in 7 days, all
-- 1102). Now Postgres does the aggregation in one call each, and the
-- 1,000-row API max-rows cap can no longer silently truncate the results.
--
-- Buckets are computed in America/New_York (the site's audience), so a
-- view at 11 PM ET lands in the ET day, not the UTC day. The sponsor
-- flight report's daily rows stay UTC-keyed, matching the admin UI.
--
-- Called with the service-role key only (admin routes). The functions are
-- SECURITY INVOKER (default); the tables are service-role only, so no
-- RLS bypass is introduced.
--
-- admin_analytics(p_start, p_end, p_granularity) returns:
--   { totals: { sessions, human_sessions, bot_sessions, views,
--               human_views, bot_views },
--     session_stats: { sessions, avg_seconds, median_seconds },
--     buckets: [{ key, views, human, bots }],
--     pages: [{ path, views, total_seconds, avg_seconds }] }
-- A session is one session_id; its bot flag is true only when EVERY view
-- was a bot (bool_and), matching the old JS logic. Duration is the sum
-- of per-view durations, each clamped to 0–1800s. Bucket keys match the
-- old JS format: hour "YYYY-MM-DD HH:00", day/week "YYYY-MM-DD"
-- (week = Monday), month "YYYY-MM".
create or replace function public.admin_analytics(
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text
)
returns jsonb
language sql
stable
as $$
  with sessions as (
    select
      session_id,
      min(entered_at) as first_seen,
      bool_and(is_bot) as is_bot,
      sum(least(greatest(coalesce(duration_seconds, 0), 0), 1800)) as seconds
    from public.analytics_page_views
    where entered_at >= p_start and entered_at < p_end
    group by session_id
  ),
  view_buckets as (
    select
      case p_granularity
        when 'hour' then to_char(date_trunc('hour', entered_at at time zone 'America/New_York'), 'YYYY-MM-DD HH24:00')
        when 'day' then to_char(date_trunc('day', entered_at at time zone 'America/New_York'), 'YYYY-MM-DD')
        when 'week' then to_char(date_trunc('week', entered_at at time zone 'America/New_York'), 'YYYY-MM-DD')
        else to_char(date_trunc('month', entered_at at time zone 'America/New_York'), 'YYYY-MM')
      end as key,
      count(*) as views
    from public.analytics_page_views
    where entered_at >= p_start and entered_at < p_end
    group by 1
  ),
  session_buckets as (
    select
      case p_granularity
        when 'hour' then to_char(date_trunc('hour', first_seen at time zone 'America/New_York'), 'YYYY-MM-DD HH24:00')
        when 'day' then to_char(date_trunc('day', first_seen at time zone 'America/New_York'), 'YYYY-MM-DD')
        when 'week' then to_char(date_trunc('week', first_seen at time zone 'America/New_York'), 'YYYY-MM-DD')
        else to_char(date_trunc('month', first_seen at time zone 'America/New_York'), 'YYYY-MM')
      end as key,
      count(*) filter (where not is_bot) as human,
      count(*) filter (where is_bot) as bots
    from sessions
    group by 1
  ),
  buckets as (
    select
      coalesce(v.key, s.key) as key,
      coalesce(v.views, 0) as views,
      coalesce(s.human, 0) as human,
      coalesce(s.bots, 0) as bots
    from view_buckets v
    full outer join session_buckets s on v.key = s.key
  ),
  page_rows as (
    select
      path,
      count(*) as views,
      sum(least(greatest(coalesce(duration_seconds, 0), 0), 1800)) as total_seconds
    from public.analytics_page_views
    where entered_at >= p_start and entered_at < p_end and not is_bot
    group by path
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'sessions', (select count(*) from sessions),
      'human_sessions', (select count(*) from sessions where not is_bot),
      'bot_sessions', (select count(*) from sessions where is_bot),
      'views', (select count(*) from public.analytics_page_views where entered_at >= p_start and entered_at < p_end),
      'human_views', (select count(*) from public.analytics_page_views where entered_at >= p_start and entered_at < p_end and not is_bot),
      'bot_views', (select count(*) from public.analytics_page_views where entered_at >= p_start and entered_at < p_end and is_bot)
    ),
    'session_stats', (
      select jsonb_build_object(
        'sessions', count(*),
        'avg_seconds', coalesce(round(avg(seconds))::int, 0),
        'median_seconds', coalesce(percentile_cont(0.5) within group (order by seconds)::int, 0)
      )
      from sessions where not is_bot
    ),
    'buckets', (
      select coalesce(
        jsonb_agg(jsonb_build_object('key', key, 'views', views, 'human', human, 'bots', bots) order by key),
        '[]'::jsonb
      )
      from buckets
    ),
    'pages', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'path', path,
            'views', views,
            'total_seconds', total_seconds,
            'avg_seconds', case when views > 0 then total_seconds::float / views else 0 end
          )
          order by total_seconds desc
        ),
        '[]'::jsonb
      )
      from (select * from page_rows order by total_seconds desc limit 25) p
    )
  );
$$;

-- admin_sponsor_report(p_slug, p_start, p_end) returns one flight report:
--   { impressions: { total, human }, clicks: { total, human, bot },
--     daily: [{ date, human_views, total_views, human_clicks, total_clicks }],
--     top_referrers: [{ path, clicks }] }
-- Daily rows are UTC-calendar dates, matching the admin UI. Impressions
-- are site-wide page views in the range (the banner is site-wide).
create or replace function public.admin_sponsor_report(
  p_slug text,
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language sql
stable
as $$
  with click_days as (
    select
      to_char(clicked_at, 'YYYY-MM-DD') as d,
      count(*) as total_clicks,
      count(*) filter (where not is_bot) as human_clicks
    from public.sponsor_clicks
    where sponsor_slug = p_slug and clicked_at >= p_start and clicked_at < p_end
    group by 1
  ),
  view_days as (
    select
      to_char(entered_at, 'YYYY-MM-DD') as d,
      count(*) as total_views,
      count(*) filter (where not is_bot) as human_views
    from public.analytics_page_views
    where entered_at >= p_start and entered_at < p_end
    group by 1
  ),
  daily as (
    select
      coalesce(v.d, c.d) as d,
      coalesce(v.human_views, 0) as human_views,
      coalesce(v.total_views, 0) as total_views,
      coalesce(c.human_clicks, 0) as human_clicks,
      coalesce(c.total_clicks, 0) as total_clicks
    from view_days v
    full outer join click_days c on v.d = c.d
  ),
  referrers as (
    select coalesce(nullif(referrer_path, ''), '(direct / unknown)') as path, count(*) as clicks
    from public.sponsor_clicks
    where sponsor_slug = p_slug and clicked_at >= p_start and clicked_at < p_end
    group by 1
    order by clicks desc
    limit 10
  )
  select jsonb_build_object(
    'impressions', jsonb_build_object(
      'total', (select count(*) from public.analytics_page_views where entered_at >= p_start and entered_at < p_end),
      'human', (select count(*) from public.analytics_page_views where entered_at >= p_start and entered_at < p_end and not is_bot)
    ),
    'clicks', jsonb_build_object(
      'total', (select count(*) from public.sponsor_clicks where sponsor_slug = p_slug and clicked_at >= p_start and clicked_at < p_end),
      'human', (select count(*) from public.sponsor_clicks where sponsor_slug = p_slug and clicked_at >= p_start and clicked_at < p_end and not is_bot),
      'bot', (select count(*) from public.sponsor_clicks where sponsor_slug = p_slug and clicked_at >= p_start and clicked_at < p_end and is_bot)
    ),
    'daily', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', d,
            'human_views', human_views,
            'total_views', total_views,
            'human_clicks', human_clicks,
            'total_clicks', total_clicks
          )
          order by d
        ),
        '[]'::jsonb
      )
      from daily
    ),
    'top_referrers', (
      select coalesce(
        jsonb_agg(jsonb_build_object('path', path, 'clicks', clicks) order by clicks desc),
        '[]'::jsonb
      )
      from referrers
    )
  );
$$;

-- admin_sponsor_summary() returns one row per slug with all-time clicks:
--   [{ slug, total, human, bot, last_clicked }]
create or replace function public.admin_sponsor_summary()
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', sponsor_slug,
        'total', total,
        'human', human,
        'bot', bot,
        'last_clicked', last_clicked
      )
      order by sponsor_slug
    ),
    '[]'::jsonb
  )
  from (
    select
      sponsor_slug,
      count(*) as total,
      count(*) filter (where not is_bot) as human,
      count(*) filter (where is_bot) as bot,
      max(clicked_at) as last_clicked
    from public.sponsor_clicks
    group by sponsor_slug
  ) s;
$$;
