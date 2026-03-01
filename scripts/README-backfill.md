# Backfill Signed URLs to Canonical Storage Paths

This script helps convert existing database rows that contain expiring signed URLs into canonical storage paths (e.g., `bucket/key` or `bucket/path/file.jpg`).

Files added:

- `scripts/backfill-signed-urls.js` — backfill utility. Supports `--dry` (default) and `--apply` modes.

Prerequisites:

- Node.js (14+)
- `SUPABASE_URL` env var set
- `SUPABASE_SERVICE_ROLE_KEY` env var set for `--apply` mode (required to perform updates)

How it works:

1. Inspect configured tables/columns (edit the `targets` array in the script to add/remove table/columns).
2. For string columns containing `http` values, attempts to parse a canonical `bucket/key` path using heuristics.
3. For JSON columns (e.g., `checklist_items`), walks nested fields and tries to parse nested signed URLs.
4. Writes ambiguous/unparsable cases to `scripts/backfill-ambiguous.csv` for manual review.
5. In `--dry` mode it only reports what it would change; in `--apply` mode it performs updates.

Usage examples:

Run a dry-run (recommended first):

```bash
SUPABASE_URL="https://your-supabase-url" node scripts/backfill-signed-urls.js --dry
```

If dry-run looks good, run apply (REQUIRES `SUPABASE_SERVICE_ROLE_KEY`):

```bash
SUPABASE_URL="https://your-supabase-url" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
node scripts/backfill-signed-urls.js --apply
```

Notes & Safety:

- The script uses heuristics to parse signed URLs — it won't be perfect. Review `scripts/backfill-ambiguous.csv` for rows needing manual attention.
- Start with small batches by adding `.limit()` adjustments in the script; do not run wide updates without a DB backup.
- For large databases, consider paginating queries instead of fetching 1000 rows per table at once.

Extending the script:

- Add more `targets` for tables/columns to inspect.
- Improve `parseSignedUrlToPath` to handle specific signed URL patterns your system produces.

Local / Docker Supabase
-----------------------

If your Supabase instance runs locally inside Docker (self-hosted or via `supabase start`), there are two common ways to run the backfill:

1) Run from the host against the container's exposed HTTP endpoint

- Ensure the Supabase HTTP API/storage port is exposed to the host. Typical local URLs include `http://localhost:54321` (your environment may differ).
- Set `SUPABASE_URL` to the exposed URL and run the script from the project root (example uses the npm scripts added to `package.json`):

```bash
# dry-run (no DB writes)
SUPABASE_URL="http://localhost:54321" npm run backfill:signed-urls:dry

# apply (requires service role key)
SUPABASE_URL="http://localhost:54321" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
npm run backfill:signed-urls:apply
```

2) Run the script inside a container that has network access to the Supabase container

- Option A — execute inside an existing container that already has your project mounted:

```bash
# find your container name (example: `supabase`)
docker ps

# execute the script inside the container (adjust paths as needed)
docker exec -it <supabase_container_name> sh -c 'cd /workdir && node scripts/backfill-signed-urls.js --dry'
```

- Option B — run a temporary Node container with host networking (Linux) or with host.docker.internal configured:

```bash
# Linux (host network)
docker run --rm --network host -v "$(pwd)":/app -w /app node:18 \
	sh -c 'SUPABASE_URL="http://localhost:54321" node scripts/backfill-signed-urls.js --dry'

# macOS/Windows: use host.docker.internal if ports are forwarded
docker run --rm -v "$(pwd)":/app -w /app node:18 \
	sh -c 'SUPABASE_URL="http://host.docker.internal:54321" node scripts/backfill-signed-urls.js --dry'
```

Notes for Docker usage:

- Use the URL/host that matches how your Supabase container exposes services to the environment running the backfill script (`localhost`, `host.docker.internal`, or container network).
- If you run the script inside a container, ensure the project files are mounted into that container at the path you execute from.
- Always start with `--dry` when running for the first time.

