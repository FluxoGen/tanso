import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Home, LayoutList } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-muted-foreground text-6xl font-bold">404</h1>
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/latest">
            <LayoutList className="mr-2 h-4 w-4" />
            Latest
          </Link>
        </Button>
      </div>
    </div>
  );
}
