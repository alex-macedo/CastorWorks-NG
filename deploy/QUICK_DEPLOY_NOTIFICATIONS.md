# Quick Deployment Reference - Notification System

## 🚀 Quick Start (Automated)

```bash
# From project root
./deploy/deploy-notifications.sh
```

## 📋 Manual Deployment (5 Steps)

### 1️⃣ Copy Migrations to Server

```bash
scp supabase/migrations/202601252000*.sql root@castorworks.cloud:/tmp/
```

### 2️⃣ Apply Migrations

```bash
ssh root@castorworks.cloud
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260125200000_notification_reminders_system.sql
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260125200001_chat_message_notification_trigger.sql
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260125200002_setup_notification_cron.sql
```

### 3️⃣ Deploy Edge Functions

```bash
# From local machine
scp -r supabase/functions/check-due-notifications root@castorworks.cloud:/tmp/
scp -r supabase/functions/notify-chat-message root@castorworks.cloud:/tmp/

# On server
ssh root@castorworks.cloud
docker cp /tmp/check-due-notifications supabase-edge-functions:/var/lib/supabase/functions/
docker cp /tmp/notify-chat-message supabase-edge-functions:/var/lib/supabase/functions/
docker restart supabase-edge-functions
```

### 4️⃣ Update app_settings

```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

```sql
UPDATE app_settings 
SET 
  supabase_url = 'https://dev.castorworks.cloud',
  service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjM4NzQwMDAsImV4cCI6MTkyMTY0MDQwMH0.33jZIICDfhdCnN3Xaf2LhoybZsO-zs1wWN94E-TeXt8'
WHERE id = (SELECT id FROM app_settings LIMIT 1);
```

### 5️⃣ Test

```sql
-- Create test task
INSERT INTO architect_tasks (project_id, title, due_date, assignee_id, status)
VALUES (
  (SELECT id FROM projects LIMIT 1),
  'Test Task',
  CURRENT_DATE + 1,
  (SELECT user_id FROM user_profiles LIMIT 1),
  'todo'
);

-- Check notifications
SELECT * FROM notifications WHERE type LIKE 'task_%' ORDER BY created_at DESC LIMIT 5;
```

## ✅ Verification Commands

```bash
# Check tables exist
docker exec supabase-db psql -U postgres -d postgres -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_name LIKE '%notification%' OR table_name LIKE '%cron%';
"

# Check cron job
docker exec supabase-db psql -U postgres -d postgres -c "
  SELECT * FROM cron.job;
"

# Check Edge Functions
docker exec supabase-edge-functions ls -la /var/lib/supabase/functions/
```

## 🔧 Environment Variables Needed

Add to your Supabase environment:

```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RESEND_API_KEY=your_key
```

## 📚 Full Documentation

- **Automated Script**: `./deploy/deploy-notifications.sh --help`
- **Manual Guide**: `deploy/MANUAL_DEPLOYMENT_NOTIFICATIONS.md`
- **System README**: `NOTIFICATION_SYSTEM_README.md`

## 🆘 Quick Troubleshooting

```bash
# View logs
docker logs supabase-db --tail 50
docker logs supabase-edge-functions --tail 50

# Restart services
docker restart supabase-db
docker restart supabase-edge-functions

# Check cron logs
docker exec supabase-db psql -U postgres -d postgres -c "
  SELECT * FROM cron_job_log ORDER BY executed_at DESC LIMIT 10;
"
```

## 🎯 What You're Deploying

- ✅ 3 Database migrations
- ✅ 2 Edge Functions
- ✅ Cron job (daily at 8 AM UTC)
- ✅ 4 New tables
- ✅ 5 New notification types

---

**Ready?** Run: `./deploy/deploy-notifications.sh`
