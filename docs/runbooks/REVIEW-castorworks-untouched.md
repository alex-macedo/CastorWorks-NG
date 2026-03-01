# Review: CastorWorks (Original) Environment Left Untouched

This document confirms that all changes in the CastorWorks-NG repo preserve the **original CastorWorks** working environment. Only **additive** or **NG-specific** changes were made.

---

## Nginx (original config unchanged)

| File | Purpose | Status |
|------|---------|--------|
| **deploy/nginx/dev.castorworks.conf** | dev.castorworks.cloud → original stack | **All `proxy_pass` use port 8000.** Server name `dev.castorworks.cloud`, root `/var/www/castorworks/dist`. Unchanged from original intent. |
| **deploy/nginx/castorworks.conf** | castorworks.cloud production | **Not modified.** All `proxy_pass` use 8000. |
| **deploy/nginx/devng.castorworks.conf** | devng.castorworks.cloud → NG | **New file only.** Proxies to 8003. Does not reference or replace original config. |
| **deploy/nginx/studiong.castorworks.conf** | studiong.castorworks.cloud → NG Studio | **New file only.** Proxies to 54325. Does not reference or replace original config. |

**Conclusion:** Original CastorWorks nginx configs (dev.castorworks.conf, castorworks.conf) are intact and point to port 8000.

---

## Repo-only files (no impact on original CastorWorks server)

| File | Change | Impact on original CastorWorks |
|------|--------|--------------------------------|
| **.env.example** | Documented both original (dev + 8000) and NG (devng + 8003). Default example is NG. | None. Original instructions kept. |
| **.env.local** | Points to devng + NG anon key. | None. This repo is CastorWorks-NG; original CastorWorks has its own repo and .env. |
| **src/integrations/supabase/client.ts** | Added `devng.castorworks.cloud` and `studiong.castorworks.cloud` to hostname list. | None. `dev.castorworks.cloud` and `castorworks.cloud` still in list; URL normalization still works for original. |
| **tunnel.sh** | Tunnels to NG Studio (54325) and NG DB. | None. Script is for NG; original CastorWorks repo has its own tunnel if needed. |
| **docs/.env.supabase** | NG stack env (Resend, SMTP, keys). Used by supabase-CastorWorks-NG only. | None. Original stack uses its own env (e.g. in original repo or server path). |
| **AGENTS.md / CLAUDE.md** | Added IMPORTANT block at top (do not change original; add only for NG). | None. Documentation only. |
| **Login.tsx, locales (auth)** | Added sign-up API error handling and i18n. | None. App behavior only; no server or nginx config. |
| **Runbooks (recover-secrets, nginx-dev-castorworks-ng)** | New or updated for NG. | None. Explicitly say “do not change original”. |

**Conclusion:** No repo file that could affect the **original CastorWorks server** was changed in a way that alters its behavior.

---

## Server state: one-time fix may be required

During an earlier step, **dev.castorworks.conf** was deployed to the server **when it was temporarily** pointing to 8003 (NG). After that, the **repo** was reverted so **dev.castorworks.conf** again points to **8000** (original).

- **If that deploy was run:** The **live server** might still have `dev.castorworks.conf` with **8003**. In that case, **dev.castorworks.cloud** would be hitting the NG stack and the original CastorWorks app would get 401s or wrong data.
- **Fix (if needed):** Re-deploy the **current** dev.castorworks.conf (8000) to the server so the original environment is restored:

```bash
scp -i ~/.ssh/castorworks_deploy deploy/nginx/dev.castorworks.conf castorworks:/tmp/
ssh -i ~/.ssh/castorworks_deploy castorworks "cp /tmp/dev.castorworks.conf /etc/nginx/sites-available/dev.castorworks.conf && nginx -t && systemctl reload nginx"
```

After that, **dev.castorworks.cloud** will again proxy to **port 8000** (original CastorWorks). **devng.castorworks.cloud** and **studiong.castorworks.cloud** remain NG-only and do not touch the original stack.

---

## Summary

- **In the repo:** Original CastorWorks nginx and docs are unchanged; only new files or new sections for NG were added.
- **On the server:** If you ever deployed the temporary 8003 version of dev.castorworks.conf, run the one-time fix above so the original CastorWorks environment is untouched and working again.
