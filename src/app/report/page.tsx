"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import PhotoUpload from "@/components/PhotoUpload";

const PinMap = dynamic(() => import("@/components/PinMap"), { ssr: false });

type Status = "idle" | "submitting" | "success" | "error";

export default function ReportPage() {
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Something went wrong");
      }
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

  if (status === "success") {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-4 pt-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
          <h1 className="text-2xl font-bold text-zinc-900">Report submitted!</h1>
          <p className="text-zinc-500">Thanks for letting us know. The city has been notified.</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-4 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
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
