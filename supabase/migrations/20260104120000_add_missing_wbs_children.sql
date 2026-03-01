BEGIN;
INSERT INTO public.project_wbs_template_items (
  id, template_id, parent_id, item_type, name, description, sort_order, wbs_code, code_path, standard_cost_code, standard_duration_days
)
VALUES
  ('00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001002', 'deliverable', 'Excavation', 'Excavation for foundation', 1, '2.1', '002.001', 'EQP', 3),
  ('00000000-0000-0000-0000-000000002102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001002', 'deliverable', 'Footings', 'Foundation footings construction', 2, '2.2', '002.002', 'MAT', 5),
  ('00000000-0000-0000-0000-000000002103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001002', 'deliverable', 'Foundation Walls', 'Foundation wall construction', 3, '2.3', '002.003', 'MAT', 7)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.project_wbs_template_items (
  id, template_id, parent_id, item_type, name, description, sort_order, wbs_code, code_path, standard_cost_code, standard_duration_days
)
VALUES
  ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001003', 'deliverable', 'Floor Framing', 'Floor joists and subflooring', 1, '3.1', '003.001', 'MAT', 4),
  ('00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001003', 'deliverable', 'Wall Framing', 'Wall stud construction', 2, '3.2', '003.002', 'MAT', 6),
  ('00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001003', 'deliverable', 'Roof Framing', 'Roof truss installation', 3, '3.3', '003.003', 'MAT', 5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.project_wbs_template_items (
  id, template_id, parent_id, item_type, name, description, sort_order, wbs_code, code_path, standard_cost_code, standard_duration_days
)
VALUES
  ('00000000-0000-0000-0000-000000004101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001004', 'deliverable', 'Electrical Rough-In', 'Electrical wiring and outlets', 1, '4.1', '004.001', 'MO', 8),
  ('00000000-0000-0000-0000-000000004102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001004', 'deliverable', 'Plumbing Rough-In', 'Plumbing pipe installation', 2, '4.2', '004.002', 'MO', 6),
  ('00000000-0000-0000-0000-000000004103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001004', 'deliverable', 'HVAC Rough-In', 'HVAC ductwork installation', 3, '4.3', '004.003', 'MO', 5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.project_wbs_template_items (
  id, template_id, parent_id, item_type, name, description, sort_order, wbs_code, code_path, standard_cost_code, standard_duration_days
)
VALUES
  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001005', 'deliverable', 'Insulation Installation', 'Wall and ceiling insulation', 1, '5.1', '005.001', 'MAT', 4),
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001005', 'deliverable', 'Drywall Installation', 'Drywall hanging and taping', 2, '5.2', '005.002', 'MAT', 7),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001005', 'deliverable', 'Drywall Finishing', 'Drywall mudding and sanding', 3, '5.3', '005.003', 'MO', 5)
ON CONFLICT (id) DO NOTHING;

COMMIT;