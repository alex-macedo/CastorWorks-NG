alter table public.meetups
add column if not exists timezone text;

alter table public.meetups
add column if not exists city text;
