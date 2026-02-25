'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setShow(window.scrollY > 300);
		};

		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	if (!show) return null;

	return (
		<button
			onClick={scrollToTop}
			className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-6 bottom-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all"
			aria-label="Scroll to top"
		>
			<ArrowUp className="h-5 w-5" />
		</button>
	);
}
