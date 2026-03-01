-- Migration: Create Demo Users RPC
-- Description: Functions to create/delete demo users via SQL instead of Edge Functions

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create demo users
CREATE OR REPLACE FUNCTION create_demo_users(users json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  user_data json;
  v_email text;
  v_name text;
  v_role text;
  v_avatar_url text;
  v_user_id uuid;
  v_created_users json[] := ARRAY[]::json[];
  v_errors json[] := ARRAY[]::json[];
BEGIN
  FOR user_data IN SELECT * FROM json_array_elements(users)
  LOOP
    BEGIN
      v_email := user_data->>'email';
      v_name := user_data->>'name';
      v_role := user_data->>'role';
      v_avatar_url := user_data->>'avatar_url';
      
      -- Check if user exists
      SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
      
      IF v_user_id IS NULL THEN
        -- Create user
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
          id,
          instance_id,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          role,
          aud
        ) VALUES (
          v_user_id,
          '00000000-0000-0000-0000-000000000000',
          v_email,
          crypt('Demo123!', gen_salt('bf')),
          now(),
          '{"provider": "email", "providers": ["email"]}',
          json_build_object('display_name', v_name, 'is_demo_user', true, 'created_by_demo_seed', true),
          now(),
          now(),
          'authenticated',
          'authenticated'
        );
        
        -- Create identity
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          v_user_id,
          v_user_id,
          json_build_object('sub', v_user_id, 'email', v_email),
          'email',
          now(),
          now(),
          now()
        );
      END IF;
      
      -- Create profile if not exists
      INSERT INTO public.user_profiles (user_id, display_name, email, avatar_url)
      VALUES (v_user_id, v_name, v_email, v_avatar_url)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Create role if not exists
      -- Map role names
      IF v_role = 'project_manager' THEN v_role := 'project_manager';
      ELSIF v_role = 'manager' THEN v_role := 'manager';
      ELSE v_role := 'client';
      END IF;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, v_role)
      ON CONFLICT DO NOTHING;
      
      v_created_users := array_append(v_created_users, json_build_object(
        'email', v_email,
        'user_id', v_user_id
      ));
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, json_build_object('email', v_email, 'error', SQLERRM));
    END;
  END LOOP;
  
  RETURN json_build_object(
    'created', to_json(v_created_users),
    'errors', to_json(v_errors)
  );
END;
$$;

-- Function to delete demo users
CREATE OR REPLACE FUNCTION delete_demo_users(emails text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email text;
  v_deleted_count int := 0;
BEGIN
  FOREACH v_email IN ARRAY emails
  LOOP
    -- Only delete if marked as demo user to be safe
    DELETE FROM auth.users 
    WHERE email = v_email 
    AND (raw_user_meta_data->>'is_demo_user')::boolean = true;
    
    IF FOUND THEN
      v_deleted_count := v_deleted_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object('deleted_count', v_deleted_count);
END;
$$;
