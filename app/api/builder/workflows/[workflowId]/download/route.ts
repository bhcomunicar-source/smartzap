import { NextResponse } from "next/server";
import { ensureWorkflow } from "@/lib/builder/mock-workflow-store";

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { workflowId } = await params;
  const workflow = ensureWorkflow(workflowId);
  return NextResponse.json({
    name: workflow.name,
    workflow,
  });
}
