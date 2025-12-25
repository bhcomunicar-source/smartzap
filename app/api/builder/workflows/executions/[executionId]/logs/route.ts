import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ensureWorkflow } from "@/lib/builder/mock-workflow-store";

type RouteParams = {
  params: Promise<{ executionId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { executionId } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ execution: null, logs: [] });
  }

  const { data: execution, error: execError } = await supabase
    .from("workflow_builder_executions")
    .select("*")
    .eq("id", executionId)
    .single();

  if (execError || !execution) {
    return NextResponse.json({ execution: null, logs: [] });
  }

  const { data: logs } = await supabase
    .from("workflow_builder_logs")
    .select("*")
    .eq("execution_id", executionId)
    .order("started_at", { ascending: true });

  const workflow = ensureWorkflow(execution.workflow_id);

  const mappedLogs = (logs || []).map((log) => ({
    id: String(log.id),
    executionId: log.execution_id,
    nodeId: log.node_id,
    nodeName: log.node_name || "",
    nodeType: log.node_type || "",
    status: log.status,
    input: log.input,
    output: log.output,
    error: log.error,
    startedAt: log.started_at,
    completedAt: log.completed_at,
    duration: null,
  }));

  return NextResponse.json({
    execution: {
      id: execution.id,
      workflow: {
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
    },
    logs: mappedLogs,
  });
}
