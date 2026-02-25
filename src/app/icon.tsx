import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#0a0a0a',
				borderRadius: '6px',
			}}
		>
			<svg viewBox="0 0 100 100" fill="none" style={{ width: '90%', height: '90%' }}>
				<circle cx="50" cy="50" r="48" stroke="#e5e5e5" strokeWidth="2" />
				<rect x="20" y="58" width="60" height="3" fill="#E63946" />
				<rect x="46" y="25" width="8" height="45" fill="#e5e5e5" />
				<rect x="30" y="25" width="40" height="8" fill="#e5e5e5" />
				<circle cx="50" cy="18" r="3" fill="#E63946" />
			</svg>
		</div>,
		{ ...size }
	);
}
