# Fix: Supabase Auth API Error When Signing Up (CastorWorks-NG)

When signup fails with "API error" or "Failed to create user: API error happened while trying to communicate with the server," the failure is on the **Supabase Auth (GoTrue)** side. This runbook helps you fix it and/or create a user so you can get in.

---

## 0. Signup flow (create-user Edge Function)

The **signup form** no longer calls `auth.signUp()` directly. It calls the **create-user** Edge Function, which creates the user via the Auth **Admin API** using the service role key. That way the JWT is only used **inside** the Edge Function and is never sent through Kong, avoiding 403 bad_jwt (token corruption).

For this to work when Auth is behind Kong:

- Set **AUTH_INTERNAL_URL** in the environment of the Edge Function runtime (e.g. Supabase self-hosted Edge Functions / Deno) to the **internal** URL of the Auth (GoTrue) service, e.g. `http://auth:9999` (replace `auth` with the actual Docker service name for GoTrue in your compose). The Edge Function will then call `POST {AUTH_INTERNAL_URL}/auth/v1/admin/users` so the request does not go through Kong.
- If **AUTH_INTERNAL_URL** is not set, the function falls back to **SUPABASE_URL**; the request goes through Kong and may still hit the 403 bad_jwt issue.

**How to set AUTH_INTERNAL_URL (self-hosted NG):** In the same place where Edge Function secrets are configured (e.g. in the Supabase self-hosted stack, the env passed to the Edge Runtime / functions container), add:

```bash
AUTH_INTERNAL_URL=http://auth:9999
```

Use the actual Auth service hostname and port from your `docker-compose` (e.g. `auth` and `9999` for GoTrue).

---

## 1. Apply Auth URL configuration (do this first)

Auth must know the **public URL** of your NG app. If `SITE_URL` and `API_EXTERNAL_URL` are `localhost`, redirects and some checks can fail when the client uses `https://devng.castorworks.cloud`.

In **docs/.env.supabase** (and on the server in the NG stack’s `.env`), set:

- `SITE_URL=https://devng.castorworks.cloud`
- `API_EXTERNAL_URL=https://devng.castorworks.cloud`
- `ADDITIONAL_REDIRECT_URLS=https://devng.castorworks.cloud,https://studiong.castorworks.cloud`

Then **copy the updated .env to the server** and **restart Auth**:

```bash
scp -i ~/.ssh/castorworks_deploy docs/.env.supabase castorworks:/root/supabase-CastorWorks-NG/.env
ssh -i ~/.ssh/castorworks_deploy castorworks "cd /root/supabase-CastorWorks-NG && docker compose restart auth"
```

**Sign-in from local dev (localhost:5173 / localhost:5181):** If you see "Failed to fetch" or "AuthRetryableFetchError" with **status 0**, common causes: (1) **SSL certificate mismatch** (server presenting a cert for a different hostname, e.g. castorworks.cloud instead of devng.castorworks.cloud). The browser fails the TLS handshake before any response. See **Troubleshooting: Sign-in Failed to fetch** in `docs/runbooks/nginx-dev-castorworks-ng.md` to fix. (2) **CORS**: Kong can send `Access-Control-Allow-Origin: *`, which conflicts with credentialed requests from localhost; the devng config uses `proxy_hide_header` so only nginx’s origin (e.g. `http://localhost:5181`) is sent. If the cert is correct and CORS is deployed, ensure the devng site is enabled and nginx reloaded. Deploy the config and reload:

```bash
scp -i ~/.ssh/castorworks_deploy deploy/nginx/devng.castorworks.conf castorworks:/etc/nginx/sites-available/
ssh -i ~/.ssh/castorworks_deploy castorworks "nginx -t && systemctl reload nginx"
```

If your nginx includes this file from a `server` block (not `http`), move the `map $http_origin $cors_origin { ... }` block into your main `nginx.conf` inside `http { }`, then reload.

**Local dev proxy (CastorWorks-NG):** When you run the app with `./castorworks.sh start` (localhost:5181), the Vite dev server proxies `/auth/v1`, `/rest/v1`, `/storage/v1`, and `/functions/v1` to `VITE_SUPABASE_URL` (e.g. https://devng.castorworks.cloud). The browser then only talks to localhost, avoiding cross-origin and TLS to devng. If you still see "Failed to fetch" in the browser, ensure you are using the dev server (not a static build) and that `VITE_SUPABASE_URL` in `.env.local` points to the NG backend.

Try signup/sign-in again. If it still fails, continue below.

---

## 2. Capture the real error from Auth logs

On the server, stream Auth logs while you attempt signup from the app:

```bash
ssh -i ~/.ssh/castorworks_deploy castorworks "cd /root/supabase-CastorWorks-NG && docker compose logs -f auth"
```

In another terminal or in the browser, try signing up. In the logs, look for lines containing `error`, `failed`, `panic`, or a stack trace. Common causes:

| Log / symptom | Likely cause | Action |
|---------------|--------------|--------|
| `error finding user: sql: Scan error on column ... "confirmation_token" (or "email_change", etc.): converting NULL to string is unsupported` | GoTrue scans `auth.users` string columns as non-NULL; rows with NULL in those columns cause 500 on sign-in | Run **scripts/fix-auth-users-confirmation-token-null.sql** on the NG DB (see §2.1). |
| SMTP / mail / send error | Auth tries to send email and SMTP fails | Fix SMTP in .env (Resend: correct API key, verified domain). Or set `ENABLE_EMAIL_AUTOCONFIRM=true` so no mail is sent on signup. |
| database error, trigger, constraint | DB or trigger blocks insert into `auth.users` | Check `auth.users` and triggers in the NG DB; fix or temporarily disable the trigger. |
| 500 / internal | GoTrue bug or misconfiguration | Ensure Auth env (e.g. `GOTRUE_DB_*`, `JWT_SECRET`) matches the NG stack and DB. |

### 2.1 Fix: "Database error querying schema" (NULL string columns in auth.users)

If Auth logs show **"converting NULL to string is unsupported"** for a column in `auth.users` (e.g. `confirmation_token`, `email_change`), GoTrue’s client cannot scan NULL into a string field. Apply the one-time data fix on the NG DB:

```bash
scp -i ~/.ssh/castorworks_deploy scripts/fix-auth-users-confirmation-token-null.sql castorworks:/tmp/
ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/fix-auth-users-confirmation-token-null.sql"
```

Then retry sign-in. Re-run this script after creating users via DB seed or admin API if they have NULL in those columns.

---

## 3. Create a user via Admin API or DB (workaround)

If the **signup form** (create-user Edge Function) is not yet deployed or AUTH_INTERNAL_URL is not set, you can create a user manually:

- **Preferred:** Use the **create-user** Edge Function from the app (signup form). Ensure **AUTH_INTERNAL_URL** is set in the Edge Function environment so it calls Auth without going through Kong.
- **Script (goes through Kong, may 403):** From the **CastorWorks-NG** repo root:
  ```bash
  ./scripts/create-ng-auth-user.sh 'your@email.com' 'YourSecurePassword'
  ```
  This calls `POST /auth/v1/admin/users` on the NG Kong (port 8003). If you see 403 bad_jwt, the token is being corrupted by Kong; use the DB seed below instead.
- **DB seed (no Kong):** Run `scripts/seed-ng-auth-user.sql` against the NG DB (e.g. `docker exec -i <db-container> psql -U postgres -d postgres < scripts/seed-ng-auth-user.sql`) to insert the first user directly into `auth.users` and `auth.identities`, then assign a role in `public.user_roles`.

If the script fails with 403, run the same request by hand on the server (same limitation: Kong may corrupt the JWT):

```bash
# On the server (or via ssh), with SERVICE_ROLE_KEY from docs/.env.supabase:
curl -s -X POST 'http://127.0.0.1:8003/auth/v1/admin/users' \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -d '{"email":"your@email.com","password":"YourSecurePassword","email_confirm":true}'
```

---

## 4. Checklist

- [ ] Set `SITE_URL` and `API_EXTERNAL_URL` to `https://devng.castorworks.cloud` in docs/.env.supabase and on the server’s NG .env.
- [ ] For signup via the app: set **AUTH_INTERNAL_URL** (e.g. `http://auth:9999`) in the Edge Function runtime env so the create-user function calls Auth without going through Kong.
- [ ] Copy updated .env to server and restart Auth: `docker compose restart auth`.
- [ ] Deploy the **create-user** Edge Function and try signup again from the app.
- [ ] If it still fails: run `docker compose logs -f auth` and reproduce signup; note the error in the logs.
- [ ] As fallback: create a user via `./scripts/create-ng-auth-user.sh <email> <password>` or DB seed `scripts/seed-ng-auth-user.sql`.
- [ ] Fix the root cause (SMTP, DB trigger, or Auth config) using the logs and the table above.

---

## 5. Validate sign-in and sign-up (E2E)

After sign-in and signup work in the browser, run the **auth E2E** to validate automatically:

**Prerequisites**

- `.env.testing` with `ACCOUNT_TEST_EMAIL` and `ACCOUNT_TEST_EMAIL_PASSWORD`. Use the seeded NG user (created via DB; see runbook §3): **amacedo.usa@gmail.com** / **TempPass123!** — sign in at https://devng.castorworks.cloud and change password after first login.
- CastorWorks-NG dev server on **port 5181** (e.g. `./castorworks.sh start`).
- **agent-browser** installed and working (E2E uses it; no Playwright).

**Run**

```bash
bash scripts/agent-browser-e2e.sh auth-signin-signup
# or
BASE_URL=http://localhost:5181 npm run test:e2e -- auth-signin-signup
```

**If you see "Daemon failed to start"**

The failure comes from **agent-browser** (its browser daemon did not start), not from the app or the E2E script. Fixes:

1. **Upgrade agent-browser** to 0.8.7 or later (older versions often fail when run from scripts):  
   `npm i -g agent-browser@latest`
2. Run the E2E from a normal terminal (not a non-TTY runner) with the app already on 5181.
3. If still failing: no display/headless (e.g. CI or SSH without a virtual display), or agent-browser not on `PATH`.
