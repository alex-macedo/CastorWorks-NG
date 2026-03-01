-- Migration: Add offset-based activity template support
-- Date: 2026-01-02
-- Description: Creates construction schedule template with workday offsets and duration fields

-- Insert construction schedule template with 25 activities using workday offsets
-- Offsets represent business days from project start (excluding weekends)
-- Duration calculated as (endOffset - startOffset) + 1

INSERT INTO public.activity_templates (
  template_name,
  description,
  is_default,
  is_system,
  activities
) VALUES (
  'Construction Schedule - Residential',
  'Complete construction schedule for residential projects with 25 phases from project definition to final cleanup. Uses workday offsets for precise scheduling.',
  false,
  true,
  '[
    {
      "sequence": 1,
      "description": "Project Definition",
      "startOffset": 0,
      "endOffset": 8,
      "duration": 9
    },
    {
      "sequence": 2,
      "description": "Earthwork and Site Infrastructure",
      "startOffset": 9,
      "endOffset": 17,
      "duration": 9
    },
    {
      "sequence": 3,
      "description": "Foundation Marking and Excavation",
      "startOffset": 18,
      "endOffset": 26,
      "duration": 9
    },
    {
      "sequence": 4,
      "description": "Rebar Placement",
      "startOffset": 27,
      "endOffset": 35,
      "duration": 9
    },
    {
      "sequence": 5,
      "description": "Foundation Filling",
      "startOffset": 36,
      "endOffset": 44,
      "duration": 9
    },
    {
      "sequence": 6,
      "description": "Waterproofing",
      "startOffset": 45,
      "endOffset": 45,
      "duration": 1
    },
    {
      "sequence": 7,
      "description": "Masonry (Walls) and Columns",
      "startOffset": 45,
      "endOffset": 70,
      "duration": 26
    },
    {
      "sequence": 8,
      "description": "Beams and Closures",
      "startOffset": 71,
      "endOffset": 85,
      "duration": 15
    },
    {
      "sequence": 9,
      "description": "Slab Preparation and Conduits",
      "startOffset": 86,
      "endOffset": 96,
      "duration": 11
    },
    {
      "sequence": 10,
      "description": "Slab Filling",
      "startOffset": 97,
      "endOffset": 104,
      "duration": 8
    },
    {
      "sequence": 11,
      "description": "Plastering/Rendering, Second Floor Masonry (if applicable)",
      "startOffset": 105,
      "endOffset": 120,
      "duration": 16
    },
    {
      "sequence": 12,
      "description": "Plumbing",
      "startOffset": 121,
      "endOffset": 126,
      "duration": 6
    },
    {
      "sequence": 13,
      "description": "Electrical",
      "startOffset": 127,
      "endOffset": 254,
      "duration": 128
    },
    {
      "sequence": 14,
      "description": "Floor Screed",
      "startOffset": 255,
      "endOffset": 266,
      "duration": 12
    },
    {
      "sequence": 15,
      "description": "Glazing",
      "startOffset": 267,
      "endOffset": 275,
      "duration": 9
    },
    {
      "sequence": 16,
      "description": "Wall Finishing Compound",
      "startOffset": 276,
      "endOffset": 293,
      "duration": 18
    },
    {
      "sequence": 17,
      "description": "Flooring and Wall Tiles",
      "startOffset": 294,
      "endOffset": 305,
      "duration": 12
    },
    {
      "sequence": 18,
      "description": "Roofing (Second Slab if applicable), Gutters and Flashing",
      "startOffset": 306,
      "endOffset": 314,
      "duration": 9
    },
    {
      "sequence": 19,
      "description": "Drip Edges and Touch-ups",
      "startOffset": 315,
      "endOffset": 326,
      "duration": 12
    },
    {
      "sequence": 20,
      "description": "Grass and External Concrete Area",
      "startOffset": 327,
      "endOffset": 335,
      "duration": 9
    },
    {
      "sequence": 21,
      "description": "Facade and Front",
      "startOffset": 336,
      "endOffset": 347,
      "duration": 12
    },
    {
      "sequence": 22,
      "description": "Marble (Countertops, Sinks, etc)",
      "startOffset": 348,
      "endOffset": 356,
      "duration": 9
    },
    {
      "sequence": 23,
      "description": "Painting",
      "startOffset": 357,
      "endOffset": 381,
      "duration": 25
    },
    {
      "sequence": 24,
      "description": "Final Fixtures (Sanitaryware, Valves, etc)",
      "startOffset": 382,
      "endOffset": 390,
      "duration": 9
    },
    {
      "sequence": 25,
      "description": "Final Cleaning and Inspection",
      "startOffset": 391,
      "endOffset": 399,
      "duration": 9
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add comment explaining the offset-based template structure
COMMENT ON COLUMN activity_templates.activities IS 
'JSONB array of activities. Supports two modes:
1. Offset-based (new): {sequence, description, startOffset, endOffset, duration}
   - startOffset/endOffset are workday offsets from project start date
   - duration should equal (endOffset - startOffset) + 1
2. Duration-based (legacy): {sequence, name, defaultDays}
   - defaultDays is the number of days for sequential calculation';
