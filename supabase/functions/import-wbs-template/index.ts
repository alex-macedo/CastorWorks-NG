import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceRoleClient, authenticateRequest, verifyProjectAccess } from "../_shared/authorization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WBSNodeTemplate {
  code: string;
  title: string;
  level: number;
  parentCode?: string;
  description?: string;
}

const BRAZILIAN_RESIDENTIAL_TEMPLATE: WBSNodeTemplate[] = [
  { code: "01", title: "Infrastructure", level: 1, description: "Foundations and earthworks" },
  { code: "01.01", title: "Foundations", level: 2, parentCode: "01" },
  { code: "01.02", title: "Earthworks", level: 2, parentCode: "01" },
  { code: "02", title: "Superstructure", level: 1, description: "Structural elements" },
  { code: "02.01", title: "Concrete Frame", level: 2, parentCode: "02" },
  { code: "02.02", title: "Masonry", level: 2, parentCode: "02" },
  { code: "03", title: "Finishes", level: 1, description: "Interior and exterior finishes" },
  { code: "03.01", title: "Flooring", level: 2, parentCode: "03" },
  { code: "03.02", title: "Painting", level: 2, parentCode: "03" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await authenticateRequest(req);
    const { project_id, template_name } = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project access
    await verifyProjectAccess(user.id, project_id);

    const supabase = createServiceRoleClient();

    let template: WBSNodeTemplate[] = [];
    if (template_name === "brazilian_residential") {
      template = BRAZILIAN_RESIDENTIAL_TEMPLATE;
    } else {
      return new Response(JSON.stringify({ error: "Invalid template name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const createdNodes: Record<string, string> = {};

    // Process levels sequentially to handle parent-child relationships
    for (let currentLevel = 1; currentLevel <= 4; currentLevel++) {
      const levelNodes = template.filter((n) => n.level === currentLevel);

      for (const node of levelNodes) {
        const parent_id = node.parentCode ? createdNodes[node.parentCode] : null;

        const { data, error } = await supabase
          .from("project_wbs_nodes")
          .upsert(
            {
              project_id,
              code: node.code,
              title: node.title,
              level: node.level,
              description: node.description,
              parent_id,
            },
            { onConflict: "project_id, code" }
          )
          .select("id")
          .single();

        if (error) {
          console.error(`Error creating WBS node ${node.code}:`, error);
          throw error;
        }

        createdNodes[node.code] = data.id;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `WBS template '${template_name}' imported successfully.` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("WBS Import Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
