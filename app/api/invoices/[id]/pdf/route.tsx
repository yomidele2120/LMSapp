import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";

/**
 * Deliberately not wrapped in requireProfile()/requireClientPortalUser() —
 * both staff and a client-portal user need to hit this same URL, and RLS
 * (invoices_staff / invoices_client_select in complete_database.sql) is
 * already the real access boundary. A signed-in user with no access to this
 * invoice simply gets a null read back from Supabase, which we treat as 404
 * rather than leaking whether the id exists.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, status, currency, subtotal_kobo, tax_kobo, total_kobo, amount_paid_kobo, due_date, issued_at, notes, firm_id, client_id"
    )
    .eq("id", id)
    .single();

  if (!invoice) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [{ data: firm }, { data: client }, { data: items }] = await Promise.all([
    supabase
      .from("firms")
      .select("name, address, city, state, phone, email")
      .eq("id", invoice.firm_id)
      .single(),
    supabase
      .from("clients")
      .select("full_name, company_name, email, address")
      .eq("id", invoice.client_id)
      .single(),
    supabase
      .from("invoice_items")
      .select("description, quantity, unit_price_kobo, amount_kobo")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!firm || !client) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await renderToBuffer(
    <InvoicePdf firm={firm} invoice={invoice} client={client} items={items ?? []} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoice_number.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
