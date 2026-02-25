'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
			<AlertCircle className="text-destructive h-16 w-16" />
			<div className="space-y-2 text-center">
				<h1 className="text-2xl font-bold">Something went wrong</h1>
				<p className="text-muted-foreground max-w-md text-sm">
					An unexpected error occurred. Please try again.
				</p>
			</div>
			<div className="flex gap-3">
				<Button onClick={reset}>Try again</Button>
				<Button variant="outline" asChild>
					<Link href="/">Go home</Link>
				</Button>
			</div>
		</div>
	);
}
