import { createHttpJobsApi } from './jobs.http';
import type { JobCreateRequest, JobResponse } from './types';

function getApiBase(): string {
  const v = import.meta.env.VITE_API_BASE;
  return v === undefined ? '' : String(v);
}

const api = createHttpJobsApi(getApiBase());

export async function apiCreateJob(body: JobCreateRequest): Promise<JobResponse> {
  return api.create(body);
}

export async function apiGetJob(jobId: string): Promise<JobResponse> {
  return api.get(jobId);
}

export type { JobCreateRequest, JobResponse };