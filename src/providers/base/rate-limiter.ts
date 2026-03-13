/**
 * Token-bucket rate limiter for scraper providers.
 * Prevents hitting upstream rate limits proactively.
 */
export class RateLimiter {
	private tokens: number;
	private lastRefill: number;
	private readonly maxTokens: number;
	private readonly refillRateMs: number;

	constructor(requestsPerMinute: number) {
		this.maxTokens = requestsPerMinute;
		this.tokens = requestsPerMinute;
		this.lastRefill = Date.now();
		this.refillRateMs = 60_000 / requestsPerMinute;
	}

	async acquire(): Promise<void> {
		this.refill();

		if (this.tokens >= 1) {
			this.tokens -= 1;
			return;
		}

		const waitMs = this.refillRateMs - (Date.now() - this.lastRefill);
		await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 100)));
		this.refill();
		this.tokens = Math.max(this.tokens - 1, 0);
	}

	private refill(): void {
		const now = Date.now();
		const elapsed = now - this.lastRefill;
		const newTokens = elapsed / this.refillRateMs;
		this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
		this.lastRefill = now;
	}
}
