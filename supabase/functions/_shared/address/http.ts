export interface FetchOptions {
  timeoutMs: number;
  retryCount: number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchOptions
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= options.retryCount) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (shouldRetry(response.status) && attempt <= options.retryCount) {
        await delay(150 * attempt);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt > options.retryCount) {
        break;
      }
      await delay(150 * attempt);
    }
  }

  throw lastError ?? new Error("Request failed");
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
