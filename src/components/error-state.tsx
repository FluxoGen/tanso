'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
}

export function ErrorState({
  error = 'Something went wrong',
  onRetry,
  showHomeLink = true,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-12"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="text-muted-foreground h-12 w-12" />
      <p className="text-muted-foreground text-center text-sm">{error}</p>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {showHomeLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Go home</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
