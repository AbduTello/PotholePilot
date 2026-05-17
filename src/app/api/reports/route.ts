import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const description = form.get("description") as string | null;
  const address = form.get("address") as string | null;
  const lat = parseFloat(form.get("lat") as string);
  const lng = parseFloat(form.get("lng") as string);
  const photo = form.get("photo") as File | null;

  if (!description || !address || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let photo_url: string | null = null;

  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("report-photos")
      .upload(filename, buffer, { contentType: photo.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("report-photos")
      .getPublicUrl(filename);

    photo_url = urlData.publicUrl;
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert({ description, address, lat, lng, photo_url, status: "open" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
