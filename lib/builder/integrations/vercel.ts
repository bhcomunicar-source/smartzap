import "server-only";

export type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  link?: {
    type: string;
    repo: string;
    repoId: number;
    org?: string;
    gitCredentialId?: string;
    productionBranch?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export type VercelDeployment = {
  uid: string;
  name: string;
  url: string;
  state:
    | "BUILDING"
    | "ERROR"
    | "INITIALIZING"
    | "QUEUED"
    | "READY"
    | "CANCELED";
  type: "LAMBDAS";
  created: number;
  creator: {
    uid: string;
    email?: string;
    username?: string;
  };
  target: "production" | "staging" | null;
};

export type ListProjectsParams = {
  apiToken: string;
  teamId?: string;
};

export type ListProjectsResult = {
  status: "success" | "error";
  projects?: VercelProject[];
  error?: string;
};

export type GetProjectParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
};

export type GetProjectResult = {
  status: "success" | "error";
  project?: VercelProject;
  error?: string;
};

export type ListDeploymentsParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
  limit?: number;
};

export type ListDeploymentsResult = {
  status: "success" | "error";
  deployments?: VercelDeployment[];
  error?: string;
};

export async function listProjects(): Promise<ListProjectsResult> {
  return { status: "error", error: "Vercel SDK not configured" };
}

export async function getProject(): Promise<GetProjectResult> {
  return { status: "error", error: "Vercel SDK not configured" };
}

export async function listDeployments(): Promise<ListDeploymentsResult> {
  return { status: "error", error: "Vercel SDK not configured" };
}
