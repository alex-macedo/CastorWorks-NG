-- Create a single user in auth for CastorWorks-NG (bypasses Auth API).
-- Run against NG DB: docker exec -i castorworks-ng-db psql -U postgres -d postgres -f -
-- Requires: extension pgcrypto for crypt() and gen_salt().

DO $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_email text := 'amacedo.usa@gmail.com';
  v_pass text := 'TempPass123!';
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    'email',
    v_email,
    now(),
    now(),
    now()
  );

  RAISE NOTICE 'User created: % (id: %)', v_email, v_id;
END $$;
