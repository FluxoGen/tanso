import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© 2026 Tanso. All rights reserved.</p>
        <Link
          href="https://github.com/FluxoGen"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors"
        >
          <span className="text-muted-foreground">Developed by</span>
          <Image
            src="/images/fluxogen-logo.jpeg"
            alt="FluxoGen"
            width={24}
            height={24}
            className="rounded"
          />
          <span>FluxoGen</span>
        </Link>
      </div>
    </footer>
  );
}
