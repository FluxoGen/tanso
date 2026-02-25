/**
 * Fetch utilities with retry logic and error handling.
 */

export interface RetryConfig {
  retries?: number;
  delay?: number;
  backoff?: number;
  retryOn?: (response: Response) => boolean;
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'retryOn'>> = {
  retries: 3,
  delay: 1000,
  backoff: 2,
};

/**
 * Fetch with automatic retry on failure.
 *
 * - Retries on network errors and 5xx responses
 * - Handles rate limiting (429) with longer wait
 * - Uses exponential backoff between retries
 * - Returns non-retryable errors (4xx except 429) immediately
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  const { retries, delay, backoff } = { ...DEFAULT_CONFIG, ...config };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response;
      }

      // Rate limited - wait longer and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;

        if (attempt < retries) {
          await sleep(waitTime);
          continue;
        }
        return response;
      }

      // Custom retry condition
      if (config?.retryOn && config.retryOn(response) && attempt < retries) {
        await sleep(delay * Math.pow(backoff, attempt));
        continue;
      }

      // Client errors (4xx) - don't retry, return as-is
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Server errors (5xx) - retry
      if (response.status >= 500) {
        if (attempt < retries) {
          await sleep(delay * Math.pow(backoff, attempt));
          continue;
        }
        return response;
      }

      return response;
    } catch (error) {
      // Network errors - retry
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        await sleep(delay * Math.pow(backoff, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch JSON with retry and automatic parsing.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
): Promise<T> {
  const response = await fetchWithRetry(url, options, config);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
