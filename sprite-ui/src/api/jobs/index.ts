import { createHttpJobsApi } from "./jobs.http";
import type { JobCreateRequest, JobResponse } from "./types";
import type { HistoryType } from "../../history";

function getApiBase(): string {
  const v = import.meta.env.VITE_API_BASE;
  return v === undefined ? "" : String(v);
}

const api = createHttpJobsApi(getApiBase());

export async function apiCreateJob(body: JobCreateRequest): Promise<JobResponse> {
  return api.create(body);
}

export async function apiGetJob(jobId: string): Promise<JobResponse> {
  return api.get(jobId);
}

export async function apiGetJobHistory(type?: HistoryType): Promise<JobResponse[]> {
  return api.history(type);
}

export async function apiGetJobArtifactBlob(
  jobId: string,
  artifactPath: string
): Promise<Blob> {
  return api.artifact(jobId, artifactPath);
}

export type { JobCreateRequest, JobResponse };