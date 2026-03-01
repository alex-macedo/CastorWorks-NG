DROP FUNCTION IF EXISTS public.match_page_sections(
  vector,
  double precision,
  integer,
  integer
);

CREATE OR REPLACE FUNCTION public.match_page_sections(
  embedding vector(1536),
  match_threshold float,
  match_count int,
  min_content_length int
)
RETURNS TABLE (
  path text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT
    page.path,
    page_section.content,
    (page_section.embedding <#> embedding) * -1 AS similarity
  FROM page_section
  JOIN page
    ON page_section.page_id = page.id
  WHERE length(page_section.content) >= min_content_length
    AND (page_section.embedding <#> embedding) * -1 > match_threshold
  ORDER BY page_section.embedding <#> embedding
  LIMIT match_count;
END;
$$;
