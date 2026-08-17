-- ============================================================================
-- LegalOS Nigeria — Complete Database Schema
-- Multi-tenant legal practice management platform
-- Target: Supabase (PostgreSQL 15+)
--
-- Run this once against a fresh Supabase project's SQL editor, or via:
--   supabase db push
--
-- Design notes:
--   - Every law firm is a "tenant" (firms table). Nearly every other table
--     carries firm_id and is isolated via Row Level Security so one firm can
--     never read another firm's data, even via a bug in application code.
--   - auth.users (Supabase Auth) is extended by a 1:1 "profiles" table which
--     carries firm_id + role. RLS policies read the caller's firm/role from
--     this table via SECURITY DEFINER helper functions (cheap, cached per
--     statement) rather than re-deriving it in every policy.
--   - Clients are a special case: a client user (role = 'client') should
--     only see their own client record and the cases/invoices attached to
--     it, never the whole firm. Policies below encode that distinction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy/text search
create extension if not exists "btree_gin";      -- combined indexes

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum (
  'super_admin',        -- LegalOS platform admin (not tied to one firm)
  'managing_partner',
  'senior_lawyer',
  'associate_lawyer',
  'paralegal',
  'secretary',
  'accountant',
  'client'
);

create type case_status as enum (
  'intake', 'active', 'on_hold', 'in_trial', 'settled', 'closed', 'archived'
);

create type task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type invoice_status as enum (
  'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'
);

create type payment_method as enum ('paystack', 'flutterwave', 'bank_transfer', 'cash', 'other');

create type document_category as enum (
  'pleading', 'contract', 'correspondence', 'court_filing', 'identification',
  'evidence', 'invoice', 'report', 'other'
);

create type evidence_type as enum (
  'image', 'audio', 'video', 'email', 'witness_statement', 'screenshot', 'report', 'document'
);

create type notification_channel as enum ('in_app', 'email', 'push');

create type ai_request_type as enum (
  'case_summary', 'contract_review', 'legal_research', 'transcription',
  'timeline_generation', 'action_item_extraction', 'smart_search', 'document_summary'
);

-- ----------------------------------------------------------------------------
-- Firms (tenants)
-- ----------------------------------------------------------------------------
create table firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  registration_number text,               -- CAC number, Nigeria
  address text,
  city text,
  state text,
  country text not null default 'Nigeria',
  phone text,
  email text,
  website text,
  logo_url text,
  subscription_tier text not null default 'trial',
  subscription_status text not null default 'active',
  trial_ends_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_firms_slug on firms (slug);

-- ----------------------------------------------------------------------------
-- Profiles (extends auth.users 1:1)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  firm_id uuid references firms (id) on delete cascade,
  role user_role not null default 'associate_lawyer',
  full_name text not null,
  phone text,
  avatar_url text,
  title text,                              -- e.g. "Senior Associate"
  bar_number text,                         -- Nigerian Bar / SCN enrolment number
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_client_no_firm_role check (
    role <> 'client' or firm_id is not null
  )
);

create index idx_profiles_firm on profiles (firm_id);
create index idx_profiles_role on profiles (firm_id, role);

-- Helper functions used inside RLS policies (SECURITY DEFINER = fast, no recursion)
create or replace function auth_firm_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select firm_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role <> 'client' from profiles where id = auth.uid()), false);
$$;

create or replace function auth_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('super_admin', 'managing_partner') from profiles where id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Clients
-- ----------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  portal_user_id uuid references profiles (id) on delete set null, -- linked client-role login, if any
  client_type text not null default 'individual', -- individual | company
  full_name text not null,
  company_name text,
  email text,
  phone text,
  address text,
  assigned_lawyer_id uuid references profiles (id) on delete set null,
  tags text[] not null default '{}',
  notes text,
  is_archived boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_firm on clients (firm_id);
create index idx_clients_search on clients using gin (
  (full_name || ' ' || coalesce(company_name, '') || ' ' || coalesce(email, '')) gin_trgm_ops
);

-- ----------------------------------------------------------------------------
-- Cases
-- ----------------------------------------------------------------------------
create table cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_number text not null,               -- firm-scoped docket number, e.g. "FHC/ABJ/CS/014/2026"
  title text not null,
  practice_area text not null,
  status case_status not null default 'intake',
  client_id uuid not null references clients (id) on delete restrict,
  lead_lawyer_id uuid references profiles (id) on delete set null,
  opposing_parties text,
  court_name text,
  court_location text,
  judge_name text,
  filing_date date,
  next_hearing_date timestamptz,
  description text,
  outcome_summary text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, case_number)
);

create index idx_cases_firm on cases (firm_id);
create index idx_cases_client on cases (client_id);
create index idx_cases_status on cases (firm_id, status);
create index idx_cases_search on cases using gin ((title || ' ' || case_number) gin_trgm_ops);

-- Many-to-many: lawyers/staff assigned to a case beyond the lead lawyer
create table case_assignments (
  case_id uuid not null references cases (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  assigned_role text not null default 'co_counsel', -- co_counsel | paralegal | secretary_support
  assigned_at timestamptz not null default now(),
  primary key (case_id, profile_id)
);

create index idx_case_assignments_profile on case_assignments (profile_id);

-- ----------------------------------------------------------------------------
-- Court dates
-- ----------------------------------------------------------------------------
create table court_dates (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid not null references cases (id) on delete cascade,
  event_type text not null default 'hearing', -- hearing | filing_deadline | meeting
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  reminder_minutes_before int not null default 1440,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index idx_court_dates_firm on court_dates (firm_id, starts_at);
create index idx_court_dates_case on court_dates (case_id);

-- ----------------------------------------------------------------------------
-- Tasks
-- ----------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assigned_to uuid references profiles (id) on delete set null,
  due_date timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_firm on tasks (firm_id, status);
create index idx_tasks_assignee on tasks (assigned_to, status);
create index idx_tasks_case on tasks (case_id);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_task_comments_task on task_comments (task_id);

-- ----------------------------------------------------------------------------
-- Documents (with version history)
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete cascade,
  client_id uuid references clients (id) on delete cascade,
  category document_category not null default 'other',
  title text not null,
  folder_path text not null default '/',
  storage_path text not null,             -- Supabase Storage object path (current version)
  mime_type text not null,
  size_bytes bigint not null default 0,
  ocr_text text,                          -- extracted text for search
  uploaded_by uuid references profiles (id),
  is_client_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_firm on documents (firm_id);
create index idx_documents_case on documents (case_id);
create index idx_documents_client on documents (client_id);
create index idx_documents_ocr on documents using gin (to_tsvector('english', coalesce(ocr_text, '')));

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  version_number int not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  uploaded_by uuid references profiles (id),
  change_note text,
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create table document_downloads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  downloaded_by uuid references profiles (id),
  downloaded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Evidence (linked to case timeline)
-- ----------------------------------------------------------------------------
create table evidence (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid not null references cases (id) on delete cascade,
  evidence_type evidence_type not null,
  title text not null,
  description text,
  storage_path text,
  occurred_at timestamptz,                -- when the underlying event happened (for timeline)
  source text,                            -- e.g. "Client submission", "Court exhibit A"
  chain_of_custody jsonb not null default '[]'::jsonb,
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index idx_evidence_case on evidence (case_id, occurred_at);
create index idx_evidence_firm on evidence (firm_id);
create index idx_evidence_search on evidence using gin ((title || ' ' || coalesce(description, '')) gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------------------
create table notes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete cascade,
  client_id uuid references clients (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  is_private boolean not null default false, -- private = author + admins only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notes_case on notes (case_id);
create index idx_notes_client on notes (client_id);

-- ----------------------------------------------------------------------------
-- Messaging
-- ----------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete set null,
  is_client_thread boolean not null default false,
  title text,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  attachment_document_id uuid references documents (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages (conversation_id, created_at);
create index idx_conversation_participants_profile on conversation_participants (profile_id);

-- ----------------------------------------------------------------------------
-- Time entries, invoices, payments
-- ----------------------------------------------------------------------------
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  description text not null,
  minutes int not null check (minutes > 0),
  hourly_rate_kobo bigint not null default 0, -- stored in kobo (NGN minor unit) to avoid float errors
  billable boolean not null default true,
  entry_date date not null default current_date,
  invoiced boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_time_entries_case on time_entries (case_id);
create index idx_time_entries_profile on time_entries (profile_id, entry_date);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete set null,
  client_id uuid not null references clients (id) on delete restrict,
  invoice_number text not null,
  status invoice_status not null default 'draft',
  currency text not null default 'NGN',
  subtotal_kobo bigint not null default 0,
  tax_kobo bigint not null default 0,
  total_kobo bigint not null default 0,
  amount_paid_kobo bigint not null default 0,
  due_date date,
  issued_at timestamptz,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, invoice_number)
);

create index idx_invoices_firm on invoices (firm_id, status);
create index idx_invoices_client on invoices (client_id);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  time_entry_id uuid references time_entries (id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price_kobo bigint not null default 0,
  amount_kobo bigint not null default 0,
  sort_order int not null default 0
);

create index idx_invoice_items_invoice on invoice_items (invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  invoice_id uuid not null references invoices (id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  method payment_method not null,
  provider_reference text,               -- Paystack/Flutterwave transaction ref
  status text not null default 'pending', -- pending | successful | failed | refunded
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payments_invoice on payments (invoice_id);
create index idx_payments_reference on payments (provider_reference);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  channel notification_channel not null default 'in_app',
  title text not null,
  body text,
  link_path text,                        -- in-app deep link, e.g. /cases/:id
  is_read boolean not null default false,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile on notifications (profile_id, is_read, created_at desc);

-- ----------------------------------------------------------------------------
-- Audit logs (append-only)
-- ----------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references firms (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  action text not null,                  -- e.g. "document.download", "case.status_changed"
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_firm on audit_logs (firm_id, created_at desc);
create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- AI requests (usage log + cache key for repeated queries)
-- ----------------------------------------------------------------------------
create table ai_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  requested_by uuid references profiles (id) on delete set null,
  case_id uuid references cases (id) on delete set null,
  request_type ai_request_type not null,
  provider text not null default 'openai',
  model text,
  input_summary text,
  output text,
  tokens_used int,
  status text not null default 'completed', -- pending | completed | failed
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_ai_requests_firm on ai_requests (firm_id, created_at desc);
create index idx_ai_requests_case on ai_requests (case_id);

-- ============================================================================
-- Triggers: updated_at maintenance
-- ============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'firms','profiles','clients','cases','tasks','documents','notes','invoices'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on %1$s
       for each row execute function set_updated_at()', t
    );
  end loop;
end $$;

-- Keep invoice totals consistent with paid amount / status
create or replace function recalc_invoice_status()
returns trigger language plpgsql as $$
begin
  update invoices i
  set amount_paid_kobo = coalesce((
        select sum(p.amount_kobo) from payments p
        where p.invoice_id = i.id and p.status = 'successful'
      ), 0),
      status = case
        when i.total_kobo <= coalesce((
          select sum(p.amount_kobo) from payments p
          where p.invoice_id = i.id and p.status = 'successful'
        ), 0) and i.total_kobo > 0 then 'paid'::invoice_status
        when coalesce((
          select sum(p.amount_kobo) from payments p
          where p.invoice_id = i.id and p.status = 'successful'
        ), 0) > 0 then 'partially_paid'::invoice_status
        else i.status
      end
  where i.id = coalesce(new.invoice_id, old.invoice_id);
  return null;
end;
$$;

create trigger trg_payments_recalc_invoice
after insert or update or delete on payments
for each row execute function recalc_invoice_status();

-- Generic audit trigger for sensitive tables (cases, documents, invoices, payments)
create or replace function write_audit_log()
returns trigger language plpgsql security definer as $$
declare
  fid uuid;
begin
  fid := coalesce(new.firm_id, old.firm_id);
  insert into audit_logs (firm_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    fid,
    auth.uid(),
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    jsonb_build_object('op', tg_op)
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['cases','documents','invoices','payments']
  loop
    execute format(
      'create trigger trg_%1$s_audit after insert or update or delete on %1$s
       for each row execute function write_audit_log()', t
    );
  end loop;
end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table firms enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table cases enable row level security;
alter table case_assignments enable row level security;
alter table court_dates enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table document_downloads enable row level security;
alter table evidence enable row level security;
alter table notes enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table time_entries enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table ai_requests enable row level security;

-- Firms: a user can only see their own firm; super_admin sees all.
-- The first workspace is created during signup before the user has a profile row,
-- so we allow the initial insert to succeed and then lock access down afterwards.
create policy firms_insert on firms for insert
  with check (true);
create policy firms_select on firms for select
  using (id = auth_firm_id() or auth_role() = 'super_admin');
create policy firms_update on firms for update
  using (auth_is_admin() and id = auth_firm_id());

-- Profiles: visible to everyone in the same firm; a user can update themself
create policy profiles_select on profiles for select
  using (firm_id = auth_firm_id() or id = auth.uid());
create policy profiles_update_self on profiles for update
  using (id = auth.uid());
create policy profiles_admin_manage on profiles for all
  using (auth_is_admin() and firm_id = auth_firm_id());

-- Clients: staff see all firm clients; a client-role user sees only themself
create policy clients_staff_select on clients for select
  using (auth_is_staff() and firm_id = auth_firm_id());
create policy clients_self_select on clients for select
  using (portal_user_id = auth.uid());
create policy clients_staff_write on clients for insert
  with check (auth_is_staff() and firm_id = auth_firm_id());
create policy clients_staff_update on clients for update
  using (auth_is_staff() and firm_id = auth_firm_id());

-- Cases: staff see firm cases; clients see only their own cases
create policy cases_staff_select on cases for select
  using (auth_is_staff() and firm_id = auth_firm_id());
create policy cases_client_select on cases for select
  using (
    exists (
      select 1 from clients c
      where c.id = cases.client_id and c.portal_user_id = auth.uid()
    )
  );
create policy cases_staff_write on cases for insert
  with check (auth_is_staff() and firm_id = auth_firm_id());
create policy cases_staff_update on cases for update
  using (auth_is_staff() and firm_id = auth_firm_id());

create policy case_assignments_staff on case_assignments for all
  using (
    exists (select 1 from cases k where k.id = case_id and k.firm_id = auth_firm_id())
    and auth_is_staff()
  );

create policy court_dates_staff on court_dates for all
  using (auth_is_staff() and firm_id = auth_firm_id());
create policy court_dates_client_select on court_dates for select
  using (
    exists (
      select 1 from cases k join clients c on c.id = k.client_id
      where k.id = court_dates.case_id and c.portal_user_id = auth.uid()
    )
  );

create policy tasks_staff on tasks for all
  using (auth_is_staff() and firm_id = auth_firm_id());

create policy task_comments_staff on task_comments for all
  using (
    exists (select 1 from tasks t where t.id = task_id and t.firm_id = auth_firm_id())
    and auth_is_staff()
  );

-- Documents: staff see firm docs; clients only see docs flagged client-visible
-- and attached to their own case/client record.
create policy documents_staff_select on documents for select
  using (auth_is_staff() and firm_id = auth_firm_id());
create policy documents_client_select on documents for select
  using (
    is_client_visible and (
      exists (select 1 from clients c where c.id = documents.client_id and c.portal_user_id = auth.uid())
      or exists (
        select 1 from cases k join clients c on c.id = k.client_id
        where k.id = documents.case_id and c.portal_user_id = auth.uid()
      )
    )
  );
create policy documents_staff_write on documents for insert
  with check (auth_is_staff() and firm_id = auth_firm_id());
create policy documents_staff_update on documents for update
  using (auth_is_staff() and firm_id = auth_firm_id());

create policy document_versions_staff on document_versions for all
  using (
    exists (select 1 from documents d where d.id = document_id and d.firm_id = auth_firm_id())
    and auth_is_staff()
  );
create policy document_downloads_staff on document_downloads for all
  using (
    exists (select 1 from documents d where d.id = document_id and d.firm_id = auth_firm_id())
  );

create policy evidence_staff on evidence for all
  using (auth_is_staff() and firm_id = auth_firm_id());

create policy notes_staff_select on notes for select
  using (
    auth_is_staff() and firm_id = auth_firm_id()
    and (not is_private or author_id = auth.uid() or auth_is_admin())
  );
create policy notes_staff_write on notes for insert
  with check (auth_is_staff() and firm_id = auth_firm_id());
create policy notes_author_update on notes for update
  using (author_id = auth.uid());

-- Messaging: only conversation participants can read/write
create policy conversations_participant on conversations for select
  using (
    exists (
      select 1 from conversation_participants p
      where p.conversation_id = conversations.id and p.profile_id = auth.uid()
    )
  );
create policy conversation_participants_self on conversation_participants for select
  using (profile_id = auth.uid());
create policy messages_participant_select on messages for select
  using (
    exists (
      select 1 from conversation_participants p
      where p.conversation_id = messages.conversation_id and p.profile_id = auth.uid()
    )
  );
create policy messages_participant_write on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversation_participants p
      where p.conversation_id = messages.conversation_id and p.profile_id = auth.uid()
    )
  );

create policy time_entries_staff on time_entries for all
  using (auth_is_staff() and firm_id = auth_firm_id());

create policy invoices_staff on invoices for all
  using (auth_is_staff() and firm_id = auth_firm_id());
create policy invoices_client_select on invoices for select
  using (
    exists (select 1 from clients c where c.id = invoices.client_id and c.portal_user_id = auth.uid())
  );

create policy invoice_items_staff on invoice_items for all
  using (
    exists (select 1 from invoices i where i.id = invoice_id and i.firm_id = auth_firm_id())
    and auth_is_staff()
  );
create policy invoice_items_client_select on invoice_items for select
  using (
    exists (
      select 1 from invoices i join clients c on c.id = i.client_id
      where i.id = invoice_items.invoice_id and c.portal_user_id = auth.uid()
    )
  );

create policy payments_staff on payments for all
  using (auth_is_staff() and firm_id = auth_firm_id());
create policy payments_client_select on payments for select
  using (
    exists (
      select 1 from invoices i join clients c on c.id = i.client_id
      where i.id = payments.invoice_id and c.portal_user_id = auth.uid()
    )
  );

create policy notifications_self on notifications for select
  using (profile_id = auth.uid());
create policy notifications_self_update on notifications for update
  using (profile_id = auth.uid());
create policy notifications_system_insert on notifications for insert
  with check (firm_id = auth_firm_id());

create policy audit_logs_admin_select on audit_logs for select
  using (auth_is_admin() and firm_id = auth_firm_id());

create policy ai_requests_staff on ai_requests for all
  using (auth_is_staff() and firm_id = auth_firm_id());

-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('evidence', 'evidence', false),
  ('avatars', 'avatars', true),
  ('firm-logos', 'firm-logos', true)
on conflict (id) do nothing;

-- Storage RLS: object path convention is "<firm_id>/<...>" so we can scope by
-- prefix without a lookup table.
create policy storage_documents_staff on storage.objects for all
  using (
    bucket_id = 'documents'
    and auth_is_staff()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

create policy storage_evidence_staff on storage.objects for all
  using (
    bucket_id = 'evidence'
    and auth_is_staff()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

create policy storage_avatars_owner on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy storage_avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');

create policy storage_firm_logos_admin on storage.objects for all
  using (
    bucket_id = 'firm-logos'
    and auth_is_admin()
    and (storage.foldername(name))[1] = auth_firm_id()::text
  );

create policy storage_firm_logos_public_read on storage.objects for select
  using (bucket_id = 'firm-logos');

-- ============================================================================
-- New-user bootstrap: create a profile row automatically after signup.
-- firm_id / role are set from auth.users.raw_user_meta_data, populated by the
-- application at signup/invite time (see lib/supabase/auth.ts).
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, firm_id, role, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'firm_id', '')::uuid,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'associate_lawyer'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================================================
-- End of complete_database.sql
-- ============================================================================
