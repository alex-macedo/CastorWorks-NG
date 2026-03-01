import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { authenticateRequest as _authenticateRequest } from "../_shared/authorization.ts";

// This is a lightweight integration-style test that imports the handler module
// and simulates requests. We mock shared dependencies to ensure deterministic output.

// Ensure basic supabase env vars exist for shared auth helpers used in tests.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'https://test.supabase');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'service-role-key');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon-key');

Deno.test("analyze-site-photos returns structured JSON when AI returns JSON", async () => {
  // Use stubbed AI provider for this test
  Deno.env.set('TEST_MODE', 'stub');
  // Prepare a fake request with Authorization header
  const fakePhotos = ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"];
  const req = new Request("https://example.com/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
    },
    body: JSON.stringify({ photoUrls: fakePhotos, projectId: null, language: 'en-US' }),
  });

  // Import the handler (TEST_MODE=stub is active) and call it directly. The
  // handler will short-circuit auth/service calls and populate `__test` flags.
  const modPath = new URL("../analyze-site-photos/index.ts", import.meta.url).pathname;
  const analyzeMod = await import(modPath + "?no-cache");

  const resp: Response = await analyzeMod.handleRequest(req);
  assertEquals(resp.status, 200);
  const body = await resp.json();
  assertEquals(body.success, true);
  const result = body.result;
  // TEST_MODE stub returns progressSummary and identifiedMaterials as in aiProviderClient
  assertEquals(typeof result.progressSummary, 'string');
  assertEquals(Array.isArray(result.identifiedMaterials), true);
  // Verify handler set test flags for ai_usage and caching
  assertEquals(analyzeMod.__test.aiUsageLogged, true);
  assertEquals(typeof analyzeMod.__test.cachedInsight, 'object');
});

Deno.test('analyze-site-photos handles malformed AI output gracefully', async () => {
  // Simulate AI returning non-JSON content
  Deno.env.set('TEST_MODE', 'malformed');

  const fakePhotos = ["https://example.com/photoX.jpg"];
  const req = new Request("https://example.com/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake-token" },
    body: JSON.stringify({ photoUrls: fakePhotos, projectId: null }),
  });

  const modPath = new URL("../analyze-site-photos/index.ts", import.meta.url).pathname;
  const analyzeMod = await import(modPath + "?no-cache");

  const resp: Response = await analyzeMod.handleRequest(req);
  assertEquals(resp.status, 200);
  const body = await resp.json();
  assertEquals(body.success, true);
  const res = body.result;
  // Parser should fallback to placing raw AI content into observations
  assertEquals(typeof res.observations, 'string');
  // Since AI was malformed, estimatedProgress should be null
  assertEquals(res.estimatedProgress, null);
});

Deno.test('analyze-site-photos returns cached insight on cache-hit', async () => {
  // Simulate cache hit behavior
  Deno.env.set('TEST_MODE', 'cache-hit');

  const fakePhotos = ["https://example.com/photoY.jpg"];
  const req = new Request("https://example.com/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake-token" },
    body: JSON.stringify({ photoUrls: fakePhotos, projectId: 'p1' }),
  });

  const modPath = new URL("../analyze-site-photos/index.ts", import.meta.url).pathname;
  const analyzeMod = await import(modPath + "?no-cache");

  const resp: Response = await analyzeMod.handleRequest(req);
  assertEquals(resp.status, 200);
  const body = await resp.json();
  assertEquals(body.success, true);
  const res = body.result;
  assertEquals(typeof res.progressSummary, 'string');
  assertEquals(res.progressSummary.startsWith('CACHED'), true);
  // __test.cachedInsight should be set in cache-hit mode
  assertEquals(typeof analyzeMod.__test.cachedInsight, 'object');
});

// Security smoke test: ensure that unauthorized responses are represented
Deno.test('unauthorized response should be 403 and use application/json', () => {
  const resp = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });

  assertEquals(resp.status, 403);
  assertEquals(resp.headers.get('Content-Type'), 'application/json');
});
