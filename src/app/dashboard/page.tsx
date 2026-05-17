"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import type { ReportRow } from "@/components/DashboardMap";

const DashboardMap = dynamic(() => import("@/components/DashboardMap"), { ssr: false });

type FilterStatus   = "all" | "open" | "in_progress" | "completed";
type FilterPriority = "all" | "high" | "medium" | "low";

function scoreBadgeClass(score: number | null) {
  if (score === null) return "bg-zinc-100 text-zinc-500";
  if (score >= 70) return "bg-red-100 text-red-600";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-zinc-100 text-zinc-500";
}

// Mirrors calculate_score.py exactly so the breakdown is defensible
function buildScoreBreakdown(report: ReportRow): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];

  // 1. Severity (always present)
  const severityBonus: Record<string, number> = { low: 10, medium: 25, high: 40 };
  const sev = report.severity ?? "medium";
  lines.push({ label: `Severity: ${sev}`, value: `+${severityBonus[sev] ?? 25}` });

  // 2. Proximity bonuses (cumulative per location)
  const proximityBonus: Record<string, number> = { school: 20, hospital: 15, bus_stop: 10, senior_center: 15 };
  for (const loc of report.nearby_sensitive ?? []) {
    const bonus = proximityBonus[loc.type];
    if (bonus) lines.push({ label: `Near ${loc.name}`, value: `+${bonus}` });
  }

  // 3. Duplicate cluster (duplicate_count stored at submit time)
  if (report.cluster_id && report.duplicate_count > 0) {
    const dupeBonus = Math.min(report.duplicate_count * 3, 20);
    lines.push({ label: `Reported ${report.duplicate_count + 1}× total`, value: `+${dupeBonus}` });
  }

  // 4. Safety keywords (up to 2 matches × +10, max +20)
  const safetyKeywords = [
    "swerving", "swerved", "flat tire", "blown tire", "accident", "crash",
    "dangerous", "hazard", "injury", "deep", "huge", "large",
  ];
  const allText = (report.safety_concerns ?? []).join(" ").toLowerCase();
  const matched = safetyKeywords.filter((kw) => allText.includes(kw));
  for (const kw of matched.slice(0, 2)) {
    lines.push({ label: `Safety: "${kw}"`, value: "+10" });
  }

  // 5. Age bonus (min(days * 0.5, 15)) — only shown if report is >7 days old
  const daysOpen = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86_400_000);
  if (daysOpen >= 7) {
    const ageBonus = Math.min(Math.round(daysOpen * 0.5), 15);
    lines.push({ label: `Open ${daysOpen} days`, value: `+${ageBonus}` });
  }

  // 6. Freeze-thaw multiplier
  if (report.freeze_thaw_multiplier && report.freeze_thaw_multiplier > 1.0) {
    lines.push({ label: "Freeze-thaw forecast", value: `×${report.freeze_thaw_multiplier.toFixed(1)}` });
  }

  return lines;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/reports");
    if (res.ok) setReports(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 30_000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const filteredReports = reports.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterPriority === "high"   && (r.priority_score ?? -1) < 70) return false;
    if (filterPriority === "medium" && ((r.priority_score ?? -1) < 40 || (r.priority_score ?? -1) >= 70)) return false;
    if (filterPriority === "low"    && (r.priority_score ?? 100) >= 40) return false;
    return true;
  });

  const selectedReport = filteredReports.find((r) => r.id === selectedId) ?? null;

  // Stat cards always use unfiltered counts
  const openCount    = reports.filter((r) => r.status === "open").length;
  const highPriCount = reports.filter((r) => (r.priority_score ?? 0) >= 70).length;
  const dupeCount    = reports.filter((r) => r.cluster_id !== null).length;

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch(`/api/reports/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchReports();
    setUpdatingId(null);
  }

  const filterLabels: Array<{ value: FilterStatus; label: string }> = [
    { value: "all",         label: "All" },
    { value: "open",        label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed",   label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">

      {/* Page header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">City Worker Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Detroit pothole repair queue</p>
        </div>
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            filterOpen
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
          </svg>
          Filter
          {(filterStatus !== "all" || filterPriority !== "all") && (
            <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {[
                filterStatus !== "all" ? filterLabels.find((f) => f.value === filterStatus)?.label : null,
                filterPriority !== "all" ? filterPriority : null,
              ].filter(Boolean).join(" · ")}
            </span>
          )}
        </button>
      </div>

      {/* Filter bar — slides in below header */}
      {filterOpen && (
        <div className="bg-white border-b border-zinc-200 px-6 py-3 flex flex-col gap-3">
          {/* Status row */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-14 shrink-0">Status</span>
            {filterLabels.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  filterStatus === value
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Priority row */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-14 shrink-0">Priority</span>
            <button
              onClick={() => setFilterPriority("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterPriority === "all"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterPriority("high")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterPriority === "high"
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              }`}
            >
              High (≥70)
            </button>
            <button
              onClick={() => setFilterPriority("medium")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterPriority === "medium"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              }`}
            >
              Medium (40–69)
            </button>
            <button
              onClick={() => setFilterPriority("low")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterPriority === "low"
                  ? "bg-zinc-500 text-white border-zinc-500"
                  : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
              }`}
            >
              Low (&lt;40)
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">

        {/* Stat cards (always unfiltered) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open tickets",      value: openCount },
            { label: "High priority",     value: highPriCount },
            { label: "Duplicates merged", value: dupeCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="text-3xl font-bold text-zinc-900 mt-1 tabular-nums">
                {loading ? "—" : value}
              </p>
            </div>
          ))}
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left col: map + detail panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <DashboardMap
              reports={filteredReports}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            {/* Ticket detail panel */}
            {selectedReport ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-zinc-900">
                    Ticket detail — #{selectedReport.id.slice(0, 4).toUpperCase()}
                  </h2>
                  {selectedReport.priority_score !== null && (
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreBadgeClass(selectedReport.priority_score)}`}>
                      {selectedReport.priority_score}/100
                    </span>
                  )}
                </div>

                {selectedReport.photo_url && (
                  <img
                    src={selectedReport.photo_url}
                    alt="Report photo"
                    className="w-full rounded-lg object-cover max-h-48 mb-4 border border-zinc-100"
                  />
                )}

                <p className="text-xs font-medium text-zinc-500 mb-1">AI summary</p>
                <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-4 py-3 text-sm text-zinc-700 leading-relaxed mb-4">
                  {selectedReport.priority_reason ?? "Score pending — AI analysis unavailable."}
                </div>

                {buildScoreBreakdown(selectedReport).length > 0 && (
                  <>
                    <p className="text-xs font-medium text-zinc-500 mb-2">Why this score?</p>
                    <ul className="mb-4 space-y-1.5">
                      {buildScoreBreakdown(selectedReport).map(({ label, value }, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-600">{label}</span>
                          <span className="font-mono text-xs font-semibold text-zinc-800 bg-zinc-100 rounded px-1.5 py-0.5">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="flex gap-3 pt-2 border-t border-zinc-100">
                  <button
                    disabled={selectedReport.status === "in_progress" || updatingId === selectedReport.id}
                    onClick={() => updateStatus(selectedReport.id, "in_progress")}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingId === selectedReport.id ? "Updating…" : "Mark in progress"}
                  </button>
                  <button
                    disabled={selectedReport.status === "completed" || updatingId === selectedReport.id}
                    onClick={() => updateStatus(selectedReport.id, "completed")}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingId === selectedReport.id ? "Updating…" : "Completed"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400">
                Select a report from the queue or click a map pin to see details
              </div>
            )}
          </div>

          {/* Right col: priority queue */}
          <div className="flex flex-col">
            <div className="rounded-xl border border-zinc-200 bg-white flex flex-col h-full">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="font-semibold text-zinc-900">Priority queue</h2>
                {filterStatus !== "all" && (
                  <span className="text-xs text-zinc-500">
                    {filteredReports.length} of {reports.length}
                  </span>
                )}
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-zinc-100" style={{ maxHeight: "700px" }}>
                {loading ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-400">Loading…</div>
                ) : filteredReports.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-400">
                    {filterStatus === "all" ? "No reports yet" : `No ${filterStatus.replace("_", " ")} reports`}
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedId(report.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 transition-colors ${
                        selectedId === report.id ? "bg-blue-50 border-l-2 border-blue-400" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-900 truncate">
                          #{report.id.slice(0, 4).toUpperCase()} — {report.address.split(",")[0]}
                        </p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{report.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${scoreBadgeClass(report.priority_score)}`}>
                        {report.priority_score ?? "—"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            {
              heading: "Career",
              links: ["MDOT jobs", "Transportation Career Pathways Program", "STEM Outreach Internship", "Veteran Internship"],
            },
            {
              heading: "Finance and funding",
              links: ["Annual financial reports", "Bonding", "Act 51", "Michigan Transportation Fund"],
            },
            {
              heading: "Inclusion",
              links: ["Freedom of Information Act", "Civil Rights", "Language access"],
            },
            {
              heading: "Performance",
              links: ["Mission, Vision, and Values", "MDOT innovations", "Transportation system performance"],
            },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-sm font-semibold text-zinc-200 mb-3">{heading}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <span className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>

    </div>
  );
}
