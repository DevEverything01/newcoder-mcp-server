#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { shutdown } from "./services/browser.js";
import { registerSearchTools } from "./tools/search.js";
import { registerProblemTools } from "./tools/problems.js";
import { registerDiscussionTools } from "./tools/discussions.js";
import { registerInterviewTools } from "./tools/interview.js";

const server = new McpServer({
  name: "nowcoder-mcp-server",
  version: "1.0.0",
});

registerSearchTools(server);
registerProblemTools(server);
registerDiscussionTools(server);
registerInterviewTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("nowcoder-mcp-server running via stdio");
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  shutdown().finally(() => process.exit(1));
});
