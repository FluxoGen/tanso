import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© 2026 Tanso. All rights reserved.</p>
        <p>
          Developed by{" "}
          <Link
            href="https://github.com/FluxoGen"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            FluxoGen
          </Link>
        </p>
      </div>
    </footer>
  );
}
