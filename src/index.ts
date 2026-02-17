#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSessionTools } from "./tools/sessions.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerJournalTools } from "./tools/journal.js";
import { registerDecisionTools } from "./tools/decisions.js";
import { registerDeadEndTools } from "./tools/dead-ends.js";
import { registerContextTools } from "./tools/context.js";
import { registerDataManageTools } from "./tools/data-manage.js";

const VERSION = "1.1.0";

const server = new McpServer({
  name: "session-forge",
  version: VERSION,
});

registerSessionTools(server);
registerProfileTools(server);
registerJournalTools(server);
registerDecisionTools(server);
registerDeadEndTools(server);
registerContextTools(server);
registerDataManageTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`session-forge v${VERSION} running`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
