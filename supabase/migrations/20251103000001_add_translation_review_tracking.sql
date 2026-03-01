-- Add review tracking fields to config_translations table
ALTER TABLE config_translations
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create index for faster queries on translations needing review
CREATE INDEX IF NOT EXISTS idx_config_translations_needs_review
ON config_translations(needs_review) WHERE needs_review = true;

-- Create a function to mark translations as needing review when source language changes
CREATE OR REPLACE FUNCTION mark_translations_for_review()
RETURNS TRIGGER AS $$
BEGIN
  -- When English (source language) translation is updated, mark other languages for review
  IF NEW.language_code = 'en-US' AND OLD.label IS DISTINCT FROM NEW.label THEN
    UPDATE config_translations
    SET needs_review = true
    WHERE entity_type = NEW.entity_type
      AND entity_id = NEW.entity_id
      AND language_code != 'en-US';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic review marking
DROP TRIGGER IF EXISTS trigger_mark_translations_for_review ON config_translations;
CREATE TRIGGER trigger_mark_translations_for_review
AFTER UPDATE ON config_translations
FOR EACH ROW
EXECUTE FUNCTION mark_translations_for_review();

-- Add comment to explain the fields
COMMENT ON COLUMN config_translations.needs_review IS 'Indicates if this translation needs to be reviewed/updated';
COMMENT ON COLUMN config_translations.last_reviewed_at IS 'Timestamp of the last review';
COMMENT ON COLUMN config_translations.review_notes IS 'Optional notes from the reviewer';
