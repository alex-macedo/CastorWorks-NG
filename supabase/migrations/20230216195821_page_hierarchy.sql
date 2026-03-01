ALTER TABLE public.page
  ADD COLUMN IF NOT EXISTS parent_page_id bigint REFERENCES public.page;
