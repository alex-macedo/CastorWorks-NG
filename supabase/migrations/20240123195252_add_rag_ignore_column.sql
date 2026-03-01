alter table page_section
add column if not exists rag_ignore boolean
default false;
