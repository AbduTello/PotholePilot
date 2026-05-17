export default function ReportPage() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Report a Pothole</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Fill out the form below to submit a pothole report to the city.
        </p>

        <div className="mt-8 flex flex-col gap-8">

          {/* TODO: Photo upload section
              - Allow resident to upload or take a photo of the pothole
              - Preview the selected image before submission
              - Store file reference in form state
          */}
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400">
            Photo Upload — coming soon
          </section>

          {/* TODO: Map / location picker section
              - Embed an interactive map (e.g. Mapbox or Google Maps)
              - Let the resident drop a pin or use their current GPS location
              - Reverse-geocode the pin to a human-readable address
          */}
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400">
            Map / Location Picker — coming soon
          </section>

          {/* TODO: Submission form
              - Fields: address (pre-filled from map pin), severity, description
              - Validate required fields before submitting
              - POST to /api/reports on submit
          */}
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-400">
            Submission Form — coming soon
          </section>

        </div>
      </div>
    </main>
  );
}
