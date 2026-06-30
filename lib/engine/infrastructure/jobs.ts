import { randomBytes } from "crypto";

export type JobKind = "document_parsing" | "review_generation" | "export" | "email" | "search_indexing" | "analytics" | "notifications";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";

export interface Job {
  id: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  organisation_id: string;
  status: JobStatus;
  attempts: number;
  run_at: Date;
  last_error?: string;
  idempotency_key?: string;
}

export class RetryPolicy {
  constructor(
    public readonly maxAttempts = 5,
    public readonly baseDelaySeconds = 5,
    public readonly maxDelaySeconds = 300
  ) {}

  nextDelaySeconds(attempts: number): number {
    return Math.min(this.maxDelaySeconds, this.baseDelaySeconds * 2 ** Math.max(0, attempts - 1));
  }
}

export class JobQueue {
  private readonly jobs = new Map<string, Job>();
  private readonly idempotency = new Map<string, string>();

  constructor(private readonly retryPolicy = new RetryPolicy()) {}

  enqueue(kind: JobKind, payload: Record<string, unknown>, input: { organisationId: string; idempotencyKey?: string }): Job {
    if (input.idempotencyKey && this.idempotency.has(input.idempotencyKey)) {
      return this.jobs.get(this.idempotency.get(input.idempotencyKey)!)!;
    }
    const job: Job = {
      id: `job_${randomBytes(12).toString("base64url")}`,
      kind,
      payload: { ...payload },
      organisation_id: input.organisationId,
      status: "queued",
      attempts: 0,
      run_at: new Date(),
      idempotency_key: input.idempotencyKey,
    };
    this.jobs.set(job.id, job);
    if (input.idempotencyKey) this.idempotency.set(input.idempotencyKey, job.id);
    return job;
  }

  reserve(now = new Date()): Job | undefined {
    const ready = Array.from(this.jobs.values())
      .filter((job) => job.status === "queued" && job.run_at <= now)
      .sort((a, b) => a.run_at.getTime() - b.run_at.getTime())[0];
    if (!ready) return undefined;
    ready.status = "running";
    ready.attempts += 1;
    return ready;
  }

  succeed(jobId: string): Job {
    const job = this.mustGet(jobId);
    job.status = "succeeded";
    job.last_error = undefined;
    return job;
  }

  fail(jobId: string, error: string, now = new Date()): Job {
    const job = this.mustGet(jobId);
    job.last_error = error;
    if (job.attempts >= this.retryPolicy.maxAttempts) {
      job.status = "dead";
      return job;
    }
    job.status = "queued";
    job.run_at = new Date(now.getTime() + this.retryPolicy.nextDelaySeconds(job.attempts) * 1000);
    return job;
  }

  private mustGet(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`UNKNOWN_JOB:${jobId}`);
    return job;
  }
}
