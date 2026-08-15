-- ============================================================================
-- Messaging RLS fixes
-- Run after complete_database.sql. The base migration enabled RLS on
-- conversations, conversation_participants, and messages but only wrote
-- SELECT policies (plus INSERT on messages) — there was no way to ever
-- create a conversation or add a participant, and conversation_participants
-- could only be read for the caller's own row, so a thread couldn't show
-- who else was in it. Both gaps are fixed here.
-- ============================================================================

-- security definer, same pattern as auth_firm_id()/auth_is_staff() below —
-- needed so this check doesn't recursively re-invoke RLS on
-- conversation_participants when used inside that table's own policy.
create or replace function auth_is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants p
    where p.conversation_id = target_conversation_id
      and p.profile_id = auth.uid()
  );
$$;

-- Any staff member can start a conversation scoped to their own firm.
create policy conversations_insert on conversations for insert
  with check (auth_is_staff() and firm_id = auth_firm_id());

-- Adding participants is allowed for any staff member of the conversation's
-- firm — deliberately not restricted to "existing participants only", since
-- the very first insert (creator + the person they're messaging) has no
-- existing participants yet to satisfy that check against.
create policy conversation_participants_insert on conversation_participants for insert
  with check (
    auth_is_staff()
    and exists (
      select 1 from conversations c
      where c.id = conversation_participants.conversation_id
        and c.firm_id = auth_firm_id()
    )
  );

-- Replaces the original self-only policy: a participant can now see every
-- row for a conversation they belong to, not just their own membership row,
-- which is what lets the UI show who else is in a thread.
drop policy if exists conversation_participants_self on conversation_participants;
create policy conversation_participants_select on conversation_participants for select
  using (auth_is_conversation_participant(conversation_id));

-- Lets a participant update their own last_read_at (unread counts).
create policy conversation_participants_update_self on conversation_participants for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
