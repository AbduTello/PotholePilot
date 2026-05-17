import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mcpClient } from "@/lib/mcp-client";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .order("priority_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const description = form.get("description") as string | null;
  const address     = form.get("address") as string | null;
  const lat         = parseFloat(form.get("lat") as string);
  const lng         = parseFloat(form.get("lng") as string);
  const photo       = form.get("photo") as File | null;

  if (!description || !address || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1. Upload photo if present
  let photo_url: string | null = null;
  if (photo && photo.size > 0) {
    const ext      = photo.name.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const buffer   = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("report-photos")
      .upload(filename, buffer, { contentType: photo.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
    }
    photo_url = supabaseAdmin.storage.from("report-photos").getPublicUrl(filename).data.publicUrl;
  }

  // 2. Insert a pending row so we have an ID
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("reports")
    .insert({ description, address, lat, lng, photo_url, status: "processing" })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }
  const reportId = inserted.id;

  // 3. Run MCP pipeline (gracefully degrade on any failure)
  try {
    const [extracted, duplicates, nearby] = await Promise.all([
      mcpClient.extractReportDetails(description),
      mcpClient.findNearbyDuplicates(lat, lng),
      mcpClient.getNearbyLocations(lat, lng),
    ]);

    const daysOpen = 0; // brand-new report
    const scored   = await mcpClient.calculatePriorityScore({
      severity:        extracted.severity,
      duplicate_count: duplicates.duplicate_count,
      nearby_sensitive: nearby.locations,
      safety_concerns: extracted.safety_concerns,
      days_open:       daysOpen,
      lat,
      lng,
    });

    // 4. Update row with all extracted + scored fields
    await supabaseAdmin
      .from("reports")
      .update({
        status:                  "open",
        severity:                extracted.severity,
        safety_concerns:         extracted.safety_concerns,
        urgency_signals:         extracted.urgency_signals,
        landmarks_mentioned:     extracted.landmarks_mentioned,
        nearby_sensitive:        nearby.locations,
        priority_score:          scored.priority_score,
        priority_reason:         scored.priority_reason,
        freeze_thaw_multiplier:  scored.freeze_thaw_multiplier,
        cluster_id:              duplicates.cluster_id,
        duplicate_count:         duplicates.duplicate_count,
      })
      .eq("id", reportId);

    return NextResponse.json({
      id:              reportId,
      priority_score:  scored.priority_score,
      priority_reason: scored.priority_reason,
      severity:        extracted.severity,
    }, { status: 201 });

  } catch {
    // MCP pipeline failed — report is still saved, just unscored
    await supabaseAdmin
      .from("reports")
      .update({ status: "open" })
      .eq("id", reportId);

    return NextResponse.json({
      id:              reportId,
      priority_score:  null,
      priority_reason: "Score pending — AI pipeline unavailable",
      severity:        null,
    }, { status: 201 });
  }
}
