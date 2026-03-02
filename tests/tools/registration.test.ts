import assert from "node:assert/strict";
import { test } from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTools } from "../../src/tools/search.js";
import { registerProblemTools } from "../../src/tools/problems.js";
import { registerDiscussionTools } from "../../src/tools/discussions.js";
import { registerInterviewTools } from "../../src/tools/interview.js";

interface RegisteredTool {
  name: string;
  config: Record<string, unknown>;
  handler: (...args: unknown[]) => unknown;
}

function createFakeServer(registry: RegisteredTool[]): McpServer {
  const server = {
    registerTool(
      name: string,
      config: Record<string, unknown>,
      handler: (...args: unknown[]) => unknown
    ) {
      registry.push({ name, config, handler });
    },
  };
  return server as unknown as McpServer;
}

test("all tool groups should register expected tool definitions", () => {
  const registry: RegisteredTool[] = [];
  const server = createFakeServer(registry);

  registerSearchTools(server);
  registerProblemTools(server);
  registerDiscussionTools(server);
  registerInterviewTools(server);

  const names = registry.map((tool) => tool.name);
  assert.equal(registry.length, 8);
  assert.deepEqual([...new Set(names)].sort(), [
    "nowcoder_browse_interview",
    "nowcoder_get_discussion",
    "nowcoder_get_hot_topics",
    "nowcoder_get_problem",
    "nowcoder_get_problem_solutions",
    "nowcoder_list_problems",
    "nowcoder_list_topic_problems",
    "nowcoder_search",
  ]);

  for (const tool of registry) {
    assert.equal(typeof tool.handler, "function");
    assert.equal(typeof tool.config.title, "string");
    assert.equal(typeof tool.config.description, "string");
    assert.ok("annotations" in tool.config);
    assert.ok("inputSchema" in tool.config);
  }
});
