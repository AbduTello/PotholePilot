import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">PotholePilot</h1>
        <p className="mt-2 text-zinc-500">Report potholes. Track repairs.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/report"
          className="rounded-xl bg-zinc-900 px-8 py-4 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Report a Pothole
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-zinc-200 bg-white px-8 py-4 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          City Worker Dashboard
        </Link>
      </div>
    </main>
  );
}
