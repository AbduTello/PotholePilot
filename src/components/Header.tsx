import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white relative">
      <Link href="/" className="block">
        <Image
          src="/PotholePilotHeaderLogo.png"
          alt="PotholePilot"
          width={1920}
          height={200}
          className="w-full h-auto"
          priority
        />
      </Link>
      <Link
        href="/login"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        City Worker Login
      </Link>
    </header>
  );
}
