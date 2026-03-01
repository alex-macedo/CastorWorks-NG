#!/usr/bin/env bash
# SSH tunnel for Supabase Studio and DB access on dev.castorworks.cloud (CastorWorks-NG).
# Run and keep this terminal open; then open Supabase Studio at http://localhost:54323
# DB/pooler available via localhost:54321 (remote 5433) if needed.
set -e
ssh -L 54323:127.0.0.1:54325 -L 54321:127.0.0.1:5433 castorworks
