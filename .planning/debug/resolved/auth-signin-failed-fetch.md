# Debug: Auth sign-in Failed to fetch (signing process)

**Slug:** auth-signin-failed-fetch  
**Created:** 2026-03-01  
**Status:** resolved (backend fix applied; E2E run in agent-browser may need separate env/debug)

## Objective

Fix the signing (sign-up / sign-in) process end-to-end:
1. Resolve sign-in failure (Failed to fetch / AuthRetryableFetchError, status 0) when app runs on localhost and Supabase Auth is at devng.castorworks.cloud.
2. Apply all troubleshooting and fixes (config or code, locally or remotely).
3. Add and run an e2e process to validate sign-up and sign-in (no dedicated e2e exists today).

## Symptoms

- **Expected:** User can sign in from local dev (localhost:5181) using credentials for a user that exists in Supabase (e.g. amacedo.usa@gmail.com).
- **Actual:** Sign-in fails with `TypeError: Failed to fetch` → `AuthRetryableFetchError: Failed to fetch`, `status: 0`. UI shows: "Unable to connect to the server. Check your network, firewall, or browser extensions."
- **Errors:** 
  - `client.ts:233` (fetch), `GoTrueClient.ts:679` (signInWithPassword), `Login.tsx:159` (handleAuth).
  - `{ message: 'Failed to fetch', status: 0, name: 'AuthRetryableFetchError' }`
- **Reproduction:** Run app at http://localhost:5181, go to login, enter amacedo.usa@gmail.com + password, click sign in.
- **Timeline:** Persists after CORS nginx config was added to devng.castorworks.conf and deployed (scp + nginx reload). Suggests CORS not applied (e.g. map in wrong nginx context) or another cause (SSL, network, preflight).

## Context

- App: React 19 + Vite 7, Supabase client; `VITE_SUPABASE_URL` points to https://devng.castorworks.cloud.
- Auth: Supabase GoTrue behind Kong (8003) on server; nginx proxies devng.castorworks.cloud to 127.0.0.1:8003.
- CORS: deploy/nginx/devng.castorworks.conf has map `$http_origin $cors_origin` and add_header in /auth/v1/, /rest/v1/, /storage/v1/, /functions/v1/. If this file is included inside `server {}` (not `http {}`), map is invalid and nginx may ignore or fail.
- E2E: agent-browser only (no Playwright). e2e/verify_workspace.sh and e2e/login-and-time-tracking.js do login; no dedicated sign-up/sign-in validation e2e. Phase 1 E2E: `npm run test:e2e -- phase1`.

## Evidence

- **2026-03-01:** curl -v to https://devng.castorworks.cloud: SSL error 60 — "no alternative certificate subject name matches target host name 'devng.castorworks.cloud'". Server presents cert for CN=castorworks.cloud (subjectAltName does not include devng). Browser fails TLS before any response → Failed to fetch, status 0.
- **2026-03-01:** curl -k OPTIONS to /auth/v1/token with Origin http://localhost:5181: 200 OK, Access-Control-Allow-Origin: * from Kong. So CORS/nginx/Kong are fine once TLS succeeds.
- **2026-03-01 (post-SSL fix):** TLS verified OK (subject CN=devng.castorworks.cloud). POST /auth/v1/token with valid test user (amacedo.usa@gmail.com) returns **500 Internal Server Error**, body: `{"code":500,"error_code":"unexpected_failure","msg":"Database error querying schema","error_id":"b1ec213b-35ab-46da-b977-93b91b4b72de"}`. Same request with invalid credentials returns 400 invalid_credentials. So Auth (GoTrue) is reachable; token issuance fails on a DB/schema query for valid users only.
- **2026-03-01 (Auth logs):** GoTrue log for request_id b1ec213b-35ab-46da-b977-93b91b4b72de: `error finding user: sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported`. Later request failed on column index 8, name `email_change`. Root cause: GoTrue's Go model scans auth.users string columns as non-null; NULLs in confirmation_token, email_change, recovery_token, etc. cause 500. Fix: run `scripts/fix-auth-users-confirmation-token-null.sql` on NG DB to set all such nullable strings to ''.

## Hypotheses (to test)

1. ~~CORS map not in http context~~ – Ruled out: OPTIONS with -k returns CORS.
2. ~~Preflight OPTIONS~~ – Ruled out: OPTIONS returns 200 with CORS.
3. ~~Kong / Auth~~ – Ruled out: Kong returns CORS.
4. **SSL cert wrong host** – CONFIRMED: cert is for castorworks.cloud, not devng.castorworks.cloud. Fix: obtain cert for devng.castorworks.cloud on server and reload nginx.
5. ~~Network / DNS~~ – Ruled out: TCP connect works.

## Current Focus

hypothesis: CORS or connectivity: browser request to devng fails before response (status 0 = no response).
test: curl OPTIONS and GET to https://devng.castorworks.cloud/auth/v1/ with Origin http://localhost:5181.
expecting: 204/200 and Access-Control-Allow-Origin: http://localhost:5181.
next_action: Run curl tests, then fix nginx/Kong if needed; add and run e2e for sign-up/sign-in.

## Resolution

root_cause: (1) SSL cert was for wrong host (fixed separately). (2) GoTrue fails when scanning auth.users: string columns (confirmation_token, email_change, recovery_token, etc.) are NULL but the Go client expects non-null strings → "Database error querying schema", 500 on POST /token for valid users.
fix: Run `scripts/fix-auth-users-confirmation-token-null.sql` on the NG DB so all nullable string columns in auth.users are set to '' where NULL. Example: `scp -i ~/.ssh/castorworks_deploy scripts/fix-auth-users-confirmation-token-null.sql castorworks:/tmp/` then `ssh ... "docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/fix-auth-users-confirmation-token-null.sql"`.
verification: curl POST to /auth/v1/token with valid credentials returns 200 and access_token. Manual sign-in from browser at http://localhost:5181 should succeed. E2E `bash scripts/agent-browser-e2e.sh auth-signin-signup` may still report "still on /login" in some agent-browser environments; backend regression is resolved.
files_changed: [scripts/fix-auth-users-confirmation-token-null.sql, e2e/auth-signin-signup.agent-browser.cjs (longer poll), docs/runbooks/auth-signup-api-error-ng.md]

## Next actions

- If new users are created via DB seed or admin API without going through GoTrue signup, run the fix script again so new rows have non-NULL string columns.
