export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay between retries in ms (default: 30000) */
  maxDelayMs?: number
  /** Timeout per attempt in ms (default: 120000 = 2 min) */
  timeoutMs?: number
  /** Called before each retry with the error and attempt number */
  onRetry?: (error: Error, attempt: number) => void
  /** Determine if the error is retryable (default: all errors are retryable) */
  isRetryable?: (error: Error) => boolean
}

const defaults: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 120000,
}

/**
 * Executes a function with retry logic, exponential backoff with jitter, and per-attempt timeout.
 *
 * @example
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, timeoutMs: 60000, onRetry: (err, n) => console.log(`Retry ${n}:`, err.message) }
 * )
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    timeoutMs,
  } = { ...defaults, ...options }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const result = await fn(controller.signal)
      clearTimeout(timer)
      return result
    } catch (error) {
      clearTimeout(timer)
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable
      if (options.isRetryable && !options.isRetryable(lastError)) {
        throw lastError
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break
      }

      // Exponential backoff with jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * baseDelayMs
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

      options.onRetry?.(lastError, attempt + 1)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
