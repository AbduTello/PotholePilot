export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">City Worker Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review submitted pothole reports, assign crews, and track repair status.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* TODO: Stats / summary bar
              - Total open reports, in-progress, resolved counts
              - Could be small KPI cards across the top
          */}
          <section className="col-span-full rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400">
            Stats Summary Bar — coming soon
          </section>

          {/* TODO: Map view
              - Show all reported potholes as pins on an interactive map
              - Color-code pins by status (open / in-progress / resolved)
              - Click a pin to open the report detail panel
          */}
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400 lg:col-span-1">
            Map View — coming soon
          </section>

          {/* TODO: Reports list / table
              - Paginated table of all reports with columns: ID, location, severity, status, date
              - Filter by status and sort by date or severity
              - Row click opens detail panel
          */}
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400 lg:col-span-1">
            Reports List / Table — coming soon
          </section>

        </div>
      </div>
    </main>
  );
}
