-- Fix: GoTrue fails with "converting NULL to string is unsupported" when scanning
-- auth.users: it expects string columns to be non-NULL. Set all nullable string
-- columns to '' where NULL so Scan succeeds.
-- Run on NG DB: docker exec -i castorworks-ng-db psql -U postgres -d postgres -f -
-- See: .planning/debug/auth-signin-failed-fetch.md

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '');
