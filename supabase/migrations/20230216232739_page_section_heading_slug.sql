alter table "public"."page_section"
add column if not exists slug text,
add column if not exists heading text;
