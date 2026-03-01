# Edge Functions API (Supabase Functions)

## How edge functions are called from the frontend

In the frontend, edge functions are invoked via `supabase-js`:

```ts
const { data, error } = await supabase.functions.invoke("function-name", {
  body: { /* JSON payload */ },
});
if (error) throw error;
```

### Authentication

`supabase.functions.invoke(...)` sends the current user’s JWT automatically when a session exists.

When calling edge functions outside the browser (curl/postman), you typically need:

- `Authorization: Bearer <user_jwt>`
- `apikey: <anon_key>`
- `Content-Type: application/json`

Supabase-hosted edge functions are exposed at:

- `POST /functions/v1/<function-name>`

## Cross-cutting behavior (shared utilities)

### Auth helpers: `supabase/functions/_shared/authorization.ts`

Common helpers:

- `authenticateRequest(req)` → validates Bearer token, returns `{ user, token }`, throws `"Unauthorized"` on failure.
- `createServiceRoleClient()` → service-role Supabase client (privileged).
- `verifyProjectAccess(userId, projectId)` → validates access via DB function `has_project_access`.
- `verifyProjectAdminAccess(userId, projectId)` → validates project-admin via DB function `has_project_admin_access`.
- `verifyAdminRole(userId)` → validates admin role via DB function `has_role`.

### Error handling: `supabase/functions/_shared/errorHandler.ts`

Some functions call `createErrorResponse(error, corsHeaders)` which:

- logs details server-side
- returns safe messages to clients
- maps to HTTP statuses:
  - 401: auth errors
  - 403: access denied
  - 400: validation/invalid input
  - 404: not found
  - 500: everything else

### Rate limiting: `supabase/functions/_shared/rateLimiter.ts`

Some AI-related endpoints can rate-limit by reading `ai_usage_logs`.

If rate limited, a function may return:

- `429 Rate limit exceeded`
- headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Frontend-invoked functions (most important)

This section documents the functions **directly invoked by the UI** (highest sprint impact).

### `ai-chat-assistant`

**Purpose**

- AI chat assistant used by the in-app chat widget.
- Uses Anthropic Claude (`ANTHROPIC_API_KEY` required).
- Persists conversation messages to `ai_chat_messages`.
- Logs usage to `ai_usage_logs`.

**Endpoint**

- `POST /functions/v1/ai-chat-assistant`

**Auth**

- Required (uses `authenticateRequest(req)`).

**Request body**

```json
{
  "message": "string",
  "sessionId": "string",
  "context": {
    "currentPage": "/projects/..."
  }
}
```

Required fields: `message`, `sessionId`.

**Response (200)**

```json
{
  "message": "string",
  "functionCalls": [
    { "name": "search_estimates", "input": { "query": "..." } }
  ]
}
```

**Errors**

- `400` if required params missing (`code: "MISSING_PARAMS"`).
- `503` if `ANTHROPIC_API_KEY` missing (`code: "MISSING_API_KEY"`).
- `401` if unauthenticated (throws `"Unauthorized"` internally).
- `500` for internal failures (note: current implementation may include a `details` stack in the JSON response; treat as internal-only behavior).

**Performance considerations**

- Loads up to 20 history rows per request.
- May make multiple model calls if a tool call is requested (tool_use + follow-up).

### `generate-po-pdf`

**Purpose**

- Generates a purchase order PDF via `pdfmake`, uploads to Storage bucket `purchase-orders`, updates the `purchase_orders` row.
- Stores **stable storage path** in DB (`purchase_orders.pdf_url`), returns a signed URL in response.

**Endpoint**

- `POST /functions/v1/generate-po-pdf`

**Request body**

```json
{
  "purchase_order_id": "uuid",
  "force_regenerate": true
}
```

**Response (200)**

```json
{
  "success": true,
  "pdf_url": "https://...signed-url...",
  "version": 2,
  "file_size": 123456,
  "message": "PDF generated successfully (version 2)",
  "regenerated": true
}
```

If PDF is already up to date:

```json
{
  "success": true,
  "pdf_url": "projectId/PO-123-v1.pdf",
  "version": 1,
  "message": "PDF already up to date",
  "regenerated": false
}
```

**Auth**

- Requires a valid session (`supabaseClient.auth.getUser()`).
- Enforces project access by checking the purchase order’s project manager ID matches the caller (current implementation checks `projects.manager_id === user.id`).

**Errors**

- `400` missing `purchase_order_id`
- `401` authentication required
- `403` user does not have access to the PO’s project
- `404` purchase order not found
- `500` upload/signing/internal errors

### `send-po-email`

**Purpose**

- Sends the PO PDF to the supplier email (Resend API).
- Updates PO status to `sent` (best-effort).
- Logs notification + activity (best-effort).

**Endpoint**

- `POST /functions/v1/send-po-email`

**Request body**

```json
{
  "purchase_order_id": "uuid",
  "force_resend": true
}
```

**Response (200)**

```json
{
  "success": true,
  "message": "Purchase order sent to supplier@example.com",
  "purchase_order_number": "PO-000123",
  "supplier_name": "Supplier Name",
  "supplier_email": "supplier@example.com",
  "sent_at": "2025-12-23T12:34:56.000Z"
}
```

**Auth**

- Requires a valid session (`supabaseClient.auth.getUser()`).
- Enforces project manager access (`projects.manager_id === user.id`).

**Errors**

- `400`:
  - missing `purchase_order_id`
  - PDF not generated (`pdf_url` missing)
  - supplier email missing
- `401` authentication required
- `403` access denied to project
- `404` purchase order not found
- `409` already sent and `force_resend` not provided
- `500` Resend or download failures

**External dependencies**

- Requires `RESEND_API_KEY` set for the function environment.

### `sync-calendar-events`

**Purpose**

- Syncs project activities (with start/end dates) to Google Calendar using the provided OAuth access token.
- Stores a mapping in `calendar_events`.

**Endpoint**

- `POST /functions/v1/sync-calendar-events`

**Request body**

```json
{
  "projectId": "uuid",
  "accessToken": "google_oauth_access_token"
}
```

**Response (200)**

```json
{
  "success": true,
  "synced": 10,
  "total": 12
}
```

If no dated activities:

```json
{
  "message": "No activities with dates to sync",
  "synced": 0
}
```

**Auth**

- Requires user authentication.
- Requires project admin access via `verifyProjectAdminAccess(user.id, projectId)`.

**Errors**

- `400` if `projectId` missing
- `401` unauthenticated
- `403` access denied / admin access required
- `500` (also used for “integration not enabled” currently)

**External dependencies**

- Uses `https://www.googleapis.com/calendar/v3/...` with the caller-provided `accessToken`.

### `fetch-weather`

**Purpose**

- Fetches a 7-day forecast from WeatherAPI and transforms it into the UI’s shape.
- Adds “operational impact” analysis for construction suitability.

**Endpoint**

- `POST /functions/v1/fetch-weather`

**Request body**

```json
{
  "location": "Akron, Ohio",
  "temperatureUnit": "C"
}
```

**Response (200)**

Contains:

- `current`, `hourly`, `daily`, `location`, `lastUpdated`
- plus enrichment:
  - `operationalImpact`
  - `dailyWorkSuitability`
  - `activityRecommendations`

**Errors**

- Uses `createErrorResponse(...)` mapping (see above).
- Requires `WEATHER_API_KEY` set in function env.

### `send-maintenance-notification`

**Purpose**

- Sends a maintenance email notification to all users (via Resend + React Email template).

**Endpoint**

- `POST /functions/v1/send-maintenance-notification`

**Request body**

```json
{
  "type": "scheduled",
  "title": "Planned maintenance",
  "description": "We will be upgrading...",
  "scheduledStart": "2025-12-23T10:00:00Z",
  "scheduledEnd": "2025-12-23T11:00:00Z",
  "estimatedTime": "60 minutes",
  "contactEmail": "support@..."
}
```

**Auth**

- Requires authentication.
- Requires admin role:
  - checks `user_roles.role === "admin"` server-side.

**Response (200)**

```json
{
  "success": true,
  "message": "Notification sent to 123 users",
  "emailId": "..."
}
```

**Errors**

- `401` missing/invalid auth
- `403` admin access required
- `500` sending failures

### `addresses-lookup`

**Purpose**

- Authenticated address lookup with in-memory caching.
- Internals are implemented under `supabase/functions/_shared/address/*`.

**Endpoint**

- `POST /functions/v1/addresses-lookup`

**Auth**

- Required (injects `authenticateRequest` into handler).

**Contract**

This function delegates to a shared handler; refer to:

- `supabase/functions/_shared/address/handler.ts`
- `supabase/functions/_shared/address/types.ts`

for the authoritative schema.

### `generate-analytics-insights`

**Purpose**

- Generates analytics insights using OpenAI (if configured), with caching and fallback generation.

**Endpoint**

- `POST /functions/v1/generate-analytics-insights`

**Auth**

- Required (`authenticateRequest`).

**Request body**

```json
{
  "insightType": "daily-briefing",
  "projectId": "uuid-optional",
  "language": "pt-BR",
  "forceRefresh": true
}
```

Valid `insightType` values:

- `financial-overall`
- `financial-project`
- `budget`
- `materials`
- `schedule-deviations`
- `daily-briefing`
- `photo-analysis`
- `communication-assistant`
- `portfolio-overview`

**Response (200)**

```json
{
  "insights": "markdown string",
  "cached": false,
  "generatedAt": "2025-12-23T12:34:56.000Z"
}
```

If served from cache:

```json
{
  "insights": "markdown string",
  "cached": true,
  "generatedAt": "2025-12-23T10:00:00.000Z"
}
```

**Errors**

- Uses `createErrorResponse(...)` mapping for safe errors.

## Other edge functions (catalog)

There are many additional functions under `supabase/functions/` for:

- procurement automation (quotes, approvals)
- campaigns and notifications
- AI estimation and caching/usage tracking
- database export utilities

When documenting a specific workflow, start by searching for:

- `supabase.functions.invoke("...")` usage in `src/`
- then open the corresponding `supabase/functions/<name>/index.ts`


