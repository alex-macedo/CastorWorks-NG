import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  processRetryQueueJob,
  replayRetryableIntent,
} from "../_shared/superBotRetryQueue.ts";

type RecordedUpdate = {
  table: string;
  values: Record<string, unknown>;
  filters: Array<{ column: string; value: unknown }>;
};

function createQueueSupabaseStub() {
  const updates: RecordedUpdate[] = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  return {
    updates,
    rpcCalls,
    client: {
      from(table: string) {
        return {
          update(values: Record<string, unknown>) {
            return {
              eq(column: string, value: unknown) {
                updates.push({ table, values, filters: [{ column, value }] });
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
      rpc(fn: string, args: Record<string, unknown>) {
        rpcCalls.push({ fn, args });
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
}

function createUpdateTasksSupabaseStub() {
  const taskUpdates: Array<{ ids: string[]; values: Record<string, unknown> }> = [];

  return {
    taskUpdates,
    client: {
      from(table: string) {
        if (table === "projects") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            ilike() {
              return this;
            },
            limit() {
              return Promise.resolve({
                data: [{ id: "project-1", name: "Tower A" }],
                error: null,
              });
            },
          };
        }

        if (table === "architect_tasks") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            lte() {
              return this;
            },
            limit() {
              return Promise.resolve({
                data: [
                  { id: "task-1", title: "Task 1", due_date: "2026-03-29", status: "todo", status_id: null },
                  { id: "task-2", title: "Task 2", due_date: "2026-03-29", status: "in_progress", status_id: null },
                ],
                error: null,
              });
            },
            update(values: Record<string, unknown>) {
              return {
                in(_column: string, ids: string[]) {
                  taskUpdates.push({ ids, values });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "project_task_statuses") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            limit() {
              return Promise.resolve({
                data: [{ id: "completed-status", is_completed: true }],
                error: null,
              });
            },
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
      rpc() {
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
}

Deno.test("processRetryQueueJob marks retried jobs succeeded after replay", async () => {
  const stub = createQueueSupabaseStub();

  const result = await processRetryQueueJob({
    supabase: stub.client as any,
    job: {
      id: "job-1",
      intent: "update_tasks_until_today",
      attempts: 0,
      max_attempts: 5,
      backoff_seconds: 60,
      payload: {},
    },
    now: new Date("2026-03-29T13:00:00.000Z"),
    replayIntent: () => Promise.resolve({
      outcome: "updated",
      details: { updatedCount: 2 },
    }),
  });

  assertEquals(result.status, "succeeded");
  assertEquals(stub.updates.length, 2);
  assertEquals(stub.updates[0].values.status, "processing");
  assertEquals(stub.updates[0].values.attempts, 1);
  assertEquals(stub.updates[1].values.status, "succeeded");
  assertEquals(stub.updates[1].values.last_error, null);
});

Deno.test("processRetryQueueJob requeues failed jobs with exponential backoff before exhaustion", async () => {
  const stub = createQueueSupabaseStub();

  const result = await processRetryQueueJob({
    supabase: stub.client as any,
    job: {
      id: "job-2",
      intent: "update_tasks_until_today",
      attempts: 1,
      max_attempts: 5,
      backoff_seconds: 60,
      payload: {},
    },
    now: new Date("2026-03-29T13:00:00.000Z"),
    replayIntent: () => Promise.reject(new Error("temporary upstream failure")),
  });

  assertEquals(result.status, "queued");
  assertEquals(stub.updates.length, 2);
  assertEquals(stub.updates[1].values.status, "queued");
  assertEquals(stub.updates[1].values.backoff_seconds, 120);
  assertEquals(stub.updates[1].values.last_error, "temporary upstream failure");
  assertStringIncludes(String(stub.updates[1].values.next_run_at), "2026-03-29T13:02:00.000Z");
});

Deno.test("processRetryQueueJob exhausts jobs after the final failed attempt", async () => {
  const stub = createQueueSupabaseStub();

  const result = await processRetryQueueJob({
    supabase: stub.client as any,
    job: {
      id: "job-3",
      intent: "unsupported_intent",
      attempts: 4,
      max_attempts: 5,
      backoff_seconds: 120,
      payload: {},
    },
    now: new Date("2026-03-29T13:00:00.000Z"),
    replayIntent: () => Promise.reject(new Error("unsupported operation")),
  });

  assertEquals(result.status, "exhausted");
  assertEquals(stub.updates.length, 2);
  assertEquals(stub.updates[1].values.status, "exhausted");
  assertEquals(stub.updates[1].values.last_error, "unsupported operation");
  assertStringIncludes(String(stub.updates[1].values.completed_at), "2026-03-29T13:00:00.000Z");
});

Deno.test("replayRetryableIntent re-executes update_tasks_until_today using queued payload", async () => {
  const stub = createUpdateTasksSupabaseStub();

  const result = await replayRetryableIntent(stub.client as any, {
    id: "job-4",
    intent: "update_tasks_until_today",
    payload: {
      message: 'update tasks for project "Tower A" until today',
      llm_intent: {
        intent: "update_tasks_until_today",
        project_identifier: "Tower A",
        until_date: "current_date",
      },
    },
  } as any);

  assertEquals(result.outcome, "updated");
  assertEquals(stub.taskUpdates.length, 1);
  assertEquals(stub.taskUpdates[0].ids, ["task-1", "task-2"]);
  assertEquals(stub.taskUpdates[0].values.status, "completed");
  assertEquals(stub.taskUpdates[0].values.status_id, "completed-status");
});
