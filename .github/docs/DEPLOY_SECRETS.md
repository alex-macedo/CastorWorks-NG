# Deploy workflow – required secrets

The **Deploy to Production (app)** workflow (`.github/workflows/deploy.yml`) needs these secrets to build and deploy the CastorWorks-NG app.

Configure them in one of:

- **Settings → Secrets and variables → Actions** (repository secrets), or  
- **Settings → Environments → production** (environment secrets)

The deploy job uses the `production` environment; both repository and environment secrets are available.

## Required secrets

| Secret | Used in | Description |
|--------|--------|-------------|
| `PROD_SSH_PRIVATE_KEY` | Setup SSH, backup, rsync, permissions, nginx | Full private key (PEM), including `-----BEGIN ... PRIVATE KEY-----` and `-----END ... PRIVATE KEY-----`. No extra leading/trailing spaces. |
| `PROD_SSH_HOST` | All SSH/rsync steps | SSH hostname (e.g. `dev.castorworks.cloud` or your server). |
| `PROD_SSH_PORT` | All SSH/rsync steps | SSH port (e.g. `22`). |
| `PROD_SSH_USER` | Backup, deploy, permissions, nginx | SSH user that can write to `/var/www/castorworks-ng` (e.g. `root`). |
| `VITE_SUPABASE_URL` | Build | Supabase URL for the NG app (e.g. `https://devng.castorworks.cloud`). |
| `VITE_SUPABASE_ANON_KEY` | Build | Supabase anon (public) key for the NG project. |

## Validation

The workflow has a **Validate required secrets** step at the start of the deploy job. If any of these are missing or empty, the job fails immediately with a message listing the missing secrets. Fix by adding or updating them in the repo or in the `production` environment, then re-run the workflow.

## Reference in workflow

The same list is documented in the workflow header:

```yaml
# Secrets required: PROD_SSH_PRIVATE_KEY, PROD_SSH_HOST, PROD_SSH_USER, PROD_SSH_PORT,
#                   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```
