-- Migration to fix foreign keys in mobile app tables to allow PostgREST joins with user_profiles
BEGIN;

-- 1. floor_plan_annotations
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'floor_plan_annotations') THEN
        ALTER TABLE public.floor_plan_annotations DROP CONSTRAINT IF EXISTS floor_plan_annotations_assignee_id_fkey;
        ALTER TABLE public.floor_plan_annotations ADD CONSTRAINT floor_plan_annotations_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;
        
        ALTER TABLE public.floor_plan_annotations DROP CONSTRAINT IF EXISTS floor_plan_annotations_created_by_fkey;
        ALTER TABLE public.floor_plan_annotations ADD CONSTRAINT floor_plan_annotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(user_id);
    END IF;
END $$;

-- 2. project_expenses
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_expenses') THEN
        ALTER TABLE public.project_expenses DROP CONSTRAINT IF EXISTS project_expenses_recorded_by_fkey;
        ALTER TABLE public.project_expenses ADD CONSTRAINT project_expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.user_profiles(user_id);
    END IF;
END $$;

-- 3. project_messages
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_messages') THEN
        ALTER TABLE public.project_messages DROP CONSTRAINT IF EXISTS project_messages_user_id_fkey;
        ALTER TABLE public.project_messages ADD CONSTRAINT project_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id);
    END IF;
END $$;

-- 4. meeting_recordings
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_recordings') THEN
        ALTER TABLE public.meeting_recordings DROP CONSTRAINT IF EXISTS meeting_recordings_recorded_by_fkey;
        ALTER TABLE public.meeting_recordings ADD CONSTRAINT meeting_recordings_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.user_profiles(user_id);
    END IF;
END $$;

-- 5. project_emails
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_emails') THEN
        ALTER TABLE public.project_emails DROP CONSTRAINT IF EXISTS project_emails_created_by_fkey;
        ALTER TABLE public.project_emails ADD CONSTRAINT project_emails_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(user_id);
    END IF;
END $$;

-- 6. moodboard_images
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moodboard_images') THEN
        ALTER TABLE public.moodboard_images DROP CONSTRAINT IF EXISTS moodboard_images_created_by_fkey;
        ALTER TABLE public.moodboard_images ADD CONSTRAINT moodboard_images_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(user_id);
    END IF;
END $$;

COMMIT;
