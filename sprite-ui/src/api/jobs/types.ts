export type JobType = 'sprites' | 'sound' | 'text' | 'icon';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type JobCreateRequest = {
  type: JobType;
  params: Record<string, any>;
};

export type JobResponse = {
  job_id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  params: Record<string, any>;
  result: Record<string, any> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};