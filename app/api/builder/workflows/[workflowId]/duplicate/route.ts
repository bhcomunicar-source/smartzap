import { NextResponse } from "next/server";
import { duplicateWorkflow } from "@/lib/builder/mock-workflow-store";

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  const { workflowId } = await params;
  const workflow = duplicateWorkflow(workflowId);
  return NextResponse.json(workflow);
}
