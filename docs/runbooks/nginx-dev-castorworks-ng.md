# Nginx: Separate Hosts for Original vs CastorWorks-NG

**IMPORTANT:** Do not change any existing CastorWorks configuration. The previous CastorWorks working environment is UNTOUCHABLE. Only add new configuration for CastorWorks-NG (e.g. devng, studiong).

**Purpose:** Clear separation so the original CastorWorks and CastorWorks-NG do not affect each other.

| Host | Purpose | Backend |
|------|---------|--------|
| **dev.castorworks.cloud** | Original CastorWorks app + API | Kong 8000 |
| **devng.castorworks.cloud** | CastorWorks-NG app + API | Kong 8003 |
| **studiong.castorworks.cloud** | CastorWorks-NG Supabase Studio only | Studio 54325 |

## Config files in repo

- `deploy/nginx/dev.castorworks.conf` — dev.castorworks.cloud → 8000, static from `/var/www/castorworks/dist`
- `deploy/nginx/devng.castorworks.conf` — devng.castorworks.cloud → 8003, static from `/var/www/castorworks-ng/dist`
- `deploy/nginx/studiong.castorworks.conf` — studiong.castorworks.cloud → 54325 (NG Studio)

## Apply on server (after DNS for devng and studiong)

1. **Obtain SSL certificates** (once DNS points to the server). Ensure **port 80 is open** in your cloud firewall so Let's Encrypt can reach the server for HTTP-01 challenge:
   ```bash
   ssh -i ~/.ssh/castorworks_deploy castorworks "certbot certonly --nginx -d devng.castorworks.cloud -d studiong.castorworks.cloud --non-interactive --agree-tos -m your@email.com"
   ```
   If certbot fails with "Timeout during connect (likely firewall problem)", open inbound TCP port 80 to the server in your cloud security group/firewall, then re-run. Alternatively use DNS-01: `certbot certonly --manual -d devng.castorworks.cloud --preferred-challenges dns`, add the requested TXT record to DNS, then continue.

2. **Copy and enable NG configs:**
   ```bash
   scp -i ~/.ssh/castorworks_deploy deploy/nginx/devng.castorworks.conf deploy/nginx/studiong.castorworks.conf castorworks:/tmp/
   ssh -i ~/.ssh/castorworks_deploy castorworks "
     cp /tmp/devng.castorworks.conf /etc/nginx/sites-available/ &&
     cp /tmp/studiong.castorworks.conf /etc/nginx/sites-available/ &&
     ln -sf /etc/nginx/sites-available/devng.castorworks.conf /etc/nginx/sites-enabled/ &&
     ln -sf /etc/nginx/sites-available/studiong.castorworks.conf /etc/nginx/sites-enabled/ &&
     nginx -t && systemctl reload nginx
   "
   ```

3. **Create NG static deploy directory** (if not present):
   ```bash
   ssh -i ~/.ssh/castorworks_deploy castorworks "mkdir -p /var/www/castorworks-ng/dist"
   ```
   Deploy the CastorWorks-NG build to `/var/www/castorworks-ng/dist` (or symlink to your build).

## App configuration for NG

- **Production / deployed NG app:** Set `VITE_SUPABASE_URL=https://devng.castorworks.cloud` and `VITE_SUPABASE_ANON_KEY` to NG anon key (from `docs/.env.supabase`).
- **Local dev against NG:** In `.env.local`, set `VITE_SUPABASE_URL=https://devng.castorworks.cloud` and the NG anon key.

## Studio

- **NG Studio:** Open https://studiong.castorworks.cloud (no tunnel needed once nginx and SSL are in place). Alternatively keep using `./tunnel.sh` and http://localhost:54323 if you prefer.

## Troubleshooting: Sign-in "Failed to fetch" (status 0) from localhost

If sign-in from local dev (localhost:5181) to `https://devng.castorworks.cloud` fails with "Failed to fetch" or `AuthRetryableFetchError` with **status 0**, the browser is failing **before** any HTTP response—almost always due to **SSL certificate mismatch**.

1. **Check the certificate** from your machine:
   ```bash
   curl -vI https://devng.castorworks.cloud/ 2>&1 | grep -E "subject:|subjectAltName|SSL"
   ```
   If you see `subject: CN=castorworks.cloud` or "subjectAltName does not match target host name 'devng.castorworks.cloud'", the server is serving the wrong cert.

2. **Fix:** Obtain a certificate for `devng.castorworks.cloud` on the server (see step 1 above). Ensure port 80 is open for ACME HTTP-01, then:
   ```bash
   ssh -i ~/.ssh/castorworks_deploy castorworks "certbot certonly --nginx -d devng.castorworks.cloud --non-interactive --agree-tos -m your@email.com && systemctl reload nginx"
   ```
   Verify: `curl -vI https://devng.castorworks.cloud/` should show a cert whose subject/SAN includes `devng.castorworks.cloud`. Sign-in from localhost should then succeed.

## Revert dev.castorworks.conf to NG (optional)

If you ever want dev.castorworks.cloud to point at NG again, change all `8000` to `8003` in `deploy/nginx/dev.castorworks.conf` and reload nginx. With the separate hosts, keeping dev = original and devng = NG is recommended.
