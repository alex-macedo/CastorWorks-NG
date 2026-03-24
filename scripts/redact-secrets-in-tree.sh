#!/bin/sh
# Used by git filter-branch to redact API keys in tree. Run from repo root.
if [ -f public/docs/.env.supabase ]; then
  sed -i.bak 's/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=<REDACTED>/' public/docs/.env.supabase
  sed -i.bak 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=<REDACTED>/' public/docs/.env.supabase
  rm -f public/docs/.env.supabase.bak
fi
if [ -f docs/.env.supabase ]; then
  sed -i.bak 's/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=<REDACTED>/' docs/.env.supabase
  sed -i.bak 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=<REDACTED>/' docs/.env.supabase
  rm -f docs/.env.supabase.bak
fi
if [ -f docs/multi-tenant/castorworks-v3-multi-tenant-master-plan.md ]; then
  sed -i.bak 's/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=<REDACTED>/' docs/multi-tenant/castorworks-v3-multi-tenant-master-plan.md
  rm -f docs/multi-tenant/castorworks-v3-multi-tenant-master-plan.md.bak
fi
exit 0
