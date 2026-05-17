import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.MCP_SERVER_URL ?? "http://localhost:8000";

let _client: Client | null = null;

async function getClient(): Promise<Client> {
  if (_client) return _client;
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_URL}/mcp`));
  _client = new Client({ name: "potholepilot-nextjs", version: "1.0.0" });
  await _client.connect(transport);
  return _client;
}

async function callTool<T = unknown>(tool: string, args: Record<string, unknown>): Promise<T> {
  const client = await getClient();
  const res = await client.callTool({ name: tool, arguments: args });
  if (res.isError) throw new Error(`MCP tool error in ${tool}`);
  const text = (res.content as Array<{ type: string; text: string }>)[0]?.text;
  return JSON.parse(text) as T;
}

export interface ExtractedReport {
  issue_type: string;
  severity: "low" | "medium" | "high";
  safety_concerns: string[];
  landmarks_mentioned: string[];
  urgency_signals: string[];
  estimated_age_days: number | null;
}

export interface DuplicateResult {
  cluster_id: string | null;
  duplicate_count: number;
}

export interface SensitiveLocation {
  id: string;
  name: string;
  type: string;
  distance: number;
}

export interface NearbyLocationsResult {
  locations: SensitiveLocation[];
}

export interface ScoreResult {
  priority_score: number;
  priority_reason: string;
  freeze_thaw_multiplier: number;
}

export const mcpClient = {
  extractReportDetails: (description: string) =>
    callTool<ExtractedReport>("extract_report_details_tool", { description }),

  findNearbyDuplicates: (lat: number, lng: number) =>
    callTool<DuplicateResult>("find_nearby_duplicates_tool", { lat, lng }),

  getNearbyLocations: (lat: number, lng: number) =>
    callTool<NearbyLocationsResult>("get_nearby_sensitive_locations_tool", { lat, lng }),

  calculatePriorityScore: (args: {
    severity: string;
    duplicate_count: number;
    nearby_sensitive: SensitiveLocation[];
    safety_concerns: string[];
    days_open: number;
    lat: number;
    lng: number;
  }) => callTool<ScoreResult>("calculate_priority_score_tool", args as Record<string, unknown>),

  updateRepairStatus: (report_id: string, status: string) =>
    callTool("update_repair_status_tool", { report_id, status }),
};
