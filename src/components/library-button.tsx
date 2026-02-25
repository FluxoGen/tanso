'use client';

import { useState, useEffect, useRef } from 'react';
import { useLibraryStatus, LIBRARY_STATUS_LABELS, LIBRARY_STATUS_COLORS } from '@/hooks/useLibrary';
import type { LibraryStatus } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { BookPlus, Check, ChevronDown, Loader2 } from 'lucide-react';

const STATUS_OPTIONS: LibraryStatus[] = [
	'reading',
	'plan_to_read',
	'completed',
	'on_hold',
	'dropped',
];

interface LibraryButtonProps {
	mangaId: string;
	title: string;
	coverUrl: string | null;
}

export function LibraryButton({ mangaId, title, coverUrl }: LibraryButtonProps) {
	const [mounted, setMounted] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const { entry, isInLibrary, isLoading, add, updateStatus, remove } = useLibraryStatus(mangaId);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	const handleStatusSelect = (status: LibraryStatus) => {
		setIsAnimating(true);
		if (isInLibrary) {
			updateStatus(status);
		} else {
			add(title, coverUrl, status);
		}
		setTimeout(() => setIsAnimating(false), 300);
		setIsOpen(false);
	};

	const handleRemove = () => {
		remove();
		setIsOpen(false);
	};

	if (!mounted || isLoading) {
		return (
			<button
				disabled
				className="bg-muted text-muted-foreground inline-flex items-center gap-2 rounded-md px-4 py-2"
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				<span>Loading...</span>
			</button>
		);
	}

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					'inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition-all duration-200',
					isInLibrary
						? cn('text-sm', LIBRARY_STATUS_COLORS[entry!.status], isAnimating && 'scale-105')
						: 'bg-primary text-primary-foreground hover:bg-primary/90'
				)}
			>
				{isInLibrary ? (
					<>
						<Check className={cn('h-4 w-4', isAnimating && 'animate-bounce')} />
						<span>{LIBRARY_STATUS_LABELS[entry!.status]}</span>
					</>
				) : (
					<>
						<BookPlus className="h-4 w-4" />
						<span>Add to Library</span>
					</>
				)}
				<ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
			</button>

			{isOpen && (
				<div className="bg-popover animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border shadow-lg duration-150">
					<div className="p-1">
						{STATUS_OPTIONS.map((status) => (
							<button
								key={status}
								onClick={() => handleStatusSelect(status)}
								className={cn(
									'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
									entry?.status === status
										? 'bg-accent text-accent-foreground'
										: 'hover:bg-accent/50'
								)}
							>
								{entry?.status === status && <Check className="h-4 w-4" />}
								<span className={entry?.status !== status ? 'ml-6' : ''}>
									{LIBRARY_STATUS_LABELS[status]}
								</span>
							</button>
						))}
					</div>
					{isInLibrary && (
						<>
							<div className="border-t" />
							<div className="p-1">
								<button
									onClick={handleRemove}
									className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
								>
									<span className="ml-6">Remove from Library</span>
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
