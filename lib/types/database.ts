// Hand-authored to match supabase/migrations/complete_database.sql.
// Once the project is linked to a live Supabase instance, regenerate with:
//   npm run db:types
// and this file becomes the source of truth going forward.

export type UserRole =
  | "super_admin"
  | "managing_partner"
  | "senior_lawyer"
  | "associate_lawyer"
  | "paralegal"
  | "secretary"
  | "accountant"
  | "client";

export type CaseStatus =
  | "intake"
  | "active"
  | "on_hold"
  | "in_trial"
  | "settled"
  | "closed"
  | "archived";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
export type PaymentMethod = "paystack" | "flutterwave" | "bank_transfer" | "cash" | "other";
export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";
export type DocumentCategory =
  | "pleading"
  | "contract"
  | "correspondence"
  | "court_filing"
  | "identification"
  | "evidence"
  | "invoice"
  | "report"
  | "other";
export type EvidenceType =
  | "image"
  | "audio"
  | "video"
  | "email"
  | "witness_statement"
  | "screenshot"
  | "report"
  | "document";
export type NotificationChannel = "in_app" | "email" | "push";
export type AiRequestType =
  | "case_summary"
  | "contract_review"
  | "legal_research"
  | "transcription"
  | "timeline_generation"
  | "action_item_extraction"
  | "smart_search"
  | "document_summary";

// --- Per-table row/insert/update shapes -----------------------------------
// Named separately (rather than indexed off `Database` itself) so Update
// types can derive from Insert without creating a circular type reference.

interface FirmRow {
  id: string;
  name: string;
  slug: string;
  registration_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
interface FirmInsert {
  id?: string;
  name: string;
  slug: string;
  registration_number?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
}
type FirmUpdate = Partial<FirmInsert>;

interface ProfileRow {
  id: string;
  firm_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  title: string | null;
  bar_number: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}
interface ProfileInsert {
  id: string;
  firm_id?: string | null;
  role?: UserRole;
  full_name: string;
  phone?: string | null;
  title?: string | null;
  bar_number?: string | null;
}
type ProfileUpdate = Partial<ProfileInsert>;

interface ClientRow {
  id: string;
  firm_id: string;
  portal_user_id: string | null;
  client_type: "individual" | "company";
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  assigned_lawyer_id: string | null;
  tags: string[];
  notes: string | null;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface ClientInsert {
  id?: string;
  firm_id: string;
  client_type?: "individual" | "company";
  full_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  assigned_lawyer_id?: string | null;
  tags?: string[];
  notes?: string | null;
  created_by?: string | null;
}
type ClientUpdate = Partial<ClientInsert>;

interface CaseRow {
  id: string;
  firm_id: string;
  case_number: string;
  title: string;
  practice_area: string;
  status: CaseStatus;
  client_id: string;
  lead_lawyer_id: string | null;
  opposing_parties: string | null;
  court_name: string | null;
  court_location: string | null;
  judge_name: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  description: string | null;
  outcome_summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface CaseInsert {
  id?: string;
  firm_id: string;
  case_number: string;
  title: string;
  practice_area: string;
  status?: CaseStatus;
  client_id: string;
  lead_lawyer_id?: string | null;
  opposing_parties?: string | null;
  court_name?: string | null;
  court_location?: string | null;
  filing_date?: string | null;
  next_hearing_date?: string | null;
  description?: string | null;
  created_by?: string | null;
}
type CaseUpdate = Partial<CaseInsert>;

interface CaseAssignmentRow {
  case_id: string;
  profile_id: string;
  assigned_role: string;
  assigned_at: string;
}
interface CaseAssignmentInsert {
  case_id: string;
  profile_id: string;
  assigned_role?: string;
}
type CaseAssignmentUpdate = Partial<CaseAssignmentInsert>;

interface TaskRow {
  id: string;
  firm_id: string;
  case_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface TaskInsert {
  id?: string;
  firm_id: string;
  case_id?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  created_by?: string | null;
}
type TaskUpdate = Partial<TaskInsert> & { completed_at?: string | null };

interface CourtDateRow {
  id: string;
  firm_id: string;
  case_id: string;
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  reminder_minutes_before: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
interface CourtDateInsert {
  id?: string;
  firm_id: string;
  case_id: string;
  event_type?: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
  created_by?: string | null;
}
type CourtDateUpdate = Partial<CourtDateInsert>;

interface DocumentRow {
  id: string;
  firm_id: string;
  case_id: string | null;
  client_id: string | null;
  category: DocumentCategory;
  title: string;
  folder_path: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  ocr_text: string | null;
  uploaded_by: string | null;
  is_client_visible: boolean;
  created_at: string;
  updated_at: string;
}
interface DocumentInsert {
  id?: string;
  firm_id: string;
  case_id?: string | null;
  client_id?: string | null;
  category?: DocumentCategory;
  title: string;
  folder_path?: string;
  storage_path: string;
  mime_type: string;
  size_bytes?: number;
  is_client_visible?: boolean;
  uploaded_by?: string | null;
}
type DocumentUpdate = Partial<DocumentInsert>;

interface EvidenceRow {
  id: string;
  firm_id: string;
  case_id: string;
  evidence_type: EvidenceType;
  title: string;
  description: string | null;
  storage_path: string | null;
  occurred_at: string | null;
  source: string | null;
  chain_of_custody: unknown[];
  uploaded_by: string | null;
  created_at: string;
}
interface EvidenceInsert {
  id?: string;
  firm_id: string;
  case_id: string;
  evidence_type: EvidenceType;
  title: string;
  description?: string | null;
  storage_path?: string | null;
  occurred_at?: string | null;
  source?: string | null;
  uploaded_by?: string | null;
}
type EvidenceUpdate = Partial<EvidenceInsert>;

interface NoteRow {
  id: string;
  firm_id: string;
  case_id: string | null;
  client_id: string | null;
  author_id: string;
  body: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}
interface NoteInsert {
  id?: string;
  firm_id: string;
  case_id?: string | null;
  client_id?: string | null;
  author_id: string;
  body: string;
  is_private?: boolean;
}
type NoteUpdate = Partial<NoteInsert>;

interface CaseTimelineEventRow {
  id: string;
  case_id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_by: string | null;
  created_at: string;
}
interface CaseTimelineEventInsert {
  id?: string;
  case_id: string;
  event_type?: string;
  title: string;
  description?: string | null;
  event_date?: string;
  created_by?: string | null;
}
type CaseTimelineEventUpdate = Partial<CaseTimelineEventInsert>;

interface TimeEntryRow {
  id: string;
  firm_id: string;
  case_id: string | null;
  profile_id: string;
  description: string;
  minutes: number;
  hourly_rate_kobo: number;
  billable: boolean;
  entry_date: string;
  invoiced: boolean;
  created_at: string;
}
interface TimeEntryInsert {
  id?: string;
  firm_id: string;
  case_id?: string | null;
  profile_id: string;
  description: string;
  minutes: number;
  hourly_rate_kobo?: number;
  billable?: boolean;
  entry_date?: string;
}
type TimeEntryUpdate = Partial<TimeEntryInsert> & { invoiced?: boolean };

interface InvoiceRow {
  id: string;
  firm_id: string;
  case_id: string | null;
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  currency: string;
  subtotal_kobo: number;
  tax_kobo: number;
  total_kobo: number;
  amount_paid_kobo: number;
  due_date: string | null;
  issued_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface InvoiceInsert {
  id?: string;
  firm_id: string;
  case_id?: string | null;
  client_id: string;
  invoice_number: string;
  status?: InvoiceStatus;
  due_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
}
type InvoiceUpdate = Partial<InvoiceInsert>;

interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  time_entry_id: string | null;
  description: string;
  quantity: number;
  unit_price_kobo: number;
  amount_kobo: number;
  sort_order: number;
}
interface InvoiceItemInsert {
  id?: string;
  invoice_id: string;
  time_entry_id?: string | null;
  description: string;
  quantity?: number;
  unit_price_kobo?: number;
  amount_kobo?: number;
  sort_order?: number;
}
type InvoiceItemUpdate = Partial<InvoiceItemInsert>;

interface PaymentRow {
  id: string;
  firm_id: string;
  invoice_id: string;
  amount_kobo: number;
  method: PaymentMethod;
  provider_reference: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}
interface PaymentInsert {
  id?: string;
  firm_id: string;
  invoice_id: string;
  amount_kobo: number;
  method: PaymentMethod;
  provider_reference?: string | null;
  status?: PaymentStatus;
  paid_at?: string | null;
}
type PaymentUpdate = Partial<PaymentInsert>;

interface NotificationRow {
  id: string;
  firm_id: string;
  profile_id: string;
  channel: NotificationChannel;
  title: string;
  body: string | null;
  link_path: string | null;
  is_read: boolean;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}
interface NotificationInsert {
  id?: string;
  firm_id: string;
  profile_id: string;
  channel?: NotificationChannel;
  title: string;
  body?: string | null;
  link_path?: string | null;
}
type NotificationUpdate = Partial<NotificationInsert> & { is_read?: boolean };

interface AiRequestRow {
  id: string;
  firm_id: string;
  requested_by: string | null;
  case_id: string | null;
  request_type: AiRequestType;
  provider: string;
  model: string | null;
  input_summary: string | null;
  output: string | null;
  tokens_used: number | null;
  status: "pending" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}
interface AiRequestInsert {
  id?: string;
  firm_id: string;
  requested_by?: string | null;
  case_id?: string | null;
  request_type: AiRequestType;
  provider?: string;
  model?: string | null;
  input_summary?: string | null;
  output?: string | null;
  tokens_used?: number | null;
  status?: "pending" | "completed" | "failed";
  error_message?: string | null;
}
type AiRequestUpdate = Partial<AiRequestInsert>;

interface ConversationRow {
  id: string;
  firm_id: string;
  case_id: string | null;
  is_client_thread: boolean;
  title: string | null;
  created_at: string;
}
interface ConversationInsert {
  id?: string;
  firm_id: string;
  case_id?: string | null;
  is_client_thread?: boolean;
  title?: string | null;
}
type ConversationUpdate = Partial<ConversationInsert>;

interface ConversationParticipantRow {
  conversation_id: string;
  profile_id: string;
  last_read_at: string | null;
}
interface ConversationParticipantInsert {
  conversation_id: string;
  profile_id: string;
  last_read_at?: string | null;
}
type ConversationParticipantUpdate = Partial<ConversationParticipantInsert>;

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_document_id: string | null;
  created_at: string;
}
interface MessageInsert {
  id?: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_document_id?: string | null;
}
type MessageUpdate = Partial<MessageInsert>;

interface Table<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      firms: Table<FirmRow, FirmInsert, FirmUpdate>;
      profiles: Table<ProfileRow, ProfileInsert, ProfileUpdate>;
      clients: Table<ClientRow, ClientInsert, ClientUpdate>;
      cases: Table<CaseRow, CaseInsert, CaseUpdate>;
      case_assignments: Table<CaseAssignmentRow, CaseAssignmentInsert, CaseAssignmentUpdate>;
      tasks: Table<TaskRow, TaskInsert, TaskUpdate>;
      court_dates: Table<CourtDateRow, CourtDateInsert, CourtDateUpdate>;
      documents: Table<DocumentRow, DocumentInsert, DocumentUpdate>;
      evidence: Table<EvidenceRow, EvidenceInsert, EvidenceUpdate>;
      notes: Table<NoteRow, NoteInsert, NoteUpdate>;
      case_timeline_events: Table<
        CaseTimelineEventRow,
        CaseTimelineEventInsert,
        CaseTimelineEventUpdate
      >;
      time_entries: Table<TimeEntryRow, TimeEntryInsert, TimeEntryUpdate>;
      invoices: Table<InvoiceRow, InvoiceInsert, InvoiceUpdate>;
      invoice_items: Table<InvoiceItemRow, InvoiceItemInsert, InvoiceItemUpdate>;
      payments: Table<PaymentRow, PaymentInsert, PaymentUpdate>;
      notifications: Table<NotificationRow, NotificationInsert, NotificationUpdate>;
      ai_requests: Table<AiRequestRow, AiRequestInsert, AiRequestUpdate>;
      conversations: Table<ConversationRow, ConversationInsert, ConversationUpdate>;
      conversation_participants: Table<
        ConversationParticipantRow,
        ConversationParticipantInsert,
        ConversationParticipantUpdate
      >;
      messages: Table<MessageRow, MessageInsert, MessageUpdate>;
    };
    Views: {
      v_case_summary: {
        Row: {
          id: string;
          firm_id: string;
          case_number: string;
          title: string;
          status: CaseStatus;
          practice_area: string;
          client_name: string | null;
          lead_lawyer_name: string | null;
          next_hearing_date: string | null;
          open_tasks: number;
          document_count: number;
        };
        Relationships: [];
      };
      v_firm_billing_summary: {
        Row: {
          firm_id: string;
          total_invoiced_kobo: number;
          total_collected_kobo: number;
          outstanding_kobo: number;
        };
        Relationships: [];
      };
    };
    // eslint-disable-next-line @typescript-eslint/ban-types
    Functions: {};
    Enums: {
      user_role: UserRole;
      case_status: CaseStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      document_category: DocumentCategory;
      evidence_type: EvidenceType;
      notification_channel: NotificationChannel;
      ai_request_type: AiRequestType;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
