analyze-site-photos

This folder contains the Supabase Edge Function `analyze-site-photos` used to analyze site photos with the AI provider and return a structured JSON for site diary auto-fill.

Running tests

The repo includes lightweight Deno test under `supabase/functions/__tests__`. To run Deno tests locally (from the `supabase/functions` directory), ensure you have Deno installed and run:

```bash
cd supabase/functions
deno test --allow-net --allow-env --allow-read
```

Notes

- Tests are a smoke/integration style and may require further mocking or a test harness to fully simulate Supabase auth and AI provider responses.
- For CI, consider adding a small test harness that can replace `getAICompletion` with a deterministic stub.

Caching

- The `analyze-site-photos` function uses the `ai_insights` cache via `supabase/functions/_shared/aiCache.ts`.
- By default results are cached for the user's configured `cacheDurationHours` (default 6h). Pass `forceRefresh: true` in the request body to bypass cache.

Sample request body:

```json
{
  "photoUrls": ["https://.../photo1.jpg"],
  "projectId": "<project-uuid>",
  "language": "pt-BR",
  "forceRefresh": false
}
```
