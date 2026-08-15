import Link from "next/link";
import { requireProfile } from "@/lib/supabase/require-profile";
import { sendMessage } from "@/lib/actions/messages";
import { NewConversationForm } from "@/components/messages/new-conversation-form";
import { formatDocketDate, cn } from "@/lib/utils";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: activeConversationId } = await searchParams;
  const { supabase, profile, firmId } = await requireProfile();

  const [{ data: memberships }, { data: colleagues }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at, conversations(id, title, case_id, created_at)")
      .eq("profile_id", profile.id),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("firm_id", firmId)
      .neq("role", "client")
      .neq("id", profile.id),
  ]);

  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);

  // Latest message + sender name per conversation for the left-hand preview list.
  const previews = new Map<string, { body: string; created_at: string }>();
  const otherParticipants = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    for (const m of recentMessages ?? []) {
      if (!previews.has(m.conversation_id)) {
        previews.set(m.conversation_id, { body: m.body, created_at: m.created_at });
      }
    }

    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, profile_id, profiles(full_name)")
      .in("conversation_id", conversationIds)
      .neq("profile_id", profile.id);

    for (const p of allParticipants ?? []) {
      const name = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles)?.full_name;
      if (name) otherParticipants.set(p.conversation_id, name);
    }
  }

  const conversations = (memberships ?? [])
    .map((m) => {
      const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations;
      return conv ? { ...conv, preview: previews.get(conv.id), otherName: otherParticipants.get(conv.id) } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort(
      (a, b) =>
        new Date(b.preview?.created_at ?? b.created_at).getTime() -
        new Date(a.preview?.created_at ?? a.created_at).getTime()
    );

  const activeId = activeConversationId ?? conversations[0]?.id ?? null;

  let thread: { id: string; body: string; created_at: string; sender_id: string; sender_name: string }[] = [];
  if (activeId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, body, created_at, sender_id, profiles(full_name)")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true });

    thread = (messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender_name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.full_name ?? "Colleague",
    }));

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeId)
      .eq("profile_id", profile.id);
  }

  const sendToActive = activeId ? sendMessage.bind(null, activeId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink-900">Messages</h1>
        <p className="text-sm text-ink-500 mt-1">Direct conversations with your team, per case or otherwise.</p>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-4 card-surface overflow-hidden min-h-[32rem]">
        <div className="border-r border-slate-line flex flex-col">
          <div className="p-3 border-b border-slate-line">
            <NewConversationForm colleagues={colleagues ?? []} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-sm text-ink-300 p-4 text-center">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/messages?c=${c.id}`}
                  className={cn(
                    "block px-4 py-3 border-b border-slate-line hover:bg-parchment-50",
                    activeId === c.id && "bg-parchment-100"
                  )}
                >
                  <div className="text-sm font-medium text-ink-900 truncate">
                    {c.title || c.otherName || "Conversation"}
                  </div>
                  {c.preview && (
                    <div className="text-xs text-ink-500 truncate mt-0.5">{c.preview.body}</div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-ink-300">
              Start a conversation to see it here.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {thread.map((m) => {
                  const mine = m.sender_id === profile.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-md rounded-lg px-3.5 py-2.5 text-sm",
                          mine ? "bg-ink text-parchment-50" : "bg-parchment-100 text-ink-900"
                        )}
                      >
                        {!mine && <div className="text-xs font-medium text-brass-dark mb-0.5">{m.sender_name}</div>}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className={cn("text-[10px] mt-1", mine ? "text-ink-100" : "text-ink-300")}>
                          {formatDocketDate(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form action={sendToActive!} className="border-t border-slate-line p-3 flex gap-2">
                <input
                  name="body"
                  placeholder="Write a message…"
                  autoComplete="off"
                  required
                  className="flex-1 h-10 rounded border border-slate-line px-3 text-sm focus:outline-none focus-visible:border-brass"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded bg-ink text-parchment-50 text-sm font-medium hover:bg-ink-700"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
