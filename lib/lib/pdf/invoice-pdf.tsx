import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// react-pdf renders its own font glyphs rather than using system/browser
// fonts, and doesn't ship Fraunces — Times-Roman is the closest built-in
// serif to the Chambers display type without a network font fetch at
// render time (this route runs on every download request).
const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1c2321",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  firmName: {
    fontFamily: "Times-Roman",
    fontSize: 20,
    color: "#1c2321",
  },
  firmMeta: {
    fontSize: 9,
    color: "#5c6b66",
    marginTop: 4,
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontFamily: "Times-Roman",
    fontSize: 16,
    textAlign: "right",
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#5c6b66",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 1.5,
  },
  billTo: {
    marginBottom: 28,
  },
  label: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#96784a",
    marginBottom: 4,
  },
  billToName: {
    fontSize: 11,
    fontFamily: "Times-Roman",
  },
  table: {
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1c2321",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2ddd3",
    paddingVertical: 7,
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnitPrice: { flex: 1.5, textAlign: "right" },
  colAmount: { flex: 1.5, textAlign: "right" },
  headerText: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#5c6b66",
  },
  totals: {
    alignSelf: "flex-end",
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: { color: "#5c6b66" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1c2321",
  },
  grandTotalLabel: { fontFamily: "Times-Roman", fontSize: 12 },
  grandTotalValue: { fontFamily: "Times-Roman", fontSize: 12 },
  notes: {
    marginTop: 32,
    fontSize: 9,
    color: "#5c6b66",
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#96784a",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2ddd3",
    paddingTop: 10,
  },
  statusStamp: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#8a3324",
    marginTop: 6,
  },
});

function formatKobo(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export interface InvoicePdfProps {
  firm: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
  };
  invoice: {
    invoice_number: string;
    status: string;
    currency: string;
    subtotal_kobo: number;
    tax_kobo: number;
    total_kobo: number;
    amount_paid_kobo: number;
    due_date: string | null;
    issued_at: string | null;
    notes: string | null;
  };
  client: {
    full_name: string;
    company_name: string | null;
    email: string | null;
    address: string | null;
  };
  items: {
    description: string;
    quantity: number;
    unit_price_kobo: number;
    amount_kobo: number;
  }[];
}

export function InvoicePdf({ firm, invoice, client, items }: InvoicePdfProps) {
  const balanceDue = invoice.total_kobo - invoice.amount_paid_kobo;
  const firmLocation = [firm.city, firm.state].filter(Boolean).join(", ");

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={firm.name}
      subject={`Invoice for ${client.full_name}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.firmName}>{firm.name}</Text>
            <Text style={styles.firmMeta}>
              {firm.address ? `${firm.address}\n` : ""}
              {firmLocation}
              {firm.phone ? `\n${firm.phone}` : ""}
              {firm.email ? `\n${firm.email}` : ""}
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>
              {invoice.invoice_number}
              {"\n"}Issued {formatDate(invoice.issued_at)}
              {"\n"}Due {formatDate(invoice.due_date)}
            </Text>
            {invoice.status === "paid" && <Text style={styles.statusStamp}>Paid in full</Text>}
            {invoice.status === "overdue" && <Text style={styles.statusStamp}>Overdue</Text>}
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.label}>Bill to</Text>
          <Text style={styles.billToName}>
            {client.company_name || client.full_name}
          </Text>
          {client.company_name && <Text style={styles.firmMeta}>Attn: {client.full_name}</Text>}
          {client.address && <Text style={styles.firmMeta}>{client.address}</Text>}
          {client.email && <Text style={styles.firmMeta}>{client.email}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.headerText]}>Description</Text>
            <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
            <Text style={[styles.colUnitPrice, styles.headerText]}>Unit price</Text>
            <Text style={[styles.colAmount, styles.headerText]}>Amount</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>{formatKobo(item.unit_price_kobo)}</Text>
              <Text style={styles.colAmount}>{formatKobo(item.amount_kobo)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{formatKobo(invoice.subtotal_kobo)}</Text>
          </View>
          {invoice.tax_kobo > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text>{formatKobo(invoice.tax_kobo)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatKobo(invoice.total_kobo)}</Text>
          </View>
          {invoice.amount_paid_kobo > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Paid</Text>
                <Text>{formatKobo(invoice.amount_paid_kobo)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Balance due</Text>
                <Text>{formatKobo(balanceDue)}</Text>
              </View>
            </>
          )}
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          {firm.name} · Generated by LegalOS Nigeria
        </Text>
      </Page>
    </Document>
  );
}
