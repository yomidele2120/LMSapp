-- ============================================================================
-- Dashboard reporting views
-- Run after complete_database.sql. Kept separate so the base schema migration
-- stays a clean, one-shot "create everything" script.
-- ============================================================================

create or replace view v_case_summary as
select
  c.id,
  c.firm_id,
  c.case_number,
  c.title,
  c.status,
  c.practice_area,
  cl.full_name as client_name,
  p.full_name as lead_lawyer_name,
  c.next_hearing_date,
  (select count(*) from tasks t where t.case_id = c.id and t.status <> 'done') as open_tasks,
  (select count(*) from documents d where d.case_id = c.id) as document_count
from cases c
left join clients cl on cl.id = c.client_id
left join profiles p on p.id = c.lead_lawyer_id;

-- RLS on the underlying tables already restricts what a view's caller can
-- see; views themselves don't carry policies, so security_invoker keeps
-- row-level checks evaluated as the querying user rather than the view owner.
alter view v_case_summary set (security_invoker = true);

create or replace view v_firm_billing_summary as
select
  firm_id,
  coalesce(sum(total_kobo) filter (where status <> 'void'), 0) as total_invoiced_kobo,
  coalesce(sum(amount_paid_kobo), 0) as total_collected_kobo,
  coalesce(sum(total_kobo - amount_paid_kobo) filter (where status in ('sent', 'partially_paid', 'overdue')), 0) as outstanding_kobo
from invoices
group by firm_id;

alter view v_firm_billing_summary set (security_invoker = true);
