# CastorWorks Production Deployment Guide

This guide explains how to set up and deploy CastorWorks to a clean production environment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Server                         │
│                      (castorworks.cloud)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌──────────────────────────────────────┐   │
│   │   Nginx     │────│  Static Files (/var/www/castorworks) │   │
│   │   (443)     │    │  - index.html                        │   │
│   └──────┬──────┘    │  - /assets/*.js, *.css               │   │
│          │           │  - /sw.js (Service Worker)            │   │
│          │           └──────────────────────────────────────┘   │
│          │                                                       │
│          │ Proxy /rest/v1, /auth/v1, /storage/v1, /functions/v1 │
│          ▼                                                       │
│   ┌─────────────┐    ┌──────────────────────────────────────┐   │
│   │    Kong     │────│  Supabase Services (Docker)          │   │
│   │   (8000)    │    │  - PostgreSQL                        │   │
│   └─────────────┘    │  - PostgREST (REST API)              │   │
│                      │  - GoTrue (Auth)                      │   │
│                      │  - Storage                            │   │
│                      │  - Realtime (WebSocket)               │   │
│                      │  - Edge Functions                     │   │
│                      └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### On Your Local Machine
- Node.js 18+
- npm 9+
- SSH access to production server
- rsync installed

### On Production Server
- Ubuntu 22.04+ (or similar)
- Nginx installed
- Let's Encrypt certificates
- Supabase running in Docker (already configured)

## Initial Server Setup

### 1. Create Deployment Directory

```bash
ssh root@castorworks.cloud

# Create directories
mkdir -p /var/www/castorworks/dist
mkdir -p /var/www/castorworks-backups

# Set ownership
chown -R www-data:www-data /var/www/castorworks
chmod -R 755 /var/www/castorworks
```

### 2. Install Nginx Configuration

Copy the nginx configuration to the server:

```bash
# From your local machine
scp deploy/nginx/castorworks.conf root@castorworks.cloud:/etc/nginx/sites-available/

# On the server
ssh root@castorworks.cloud

# Enable the site
ln -sf /etc/nginx/sites-available/castorworks.conf /etc/nginx/sites-enabled/

# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# If test passes, reload nginx
systemctl reload nginx
```

### 3. SSL Certificate Setup (if not already done)

```bash
# Install certbot
apt update
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d castorworks.cloud -d www.castorworks.cloud

# Verify auto-renewal
certbot renew --dry-run
```

## Deployment Process

### Quick Deploy

From your local machine, in the project root:

```bash
# Make deploy script executable (first time only)
chmod +x deploy/deploy.sh

# Full deployment (runs tests, builds, and deploys)
./deploy/deploy.sh

# Skip tests for faster deployment
./deploy/deploy.sh --skip-tests

# Skip build (use existing dist/)
./deploy/deploy.sh --skip-build

# Dry run (see what would happen)
./deploy/deploy.sh --dry-run
```

### Manual Deployment

If you prefer manual steps:

```bash
# 1. Build locally
npm run build

# 2. Verify build
ls -la dist/

# 3. Upload to server
rsync -avz --delete dist/ root@castorworks.cloud:/var/www/castorworks/dist/

# 4. Set permissions on server
ssh root@castorworks.cloud "chown -R www-data:www-data /var/www/castorworks"

# 5. Reload nginx
ssh root@castorworks.cloud "nginx -t && systemctl reload nginx"
```

## Rollback

To rollback to a previous deployment:

```bash
ssh root@castorworks.cloud

# List available backups
ls -la /var/www/castorworks-backups/

# Rollback to specific backup
BACKUP_NAME="backup_20260111_170000"  # replace with actual backup name
rm -rf /var/www/castorworks/dist
cp -r /var/www/castorworks-backups/${BACKUP_NAME} /var/www/castorworks/dist
chown -R www-data:www-data /var/www/castorworks
systemctl reload nginx
```

## Environment Variables

The production build uses environment variables at **build time**. Make sure your `.env.production` or `.env` has:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://dev.castorworks.cloud
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional
VITE_APP_VERSION=1.0.0
```

**Important:** After changing environment variables, you must rebuild:

```bash
./deploy/deploy.sh
```

## Monitoring & Logs

### View Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/castorworks.access.log

# Error logs
tail -f /var/log/nginx/castorworks.error.log
```

### Check Nginx Status

```bash
systemctl status nginx
```

### Check Supabase Services

```bash
cd /root/supabase-CastorWorks
docker compose ps
docker compose logs -f --tail=100
```

## Troubleshooting

### 502 Bad Gateway

Supabase services not running:
```bash
cd /root/supabase-CastorWorks
docker compose up -d
```

### 403 Forbidden

Permission issues:
```bash
chown -R www-data:www-data /var/www/castorworks
chmod -R 755 /var/www/castorworks
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew if expired
certbot renew
```

### Changes Not Appearing

Clear browser cache or hard refresh (Ctrl+Shift+R). The service worker may cache old content.

```bash
# Also verify the deployment
curl -I https://castorworks.cloud
```

## Cleanup Old Backups

Backups are automatically cleaned (keeping last 5) during deployment. To manually clean:

```bash
ssh root@castorworks.cloud
cd /var/www/castorworks-backups
ls -t | tail -n +6 | xargs -r rm -rf
```

## Security Considerations

1. **No source code on server** - Only compiled assets are deployed
2. **SSL/TLS enforced** - HTTP redirects to HTTPS
3. **Security headers** - X-Frame-Options, CSP, etc.
4. **Rate limiting** - API abuse prevention
5. **Hidden files blocked** - .git, .env, etc.

## Differences from Development

| Aspect | Development | Production |
|--------|-------------|------------|
| Server | Vite dev server (5173) | Nginx (443) |
| HMR | Enabled | N/A (static files) |
| Source maps | Enabled | Optional |
| Caching | None | Aggressive |
| SSL | Optional | Required |
| Build | On-the-fly | Pre-built |
