#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
import { generate as generateSelfSigned } from "selfsigned";
import { shutdown } from "./services/browser.js";
import { registerSearchTools } from "./tools/search.js";
import { registerProblemTools } from "./tools/problems.js";
import { registerDiscussionTools } from "./tools/discussions.js";
import { registerInterviewTools } from "./tools/interview.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "nowcoder-mcp-server",
    version: "1.0.0",
  });

  registerSearchTools(server);
  registerProblemTools(server);
  registerDiscussionTools(server);
  registerInterviewTools(server);

  return server;
}

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("nowcoder-mcp-server running via stdio");
}

async function startHttp(): Promise<void> {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";
  const useHttps = process.env.HTTPS === "1" || process.env.TRANSPORT === "https";
  const allowedOrigins = process.env.ALLOWED_ORIGINS || "*";

  const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    res.setHeader("Access-Control-Allow-Origin", allowedOrigins);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Accept");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (url.pathname !== "/mcp") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    if (req.method === "GET" || req.method === "DELETE") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed in stateless mode" }));
      return;
    }

    const body = await new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (chunk: Buffer) => (data += chunk.toString()));
      req.on("end", () => resolve(data));
    });
    const jsonBody = JSON.parse(body);

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, jsonBody);

    res.on("close", () => transport.close());
  };

  let server: ReturnType<typeof createHttpServer>;
  if (useHttps) {
    let cert: string;
    let key: string;
    const certPath = process.env.SSL_CERT;
    const keyPath = process.env.SSL_KEY;
    if (certPath && keyPath) {
      cert = readFileSync(certPath, "utf8");
      key = readFileSync(keyPath, "utf8");
    } else {
      const attrs = [{ name: "commonName", value: "localhost" }];
      const pems = await generateSelfSigned(attrs, {});
      cert = pems.cert;
      key = pems.private;
      console.error("Using self-signed certificate for localhost (browser may show security warning)");
    }
    server = createHttpsServer({ cert, key }, requestHandler);
  } else {
    server = createHttpServer(requestHandler);
  }

  server.listen(port, host, () => {
    const protocol = useHttps ? "https" : "http";
    console.error(`nowcoder-mcp-server running at ${protocol}://${host}:${port}/mcp`);
  });
}

const mode = process.env.TRANSPORT || "stdio";

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

((mode === "http" || mode === "https") ? startHttp() : startStdio()).catch((error) => {
  console.error("Fatal error:", error);
  shutdown().finally(() => process.exit(1));
});
