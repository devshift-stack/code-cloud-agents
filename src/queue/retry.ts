/**
 * Retry Logic for Failed Queue Jobs
 *
 * Provides exponential backoff retry mechanism for failed webhook processing jobs.
 * Prevents infinite retries and provides configurable retry limits.
 */

import type { QueueAdapter, QueueJob } from "./queue.js";

export interface RetryConfig {
  maxRetries: number; // Maximum number of retry attempts
  initialDelayMs: number; // Initial delay before first retry
  maxDelayMs: number; // Maximum delay between retries
  backoffMultiplier: number; // Exponential backoff multiplier
}

export interface RetryableJob extends QueueJob {
  retryCount?: number;
  lastError?: string;
  nextRetryAt?: string;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 1 minute
  backoffMultiplier: 2, // Double the delay each retry
};

/**
 * Calculates delay before next retry using exponential backoff
 */
function calculateRetryDelay(retryCount: number, config: RetryConfig): number {
  const delay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Wraps a queue job handler with automatic retry logic
 * @param handler - Original job handler function
 * @param queue - Queue adapter for re-queueing failed jobs
 * @param config - Retry configuration
 * @returns Wrapped handler with retry logic
 */
export function withRetry(
  handler: (job: QueueJob) => Promise<void>,
  queue: QueueAdapter,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): (job: QueueJob) => Promise<void> {
  return async (job: QueueJob) => {
    const retryableJob = job as RetryableJob;
    const currentRetryCount = retryableJob.retryCount ?? 0;

    try {
      // Execute the original handler
      await handler(job);

      // Success! Clear retry metadata
      if (currentRetryCount > 0) {
        console.log(
          `✅ Job ${job.id} succeeded after ${currentRetryCount} retries`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if we should retry
      if (currentRetryCount < config.maxRetries) {
        const nextRetryCount = currentRetryCount + 1;
        const retryDelay = calculateRetryDelay(currentRetryCount, config);
        const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

        console.log(
          `⚠️  Job ${job.id} failed (attempt ${nextRetryCount}/${config.maxRetries})`,
        );
        console.log(`   Error: ${errorMessage}`);
        console.log(
          `   Retrying in ${retryDelay}ms (${new Date(nextRetryAt).toLocaleTimeString()})...`,
        );

        // Schedule retry after delay
        setTimeout(async () => {
          await queue.add(job.name, {
            ...job.data,
            _retry: {
              count: nextRetryCount,
              lastError: errorMessage,
              previousJobId: job.id,
            },
          });
        }, retryDelay);

        // Update job metadata
        retryableJob.retryCount = nextRetryCount;
        retryableJob.lastError = errorMessage;
        retryableJob.nextRetryAt = nextRetryAt;
      } else {
        // Max retries exceeded - give up
        console.error(
          `❌ Job ${job.id} failed permanently after ${config.maxRetries} retries`,
        );
        console.error(`   Final error: ${errorMessage}`);
        console.error(`   Job data:`, JSON.stringify(job.data, null, 2));

        // TODO: Send notification to admins/monitoring system
        // TODO: Store in dead letter queue for manual inspection
      }

      // Re-throw error to mark job as failed
      throw error;
    }
  };
}

/**
 * Extracts retry metadata from job data if present
 */
export function getRetryMetadata(job: QueueJob): {
  retryCount: number;
  lastError?: string;
  previousJobId?: string;
} | null {
  const data = job.data as {
    _retry?: { count: number; lastError: string; previousJobId: string };
  };
  if (data._retry) {
    return {
      retryCount: data._retry.count,
      lastError: data._retry.lastError,
      previousJobId: data._retry.previousJobId,
    };
  }
  return null;
}

/**
 * Configuration presets for different retry strategies
 */
export const RETRY_PRESETS = {
  // Aggressive retries for critical operations
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  } as RetryConfig,

  // Standard retries for normal operations
  STANDARD: DEFAULT_RETRY_CONFIG,

  // Conservative retries for expensive operations
  CONSERVATIVE: {
    maxRetries: 2,
    initialDelayMs: 5000,
    maxDelayMs: 120000,
    backoffMultiplier: 3,
  } as RetryConfig,

  // No retries - fail immediately
  NONE: {
    maxRetries: 0,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
  } as RetryConfig,
};
