alter table "public"."page"
add column if not exists "version" uuid,
add column if not exists "last_refresh" timestamptz;
