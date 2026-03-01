# Manual Deployment Guide - Notification System

This guide walks you through deploying the notification system to your remote Supabase Docker container.

## Prerequisites

- SSH access to `root@castorworks.cloud`
- Supabase running in Docker container
- Database credentials

## Option 1: Automated Deployment (Recommended)

```bash
# From project root
./deploy/deploy-notifications.sh

# Or for dry-run to see what will happen
./deploy/deploy-notifications.sh --dry-run

# Or deploy only migrations
./deploy/deploy-notifications.sh --migrations-only

# Or deploy only Edge Functions
./deploy/deploy-notifications.sh --functions-only
```

## Option 2: Manual Deployment

### Step 1: Connect to Server

```bash
ssh root@castorworks.cloud
```

### Step 2: Find Your Supabase Container

```bash
# List running containers
docker ps | grep supabase

# Common names: supabase-db, supabase_db_1, postgres
# Note the container name for next steps
```

### Step 3: Apply Database Migrations

From your **local machine**, copy migrations to server:

```bash
# Copy migration files
scp supabase/migrations/20260125200000_notification_reminders_system.sql \
    root@castorworks.cloud:/tmp/

scp supabase/migrations/20260125200001_chat_message_notification_trigger.sql \
    root@castorworks.cloud:/tmp/

scp supabase/migrations/20260125200002_setup_notification_cron.sql \
    root@castorworks.cloud:/tmp/
```

Then on the **server**, apply them:

```bash
# SSH to server
ssh root@castorworks.cloud

# Apply migrations (replace 'supabase-db' with your container name)
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260125200000_notification_reminders_system.sql

docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260125200001_chat_message_notification_trigger.sql

docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260125200002_setup_notification_cron.sql

# Clean up
rm /tmp/202601252000*.sql
```

### Step 4: Verify Migrations

```bash
# Check if tables were created
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'notification_reminder_settings',
        'entity_reminder_overrides',
        'notification_sent_log',
        'cron_job_log'
    );
"

# Check if cron job was created
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT jobname, schedule, active 
    FROM cron.job 
    WHERE jobname = 'check-due-notifications';
"

# Check if notification types were added
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT conname, consrc 
    FROM pg_constraint 
    WHERE conname = 'notifications_type_check';
"
```

### Step 5: Deploy Edge Functions

From your **local machine**:

```bash
# Copy Edge Functions to server
scp -r supabase/functions/check-due-notifications \
    root@castorworks.cloud:/tmp/

scp -r supabase/functions/notify-chat-message \
    root@castorworks.cloud:/tmp/
```

On the **server**:

```bash
# Find your Edge Functions container
docker ps | grep edge

# Copy functions to container (adjust paths based on your setup)
docker cp /tmp/check-due-notifications supabase-edge-functions:/var/lib/supabase/functions/
docker cp /tmp/notify-chat-message supabase-edge-functions:/var/lib/supabase/functions/

# Restart Edge Functions
docker restart supabase-edge-functions

# Clean up
rm -rf /tmp/check-due-notifications /tmp/notify-chat-message
```

### Step 6: Configure Environment Variables

On the **server**, update Supabase environment variables:

```bash
# Edit your Supabase .env file or docker-compose.yml
# Add these variables:

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RESEND_API_KEY=your_resend_api_key
SUPABASE_URL=https://dev.castorworks.cloud
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Restart containers to apply changes
docker-compose restart
```

### Step 7: Update app_settings Table

```bash
# Connect to database
docker exec -it supabase-db psql -U postgres -d postgres

# Run SQL
UPDATE app_settings 
SET 
  supabase_url = 'https://dev.castorworks.cloud',
  service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjM4NzQwMDAsImV4cCI6MTkyMTY0MDQwMH0.33jZIICDfhdCnN3Xaf2LhoybZsO-zs1wWN94E-TeXt8'
WHERE id = (SELECT id FROM app_settings LIMIT 1);

# Verify
SELECT supabase_url, LEFT(service_role_key, 20) || '...' as service_key 
FROM app_settings;

# Exit
\q
```

### Step 8: Test the System

#### Test Task Notifications

```bash
docker exec -it supabase-db psql -U postgres -d postgres

-- Create a test task due tomorrow
INSERT INTO architect_tasks (
  project_id, 
  title, 
  due_date, 
  assignee_id,
  status
) VALUES (
  (SELECT id FROM projects LIMIT 1),
  'Test Notification Task',
  CURRENT_DATE + INTERVAL '1 day',
  (SELECT user_id FROM user_profiles LIMIT 1),
  'todo'
);

-- Manually trigger notification check
SELECT net.http_post(
  url := get_supabase_url() || '/functions/v1/check-due-notifications',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || get_service_role_key(),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);

-- Check if notification was created
SELECT * FROM notifications 
WHERE type IN ('task_due', 'task_due_soon')
ORDER BY created_at DESC 
LIMIT 5;

-- Check sent log
SELECT * FROM notification_sent_log
WHERE entity_type = 'task'
ORDER BY sent_at DESC
LIMIT 5;

\q
```

#### Test Chat Notifications

```bash
docker exec -it supabase-db psql -U postgres -d postgres

-- Insert a test chat message
INSERT INTO chat_messages (
  conversation_id,
  sender_id,
  text
) VALUES (
  (SELECT id FROM chat_conversations LIMIT 1),
  (SELECT user_id FROM user_profiles LIMIT 1),
  'Test notification message'
);

-- Check if notification was created
SELECT * FROM notifications 
WHERE type = 'chat_message'
ORDER BY created_at DESC 
LIMIT 5;

\q
```

### Step 9: Monitor Cron Jobs

```bash
# View cron job logs
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT * FROM cron_job_log 
    ORDER BY executed_at DESC 
    LIMIT 10;
"

# Check cron job status
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT * FROM cron.job;
"
```

## Troubleshooting

### Migrations Failed

```bash
# Check PostgreSQL logs
docker logs supabase-db --tail 100

# Rollback if needed (be careful!)
docker exec -it supabase-db psql -U postgres -d postgres

DROP TABLE IF EXISTS notification_sent_log CASCADE;
DROP TABLE IF EXISTS entity_reminder_overrides CASCADE;
DROP TABLE IF EXISTS notification_reminder_settings CASCADE;
DROP TABLE IF EXISTS cron_job_log CASCADE;

-- Then re-apply migrations
```

### Edge Functions Not Working

```bash
# Check Edge Functions logs
docker logs supabase-edge-functions --tail 100

# Restart Edge Functions
docker restart supabase-edge-functions

# Check if functions are loaded
docker exec supabase-edge-functions ls -la /var/lib/supabase/functions/
```

### Cron Job Not Running

```bash
# Check if pg_cron extension is enabled
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT * FROM pg_extension WHERE extname = 'pg_cron';
"

# If not enabled, enable it
docker exec supabase-db psql -U postgres -d postgres -c "
    CREATE EXTENSION IF NOT EXISTS pg_cron;
"

# Manually trigger cron job
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT cron.schedule(
      'check-due-notifications',
      '0 8 * * *',
      \$\$
      SELECT net.http_post(
        url := get_supabase_url() || '/functions/v1/check-due-notifications',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || get_service_role_key(),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      \$\$
    );
"
```

## Next Steps

1. **Configure Twilio WhatsApp Templates** - See main README
2. **Set up monitoring** - Add alerts for failed notifications
3. **Test with real data** - Create actual tasks and payments
4. **Configure reminder settings** - Use the UI at Settings → Notifications

## Rollback Plan

If you need to rollback:

```bash
# SSH to server
ssh root@castorworks.cloud

# Drop new tables
docker exec -it supabase-db psql -U postgres -d postgres

DROP TABLE IF EXISTS notification_sent_log CASCADE;
DROP TABLE IF EXISTS entity_reminder_overrides CASCADE;
DROP TABLE IF EXISTS notification_reminder_settings CASCADE;
DROP TABLE IF EXISTS cron_job_log CASCADE;

-- Remove cron job
SELECT cron.unschedule('check-due-notifications');
SELECT cron.unschedule('cleanup-old-cron-logs');

-- Revert notification types (optional)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'financial_alert', 
    'project_update', 
    'schedule_change', 
    'material_delivery', 
    'system', 
    'budget_overrun', 
    'milestone_delay'
  ));

\q

# Remove Edge Functions
docker exec supabase-edge-functions rm -rf /var/lib/supabase/functions/check-due-notifications
docker exec supabase-edge-functions rm -rf /var/lib/supabase/functions/notify-chat-message
docker restart supabase-edge-functions
```

---

**Need Help?** Check the full documentation in `NOTIFICATION_SYSTEM_README.md`
