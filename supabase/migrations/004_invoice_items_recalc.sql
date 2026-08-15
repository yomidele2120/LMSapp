-- ============================================================================
-- Keep invoice subtotal/total in sync with their line items automatically,
-- so an invoice_items row added or edited outside the app (SQL console, a
-- future admin tool) can never leave subtotal_kobo/total_kobo stale.
-- Run after 002_dashboard_views.sql and 003_case_timeline.sql.
-- ============================================================================

create or replace function recalc_invoice_line_totals()
returns trigger language plpgsql as $$
declare
  v_invoice_id uuid;
  v_subtotal bigint;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(amount_kobo), 0) into v_subtotal
  from invoice_items where invoice_id = v_invoice_id;

  update invoices
  set subtotal_kobo = v_subtotal,
      total_kobo = v_subtotal + tax_kobo
  where id = v_invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_invoice_items_recalc
after insert or update or delete on invoice_items
for each row execute function recalc_invoice_line_totals();
