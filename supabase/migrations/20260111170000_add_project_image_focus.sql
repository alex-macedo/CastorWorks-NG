ALTER TABLE projects ADD COLUMN image_focus_point jsonb DEFAULT '{"x": 50, "y": 50}'::jsonb;
