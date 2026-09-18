/**
 * Keyed asynchronous mutex to serialize operations on critical resources (e.g., specific orderId or promo code)
 */
export class KeyedMutex {
  private queues = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const currentPromise = this.queues.get(key) ?? Promise.resolve();

    let releaseNext!: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      releaseNext = resolve;
    });

    // Chain the next task onto the current promise
    this.queues.set(key, currentPromise.then(() => nextPromise));

    await currentPromise;
    try {
      return await task();
    } finally {
      releaseNext();
      // Clean up queue when this task was the last one
      if (this.queues.get(key) === nextPromise) {
        this.queues.delete(key);
      }
    }
  }
}
