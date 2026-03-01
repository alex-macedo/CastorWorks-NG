DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'feedback_vote'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.feedback_vote AS ENUM ('up', 'down');
  END IF;
END;
$$;

create table if not exists feedback (
	id bigint primary key generated always as identity,
	date_created date not null default current_date,
	vote feedback_vote not null,
	page text not null
);

alter table feedback enable row level security;

drop policy if exists "Anyone can insert feedback" on feedback;

-- Allow authenticated users to insert feedback
drop policy if exists "authenticated_insert_feedback"
on feedback;

create policy "authenticated_insert_feedback"
on feedback
as permissive for insert
to authenticated
with check (auth.uid() IS NOT NULL);
