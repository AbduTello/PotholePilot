import { NextRequest, NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  try {
    await mcpClient.updateRepairStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }
}
