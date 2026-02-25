import Link from 'next/link';
import Image from 'next/image';
import packageJson from '../../package.json';

export function Footer() {
	return (
		<footer className="mt-auto border-t">
			<div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm sm:flex-row">
				<div className="flex items-center gap-2">
					<p>© 2026 Tanso. All rights reserved.</p>
					<span className="text-muted-foreground/60">·</span>
					<span className="text-muted-foreground/60">v{packageJson.version}</span>
				</div>
				<Link
					href="https://github.com/FluxoGen"
					target="_blank"
					rel="noopener noreferrer"
					className="text-foreground hover:text-primary flex items-center gap-2 font-medium transition-colors"
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
