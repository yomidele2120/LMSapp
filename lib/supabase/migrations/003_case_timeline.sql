-- ============================================================================
-- Case timeline
-- A chronological record of everything that happens on a case — filings,
-- hearings, orders, correspondence, and free-form notes — distinct from
-- `notes` (which are case-adjacent commentary, not dated events) and from
-- `court_dates` (which are scheduled, forward-looking events).
-- ============================================================================

create table case_timeline_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases (id) on delete cascade,
  event_type  text not null default 'note', -- filing | hearing | order | correspondence | milestone | note
  title       text not null,
  description text,
  event_date  timestamptz not null default now(),
  created_by  uuid references profiles (id),
  created_at  timestamptz not null default now()
);

create index idx_case_timeline_case on case_timeline_events (case_id, event_date desc);

alter table case_timeline_events enable row level security;

create policy case_timeline_staff on case_timeline_events for all
  using (
    exists (select 1 from cases k where k.id = case_id and k.firm_id = auth_firm_id())
    and auth_is_staff()
  );

create policy case_timeline_client_select on case_timeline_events for select
  using (
    exists (
      select 1 from cases k join clients c on c.id = k.client_id
      where k.id = case_timeline_events.case_id and c.portal_user_id = auth.uid()
    )
  );
