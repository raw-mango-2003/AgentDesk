import { IQueueService, QueueJob, JobType } from './interfaces.js';

export class QueueService implements IQueueService {
  private jobs = new Map<string, QueueJob>();
  private handlers = new Map<JobType, (payload: any) => Promise<void>>();
  private isProcessing = false;

  constructor() {
    // Process queue every 2 seconds
    setInterval(() => {
      this.processNextPendingJob();
    }, 2000);
  }

  public registerHandler(type: JobType, handler: (payload: any) => Promise<void>): void {
    this.handlers.set(type, handler);
  }

  public async enqueue(
    type: JobType,
    payload: any,
    options?: { maxAttempts?: number; delayMs?: number }
  ): Promise<QueueJob> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const nextAttemptAt = options?.delayMs ? new Date(now + options.delayMs).toISOString() : new Date(now).toISOString();

    const job: QueueJob = {
      id,
      type,
      payload,
      status: 'PENDING',
      attemptCount: 0,
      maxAttempts: options?.maxAttempts || 3,
      nextAttemptAt,
      createdAt: new Date().toISOString()
    };

    this.jobs.set(id, job);
    return job;
  }

  public getJobs(status?: QueueJob['status'], limit: number = 50): QueueJob[] {
    let list = Array.from(this.jobs.values());
    if (status) {
      list = list.filter(j => j.status === status);
    }
    // Newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, limit);
  }

  public getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  public async retryJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.status = 'PENDING';
    job.nextAttemptAt = new Date().toISOString();
    return true;
  }

  private async processNextPendingJob(): Promise<void> {
    if (this.isProcessing) return;

    const now = new Date().toISOString();
    const candidate = Array.from(this.jobs.values()).find(
      j => j.status === 'PENDING' && (!j.nextAttemptAt || j.nextAttemptAt <= now)
    );

    if (!candidate) return;

    this.isProcessing = true;
    candidate.status = 'PROCESSING';
    candidate.attemptCount += 1;
    candidate.lastAttemptAt = now;

    const handler = this.handlers.get(candidate.type);

    if (!handler) {
      // If no handler registered, complete with mock success
      candidate.status = 'COMPLETED';
      candidate.completedAt = new Date().toISOString();
      this.isProcessing = false;
      return;
    }

    try {
      await handler(candidate.payload);
      candidate.status = 'COMPLETED';
      candidate.completedAt = new Date().toISOString();
    } catch (err: any) {
      console.error(`[QueueService:JobFailed] Job ${candidate.id} (${candidate.type}):`, err.message);
      if (candidate.attemptCount >= candidate.maxAttempts) {
        candidate.status = 'DEAD_LETTER';
        candidate.failureReason = `Exceeded max attempts (${candidate.maxAttempts}): ${err.message}`;
      } else {
        candidate.status = 'PENDING';
        // Exponential backoff: 2s, 4s, 8s...
        const backoffMs = Math.pow(2, candidate.attemptCount) * 1000;
        candidate.nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();
        candidate.failureReason = err.message;
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
