import { IQueueService, QueueJob, JobType } from './interfaces.js';
import { postgresClient } from '../db/postgresClient.js';

export class QueueService implements IQueueService {
  private jobs = new Map<string, QueueJob>();
  private handlers = new Map<JobType, (payload: any) => Promise<void>>();
  private isProcessing = false;
  private initialized = false;

  constructor() {
    setInterval(() => { this.processNextPendingJob().catch(err => console.error('[QueueService] Worker error:', err.message)); }, 2000);
    this.hydrateFromPostgres().catch(err => console.warn('[QueueService] Hydration unavailable:', err.message));
  }

  public registerHandler(type: JobType, handler: (payload: any) => Promise<void>): void {
    this.handlers.set(type, handler);
  }

  private async hydrateFromPostgres(): Promise<void> {
    try {
      if (!(await postgresClient.initialize())) { this.initialized = true; return; }
      const result = await postgresClient.query(
        `SELECT * FROM agentdesk_queue_jobs
         WHERE status IN ('PENDING','PROCESSING')
         ORDER BY created_at ASC LIMIT 1000`
      );
      for (const row of result.rows) {
        const job: QueueJob = {
          id: row.id, type: row.type, payload: row.payload || {}, status: row.status === 'PROCESSING' ? 'PENDING' : row.status,
          attemptCount: Number(row.attempt_count || 0), maxAttempts: Number(row.max_attempts || 3),
          nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : undefined,
          lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
          failureReason: row.failure_reason || undefined, createdAt: new Date(row.created_at).toISOString()
        };
        this.jobs.set(job.id, job);
      }
      this.initialized = true;
    } catch (err: any) {
      console.warn('[QueueService] PostgreSQL hydration failed:', err.message);
      this.initialized = true;
    }
  }

  private async persist(job: QueueJob): Promise<void> {
    try {
      if (!(await postgresClient.initialize())) return;
      await postgresClient.query(
        `INSERT INTO agentdesk_queue_jobs
         (id,type,payload,status,attempt_count,max_attempts,next_attempt_at,last_attempt_at,completed_at,failure_reason,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (id) DO UPDATE SET
           status=EXCLUDED.status, attempt_count=EXCLUDED.attempt_count, next_attempt_at=EXCLUDED.next_attempt_at,
           last_attempt_at=EXCLUDED.last_attempt_at, completed_at=EXCLUDED.completed_at,
           failure_reason=EXCLUDED.failure_reason, updated_at=NOW()`,
        [job.id, job.type, JSON.stringify(job.payload || {}), job.status, job.attemptCount, job.maxAttempts,
         job.nextAttemptAt || null, job.lastAttemptAt || null, job.completedAt || null, job.failureReason || null, job.createdAt]
      );
    } catch (err: any) {
      console.warn('[QueueService] Persistence unavailable:', err.message);
    }
  }

  public async enqueue(
    type: JobType,
    payload: any,
    options?: { maxAttempts?: number; delayMs?: number }
  ): Promise<QueueJob> {
    const now = Date.now();
    const job: QueueJob = {
      id: `job_${now}_${Math.random().toString(36).slice(2, 6)}`,
      type, payload, status: 'PENDING', attemptCount: 0,
      maxAttempts: options?.maxAttempts || 3,
      nextAttemptAt: options?.delayMs ? new Date(now + options.delayMs).toISOString() : new Date(now).toISOString(),
      createdAt: new Date(now).toISOString()
    };
    this.jobs.set(job.id, job);
    await this.persist(job);
    return job;
  }

  public getJobs(status?: QueueJob['status'], limit: number = 50): QueueJob[] {
    let list = Array.from(this.jobs.values());
    if (status) list = list.filter(j => j.status === status);
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
    job.failureReason = undefined;
    await this.persist(job);
    return true;
  }

  private async processNextPendingJob(): Promise<void> {
    if (this.isProcessing) return;
    if (!this.initialized) return;

    const now = new Date().toISOString();
    const candidate = Array.from(this.jobs.values()).find(
      j => j.status === 'PENDING' && (!j.nextAttemptAt || j.nextAttemptAt <= now)
    );
    if (!candidate) return;

    this.isProcessing = true;
    candidate.status = 'PROCESSING';
    candidate.attemptCount += 1;
    candidate.lastAttemptAt = now;
    await this.persist(candidate);

    const handler = this.handlers.get(candidate.type);
    if (!handler) {
      candidate.status = 'DEAD_LETTER';
      candidate.failureReason = `No handler registered for job type: ${candidate.type}`;
      await this.persist(candidate);
      this.isProcessing = false;
      return;
    }

    try {
      await handler(candidate.payload);
      candidate.status = 'COMPLETED';
      candidate.completedAt = new Date().toISOString();
      await this.persist(candidate);
    } catch (err: any) {
      console.error(`[QueueService:JobFailed] Job ${candidate.id} (${candidate.type}):`, err.message);
      if (candidate.attemptCount >= candidate.maxAttempts) {
        candidate.status = 'DEAD_LETTER';
        candidate.failureReason = `Exceeded max attempts (${candidate.maxAttempts}): ${err.message}`;
      } else {
        candidate.status = 'PENDING';
        const backoffMs = Math.pow(2, candidate.attemptCount) * 1000;
        candidate.nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();
        candidate.failureReason = err.message;
      }
      await this.persist(candidate);
    } finally {
      this.isProcessing = false;
    }
  }
}
