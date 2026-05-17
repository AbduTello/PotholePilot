"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import PhotoUpload from "@/components/PhotoUpload";

const PinMap = dynamic(() => import("@/components/PinMap"), { ssr: false });

type Status = "idle" | "submitting" | "success" | "error";

interface SubmitResult {
  id: string;
}

export default function ReportPage() {
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  const handleLocationSelect = useCallback((lat: number, lng: number, addr: string) => {
    setLat(lat);
    setLng(lng);
    setAddress(addr);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim();

    if (!description) return;
    if (!address || lat === null || lng === null) {
      setErrorMsg("Please drop a pin on the map to set the location.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("description", description);
    formData.append("address", address);
    formData.append("lat", String(lat));
    formData.append("lng", String(lng));
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/reports", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      setResult(body);
      setStatus("success");
      form.reset();
      setAddress("");
      setLat(null);
      setLng(null);
      setPhoto(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  if (status === "success" && result) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-md flex flex-col gap-6 pt-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
            <h1 className="text-2xl font-bold text-zinc-900">Report submitted!</h1>
            <p className="text-sm text-zinc-500">
              The city has been notified and your report is in the repair queue.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <span className="text-xs text-zinc-400">Ticket ID</span>
              <span className="font-mono text-xs text-zinc-500">{result.id.slice(0, 8).toUpperCase()}…</span>
            </div>

            <div className="flex flex-col gap-2 text-sm text-zinc-600">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-zinc-400">1.</span>
                <span>Your report has been added to Detroit&apos;s repair queue and scored for urgency.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-zinc-400">2.</span>
                <span>A city crew will be dispatched based on priority — high-risk locations near schools and hospitals are addressed first.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-zinc-400">3.</span>
                <span>If others have reported the same pothole, your report helps move it up the queue.</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setStatus("idle"); setResult(null); }}
            className="w-full rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Submit another report
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Report a Pothole</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Takes less than a minute. Your report goes straight to the city.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">

          {/* 1. Description */}
          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-base font-semibold text-zinc-900">
              What&apos;s going on? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              placeholder="e.g., Huge pothole outside the elementary school on Bagley. Cars are swerving and it's been there for two weeks."
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 resize-none"
            />
          </div>

          {/* 2. Location */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-zinc-900">
              Where? <span className="text-red-500">*</span>
            </label>
            <PinMap onLocationSelect={handleLocationSelect} />
            <input
              type="text"
              value={address}
              readOnly
              placeholder="Drop a pin to fill in the address automatically"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 placeholder-zinc-400 shadow-sm outline-none"
            />
          </div>

          {/* 3. Photo */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-zinc-900">
              Photo <span className="text-zinc-400 font-normal text-sm">(optional)</span>
            </label>
            <PhotoUpload onChange={setPhoto} />
          </div>

          {/* Error */}
          {status === "error" && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {status === "submitting" ? "Submitting…" : "Submit Report"}
          </button>

        </form>
      </div>
    </main>
  );
}
