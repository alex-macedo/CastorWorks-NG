import {
  assertArrayIncludes,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.env.set(
  "SUPABASE_URL",
  Deno.env.get("SUPABASE_URL") ?? "https://test.supabase",
);
Deno.env.set(
  "SUPABASE_SERVICE_ROLE_KEY",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "service-role-key",
);
Deno.env.set(
  "SUPABASE_ANON_KEY",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "anon-key",
);
Deno.env.set("SUPABASE_ENV", Deno.env.get("SUPABASE_ENV") ?? "test");

type TaskRow = {
  id: string;
  title: string;
  due_date: string;
  status: string;
  status_id?: string | null;
};

type MockConfig = {
  role: string;
  isAllowed: boolean;
  project?: { id: string; name: string } | null;
  tasks?: TaskRow[];
  completedStatusId?: string | null;
};

function createSupabaseMock(config: MockConfig) {
  const state = {
    logs: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    inserts: [] as Array<Record<string, unknown>>,
    selects: [] as Array<Record<string, unknown>>,
  };

  const resolveSelect = (table: string) => {
    switch (table) {
      case "user_roles":
        return { data: [{ role: config.role }], error: null };
      case "castormind_tool_permissions":
        return { data: [{ is_allowed: config.isAllowed }], error: null };
      case "projects":
        return { data: config.project ? [config.project] : [], error: null };
      case "architect_tasks":
        return { data: config.tasks || [], error: null };
      case "project_task_statuses":
        return {
          data: config.completedStatusId
            ? [{ id: config.completedStatusId, is_completed: true }]
            : [],
          error: null,
        };
      default:
        return { data: [], error: null };
    }
  };

  const buildSelectChain = (table: string) => {
    const filters: Record<string, unknown> = {};

    const chain = {
      eq(field: string, value: unknown) {
        filters[`eq:${field}`] = value;
        return chain;
      },
      ilike(field: string, value: unknown) {
        filters[`ilike:${field}`] = value;
        return chain;
      },
      lte(field: string, value: unknown) {
        filters[`lte:${field}`] = value;
        return chain;
      },
      limit(value: number) {
        state.selects.push({ table, filters: { ...filters }, limit: value });
        return Promise.resolve(resolveSelect(table));
      },
    };

    return chain;
  };

  const mock = {
    state,
    from(table: string) {
      return {
        select(_columns: string) {
          return buildSelectChain(table);
        },
        update(payload: Record<string, unknown>) {
          return {
            in(field: string, values: unknown[]) {
              state.updates.push({ table, payload, field, values });
              return Promise.resolve({ error: null });
            },
            eq(field: string, value: unknown) {
              state.updates.push({ table, payload, field, value });
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(payload: unknown) {
          state.inserts.push({ table, payload });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    rpc(name: string, params: Record<string, unknown>) {
      if (name === "log_message") {
        state.logs.push(params);
        return Promise.resolve({ data: null, error: null });
      }
      throw new Error(`Unexpected rpc: ${name}`);
    },
  };

  return mock;
}

function buildRequest(body: Record<string, unknown>) {
  return new Request("https://example.com/functions/v1/super-bot-assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
      "user-agent": "deno-test",
    },
    body: JSON.stringify(body),
  });
}

async function importSuperBotModule() {
  const modPath =
    new URL("../super-bot-assistant/index.ts", import.meta.url).pathname;
  return await import(`${modPath}?test=${crypto.randomUUID()}`);
}

function llmResponse(projectIdentifier = "Project Alpha") {
  return {
    content: JSON.stringify({
      intent: "update_tasks_until_today",
      project_identifier: projectIdentifier,
      until_date: "current_date",
      as_of_date: null,
      force_update: false,
      override_phrase: null,
    }),
    provider: "test",
    model: "stub",
  };
}

Deno.test("super-bot blocks update_tasks_until_today for unauthorized roles", async () => {
  const mod = await importSuperBotModule();
  const supabase = createSupabaseMock({
    role: "viewer",
    isAllowed: false,
  });

  const response = await mod.handleRequest(
    buildRequest({
      message: 'update tasks for project "Project Alpha" until today',
      sessionId: "session-1",
      language: "en-US",
    }),
    {
      authenticateRequest: async () => ({
        user: { id: "user-1" },
        token: "fake-token",
      }),
      createServiceRoleClient: () => supabase,
      getAICompletion: async () => llmResponse(),
    },
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertStringIncludes(body.message, "You are not authorized");
  assertEquals(body.results, []);
  assertArrayIncludes(
    supabase.state.logs.map((entry) => entry.p_category),
    ["ai.superbot.permission.blocked", "ai.superbot.response"],
  );
  assertEquals(
    supabase.state.inserts.some((entry) => entry.table === "ai_chat_messages"),
    true,
  );
});

Deno.test("super-bot updates only pending tasks and logs mutation details", async () => {
  const mod = await importSuperBotModule();
  const supabase = createSupabaseMock({
    role: "admin",
    isAllowed: true,
    project: { id: "project-1", name: "Project Alpha" },
    completedStatusId: "status-completed",
    tasks: [
      {
        id: "task-1",
        title: "Open task",
        due_date: "2026-03-28",
        status: "open",
      },
      {
        id: "task-2",
        title: "In progress task",
        due_date: "2026-03-29",
        status: "in_progress",
      },
      {
        id: "task-3",
        title: "Completed task",
        due_date: "2026-03-27",
        status: "completed",
      },
      {
        id: "task-4",
        title: "Done task",
        due_date: "2026-03-26",
        status: "done",
      },
    ],
  });

  const response = await mod.handleRequest(
    buildRequest({
      message: 'update tasks for project "Project Alpha" until today',
      sessionId: "session-2",
      language: "en-US",
    }),
    {
      authenticateRequest: async () => ({
        user: { id: "user-2" },
        token: "fake-token",
      }),
      createServiceRoleClient: () => supabase,
      getAICompletion: async () => llmResponse(),
    },
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertStringIncludes(
    body.message,
    "Updated 2 tasks to completed for project Project Alpha",
  );
  assertEquals(body.results[0].data.task_ids, ["task-1", "task-2"]);
  assertEquals(supabase.state.updates.length, 1);
  const firstUpdate = supabase.state.updates[0] as {
    payload: { updated_at: string; status: string; status_id: string };
    values: string[];
  };
  assertEquals(firstUpdate.payload, {
    status: "completed",
    updated_at: firstUpdate.payload.updated_at,
    status_id: "status-completed",
  });
  assertEquals(firstUpdate.values, ["task-1", "task-2"]);
  assertArrayIncludes(
    supabase.state.logs.map((entry) => entry.p_category),
    [
      "ai.superbot.tool.start",
      "ai.superbot.mutation",
      "ai.superbot.tool.finish",
    ],
  );
  assertEquals(
    supabase.state.logs.some((entry) =>
      entry.p_component === "super-bot-assistant"
    ),
    true,
  );
});

Deno.test("super-bot blocks bulk updates over 100 tasks without override", async () => {
  const mod = await importSuperBotModule();
  const supabase = createSupabaseMock({
    role: "admin",
    isAllowed: true,
    project: { id: "project-1", name: "Project Alpha" },
    tasks: Array.from({ length: 101 }, (_, index) => ({
      id: `task-${index + 1}`,
      title: `Task ${index + 1}`,
      due_date: "2026-03-29",
      status: "open",
    })),
  });

  const response = await mod.handleRequest(
    buildRequest({
      message: 'update tasks for project "Project Alpha" until today',
      sessionId: "session-3",
      language: "en-US",
    }),
    {
      authenticateRequest: async () => ({
        user: { id: "user-3" },
        token: "fake-token",
      }),
      createServiceRoleClient: () => supabase,
      getAICompletion: async () => llmResponse(),
    },
  );

  const body = await response.json();
  assertStringIncludes(
    body.message,
    "Guardrail blocked: 101 tasks would be updated",
  );
  assertEquals(supabase.state.updates.length, 0);
  assertArrayIncludes(
    supabase.state.logs.map((entry) => entry.p_category),
    ["ai.superbot.guardrail.blocked"],
  );
});

Deno.test("super-bot still blocks bulk updates when forceUpdate is true but override phrase is wrong", async () => {
  const mod = await importSuperBotModule();
  const supabase = createSupabaseMock({
    role: "admin",
    isAllowed: true,
    project: { id: "project-1", name: "Project Alpha" },
    tasks: Array.from({ length: 101 }, (_, index) => ({
      id: `task-${index + 1}`,
      title: `Task ${index + 1}`,
      due_date: "2026-03-29",
      status: "open",
    })),
  });

  const response = await mod.handleRequest(
    buildRequest({
      message: 'update tasks for project "Project Alpha" until today',
      sessionId: "session-4",
      language: "en-US",
      forceUpdate: true,
      overridePhrase: "not the phrase",
    }),
    {
      authenticateRequest: async () => ({
        user: { id: "user-4" },
        token: "fake-token",
      }),
      createServiceRoleClient: () => supabase,
      getAICompletion: async () => llmResponse(),
    },
  );

  const body = await response.json();
  assertStringIncludes(
    body.message,
    "Guardrail blocked: 101 tasks would be updated",
  );
  assertEquals(supabase.state.updates.length, 0);
});

Deno.test("super-bot allows bulk updates only when forceUpdate and exact override phrase are both provided", async () => {
  const mod = await importSuperBotModule();
  const supabase = createSupabaseMock({
    role: "admin",
    isAllowed: true,
    project: { id: "project-1", name: "Project Alpha" },
    tasks: Array.from({ length: 101 }, (_, index) => ({
      id: `task-${index + 1}`,
      title: `Task ${index + 1}`,
      due_date: "2026-03-29",
      status: "open",
    })),
  });

  const response = await mod.handleRequest(
    buildRequest({
      message: 'update tasks for project "Project Alpha" until today',
      sessionId: "session-5",
      language: "en-US",
      forceUpdate: true,
      overridePhrase: "override bulk update",
    }),
    {
      authenticateRequest: async () => ({
        user: { id: "user-5" },
        token: "fake-token",
      }),
      createServiceRoleClient: () => supabase,
      getAICompletion: async () => llmResponse(),
    },
  );

  const body = await response.json();
  assertStringIncludes(
    body.message,
    "Updated 101 tasks to completed for project Project Alpha",
  );
  assertEquals(supabase.state.updates.length, 1);
  const bulkUpdate = supabase.state.updates[0] as { values: string[] };
  assertEquals(bulkUpdate.values.length, 101);
});
