'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
