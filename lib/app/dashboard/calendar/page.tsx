import Link from "next/link";
import { CalendarDays, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { NewHearingForm } from "@/components/calendar/new-hearing-form";
import { cn } from "@/lib/utils";
import {
  monthRange,
  toMonthParam,
  parseDateParam,
  toDateParam,
  addDays,
  weekStart,
  buildGridDays,
  dateKey,
} from "@/lib/calendar";

const EVENT_LABEL: Record<string, string> = {
  hearing: "Hearing",
  filing_deadline: "Filing deadline",
  meeting: "Meeting",
  mention: "Mention",
  judgment: "Judgment",
};

type CourtEvent = {
  id: string;
  event_type: string;
  title: string;
  starts_at: string;
  location: string | null;
  notes: string | null;
  case_id: string | null;
  cases: { title: string; case_number: string } | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; date?: string }>;
}) {
  const { view: viewParam, month: monthParam, date: dateParam } = await searchParams;
  const view =
    viewParam === "month" || viewParam === "week" || viewParam === "day" ? viewParam : "list";
  const { supabase, firmId } = await requireProfile();

  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, case_number")
    .eq("firm_id", firmId)
    .order("title");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Court calendar</h1>
          <p className="text-sm text-ink-500 mt-1">
            Every hearing, filing deadline, and meeting on the docket, firm-wide.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-slate-line overflow-hidden text-sm">
            {(["list", "day", "week", "month"] as const).map((v, i) => (
              <Link
                key={v}
                href={`/dashboard/calendar?view=${v}`}
                className={cn(
                  "px-3 py-1.5 capitalize",
                  i > 0 && "border-l border-slate-line",
                  view === v ? "bg-ink text-parchment-50" : "bg-white text-ink-500 hover:bg-parchment-100"
                )}
              >
                {v}
              </Link>
            ))}
          </div>
          <NewHearingForm cases={cases ?? []} />
        </div>
      </div>

      {view === "month" && <MonthView firmId={firmId} monthParam={monthParam} />}
      {view === "week" && <WeekView firmId={firmId} dateParam={dateParam} />}
      {view === "day" && <DayView firmId={firmId} dateParam={dateParam} />}
      {view === "list" && <ListView firmId={firmId} />}
    </div>
  );
}

async function ListView({ firmId }: { firmId: string }) {
  const { supabase } = await requireProfile();

  const { data: courtDates } = await supabase
    .from("court_dates")
    .select("id, event_type, title, starts_at, location, notes, case_id, cases(title, case_number)")
    .eq("firm_id", firmId)
    .gte("starts_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .order("starts_at", { ascending: true });

  const events: CourtEvent[] = (courtDates ?? []).map((e) => ({
    ...e,
    cases: Array.isArray(e.cases) ? (e.cases[0] ?? null) : e.cases,
  }));

  const groups = new Map<string, CourtEvent[]>();
  for (const e of events) {
    const key = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(
      new Date(e.starts_at)
    );
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  if (events.length === 0) {
    return (
      <div className="card-surface p-12 text-center">
        <CalendarDays className="h-6 w-6 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-ink-300">
          Nothing on the calendar yet. Add a hearing from here or from any case workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([month, monthEvents]) => (
        <div key={month}>
          <h2 className="docket mb-3">{month.toUpperCase()}</h2>
          <div className="card-surface divide-y divide-slate-line">
            {monthEvents.map((e) => (
              <div key={e.id} className="p-4 flex items-start gap-4">
                <div className="w-16 shrink-0 text-center">
                  <div className="font-display text-xl text-ink-900 leading-none">
                    {new Date(e.starts_at).getDate()}
                  </div>
                  <div className="text-xs text-ink-500 mt-1">
                    {new Intl.DateTimeFormat("en-NG", { weekday: "short" }).format(new Date(e.starts_at))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink-900">{e.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brass/10 text-brass-dark">
                      {EVENT_LABEL[e.event_type] ?? e.event_type}
                    </span>
                  </div>
                  {e.cases && e.case_id && (
                    <Link
                      href={`/dashboard/cases/${e.case_id}`}
                      className="docket mt-1.5 inline-block hover:text-brass-dark"
                    >
                      {e.cases.case_number} — {e.cases.title}
                    </Link>
                  )}
                  {e.location && (
                    <div className="flex items-center gap-1 text-xs text-ink-500 mt-1.5">
                      <MapPin className="h-3 w-3" strokeWidth={1.75} />
                      {e.location}
                    </div>
                  )}
                </div>
                <div className="text-xs text-ink-500 shrink-0">
                  {new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(
                    new Date(e.starts_at)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

async function MonthView({ firmId, monthParam }: { firmId: string; monthParam?: string }) {
  const { supabase } = await requireProfile();
  const { start, year, month } = monthRange(monthParam);
  const gridDays = buildGridDays(year, month);

  const gridStart = gridDays[0]!;
  const gridEnd = gridDays[gridDays.length - 1]!;

  const { data: courtDates } = await supabase
    .from("court_dates")
    .select("id, event_type, title, starts_at, location, notes, case_id, cases(title, case_number)")
    .eq("firm_id", firmId)
    .gte("starts_at", gridStart.toISOString())
    .lt("starts_at", gridEnd.toISOString())
    .order("starts_at", { ascending: true });

  const events: CourtEvent[] = (courtDates ?? []).map((e) => ({
    ...e,
    cases: Array.isArray(e.cases) ? (e.cases[0] ?? null) : e.cases,
  }));

  const eventsByDay = new Map<string, CourtEvent[]>();
  for (const e of events) {
    const key = dateKey(new Date(e.starts_at));
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
  }

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const today = dateKey(new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/dashboard/calendar?view=month&month=${toMonthParam(prevMonth.year, prevMonth.month)}`}
          className="p-1.5 rounded hover:bg-parchment-100 text-ink-500"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <h2 className="font-display text-lg text-ink-900">
          {new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(start)}
        </h2>
        <Link
          href={`/dashboard/calendar?view=month&month=${toMonthParam(nextMonth.year, nextMonth.month)}`}
          className="p-1.5 rounded hover:bg-parchment-100 text-ink-500"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-line border border-slate-line rounded overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-parchment-100 text-center text-xs font-medium text-ink-500 py-2">
            {d}
          </div>
        ))}
        {gridDays.map((d) => {
          const key = dateKey(d);
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = d.getMonth() === month - 1;
          const isToday = key === today;

          return (
            <div
              key={key}
              className={cn(
                "bg-white min-h-[92px] p-1.5 text-xs",
                !inMonth && "bg-parchment-50 text-ink-300"
              )}
            >
              <div
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full",
                  isToday && "bg-brass text-parchment-50",
                  !isToday && inMonth && "text-ink-900",
                  !isToday && !inMonth && "text-ink-300"
                )}
              >
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={e.case_id ? `/dashboard/cases/${e.case_id}` : "#"}
                    className="block truncate rounded bg-brass/10 text-brass-dark px-1 py-0.5 hover:bg-brass/20"
                    title={e.title}
                  >
                    {e.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-ink-300 px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ e }: { e: CourtEvent }) {
  return (
    <div className="card-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink-900">{e.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brass/10 text-brass-dark shrink-0">
              {EVENT_LABEL[e.event_type] ?? e.event_type}
            </span>
          </div>
          {e.cases && e.case_id && (
            <Link
              href={`/dashboard/cases/${e.case_id}`}
              className="docket mt-1.5 inline-block hover:text-brass-dark"
            >
              {e.cases.case_number} — {e.cases.title}
            </Link>
          )}
          {e.location && (
            <div className="flex items-center gap-1 text-xs text-ink-500 mt-1.5">
              <MapPin className="h-3 w-3" strokeWidth={1.75} />
              {e.location}
            </div>
          )}
        </div>
        <div className="text-xs text-ink-500 shrink-0">
          {new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(
            new Date(e.starts_at)
          )}
        </div>
      </div>
    </div>
  );
}

async function DayView({ firmId, dateParam }: { firmId: string; dateParam?: string }) {
  const { supabase } = await requireProfile();
  const day = parseDateParam(dateParam);
  const dayEnd = addDays(day, 1);

  const { data: courtDates } = await supabase
    .from("court_dates")
    .select("id, event_type, title, starts_at, location, notes, case_id, cases(title, case_number)")
    .eq("firm_id", firmId)
    .gte("starts_at", day.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .order("starts_at", { ascending: true });

  const events: CourtEvent[] = (courtDates ?? []).map((e) => ({
    ...e,
    cases: Array.isArray(e.cases) ? (e.cases[0] ?? null) : e.cases,
  }));

  const isToday = toDateParam(day) === toDateParam(new Date());

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/dashboard/calendar?view=day&date=${toDateParam(addDays(day, -1))}`}
          className="p-1.5 rounded hover:bg-parchment-100 text-ink-500"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <div className="text-center">
          <h2 className="font-display text-lg text-ink-900">
            {new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(day)}
          </h2>
          {!isToday && (
            <Link
              href={`/dashboard/calendar?view=day&date=${toDateParam(new Date())}`}
              className="text-xs text-brass hover:text-brass-dark"
            >
              Jump to today
            </Link>
          )}
        </div>
        <Link
          href={`/dashboard/calendar?view=day&date=${toDateParam(addDays(day, 1))}`}
          className="p-1.5 rounded hover:bg-parchment-100 text-ink-500"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-ink-300">Nothing scheduled for this day.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

async function WeekView({ firmId, dateParam }: { firmId: string; dateParam?: string }) {
  const { supabase } = await requireProfile();
  const anchor = parseDateParam(dateParam);
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = addDays(start, 7);

  const { data: courtDates } = await supabase
    .from("court_dates")
    .select("id, event_type, title, starts_at, location, notes, case_id, cases(title, case_number)")
    .eq("firm_id", firmId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  const events: CourtEvent[] = (courtDates ?? []).map((e) => ({
    ...e,
    cases: Array.isArray(e.cases) ? (e.cases[0] ?? null) : e.cases,
  }));

  const eventsByDay = new Map<string, CourtEvent[]>();
  for (const e of events) {
    const key = dateKey(new Date(e.starts_at));
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
  }

  const today = dateKey(new Date());
  const rangeLabel = `${new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(
    start
  )} – ${new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(
    addDays(start, 6)
  )}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/dashboard/calendar?view=week&date=${toDateParam(addDays(start, -7))}`}
          className="p-1.5 rounded hover:bg-parchment-100 text-ink-500"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <h2 className="font-display text-lg text-ink-900">{rangeLabel}</h2>
        <Link
          href={`/dashboard/calendar?view=week&date=${toDateParam(addDays(start, 7))}`}
          className="p-1.5 rounded hover:bg-parchment-100 text-ink-500"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
        {days.map((d) => {
          const key = dateKey(d);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === today;

          return (
            <div key={key} className="min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs shrink-0",
                    isToday ? "bg-brass text-parchment-50" : "text-ink-900"
                  )}
                >
                  {d.getDate()}
                </span>
                <span className="text-xs text-ink-500">
                  {new Intl.DateTimeFormat("en-NG", { weekday: "short" }).format(d)}
                </span>
              </div>
              <div className="space-y-1.5">
                {dayEvents.length === 0 ? (
                  <div className="text-xs text-ink-300">—</div>
                ) : (
                  dayEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={e.case_id ? `/dashboard/cases/${e.case_id}` : "#"}
                      className="block rounded bg-brass/10 text-brass-dark px-2 py-1.5 text-xs hover:bg-brass/20"
                      title={e.title}
                    >
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="text-ink-500">
                        {new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(
                          new Date(e.starts_at)
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
