import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white">
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
    </header>
  );
}
