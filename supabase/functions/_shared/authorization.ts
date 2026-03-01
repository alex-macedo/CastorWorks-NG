import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error("Supabase environment variables are not fully configured.");
}

export const createServiceRoleClient = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function authenticateRequest(req: Request): Promise<{ user: User; token: string }> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw new Error("Unauthorized");
  }

  return { user: data.user, token };
}

async function callBooleanFunction(
  functionName: string,
  params: Record<string, unknown>,
  client?: SupabaseClient
): Promise<boolean> {
  const supabaseClient = client ?? createServiceRoleClient();
  const { data, error } = await supabaseClient.rpc(functionName, params);

  if (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw new Error("Unable to verify access");
  }

  return Boolean(data);
}

export async function verifyProjectAccess(
  userId: string,
  projectId?: string | null,
  client?: SupabaseClient
) {
  if (!projectId) return;

  const hasAccess = await callBooleanFunction(
    "has_project_access",
    { _user_id: userId, _project_id: projectId },
    client
  );

  if (!hasAccess) {
    throw new Error("Access denied to this project");
  }
}

export async function verifyProjectAdminAccess(
  userId: string,
  projectId?: string | null,
  client?: SupabaseClient
) {
  if (!projectId) return;

  const hasAccess = await callBooleanFunction(
    "has_project_admin_access",
    { _user_id: userId, _project_id: projectId },
    client
  );

  if (!hasAccess) {
    throw new Error("Administrative access required for this project");
  }
}

export async function verifyAdminRole(userId: string, client?: SupabaseClient) {
  const isAdmin = await callBooleanFunction(
    "has_role",
    { _user_id: userId, _role: "admin" },
    client
  );

  if (!isAdmin) {
    throw new Error("Administrator privileges required for this operation");
  }
}

/**
 * Verifies that the user has access to the tenant and that the tenant has the given module licensed.
 * Call after authenticating and resolving tenantId (e.g. from request body or project → tenant).
 */
export async function verifyModuleAccess(
  client: SupabaseClient,
  userId: string,
  tenantId: string,
  moduleId: string
): Promise<void> {
  const hasTenantAccess = await callBooleanFunction(
    "has_tenant_access",
    { _user_id: userId, _tenant_id: tenantId },
    client
  );
  if (!hasTenantAccess) {
    throw new Error("Access denied to tenant");
  }
  const { data, error } = await client.rpc("get_tenant_licensed_modules", {
    p_tenant_id: tenantId,
  });
  if (error || !Array.isArray(data) || !data.includes(moduleId)) {
    throw new Error("Module not licensed");
  }
}
