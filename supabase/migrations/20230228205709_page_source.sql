alter table "public"."page"
add column if not exists type text,
add column if not exists source text;
